import { createReadStream } from "node:fs";
import { mkdir, stat } from "node:fs/promises";
import { createServer } from "node:http";
import { dirname, extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const downloadsDir = join(root, ".smoke-downloads");
const routeFixturePath = join(root, "testdata", "fixtures", "route-with-helper.plotmap.json");
const readerFixturePath = join(root, "testdata", "fixtures", "reader-context.plotmap.json");

const mimeTypes = new Map([
  [".html", "text/html;charset=utf-8"],
  [".js", "text/javascript;charset=utf-8"],
  [".json", "application/json;charset=utf-8"],
  [".css", "text/css;charset=utf-8"],
  [".png", "image/png"],
  [".svg", "image/svg+xml;charset=utf-8"]
]);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function staticServer() {
  const server = createServer(async (request, response) => {
    const url = new URL(request.url || "/", "http://127.0.0.1");
    const pathname = decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname);
    const target = normalize(join(root, pathname));
    if (!target.startsWith(root)) {
      response.writeHead(403);
      response.end("Forbidden");
      return;
    }
    try {
      const info = await stat(target);
      if (!info.isFile()) throw new Error("Not a file");
      response.writeHead(200, {
        "content-type": mimeTypes.get(extname(target)) || "application/octet-stream"
      });
      createReadStream(target).pipe(response);
    } catch (_error) {
      response.writeHead(404);
      response.end("Not found");
    }
  });

  return new Promise((resolveServer, rejectServer) => {
    server.once("error", rejectServer);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      resolveServer({
        server,
        url: `http://127.0.0.1:${address.port}/index.html`
      });
    });
  });
}

async function waitForImage(page) {
  await page.waitForFunction(() => Boolean(globalThis.PM && PM.renderer && PM.renderer.hasImage()), null, { timeout: 5000 });
}

async function waitForPointCount(page, expected) {
  await page.waitForFunction((count) => globalThis.PM.store.getLiveState().points.length === count, expected, { timeout: 5000 });
}

async function canvasPoint(page, xRatio, yRatio) {
  const box = await page.locator("#mapCanvas").boundingBox();
  assert(box, "Canvas should have a bounding box.");
  return {
    x: Math.floor(box.width * xRatio),
    y: Math.floor(box.height * yRatio)
  };
}

async function setCheckbox(page, selector, checked) {
  await page.locator(selector).evaluate((input, nextChecked) => {
    input.checked = nextChecked;
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }, checked);
}

async function setInputValue(page, selector, value) {
  await page.locator(selector).evaluate((input, nextValue) => {
    input.value = nextValue;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }, value);
}

async function setInputValueLiveOnly(page, selector, value) {
  await page.locator(selector).evaluate((input, nextValue) => {
    input.value = nextValue;
    input.dispatchEvent(new Event("input", { bubbles: true }));
  }, value);
}

async function loadProject(page, fixturePath) {
  await page.setInputFiles("#projectInput", fixturePath);
  await waitForImage(page);
}

async function addRoutePoint(page) {
  const before = await page.evaluate(() => PM.store.getLiveState().points.length);
  const wasFocused = await page.locator("#focusMode").isChecked();
  if (!wasFocused) await setCheckbox(page, "#focusMode", true);
  await page.dblclick("#mapCanvas", { position: await canvasPoint(page, 0.62, 0.7), force: true });
  await page.waitForSelector(".context-menu .route-type-choice");
  await page.locator(".context-menu .route-type-choice").click();
  await waitForPointCount(page, before + 1);
  if (!wasFocused) await setCheckbox(page, "#focusMode", false);
}

async function addPlacePoint(page) {
  const before = await page.evaluate(() => PM.store.getLiveState().points.length);
  const isFocused = await page.locator("#focusMode").isChecked();
  if (isFocused) await setCheckbox(page, "#focusMode", false);
  await page.dblclick("#mapCanvas", { position: await canvasPoint(page, 0.36, 0.82), force: true });
  await page.locator(".context-menu button", { hasText: "Place" }).click();
  await waitForPointCount(page, before + 1);
}

async function exerciseRouteManagement(page) {
  await page.waitForSelector("#routePanel", { state: "hidden" });
  await page.click("#routePanelToggle");
  await page.waitForSelector("#routePanel:not([hidden])");
  await page.waitForFunction(() => {
    const rows = document.querySelector("#routeRows");
    const color = document.querySelector(".route-color-button");
    const caret = document.querySelector("#routePanelToggle .route-panel-caret");
    const row = document.querySelector(".route-row");
    return rows
      && rows.scrollWidth <= rows.clientWidth + 1
      && color
      && color.getBoundingClientRect().width <= 44
      && caret
      && caret.textContent.trim() === "\u25b4"
      && row
      && parseFloat(getComputedStyle(row).fontSize) <= 14
      && document.querySelector(".route-arrow-mode-input")
      && document.querySelector(".route-width-stepper .route-width-decrease")
      && document.querySelector(".route-width-stepper .route-width-increase");
  }, null, { timeout: 5000 });
  const initial = await page.evaluate(() => ({
    routeCount: PM.store.getLiveState().routes.length,
    firstRouteId: PM.store.getLiveState().routes[0].id
  }));
  await page.locator(`.route-row[data-route-id="${initial.firstRouteId}"] .route-arrow-mode-input`).selectOption("middle");
  await page.waitForFunction((routeId) => {
    const route = PM.store.getLiveState().routes.find((entry) => entry.id === routeId);
    return route
      && route.arrowMode === "middle"
      && route.showArrows
      && document.querySelectorAll("#routeLayer path").length > 0;
  }, initial.firstRouteId, { timeout: 5000 });

  await page.click("#addRouteButton");
  await page.waitForFunction((count) => PM.store.getLiveState().routes.length === count + 1, initial.routeCount, { timeout: 5000 });
  const activeRouteId = await page.evaluate(() => PM.store.getLiveState().settings.activeRouteId);
  const activeRow = `.route-row[data-route-id="${activeRouteId}"]`;
  await setInputValue(page, `${activeRow} .route-name-input`, "Smoke Route");
  await page.locator(`${activeRow} .route-color-button`).click();
  await page.waitForSelector("#routeColorPopover:not([hidden])");
  await setInputValueLiveOnly(page, "#routeColorPicker", "#8844cc");
  await page.click("#routeColorCancel");
  await page.waitForSelector("#routeColorPopover", { state: "hidden" });
  await page.waitForFunction((routeId) => {
    const route = PM.store.getLiveState().routes.find((entry) => entry.id === routeId);
    return route && route.color !== "#8844cc";
  }, activeRouteId, { timeout: 5000 });
  await page.locator(`${activeRow} .route-color-button`).click();
  await page.waitForSelector("#routeColorPopover:not([hidden])");
  await setInputValueLiveOnly(page, "#routeColorPicker", "#2277cc");
  await page.click("#routeColorOk");
  await page.waitForFunction((routeId) => {
    const route = PM.store.getLiveState().routes.find((entry) => entry.id === routeId);
    return route && route.color === "#2277cc";
  }, activeRouteId, { timeout: 5000 });
  await setInputValue(page, `${activeRow} .route-width-input`, "7");
  await setCheckbox(page, `${activeRow} .route-numbers-input`, false);
  await setInputValue(page, `${activeRow} .route-start-input`, "5");
  await page.locator(`${activeRow} .route-arrow-mode-input`).selectOption("repeated");
  await setCheckbox(page, `${activeRow} .route-visible-input`, false);
  await page.waitForFunction(({ routeId, firstRouteId }) => {
    const state = PM.store.getLiveState();
    const route = state.routes.find((entry) => entry.id === routeId);
    return route && route.visible === false && state.settings.activeRouteId === firstRouteId;
  }, { routeId: activeRouteId, firstRouteId: initial.firstRouteId }, { timeout: 5000 });
  await page.locator(`${activeRow} input[name='activeRoute']`).check();
  await page.locator(`${activeRow} .route-style-input`).selectOption("dotted");
  await page.waitForFunction((routeId) => {
    const route = PM.store.getLiveState().routes.find((entry) => entry.id === routeId);
    return route
      && route.name === "Smoke Route"
      && route.visible
      && route.arrowMode === "repeated"
      && route.showArrows
      && route.showNumbers === false
      && route.startNumber === 5
      && route.color === "#2277cc"
      && route.width === 7
      && route.lineStyle === "dotted"
      && PM.store.getLiveState().settings.activeRouteId === routeId;
  }, activeRouteId, { timeout: 5000 });

  const before = await page.evaluate(() => PM.store.getLiveState().points.length);
  await setCheckbox(page, "#focusMode", false);
  await page.dblclick("#mapCanvas", { position: await canvasPoint(page, 0.74, 0.72), force: true });
  await page.locator(".context-menu .route-type-choice").click();
  await waitForPointCount(page, before + 1);
  await page.waitForFunction((routeId) => {
    const point = PM.store.getLiveState().points.at(-1);
    return point && point.type === "route" && point.routeId === routeId;
  }, activeRouteId, { timeout: 5000 });

  await page.click("#addRouteButton");
  const deleteRouteId = await page.evaluate(() => PM.store.getLiveState().settings.activeRouteId);
  page.once("dialog", (dialog) => dialog.accept());
  await page.locator(`.route-row[data-route-id="${deleteRouteId}"] .route-delete-input`).click();
  await page.waitForFunction((routeId) => !PM.store.getLiveState().routes.some((route) => route.id === routeId), deleteRouteId, { timeout: 5000 });

  await page.locator(`.route-row[data-route-id="${initial.firstRouteId}"] input[name='activeRoute']`).check();
  await page.waitForFunction((routeId) => PM.store.getLiveState().settings.activeRouteId === routeId, initial.firstRouteId, { timeout: 5000 });
  await page.click("#routePanelToggle");
  await page.waitForSelector("#routePanel", { state: "hidden" });
}

async function editFirstPointLabel(page) {
  await page.locator(".point-menu-button").last().click({ force: true });
  await page.locator(".context-menu button").first().click();
  await page.locator(".point-editor input[name='value']").fill("Smoke Label");
  await page.locator(".point-editor button[type='submit']").click();
  await page.waitForFunction(() => globalThis.PM.store.getLiveState().points.some((point) => point.label === "Smoke Label"), null, { timeout: 5000 });
}

async function insertMidpointAndUndoRedo(page) {
  const before = await page.evaluate(() => PM.store.getLiveState().points.length);
  await page.locator(".midpoint").last().click({ force: true });
  await waitForPointCount(page, before + 1);
  await page.click("#undoButton");
  await waitForPointCount(page, before);
  await page.click("#redoButton");
  await waitForPointCount(page, before + 1);
}

async function toggleControls(page) {
  const initialTheme = await page.evaluate(() => document.documentElement.dataset.theme);
  await page.click("#themeToggle");
  await page.waitForFunction((theme) => document.documentElement.dataset.theme !== theme, initialTheme, { timeout: 5000 });
  await setInputValue(page, "#pointSizeControl", "40");
  await page.waitForFunction(() => {
    const point = document.querySelector(".point");
    return PM.store.getLiveState().settings.pointSizePx === 40
      && getComputedStyle(document.documentElement).getPropertyValue("--point-size").trim() === "40px"
      && point
      && Math.round(point.getBoundingClientRect().width) === 40;
  }, null, { timeout: 5000 });
  await setInputValue(page, "#helperPointSizeControl", "18");
  await page.evaluate(() => {
    if (PM.store.getLiveState().points.some((point) => point.type === "route" && point.helper)) return;
    const routePoint = PM.store.getLiveState().points.find((point) => point.type === "route");
    if (routePoint) PM.store.patchPoint(routePoint.id, { helper: true });
  });
  await page.waitForFunction(() => {
    const helperPoint = document.querySelector(".point.route.helper");
    const midpoint = document.querySelector(".midpoint");
    return PM.store.getLiveState().settings.helperPointSizePx === 18
      && getComputedStyle(document.documentElement).getPropertyValue("--helper-point-size").trim() === "18px"
      && helperPoint
      && Math.round(helperPoint.getBoundingClientRect().width) === 18
      && (!midpoint || Math.round(midpoint.getBoundingClientRect().width) === 12);
  }, null, { timeout: 5000 });
  await setInputValue(page, "#toolbarOpacityControl", "72");
  await page.waitForFunction(() => getComputedStyle(document.documentElement).getPropertyValue("--toolbar-opacity").trim() === "0.72", null, { timeout: 5000 });
  await page.click("#toolbarCollapse");
  await page.waitForFunction(() => document.documentElement.classList.contains("toolbar-collapsed"), null, { timeout: 5000 });
  assert(!(await page.locator("#toolbar").isVisible()), "Toolbar should hide when collapsed.");
  await page.waitForSelector("#toolbarRestore:not([hidden])");
  await page.click("#toolbarRestore");
  await page.waitForFunction(() => !document.documentElement.classList.contains("toolbar-collapsed"), null, { timeout: 5000 });
  await page.waitForSelector("#toolbar");
  await setCheckbox(page, "#focusMode", true);
  await page.waitForFunction(() => document.documentElement.classList.contains("focus-mode"), null, { timeout: 5000 });
  await setCheckbox(page, "#filter-place", false);
  await page.waitForFunction(() => PM.store.getLiveState().settings.filters.place === false, null, { timeout: 5000 });
  await setCheckbox(page, "#filter-place", true);
  await setCheckbox(page, "#focusMode", false);
}

async function visiblePointCount(page) {
  return page.locator(".point:not(.hidden)").count();
}

async function canvasPixel(page, xRatio, yRatio) {
  return page.locator("#mapCanvas").evaluate((canvas, ratios) => {
    const context = canvas.getContext("2d");
    const x = Math.max(0, Math.min(canvas.width - 1, Math.floor(canvas.width * ratios.x)));
    const y = Math.max(0, Math.min(canvas.height - 1, Math.floor(canvas.height * ratios.y)));
    return Array.from(context.getImageData(x, y, 1, 1).data);
  }, { x: xRatio, y: yRatio });
}

function pixelDistance(left, right) {
  return Math.abs(left[0] - right[0]) + Math.abs(left[1] - right[1]) + Math.abs(left[2] - right[2]) + Math.abs(left[3] - right[3]);
}

async function exercisePresentation(page) {
  await page.click("#presentationButton");
  await page.waitForFunction(() => document.documentElement.classList.contains("presentation-mode"), null, { timeout: 5000 });
  await page.waitForSelector("#presentationDock:not([hidden])");
  await page.waitForSelector(".presentation-route-pill");
  assert(!(await page.locator("#toolbar").isVisible()), "Toolbar should hide in presentation mode.");
  const routePills = await page.locator(".presentation-route-pill").count();
  assert(routePills >= 1, "Presentation should expose at least one route progress pill.");
  if (routePills > 1) {
    const secondRouteId = await page.locator(".presentation-route-pill").nth(1).evaluate((button) => button.textContent);
    await page.locator(".presentation-route-pill").nth(1).click();
    await page.waitForFunction((label) => document.querySelector(".presentation-route-pill.is-active")?.textContent === label, secondRouteId, { timeout: 5000 });
    await page.locator(".presentation-route-pill").first().click();
  }
  const fogPixel = await canvasPixel(page, 0.5, 0.5);
  await page.click("#presentationFogToggle");
  await page.waitForSelector("#presentationFogPanel:not([hidden])");
  await page.selectOption("#presentationFogMode", "off");
  await page.waitForFunction(() => PM.getPresentationFogSettings().mode === "off", null, { timeout: 5000 });
  const clearPixel = await canvasPixel(page, 0.5, 0.5);
  assert(pixelDistance(fogPixel, clearPixel) > 24, "Turning fog off should visibly change the map canvas.");
  await page.selectOption("#presentationFogMode", "all");
  await page.waitForFunction(() => PM.getPresentationFogSettings().mode === "all", null, { timeout: 5000 });
  await page.selectOption("#presentationFogMode", "focus");
  await setInputValue(page, "#presentationFogOutside", "0.12");
  await setInputValue(page, "#presentationFogFocus", "0.22");
  await setInputValue(page, "#presentationFogTrail", "0.05");
  await setInputValue(page, "#presentationFogSoftness", "0.08");
  await setCheckbox(page, "#presentationFogMemory", false);
  await page.waitForFunction(() => {
    const fog = PM.getPresentationFogSettings();
    return fog.mode === "focus" && fog.outsideVisibility === 0.12 && fog.focusRadius === 0.22 && fog.trailRadius === 0.05 && fog.edgeSoftness === 0.08 && fog.trailMemory === false;
  }, null, { timeout: 5000 });
  await page.click("#presentationFogClose");
  await page.waitForSelector("#presentationFogPanel", { state: "hidden" });

  const startState = await page.evaluate(() => {
    const reveal = PM.getPresentationReveal();
    return {
      visibleCount: document.querySelectorAll(".point:not(.hidden)").length,
      routeCount: reveal.routeReveals.length,
      routePointCount: new Set(reveal.routeReveals.flatMap((entry) => entry.routePoints.map((point) => point.id))).size,
      steps: reveal.routeReveals.map((entry) => entry.step)
    };
  });
  assert(startState.routeCount >= 1, "Presentation reveal should include route reveal entries.");
  assert(startState.steps.every((step) => step <= 1), `Presentation should start each route at step 1, got ${startState.steps.join(",")}.`);
  assert(startState.visibleCount >= startState.routePointCount, `Presentation should show each route's first point, got ${startState.visibleCount} visible for ${startState.routePointCount} route points.`);

  await page.keyboard.press("ArrowRight");
  await page.waitForFunction(() => document.querySelector("#presentationStep")?.textContent?.startsWith("2 /"), null, { timeout: 5000 });
  const nextCount = await visiblePointCount(page);
  assert(nextCount > startState.visibleCount, `Next step should reveal more points, got ${nextCount} after ${startState.visibleCount}.`);

  await page.click("#presentationShowAll");
  const presentationShowAllCount = await page.evaluate(() => {
    const state = PM.store.getLiveState();
    return state.points.filter((point) => PM.isPointVisible(point, state.settings, state.routes)).length;
  });
  await page.waitForFunction((count) => document.querySelectorAll(".point:not(.hidden)").length === count, presentationShowAllCount, { timeout: 5000 });

  await page.click("#presentationReset");
  await page.waitForFunction(() => {
    const reveal = PM.getPresentationReveal();
    return reveal.routeReveals.every((entry) => entry.step <= 1)
      && document.querySelectorAll(".point:not(.hidden)").length === reveal.visibleIds.size;
  }, null, { timeout: 5000 });

  await page.keyboard.press("End");
  await page.waitForFunction((count) => document.querySelectorAll(".point:not(.hidden)").length === count, presentationShowAllCount, { timeout: 5000 });

  await page.keyboard.press("Escape");
  await page.waitForFunction(() => !document.documentElement.classList.contains("presentation-mode"), null, { timeout: 5000 });
  await page.waitForSelector("#toolbar");
}

async function exerciseReader(page) {
  await page.click("#readerButton");
  await page.waitForSelector("#readerModal:not([hidden]) .reader-card");
  const panBefore = await page.evaluate(() => PM.store.getLiveState().settings.panX);
  await page.locator(".reader-num").first().click();
  await page.waitForFunction((before) => PM.store.getLiveState().settings.panX !== before || PM.store.getLiveState().settings.zoom > 1, panBefore, { timeout: 5000 });
}

async function exerciseDownloads(page) {
  await page.evaluate(() => {
    if (globalThis.__pmDownloadCaptureInstalled) return;
    globalThis.__pmDownloadCaptureInstalled = true;
    globalThis.__pmDownloads = [];
    const originalClick = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function capturedDownloadClick() {
      if (this.download) {
        globalThis.__pmDownloads.push({
          download: this.download,
          href: this.href
        });
      }
      return originalClick.call(this);
    };
  });

  await page.click("#exportPng");
  await page.waitForFunction(() => globalThis.__pmDownloads.some((entry) => entry.download.endsWith(".png")), null, { timeout: 5000 });

  await page.click("#saveProject");
  await page.waitForFunction(() => globalThis.__pmDownloads.some((entry) => entry.download.endsWith(".plotmap.json")), null, { timeout: 5000 });
}

async function runViewport(browser, baseUrl, viewport, fixturePath) {
  const context = await browser.newContext({
    acceptDownloads: true,
    downloadsPath: downloadsDir,
    viewport
  });
  const page = await context.newPage();
  const errors = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));

  await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
  await page.click("#pmSplash");
  await loadProject(page, fixturePath);
  await addRoutePoint(page);
  await addPlacePoint(page);
  await exerciseRouteManagement(page);
  await editFirstPointLabel(page);
  await insertMidpointAndUndoRedo(page);
  await toggleControls(page);
  await exercisePresentation(page);
  await exerciseReader(page);
  await exerciseDownloads(page);

  assert(errors.length === 0, `Browser console/page errors in ${viewport.width}x${viewport.height}: ${errors.join(" | ")}`);
  await context.close();
}

await mkdir(downloadsDir, { recursive: true });
const { server, url } = await staticServer();
const browser = await chromium.launch();

try {
  await runViewport(browser, url, { width: 1366, height: 900 }, routeFixturePath);
  await runViewport(browser, url, { width: 390, height: 844 }, readerFixturePath);
  console.log("Browser smoke passed (desktop and narrow viewport).");
} finally {
  await browser.close();
  await new Promise((resolveClose) => server.close(resolveClose));
}

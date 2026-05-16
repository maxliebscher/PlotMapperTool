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

async function loadProject(page, fixturePath) {
  await page.setInputFiles("#projectInput", fixturePath);
  await waitForImage(page);
}

async function addRoutePoint(page) {
  const before = await page.evaluate(() => PM.store.getLiveState().points.length);
  const wasFocused = await page.locator("#focusMode").isChecked();
  if (!wasFocused) await setCheckbox(page, "#focusMode", true);
  await page.dblclick("#mapCanvas", { position: await canvasPoint(page, 0.62, 0.7), force: true });
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
  await setCheckbox(page, "#focusMode", true);
  await page.waitForFunction(() => document.documentElement.classList.contains("focus-mode"), null, { timeout: 5000 });
  await setCheckbox(page, "#filter-place", false);
  await page.waitForFunction(() => PM.store.getLiveState().settings.filters.place === false, null, { timeout: 5000 });
  await setCheckbox(page, "#filter-place", true);
  await setCheckbox(page, "#focusMode", false);
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
  await editFirstPointLabel(page);
  await insertMidpointAndUndoRedo(page);
  await toggleControls(page);
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

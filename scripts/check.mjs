import { readFile, readdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const html = await readFile(join(root, "index.html"), "utf8");
const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map((match) => match[1]);
const closeScriptCount = (html.match(/<\/script>/gi) || []).length;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message} Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}.`);
  }
}

function assertDeepEqual(actual, expected, message) {
  const left = JSON.stringify(actual);
  const right = JSON.stringify(expected);
  if (left !== right) {
    throw new Error(`${message} Expected ${right}, got ${left}.`);
  }
}

function requireHtml(id, label) {
  assert(html.includes(id), `${label} should be present in generated HTML.`);
}

assert(scripts.length, "No script blocks found in generated HTML.");
assert(closeScriptCount === scripts.length, "Raw </script> text found inside generated script content.");
assert(!/\b(?:Export MD|Import MD|markdownInput)\b/.test(html), "Legacy Markdown project controls must not be present in the main UI.");
[
  [/<script\b[^>]*\bsrc\s*=\s*["']https?:/i, "External runtime script dependencies must not be used."],
  [/<link\b[^>]*\bhref\s*=\s*["']https?:/i, "External runtime link dependencies must not be used."],
  [/<img\b[^>]*\bsrc\s*=\s*["']https?:/i, "External runtime image dependencies must not be used."],
  [/@import\s+(?:url\()?["']?https?:/i, "External CSS imports must not be used."],
  [/url\(\s*["']?https?:/i, "External CSS url() dependencies must not be used."]
].forEach(([pattern, message]) => assert(!pattern.test(html), message));
assert(html.includes("\\uD83D\\uDCD6 ${PM.I18n.t(locale, \"reader\")}"), "Reader toolbar button should include the book icon prefix.");
assert(html.includes("PM.createPresentationController"), "App should create the presentation controller.");
assert(html.includes("getPresentationReveal"), "Point UI should receive presentation reveal state.");
assert(html.includes("ArrowRight") && html.includes("PageDown") && html.includes("ArrowLeft") && html.includes("PageUp"), "Presentation keyboard navigation should be wired.");
assert(html.includes("Home") && html.includes("End") && html.includes("Escape"), "Presentation reset, show-all, and exit shortcuts should be wired.");
requireHtml("helpTitle", "Tutorial modal title");
requireHtml("Tutorial", "Tutorial copy");
requireHtml("Schlie", "Localized tutorial close label");
requireHtml("saveProject", "Project save control");
requireHtml("loadProject", "Project load control");
requireHtml("projectInput", "Project input control");
requireHtml("exportPng", "PNG export control");
requireHtml("readerModal", "Reader modal");
requireHtml("readerExportHtml", "Reader HTML export control");
requireHtml("presentationButton", "Presentation mode toolbar button");
requireHtml("presentationDock", "Presentation dock");
requireHtml("presentationRoutes", "Presentation route progress controls");
requireHtml("presentationPrev", "Presentation previous control");
requireHtml("presentationNext", "Presentation next control");
requireHtml("presentationShowAll", "Presentation show-all control");
requireHtml("presentationReset", "Presentation reset control");
requireHtml("presentationExit", "Presentation exit control");
requireHtml("presentationFogToggle", "Presentation fog settings toggle");
requireHtml("presentationFogPanel", "Presentation fog settings panel");
requireHtml("presentationFogMode", "Presentation fog mode control");
requireHtml("presentationFogOutside", "Presentation fog outside visibility control");
requireHtml("presentationFogFocus", "Presentation fog focus radius control");
requireHtml("presentationFogTrail", "Presentation fog trail width control");
requireHtml("presentationFogSoftness", "Presentation fog edge softness control");
requireHtml("presentationFogMemory", "Presentation fog trail memory control");
requireHtml("routePanelToggle", "Collapsible route panel toggle");
requireHtml("routePanel", "Collapsible route management panel");
requireHtml("routeRows", "Route management rows");
requireHtml("addRouteButton", "Add route control");
requireHtml("routeColorPopover", "Confirmed route color popover");
assert(
  html.indexOf("id=\"routeColorOk\"") < html.indexOf("id=\"routeColorPicker\""),
  "Route color confirmation buttons should appear before the native color picker."
);
requireHtml("pointSizeControl", "Point size control");
requireHtml("helperPointSizeControl", "Helper point size control");
assert(!html.includes("midpointSizeControl"), "Edit midpoint sizing should not be exposed as a project setting.");
requireHtml("toolbarOpacityControl", "Menu opacity control");
requireHtml("toolbarCollapse", "Normal-mode menu collapse control");
requireHtml("toolbarRestore", "Collapsed menu restore control");
requireHtml("routeLineStyle", "Route line style i18n key");
requireHtml("routePoint", "Route point story picker i18n key");
requireHtml("routePointFor", "Route point active route i18n key");
requireHtml("type-menu-head", "Story picker point-type menu header");
requireHtml("type-menu-route", "Story picker active route pill");
requireHtml("type-menu-option-label", "Story picker readable option labels");
requireHtml("present:", "Presentation i18n key");
requireHtml("Präsentieren", "German presentation label");
assert(!/Export MD|Import MD|Markdown/.test(html.match(/helpHtml:[\s\S]*?(?=\n\s*}\n|,\n\s*\w+:)/)?.[0] || ""), "Tutorial copy must not advertise Markdown project import/export.");
assert(!/\.empty-hint\s*\{[\s\S]*?place-items:\s*center\s+end\s*;/i.test(html), "Empty hint must not be pinned to the right edge.");
assert(/\.empty-hint\s*\{[\s\S]*?place-items:\s*center\s*;/i.test(html), "Empty hint should be centered in the viewport.");
assert(/\.brand-logo\s*\{[\s\S]*?overflow:\s*visible\s*;/i.test(html), "Splash logo must allow the route stroke to render without clipping.");
assert(/\.splash\s*\{[\s\S]*?color:\s*#fff\s*;/i.test(html), "Splash text must stay white independently of the active theme.");
assert(/\.splash h1\s*\{[\s\S]*?color:\s*#fff\s*;/i.test(html), "Splash title must stay white independently of the active theme.");

scripts.forEach((script, index) => {
  if (script.includes("&amp;&amp;")) throw new Error(`Escaped operator found in script ${index + 1}.`);
  if (/\bprompt\s*\(/.test(script)) throw new Error(`prompt() found in script ${index + 1}; use app-owned dialogs instead.`);
  new Function(script);
});

const coreFiles = [
  "src/00-namespace.js",
  "src/constants.js",
  "src/i18n.js",
  "src/utils.js",
  "src/state.js",
  "src/presentation.js",
  "src/serialization.js",
  "src/exporters.js"
];
const context = {
  console,
  Blob,
  crypto: {
    randomUUID: () => "00000000-0000-4000-8000-000000000000"
  }
};
context.globalThis = context;
vm.createContext(context);
for (const file of coreFiles) {
  vm.runInContext(await readFile(join(root, file), "utf8"), context, { filename: file });
}

const PM = context.PM;
const fixturesDir = join(root, "testdata", "fixtures");
const fixtureNames = (await readdir(fixturesDir)).filter((name) => name.endsWith(".plotmap.json")).sort();

assertDeepEqual(fixtureNames, [
  "minimal.plotmap.json",
  "reader-context.plotmap.json",
  "route-with-helper.plotmap.json",
  "settings-heavy.plotmap.json"
], "Clean fixture set changed unexpectedly.");

const fixtures = new Map();
for (const name of fixtureNames) {
  const text = await readFile(join(fixturesDir, name), "utf8");
  const parsed = PM.Serialization.parseProjectJson(text);
  const roundTrip = PM.Serialization.parseProjectJson(PM.Serialization.projectToJson(parsed));
  assertEqual(roundTrip.points.length, parsed.points.length, `${name} point count should round trip.`);
  assertEqual(roundTrip.map.name, parsed.map.name, `${name} map name should round trip.`);
  assertEqual(roundTrip.map.dataUrl, parsed.map.dataUrl, `${name} map data URL should round trip.`);
  assertEqual(roundTrip.settings.locale, parsed.settings.locale, `${name} locale should round trip.`);
  fixtures.set(name, roundTrip);
}

const project = PM.createEmptyProject({ locale: "en" });
project.map = { name: "test-map.png", dataUrl: "data:image/png;base64,AA==", width: 100, height: 100 };
project.points.push(
  PM.normalizePoint({ id: "r1", x: 0.1, y: 0.1, type: "route", label: "Start", note: "A", duration: "1h" }),
  PM.normalizePoint({ id: "h1", x: 0.2, y: 0.2, type: "route", helper: true }),
  PM.normalizePoint({ id: "r2", x: 0.8, y: 0.8, type: "route", label: "End" }),
  PM.normalizePoint({ id: "p1", x: 0.12, y: 0.12, type: "place", label: "Inn", location: "Town" })
);

const routeInfo = PM.computeRouteInfo(project.points, project.settings);
assertEqual(routeInfo.displayById.get("r1"), 1, "First route step should be 1.");
assertEqual(routeInfo.displayById.get("h1"), "", "Helper route step should be empty.");
assertEqual(routeInfo.displayById.get("r2"), 2, "Second numbered route step should be 2.");
assertEqual(PM.formatDurationLabel("3 Tage"), "\u231b 3 Tage", "Duration display should add an hourglass prefix.");
assertEqual(PM.formatDurationLabel("\u231b 3 Tage"), "\u231b 3 Tage", "Duration display should not duplicate the hourglass prefix.");
assertEqual(PM.formatDurationLabel(""), "", "Empty duration display should stay empty.");

const legacyRouteProject = PM.normalizeProject({
  schemaVersion: 1,
  appVersion: "legacy",
  map: { name: "legacy.png", dataUrl: "data:image/png;base64,AA==", width: 10, height: 10 },
  settings: {
    routeColor: "#123456",
    routeWidth: 6,
    chapterMode: true,
    chapterStart: 9
  },
  points: [
    { id: "legacy-a", x: 0.1, y: 0.2, type: "route" },
    { id: "legacy-b", x: 0.3, y: 0.4, type: "route", helper: true },
    { id: "legacy-c", x: 0.5, y: 0.6, type: "route" }
  ]
});
assertEqual(legacyRouteProject.routes.length, 1, "Legacy projects should normalize to one default route.");
assertEqual(legacyRouteProject.routes[0].color, "#123456", "Legacy route color should seed the default route.");
assertEqual(legacyRouteProject.routes[0].width, 6, "Legacy route width should seed the default route.");
assertEqual(legacyRouteProject.routes[0].startNumber, 9, "Legacy chapter start should seed the default route start number.");
assertEqual(legacyRouteProject.settings.activeRouteId, legacyRouteProject.routes[0].id, "Legacy projects should select the default route.");
assertDeepEqual(
  legacyRouteProject.points.filter((point) => point.type === "route").map((point) => point.routeId),
  [legacyRouteProject.routes[0].id, legacyRouteProject.routes[0].id, legacyRouteProject.routes[0].id],
  "Legacy route points should be assigned to the default route."
);

const multiRouteProject = PM.normalizeProject({
  schemaVersion: 1,
  appVersion: PM.APP_VERSION,
  map: { name: "multi.png", dataUrl: "data:image/png;base64,AA==", width: 10, height: 10 },
  settings: { activeRouteId: "timmy" },
  routes: [
    { id: "main", name: "Main", color: "#111111", visible: true, showNumbers: true, showArrows: true, startNumber: 14, lineStyle: "dashed", width: 5 },
    { id: "timmy", name: "Timmy", color: "#ff7780", visible: true, showNumbers: false, showArrows: false, startNumber: 3, lineStyle: "dotted", width: 4 }
  ],
  points: [
    { id: "main-1", x: 0.1, y: 0.1, type: "route", routeId: "main" },
    { id: "main-2", x: 0.2, y: 0.2, type: "route", routeId: "main" },
    { id: "timmy-1", x: 0.3, y: 0.3, type: "route", routeId: "timmy" },
    { id: "timmy-helper", x: 0.4, y: 0.4, type: "route", routeId: "timmy", helper: true },
    { id: "timmy-2", x: 0.5, y: 0.5, type: "route", routeId: "timmy" },
    { id: "ctx", x: 0.6, y: 0.6, type: "place" }
  ]
});
assertEqual(multiRouteProject.routes.length, 2, "Multi-route projects should preserve routes.");
assertEqual(multiRouteProject.routes[1].lineStyle, "dotted", "Route line style should normalize.");
assertEqual(multiRouteProject.routes[0].arrowMode, "middle", "Legacy showArrows=true should migrate to middle arrows.");
assertEqual(multiRouteProject.routes[1].arrowMode, "none", "Legacy showArrows=false should migrate to no arrows.");
assertEqual(multiRouteProject.points.find((point) => point.id === "ctx").routeId, "", "Context points should not be assigned to a route.");
const timmyInfo = PM.computeRouteInfo(multiRouteProject.points, multiRouteProject.settings, multiRouteProject.routes[1]);
assertEqual(timmyInfo.numberedRoutes.length, 2, "Route info should count active route numbered points only.");
assertEqual(timmyInfo.displayById.get("timmy-1"), "", "Disabled route numbering should hide route display numbers.");
assertEqual(timmyInfo.stepById.get("timmy-2"), 2, "Helper points should not advance per-route steps.");
const mainInfo = PM.computeRouteInfo(multiRouteProject.points, multiRouteProject.settings, multiRouteProject.routes[0]);
assertEqual(mainInfo.displayById.get("main-1"), 14, "Route start number should be route-specific.");
assertEqual(mainInfo.displayById.get("main-2"), 15, "Route start number should increment per route.");

const arrowModeProject = PM.normalizeProject({
  schemaVersion: 1,
  appVersion: PM.APP_VERSION,
  routes: [
    { id: "middle", name: "Middle", arrowMode: "middle" },
    { id: "repeated", name: "Repeated", arrowMode: "repeated" },
    { id: "target", name: "Target", arrowMode: "target" },
    { id: "invalid", name: "Invalid", arrowMode: "loud" }
  ]
});
assertDeepEqual(
  arrowModeProject.routes.map((route) => route.arrowMode),
  ["middle", "repeated", "target", "none"],
  "Route arrow modes should preserve valid modes and normalize unknown values."
);
assertDeepEqual(
  arrowModeProject.routes.map((route) => route.showArrows),
  [true, true, true, false],
  "Route showArrows should remain a compatibility boolean derived from arrowMode."
);

const hiddenActiveProject = PM.normalizeProject({
  schemaVersion: 1,
  appVersion: PM.APP_VERSION,
  settings: { activeRouteId: "hidden" },
  routes: [
    { id: "hidden", name: "Hidden", visible: false },
    { id: "visible", name: "Visible", visible: true, startNumber: 5 }
  ],
  points: [
    { id: "hidden-1", x: 0.1, y: 0.1, type: "route", routeId: "hidden" },
    { id: "visible-1", x: 0.2, y: 0.2, type: "route", routeId: "visible" }
  ]
});
assertEqual(hiddenActiveProject.settings.activeRouteId, "visible", "Hidden active routes should switch to a visible route.");
assertEqual(hiddenActiveProject.routes.find((route) => route.id === "hidden").visible, false, "Inactive hidden routes should stay hidden.");
assertDeepEqual(
  PM.Exporters.buildReaderChapters(hiddenActiveProject).map((chapter) => chapter.point.id),
  ["visible-1"],
  "Reader should not render a hidden route after active-route normalization."
);
const hiddenActiveReveal = PM.computePresentationReveal(hiddenActiveProject.points, hiddenActiveProject.settings, {
  active: true,
  step: 1,
  showAll: false
}, hiddenActiveProject.routes);
assertDeepEqual(hiddenActiveReveal.routePoints.map((point) => point.id), ["visible-1"], "Presentation should reveal only the visible active route.");

const allHiddenProject = PM.normalizeProject({
  settings: { activeRouteId: "only" },
  routes: [{ id: "only", name: "Only", visible: false }],
  points: [{ id: "only-1", x: 0.2, y: 0.2, type: "route", routeId: "only" }]
});
assertEqual(allHiddenProject.routes[0].visible, true, "The last active route should stay visible as a safe creation target.");

const multiJson = PM.Serialization.projectToJson(multiRouteProject);
const multiRoundTrip = PM.Serialization.parseProjectJson(multiJson);
assertEqual(multiRoundTrip.routes.length, 2, "Routes should round trip through project JSON.");
assertEqual(multiRoundTrip.points.find((point) => point.id === "timmy-2").routeId, "timmy", "Point route IDs should round trip.");

const revealFixture = PM.createEmptyProject({ locale: "en" });
revealFixture.points.push(
  PM.normalizePoint({ id: "r1", x: 0.1, y: 0.1, type: "route", label: "Start" }),
  PM.normalizePoint({ id: "h1", x: 0.2, y: 0.2, type: "route", helper: true }),
  PM.normalizePoint({ id: "r2", x: 0.3, y: 0.3, type: "route", label: "Pass" }),
  PM.normalizePoint({ id: "h2", x: 0.4, y: 0.4, type: "route", helper: true }),
  PM.normalizePoint({ id: "r3", x: 0.5, y: 0.5, type: "route", label: "End" }),
  PM.normalizePoint({ id: "ctx-near", x: 0.31, y: 0.31, type: "place", label: "Visible context" }),
  PM.normalizePoint({ id: "ctx-far", x: 0.52, y: 0.52, type: "place", label: "Spoiler" })
);
const revealInfo = PM.computePresentationReveal(revealFixture.points, revealFixture.settings, {
  active: true,
  step: 2,
  showAll: false
});
assertDeepEqual(revealInfo.routePoints.map((point) => point.id), ["r1", "h1", "r2"], "Presentation reveal should include helper only after its segment is revealed.");
assert(PM.isPointRevealed(revealFixture.points[0], revealFixture.points, revealFixture.settings, revealInfo), "First numbered route point should be revealed at step 2.");
assert(PM.isPointRevealed(revealFixture.points[1], revealFixture.points, revealFixture.settings, revealInfo), "Helper before step 2 should be revealed.");
assert(!PM.isPointRevealed(revealFixture.points[3], revealFixture.points, revealFixture.settings, revealInfo), "Helper after step 2 should stay hidden.");
assert(PM.isPointRevealed(revealFixture.points[5], revealFixture.points, revealFixture.settings, revealInfo), "Context points close to the revealed route should be shown in presentation mode.");
assert(!PM.isPointRevealed(revealFixture.points[6], revealFixture.points, revealFixture.settings, revealInfo), "Context points outside the revealed route corridor should stay hidden in presentation mode.");

const clampedReveal = PM.normalizePresentationState({ active: true, step: 99, showAll: false }, 3);
assertEqual(clampedReveal.step, 3, "Presentation step should clamp to route length.");
const showAllReveal = PM.computePresentationReveal(revealFixture.points, revealFixture.settings, {
  active: true,
  step: 1,
  showAll: true
});
assertDeepEqual(showAllReveal.routePoints.map((point) => point.id), ["r1", "h1", "r2", "h2", "r3"], "Show all should reveal full route including helpers.");

const activeRouteReveal = PM.computePresentationReveal(multiRouteProject.points, multiRouteProject.settings, {
  active: true,
  activeRouteId: "timmy",
  step: 2,
  showAll: false,
  routeSteps: {
    main: 1,
    timmy: 2
  }
}, multiRouteProject.routes);
assertDeepEqual(activeRouteReveal.routePoints.map((point) => point.id), ["timmy-1", "timmy-helper", "timmy-2"], "Presentation reveal should keep active-route routePoints for compatibility.");
assertDeepEqual(
  activeRouteReveal.routeReveals.map((entry) => [entry.route.id, entry.step, entry.routePoints.map((point) => point.id)]),
  [
    ["main", 1, ["main-1"]],
    ["timmy", 2, ["timmy-1", "timmy-helper", "timmy-2"]]
  ],
  "Presentation reveal should track independent progress per visible route."
);
assert(activeRouteReveal.visibleIds.has("main-1"), "Presentation should reveal the first step of the non-selected visible route.");
assert(activeRouteReveal.visibleIds.has("timmy-2"), "Presentation should reveal the selected route through its own step.");

const defaultFog = PM.normalizePresentationFogSettings();
assertEqual(defaultFog.mode, "focus", "Focus fog should be the default presentation fog mode.");
assertEqual(defaultFog.outsideVisibility, 0.22, "Default focus fog should keep only a little outside map visibility.");
assertEqual(defaultFog.trailMemory, true, "Default focus fog should keep the old trail subtler than the current point.");
const clampedFog = PM.normalizePresentationFogSettings({
  mode: "missing",
  outsideVisibility: 99,
  trailRadius: -5,
  focusRadius: 999,
  edgeSoftness: "x",
  trailMemory: false
});
assertEqual(clampedFog.mode, "focus", "Invalid fog mode should clamp to focus.");
assertEqual(clampedFog.outsideVisibility, 0.45, "Outside visibility should clamp to maximum.");
assertEqual(clampedFog.trailRadius, 0.03, "Trail radius should clamp to minimum.");
assertEqual(clampedFog.focusRadius, 0.28, "Focus radius should clamp to maximum.");
assertEqual(clampedFog.edgeSoftness, 0.06, "Invalid edge softness should fall back to default.");
assertEqual(clampedFog.trailMemory, false, "Trail memory should preserve explicit false.");

const json = PM.Serialization.projectToJson(project);
const parsed = PM.Serialization.parseProjectJson(json);
assert(parsed.points.length === 4 && parsed.points[3].location === "Town", "Project JSON round trip failed.");

const chapters = PM.Exporters.buildReaderChapters(project);
assertEqual(chapters.length, 2, "Reader should contain numbered route points only.");
assert(chapters[0].extras.length === 1 && chapters[0].extras[0].id === "p1", "Reader should attach context points to nearest numbered route point.");

const multiRouteChapters = PM.Exporters.buildReaderChapters(multiRouteProject);
assertDeepEqual(multiRouteChapters.map((chapter) => chapter.point.id), ["timmy-1", "timmy-2"], "Reader should build chapters from the active route only.");

const routeFixture = fixtures.get("route-with-helper.plotmap.json");
const routeFixtureInfo = PM.computeRouteInfo(routeFixture.points, routeFixture.settings);
assertEqual(routeFixtureInfo.displayById.get("route-start"), 7, "Fixture route start should respect chapterStart.");
assertEqual(routeFixtureInfo.displayById.get("route-helper"), "", "Fixture helper point should not receive a display number.");
assertEqual(routeFixtureInfo.displayById.get("route-end"), 8, "Fixture route end should skip helper point when numbering.");
assertEqual(routeFixtureInfo.numberedRoutes.length, 2, "Fixture numbered route list should skip helper point.");

const readerFixture = fixtures.get("reader-context.plotmap.json");
const readerFixtureChapters = PM.Exporters.buildReaderChapters(readerFixture);
assertEqual(readerFixtureChapters.length, 2, "Reader fixture should produce two chapters.");
assertDeepEqual(readerFixtureChapters[0].extras.map((point) => point.id), ["near-place", "near-character"], "Reader fixture first chapter extras should attach by nearest route.");
assertDeepEqual(readerFixtureChapters[1].extras.map((point) => point.id), ["near-event", "near-item"], "Reader fixture second chapter extras should attach by nearest route.");

const settingsFixture = fixtures.get("settings-heavy.plotmap.json");
assertEqual(settingsFixture.settings.locale, "de", "Settings fixture should preserve locale.");
assertEqual(settingsFixture.settings.theme, "contrast", "Settings fixture should preserve theme.");
assertEqual(settingsFixture.settings.filters.place, false, "Settings fixture should preserve disabled place filter.");
assertEqual(settingsFixture.settings.filters.event, false, "Settings fixture should preserve disabled event filter.");
assertEqual(settingsFixture.settings.chapterStart, 12, "Settings fixture should preserve chapter start.");
assertEqual(settingsFixture.settings.zoom, 2.5, "Settings fixture should preserve zoom.");
assertEqual(settingsFixture.settings.opacity, 0.55, "Settings fixture should preserve opacity.");
assertEqual(settingsFixture.settings.panX, 24, "Settings fixture should preserve panX.");
assertEqual(settingsFixture.settings.panY, -18, "Settings fixture should preserve panY.");
assertEqual(settingsFixture.settings.routeColor, "#3355aa", "Settings fixture should preserve route color.");
assertEqual(settingsFixture.settings.routeWidth, 8, "Settings fixture should preserve route width.");
assertEqual(settingsFixture.settings.fontScale, 1.25, "Settings fixture should preserve font scale.");
assertEqual(settingsFixture.settings.pointSizePx, 32, "Legacy settings should default point size.");
assertEqual(settingsFixture.settings.helperPointSizePx, 32, "Legacy projects without helper sizing should keep full-size helper points.");

const freshProject = PM.createEmptyProject({ locale: "en" });
assertEqual(freshProject.settings.helperPointSizePx, 24, "New projects should default helper route points to a smaller visual size.");

const legacyAliasProject = PM.normalizeProject({
  schemaVersion: 1,
  appVersion: PM.APP_VERSION,
  settings: { midpointSizePx: 18 },
  points: [
    { id: "alias-helper", x: 0.2, y: 0.2, type: "route", helper: true }
  ]
});
assertEqual(legacyAliasProject.settings.helperPointSizePx, 18, "Dev-branch midpointSizePx should migrate as helperPointSizePx.");

const clamped = PM.normalizeSettings({
  locale: "xx",
  theme: "missing",
  chapterStart: -10,
  zoom: 99,
  opacity: -1,
  routeWidth: 99,
  fontScale: 99,
  routeColor: "red",
  pointSizePx: 99,
  helperPointSizePx: -1
});
assertEqual(clamped.locale, "en", "Invalid locale should clamp to English.");
assertEqual(clamped.theme, "deep", "Invalid theme should clamp to default.");
assertEqual(clamped.chapterStart, 1, "Invalid chapter start should clamp to 1.");
assertEqual(clamped.zoom, 5, "Invalid zoom should clamp to maximum.");
assertEqual(clamped.opacity, 0.1, "Invalid opacity should clamp to minimum.");
assertEqual(clamped.routeWidth, 12, "Invalid route width should clamp to maximum.");
assertEqual(clamped.fontScale, 1.6, "Invalid font scale should clamp to maximum.");
assertEqual(clamped.routeColor, "#cc3333", "Invalid route color should clamp to default.");
assertEqual(clamped.pointSizePx, 48, "Point size should clamp to maximum.");
assertEqual(clamped.helperPointSizePx, 12, "Helper point size should clamp to minimum.");

console.log(`Static checks passed (${scripts.length} script block, ${fixtureNames.length} fixtures).`);

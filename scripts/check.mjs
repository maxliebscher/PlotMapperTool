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
requireHtml("presentationPrev", "Presentation previous control");
requireHtml("presentationNext", "Presentation next control");
requireHtml("presentationShowAll", "Presentation show-all control");
requireHtml("presentationReset", "Presentation reset control");
requireHtml("presentationExit", "Presentation exit control");
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

const revealFixture = PM.createEmptyProject({ locale: "en" });
revealFixture.points.push(
  PM.normalizePoint({ id: "r1", x: 0.1, y: 0.1, type: "route", label: "Start" }),
  PM.normalizePoint({ id: "h1", x: 0.2, y: 0.2, type: "route", helper: true }),
  PM.normalizePoint({ id: "r2", x: 0.3, y: 0.3, type: "route", label: "Pass" }),
  PM.normalizePoint({ id: "h2", x: 0.4, y: 0.4, type: "route", helper: true }),
  PM.normalizePoint({ id: "r3", x: 0.5, y: 0.5, type: "route", label: "End" }),
  PM.normalizePoint({ id: "ctx", x: 0.52, y: 0.52, type: "place", label: "Spoiler" })
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
assert(!PM.isPointRevealed(revealFixture.points[5], revealFixture.points, revealFixture.settings, revealInfo), "Context points should stay hidden in presentation mode.");

const clampedReveal = PM.normalizePresentationState({ active: true, step: 99, showAll: false }, 3);
assertEqual(clampedReveal.step, 3, "Presentation step should clamp to route length.");
const showAllReveal = PM.computePresentationReveal(revealFixture.points, revealFixture.settings, {
  active: true,
  step: 1,
  showAll: true
});
assertDeepEqual(showAllReveal.routePoints.map((point) => point.id), ["r1", "h1", "r2", "h2", "r3"], "Show all should reveal full route including helpers.");

const json = PM.Serialization.projectToJson(project);
const parsed = PM.Serialization.parseProjectJson(json);
assert(parsed.points.length === 4 && parsed.points[3].location === "Town", "Project JSON round trip failed.");

const chapters = PM.Exporters.buildReaderChapters(project);
assertEqual(chapters.length, 2, "Reader should contain numbered route points only.");
assert(chapters[0].extras.length === 1 && chapters[0].extras[0].id === "p1", "Reader should attach context points to nearest numbered route point.");

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

const clamped = PM.normalizeSettings({
  locale: "xx",
  theme: "missing",
  chapterStart: -10,
  zoom: 99,
  opacity: -1,
  routeWidth: 99,
  fontScale: 99,
  routeColor: "red"
});
assertEqual(clamped.locale, "en", "Invalid locale should clamp to English.");
assertEqual(clamped.theme, "deep", "Invalid theme should clamp to default.");
assertEqual(clamped.chapterStart, 1, "Invalid chapter start should clamp to 1.");
assertEqual(clamped.zoom, 5, "Invalid zoom should clamp to maximum.");
assertEqual(clamped.opacity, 0.1, "Invalid opacity should clamp to minimum.");
assertEqual(clamped.routeWidth, 12, "Invalid route width should clamp to maximum.");
assertEqual(clamped.fontScale, 1.6, "Invalid font scale should clamp to maximum.");
assertEqual(clamped.routeColor, "#cc3333", "Invalid route color should clamp to default.");

console.log(`Static checks passed (${scripts.length} script block, ${fixtureNames.length} fixtures).`);

import { readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const html = await readFile(join(root, "index.html"), "utf8");
const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map((match) => match[1]);
const closeScriptCount = (html.match(/<\/script>/gi) || []).length;

if (!scripts.length) throw new Error("No script blocks found in generated HTML.");
if (closeScriptCount !== scripts.length) throw new Error("Raw </script> text found inside generated script content.");
if (/\b(?:Export MD|Import MD|markdownInput)\b/.test(html)) {
  throw new Error("Legacy Markdown project controls must not be present in the main UI.");
}
if (!html.includes("📖 ${PM.I18n.t(locale, \"reader\")}") && !html.includes("\\uD83D\\uDCD6 ${PM.I18n.t(locale, \"reader\")}")) {
  throw new Error("Reader toolbar button should include the book icon prefix.");
}
if (!html.includes("helpTitle") || !html.includes("Tutorial") || !html.includes("Schließen")) {
  throw new Error("Tutorial modal title and localized close label should be present.");
}
if (/Export MD|Import MD|Markdown/.test(html.match(/helpHtml:[\s\S]*?(?=\n\s*}\n|,\n\s*\w+:)/)?.[0] || "")) {
  throw new Error("Tutorial copy must not advertise Markdown project import/export.");
}
if (/\.empty-hint\s*\{[\s\S]*?place-items:\s*center\s+end\s*;/i.test(html)) {
  throw new Error("Empty hint must not be pinned to the right edge.");
}
if (!/\.empty-hint\s*\{[\s\S]*?place-items:\s*center\s*;/i.test(html)) {
  throw new Error("Empty hint should be centered in the viewport.");
}
if (!/\.brand-logo\s*\{[\s\S]*?overflow:\s*visible\s*;/i.test(html)) {
  throw new Error("Splash logo must allow the route stroke to render without clipping.");
}
if (!/\.splash\s*\{[\s\S]*?color:\s*#fff\s*;/i.test(html) || !/\.splash h1\s*\{[\s\S]*?color:\s*#fff\s*;/i.test(html)) {
  throw new Error("Splash title/text must stay white independently of the active theme.");
}
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
const project = PM.createEmptyProject({ locale: "en" });
project.map = { name: "test-map.png", dataUrl: "data:image/png;base64,AA==", width: 100, height: 100 };
project.points.push(
  PM.normalizePoint({ id: "r1", x: 0.1, y: 0.1, type: "route", label: "Start", note: "A", duration: "1h" }),
  PM.normalizePoint({ id: "h1", x: 0.2, y: 0.2, type: "route", helper: true }),
  PM.normalizePoint({ id: "r2", x: 0.8, y: 0.8, type: "route", label: "End" }),
  PM.normalizePoint({ id: "p1", x: 0.12, y: 0.12, type: "place", label: "Inn", location: "Town" })
);

const routeInfo = PM.computeRouteInfo(project.points, project.settings);
if (routeInfo.displayById.get("r1") !== 1) throw new Error("First route step should be 1.");
if (routeInfo.displayById.get("h1") !== "") throw new Error("Helper route step should be empty.");
if (routeInfo.displayById.get("r2") !== 2) throw new Error("Second numbered route step should be 2.");

const json = PM.Serialization.projectToJson(project);
const parsed = PM.Serialization.parseProjectJson(json);
if (parsed.points.length !== 4 || parsed.points[3].location !== "Town") throw new Error("Project JSON round trip failed.");

const chapters = PM.Exporters.buildReaderChapters(project);
if (chapters.length !== 2) throw new Error("Reader should contain numbered route points only.");
if (chapters[0].extras.length !== 1 || chapters[0].extras[0].id !== "p1") throw new Error("Reader should attach context points to nearest numbered route point.");

console.log(`Static checks passed (${scripts.length} script block).`);

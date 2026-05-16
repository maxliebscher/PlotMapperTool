import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const sourceFiles = [
  "src/00-namespace.js",
  "src/constants.js",
  "src/i18n.js",
  "src/utils.js",
  "src/state.js",
  "src/presentation.js",
  "src/serialization.js",
  "src/exporters.js",
  "src/theme.js",
  "src/renderer.js",
  "src/menu.js",
  "src/point-ui.js",
  "src/reader.js",
  "src/app.js"
];

const [template, css, ...scripts] = await Promise.all([
  readFile(join(root, "index.template.html"), "utf8"),
  readFile(join(root, "src/styles.css"), "utf8"),
  ...sourceFiles.map((file) => readFile(join(root, file), "utf8"))
]);

const js = scripts.map((content, index) => `\n/* ${sourceFiles[index]} */\n${content.trim()}\n`).join("\n");
const html = template
  .replace("/*__PLOTMAP_CSS__*/", css.trim())
  .replace("/*__PLOTMAP_JS__*/", js.trim());

await writeFile(join(root, "index.html"), html, "utf8");
console.log("Built index.html");

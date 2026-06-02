# PlotMapper v1.3.0

Feature release for onboarding, cleaner toolbar/menu structure, minimap clarity, and a stronger presentation workflow.

## Highlights
- Reworked first-start/onboarding copy and empty-state guidance so new and returning users can start with either a fresh map or a saved project.
- Cleaner Project and Options menus with direct PNG, HTML, and PDF export access from Project, plus wheel zoom, route settings, slider, tooltip, filter, language, and theme preferences in Options.
- Main toolbar cleanup: global chapter numbering was removed, route numbering now lives in per-route settings, undo/redo are compact icon buttons, and menu collapse behaves consistently.
- Minimap route overlays can be hidden locally, keeping complex maps readable.
- Presentation Mode now has four selectable views, per-route progress, theme switching in the presentation settings, and German Sichtfeld labels.
- Sichtfeld/guide reveal styling uses smoother edges and compact default settings for a stronger presentation look.
- Route color confirmation, deep-theme button outlines, project-menu labels, and menu click-away behavior were refined.
- Presentation PNG export now respects the active Sichtfeld, revealed route segments, and visible points instead of leaking hidden path sections.

## Screenshot
![PlotMapper v1.3.0](https://github.com/maxliebscher/PlotMapperTool/releases/download/v1.3.0/v1.3.0.jpg)

## Verification
- `npm.cmd test`
- `npm.cmd run smoke`
- `npm.cmd run build`
- README screenshot gallery prepared with compressed JPG assets

## Assets
- `Plotmapper_v1.3.0.html` is the standalone browser build.
- `v1.3.0.jpg` is the release screenshot.

## Live Demo
- Live version: https://maxliebscher.github.io/PlotMapperTool/
- The GitHub Pages demo is built from `main:/index.html`.

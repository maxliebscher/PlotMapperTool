# PlotMapper v1.2.0

Feature release for multi-route planning, presentation, and Focus Fog workflows.

## Highlights
- New optional multi-route workflow with route-specific color, visibility, numbering, arrow mode, line style, width, start number, active route, rename, and delete controls.
- Presentation Mode can now track progress per visible route, so separate factions, alternatives, or parallel story paths can be revealed independently.
- Focus Fog supports the multi-route view and can reveal nearby context points along already visible route corridors without exposing the full map.
- Direct Story Picker for adding route points, places, characters, events, and items without breaking the map-planning flow.
- Confirmed route color picker with `OK` / `Cancel`, compact route controls, collapsible main menu, menu opacity, point size, and helper point size controls.
- Reader, tutorial/help text, duration labels, note wrapping, PNG export parity, and offline-release checks were updated for the v1.2.0 workflow.
- README now includes a fuller screenshot gallery covering editor, route management, presentation, reader, tutorial, and Story Picker views.

## Screenshot
![Multi-route Presentation Mode with Focus Fog](https://github.com/maxliebscher/PlotMapperTool/releases/download/v1.2.0/v1.2.0-presentation-multi-route-fog.png)

## Verification
- `npm.cmd test`
- `npm.cmd run smoke`
- `npm.cmd run build`
- README screenshot gallery previewed locally with Playwright

## Assets
- `Plotmapper_v1.2.0.html` is the standalone browser build.
- `v1.2.0-presentation-multi-route-fog.png` is the release screenshot.

## Live Demo
- Live version: https://maxliebscher.github.io/PlotMapperTool/
- The GitHub Pages demo is built from `main:/index.html`.

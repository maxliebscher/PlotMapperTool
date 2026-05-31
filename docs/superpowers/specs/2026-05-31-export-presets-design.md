# PlotMapper Export Presets Design

Status: concept validated, not production yet.

User decision on 2026-05-31: **if this feature is pursued at all, pursue Variant B only**. Keep the threshold high; do not build export UI just because it looks nice.

Source demo: `.superpowers/brainstorm/ux-roadmap-2026-05-24/export-presets-lab.html`

Verification:

- `node .superpowers\brainstorm\ux-roadmap-2026-05-24\verify-export-presets-lab.mjs`
- Screenshots:
  - `.superpowers/brainstorm/ux-roadmap-2026-05-24/export-presets-lab-1366x900.png`
  - `.superpowers/brainstorm/ux-roadmap-2026-05-24/export-presets-lab-390x844.png`

## Problem

PlotMapper already has useful output paths:

- PNG export of the current map view.
- Presentation mode with multi-route reveal and fog.
- Reader HTML/PDF-style reading view.

The current UI exposes these as separate buttons. That is fine for familiar users, but the app does not clearly answer the export question: "What exactly will be included, and what stays internal?"

The next export step should clarify existing workflows instead of adding a large new control room.

## Demo Variants

### A - Quick Popover

Small menu near the existing PNG button.

Strengths:

- Minimal UI change.
- Low mouse travel.
- Easy to understand for simple "current PNG" exports.

Weaknesses:

- Too little room to explain what each preset includes.
- Risks becoming a cramped list as soon as Reader/Presentation/Handout outputs are added.

Do not pursue now. It may become a compact mode later if Variant B proves useful and users want a faster path.

### B - Export Sheet

Temporary sheet opened from PNG/export command. It shows presets plus a small preview and a clear include/exclude checklist.

Only direction worth pursuing from this concept round.

Useful presets:

- `Visible state`: PNG of the current map, including current zoom, route visibility, labels, fog/reveal state, and visible context points.
- `Player handout`: PNG without edit UI and without hidden/internal notes.
- `Reader package`: Reader HTML and print/PDF flow.
- `Map only`: current map without menus or editor overlays.

Why this is the best first step:

- Keeps PlotMapper map-first.
- Reuses existing PNG, Reader, and Presentation code paths.
- Explains export scope without turning the UI into a project-management panel.
- Works as a temporary modal/sheet, so it does not add permanent toolbar pressure.

### C - Presentation Control Room

Large presenter surface with speaker/audience modes, cue cards, export queues, and read-only sharing.

Do not pursue now:

- Strong for gamemaster, classroom, and pitch workflows.
- Too much new UI and state for the next safe increment.
- Should only follow after the smaller Export Sheet proves useful and real projects show that a larger presenter workflow is needed.

## Production MVP

If production work begins, build a temporary `Export` sheet, not a permanent panel.

Entry points:

- Existing PNG button can open the sheet.
- Command Palette can expose `Export`.
- Presentation dock can still keep a fast `Export current presentation state as PNG` action.

Initial behavior:

- `Visible state` calls the existing PNG export path.
- `Reader package` opens or exports from the existing Reader path.
- `Player handout` can start as a preset that temporarily suppresses editor-only UI during PNG export.
- `Map only` can start as current PNG export with menu/editor overlays excluded.

The sheet should show:

- Preset buttons.
- One-line preview of what will be exported.
- "Includes" and "Stays internal" copy.
- A close/cancel action.

## Non-Goals

- No export queue in the first implementation.
- No new project schema.
- No cloud/share service.
- No full read-only audience app in the same batch.
- No tag/layer/export-set manager.
- No destructive changes to save/load format.

## Data And Interfaces

No `.plotmap.json` fields are needed for the MVP.

Possible UI-only local storage later:

- Last selected export preset.
- Whether the export sheet opens in compact or detailed mode.

Possible future module shape:

```js
PM.createExportSheet({
  panel,
  openButton,
  store,
  renderer,
  reader,
  presentation
});
```

Keep export presets as runtime descriptors first:

```js
{
  id: "visible-state",
  labelKey: "exportVisibleState",
  kind: "png",
  includePresentationState: true,
  hideEditorUi: true
}
```

Do not serialize these descriptors until there is a real custom-preset use case.

## UX Rules

- Export choices must say what is included.
- Export choices must say what stays internal when relevant.
- Do not force the user to understand PNG/HTML/PDF implementation details before choosing.
- Keep the default recommendation obvious.
- The sheet must work at narrow widths without horizontal document scroll.
- Presentation export must preserve the current reveal/fog state.
- Reader export must remain readable and printable.

## Test Plan For Production

Static/unit checks:

- Export sheet markup exists and has localized labels.
- Preset descriptors are registered.
- Offline dependency guard still passes.

Smoke checks:

- Open Export sheet from toolbar.
- Close with Escape and close button.
- Run `Visible state` and verify PNG download is requested.
- Open Reader package and verify Reader export remains available.
- Enter Presentation mode, advance reveal, export visible state, and verify the app stays in presentation mode.
- Narrow viewport has no horizontal overflow.

Build checks:

- `npm.cmd test`
- `npm.cmd run smoke`
- `npm.cmd run build`
- `git diff --check`

## Recommendation

Proceed with Variant B only if export ambiguity becomes a real enough pain point after the current Finder/Inspector polishing is stable.

First implementation should be deliberately modest: a clear export sheet around existing output paths. The larger Control Room should remain parked until actual use shows that cue cards, export queues, or read-only audience packages are worth the extra state and UI weight.

# PlotMapper Focus Fog Settings Design

Date: 2026-05-17
Status: Approved direction from visual exploration

## Purpose

Focus Fog extends Presentation Mode with a visual fog-of-war overlay. It should
keep the current route step clearly visible while pushing the unknown map area
far into the background.

Cloud effects are excluded from the first implementation. The implementation
should be stable, readable, and fast on ordinary browser/GPU setups.

## Selected Default

Use the strong focus-fog direction, corresponding to the visual mockup "B":

- unknown surroundings are heavily dimmed and desaturated;
- the previously revealed route remains visible;
- the current route point gets the strongest reveal radius;
- the effect lives only in Presentation Mode.

## Settings

The settings are ephemeral presentation settings, not saved to `.plotmap.json`
in this first pass.

Expose enough controls to recreate the explored variants:

- `mode`: `off`, `focus`, or `all`
- `outsideVisibility`: how much of the unknown map remains visible
- `trailRadius`: corridor width for previously revealed route
- `focusRadius`: radius around the current route point
- `edgeSoftness`: feathering around the reveal edge
- `trailMemory`: whether older route steps are narrower/subtler than the
  current step

Default values should match the strong focus-fog direction.

## UI

Add a small gear button to the existing Presentation dock. It opens a compact
popover above the dock.

The popover contains:

- segmented mode control: Off / Focus / Whole route;
- range controls for surroundings, focus radius, path width, and edge softness;
- a checkbox/toggle for weaker old path.

The controls should be keyboard reachable and should not appear in normal edit
mode.

## Rendering

Render the fog in `src/renderer.js` after the full-color map image is drawn.

The canvas algorithm:

1. Draw the map normally.
2. Compute revealed route points from `PM.getPresentationReveal()`.
3. Build an outside mask: whole viewport minus a route corridor and current
   focus circle.
4. Draw a dim/desaturated copy of the map over the outside mask.
5. Draw a dark translucent overlay over the outside mask.

This keeps the revealed route fully colorful because the fog is drawn only
outside the reveal shape.

## Success Criteria

- Presentation Mode starts with Focus Fog enabled by default.
- The route reveal still works step by step.
- The current route point has a larger reveal area than old route points.
- The gear popover can adjust the effect live.
- Off mode removes the fog without leaving Presentation Mode.
- Whole route mode keeps the fog active but opens the full route corridor.
- `npm test` and browser smoke pass.

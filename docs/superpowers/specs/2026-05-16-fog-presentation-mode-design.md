# PlotMapper Fog Presentation Mode Design

Date: 2026-05-16
Status: Draft design approved for the Presentation Overlay direction

## Purpose

Fog Presentation Mode lets a user reveal an existing single route step by step
while presenting, running a tabletop session, reviewing a story path, or giving
a talk. It should feel like a lightweight presenter layer on top of the current
map, not like a second route model.

The first version focuses on the existing numbered route. It deliberately avoids
multi-routes, route branching semantics, tags, bookmarks, and timeline views.

## Selected Approach

Use a dedicated Presentation Overlay.

The normal toolbar stays the editing surface. When Presentation Mode is active,
the app hides the large editing UI and shows a compact floating control dock over
the map. The dock exposes the current reveal step, previous/next, show all,
reset, and exit.

This is the best first slice because it gives the feature a clear use case:
present the map without editor noise. It also keeps the route data model intact.

## Scope

Included:

- A Presentation/Fog toggle in the main UI.
- A floating presentation dock with previous, next, show all, reset, and exit.
- Step-based reveal of numbered route points.
- Route lines reveal only up to the current visible step.
- Context and helper behavior that stays predictable without adding new point
  metadata.
- Keyboard shortcuts for presentation flow.
- Export and save behavior that does not permanently rewrite project data.
- English and German labels.

Excluded:

- Multiple independent routes.
- Route groups, tags, or sessions.
- Route Inspector, point search, bookmarks, autosave, or zip packaging.
- Persistent presentation state in `.plotmap.json`.
- Animated fog masks or per-region polygon fog.

## User Experience

The main toolbar gets a clear entry button such as `Present` / `Präsentieren`.
Activating it switches the document into a presentation class:

- The toolbar, info badge, edit buttons, midpoints, and menus are hidden.
- The canvas, route layer, and point layer remain visible.
- A compact dock appears at the bottom center.
- Escape exits presentation mode.

The dock contains:

- Previous step.
- Current step label, for example `3 / 8`.
- Next step.
- Show all.
- Reset.
- Exit.

Keyboard shortcuts:

- ArrowRight, Space, or PageDown reveals the next step.
- ArrowLeft, Backspace, or PageUp goes back one step.
- Home resets to the first reveal state.
- End shows all numbered route points.
- Escape exits Presentation Mode.

Shortcuts do nothing while an input, textarea, or modal field is active.

## Reveal Semantics

The reveal state is UI-only and represented as a numeric `presentationStep`.

The route source remains `PM.computeRouteInfo(state.points, state.settings)`.
Only non-helper route points count as numbered reveal steps.

Visibility rules in presentation:

- Numbered route points are visible when their route step is less than or equal
  to `presentationStep`.
- Helper route points are visible only when they sit between revealed numbered
  points. This keeps line shaping intact after the route segment is revealed.
- Non-route context points are hidden in the first version while presenting.
  This keeps the presentation focused and avoids accidental spoilers.
- If `show all` is active, all points that would normally pass current filters
  are visible, but edit affordances remain hidden.

Initial step:

- Entering Presentation Mode starts at step `1` when the route has numbered
  points, so the first route point is visible immediately.
- If there are no numbered route points, the dock shows an empty route message
  and disables previous/next/show-all actions.

## Architecture

Add a presentation controller module, for example `src/presentation.js`.

Responsibilities:

- Own ephemeral presentation UI state.
- Render the floating dock.
- Toggle the document presentation class.
- Bind button and keyboard interactions.
- Notify the existing point/route rendering layer when reveal state changes.

The store should not gain project-level presentation fields for v1. The state is
not part of the saved project and is reset on project load.

Expose a small helper API on `PM`, for example:

- `PM.createPresentationController(...)`
- `PM.getPresentationState()`
- `PM.isPointRevealed(point, state, presentationState)`
- `PM.getRevealedRoutePoints(points, settings, presentationState)`

The exact names can follow the surrounding module style during implementation.

## Rendering Changes

`src/point-ui.js` is the main integration point because it already decides which
DOM points and route polyline segments are visible.

Point rendering should combine current filter visibility with presentation
reveal visibility:

1. Normal mode uses the current `PM.isPointVisible` behavior.
2. Presentation mode applies the reveal filter after normal visibility.
3. Midpoints and point menu buttons remain hidden during presentation.

Route line rendering should receive only the revealed route points. It should
not draw future route segments at low opacity in v1 because that still leaks the
path.

`src/renderer.js` only needs changes if PNG export should honor the active
presentation reveal. For v1, PNG export can continue exporting the normal editor
view unless the user explicitly requests presentation export later.

## Data Flow

`app.js` creates the presentation controller after renderer and point UI exist.
The controller subscribes to the store, computes route counts, and asks point UI
to re-render when its ephemeral state changes.

Project load, clear, and route edits should clamp `presentationStep` to the
current route length. If the route shrinks below the current step, the step moves
to the last available numbered route point.

The controller should close context menus and help/reader overlays when entering
presentation mode.

## Error Handling

The feature should degrade quietly:

- With no loaded map, the Presentation button can remain enabled but the dock
  shows the same empty route state.
- With no numbered route points, controls that need a route are disabled.
- If a route edit happens while presenting, the step clamps rather than throwing.
- If the user switches language or theme while presenting through keyboard or
  settings state, labels update on the next render.

## Accessibility

The dock is keyboard reachable and uses native buttons.

Buttons have descriptive text or `aria-label` values in both supported
languages. The current step uses `aria-live="polite"` so screen readers can
announce reveal changes without interrupting.

The mode does not trap focus. Escape is always the quick exit path unless the
user is inside an input-like control.

## Testing

Fast tests should cover model-level helpers:

- Route reveal includes numbered points up to the current step.
- Helper points are revealed only when their surrounding segment is revealed.
- Empty route state is safe.
- Step clamping works when route length changes.
- Normal point visibility remains unchanged outside presentation mode.

Browser smoke coverage should cover:

- Enter Presentation Mode.
- Toolbar hides and dock appears.
- Next and previous change visible route points.
- End/show-all reveals the full route.
- Reset returns to the first route point.
- Escape exits and restores the normal toolbar.

Manual visual QA should check desktop and narrow viewport layouts because the
dock sits over the map.

## Success Criteria

The first implementation is done when:

- A user can enter a clean map-only presentation view.
- The existing single route can be revealed step by step.
- The feature does not alter saved project data.
- Normal editing, Reader, save/load, undo/redo, and PNG export still work.
- `npm test` passes.
- Browser smoke or manual browser QA confirms the presentation controls render
  and respond on desktop and mobile-sized viewports.

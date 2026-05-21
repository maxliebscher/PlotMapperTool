# PlotMapper Multi-Routes Design

Date: 2026-05-18
Status: Approved direction from visual exploration and user review

## Purpose

Add optional multiple route support without weakening the current story flow.
PlotMapper should still encourage users to lay down the main path first. Route
management must be available, but not loud by default.

## UX Direction

Keep the existing map-first point creation flow. A map double-click opens the
type chooser at the click location and lets the user choose:

- Route point
- Place
- Character
- Event
- Item

When multiple routes exist, the Route point row shows the active route color and
name so the user knows where the point will be added. Non-route point creation
does not require choosing a route.

Route management is a collapsible panel, opened from a compact toolbar control
that shows the active route. It contains one row per route with:

- active route selector
- color swatch
- visibility toggle
- number toggle
- arrow toggle
- start number
- delete action
- route name
- style controls for line kind and width

The panel is a workspace for managing paths, not the primary point creation
surface.

## Data Model

Projects gain a `routes` array and `settings.activeRouteId`.

Each route has:

- `id`
- `name`
- `color`
- `visible`
- `showNumbers`
- `showArrows`
- `startNumber`
- `lineStyle`: `solid`, `dashed`, or `dotted`
- `width`

Route points gain `routeId`. Existing `.plotmap.json` files without routes are
normalized to one default route. Existing route points are assigned to that
default route. Existing `settings.routeColor`, `settings.routeWidth`,
`settings.chapterMode`, and `settings.chapterStart` seed the default route for
backward compatibility and remain accepted on load.

## Route Semantics

Only points with `type === "route"` belong to routes. Place, character, event,
and item points stay unconnected context points.

The active route controls:

- new route points from the type chooser
- midpoint insertion
- presentation step sequence
- focus fog reveal sequence
- reader chapter sequence

Visible non-active routes can remain on the map as reference paths in normal edit
mode. Presentation uses one active route in the first implementation to avoid
mixing story sequences.

## Rendering

Draw one SVG polyline per visible route. Per route style controls affect color,
width, dash pattern, and optional arrow markers. Helper route points shape only
their own route.

Point circles for route points use their route color. Number labels respect each
route's `showNumbers` and `startNumber`. Hidden routes hide their route points
and line but do not delete data.

PNG export mirrors on-screen route styling and per-route numbering.

## Compatibility

Existing project files must round-trip without losing data. A saved new project
includes `routes` and `routeId`, but legacy settings are tolerated when loading.

Focus Mode still hides non-route points. The global Route type filter still
hides all route points and route lines.

Presentation Mode, Focus Fog, and Reader operate on the active route. If the
active route is deleted, the first remaining route becomes active. The last
route cannot be deleted.

## Testing

The first pass must cover:

- legacy project normalization creates one compatible route
- per-route numbering and helper skipping
- route visibility and active route behavior
- serialization round trip for routes and routeId
- presentation reveal uses active route only
- reader chapters use active route only
- smoke flow: old point type chooser still works, route panel opens, active
  route can change, new route point uses active route, visibility/number/arrow
  toggles update state

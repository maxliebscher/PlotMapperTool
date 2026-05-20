# Multi-Routes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add optional multi-route support while preserving PlotMapper's map-first point creation flow.

**Architecture:** Extend the normalized project model with routes and route IDs, then thread route selection through state, rendering, reader, presentation, and export. Keep the route-management UI collapsible and leave point type creation at the map click.

**Tech Stack:** Plain browser JavaScript modules bundled into `index.html`, CSS, Node static checks, Playwright smoke tests.

---

### Task 1: Data Model And Static Tests

**Files:**
- Modify: `src/constants.js`
- Modify: `src/state.js`
- Modify: `src/serialization.js`
- Modify: `scripts/check.mjs`
- Modify/Create: `testdata/fixtures/*.plotmap.json`

- [ ] Write failing static tests for route normalization, route round trip, active route numbering, helper skipping per route, and active-route presentation reveal.
- [ ] Run `npm.cmd test` and confirm failures are caused by missing multi-route support.
- [ ] Add default route constants and route normalization helpers.
- [ ] Add `routes`, `settings.activeRouteId`, and `point.routeId` normalization.
- [ ] Preserve legacy route settings on load by seeding the default route from `routeColor`, `routeWidth`, `chapterMode`, and `chapterStart`.
- [ ] Add route-aware helpers for active route lookup, route point filtering, and route info computation.
- [ ] Run `npm.cmd test` and confirm the new model tests pass.

### Task 2: Route-Aware UI Flow

**Files:**
- Modify: `index.template.html`
- Modify: `src/i18n.js`
- Modify: `src/app.js`
- Modify: `src/menu.js`
- Modify: `src/styles.css`
- Modify: `scripts/check.mjs`

- [ ] Write failing static checks for route panel markup, route i18n, and no loss of the type chooser.
- [ ] Add a compact route toggle button to the toolbar.
- [ ] Add a collapsible route panel with active selector, color, visibility, numbers, arrows, start number, delete, name, line style, width, and add route.
- [ ] Keep double-click type chooser as the primary creation path.
- [ ] Make the Route point chooser entry show the active route name/color.
- [ ] Wire route UI to store methods for add, patch, delete, active selection, and route point creation.
- [ ] Run `npm.cmd test`.

### Task 3: Rendering, Midpoints, PNG

**Files:**
- Modify: `src/point-ui.js`
- Modify: `src/renderer.js`
- Modify: `src/styles.css`
- Modify: `scripts/check.mjs`

- [ ] Write failing tests/checks for route style attributes and route-aware midpoint insertion.
- [ ] Render one line set per visible route with color, width, dash pattern, and optional arrows.
- [ ] Color route point nodes by route.
- [ ] Hide numbers per route when disabled.
- [ ] Insert midpoint into the route segment it belongs to.
- [ ] Update PNG export to mirror route styling and route numbering.
- [ ] Run `npm.cmd test`.

### Task 4: Reader, Presentation, Fog Compatibility

**Files:**
- Modify: `src/exporters.js`
- Modify: `src/presentation.js`
- Modify: `src/renderer.js`
- Modify: `scripts/check.mjs`
- Modify: `scripts/smoke.mjs`

- [ ] Write failing tests for active-route-only reader chapters and presentation reveal.
- [ ] Make reader build chapters from active route numbered points.
- [ ] Make presentation length, reveal IDs, and fog reveal use the active route.
- [ ] Keep non-active visible routes on the edit map but out of presentation sequence.
- [ ] Run `npm.cmd test`.

### Task 5: Browser Smoke And Audit

**Files:**
- Modify: `scripts/smoke.mjs`
- Modify: `README.md`
- Modify: `CHANGELOG.md`

- [ ] Extend smoke test to open route panel, add route, switch active route, add route point through the type chooser, toggle route visibility/numbers/arrows, enter presentation, and export.
- [ ] Run `npm.cmd run build`.
- [ ] Run `npm.cmd test`.
- [ ] Run `npm.cmd run smoke`.
- [ ] Use the in-app browser for visual QA of desktop and narrow viewports.
- [ ] Request code review/self-audit, fix findings, and rerun verification.

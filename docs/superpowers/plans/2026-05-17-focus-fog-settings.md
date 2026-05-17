# Focus Fog Settings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add configurable Focus Fog to Presentation Mode without saving new project data.

**Architecture:** Extend `src/presentation.js` with normalized fog settings and a gear popover, then have `src/renderer.js` draw the dimmed outside area on canvas using those settings and the existing reveal route. Keep route/point DOM reveal behavior unchanged.

**Tech Stack:** Vanilla JS, Canvas 2D, existing static checks, Playwright smoke.

---

## Tasks

- [x] Add model-level tests for fog settings normalization and preset behavior in `scripts/check.mjs`.
- [x] Extend `src/presentation.js` with default Focus Fog settings, update helpers, and `PM.getPresentationFogSettings`.
- [x] Add dock gear and popover markup in `index.template.html`.
- [x] Add English/German labels in `src/i18n.js`.
- [x] Add popover styles in `src/styles.css`.
- [x] Wire popover controls in `src/app.js` / `src/presentation.js`.
- [x] Draw focus fog in `src/renderer.js` and redraw on presentation changes.
- [x] Extend `scripts/smoke.mjs` to verify gear, mode changes, and fog canvas pixel difference.
- [x] Run `npm.cmd test`, `npm.cmd run build`, and `npm.cmd run smoke`.

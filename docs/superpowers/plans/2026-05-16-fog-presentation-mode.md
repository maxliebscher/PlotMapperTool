# Fog Presentation Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a lightweight Presentation/Fog mode that reveals the existing single route step by step without changing saved project data.

**Architecture:** Add a focused `src/presentation.js` module for ephemeral presentation state, reveal helpers, dock rendering, and keyboard handling. Wire it into `app.js`, let `point-ui.js` consume the reveal helpers, and keep the store/project schema unchanged.

**Tech Stack:** Vanilla JavaScript modules wrapped on `globalThis.PM`, DOM/CSS UI, existing `npm test` static/model checks, optional Playwright smoke via `npm run smoke`.

---

## File Structure

- Create `src/presentation.js`: presentation controller and pure reveal helper functions.
- Modify `scripts/build.mjs`: include `src/presentation.js` before `src/point-ui.js` and `src/app.js`.
- Modify `scripts/check.mjs`: load `src/presentation.js` in the VM and add model-level reveal assertions.
- Modify `index.template.html`: add the Presentation button and dock host.
- Modify `src/app.js`: create the controller, include controls, sync labels, and enter/exit behavior.
- Modify `src/point-ui.js`: filter points, route lines, midpoints, and edit affordances while presenting.
- Modify `src/i18n.js`: add English and German labels for the new controls.
- Modify `src/styles.css`: add presentation-mode page class and dock styling.

## Task 1: Pure Reveal Helpers

**Files:**
- Create: `src/presentation.js`
- Modify: `scripts/build.mjs`
- Modify: `scripts/check.mjs`

- [ ] **Step 1: Write failing helper tests in `scripts/check.mjs`**

Add `src/presentation.js` to `coreFiles` after `src/state.js`, then append assertions after the existing route helper assertions:

```js
const revealFixture = PM.createEmptyProject({ locale: "en" });
revealFixture.points.push(
  PM.normalizePoint({ id: "r1", x: 0.1, y: 0.1, type: "route", label: "Start" }),
  PM.normalizePoint({ id: "h1", x: 0.2, y: 0.2, type: "route", helper: true }),
  PM.normalizePoint({ id: "r2", x: 0.3, y: 0.3, type: "route", label: "Pass" }),
  PM.normalizePoint({ id: "h2", x: 0.4, y: 0.4, type: "route", helper: true }),
  PM.normalizePoint({ id: "r3", x: 0.5, y: 0.5, type: "route", label: "End" }),
  PM.normalizePoint({ id: "ctx", x: 0.52, y: 0.52, type: "place", label: "Spoiler" })
);
const revealInfo = PM.computePresentationReveal(revealFixture.points, revealFixture.settings, {
  active: true,
  step: 2,
  showAll: false
});
assertDeepEqual(revealInfo.routePoints.map((point) => point.id), ["r1", "h1", "r2"], "Presentation reveal should include helper only after its segment is revealed.");
assert(PM.isPointRevealed(revealFixture.points[0], revealFixture.points, revealFixture.settings, revealInfo), "First numbered route point should be revealed at step 2.");
assert(PM.isPointRevealed(revealFixture.points[1], revealFixture.points, revealFixture.settings, revealInfo), "Helper before step 2 should be revealed.");
assert(!PM.isPointRevealed(revealFixture.points[3], revealFixture.points, revealFixture.settings, revealInfo), "Helper after step 2 should stay hidden.");
assert(!PM.isPointRevealed(revealFixture.points[5], revealFixture.points, revealFixture.settings, revealInfo), "Context points should stay hidden in presentation mode.");

const clampedReveal = PM.normalizePresentationState({ active: true, step: 99, showAll: false }, 3);
assertEqual(clampedReveal.step, 3, "Presentation step should clamp to route length.");
const showAllReveal = PM.computePresentationReveal(revealFixture.points, revealFixture.settings, {
  active: true,
  step: 1,
  showAll: true
});
assertDeepEqual(showAllReveal.routePoints.map((point) => point.id), ["r1", "h1", "r2", "h2", "r3"], "Show all should reveal full route including helpers.");
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd test`

Expected: FAIL with `PM.computePresentationReveal is not a function` or equivalent missing helper error.

- [ ] **Step 3: Implement `src/presentation.js` helpers**

Create helpers with this API:

```js
(function presentationModule(PM) {
  "use strict";

  function normalizePresentationState(input, routeLength) {
    const max = Math.max(0, parseInt(routeLength, 10) || 0);
    const raw = input || {};
    const showAll = Boolean(raw.showAll);
    const step = max ? PM.clamp(parseInt(raw.step, 10) || 1, 1, max) : 0;
    return {
      active: Boolean(raw.active),
      step: showAll ? max : step,
      showAll
    };
  }

  function routeStepFor(point, routeInfo) {
    return Number(routeInfo.stepById.get(point.id)) || 0;
  }

  function computePresentationReveal(points, settings, presentationState) {
    const routeInfo = PM.computeRouteInfo(points, settings);
    const normalized = normalizePresentationState(presentationState, routeInfo.numberedRoutes.length);
    if (!normalized.active) {
      return { ...normalized, routeInfo, routePoints: points.filter((point) => point.type === "route" && PM.isPointVisible(point, settings)), visibleIds: null };
    }

    const visibleIds = new Set();
    const routePoints = [];
    let revealedNumbered = 0;
    for (const point of points) {
      if (point.type !== "route" || !PM.isPointVisible(point, settings)) continue;
      if (!point.helper) {
        const step = routeStepFor(point, routeInfo);
        if (normalized.showAll || step <= normalized.step) {
          visibleIds.add(point.id);
          routePoints.push(point);
          revealedNumbered = Math.max(revealedNumbered, step);
        }
        continue;
      }
      if (normalized.showAll || (revealedNumbered > 0 && revealedNumbered < normalized.step)) {
        visibleIds.add(point.id);
        routePoints.push(point);
      }
    }
    return { ...normalized, routeInfo, routePoints, visibleIds };
  }

  function isPointRevealed(point, points, settings, revealInfo) {
    if (!revealInfo || !revealInfo.active) return PM.isPointVisible(point, settings);
    if (revealInfo.showAll) return PM.isPointVisible(point, settings);
    return Boolean(revealInfo.visibleIds && revealInfo.visibleIds.has(point.id));
  }

  PM.normalizePresentationState = normalizePresentationState;
  PM.computePresentationReveal = computePresentationReveal;
  PM.isPointRevealed = isPointRevealed;
})(globalThis.PM);
```

- [ ] **Step 4: Add `src/presentation.js` to `scripts/build.mjs`**

Insert it after `src/state.js`:

```js
  "src/state.js",
  "src/presentation.js",
  "src/serialization.js",
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm.cmd test`

Expected: PASS with `Static checks passed`.

## Task 2: Presentation UI Shell

**Files:**
- Modify: `index.template.html`
- Modify: `src/i18n.js`
- Modify: `src/styles.css`
- Modify: `src/app.js`
- Modify: `scripts/check.mjs`

- [ ] **Step 1: Write failing static tests**

Add required generated HTML checks near the other `requireHtml` calls:

```js
requireHtml("presentationButton", "Presentation mode toolbar button");
requireHtml("presentationDock", "Presentation dock");
requireHtml("presentationPrev", "Presentation previous control");
requireHtml("presentationNext", "Presentation next control");
requireHtml("presentationShowAll", "Presentation show-all control");
requireHtml("presentationReset", "Presentation reset control");
requireHtml("presentationExit", "Presentation exit control");
requireHtml("present", "Presentation i18n key");
requireHtml("presentieren", "German presentation label");
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd test`

Expected: FAIL because the new IDs are not present.

- [ ] **Step 3: Add UI markup**

In `index.template.html`, add a toolbar button inside `.head-actions` after `readerButton`:

```html
<button id="presentationButton" class="btn" type="button">Present</button>
```

Add the dock after `menuLayer`:

```html
<section id="presentationDock" class="presentation-dock" aria-label="Presentation controls" hidden>
  <button id="presentationPrev" class="btn icon" type="button" aria-label="Previous step">&larr;</button>
  <output id="presentationStep" class="presentation-step" aria-live="polite">0 / 0</output>
  <button id="presentationNext" class="btn icon" type="button" aria-label="Next step">&rarr;</button>
  <button id="presentationShowAll" class="btn small" type="button">All</button>
  <button id="presentationReset" class="btn small" type="button">Reset</button>
  <button id="presentationExit" class="btn small" type="button">Exit</button>
</section>
```

- [ ] **Step 4: Add i18n labels**

Add keys to both dictionaries:

```js
present: "Present",
presentation: "Presentation",
presentationPrevious: "Previous step",
presentationNext: "Next step",
presentationShowAll: "All",
presentationReset: "Reset",
presentationExit: "Exit",
presentationEmpty: "No route",
```

German:

```js
present: "Präsentieren",
presentation: "Präsentation",
presentationPrevious: "Vorheriger Schritt",
presentationNext: "Nächster Schritt",
presentationShowAll: "Alles",
presentationReset: "Reset",
presentationExit: "Ende",
presentationEmpty: "Keine Route",
```

- [ ] **Step 5: Add CSS shell**

Add `.presentation-dock`, `.presentation-step`, and `:root.presentation-mode` rules that hide `.toolbar`, `.info-badge`, `.info-panel`, `.mid-layer`, and `.point-menu-button`.

- [ ] **Step 6: Wire labels in `app.js`**

Add presentation controls to `controls`, set button/dock text in `setButtonText`, and leave behavior inert until Task 3.

- [ ] **Step 7: Run test to verify it passes**

Run: `npm.cmd test`

Expected: PASS with the new markup and i18n present.

## Task 3: Controller and Rendering Integration

**Files:**
- Modify: `src/presentation.js`
- Modify: `src/app.js`
- Modify: `src/point-ui.js`

- [ ] **Step 1: Write failing integration-oriented static check**

In `scripts/check.mjs`, assert that generated JS wires the controller and point UI:

```js
assert(html.includes("PM.createPresentationController"), "App should create the presentation controller.");
assert(html.includes("getPresentationReveal"), "Point UI should receive presentation reveal state.");
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd test`

Expected: FAIL because the controller is not created yet.

- [ ] **Step 3: Implement `createPresentationController`**

In `src/presentation.js`, add a controller that manages `active`, `step`, and `showAll`; updates `document.documentElement.classList`; updates dock button disabled state; exposes `getPresentationReveal()`; and calls an `onChange` callback after every state change.

- [ ] **Step 4: Wire controller in `app.js`**

Create it after point UI setup:

```js
const pointUi = PM.createPointUi($("pointLayer"), $("midLayer"), $("routeLayer"), store, renderer, menu);
const presentation = PM.createPresentationController({
  root: document.documentElement,
  button: $("presentationButton"),
  dock: $("presentationDock"),
  step: $("presentationStep"),
  previousButton: $("presentationPrev"),
  nextButton: $("presentationNext"),
  showAllButton: $("presentationShowAll"),
  resetButton: $("presentationReset"),
  exitButton: $("presentationExit"),
  store,
  menu,
  onChange: () => pointUi.render(store.getState()),
  t
});
```

- [ ] **Step 5: Read reveal state in `point-ui.js`**

Inside `render`, compute:

```js
const revealInfo = PM.getPresentationReveal ? PM.getPresentationReveal() : null;
```

Use it to filter point nodes and route points:

```js
const visible = PM.isPointVisible(point, settings) && (!revealInfo || PM.isPointRevealed(point, state.points, settings, revealInfo));
const visibleRoutes = revealInfo && revealInfo.active
  ? revealInfo.routePoints
  : state.points.filter((point) => point.type === "route" && PM.isPointVisible(point, state.settings));
```

Hide midpoints when `revealInfo.active`.

- [ ] **Step 6: Run test to verify it passes**

Run: `npm.cmd test`

Expected: PASS.

## Task 4: Keyboard Flow and Browser Verification

**Files:**
- Modify: `src/presentation.js`
- Modify: `src/app.js`
- Test manually through generated `index.html`

- [ ] **Step 1: Add keyboard handling in the controller**

Handle keys only when presentation is active and the event target is not input-like:

```js
const key = event.key;
if (key === "Escape") exit();
if (key === "ArrowRight" || key === " " || key === "PageDown") next();
if (key === "ArrowLeft" || key === "Backspace" || key === "PageUp") previous();
if (key === "Home") reset();
if (key === "End") showAll();
```

- [ ] **Step 2: Ensure app-level Escape does not fight the controller**

Keep the existing `app.js` Escape behavior, but let the presentation controller also receive Escape. The visible result should be presentation exit plus normal menu/help cleanup.

- [ ] **Step 3: Run fast verification**

Run: `npm.cmd test`

Expected: PASS.

- [ ] **Step 4: Run smoke verification when available**

Run: `npm.cmd run smoke`

Expected: PASS, or document the exact blocking error if local browser setup prevents it.

- [ ] **Step 5: Browser QA**

Open generated `index.html`, load a fixture-like map/project, enter Presentation Mode, verify next/previous/show all/reset/exit and responsive dock behavior.

## Task 5: Final Review and Commit

**Files:**
- Review all modified files

- [ ] **Step 1: Inspect diff**

Run: `git diff -- src scripts index.template.html docs/superpowers/plans`

Expected: diff only covers presentation mode, plan, and tests.

- [ ] **Step 2: Run final verification**

Run:

```powershell
npm.cmd test
npm.cmd run build
```

Expected: both commands exit 0.

- [ ] **Step 3: Commit implementation**

Run:

```bash
git add src scripts index.template.html docs/superpowers/plans/2026-05-16-fog-presentation-mode.md
git commit -m "Add fog presentation mode"
```

Expected: one implementation commit after the design commit.

## Self-Review

- Spec coverage: The plan covers selected overlay approach, UI-only state, reveal semantics, helper behavior, no project schema change, keyboard shortcuts, i18n, rendering, tests, and browser QA.
- Placeholder scan: No TODO/TBD placeholders remain.
- Type consistency: Helper names are consistent across plan steps: `normalizePresentationState`, `computePresentationReveal`, `isPointRevealed`, `createPresentationController`, and `getPresentationReveal`.

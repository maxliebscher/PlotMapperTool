# PlotMapper v1.1.7 Dev Safety Design

Date: 2026-05-16
Branch: v1.1.7-dev-safety
Status: Approved design, awaiting implementation plan

## Purpose

PlotMapper v1.1.7-dev-safety is the post-refactor control pass after
v1.1.6-clean. Its job is to make future feature work safer by adding a
repeatable test and release gate around the clean public structure.

This release may fix small bugs, inconsistencies, or fragile behavior found by
the safety work. It must not introduce new product features.

## Scope

Included:

- Fast local verification through `npm test`.
- Clean `.plotmap.json` fixtures for schema and behavior checks.
- An optional browser smoke script for local release validation.
- Minimal GitHub Actions CI that runs the fast test suite on push and pull
  request.
- Small app fixes when the new checks expose real defects.

Excluded:

- Fog of War.
- Multi-routes.
- Legacy Markdown or old JSON converter work.
- New visible user workflows.
- Mandatory screenshot or pixel snapshots.

## Recommended Approach

Use a balanced release gate:

- `npm test` remains quick and suitable for everyday development.
- Browser smoke testing lives behind a separate script such as
  `npm run smoke`.
- GitHub Actions runs only `npm test` for v1.1.7 to avoid browser CI flake
  while still protecting every push and pull request.

This gives the project a useful safety net without making normal development
heavy.

## Architecture

The safety layer is split into four parts.

1. `scripts/check.mjs` remains the fast static and model-level verification
   entry point.
2. `testdata/fixtures/` stores clean `.plotmap.json` projects used by the
   checks.
3. A new browser smoke script, for example `scripts/smoke.mjs`, runs the
   release-level browser flow locally with Playwright.
4. `.github/workflows/test.yml` runs the fast test suite for push and pull
   request events.

`npm test` should not depend on the browser smoke script. The smoke script is a
release gate, not the default development loop.

## Fixture Design

Fixtures should cover the current clean schema without pulling legacy
conversion into this release.

Required fixtures:

- `minimal.plotmap.json`: a very small valid project with an embedded mini-map.
- `route-with-helper.plotmap.json`: route points, a helper point, and duration.
- `reader-context.plotmap.json`: route points plus place, character, event, and
  item points near route points.
- `settings-heavy.plotmap.json`: theme, filters, zoom, chapter start, route
  color, and route width.

Fixture checks should verify:

- All fixtures parse successfully.
- Normalization preserves valid data.
- Serialization and parsing round-trip important fields.
- Route numbering counts normal route points and skips helper points.
- Reader chapter building attaches context points to plausible route chapters.
- Settings normalization keeps valid settings stable and clamps invalid inputs.

## Static Test Design

The fast test suite should continue to build `index.html` and then check:

- Generated HTML contains script blocks and no raw script terminator hazards.
- Generated scripts parse as JavaScript.
- Legacy Markdown project controls are absent from the main UI.
- Required current controls and user-facing flows are still present.
- Tutorial and Reader expectations remain present.
- `.plotmap.json` round-trip behavior works through the core modules.
- Reader grouping and route numbering work with fixture-backed cases.

The checks should stay deterministic and avoid network access.

## Browser Smoke Design

The smoke script is a practical release test rather than a visual snapshot
system.

It should:

- Serve the generated app through a local static URL.
- Run at least one desktop viewport and one narrow viewport.
- Fail on hard console errors.
- Confirm the app loads.
- Load or generate a test map.
- Add route and context points.
- Open the point menu and edit core fields.
- Insert a midpoint.
- Exercise undo and redo.
- Toggle theme, focus mode, and filters.
- Open the Reader.
- Use jump-to-map from the Reader.
- Trigger PNG export and verify the flow does not crash.
- Save and reload a `.plotmap.json` project when Playwright file handling is
  stable enough for the local environment.

The smoke script should not require screenshot snapshots. Simple visibility,
text, state, and console checks are enough for v1.1.7.

## CI Design

Add a minimal GitHub Actions workflow:

- Trigger on push and pull request.
- Install Node dependencies.
- Run `npm test`.

For v1.1.7, CI should not run the browser smoke script. Browser smoke remains a
local release gate to avoid introducing CI flakiness before the project needs
that extra complexity.

## Release Rules

Normal development gate:

- `npm test`

Pre-release gate:

- `npm test`
- `npm run smoke`

Only defects discovered while building or running the safety checks should be
fixed in this branch. Feature ideas discovered during the pass should be noted
for later work instead of being implemented here.

## Branch Workflow

`main` stays stable and released.

`v1.1.7-dev-safety` is the isolated branch for this safety pass. After it is
green and reviewed, it can be merged or released. Larger future features should
then start from the updated stable `main` in their own branch or worktree, such
as:

- `feature/fog-of-war`
- `feature/multi-routes`
- `feature/legacy-converter`

## Success Criteria

The work is complete when:

- `npm test` passes locally.
- The browser smoke script passes locally.
- GitHub Actions runs `npm test` successfully.
- Fixture coverage exists for minimal, realistic route/helper, reader-context,
  and settings-heavy clean projects.
- Any small defects found by the new checks are fixed.
- No new user-facing feature has been added.

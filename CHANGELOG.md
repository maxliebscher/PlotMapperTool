# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [1.3.0] - 2026-06-01
### Added
- Local onboarding/toolbar mockup variant for the v1.3.0 first-start review.
- Project-menu HTML and PDF exports next to PNG, without requiring a detour through the Reader modal.
- Options-menu wheel zoom setting plus an optional preference for showing the wheel-zoom toggle in the main toolbar.
- Options-menu preference for showing or hiding the route settings row.
- Minimap route visibility toggle for hiding dense route overlays locally in the overview.
- Presentation view modes A/B/C/D for full labels, focus card, progress rail, and compact map-first presenting, with compact active-mode labels.
- Presentation fog settings now include the same theme switcher as the main options menu.
- Presentation visibility settings now use Presentation/Sichtfeld labels, include Clear/Soft/Guide edge styles, and start with compact guide-path defaults.
- Local Fog-edge smoothing demo comparing hard, blurred, and two-pass reveal masks.
- Options-menu slider visibility checkbox and language dropdown groundwork for future locales.
- Browser smoke coverage for project-menu HTML export and left/right theme switching.
- Local Farbwähler-Aktionsdemo with three confirmation layout variants.

### Changed
- First-start empty note now distinguishes new maps from continuing saved projects.
- The display slider collapse control now sits on the Views row, keeping it closer to the sliders while avoiding a new toolbar row.
- German project action label changed from "Laden" to "Karte laden".
- Undo/redo buttons keep compact arrow icons while retaining localized aria labels and tooltips.
- Project menu entries now carry lightweight action icons, with the destructive clear action separated and red-tinted.
- Toolbar keeps the main action row together on desktop-sized viewports and only wraps once space is genuinely tight.
- Route color OK/Cancel actions are larger and more legible, with a flatter primary OK style.
- Main toolbar no longer duplicates route numbering with a global chapter-numbering checkbox/start field.
- Active route numbering stays controlled by per-route number/start controls in the route settings.
- Deep theme button outlines are slightly clearer while keeping the restrained dark-blue look.
- Presentation mode can reduce label noise or add a current-step focus card depending on the selected view.
- Focus Fog reveal edges now use a two-pass mask for smoother transitions while keeping the visible route core clear.
- Version bumped to `1.3.0`.

### Fixed
- Theme controls now use dedicated previous/next buttons, including narrow viewport positioning so both arrows remain clickable.
- Project and Options popovers are more opaque for better readability over the toolbar.
- Open Project/Options menus now close when clicking outside them.

## [1.2.0] - 2026-05-20
### Added
- Optional multi-route groundwork with a collapsible route management panel.
- Route-specific color, visibility, numbering, arrows, start number, line style, width, name, and deletion controls.
- Active-route assignment for new route points while keeping the map click point-type chooser as the main story flow.
- Confirmed route color picker with OK/Cancel, normal-mode main menu collapse, point size, helper point size, and menu opacity controls.
- Presentation route progress pills so each visible route can advance independently.
- Reveal logic for nearby non-route context points along the already uncovered route corridor.
- Separate non-release Multi-Fog concept demo for comparing single-route, per-route, and combined reveal masks.
- Static and browser smoke coverage for route normalization, active-route presentation/reader behavior, and route panel interactions.

### Changed
- Removed redundant global line color/width controls from the main toolbar; route line styling now lives in the route panel.
- Compacted the Story Picker while keeping the high-contrast map overlay style, and restored Item with a key icon.
- Updated the in-app tutorial for multi-route controls, color confirmation, arrow modes, point sizing, menu collapse, PNG export, and offline use.

### Fixed
- Duration labels now show an hourglass prefix without changing stored project data.
- Notes wrap earlier in the browser view and PNG export.
- PNG export better matches route colors, line styles, arrows, point sizes, note wrapping, and duration labels.
- Added checks to keep the generated release free of runtime CDN/script/style/image dependencies.

### Planned
- Separate converter for legacy Markdown/old JSON projects.

## [1.1.8] - 2026-05-18
### Added
- Presentation Mode for stepping through a single route during writing sessions, tabletop play, talks, or screen sharing.
- Configurable Focus Fog with Off, Focus, and Whole Route modes plus live controls for surroundings, current radius, path width, edge softness, and old path emphasis.
- Keyboard navigation for Presentation Mode: next, previous, reset, show all, and exit.
- README screenshot and release documentation for the new presentation workflow.

### Changed
- Version bumped from `1.1.6-clean` to `1.1.8`.
- Presentation Mode hides the main editing UI and uses a compact floating control dock.

### Fixed
- Added smoke coverage for Presentation Mode, Focus Fog settings, and desktop/narrow viewport behavior.

## [1.1.6-clean] - 2026-05-16
### Changed
- Rebuilt PlotMapper as a clean modular app with generated standalone `index.html`.
- Replaced Markdown project import/export with canonical `.plotmap.json` project save/load.
- Kept Markdown out of the main UI; old data conversion is deferred to a separate converter.
- Refined toolbar layout, splash screen, tutorial modal, bright theme info panel, and empty-state hint.
- Preserved map loading, point editing, route drawing, helper points, labels, notes, locations, durations, filters, focus mode, undo/redo, PNG export, Reader, Reader editing, Reader jump-to-map, themes, and tutorial/help.

### Added
- Versioned `.plotmap.json` project format containing `schemaVersion`, `appVersion`, `map`, `settings`, and `points`.
- Modular source files under `src/` plus `scripts/build.mjs` and `scripts/check.mjs`.
- Reader HTML/PDF export flow from the clean model.
- Static checks for generated scripts, route numbering, JSON round trip, Reader grouping, and UI regressions.

### Fixed
- Removed appended patch-stack style duplication from the implementation workspace.
- Fixed syntax fragility, duplicate-handler risk, splash/title theme contrast, route layer ordering, empty-hint alignment, and several German UI encoding issues.

## [1.1.5] - 2025-08-23
### Added
- Added a "Reader" modal for linear view.
- The Reader also allows edit of route.
- Click on chapter number or title moves to point on map (in work).
- The standalone linear reader now has edit mode.

### Fixed
- Many small fixes.
- Removed Zoom Ctrl+Wheel since it collided with native browser input.
- Empty notice is now i18n.

## [1.1.4] - 2025-08-22
### Changed
- Adjustable line width.
- Zoom with Ctrl+Wheel.

## [1.1.3] - 2025-08-14
### Changed
- Many fixes and minor improvements.
- Reached Release Candidate.
- Stable version.

## [1.1.2] - 2025-08-14
### Added
- Splash screen.
- Branding.
- Modern styling.
- Tutorial.

### Fixed
- General fixes.

## [1.1.0] - 2025-08-11
### Changed
- General fixes.
- Stable version.

## [1.0.9] - 2025-08-10
### Added
- Helper points (skip number).

### Fixed
- Many fixes.
- Stable version.

## [1.0.5] - 2025-08-05
### Added
- i18n/localisation for DE/EN.
- Focus mode.

### Fixed
- Many fixes.

## [0.5.1] - 2025-07-19
### Fixed
- Many fixes.
- Stable version.

## [0.3.0] - 2025-07-17
### Added
- Duration label.
- Reworked context menu.

### Removed
- Touch optimisation.

## [0.2.3] - 2025-07-14
### Removed
- Touch optimisation.

## [0.2.2] - 2025-07-14
### Changed
- Many fixes.
- Touch optimisation tests.

## [0.2.0] - 2025-07-13
### Added
- New Markdown format.
- Point type filters.
- New point types.

### Changed
- Stable version.

## [0.1.3] - 2025-06-29
### Added
- Custom chapter numbering.

## [0.1.1] - 2025-06-29
### Added
- Context menu / =.
- Import/Export Markdown.
- Midpoint add.
- Notes.
- PNG export.
- Undo/Redo.
- Zoom/Opacity sliders.

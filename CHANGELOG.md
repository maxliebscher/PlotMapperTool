# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]
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

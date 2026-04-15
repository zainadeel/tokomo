# Changelog

All notable changes to `@ds-mo/tokens` are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versioning follows [Semantic Versioning](https://semver.org/).

---

## [0.3.0] — 2026-04-15

### Added

- **Inverted color tokens** — new `--color-inverted-*` category (30 CSS custom properties per theme) for inverted-UI surfaces such as tooltips and dark overlays on light themes. Covers `background`, `divider`, `foreground/*` (primary/secondary/tertiary/quaternary/neutral/brand/AI/negative/warning/caution/positive/walkthrough/guide), `border/*`, and `interaction/*` (hover/pressed/focus) tokens.

### Removed

- **`--color-always-dark-foreground-quinary`** — token dropped from Figma source. Replace usages with `--color-always-dark-foreground-neutral`.

---

## [0.2.0] — 2026-04-15

### Added

- **Offset tokens** — `--dimension-offset-*` for use in `transform` and `background-position`. Includes positive and negative variants mirroring the spacing scale.
- **Scale tokens** — `--dimension-scale-100` (1) and `--dimension-scale-subtle` (0.99) for `transform: scale()`.
- **Z-index tokens** — `--dimension-z-index-base/raised/overlay/modal/floating/tooltip` replacing magic numbers in components.
- **Token browser** — self-contained GitHub Pages site (`npm run build:docs`) for browsing all 692 tokens by category. Deployed automatically on push to `main`.

### Fixed

- **Elevation color references** — `--effect-shadow-*` and `--effect-highlight-*` tokens were referencing non-existent `--color-surface-shadow/highlight` variables. Corrected to `--color-elevation-shadow/highlight` as defined in the semantic color JSON. Shadows were silently rendering as `none` for any consumer using the elevation tokens.

### Changed

- **Package scope renamed** from `@tokomo/tokens` to `@ds-mo/tokens` to align with the design system monorepo convention (`@ds-mo/icons`, `@ds-mo/ui`).
- **Color JSON filenames** standardised — token JSON files renamed to follow a consistent `color.{type}.{variant}.tokens.json` pattern.
- **Node engine** requirement raised to `>=25.9.0` (chokidar v5 requirement for watch mode).

---

## [0.1.0] — 2025-04-09

### Added

- **Colors** — semantic color tokens (light + dark themes), reference palette (oklch), data visualization colors. Generated from Figma variable JSON.
- **Dimensions** — space, radius, size, stroke-width tokens. All expressed as `calc()` from `--dimension-base: 8px`, making the entire scale overridable with one variable.
- **Typography** — weight, font-size, line-height, letter-spacing, paragraph-spacing tokens. Composite `.text-*` classes for display, title, body, and caption styles.
- **Effects** — animation duration, delay, and easing tokens matching Figma naming (`short-1/2/3`, `medium-1/2/3`, `long-1/2/3`). Motion preset tokens composing duration + easing. Elevation shadow tokens with three-token split (`--effect-shadow-*`, `--effect-highlight-*`, `--effect-elevation-*`) to handle `overflow: hidden` clipping.
- **Multiple output formats** — CSS custom properties, `dist/tokens.json` (W3C-compatible), per-category JSON, TypeScript constants.
- **Light/dark theming** — via `data-theme` attribute on `<html>`. No JavaScript required.
- **Optional extras** — `globals.css` (font loading, focus rings, reduced-motion), `reset.css`, `utilities.css`.

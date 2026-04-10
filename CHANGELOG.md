# Changelog

All notable changes to `@tokomo/tokens` are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versioning follows [Semantic Versioning](https://semver.org/).

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

# Changelog

All notable changes to `@ds-mo/tokens` are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versioning follows [Semantic Versioning](https://semver.org/).

---

## [0.4.3](https://github.com/zainadeel/tokomo/compare/v0.4.2...v0.4.3) (2026-04-22)


### Fixed

* **docs:** restructure elevation section with atoms and composed styles ([#16](https://github.com/zainadeel/tokomo/issues/16)) ([f17da68](https://github.com/zainadeel/tokomo/commit/f17da68d12c25f5f505bd73c8b29830b15cbc36e))

## [0.4.2](https://github.com/zainadeel/tokomo/compare/v0.4.1...v0.4.2) (2026-04-22)


### Fixed

* raise sub-toolbar height to 48px to match header ([#13](https://github.com/zainadeel/tokomo/issues/13)) ([3e0102b](https://github.com/zainadeel/tokomo/commit/3e0102bf78a13f275e817e8d2f0a497b0e326caf))

## [0.4.1](https://github.com/zainadeel/tokomo/compare/v0.4.0...v0.4.1) (2026-04-22)


### Fixed

* cluster background intensity tokens in docs site ([#12](https://github.com/zainadeel/tokomo/issues/12)) ([af86e4b](https://github.com/zainadeel/tokomo/commit/af86e4bdda71248a2e1538ff63e8e5e44754adff))
* cluster foreground intensity tokens in docs site ([#10](https://github.com/zainadeel/tokomo/issues/10)) ([85fe997](https://github.com/zainadeel/tokomo/commit/85fe9978564a0de1c766e6b72d41455a01ea87e4))

## [0.4.0](https://github.com/zainadeel/tokomo/compare/v0.3.0...v0.4.0) (2026-04-17)


### Added

* add GitHub Pages token browser ([2b81660](https://github.com/zainadeel/tokomo/commit/2b816602effdc2cc33dc0f09df98562652beb1fb))
* add inverted color category and remove always-dark-foreground-quinary token ([2b0642f](https://github.com/zainadeel/tokomo/commit/2b0642fb4d4881f849f7e23b6dcd419e0e3ca976))
* add offset/scale/z-index tokens, rename color JSONs, fix utilities ([4d3fa94](https://github.com/zainadeel/tokomo/commit/4d3fa94596ff0881e7fee3f391a117fd741d5298))
* rework token browser UX with global search and smarter ordering ([e426f0f](https://github.com/zainadeel/tokomo/commit/e426f0f7d3956c25b19f16e92412798d2ec3976f))
* **tokens:** add border and divider semantic color tokens from Figma ([f451771](https://github.com/zainadeel/tokomo/commit/f451771a720a53006df2069b5a5ad2d252c80962))
* **tokens:** add dimension, typography, and effects generators from Figma JSON ([8366209](https://github.com/zainadeel/tokomo/commit/83662093f8edf67bfbc11d60ac798cecd2648ae9))
* **tokens:** add elevation tokens from Figma with shadow/highlight split ([5e1756f](https://github.com/zainadeel/tokomo/commit/5e1756f8203f01dcc4009fe9219376f365cfb56e))


### Fixed

* correct elevation color token references in effects.css ([4a73c7f](https://github.com/zainadeel/tokomo/commit/4a73c7f6e3eba0c1f94b882e1c716b2b2855770b))
* correct elevation color token references in generate-effects-tokens.mjs ([ace4dae](https://github.com/zainadeel/tokomo/commit/ace4daefcf8b3e2b8395bb637574ef98b7d7cbfc))
* **docs:** clean up token browser UI ([b422381](https://github.com/zainadeel/tokomo/commit/b422381bfac29547625b1a57bf4cfeb2ed1c7017))
* **tokens:** round alpha to 2dp to clean up near-zero float noise ([3aa5376](https://github.com/zainadeel/tokomo/commit/3aa5376ff144ea7a6a428e6bc38730eebd6f80f7))
* use npm install instead of npm ci in CI (no lock file) ([4dbbacd](https://github.com/zainadeel/tokomo/commit/4dbbacd79019d3cddaf9bcba1f30484b4cc22d9e))


### Changed

* flatten to single package, remove component tokens ([1a32600](https://github.com/zainadeel/tokomo/commit/1a32600b8c185df0add22f7950174b5af612a49a))
* rebrand as TokoMo ([c06e517](https://github.com/zainadeel/tokomo/commit/c06e5178fa033e4d600f9c57a7f531a2f942a05d))
* **tokens:** calc()-based dimensions and tokenize font-family ([86490ae](https://github.com/zainadeel/tokomo/commit/86490aed1a619b4f8c27132f26c2e7ebb7e0e225))
* **tokens:** remove divider and focus-ring aliases ([5b186d9](https://github.com/zainadeel/tokomo/commit/5b186d9904a793588fe93c2f929cfc462cc1394d))
* **tokens:** rename effect tokens to match Figma naming ([272df58](https://github.com/zainadeel/tokomo/commit/272df58ee65ec4bdf87df5d194d8a1bdccf5b0fc))


### Documentation

* add AGENTS.md and CLAUDE.md ([51ce8a9](https://github.com/zainadeel/tokomo/commit/51ce8a9d040dcffaf196a9b2c4be25ae89611cdb))
* add AGENTS.md and CLAUDE.md ([aa1d4e9](https://github.com/zainadeel/tokomo/commit/aa1d4e91791b9e46e2bf64221a2ee21307d8c446))
* **tokens:** correct data colors description — visualization not domain ([5b132ac](https://github.com/zainadeel/tokomo/commit/5b132ac06ac76c8c01ad095c4c3f1fb09b93082f))

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

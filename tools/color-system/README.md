# Color System Tool

Visual + CLI color tooling for `@ds-mo/tokens` reference palette work.

## Status

**Functional.** The web UI lives in `index.html` + `color-tool.mjs`. The CLI workflow (`run-color-generation-workflow.js`) retunes faint/bold tones in a working CSS file. `npm run tool:colors` copies the latest reference JSON into `tools/color-system/tokens.json`; `npm run build:docs` stages the tool into `docs/tool/` for GitHub Pages.

## Files

- `oklch-utils.js` — pure math: OKLCH ↔ sRGB/P3, WCAG contrast, gamut fitting, faint/bold solvers.
- `run-color-generation-workflow.js` — CLI workflow for batch retune/report on a working CSS file.
- `color-tool.mjs` — browser UI (loads `tokens.json` synced from `src/json/colors/reference/`).
- `../../docs/guidelines/color-generation.md` — companion spec (paths under `src/json/colors/…`).

## TokoMo integration

1. **Reference source of truth** — `src/json/colors/reference/color.reference.tokens.json`
2. **Sync into the tool** — `npm run tool:colors` (runs `scripts/copy-tool-assets.mjs`)
3. **Regenerate shipped CSS** — `npm run build` after JSON changes

The CLI workflow still expects a hand-maintained **CSS working file** for batch retune — it does not write JSON directly. Use the visual tool or edit JSON + `npm run build:colors` for routine palette updates.

## Dependencies

Pure CommonJS in `oklch-utils.js` / workflow scripts — no npm deps. Node **20.19+** (see repo `.nvmrc` and `package.json` `engines`).

# Color System Tool

Visual + CLI color tooling for `@ds-mo/tokens` reference palette work.

## Status

**Functional.** The web UI lives in `index.html` + `color-tool.mjs`. The CLI workflow (`run-color-generation-workflow.mjs`) retunes faint/bold tones in a working CSS file. `npm run tool:colors` copies the latest reference JSON into `tools/color-system/tokens.json`; `npm run build:docs` stages the tool into `docs/tool/` for GitHub Pages.

## Files

- `oklch-utils.mjs` — pure math: OKLCH ↔ sRGB/P3, WCAG contrast, gamut fitting, faint/bold solvers. **Must stay dependency-free** — see below.
- `apca.mjs` — APCA `Lc` scoring. Node-only (has a package dependency); secondary diagnostic, not the shipped contract.
- `run-color-generation-workflow.mjs` — CLI workflow for batch retune/report on a working CSS file.
- `color-tool.mjs` — browser UI (loads `tokens.json` synced from `src/json/colors/reference/`).
- `../../docs/guidelines/color-generation.md` — companion spec (paths under `src/json/colors/…`).
- `../../scripts/report-contrast.mjs` — WCAG + APCA report over the shipped semantic pairings (`npm run report:contrast`).

## TokoMo integration

1. **Reference source of truth** — `src/json/colors/reference/color.reference.tokens.json`
2. **Sync into the tool** — `npm run tool:colors` (runs `scripts/copy-tool-assets.mjs`)
3. **Regenerate shipped CSS** — `npm run build` after JSON changes

The CLI workflow still expects a hand-maintained **CSS working file** for batch retune — it does not write JSON directly. Use the visual tool or edit JSON + `npm run build:colors` for routine palette updates.

## Dependencies

Everything here is ESM. Node **20.19+** (see repo `.nvmrc` and `package.json` `engines`).

`oklch-utils.mjs` must stay **dependency-free and browser-loadable**. `index.html` imports it directly via `<script type="module">` with no bundler and no import map, and `docs/tool/` is served as static files on GitHub Pages with no `node_modules`. A bare specifier there resolves as a URL, 404s, and takes the whole tool down. `tests/oklch-utils.test.mjs` asserts every specifier in that file is relative.

Anything needing an npm package goes in a separate Node-only module — that is why APCA lives in `apca.mjs`, which the browser tool never imports.

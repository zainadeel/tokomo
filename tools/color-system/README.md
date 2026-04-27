# Color System Tool

Foundation for a future visual color-generation tool for `@ds-mo/tokens`.

## Status

**Scaffold only.** The CLI workflow is ported verbatim from the upstream `design_tokens` repo and has not yet been wired to TokoMo's source files. Treat this as a starting point for a visual tool, not as a working CLI yet.

## Files

- `oklch-utils.js` — pure math: OKLCH ↔ sRGB/P3, WCAG contrast, gamut fitting, faint/bold solvers.
- `run-color-generation-workflow.js` — CLI workflow: retunes faint and bold tones in a working CSS file, clamps out-of-gamut chroma, re-annotates contrast comments, reorders hues and tones, writes contrast and faint-extremes reports.
- `../../docs/guidelines/color-generation.md` — companion spec: token topology, contrast formulas, hard constraints, solver guidance.

## What still needs adapting for TokoMo

The ported workflow assumes the upstream repo's layout. Before this can run against TokoMo:

1. **Input format** — the workflow reads a hand-maintained CSS working file from a sibling Figma export folder. TokoMo's source of truth is `src/json/colors/reference/color.reference.tokens.json`. Either point the workflow at the JSON file directly, or define a working-CSS step in the build pipeline.
2. **Token structure** — the `color-generation.md` doc references `tokens/colors/...` paths that don't exist here. Update path references to TokoMo's `src/json/colors/...` layout.
3. **Hue inventory** — verify the default `hueOrder` in `run-color-generation-workflow.js` still matches TokoMo's reference palette.
4. **Output destination** — decide whether the tool writes back into `src/json/` (and triggers `npm run build`) or produces a separate review artifact.

## Next step

Build a visual UI (web-based) on top of the math in `oklch-utils.js`, with live previews of solver candidates, contrast reports, and gamut warnings. The CLI workflow can either be retired once the visual tool covers its surface, or kept as a headless equivalent for batch operations.

## Dependencies

None — both JS files are pure CommonJS with no external imports. Node 18+ is sufficient.

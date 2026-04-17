# AGENTS.md

Guide for AI agents (and humans) working on **TokoMo** (`@ds-mo/tokens`). Follows the [agents.md](https://agents.md) convention — tool-agnostic. `CLAUDE.md` points here.

Keep this file as the single source of truth for project conventions. Update it when you add pipelines, token categories, or change the release flow.

---

## What this project is

TokoMo is an npm package (`@ds-mo/tokens`) that ships **design tokens** as:

- CSS custom properties (the primary deliverable — one file per category + a combined index)
- Light/dark theme files (`dist/themes/light.css`, `dist/themes/dark.css`)
- A machine-readable JSON blob (`dist/tokens.json` + per-category JSON files)
- TypeScript constants for all token names (`dist/index.mjs` / `.cjs` / `.d.ts`)
- Reset and global utility CSS

It's the **foundation** of the ds-mo design-system trilogy: `@ds-mo/tokens` → `@ds-mo/icons` → `@ds-mo/ui` (CompoMo). TokoMo is Figma-first — raw token JSON is exported from Figma variables and dropped into `src/`, then build scripts generate the distributable artifacts.

---

## Directory map

```
src/
  colors.css           # Color token CSS (generated from JSON sources)
  dimensions.css       # Spacing/sizing token CSS
  typography.css       # Font family/size/weight/line-height token CSS
  effects.css          # Shadow/blur/border-radius token CSS
  globals.css          # Global/semantic tokens (references other categories)
  reset.css            # CSS reset
  utilities.css        # Utility classes
  themes/
    light.css          # Light theme token overrides
    dark.css           # Dark theme token overrides
  index.css            # Combined barrel import
  json/
    colors.json        # Figma-exported color token definitions (source of truth)
    dimensions.json    # Figma-exported dimension token definitions
    typography.json    # Figma-exported typography token definitions
    effects.json       # Figma-exported effects token definitions
scripts/
  build.mjs                     # Orchestrates the full build
  generate-color-tokens.mjs     # JSON → colors.css
  generate-dimension-tokens.mjs # JSON → dimensions.css
  generate-typography-tokens.mjs# JSON → typography.css
  generate-effects-tokens.mjs   # JSON → effects.css
  generate-json-tokens.mjs      # Merges per-category JSON → dist/tokens.json
  generate-ts-constants.mjs     # Generates TypeScript constants from token names
  build-docs.mjs                # Regenerates docs/index.html (GH Pages token browser)
  docs-template.html            # Template for the token browser
docs/
  index.html            # Built GitHub Pages browser (do NOT edit by hand — regenerate)
dist/                   # Generated — do not edit directly
.github/
  workflows/
    build.yml          # PR: npm ci, build, verify artifacts + src unchanged
    codeql.yml         # JS/TS security scan — PR + push + weekly Sunday cron
    pr-title.yml       # Lints PR titles as conventional commits
    release-please.yml # Opens release PRs on feat/fix; auto-publishes to npm on merge (OIDC)
    deploy.yml         # Builds + deploys the GH Pages token browser
  dependabot.yml       # Monthly bumps for github-actions + npm
release-please-config.json      # Release Please config (node, changelog sections)
.release-please-manifest.json   # Pinned current version
```

---

## Commands

```bash
npm run build          # Full build — CSS + JSON + TypeScript
npm run build:colors   # Color tokens only (fast iteration)
npm run build:docs     # Rebuild docs/index.html (GH Pages browser)
npm run dev            # Watch mode — rebuilds on src changes
npm run clean          # Remove dist/
```

No separate test/lint commands — validation is done by the Build workflow on every PR (it re-runs the build and asserts `src/` was not mutated).

---

## Build pipeline (what `npm run build` does)

1. **Clean** — nuke `dist/`, recreate subdirs (`dist/themes/`, `dist/json/`)
2. **Generate CSS** — each `generate-*-tokens.mjs` script reads the corresponding `src/json/*.json` (Figma export) and produces a `dist/*.css` file
3. **Copy static CSS** — `src/*.css` files that are not generated (themes, reset, utilities, globals, index) are copied verbatim to `dist/`
4. **Generate JSON** (`generate-json-tokens.mjs`) — merges per-category sources into `dist/tokens.json` + per-category `dist/json/*.json`
5. **Generate TypeScript** (`generate-ts-constants.mjs`) — emits `dist/index.mjs`, `dist/index.cjs`, `dist/index.d.ts` with named constants for every token name

---

## Theming

Light/dark theming is **CSS-only** — no JavaScript. Consuming apps toggle the `data-theme` attribute on `:root` (or a container element):

```html
<html data-theme="dark">
```

All token values are defined as CSS custom properties. Theme files override them for the relevant mode.

---

## Adding or updating tokens

### From a Figma export

1. Export Figma variables as JSON (one file per collection: colors, dimensions, typography, effects).
2. Drop the JSON files into `src/json/` replacing the existing files.
3. Run `npm run build` to regenerate `dist/`.
4. Verify the token browser: `npm run build:docs`, then open `docs/index.html`.

### Editing a token directly

1. Edit the JSON file in `src/json/` for that category.
2. Run `npm run build` (or `npm run build:colors` for color-only changes).
3. Do **not** edit generated CSS in `dist/` — your changes will be overwritten on the next build.

### Adding a new token category

1. Create `src/json/<category>.json` with the token definitions.
2. Write `scripts/generate-<category>-tokens.mjs` following the pattern of existing generators.
3. Add the new script to the build sequence in `scripts/build.mjs`.
4. Update `scripts/generate-json-tokens.mjs` to include the new category in the merged output.
5. Update `package.json` `exports` with the new `dist/<category>.css` entry.
6. Update `src/index.css` to `@import` the new category.

---

## Commit & PR conventions

**Conventional Commits**, enforced by `.github/workflows/pr-title.yml`:

```
<type>(<optional-scope>): <lowercase subject>

types: feat | fix | perf | revert | docs | style | refactor | test | build | ci | chore
```

Subject must **start with a lowercase letter** (workflow enforced). Scope is optional — common ones here: `colors`, `docs`, `build`.

**Version-bumping types** (trigger a release PR via release-please):
- `feat:` → minor bump
- `fix:` / `perf:` → patch bump
- `feat!:` or `BREAKING CHANGE:` footer → major bump (pre-1.0: bump minor instead)
- `ci:` / `chore:` / `build:` / `test:` / `style:` / `docs:` / `refactor:` → **do not trigger a release** (most hidden in changelog; `docs` is visible)

See `release-please-config.json` for the type → changelog section mapping.

**Branch naming:** `type/short-kebab-description` (e.g. `feat/add-motion-tokens`, `ci/add-release-workflow`, `docs/agent-onboarding`).

**PR flow:** always via feature branch + PR to `main`. Direct pushes to `main` are blocked.

---

## Versioning

Pre-1.0: breaking token renames ship as **minor** bumps. Once we hit `1.0.0`, renames go behind majors.

Current version lives in three places — keep them in sync for releases not driven by release-please:
- `package.json` `"version"`
- `.release-please-manifest.json` `"."`
- `README.md` description (if it mentions token counts)

Release-please handles all three automatically when it opens a release PR.

---

## Release flow

**Automated path (normal case):**

1. Land a `feat:` or `fix:` commit on `main` via PR.
2. `release-please.yml` fires → opens (or updates) a release PR that bumps `package.json`, updates `CHANGELOG.md`, and updates `.release-please-manifest.json`.
3. Review and merge the release PR.
4. Release Please tags `vX.Y.Z`, creates the GitHub Release, and the `publish` job in the same workflow publishes to npm with `--provenance` via **OIDC Trusted Publisher** (no long-lived `NPM_TOKEN` — configured in npm under Package Settings → Trusted Publishers).

**Forcing a specific version (`Release-As:` escape hatch):**

Push an empty commit with a `Release-As: X.Y.Z` trailer in the commit message body to `main`:

```bash
git commit --allow-empty -m "chore: release as X.Y.Z

Release-As: X.Y.Z"
```

Release-please will open a release PR at that exact version. Useful when only `ci:`/`chore:` commits have accumulated and you want to cut a release.

**Merge strategy:** use "Create a merge commit" (not squash) when merging a `Release-As:` commit so the trailer survives. If squash is enforced, paste `Release-As: X.Y.Z` into the squash commit message body manually.

**Never** run `npm publish` manually for a normal release — it bypasses provenance and skips the tag/release/changelog dance.

---

## npm Trusted Publisher setup

Must be done manually by the package owner once:

1. Go to https://www.npmjs.com/package/@ds-mo/tokens/access
2. Scroll to **Trusted Publishers** → **Add a publisher**
3. Publisher: `GitHub Actions`
4. GitHub org/user: `zainadeel`
5. Repository: `tokomo`
6. Workflow filename: `release-please.yml` (no path prefix)
7. Environment: _(leave blank)_
8. Click **Save** and reload to confirm.

---

## CI workflows

| Workflow | Trigger | Purpose |
|---|---|---|
| `build.yml` | PR to main | `npm ci` + build + verify dist artifacts + verify `src/` not mutated |
| `pr-title.yml` | PR opened/edited | Enforce conventional-commit PR titles (lowercase subject) |
| `codeql.yml` | Push/PR to main, weekly Sunday | GitHub CodeQL JS/TS security scan |
| `release-please.yml` | Push to main | Open release PR on feat/fix; publish to npm via OIDC when release PR merges |
| `deploy.yml` | Push to main, manual | Build + deploy token browser to GitHub Pages |
| `dependabot.yml` | Monthly | Bump github-actions + npm devDependencies |

---

## Things not to do

- **Do not edit `dist/`** — it's generated. Edit `src/` or scripts, then run `npm run build`.
- **Do not edit `docs/index.html`** — regenerate with `npm run build:docs`.
- **Do not hand-bump `package.json` version** during normal work — let release-please do it.
- **Do not `git push` to `main`** — always branch + PR.
- **Do not delete a token from `src/json/` without explicit user confirmation** — even if a Figma re-export omits it; it might be a Figma filter accident.
- **Do not commit `NPM_TOKEN` or any npm auth** — publishing uses OIDC, no secrets required.
- **Do not skip `npm install -g npm@latest`** in the publish job — Node 20 ships with npm 10.x which cannot complete OIDC auth; Trusted Publisher requires npm ≥ 11.5.1.

---

## Quick reference: where things live

| Need to change... | Edit this |
|---|---|
| Color token values | `src/json/colors.json` |
| Dimension/spacing values | `src/json/dimensions.json` |
| Typography values | `src/json/typography.json` |
| Effects (shadows, radii) | `src/json/effects.json` |
| Color CSS generation logic | `scripts/generate-color-tokens.mjs` |
| Build orchestration | `scripts/build.mjs` |
| TypeScript constant format | `scripts/generate-ts-constants.mjs` |
| Token browser styling | `scripts/docs-template.html` + `scripts/build-docs.mjs` |
| Release changelog sections | `release-please-config.json` |
| PR title rules | `.github/workflows/pr-title.yml` |
| Theme CSS (light/dark) | `src/themes/light.css`, `src/themes/dark.css` |

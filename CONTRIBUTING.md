# Contributing to @ds-mo/tokens

Thanks for helping. This is a Figma-first token package — the source of truth lives in Figma variables, and this repo translates them into usable CSS, JSON, and TypeScript.

## How it works

```
Figma variables → JSON export → generator scripts → src/*.css → dist/
```

The `src/json/` directories hold raw Figma variable exports. Generator scripts write **`src/*.css`** (committed). `scripts/build.mjs` copies those files into `dist/` and emits JSON + TypeScript artifacts.

## Adding or updating tokens from Figma

1. **Export from Figma** — use the Figma Variables Export plugin or the Figma API to export variables as JSON.
2. **Drop the JSON** into the appropriate directory:
   - `src/json/colors/semantic/` — semantic color tokens
   - `src/json/colors/reference/` — reference palette
   - `src/json/colors/data/` — data visualization colors
   - `src/json/dimensions/` — space, radius, size, stroke-width
   - `src/json/typography/` — weights, sizes, line heights, letter spacing
   - `src/json/effects/` — blur, animation timing, easing
3. **Run the build**:
   ```bash
   npm run build
   ```
4. **Review the diff** in `src/*.css` to confirm the changes look right.
5. Open a PR with a conventional-commit title (see below).

## Naming conventions

Token names mirror Figma variable names exactly. The CSS custom property name is derived by:

- Taking the full Figma variable path (e.g. `color/background/primary`)
- Replacing `/` with `-`
- Prefixing with `--` (e.g. `--color-background-primary`)

If a Figma token is renamed, the CSS token name changes too — **this is a breaking change** and requires a major version bump.

## What belongs here vs in component packages

**In `@ds-mo/tokens`** — pure design primitives:
- Any value that multiple components or projects would share
- Colors, spacing, radius, stroke widths, typography scales, animation timing, elevation shadows

**In component packages (CompoMo)** — component-specific:
- Tokens only meaningful in the context of one component (e.g. `--chat-input-height`)
- Composite CSS classes that encode layout or behaviour
- Magic thresholds for interaction (drag distances, scroll speeds)

## Hand-authored tokens

Some tokens cannot be derived from Figma variables (Figma doesn't support multi-layer box-shadows or CSS math). These are in clearly marked `HAND-AUTHORED` sections in the generator scripts. When updating them:

- Keep them in the same file, after the generated section
- Leave the comments explaining why they're hand-authored
- Reference other tokens via `var()` — no hard-coded values

## Running the build

```bash
npm run build          # full build
npm run dev            # rebuild on file changes
npm run build:docs     # regenerate the GH Pages token browser
```

## Versioning

This package uses [release-please](https://github.com/googleapis/release-please) driven by Conventional Commits. You do not create changeset files — release-please watches commit messages on `main` and opens a release PR automatically.

| Commit type | Version bump |
|---|---|
| `feat:` | minor |
| `fix:` / `perf:` | patch |
| `feat!:` / `BREAKING CHANGE:` | major |
| `ci:` / `chore:` / `build:` / `test:` / `style:` / `docs:` / `refactor:` | no release |

On merge of the release PR, the `publish` job publishes to npm with `--provenance` via OIDC Trusted Publisher — no `npm publish` by hand.

See [AGENTS.md](AGENTS.md) for the full release flow, the `Release-As:` escape hatch, and npm Trusted Publisher setup.

## Code style

No linting setup — just keep the generator scripts consistent with the existing style. Comments should explain *why*, not *what*.

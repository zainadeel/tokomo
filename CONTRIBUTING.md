# Contributing to @tokomo/tokens

Thanks for helping. This is a Figma-first token package — the source of truth lives in Figma variables, and this repo translates them into usable CSS, JSON, and TypeScript.

## How it works

```
Figma variables → JSON export → generator scripts → CSS → dist
```

The `src/json/` directories hold raw Figma variable exports. Generator scripts in `scripts/` read them and produce CSS. The build compiles everything into `dist/`.

## Adding or updating tokens from Figma

1. **Export from Figma** — use the Figma Variables Export plugin or the Figma API to export variables as JSON
2. **Drop the JSON** into the appropriate directory:
   - `src/json/colors/semantic/` — semantic color tokens
   - `src/json/colors/reference/` — reference palette
   - `src/json/colors/data/` — data visualization colors
   - `src/json/dimensions/` — space, radius, size, stroke-width
   - `src/json/typography/` — weights, sizes, line heights, letter spacing
   - `src/json/effects/` — blur, animation timing, easing
3. **Run the build**:
   ```bash
   node scripts/build.mjs
   ```
4. **Review the diff** in `src/*.css` to confirm the changes look right
5. **Create a changeset** to document the version bump:
   ```bash
   npx changeset
   ```
6. Open a PR

## Naming conventions

Token names mirror Figma variable names exactly. The CSS custom property name is derived by:

- Taking the full Figma variable path (e.g. `color/background/primary`)
- Replacing `/` with `-`
- Prefixing with `--` (e.g. `--color-background-primary`)

If a Figma token is renamed, the CSS token name changes too — **this is a breaking change** and requires a major version bump.

## What belongs here vs in component packages

**In `@tokomo/tokens`** — pure design primitives:
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
node scripts/build.mjs          # full build
node scripts/build.mjs --watch  # rebuild on file changes
```

## Versioning

This package uses [Changesets](https://github.com/changesets/changesets).

| Change type | Version bump |
|---|---|
| New tokens added | `minor` |
| Token renamed or removed | `major` |
| Value corrected (bug) | `patch` |
| Docs / comments only | no bump needed |

```bash
npx changeset        # create a changeset
npx changeset version # apply version bumps
```

## Code style

No linting setup — just keep the generator scripts consistent with the existing style. Comments should explain *why*, not *what*.

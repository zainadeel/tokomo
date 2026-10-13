# @ds-mo/tokens

Design tokens as CSS custom properties, JSON, and TypeScript constants — the token foundation for the **CompoMo** design system.

Part of the design system trilogy:
**TokoMo** (`@ds-mo/tokens`) → **IcoMo** (`@ds-mo/icons`) → **CompoMo** (`@ds-mo/ui`)

Figma-first: tokens are exported from Figma variables and built into CSS via generator scripts. Drop in new JSON, run the build, everything updates.

[![npm version](https://img.shields.io/npm/v/@ds-mo/tokens.svg)](https://www.npmjs.com/package/@ds-mo/tokens)

## Install

```bash
npm install @ds-mo/tokens
# or
pnpm add @ds-mo/tokens

# Local development (no npm publish needed):
pnpm add file:../path/to/tokomo
```

## Usage

The default CSS, JSON, TypeScript, token index, browser, and agent guidance target
**web consumers**. Native mobile consumers explicitly use the [mobile bundle](#mobile-bundle).
Semantic/data colors and effect primitives have one shared source; dimensions
and typography have separate web and mobile sources.

### CSS

```css
/* All tokens at once */
@import '@ds-mo/tokens';

/* Or selectively */
@import '@ds-mo/tokens/colors';
@import '@ds-mo/tokens/dimensions';
@import '@ds-mo/tokens/typography';
@import '@ds-mo/tokens/effects';

/* Optional: base styles (reduced-motion, native focus defaults) */
@import '@ds-mo/tokens/globals';

/* Optional: CSS reset */
@import '@ds-mo/tokens/reset';
```

`globals` provides a zero-specificity, immediate focus outline for native buttons,
links, and form controls using `--color-interaction-focus`. Components own their
focus styling and transitions; arbitrary `tabindex` targets retain the browser's
indicator unless the application supplies one. The explicit
`data-focus-from-shortcut` opt-out suppresses an outline only while its marker is
present; remove it before ordinary keyboard navigation resumes.

Generic CSS utility classes are no longer shipped. Remove imports of
`@ds-mo/tokens/utilities` or `@ds-mo/tokens/dist/utilities.css`; replace any
utility class usage with application styles or your component library's helpers.
Tokens, globals, and reset remain available as separate imports.

The translucent surface token is now `--color-translucent-background`, replacing
`--color-translucent-translucent`. TypeScript consumers should use
`colorTranslucentBackground` instead of `colorTranslucentTranslucent`.

### JS / TypeScript (via bundler)

```ts
import '@ds-mo/tokens';
import '@ds-mo/tokens/globals';

// Type-safe token name constants
import { colorBackgroundPrimary, dimensionSpace200 } from '@ds-mo/tokens/ts';
// value is just the CSS variable name string: '--color-background-primary'
element.style.setProperty(colorBackgroundPrimary, 'red');
```

### JSON (for tooling, plugins, etc.)

```ts
import tokens from '@ds-mo/tokens/json';
import colors from '@ds-mo/tokens/json/colors';
```

### Selection guidance

`@ds-mo/tokens/agent` is the single machine-readable contract for choosing and composing tokens. It contains framework-neutral principles, the nine color intents, token-family guidance, and recipes for semantic color pairing, interaction layers, typography composites, and elevation.

```ts
import guidance from '@ds-mo/tokens/agent';

const colorFamilies = guidance.families.filter(family => family.category === 'color');
const typeRecipes = guidance.recipes.find(recipe => recipe.id === 'token-recipe:typography-composites');
```

The [documentation site](https://zainadeel.github.io/tokomo/) renders the same contract for people under **Browser / Documentation / Color graph / Color tool**. The Browser shows values; Documentation intentionally explains selection with token names only. Agents can start from [`llms.txt`](https://zainadeel.github.io/tokomo/llms.txt), which links the contract and token index directly.

## Theming

Light/dark theme is controlled via a `data-theme` attribute on `<html>`:

```ts
document.documentElement.setAttribute('data-theme', 'dark');
document.documentElement.setAttribute('data-theme', 'light');
```

Light is the default. No JS required — pure CSS variable overrides.

The theme applies to the whole document. Setting `data-theme` on a container
does not switch token values; nested light/dark token themes are not supported.
Import both theme files so native controls follow the root theme:

```css
@import '@ds-mo/tokens/themes/light';
@import '@ds-mo/tokens/themes/dark';
```

These files set native `color-scheme` only. Color token values come from
`@ds-mo/tokens` or `@ds-mo/tokens/colors`.
The light theme file can also opt a container's native controls into light
appearance, but that does not reset the container's inherited color tokens.

## Token categories

| File | Prefix | Contains |
|---|---|---|
| `colors.css` | `--color-*` | Semantic colors (light + dark), reference palette, data viz |
| `dimensions.css` | `--dimension-*` | Space, radius, size, stroke-width, fixed layout constraints, transforms, and z-index |
| `typography.css` | `--typography-*` | Font family, weight, font-size, line-height, letter-spacing, paragraph spacing |
| `effects.css` | `--effect-*` | Blur, animation timing, easing, elevation shadows |

Typography ships **CSS primitives rather than `.text-*` classes**. TokoMo itself defines the recommended display/title/body/caption × regular/emphasis composites in `@ds-mo/tokens/agent`, so any framework or component library can implement them consistently. Selection guidance for each style is in the `token-recipe:typography-composites` recipe.

## Scaling

`--dimension-base` is `8px`. The spacing, radius, size, and stroke-width category bases alias it by default, so one override scales those four token scales together:

```css
:root {
  --dimension-base: 10px;
}
```

Each category also has its own override point. Radius therefore has a separate base while still resolving to the same 8px default:

```css
:root {
  --dimension-space-base: 10px;
  --dimension-radius-base: 6px;
}
```

Fixed layout widths/heights, z-index layers, unitless transform scales, and `--dimension-radius-half` do not inherit `--dimension-base`; choose those by their documented role rather than expecting a global scale override. Offset tokens do follow the spacing base.

## Elevation

Each suffix publishes a public outer shadow, inset highlight, and combined elevation token. Use the combined token by default:

```css
/* Normal one-element case */
.surface { box-shadow: var(--effect-elevation-elevated-sm); }

/* Split only when the paint/clipping hierarchy requires two layers */
.surface-frame {
  box-shadow: var(--effect-shadow-elevated-sm);
}
.surface-content {
  overflow: hidden;
  box-shadow: var(--effect-highlight-elevated-sm);
}
```

Keep split parts on the same suffix. An element's own overflow does not automatically require a split; use it when an ancestor or inner clipping boundary would otherwise cut a descendant's outer shadow. Selection guidance for each suffix is in the `token-recipe:elevation-composition` recipe.

Available: `elevated-none`, `elevated-sm`, `elevated-md`, `elevated-floating`, `depressed-sm`, `depressed-md`, `elevated-panel-top/right/bottom/left`

## Mobile bundle

`npm run build` also produces `dist/mobile/`. It ships in the same npm release as
the web tokens, with a separate package entry point:

```js
import manifest from '@ds-mo/tokens/mobile' with { type: 'json' };
import dimensions from '@ds-mo/tokens/mobile/tokens/dimensions/mobile/value.tokens.json' with { type: 'json' };
```

The entry point is a manifest containing `schemaVersion`, the package name and
version, and a `files` list. Each file records its path relative to `dist/mobile/`,
source path, platform (`shared` or `mobile`), category, mode, format, and SHA-256
checksum. The manifest schema is versioned independently of the package release.

```text
dist/mobile/
  manifest.json
  tokens/
    colors/reference/hex.tokens.json
    colors/semantic/{light,dark}.tokens.json
    colors/data/{light,dark}.tokens.json
    effects/value.tokens.json
    dimensions/mobile/value.tokens.json
    typography/mobile/value.tokens.json
    typography/mobile/semantic.tokens.json
```

The nine token files preserve the authored JSON, including Figma metadata,
aliases, numeric values, duration units, and the native text-style format.
The `tokens/` layout matches `design_tokens`, so its fetch workflow can copy the
listed files from a specific published version after verifying their checksums.
Native Swift/Kotlin code generation stays in the mobile engineering pipeline.
The downstream fetch action is a separate integration; publishing this bundle
does not itself update `design_tokens`.

Colors reuse the shared reference, semantic, and data sources in both themes.
Native JSON retains the existing Figma sRGB values; web CSS continues to emit
OKLCH for named chromatic references. These are platform representations of the
same authored palette, with the gamut behavior described in
[the color specification](docs/guidelines/color-generation.md#42-working-color-space).
Effects contain the shared authored primitives; CSS composite shadows and
elevation remain web outputs.

Mobile dimensions, typography primitives, and text styles are validated before
any build output is replaced. A text style must reference a mobile primitive and
its embedded value must agree within Figma's floating-point tolerance. Update
the corresponding text-style values when changing typography primitives. The
existing CSS imports, web JSON/TypeScript exports, and agent guidance continue
to contain only web and shared tokens.

## Updating from Figma

1. Export updated variable JSON from Figma
2. Replace the appropriate authored source:

   | Collection | Source |
   | --- | --- |
   | Shared colors | `src/json/colors/{reference,semantic,data}/` |
   | Shared effect primitives | `src/json/effects/effects.tokens.json` |
   | Web dimensions / typography | `src/json/{dimensions,typography}/web/value.tokens.json` |
   | Mobile dimensions / typography | `src/json/{dimensions,typography}/mobile/value.tokens.json` |
   | Mobile text styles | `src/json/typography/mobile/semantic.tokens.json` |

3. Run the build:

```bash
node scripts/build.mjs
```

## Dev

```bash
node scripts/build.mjs          # full build
node scripts/build.mjs --watch  # watch mode
```

## License

MIT

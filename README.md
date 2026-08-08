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

### CSS

```css
/* All tokens at once */
@import '@ds-mo/tokens';

/* Or selectively */
@import '@ds-mo/tokens/colors';
@import '@ds-mo/tokens/dimensions';
@import '@ds-mo/tokens/typography';
@import '@ds-mo/tokens/effects';

/* Optional: base styles (font loading, reduced-motion, focus rings) */
@import '@ds-mo/tokens/globals';

/* Optional: CSS reset */
@import '@ds-mo/tokens/reset';
```

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

The [documentation site](https://zainadeel.github.io/tokomo/) renders the same contract for people under **Browser / Documentation / Color Tool**. The Browser shows values; Documentation intentionally explains selection with token names only.

## Theming

Light/dark theme is controlled via a `data-theme` attribute on `<html>`:

```ts
document.documentElement.setAttribute('data-theme', 'dark');
document.documentElement.setAttribute('data-theme', 'light');
```

Light is the default. No JS required — pure CSS variable overrides.

## Token categories

| File | Prefix | Contains |
|---|---|---|
| `colors.css` | `--color-*` | Semantic colors (light + dark), reference palette, data viz |
| `dimensions.css` | `--dimension-*` | Space, radius, size, stroke-width, fixed layout constraints, transforms, and z-index |
| `typography.css` | `--typography-*` | Font family, weight, font-size, line-height, letter-spacing, paragraph spacing |
| `effects.css` | `--effect-*` | Blur, animation timing, easing, elevation shadows |

Typography ships **CSS primitives rather than `.text-*` classes**. TokoMo itself defines the recommended display/title/body/caption × regular/emphasis composites in `@ds-mo/tokens/agent`, so any framework or component library can implement them consistently. See [docs/guidelines/typography-usage.md](docs/guidelines/typography-usage.md).

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

Keep split parts on the same suffix. An element's own overflow does not automatically require a split; use it when an ancestor or inner clipping boundary would otherwise cut a descendant's outer shadow. See [docs/guidelines/elevation-usage.md](docs/guidelines/elevation-usage.md).

Available: `elevated-none`, `elevated-sm`, `elevated-md`, `elevated-floating`, `depressed-sm`, `depressed-md`, `elevated-panel-top/right/bottom/left`

## Updating from Figma

1. Export updated variable JSON from Figma
2. Drop into `src/json/{colors,dimensions,typography,effects}/`
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

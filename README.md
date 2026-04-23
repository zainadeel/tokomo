# @ds-mo/tokens

Design tokens as CSS custom properties, JSON, and TypeScript constants — the token foundation for the **CompoMo** design system.

Part of the design system trilogy:
**TokoMo** (`@ds-mo/tokens`) → **IcoMo** (`@ds-mo/icons`) → **CompoMo** (`@ds-mo/ui`)

Figma-first: tokens are exported from Figma variables and built into CSS via generator scripts. Drop in new JSON, run the build, everything updates.

<!-- x-release-please-start-version -->
**Current version: 0.4.3**
<!-- x-release-please-end-version -->

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
| `dimensions.css` | `--dimension-*` | Space, radius, size, stroke-width — all `calc()` from `--dimension-base` |
| `typography.css` | `--typography-*` | Weight, font-size, line-height, letter-spacing + `.text-*` classes |
| `effects.css` | `--effect-*` | Blur, animation timing, easing, elevation shadows |

## Scaling

All dimension tokens are `calc()` from `--dimension-base: 8px`. Override it to scale everything:

```css
:root {
  --dimension-base: 10px; /* scales all spacing, radius, size, stroke-width */
}
```

Or override a single category:

```css
:root {
  --dimension-space-base: 10px;
  --dimension-radius-base: 6px;
}
```

## Elevation

Each level gives you three tokens to handle `overflow: hidden` clipping:

```css
/* Simple case — no overflow clipping */
.card { box-shadow: var(--effect-elevation-elevated-sm); }

/* With overflow: hidden — split shadow and highlight */
.card {
  overflow: hidden;
  box-shadow: var(--effect-shadow-elevated-sm);   /* outset on root */
  position: relative;
}
.card::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  box-shadow: var(--effect-highlight-elevated-sm); /* inset on overlay */
  pointer-events: none;
}
```

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

# @motive/tokens

Design tokens for the Motive Design System — colors, dimensions, typography, and effects as CSS custom properties.

## Installation

```bash
npm install @motive/tokens
# or
pnpm add @motive/tokens
```

## Usage

### CSS (recommended)

Import all tokens at once:

```css
/* In your app's entry CSS file */
@import '@motive/tokens';
@import '@motive/tokens/globals'; /* Base styles: font, focus rings, reduced-motion */
@import '@motive/tokens/reset';   /* CSS reset (optional) */
```

Or import individual categories:

```css
@import '@motive/tokens/colors';
@import '@motive/tokens/dimensions';
@import '@motive/tokens/typography';
@import '@motive/tokens/effects';
```

### In React / JS entry point

```tsx
import '@motive/tokens';
import '@motive/tokens/globals';
```

### TypeScript constants

For type-safe token references in JavaScript:

```tsx
import { colorBackgroundPrimary, dimensionSpace100 } from '@motive/tokens/ts';

// colorBackgroundPrimary === '--color-background-primary'
element.style.setProperty(colorBackgroundPrimary, '#fff');
```

### JSON (for tooling, Figma plugins, etc.)

```js
import tokens from '@motive/tokens/json';
import colors from '@motive/tokens/json/colors';
```

## Token Categories

### Colors (660+ tokens)

Organized in three layers:

1. **Reference colors** — raw palette values (oklch + rgb)
   - `--color-reference-black-{0-100}`, `--color-reference-white-{0-100}`
   - `--color-reference-{light|dark}-{color}-{hue}-l{L}-c{C}-{role}`

2. **Semantic colors** — purpose-driven aliases
   - `--color-background-{bold|medium|faint|strong}-{brand|neutral|negative|positive|warning|...}`
   - `--color-foreground-{primary|secondary|tertiary|bold|medium|faint}-{intent}`
   - `--color-interaction-{hover|pressed}`

3. **Data colors** — domain-specific (geofence, driver status, entity markers, safety scores)

### Dimensions

All derived from `--dimension-base: 8px`:

- **Spacing**: `--dimension-space-{000-800}` (0–64px)
- **Sizing**: `--dimension-size-{000-800}`
- **Radius**: `--dimension-radius-{000-600}`, `--dimension-radius-half` (pill)
- **Z-index**: `--dimension-z-index-{base|aside|overlay|modal|floating|tooltip}`
- **Stroke**: `--dimension-stroke-width-{006-050}`
- **Layout**: Modal, card, panel, form, menu, tooltip widths

### Typography

- **Weights**: `--typography-weight-{regular|medium|semibold|bold}`
- **Sizes**: `--typography-fontsize-{xs|sm|md|lg|xl|2xl|3xl}`
- **Line heights**: `--typography-lineheight-{xs|sm|md|lg|xl|2xl|3xl}`
- **Text style classes**: `.text-display-medium`, `.text-body-large`, `.text-caption`, etc.

### Effects

- **Motion**: `--effect-motion-{instant|fast|medium|slow|slower|slowest}`
- **Elevation**: `--effect-surface-{depressed|flat|elevated|floating}`
- **Blur**: `--effect-blur-{sm|md|lg}`
- **Focus ring**: `--effect-focus-ring`

## Theming

Tokens support light/dark themes via the `data-theme` attribute:

```js
// Switch to dark mode
document.documentElement.setAttribute('data-theme', 'dark');

// Switch to light mode
document.documentElement.removeAttribute('data-theme');
```

Light theme is the default. Dark theme overrides are defined in `:root[data-theme="dark"]`.

## Build

```bash
pnpm build          # Full build
pnpm build:colors   # Regenerate colors.css from Figma JSON
pnpm build:json     # Regenerate JSON token files
pnpm build:ts       # Regenerate TypeScript constants
```

## Updating from Figma

1. Export tokens from Figma variables to JSON files in `src/json/colors/`
2. Run `pnpm build:colors` to regenerate `src/colors.css`
3. Run `pnpm build` to produce the full dist output

# Motive Design System

A monorepo containing the Motive Design System — shared tokens, React components, and documentation for use across all Motive projects and prototyping tools.

## Packages

| Package | Description | Status |
|---------|-------------|--------|
| [`@motive/tokens`](./packages/tokens) | Design tokens (colors, dimensions, typography, effects) as CSS custom properties, JSON, and TypeScript constants | **Ready** |
| [`@motive/components`](./packages/components) | React UI components built on the token system | Scaffold |
| [`apps/docs`](./apps/docs) | Storybook documentation site | Planned |

## Quick Start

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Build tokens only
pnpm build:tokens
```

## Using in a Project

### Install

```bash
npm install @motive/tokens @motive/components
```

### Import Tokens

```css
/* In your entry CSS */
@import '@motive/tokens';
@import '@motive/tokens/globals';
@import '@motive/tokens/reset';
```

### Use Components (coming soon)

```tsx
import { ButtonPrimary, Text, Surface } from '@motive/components';
import '@motive/components/styles.css';

function App() {
  return (
    <Surface elevation="elevated" radius="medium">
      <Text style="title-medium">Hello, Motive</Text>
      <ButtonPrimary label="Get Started" intent="brand" />
    </Surface>
  );
}
```

## Architecture

```
motive-design-system/
├── packages/
│   ├── tokens/          @motive/tokens — CSS variables, JSON, TypeScript
│   └── components/      @motive/components — React components (scaffold)
├── apps/
│   └── docs/            Storybook documentation (planned)
├── turbo.json           Turborepo configuration
├── pnpm-workspace.yaml  Workspace definition
└── tsconfig.base.json   Shared TypeScript config
```

### Token Architecture

Tokens flow from Figma → JSON → CSS → Components:

1. **Figma variables** are exported as JSON (`src/json/colors/*.tokens.json`)
2. **Build scripts** generate CSS custom properties from JSON
3. **CSS files** define all tokens in `:root` with dark mode overrides
4. **Components** consume tokens via `var(--token-name)` in CSS Modules
5. **TypeScript constants** enable type-safe token references in JS

### Design Principles

- **Token-driven**: Every visual value (color, spacing, radius, shadow) comes from a token
- **Theme-ready**: Light/dark themes via `data-theme` attribute on `<html>`
- **Framework-agnostic tokens**: CSS custom properties work everywhere
- **React components**: Composable, typed, no business logic
- **8px grid**: All dimensions derived from `--dimension-base: 8px`

## Development

```bash
# Watch mode (rebuilds on changes)
pnpm dev

# Format code
pnpm format

# Create a changeset for versioning
pnpm changeset

# Publish packages
pnpm release
```

## Versioning

Uses [Changesets](https://github.com/changesets/changesets) for semantic versioning:

- Token additions → minor bump
- Token removals/renames → major bump
- New components → minor bump
- Breaking prop changes → major bump
- Bug fixes → patch bump

## Tech Stack

- **Monorepo**: Turborepo + pnpm workspaces
- **Tokens**: CSS custom properties + JSON + TypeScript
- **Components**: React 18 + TypeScript + CSS Modules
- **Theming**: `data-theme` attribute + CSS variable overrides
- **Versioning**: Changesets
- **Documentation**: Storybook (planned)

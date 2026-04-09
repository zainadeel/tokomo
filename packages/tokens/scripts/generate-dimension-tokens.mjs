/**
 * Generate dimensions.css from Figma JSON source.
 *
 * Source: src/json/dimensions/dimensions.tokens.json
 * Output: src/dimensions.css
 *
 * What this generates (from Figma):
 *   --dimension-base
 *   --dimension-space-*          (GAP scope)
 *   --dimension-radius-*         (CORNER_RADIUS scope)
 *   --dimension-stroke-width-*   (STROKE_FLOAT scope; Figma covers 012–050 only)
 *   --dimension-size-*           (WIDTH_HEIGHT scope)
 *   --dimension-iconography-*    (semantic aliases of size-icon)
 *   --dimension-card-width-*
 *   --dimension-modal-width-*
 *   --dimension-form-width-*
 *   --dimension-table-column-width-*
 *   --dimension-menu-width-*
 *   --dimension-tooltip-width-*
 *   --dimension-panel-width-*
 *
 * What stays HAND-AUTHORED (not yet in Figma — add these to get full JSON coverage):
 *   --dimension-space-037 / n037         (3px fractional, not on 8px grid)
 *   --dimension-stroke-width-006         (0.5px — add to Figma)
 *   --dimension-stroke-width-009         (0.75px — add to Figma)
 *   --dimension-size-450                 (36px — add to Figma or remove)
 *   --dimension-size-550                 (44px — conflicts with size-icon-2xl=48px, see note)
 *   --dimension-size-700                 (56px — conflicts with size-icon-3xl=64px, see note)
 *   --dimension-offset-*                 (add to Figma)
 *   --dimension-scale-*                  (unitless, add to Figma)
 *   --dimension-table-*                  (multiplier system — CSS-only concept)
 *   --dimension-z-index-*                (add to Figma)
 *   --dimension-divider-sm/md/lg/xl      (aliases, add to Figma)
 *   --dimension-focus-ring-*             (aliases, add to Figma)
 *   --dimension-breakpoint-*             (add to Figma)
 *   --dimension-magic-*                  (thresholds, add to Figma)
 *   Component-specific tokens            (chat-input, floating, cell, etc. — add to Figma)
 *
 * ⚠ DISCREPANCIES to resolve in Figma before relying fully on JSON:
 *   size-icon-2xl: Figma=48px, current CSS=44px (via size-550)
 *   size-icon-3xl: Figma=64px, current CSS=56px (via size-700)
 *   width-panel-xl: Figma=600px, current CSS=500px (lg was the largest)
 *   size-500 (40px): in Figma but not in current CSS
 */

import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PKG_ROOT = path.resolve(__dirname, '..');

const SOURCE = path.join(PKG_ROOT, 'src/json/dimensions/dimensions.tokens.json');
const OUTPUT  = path.join(PKG_ROOT, 'src/dimensions.css');

const formatValue = (value, isString = false) => {
  if (isString) return value;
  // Round to 2dp to clean float noise, then append px
  const rounded = Math.round(value * 100) / 100;
  return `${rounded}px`;
};

const generate = () => {
  const json = JSON.parse(readFileSync(SOURCE, 'utf8'));
  const lines = [];

  // ── base ─────────────────────────────────────────────────────────────────
  lines.push(`  /* Base */`);
  lines.push(`  --dimension-base: ${formatValue(json.base.$value)};`);
  lines.push('');

  // ── space ─────────────────────────────────────────────────────────────────
  lines.push(`  /* Spacing — all values derived from --dimension-base (8px grid) */`);
  for (const [key, token] of Object.entries(json.space)) {
    lines.push(`  --dimension-space-${key}: ${formatValue(token.$value)};`);
  }
  lines.push('');

  // ── radius ────────────────────────────────────────────────────────────────
  lines.push(`  /* Radius */`);
  for (const [key, token] of Object.entries(json.radius)) {
    const value = key === 'half' ? `${token.$value}px` : formatValue(token.$value);
    lines.push(`  --dimension-radius-${key}: ${value};`);
  }
  lines.push('');

  // ── stroke width (from Figma: 012–050 only) ───────────────────────────────
  lines.push(`  /* Stroke widths (Figma covers 012–050; 006 and 009 are hand-authored below) */`);
  for (const [key, token] of Object.entries(json['width-stroke'])) {
    lines.push(`  --dimension-stroke-width-${key}: ${formatValue(token.$value)};`);
  }
  lines.push('');

  // ── size ──────────────────────────────────────────────────────────────────
  lines.push(`  /* Size — element width/height */`);
  for (const [key, token] of Object.entries(json.size)) {
    const value = key === '000' ? '0' : formatValue(token.$value);
    lines.push(`  --dimension-size-${key}: ${value};`);
  }
  lines.push('');

  // ── iconography (size-icon → --dimension-iconography-*) ───────────────────
  lines.push(`  /* Iconography — semantic size aliases */`);
  for (const [key, token] of Object.entries(json['size-icon'])) {
    lines.push(`  --dimension-iconography-${key}: ${formatValue(token.$value)};`);
  }
  lines.push('');

  // ── component widths ──────────────────────────────────────────────────────
  const widthGroups = [
    ['width-card',         'card-width',         'Card widths'],
    ['width-modal',        'modal-width',         'Modal widths'],
    ['width-form',         'form-width',          'Form widths'],
    ['width-table-column', 'table-column-width',  'Table column widths'],
    ['width-menu',         'menu-width',          'Menu widths'],
    ['width-tooltip',      'tooltip-width',       'Tooltip widths'],
    ['width-panel',        'panel-width',         'Panel widths'],
  ];

  for (const [jsonKey, cssPrefix, comment] of widthGroups) {
    lines.push(`  /* ${comment} */`);
    for (const [key, token] of Object.entries(json[jsonKey])) {
      const isString = token.$type === 'string';
      const value = isString ? token.$value : formatValue(token.$value);
      lines.push(`  --dimension-${cssPrefix}-${key}: ${value};`);
    }
    lines.push('');
  }

  // ── hand-authored section ─────────────────────────────────────────────────
  const handAuthored = `
  /* ─────────────────────────────────────────────────────────────────────────
     HAND-AUTHORED — not yet in Figma variables. Add these to Figma to get
     full JSON-driven coverage. See generate-dimension-tokens.mjs for notes.
     ───────────────────────────────────────────────────────────────────────── */

  /* Fractional space tokens (not on 8px grid — add to Figma or remove) */
  --dimension-space-037: 3px;
  --dimension-space-n037: -3px;

  /* Sub-pixel stroke widths (add to Figma) */
  --dimension-stroke-width-006: 0.5px;
  --dimension-stroke-width-009: 0.75px;

  /* Intermediate size tokens used by components (add to Figma or remove) */
  --dimension-size-450: 36px; /* toggle width */
  --dimension-size-550: 44px; /* ⚠ conflicts with Figma size-icon-2xl=48px — resolve before removing */
  --dimension-size-700: 56px; /* ⚠ conflicts with Figma size-icon-3xl=64px — resolve before removing */

  /* Divider aliases (add to Figma) */
  --dimension-divider-sm: var(--dimension-stroke-width-006);
  --dimension-divider-md: var(--dimension-stroke-width-009);
  --dimension-divider-lg: var(--dimension-stroke-width-012);
  --dimension-divider-xl: var(--dimension-stroke-width-015);

  /* Focus ring (add to Figma) */
  --dimension-focus-ring-width: var(--dimension-stroke-width-025);
  --dimension-focus-ring-offset: var(--dimension-space-025);

  /* Breakpoint (add to Figma) */
  --dimension-breakpoint-mobile: 768px;

  /* Offset tokens — for transforms, background-position (add to Figma) */
  --dimension-offset-000: 0;
  --dimension-offset-050: 4px;
  --dimension-offset-100: 8px;
  --dimension-offset-125: 10px;
  --dimension-offset-150: 12px;
  --dimension-offset-200: 16px;
  --dimension-offset-n050: -4px;
  --dimension-offset-n100: -8px;
  --dimension-offset-n200: -16px;
  --dimension-offset-n250: -20px;

  /* Scale tokens — for transform: scale() (add to Figma) */
  --dimension-scale-100: 1;
  --dimension-scale-subtle: 0.99;

  /* Table density multiplier system — CSS-only concept, not applicable in Figma */
  --dimension-table-multiplier: 1;
  --dimension-table-space-000: 0px;
  --dimension-table-space-012: calc(var(--dimension-base) * var(--dimension-table-multiplier) / 8);
  --dimension-table-space-025: calc(var(--dimension-base) * var(--dimension-table-multiplier) / 4);
  --dimension-table-space-037: calc(var(--dimension-base) * var(--dimension-table-multiplier) * 3 / 8);
  --dimension-table-space-050: calc(var(--dimension-base) * var(--dimension-table-multiplier) / 2);
  --dimension-table-space-075: calc(var(--dimension-base) * var(--dimension-table-multiplier) * 3 / 4);
  --dimension-table-space-100: calc(var(--dimension-base) * var(--dimension-table-multiplier));
  --dimension-table-space-125: calc(var(--dimension-base) * var(--dimension-table-multiplier) * 5 / 4);
  --dimension-table-space-150: calc(var(--dimension-base) * var(--dimension-table-multiplier) * 3 / 2);
  --dimension-table-space-175: calc(var(--dimension-base) * var(--dimension-table-multiplier) * 7 / 4);
  --dimension-table-space-200: calc(var(--dimension-base) * var(--dimension-table-multiplier) * 2);
  --dimension-table-space-250: calc(var(--dimension-base) * var(--dimension-table-multiplier) * 5 / 2);
  --dimension-table-space-300: calc(var(--dimension-base) * var(--dimension-table-multiplier) * 3);
  --dimension-table-space-400: calc(var(--dimension-base) * var(--dimension-table-multiplier) * 4);
  --dimension-table-space-600: calc(var(--dimension-base) * var(--dimension-table-multiplier) * 6);
  --dimension-table-space-800: calc(var(--dimension-base) * var(--dimension-table-multiplier) * 8);
  --dimension-table-radius-200: calc(var(--dimension-radius-100) * var(--dimension-table-multiplier) * 2);

  /* Z-index layers (add to Figma) */
  --dimension-z-index-base: 0;
  --dimension-z-index-aside: 50;
  --dimension-z-index-overlay: 250;
  --dimension-z-index-overlay-button: 300;
  --dimension-z-index-floating-assistant: 400;
  --dimension-z-index-modal: 450;
  --dimension-z-index-floating: 500;
  --dimension-z-index-tooltip: 750;
  --dimension-z-index-theme-transition: 999999;

  /* Interaction / magic thresholds (add to Figma) */
  --dimension-magic-resize-edge: 4px;
  --dimension-magic-resize-snap: 8px;
  --dimension-magic-drag-threshold: 3px;
  --dimension-magic-speed-threshold: 5px;
  --dimension-magic-scroll-fade-divisor: 15;

  /* Component-specific (add to Figma) */
  --dimension-chat-input-min-height: 32px;
  --dimension-chat-input-max-height: 112px;
  --dimension-chat-input-container-max-height: 164px;
  --dimension-color-preview-width: 64px;
  --dimension-color-swatch-height: 80px;
  --dimension-tooltip-max-height: 100px;
  --dimension-floating-width: 300px;
  --dimension-floating-height-default: 400px;
  --dimension-floating-height-max: 600px;
  --dimension-cell-width-default: 200px;
  --dimension-cell-width-color: 200px;`;

  const output = [
    '/* AUTO-GENERATED + HAND-AUTHORED. See scripts/generate-dimension-tokens.mjs */',
    '/* Generated section: from src/json/dimensions/dimensions.tokens.json        */',
    '',
    ':root {',
    ...lines,
    handAuthored,
    '}',
    '',
  ].join('\n');

  writeFileSync(OUTPUT, output, 'utf8');

  const generated = lines.filter(l => l.includes('--dimension-')).length;
  console.log(`    dimensions: ${generated} tokens generated → src/dimensions.css`);
};

generate();

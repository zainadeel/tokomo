/**
 * Generate dimensions.css from Figma JSON source.
 *
 * Source: src/json/dimensions/dimensions.tokens.json
 * Output: src/dimensions.css
 *
 * What this generates (from Figma):
 *   --dimension-base                 (8px — override to scale the whole system)
 *   --dimension-{space,radius,size,stroke-width}-base   (all alias --dimension-base)
 *   --dimension-space-*              calc() expressions relative to --dimension-space-base
 *   --dimension-radius-*             calc() expressions relative to --dimension-radius-base
 *   --dimension-stroke-width-*       calc() expressions relative to --dimension-stroke-width-base
 *   --dimension-size-*               calc() expressions relative to --dimension-size-base
 *   --dimension-iconography-*        calc() expressions relative to --dimension-size-base
 *   --dimension-{card,modal,form,table-column,menu,tooltip,panel}-width-*   absolute px
 *
 * How calc() is generated:
 *   Each token value from Figma is divided by BASE_PX (8) to get a multiplier.
 *   The multiplier is expressed as a clean integer fraction (e.g. 3/4, 5/4)
 *   matching the naming convention where the suffix ≈ 100 × (value / 8).
 *   This lets you scale the entire dimension system by overriding --dimension-base.
 *
 * What stays HAND-AUTHORED:
 *   --dimension-space-037 / n037      (3px fractional, not on 8px grid)
 *   --dimension-stroke-width-006/009  (sub-pixel hairlines)
 *   --dimension-size-450              (36px component size)
 *   --dimension-offset-*
 *   --dimension-scale-*
 *   --dimension-table-*               (multiplier system — CSS-only concept)
 *   --dimension-z-index-*
 *   --dimension-divider-*
 *   --dimension-focus-ring-*
 *   --dimension-breakpoint-*
 *   --dimension-magic-*
 *   Component-specific tokens
 */

import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PKG_ROOT = path.resolve(__dirname, '..');

const SOURCE = path.join(PKG_ROOT, 'src/json/dimensions/dimensions.tokens.json');
const OUTPUT  = path.join(PKG_ROOT, 'src/dimensions.css');

const BASE_PX = 8;

/**
 * Convert a Figma px value to a calc() expression relative to a CSS base variable.
 *
 * Uses clean integer fractions (tries denominators 1, 2, 4, 8, 16, 32) to keep
 * the output readable — the same style as the hand-authored table multiplier system.
 *
 * Examples (base = 8px):
 *   8  → var(--dimension-space-base)
 *   4  → calc(var(--dimension-space-base) / 2)
 *   6  → calc(var(--dimension-space-base) * 3 / 4)
 *   10 → calc(var(--dimension-space-base) * 5 / 4)
 *  -8  → calc(var(--dimension-space-base) * -1)
 *   0  → 0
 * 9999 → 9999px  (pill/full-round radius escape hatch)
 */
const toCalcExpr = (value, baseVar) => {
  if (value === 0) return '0';
  if (value === 9999) return '9999px';

  const isNeg  = value < 0;
  const absVal = Math.abs(value);
  const absMult = absVal / BASE_PX;

  // Try denominators smallest-first so we get the simplest fraction
  const DENOMINATORS = [1, 2, 4, 8, 16, 32];
  for (const den of DENOMINATORS) {
    const absNum = Math.round(absMult * den);
    if (Math.abs(absNum / den - absMult) < 1e-9) {
      const num = isNeg ? -absNum : absNum;

      // mult === ±1 → trivial
      if (absNum === den) {
        return isNeg
          ? `calc(var(${baseVar}) * -1)`
          : `var(${baseVar})`;
      }
      // Integer multiple (denominator = 1)
      if (den === 1) return `calc(var(${baseVar}) * ${num})`;
      // Unit numerator with denominator
      if (absNum === 1) {
        return isNeg
          ? `calc(var(${baseVar}) * -1 / ${den})`
          : `calc(var(${baseVar}) / ${den})`;
      }
      // General fraction
      return `calc(var(${baseVar}) * ${num} / ${den})`;
    }
  }

  // Fallback — shouldn't be reached for any Figma token in this file
  const dec = Math.round((value / BASE_PX) * 1_000_000) / 1_000_000;
  return `calc(var(${baseVar}) * ${dec})`;
};

/** Absolute px — for semantic component widths not derived from the grid base */
const toPx = value => `${value}px`;

const generate = () => {
  const json = JSON.parse(readFileSync(SOURCE, 'utf8'));
  const lines = [];

  // ── base variables ────────────────────────────────────────────────────────
  lines.push('  /* Base — override --dimension-base to scale the entire dimension system */');
  lines.push('  --dimension-base:              8px;');
  lines.push('  --dimension-space-base:        var(--dimension-base);');
  lines.push('  --dimension-radius-base:       var(--dimension-base);');
  lines.push('  --dimension-size-base:         var(--dimension-base);');
  lines.push('  --dimension-stroke-width-base: var(--dimension-base);');
  lines.push('');

  // ── space ─────────────────────────────────────────────────────────────────
  lines.push('  /* Spacing — calc() relative to --dimension-space-base */');
  for (const [key, token] of Object.entries(json.space)) {
    lines.push(`  --dimension-space-${key}: ${toCalcExpr(token.$value, '--dimension-space-base')};`);
  }
  lines.push('');

  // ── radius ────────────────────────────────────────────────────────────────
  lines.push('  /* Radius — calc() relative to --dimension-radius-base */');
  for (const [key, token] of Object.entries(json.radius)) {
    lines.push(`  --dimension-radius-${key}: ${toCalcExpr(token.$value, '--dimension-radius-base')};`);
  }
  lines.push('');

  // ── stroke width ──────────────────────────────────────────────────────────
  lines.push('  /* Stroke widths — calc() relative to --dimension-stroke-width-base */');
  lines.push('  /* (006 and 009 are sub-pixel hairlines, hand-authored below) */');
  for (const [key, token] of Object.entries(json['width-stroke'])) {
    lines.push(`  --dimension-stroke-width-${key}: ${toCalcExpr(token.$value, '--dimension-stroke-width-base')};`);
  }
  lines.push('');

  // ── size ──────────────────────────────────────────────────────────────────
  lines.push('  /* Size — element width/height, calc() relative to --dimension-size-base */');
  for (const [key, token] of Object.entries(json.size)) {
    lines.push(`  --dimension-size-${key}: ${toCalcExpr(token.$value, '--dimension-size-base')};`);
  }
  lines.push('');

  // ── iconography ───────────────────────────────────────────────────────────
  lines.push('  /* Iconography — semantic icon size aliases, calc() relative to --dimension-size-base */');
  for (const [key, token] of Object.entries(json['size-icon'])) {
    lines.push(`  --dimension-iconography-${key}: ${toCalcExpr(token.$value, '--dimension-size-base')};`);
  }
  lines.push('');

  // ── component widths (absolute px — not derived from base grid) ───────────
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
      const value = isString ? token.$value : toPx(token.$value);
      lines.push(`  --dimension-${cssPrefix}-${key}: ${value};`);
    }
    lines.push('');
  }

  // ── hand-authored section ─────────────────────────────────────────────────
  const handAuthored = `
  /* ─────────────────────────────────────────────────────────────────────────
     HAND-AUTHORED — not yet in Figma variables.
     All calc() values use the shared base vars so they scale automatically.
     ───────────────────────────────────────────────────────────────────────── */

  /* Fractional space tokens (3px — not on 8px grid) */
  --dimension-space-037:  calc(var(--dimension-space-base) * 3 / 8);
  --dimension-space-n037: calc(var(--dimension-space-base) * -3 / 8);

  /* Sub-pixel stroke widths (hairlines) */
  --dimension-stroke-width-006: calc(var(--dimension-stroke-width-base) / 16);      /* 0.5px */
  --dimension-stroke-width-009: calc(var(--dimension-stroke-width-base) * 3 / 32);  /* 0.75px */

  /* Intermediate size (36px — between size-400 and size-500) */
  --dimension-size-450: calc(var(--dimension-size-base) * 9 / 2);

  /* Breakpoints */
  --dimension-breakpoint-mobile: 768px;

  /* Offset tokens — for transforms and background-position */
  --dimension-offset-000:  0;
  --dimension-offset-050:  calc(var(--dimension-space-base) / 2);
  --dimension-offset-100:  var(--dimension-space-base);
  --dimension-offset-125:  calc(var(--dimension-space-base) * 5 / 4);
  --dimension-offset-150:  calc(var(--dimension-space-base) * 3 / 2);
  --dimension-offset-200:  calc(var(--dimension-space-base) * 2);
  --dimension-offset-n050: calc(var(--dimension-space-base) * -1 / 2);
  --dimension-offset-n100: calc(var(--dimension-space-base) * -1);
  --dimension-offset-n200: calc(var(--dimension-space-base) * -2);
  --dimension-offset-n250: calc(var(--dimension-space-base) * -5 / 2);

  /* Scale tokens — for transform: scale() */
  --dimension-scale-100:    1;
  --dimension-scale-subtle: 0.99;

  /* Z-index layers */
  --dimension-z-index-base:     0;
  --dimension-z-index-raised:   50;
  --dimension-z-index-overlay:  250;
  --dimension-z-index-modal:    450;
  --dimension-z-index-floating: 500;
  --dimension-z-index-tooltip:  750;`;

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

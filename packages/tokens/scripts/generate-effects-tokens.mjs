/**
 * Generate effects.css from Figma JSON source.
 *
 * Source: src/json/effects/effects.tokens.json
 * Output: src/effects.css
 *
 * What this generates (from Figma):
 *   --effect-animation-duration-*   (ms) — Figma naming: instant, short-1/2/3, medium-1/2/3, long-1/2/3
 *   --effect-animation-delay-*      (ms) — same naming scale
 *   --effect-animation-easing-*     — ease-in, ease-out, ease-in-out, ease-in-out-back
 *   --effect-blur-*                 (px) — sm, md, lg
 *
 * ⚠ NAMING NOTE — Figma vs previous CSS:
 *   Figma uses: instant, short-1, short-2, short-3, medium-1, medium-2, medium-3, long-1, long-2, long-3
 *   Old CSS used: instant, fast(100ms), medium(200ms), slow(300ms), slower(500ms), slowest(1000ms)
 *   The Figma naming is richer and more precise. Old aliases are preserved in the hand-authored
 *   section below so existing code doesn't break. Map them to the new tokens.
 *
 * ⚠ EASING NOTE — Figma vs previous CSS:
 *   Figma has: ease-in, ease-out, ease-in-out, ease-in-out-back (4 curves)
 *   Old CSS had: easing-cubic, easing-spring (2 curves)
 *   Old aliases preserved below. ease-in-out-back ≈ spring.
 *
 * What stays HAND-AUTHORED (not representable as Figma variables):
 *   --effect-motion-*               (shorthand: duration + easing combined)
 *   --effect-transition-*           (property-specific transition shorthands)
 *   --effect-inset-*, outset-*, surface-*, edge-*, overlay-*  (box-shadow tokens)
 *   --effect-focus-ring             (composite box-shadow)
 */

import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PKG_ROOT = path.resolve(__dirname, '..');

const SOURCE = path.join(PKG_ROOT, 'src/json/effects/effects.tokens.json');
const OUTPUT  = path.join(PKG_ROOT, 'src/effects.css');

const generate = () => {
  const json = JSON.parse(readFileSync(SOURCE, 'utf8'));
  const lines = [];

  // ── blur ──────────────────────────────────────────────────────────────────
  lines.push('  /* Blur */');
  for (const [key, token] of Object.entries(json.blur)) {
    lines.push(`  --effect-blur-${key}: ${token.$value}px;`);
  }
  lines.push('');

  // ── animation duration ────────────────────────────────────────────────────
  lines.push('  /* Animation durations */');
  for (const [key, token] of Object.entries(json.animation.duration)) {
    lines.push(`  --effect-animation-duration-${key}: ${token.$value}ms;`);
  }
  lines.push('');

  // ── animation delay ───────────────────────────────────────────────────────
  lines.push('  /* Animation delays */');
  for (const [key, token] of Object.entries(json.animation.delay)) {
    lines.push(`  --effect-animation-delay-${key}: ${token.$value}ms;`);
  }
  lines.push('');

  // ── easing ────────────────────────────────────────────────────────────────
  lines.push('  /* Animation easing curves */');
  for (const [key, token] of Object.entries(json.animation.easing)) {
    lines.push(`  --effect-animation-easing-${key}: ${token.$value};`);
  }

  // ── hand-authored section ─────────────────────────────────────────────────
  const handAuthored = `

  /* ─────────────────────────────────────────────────────────────────────────
     BACKWARD-COMPATIBLE ALIASES — map old naming to new Figma tokens.
     These keep existing component code working without changes.
     ───────────────────────────────────────────────────────────────────────── */

  /* Old speed names → new Figma duration tokens */
  --effect-animation-speed-instant: var(--effect-animation-duration-instant);
  --effect-animation-speed-fast:    var(--effect-animation-duration-short-2);   /* 100ms */
  --effect-animation-speed-medium:  var(--effect-animation-duration-short-3);   /* 200ms */
  --effect-animation-speed-slow:    var(--effect-animation-duration-medium-1);  /* 300ms */
  --effect-animation-speed-slower:  var(--effect-animation-duration-medium-3);  /* 500ms */
  --effect-animation-speed-slowest: var(--effect-animation-duration-long-2);    /* 1000ms */

  /* Old easing names → new Figma easing tokens */
  --effect-animation-easing-cubic:  var(--effect-animation-easing-ease-in-out);
  --effect-animation-easing-spring: var(--effect-animation-easing-ease-in-out-back);

  /* Old delay names → new Figma delay tokens */
  --effect-motion-delay-instant: var(--effect-animation-delay-instant);
  --effect-motion-delay-little:  var(--effect-animation-duration-short-2);   /* 100ms (reuse duration) */
  --effect-motion-delay-medium:  var(--effect-animation-delay-short-1);      /* 200ms */
  --effect-motion-delay-more:    var(--effect-animation-delay-medium-1);     /* 500ms */
  --effect-motion-delay-alot:    var(--effect-animation-delay-medium-3);     /* 1000ms */
  --effect-motion-delay-most:    var(--effect-animation-delay-long-1);       /* 2000ms */
  --effect-motion-delay-toomuch: var(--effect-animation-delay-long-2);       /* 4000ms */

  /* ─────────────────────────────────────────────────────────────────────────
     HAND-AUTHORED — Motion presets and transition shorthands.
     These compose duration + easing together for convenience in components.
     Not representable as Figma variables (they combine multiple primitives).
     ───────────────────────────────────────────────────────────────────────── */

  /* Motion presets — use like: transition: color var(--effect-motion-fast); */
  --effect-motion-instant: var(--effect-animation-speed-instant) var(--effect-animation-easing-cubic);
  --effect-motion-fast:    var(--effect-animation-speed-fast)    var(--effect-animation-easing-cubic);
  --effect-motion-medium:  var(--effect-animation-speed-medium)  var(--effect-animation-easing-cubic);
  --effect-motion-slow:    var(--effect-animation-speed-slow)    var(--effect-animation-easing-cubic);
  --effect-motion-slower:  var(--effect-animation-speed-slower)  var(--effect-animation-easing-cubic);
  --effect-motion-slowest: var(--effect-animation-speed-slowest) var(--effect-animation-easing-cubic);

  /* Interaction transition shorthands */
  --effect-transition-interaction-background-instant: background-color var(--effect-motion-instant);
  --effect-transition-interaction-background-fast:    background-color var(--effect-motion-fast);
  --effect-transition-interaction-background-medium:  background-color var(--effect-motion-medium);
  --effect-transition-interaction-background-slow:    background-color var(--effect-motion-slow);
  --effect-transition-interaction-background-slower:  background-color var(--effect-motion-slower);
  --effect-transition-interaction-background-slowest: background-color var(--effect-motion-slowest);

  --effect-transition-interaction-color-instant: color var(--effect-motion-instant);
  --effect-transition-interaction-color-fast:    color var(--effect-motion-fast);
  --effect-transition-interaction-color-medium:  color var(--effect-motion-medium);
  --effect-transition-interaction-color-slow:    color var(--effect-motion-slow);
  --effect-transition-interaction-color-slower:  color var(--effect-motion-slower);
  --effect-transition-interaction-color-slowest: color var(--effect-motion-slowest);

  --effect-transition-interaction-opacity-instant: opacity var(--effect-motion-instant);
  --effect-transition-interaction-opacity-fast:    opacity var(--effect-motion-fast);
  --effect-transition-interaction-opacity-medium:  opacity var(--effect-motion-medium);
  --effect-transition-interaction-opacity-slow:    opacity var(--effect-motion-slow);
  --effect-transition-interaction-opacity-slower:  opacity var(--effect-motion-slower);
  --effect-transition-interaction-opacity-slowest: opacity var(--effect-motion-slowest);

  --effect-transition-interaction-border-color-instant: border-color var(--effect-motion-instant);
  --effect-transition-interaction-border-color-fast:    border-color var(--effect-motion-fast);
  --effect-transition-interaction-border-color-medium:  border-color var(--effect-motion-medium);
  --effect-transition-interaction-border-color-slow:    border-color var(--effect-motion-slow);
  --effect-transition-interaction-border-color-slower:  border-color var(--effect-motion-slower);
  --effect-transition-interaction-border-color-slowest: border-color var(--effect-motion-slowest);

  --effect-transition-interaction-transform-instant: transform var(--effect-motion-instant);
  --effect-transition-interaction-transform-fast:    transform var(--effect-motion-fast);
  --effect-transition-interaction-transform-medium:  transform var(--effect-motion-medium);
  --effect-transition-interaction-transform-slow:    transform var(--effect-motion-slow);
  --effect-transition-interaction-transform-slower:  transform var(--effect-motion-slower);
  --effect-transition-interaction-transform-slowest: transform var(--effect-motion-slowest);

  /* ─────────────────────────────────────────────────────────────────────────
     HAND-AUTHORED — Elevation / shadow tokens.
     Multi-layer box-shadows cannot be expressed as Figma number variables.
     These must remain hand-authored permanently.
     ───────────────────────────────────────────────────────────────────────── */

  --effect-inset-depressed:
    inset 0 1px 2px -0.5px var(--color-surface-shadow),
    inset 0 2px 4px -2px var(--color-surface-shadow),
    inset 0 0 0 var(--dimension-stroke-width-006) var(--color-surface-shadow);
  --effect-inset-flat:
    inset 0 0 0 var(--dimension-stroke-width-006) var(--color-surface-highlight);
  --effect-inset-elevated:
    inset 0 -4px 2px -4px var(--color-surface-shadow),
    inset 0 4px 2px -4px var(--color-surface-highlight),
    inset 0 0 0 var(--dimension-stroke-width-006) var(--color-surface-highlight);
  --effect-inset-floating:
    inset 0 -4px 2px -4px var(--color-surface-shadow),
    inset 0 4px 2px -4px var(--color-surface-highlight),
    inset 0 0 0 var(--dimension-stroke-width-006) var(--color-surface-highlight);

  --effect-outset-depressed:
    0 -4px 2px -4px var(--color-surface-shadow),
    0 4px 2px -4px var(--color-surface-highlight),
    0 0 0 var(--dimension-stroke-width-006) var(--color-surface-highlight);
  --effect-outset-flat:
    0 0 0 var(--dimension-stroke-width-006) var(--color-surface-shadow);
  --effect-outset-elevated:
    0 1px 2px -0.5px var(--color-surface-shadow),
    0 2px 4px -2px var(--color-surface-shadow),
    0 0 0 var(--dimension-stroke-width-006) var(--color-surface-shadow);
  --effect-outset-floating:
    0 4px 8px -2px var(--color-surface-shadow),
    0 8px 16px -4px var(--color-surface-shadow),
    0 0 0 var(--dimension-stroke-width-006) var(--color-surface-shadow);

  --effect-surface-depressed: var(--effect-inset-depressed), var(--effect-outset-depressed);
  --effect-surface-flat:      var(--effect-inset-flat),      var(--effect-outset-flat);
  --effect-surface-elevated:  var(--effect-inset-elevated),  var(--effect-outset-elevated);
  --effect-surface-floating:  var(--effect-inset-floating),  var(--effect-outset-floating);

  --effect-outset-overlay: var(--effect-outset-floating);

  --effect-inset-edge-left:  inset var(--dimension-stroke-width-006) 0 0 0 var(--color-surface-highlight);
  --effect-inset-edge-right: inset calc(-1 * var(--dimension-stroke-width-006)) 0 0 0 var(--color-surface-highlight);
  --effect-outset-edge-left:  calc(-1 * var(--dimension-stroke-width-006)) 0 0 0 var(--color-surface-shadow);
  --effect-outset-edge-right: var(--dimension-stroke-width-006) 0 0 0 var(--color-surface-shadow);

  --effect-surface-overlay-left:  var(--effect-outset-overlay), var(--effect-inset-edge-left);
  --effect-surface-overlay-right: var(--effect-outset-overlay), var(--effect-inset-edge-right);

  --effect-edge-top:
    inset 0 var(--dimension-stroke-width-006) 0 0 var(--color-surface-highlight),
    0 calc(-1 * var(--dimension-stroke-width-006)) 0 0 var(--color-surface-shadow);
  --effect-edge-right:
    inset calc(-1 * var(--dimension-stroke-width-006)) 0 0 0 var(--color-surface-highlight),
    var(--dimension-stroke-width-006) 0 0 0 var(--color-surface-shadow);
  --effect-edge-bottom:
    inset 0 calc(-1 * var(--dimension-stroke-width-006)) 0 0 var(--color-surface-highlight),
    0 var(--dimension-stroke-width-006) 0 0 var(--color-surface-shadow);
  --effect-edge-left:
    inset var(--dimension-stroke-width-006) 0 0 0 var(--color-surface-highlight),
    calc(-1 * var(--dimension-stroke-width-006)) 0 0 0 var(--color-surface-shadow);

  --effect-focus-ring:
    0 0 0 var(--dimension-focus-ring-offset) transparent,
    0 0 0 calc(var(--dimension-focus-ring-offset) + var(--dimension-focus-ring-width)) var(--color-foreground-medium-brand);`;

  const output = [
    '/* AUTO-GENERATED + HAND-AUTHORED. See scripts/generate-effects-tokens.mjs */',
    '/* Generated section: from src/json/effects/effects.tokens.json            */',
    '',
    ':root {',
    ...lines,
    handAuthored,
    '}',
    '',
  ].join('\n');

  writeFileSync(OUTPUT, output, 'utf8');

  const generated = lines.filter(l => l.includes('--effect-')).length;
  console.log(`    effects: ${generated} tokens generated → src/effects.css`);
};

generate();

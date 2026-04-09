/**
 * Generate effects.css from Figma JSON source.
 *
 * Source: src/json/effects/effects.tokens.json
 * Output: src/effects.css
 *
 * What this generates (from Figma):
 *   --effect-animation-duration-*   (ms) — instant, short-1/2/3, medium-1/2/3, long-1/2/3
 *   --effect-animation-delay-*      (ms) — instant, short-1/2/3, medium-1/2/3, long-1/2/3
 *   --effect-animation-easing-*     — ease-in, ease-out, ease-in-out, ease-in-out-back
 *   --effect-blur-*                 (px) — sm, md, lg
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
     HAND-AUTHORED — Motion presets and transition shorthands.
     These compose duration + easing together for convenience in components.
     Not representable as Figma variables (they combine multiple primitives).
     ───────────────────────────────────────────────────────────────────────── */

  /* Motion presets — use like: transition: color var(--effect-motion-short-2);
     Duration names match Figma: short-1/2/3, medium-1/2/3, long-1/2/3        */
  --effect-motion-instant:  var(--effect-animation-duration-instant)  var(--effect-animation-easing-ease-in-out);
  --effect-motion-short-1:  var(--effect-animation-duration-short-1)  var(--effect-animation-easing-ease-in-out);
  --effect-motion-short-2:  var(--effect-animation-duration-short-2)  var(--effect-animation-easing-ease-in-out);
  --effect-motion-short-3:  var(--effect-animation-duration-short-3)  var(--effect-animation-easing-ease-in-out);
  --effect-motion-medium-1: var(--effect-animation-duration-medium-1) var(--effect-animation-easing-ease-in-out);
  --effect-motion-medium-2: var(--effect-animation-duration-medium-2) var(--effect-animation-easing-ease-in-out);
  --effect-motion-medium-3: var(--effect-animation-duration-medium-3) var(--effect-animation-easing-ease-in-out);
  --effect-motion-long-1:   var(--effect-animation-duration-long-1)   var(--effect-animation-easing-ease-in-out);
  --effect-motion-long-2:   var(--effect-animation-duration-long-2)   var(--effect-animation-easing-ease-in-out);
  --effect-motion-long-3:   var(--effect-animation-duration-long-3)   var(--effect-animation-easing-ease-in-out);

  /* Interaction transition shorthands — names match Figma duration scale */
  --effect-transition-interaction-background-instant:  background-color var(--effect-motion-instant);
  --effect-transition-interaction-background-short-1:  background-color var(--effect-motion-short-1);
  --effect-transition-interaction-background-short-2:  background-color var(--effect-motion-short-2);
  --effect-transition-interaction-background-short-3:  background-color var(--effect-motion-short-3);
  --effect-transition-interaction-background-medium-1: background-color var(--effect-motion-medium-1);
  --effect-transition-interaction-background-medium-2: background-color var(--effect-motion-medium-2);
  --effect-transition-interaction-background-medium-3: background-color var(--effect-motion-medium-3);
  --effect-transition-interaction-background-long-1:   background-color var(--effect-motion-long-1);
  --effect-transition-interaction-background-long-2:   background-color var(--effect-motion-long-2);
  --effect-transition-interaction-background-long-3:   background-color var(--effect-motion-long-3);

  --effect-transition-interaction-color-instant:  color var(--effect-motion-instant);
  --effect-transition-interaction-color-short-1:  color var(--effect-motion-short-1);
  --effect-transition-interaction-color-short-2:  color var(--effect-motion-short-2);
  --effect-transition-interaction-color-short-3:  color var(--effect-motion-short-3);
  --effect-transition-interaction-color-medium-1: color var(--effect-motion-medium-1);
  --effect-transition-interaction-color-medium-2: color var(--effect-motion-medium-2);
  --effect-transition-interaction-color-medium-3: color var(--effect-motion-medium-3);
  --effect-transition-interaction-color-long-1:   color var(--effect-motion-long-1);
  --effect-transition-interaction-color-long-2:   color var(--effect-motion-long-2);
  --effect-transition-interaction-color-long-3:   color var(--effect-motion-long-3);

  --effect-transition-interaction-opacity-instant:  opacity var(--effect-motion-instant);
  --effect-transition-interaction-opacity-short-1:  opacity var(--effect-motion-short-1);
  --effect-transition-interaction-opacity-short-2:  opacity var(--effect-motion-short-2);
  --effect-transition-interaction-opacity-short-3:  opacity var(--effect-motion-short-3);
  --effect-transition-interaction-opacity-medium-1: opacity var(--effect-motion-medium-1);
  --effect-transition-interaction-opacity-medium-2: opacity var(--effect-motion-medium-2);
  --effect-transition-interaction-opacity-medium-3: opacity var(--effect-motion-medium-3);
  --effect-transition-interaction-opacity-long-1:   opacity var(--effect-motion-long-1);
  --effect-transition-interaction-opacity-long-2:   opacity var(--effect-motion-long-2);
  --effect-transition-interaction-opacity-long-3:   opacity var(--effect-motion-long-3);

  --effect-transition-interaction-border-color-instant:  border-color var(--effect-motion-instant);
  --effect-transition-interaction-border-color-short-1:  border-color var(--effect-motion-short-1);
  --effect-transition-interaction-border-color-short-2:  border-color var(--effect-motion-short-2);
  --effect-transition-interaction-border-color-short-3:  border-color var(--effect-motion-short-3);
  --effect-transition-interaction-border-color-medium-1: border-color var(--effect-motion-medium-1);
  --effect-transition-interaction-border-color-medium-2: border-color var(--effect-motion-medium-2);
  --effect-transition-interaction-border-color-medium-3: border-color var(--effect-motion-medium-3);
  --effect-transition-interaction-border-color-long-1:   border-color var(--effect-motion-long-1);
  --effect-transition-interaction-border-color-long-2:   border-color var(--effect-motion-long-2);
  --effect-transition-interaction-border-color-long-3:   border-color var(--effect-motion-long-3);

  --effect-transition-interaction-transform-instant:  transform var(--effect-motion-instant);
  --effect-transition-interaction-transform-short-1:  transform var(--effect-motion-short-1);
  --effect-transition-interaction-transform-short-2:  transform var(--effect-motion-short-2);
  --effect-transition-interaction-transform-short-3:  transform var(--effect-motion-short-3);
  --effect-transition-interaction-transform-medium-1: transform var(--effect-motion-medium-1);
  --effect-transition-interaction-transform-medium-2: transform var(--effect-motion-medium-2);
  --effect-transition-interaction-transform-medium-3: transform var(--effect-motion-medium-3);
  --effect-transition-interaction-transform-long-1:   transform var(--effect-motion-long-1);
  --effect-transition-interaction-transform-long-2:   transform var(--effect-motion-long-2);
  --effect-transition-interaction-transform-long-3:   transform var(--effect-motion-long-3);

  /* ─────────────────────────────────────────────────────────────────────────
     HAND-AUTHORED — Elevation tokens. Source: Figma App Styles — Variables.
     Multi-layer box-shadows cannot be expressed as Figma number variables.

     Three tokens per elevation level:
       --effect-shadow-{name}    outset layers only  → apply via box-shadow on the main element
       --effect-highlight-{name} inset layers only   → apply via box-shadow on an ::after overlay
       --effect-elevation-{name} combined convenience → only safe when element has no overflow:clip

     The shadow/highlight split exists because inset box-shadows are clipped by overflow:hidden.
     Components that need overflow:clip (e.g. cards with rounded corners + clipped content)
     must apply shadow on the root and highlight on a full-size ::after positioned inside.
     ───────────────────────────────────────────────────────────────────────── */

  /* ── elevated-none ─────────────────────────────────────────────────────── */
  --effect-shadow-elevated-none:    none;
  --effect-highlight-elevated-none: none;
  --effect-elevation-elevated-none: none;

  /* ── elevated-sm ───────────────────────────────────────────────────────── */
  --effect-shadow-elevated-sm:
    0px 2px 4px -2px var(--color-surface-shadow),
    0px 0px 0px 1px  var(--color-surface-shadow);
  --effect-highlight-elevated-sm:
    inset 0px 4px 2px -4px var(--color-surface-highlight),
    inset 0px 0px 0px 1px  var(--color-surface-highlight);
  --effect-elevation-elevated-sm:
    var(--effect-shadow-elevated-sm),
    var(--effect-highlight-elevated-sm);

  /* ── elevated-md ───────────────────────────────────────────────────────── */
  --effect-shadow-elevated-md:
    0px 4px 8px -2px var(--color-surface-shadow),
    0px 0px 0px 1px  var(--color-surface-shadow);
  --effect-highlight-elevated-md:
    inset 0px 4px 2px -4px var(--color-surface-highlight),
    inset 0px 0px 0px 1px  var(--color-surface-highlight);
  --effect-elevation-elevated-md:
    var(--effect-shadow-elevated-md),
    var(--effect-highlight-elevated-md);

  /* ── elevated-floating ─────────────────────────────────────────────────── */
  --effect-shadow-elevated-floating:
    0px 8px 16px -4px var(--color-surface-shadow),
    0px 0px 0px 1px   var(--color-surface-shadow);
  --effect-highlight-elevated-floating:
    inset 0px 4px 2px -4px var(--color-surface-highlight),
    inset 0px 0px 0px 1px  var(--color-surface-highlight);
  --effect-elevation-elevated-floating:
    var(--effect-shadow-elevated-floating),
    var(--effect-highlight-elevated-floating);

  /* ── depressed-sm ──────────────────────────────────────────────────────── */
  /* Note: outset contains both shadow (top) and highlight (bottom rim) for depressed */
  --effect-shadow-depressed-sm:
    0px -4px 2px -4px var(--color-surface-shadow),
    0px  4px 2px -4px var(--color-surface-highlight),
    0px  0px 0px  1px var(--color-surface-highlight);
  --effect-highlight-depressed-sm:
    inset 0px 2px 4px -2px var(--color-surface-shadow),
    inset 0px 0px 0px 1px  var(--color-surface-shadow);
  --effect-elevation-depressed-sm:
    var(--effect-shadow-depressed-sm),
    var(--effect-highlight-depressed-sm);

  /* ── depressed-md ──────────────────────────────────────────────────────── */
  --effect-shadow-depressed-md:
    0px -4px 2px -4px var(--color-surface-shadow),
    0px  4px 2px -4px var(--color-surface-highlight),
    0px  0px 0px  1px var(--color-surface-highlight);
  --effect-highlight-depressed-md:
    inset 0px 4px 8px -4px var(--color-surface-shadow),
    inset 0px 0px 0px 1px  var(--color-surface-shadow);
  --effect-elevation-depressed-md:
    var(--effect-shadow-depressed-md),
    var(--effect-highlight-depressed-md);

  /* ── elevated-panel-top (shadow casts downward, attaches to bottom of viewport) ── */
  --effect-shadow-elevated-panel-top:
    0px 4px 8px 0px var(--color-surface-shadow),
    0px 0px 0px 1px var(--color-surface-shadow);
  --effect-highlight-elevated-panel-top:
    inset 0px -4px 2px -4px var(--color-surface-highlight),
    inset 0px -1px 0px 0px  var(--color-surface-highlight);
  --effect-elevation-elevated-panel-top:
    var(--effect-shadow-elevated-panel-top),
    var(--effect-highlight-elevated-panel-top);

  /* ── elevated-panel-right (shadow casts leftward, panel attached to right edge) ── */
  --effect-shadow-elevated-panel-right:
    -4px 0px 8px -2px var(--color-surface-shadow),
    0px  0px 0px  1px var(--color-surface-shadow);
  --effect-highlight-elevated-panel-right:
    inset 4px 0px 2px -4px var(--color-surface-highlight),
    inset 1px 0px 0px 0px  var(--color-surface-highlight);
  --effect-elevation-elevated-panel-right:
    var(--effect-shadow-elevated-panel-right),
    var(--effect-highlight-elevated-panel-right);

  /* ── elevated-panel-bottom (shadow casts upward, attaches to top of viewport) ── */
  --effect-shadow-elevated-panel-bottom:
    0px -4px 8px 0px var(--color-surface-shadow),
    0px  0px 0px 1px var(--color-surface-shadow);
  --effect-highlight-elevated-panel-bottom:
    inset 0px 4px 2px -4px var(--color-surface-highlight),
    inset 0px 1px 0px 0px  var(--color-surface-highlight);
  --effect-elevation-elevated-panel-bottom:
    var(--effect-shadow-elevated-panel-bottom),
    var(--effect-highlight-elevated-panel-bottom);

  /* ── elevated-panel-left (shadow casts rightward, panel attached to left edge) ── */
  --effect-shadow-elevated-panel-left:
    4px 0px 8px -2px var(--color-surface-shadow),
    0px 0px 0px  1px var(--color-surface-shadow);
  --effect-highlight-elevated-panel-left:
    inset -4px 0px 2px -4px var(--color-surface-highlight),
    inset -1px 0px 0px 0px  var(--color-surface-highlight);
  --effect-elevation-elevated-panel-left:
    var(--effect-shadow-elevated-panel-left),
    var(--effect-highlight-elevated-panel-left);

  /* ── focus ring ────────────────────────────────────────────────────────── */
  --effect-focus-ring:
    0 0 0 var(--dimension-space-025) transparent,
    0 0 0 calc(var(--dimension-space-025) + var(--dimension-stroke-width-025)) var(--color-foreground-medium-brand);`;

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

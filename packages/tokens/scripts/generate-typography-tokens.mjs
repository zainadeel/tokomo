/**
 * Generate typography.css from Figma JSON source.
 *
 * Source: src/json/typography/typography.tokens.json
 * Output: src/typography.css
 *
 * What this generates (from Figma):
 *   --typography-weight-*           (font weights, unitless numbers)
 *   --typography-fontsize-*         (px)
 *   --typography-lineheight-*       (px)
 *   --typography-letterspacing-*    (px, float-noise rounded to 2dp)
 *   --typography-paragraphspacing-* (px)
 *
 * What stays HAND-AUTHORED:
 *   Text style classes (.text-display-medium, .text-body-large, etc.)
 *   These are composite styles that combine multiple tokens — they live in CSS,
 *   not in Figma variables. They must be maintained manually.
 *
 * ⚠ DISCREPANCIES to resolve in Figma:
 *   line-height-2xl: Figma=48px, current CSS=44px  → update CSS or update Figma
 *   line-height-3xl: Figma=64px, current CSS=56px  → update CSS or update Figma
 */

import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PKG_ROOT = path.resolve(__dirname, '..');

const SOURCE = path.join(PKG_ROOT, 'src/json/typography/typography.tokens.json');
const OUTPUT  = path.join(PKG_ROOT, 'src/typography.css');

const roundTo2dp = value => Math.round(value * 100) / 100;

const generate = () => {
  const json = JSON.parse(readFileSync(SOURCE, 'utf8'));
  const lines = [];

  // ── font weight (unitless number) ─────────────────────────────────────────
  lines.push('  /* Font weights */');
  for (const [key, token] of Object.entries(json.weight)) {
    lines.push(`  --typography-weight-${key}: ${token.$value};`);
  }
  lines.push('');

  // ── font size ─────────────────────────────────────────────────────────────
  lines.push('  /* Font sizes */');
  for (const [key, token] of Object.entries(json['font-size'])) {
    lines.push(`  --typography-fontsize-${key}: ${roundTo2dp(token.$value)}px;`);
  }
  lines.push('');

  // ── line height ───────────────────────────────────────────────────────────
  lines.push('  /* Line heights */');
  for (const [key, token] of Object.entries(json['line-height'])) {
    lines.push(`  --typography-lineheight-${key}: ${roundTo2dp(token.$value)}px;`);
  }
  lines.push('');

  // ── letter spacing (has float noise from Figma) ───────────────────────────
  lines.push('  /* Letter spacing */');
  for (const [key, token] of Object.entries(json['letter-spacing'])) {
    const value = roundTo2dp(token.$value);
    lines.push(`  --typography-letterspacing-${key}: ${value}px;`);
  }
  lines.push('');

  // ── paragraph spacing ─────────────────────────────────────────────────────
  lines.push('  /* Paragraph spacing */');
  for (const [key, token] of Object.entries(json['paragraph-spacing'])) {
    lines.push(`  --typography-paragraphspacing-${key}: ${roundTo2dp(token.$value)}px;`);
  }

  // ── hand-authored: text style classes ─────────────────────────────────────
  const textStyles = `
/* ─────────────────────────────────────────────────────────────────────────────
   HAND-AUTHORED — Text style classes.
   These compose multiple typography tokens into reusable CSS classes.
   They cannot be expressed as Figma variables (they are text styles, not variables).
   Maintain these manually when token values change.
   ───────────────────────────────────────────────────────────────────────────── */

.text-display-medium {
  font-family: 'Inter', sans-serif;
  font-size: var(--typography-fontsize-3xl);
  line-height: var(--typography-lineheight-3xl);
  font-weight: var(--typography-weight-bold);
  letter-spacing: var(--typography-letterspacing-negative-double);
}

.text-display-small {
  font-family: 'Inter', sans-serif;
  font-size: var(--typography-fontsize-2xl);
  line-height: var(--typography-lineheight-2xl);
  font-weight: var(--typography-weight-bold);
  letter-spacing: var(--typography-letterspacing-negative-double);
}

.text-title-large {
  font-family: 'Inter', sans-serif;
  font-size: var(--typography-fontsize-xl);
  line-height: var(--typography-lineheight-xl);
  font-weight: var(--typography-weight-semibold);
  letter-spacing: var(--typography-letterspacing-negative-double);
}

.text-title-medium {
  font-family: 'Inter', sans-serif;
  font-size: var(--typography-fontsize-lg);
  line-height: var(--typography-lineheight-lg);
  font-weight: var(--typography-weight-semibold);
  letter-spacing: var(--typography-letterspacing-negative);
}

.text-title-small {
  font-family: 'Inter', sans-serif;
  font-size: var(--typography-fontsize-md);
  line-height: var(--typography-lineheight-md);
  font-weight: var(--typography-weight-semibold);
  letter-spacing: var(--typography-letterspacing-negative);
}

.text-body-large {
  font-family: 'Inter', sans-serif;
  font-size: var(--typography-fontsize-lg);
  line-height: var(--typography-lineheight-lg);
  font-weight: var(--typography-weight-regular);
  letter-spacing: var(--typography-letterspacing-negative-half);
}

.text-body-large-emphasis {
  font-family: 'Inter', sans-serif;
  font-size: var(--typography-fontsize-lg);
  line-height: var(--typography-lineheight-lg);
  font-weight: var(--typography-weight-medium);
  letter-spacing: var(--typography-letterspacing-negative);
}

.text-body-medium {
  font-family: 'Inter', sans-serif;
  font-size: var(--typography-fontsize-md);
  line-height: var(--typography-lineheight-md);
  font-weight: var(--typography-weight-regular);
  letter-spacing: var(--typography-letterspacing-negative-half);
}

.text-body-medium-emphasis {
  font-family: 'Inter', sans-serif;
  font-size: var(--typography-fontsize-md);
  line-height: var(--typography-lineheight-md);
  font-weight: var(--typography-weight-medium);
  letter-spacing: var(--typography-letterspacing-negative);
}

.text-body-small {
  font-family: 'Inter', sans-serif;
  font-size: var(--typography-fontsize-sm);
  line-height: var(--typography-lineheight-sm);
  font-weight: var(--typography-weight-regular);
  letter-spacing: var(--typography-letterspacing-none);
}

.text-body-small-emphasis {
  font-family: 'Inter', sans-serif;
  font-size: var(--typography-fontsize-sm);
  line-height: var(--typography-lineheight-sm);
  font-weight: var(--typography-weight-medium);
  letter-spacing: var(--typography-letterspacing-negative-half);
}

.text-caption {
  font-family: 'Inter', sans-serif;
  font-size: var(--typography-fontsize-xs);
  line-height: var(--typography-lineheight-xs);
  font-weight: var(--typography-weight-medium);
  text-transform: uppercase;
  letter-spacing: var(--typography-letterspacing-positive);
}

.text-caption-emphasis {
  font-family: 'Inter', sans-serif;
  font-size: var(--typography-fontsize-xs);
  line-height: var(--typography-lineheight-xs);
  font-weight: var(--typography-weight-semibold);
  text-transform: uppercase;
  letter-spacing: var(--typography-letterspacing-positive);
}`;

  const output = [
    '/* AUTO-GENERATED + HAND-AUTHORED. See scripts/generate-typography-tokens.mjs */',
    '/* Generated section: from src/json/typography/typography.tokens.json         */',
    '',
    ':root {',
    ...lines,
    '}',
    '',
    textStyles,
    '',
  ].join('\n');

  writeFileSync(OUTPUT, output, 'utf8');

  const generated = lines.filter(l => l.includes('--typography-')).length;
  console.log(`    typography: ${generated} tokens generated → src/typography.css`);
};

generate();

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
 *   --typography-font-family        (not a Figma variable in this export)
 *
 * What this deliberately does NOT generate: text style classes.
 * Composite text styles (display/title/body/caption × regular/emphasis) are
 * owned by `@ds-mo/ui` and implemented by the `ds-text` component. TokoMo ships
 * the primitives and documents the recipes; it does not ship a competing set of
 * `.text-*` utility classes. See docs/guidelines/typography-usage.md.
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

  // ── hand-authored: font family ─────────────────────────────────────────────
  const fontFamily = `
  /* ─────────────────────────────────────────────────────────────────────────
     HAND-AUTHORED — Font family.
     Not exported as a Figma variable in this collection. Override here to
     swap the entire typeface across every consumer.
     ───────────────────────────────────────────────────────────────────────── */
  --typography-font-family: 'Inter', sans-serif;
}`;

  // The hand-authored block adds the font-family inside :root {} and closes it.
  const output = [
    '/* AUTO-GENERATED + HAND-AUTHORED. See scripts/generate-typography-tokens.mjs */',
    '/* Generated section: from src/json/typography/typography.tokens.json         */',
    '',
    ':root {',
    ...lines,
    fontFamily,
    '',
  ].join('\n');

  writeFileSync(OUTPUT, output, 'utf8');

  const generated = lines.filter(l => l.includes('--typography-')).length;
  console.log(`    typography: ${generated} tokens generated → src/typography.css`);
};

generate();

/**
 * Generate typography.css from Figma JSON source.
 *
 * Source: src/json/typography/typography.tokens.json
 * Output: src/typography.css
 *
 * What this generates (from Figma):
 *   --typography-font-family        ('ui' family, quoted + generic fallback)
 *   --typography-font-family-code   ('code' family, quoted + generic fallback)
 *   --typography-weight-*           (font weights, unitless numbers)
 *   --typography-fontsize-*         (px)
 *   --typography-lineheight-*       (px)
 *   --typography-letterspacing-*    (px, float-noise rounded to 2dp)
 *   --typography-paragraphspacing-* (px)
 *
 * What this deliberately does NOT generate: text style classes.
 * Composite text styles (display/title/body/caption × regular/emphasis) are
 * defined as framework-neutral recipes in src/agent/token-families.agent.json.
 * TokoMo ships the primitives and documents the combinations, but does not ship
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

const titleCase = value => value.replace(/\b\w/g, char => char.toUpperCase());

// Figma stores the bare typeface name (e.g. "fira code"); the generic
// fallback and CSS custom property suffix aren't Figma variables, so they're
// mapped by family key here.
const FONT_FAMILY_META = {
  ui: { cssName: '--typography-font-family', fallback: 'sans-serif' },
  code: { cssName: '--typography-font-family-code', fallback: 'monospace' },
};

const generate = () => {
  const json = JSON.parse(readFileSync(SOURCE, 'utf8'));
  const lines = [];

  // ── font family ───────────────────────────────────────────────────────────
  lines.push('  /* Font families */');
  for (const [key, token] of Object.entries(json['font-family'])) {
    const meta = FONT_FAMILY_META[key];
    if (!meta) throw new Error(`generate-typography-tokens: no CSS mapping for font-family.${key}`);
    lines.push(`  ${meta.cssName}: '${titleCase(token.$value)}', ${meta.fallback};`);
  }
  lines.push('');

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

  const output = [
    '/* AUTO-GENERATED. See scripts/generate-typography-tokens.mjs */',
    '/* Source: src/json/typography/typography.tokens.json          */',
    '',
    ':root {',
    ...lines,
    '}',
    '',
  ].join('\n');

  writeFileSync(OUTPUT, output, 'utf8');

  const generated = lines.filter(l => l.includes('--typography-')).length;
  console.log(`    typography: ${generated} tokens generated → src/typography.css`);
};

generate();

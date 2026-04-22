/**
 * build-docs.mjs
 *
 * Generates a fully self-contained docs/index.html by:
 *   1. Reading scripts/docs-template.html
 *   2. Inlining all token CSS (colors, dimensions, typography, effects)
 *   3. Parsing token data from dist/ CSS files
 *   4. Writing docs/index.html — no external assets needed
 *
 * Run after `npm run build`:
 *   npm run build && npm run build:docs
 */

import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const root = join(__dirname, '..');
const distDir = join(root, 'dist');
const docsDir = join(root, 'docs');

mkdirSync(docsDir, { recursive: true });

// ── Read dist CSS files ─────────────────────────────────────────────────────

const colorsCss    = readFileSync(join(distDir, 'colors.css'),     'utf8');
const dimensionsCss = readFileSync(join(distDir, 'dimensions.css'), 'utf8');
const typographyCss = readFileSync(join(distDir, 'typography.css'), 'utf8');
const effectsCss    = readFileSync(join(distDir, 'effects.css'),    'utf8');

// ── Inline token CSS (for live CSS variable resolution in browser) ──────────

const TOKEN_CSS = [colorsCss, dimensionsCss, typographyCss, effectsCss].join('\n\n');

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Extract all CSS custom property declarations from the :root section of a
 * CSS file (stops before any data-theme override blocks).
 */
function parseVars(css) {
  const lightSection = css.split(':root[data-theme')[0];
  const result = [];
  for (const [, name, value] of lightSection.matchAll(/^\s*(--[\w-]+)\s*:\s*(.+?)\s*;/gm)) {
    result.push({ name, value: value.trim() });
  }
  return result;
}

/**
 * Evaluate a dimension CSS value to a pixel number.
 * All dimension tokens use calc() relative to an 8px base.
 */
function toPx(value) {
  if (!value || value === '0') return 0;
  if (value === '9999px') return 9999;
  if (/^[\d.]+%$/.test(value)) return null;   // e.g. 100%

  // Direct px value (e.g. "8px", "400px")
  const pxMatch = value.match(/^([\d.]+)px$/);
  if (pxMatch) return parseFloat(pxMatch[1]);

  // Unitless (z-index, scale)
  const numMatch = value.match(/^([\d.]+)$/);
  if (numMatch) return parseFloat(numMatch[1]);

  // var(--dimension-*-base) → 8
  if (/^var\(--dimension-[a-z-]+-base\)$/.test(value)) return 8;

  // calc(...) — replace the base variable references then evaluate the arithmetic
  const calcBody = value.match(/^calc\((.+)\)$/)?.[1];
  if (!calcBody) return null;

  const expr = calcBody.replace(/var\(--dimension-[a-z-]+-base\)/g, '8');
  // Only allow safe characters before evaluating
  if (!/^[\d.\s*/+\-()]+$/.test(expr)) return null;
  try {
    // eslint-disable-next-line no-new-func
    const result = Function('"use strict"; return (' + expr + ')')();
    return Math.round(result * 100) / 100;
  } catch {
    return null;
  }
}

// ── Color tokens ─────────────────────────────────────────────────────────────

function getColorGroup(name) {
  if (name.startsWith('--color-reference-')) return 'reference';
  if (name.startsWith('--color-data-'))      return 'data';
  return 'semantic';
}

/**
 * Derive a category key for a color token — used to insert group headers
 * in the color grid (e.g. "Reference Blue", "Background Bold", "Data Sequence Blue").
 *
 * Reference / data: strip trailing scale descriptors ("-100", "-l27", "-c05",
 *   "-faint"/"-medium"/"-bold"/"-strong", and "-dark"/"-light" when trailing in
 *   grey scale tokens) so all shades of the same family land in one category.
 *   For colored families, also strip the "dark"/"light" family prefix so
 *   dark-blue and light-blue share the "reference-blue" category.
 * Semantic: strip the final segment (the per-intent qualifier like "-ai",
 *   "-brand", "-primary") so related variants group together.
 */
function getColorCategory(name) {
  // Divider tokens don't carry intent (primary/secondary/etc.) — they only vary
  // by the background context they sit on. Collapse all five variants
  // (divider, on-bold, on-medium, on-strong, on-translucent) under one header.
  if (name.startsWith('--color-divider-')) return 'divider';

  // Driver-status background qualifiers are multi-word (off-duty, on-duty,
  // personal-conveyance, yard-move), which the generic trailing-segment strip
  // can't collapse on its own. Bucket them explicitly.
  if (name.startsWith('--color-driver-status-background-')) return 'driver-status-background';

  // Data tokens: explicit buckets so all variants of a palette share one header.
  //   category-N          → "data-category"
  //   diverging-X-Y-S-N   → "data-diverging-X-Y"   (step count S rendered as a sub-row)
  //   sequence-X-S-N      → "data-sequence-X"      (step count S rendered as a sub-row)
  //   win-loss-*          → "data-win-loss"
  //   misc-N              → "data-misc"
  if (name.startsWith('--color-data-')) {
    const rest = name.slice('--color-data-'.length);
    if (rest.startsWith('category-'))  return 'data-category';
    if (rest.startsWith('diverging-')) return rest.replace(/-\d+-\d+$/, '').replace(/^/, 'data-');
    if (rest.startsWith('sequence-'))  return rest.replace(/-\d+-\d+$/, '').replace(/^/, 'data-');
    if (rest.startsWith('win-loss-'))  return 'data-win-loss';
    if (rest.startsWith('misc-'))      return 'data-misc';
  }

  const parts = name.replace(/^--color-/, '').split('-');
  const scalePattern = /^(\d+|l\d+|c\d+|faint|medium|bold|strong|dark|light)$/;
  while (parts.length > 2 && scalePattern.test(parts[parts.length - 1])) {
    parts.pop();
  }
  if (parts[0] === 'reference' && (parts[1] === 'dark' || parts[1] === 'light')) {
    parts.splice(1, 1); // merge dark-X and light-X under the same hue
  }
  const top = parts[0];
  if (top !== 'reference' && parts.length > 1) {
    parts.pop(); // strip semantic qualifier
  }
  return parts.join('-');
}

/**
 * For data-diverging / data-sequence tokens: the first numeric segment is a
 * step count (5/7/9 for diverging; 2/3/4 for sequence). Returned as a string
 * so the render step can detect sub-row changes and insert a line break.
 */
function getDataSubgroup(name) {
  const m = name.match(/^--color-data-(?:diverging-[a-z-]+?|sequence-[a-z-]+?)-(\d+)-\d+$/);
  return m ? m[1] : null;
}

/**
 * 'dark' / 'light' / null — used to split a hue family onto separate rows
 * (dark row above light row).
 */
function getColorShade(name) {
  const parts = name.replace(/^--color-/, '').split('-');
  if (parts[0] !== 'reference') return null;
  if (parts[1] === 'dark' || parts[1] === 'light') return parts[1];
  return null;
}

/**
 * Numeric sort key so reference colors order as: black → white → grey → colors
 * (descending by OKLCH hue — blue 250 before cyan 215, matching the user's
 * "Blue to Cyan from a hue value standpoint" direction).
 */
function getColorHueKey(name) {
  if (name.startsWith('--color-reference-black')) return -1000;
  if (name.startsWith('--color-reference-white')) return -900;
  if (name.startsWith('--color-reference-grey'))  return -800;
  const m = name.match(/^--color-reference-(?:dark|light)-[a-z]+-(\d{2,3})-/);
  if (m) return -parseInt(m[1], 10); // negative → descending
  return Infinity;
}

/**
 * Within a hue family: dark row first, then light row.
 */
function getShadeOrder(name) {
  if (/^--color-reference-dark-/.test(name))  return 0;
  if (/^--color-reference-light-/.test(name)) return 1;
  return 0;
}

/**
 * Within a single shade row: faint → medium → bold → strong (low-to-high intensity).
 * For plain greys, fall back to the lightness (l##) number so they march in order.
 */
function getVariantOrder(name) {
  // Greys: sort the whole family by lightness (l##) — the faint/medium/bold/
  // strong labels aren't a clean ramp by themselves, so collapse them into
  // one continuous lightness order instead.
  if (/^--color-reference-grey/.test(name)) {
    const m = name.match(/-l(\d+)/);
    return m ? parseInt(m[1], 10) : 0;
  }
  if (/-faint$/.test(name))  return 0;
  if (/-medium$/.test(name)) return 1;
  if (/-bold$/.test(name))   return 2;
  if (/-strong$/.test(name)) return 3;
  const m = name.match(/-l(\d+)/);
  return m ? 100 + parseInt(m[1], 10) : 999;
}

/**
 * Black and white tokens are named by alpha percentage (black-0, black-5, …,
 * black-100). Pull that number out for numeric sort so 100 lands at the end
 * rather than between 10 and 15.
 */
function getAlphaPercent(name) {
  const m = name.match(/^--color-reference-(?:black|white)-(\d+)$/);
  return m ? parseInt(m[1], 10) : 0;
}

const rawColors = parseVars(colorsCss).map(({ name }) => ({
  name,
  group: getColorGroup(name),
  category: getColorCategory(name),
  shade: getColorShade(name),
  subgroup: getDataSubgroup(name),
  label: name.slice(2), // strip '--'
  _hue: getColorHueKey(name),
  _shade: getShadeOrder(name),
  _variant: getVariantOrder(name),
  _alpha: getAlphaPercent(name),
}));

// Reorder reference tokens by hue / alpha / shade / variant.
const referenceTokens = rawColors
  .filter(t => t.group === 'reference')
  .sort((a, b) =>
    (a._hue - b._hue)
    || (a._alpha - b._alpha)
    || (a._shade - b._shade)
    || (a._variant - b._variant)
  );
// Semantic: keep the source order of first-appearance, but pull every token of
// the same category together — otherwise interleaved CSS (e.g. `interaction-focus`,
// `interaction-on-bold-background-focus`, `interaction-pressed`) renders as two
// separate "Interaction" sections.
const semanticCategoryFirstSeen = new Map();
rawColors.forEach((t, i) => {
  if (t.group === 'semantic' && !semanticCategoryFirstSeen.has(t.category)) {
    semanticCategoryFirstSeen.set(t.category, i);
  }
});
// Intensity tiers (strong/bold/medium/faint) render contiguously in
// strong → bold → medium → faint order, anchored at the earliest-seen sibling.
// Without this override, `*-strong` drifts to the end of the semantic section
// because its CSS var names sort after `*-on-*` and `*-primary/secondary/…`.
for (const prefix of ['foreground', 'background']) {
  const order = [`${prefix}-strong`, `${prefix}-bold`, `${prefix}-medium`, `${prefix}-faint`];
  const anchor = Math.min(
    ...order.map(cat => semanticCategoryFirstSeen.get(cat)).filter(v => v != null)
  );
  if (Number.isFinite(anchor)) {
    order.forEach((cat, i) => {
      if (semanticCategoryFirstSeen.has(cat)) {
        semanticCategoryFirstSeen.set(cat, anchor + i * 0.001);
      }
    });
  }
}
// Within a category, sort primary → secondary → tertiary → quaternary first,
// then fall back to source order for everything else (focus/hover/pressed,
// intent qualifiers like -ai/-brand/-negative, etc.).
const RANK_QUALIFIERS = { primary: 0, secondary: 1, tertiary: 2, quaternary: 3 };
function semanticRankWithinCategory(name) {
  const last = name.split('-').pop();
  return RANK_QUALIFIERS[last] ?? 99;
}
const semanticTokens = rawColors
  .map((t, i) => ({ t, i }))
  .filter(({ t }) => t.group === 'semantic')
  .sort((a, b) =>
    (semanticCategoryFirstSeen.get(a.t.category) - semanticCategoryFirstSeen.get(b.t.category))
    || (semanticRankWithinCategory(a.t.name) - semanticRankWithinCategory(b.t.name))
    || (a.i - b.i)
  )
  .map(({ t }) => t);

// Data order: Category → Diverging → Sequence → Win Loss → Misc.
// Within Diverging/Sequence, sort by step count (5 before 7 before 9, etc.)
// then by token index — so a line break can be inserted between step-count
// sub-rows in the render step.
const DATA_CATEGORY_ORDER = [
  'data-category',
  'data-diverging-blue-orange', // extend here if new diverging palettes are added
  'data-sequence-blue',
  'data-win-loss',
  'data-misc',
];
function dataCategoryRank(cat) {
  const i = DATA_CATEGORY_ORDER.indexOf(cat);
  return i === -1 ? 999 : i;
}
function dataTokenIndex(name) {
  const m = name.match(/-(\d+)$/);
  return m ? parseInt(m[1], 10) : 0;
}
const dataTokens = rawColors
  .filter(t => t.group === 'data')
  .sort((a, b) =>
    (dataCategoryRank(a.category) - dataCategoryRank(b.category))
    || ((a.subgroup ? parseInt(a.subgroup, 10) : 0) - (b.subgroup ? parseInt(b.subgroup, 10) : 0))
    || (dataTokenIndex(a.name) - dataTokenIndex(b.name))
  );

const colors = [...referenceTokens, ...semanticTokens, ...dataTokens]
  .map(({ _hue, _shade, _variant, _alpha, ...rest }) => rest); // drop sort-only fields

console.log(`  ✓ colors        (${colors.length} tokens)`);

// ── Dimension tokens ─────────────────────────────────────────────────────────

const DIM_GROUPS = [
  ['--dimension-space-',              'space'],
  ['--dimension-radius-',             'radius'],
  ['--dimension-stroke-width-',       'stroke'],
  ['--dimension-size-',               'size'],
  ['--dimension-iconography-',        'iconography'],
  ['--dimension-card-width-',         'layout'],
  ['--dimension-modal-width-',        'layout'],
  ['--dimension-form-width-',         'layout'],
  ['--dimension-table-column-width-', 'layout'],
  ['--dimension-menu-width-',         'layout'],
  ['--dimension-tooltip-width-',      'layout'],
  ['--dimension-panel-width-',        'layout'],
  ['--dimension-offset-',             'offset'],
  ['--dimension-scale-',              'scale'],
  ['--dimension-z-index-',            'z-index'],
];

function getDimGroup(name) {
  for (const [prefix, group] of DIM_GROUPS) {
    if (name.startsWith(prefix)) return group;
  }
  return 'other';
}

// Ordinal rank for t-shirt-size qualifiers so layout tokens sort xs → fill.
const SIZE_RANK = { xs: 0, sm: 1, md: 2, lg: 3, xl: 4, '2xl': 5, '3xl': 6, fill: 99 };
function getSizeRank(name) {
  const last = name.split('-').pop();
  return SIZE_RANK[last] ?? 50;
}
// "card" in "--dimension-card-width-sm" etc. — used to keep subtypes together
// (all card widths, then form, then menu, …) while preserving source-file
// order of the first subtype occurrence.
function getLayoutSubtype(name) {
  const m = name.match(/^--dimension-([a-z-]+?)-width-/);
  return m ? m[1] : '';
}

const dimensionsRaw = parseVars(dimensionsCss)
  .filter(({ name }) => name !== '--dimension-base' && !name.endsWith('-base'))
  .map(({ name, value }, i) => ({
    name,
    group: getDimGroup(name),
    label: name.slice(2),
    value,
    px: toPx(value),
    _i: i,
  }));

// First-seen index of each layout subtype — preserves the source-file order
// (card, modal, form, table-column, menu, tooltip, panel) rather than sorting
// alphabetically.
const layoutSubtypeFirstSeen = new Map();
for (const t of dimensionsRaw) {
  if (t.group !== 'layout') continue;
  const sub = getLayoutSubtype(t.name);
  if (!layoutSubtypeFirstSeen.has(sub)) layoutSubtypeFirstSeen.set(sub, t._i);
}

const dimensions = dimensionsRaw
  .sort((a, b) => {
    if (a.group !== b.group) return 0;
    // Layout: group by subtype (card/form/menu/…) then by t-shirt size.
    if (a.group === 'layout') {
      const sa = getLayoutSubtype(a.name);
      const sb = getLayoutSubtype(b.name);
      return (
        (layoutSubtypeFirstSeen.get(sa) - layoutSubtypeFirstSeen.get(sb))
        || (getSizeRank(a.name) - getSizeRank(b.name))
      );
    }
    // Iconography uses xs/sm/md/lg/xl/2xl/3xl — sort by that scale.
    if (a.group === 'iconography') return getSizeRank(a.name) - getSizeRank(b.name);
    // Everything else: numeric px. Nulls (percents etc.) to the end.
    const ap = a.px == null ? Number.POSITIVE_INFINITY : a.px;
    const bp = b.px == null ? Number.POSITIVE_INFINITY : b.px;
    return ap - bp;
  })
  .map(({ _i, ...rest }) => rest);

console.log(`  ✓ dimensions    (${dimensions.length} tokens)`);

// ── Typography tokens ─────────────────────────────────────────────────────────

const TYPO_GROUPS = [
  ['--typography-weight-',           'weight'],
  ['--typography-fontsize-',         'fontsize'],
  ['--typography-lineheight-',       'lineheight'],
  ['--typography-letterspacing-',    'letterspacing'],
  ['--typography-paragraphspacing-', 'paragraphspacing'],
];

function getTypoGroup(name) {
  for (const [prefix, group] of TYPO_GROUPS) {
    if (name.startsWith(prefix)) return group;
  }
  return 'other';
}

const typography = parseVars(typographyCss).map(({ name, value }) => ({
  name,
  group: getTypoGroup(name),
  label: name.slice(2),
  value,
  numeric: parseFloat(value) || null,
}));

// Append hand-authored text style classes (parsed from the CSS)
const textStyleClasses = [
  ...typographyCss.matchAll(/^\.(text-[\w-]+)\s*\{/gm),
].map(([, cls]) => cls);

for (const cls of textStyleClasses) {
  typography.push({
    name: '.' + cls,
    group: 'textstyle',
    label: cls,
    value: null,
    numeric: null,
  });
}

console.log(`  ✓ typography    (${typography.length} tokens)`);

// ── Effects tokens ────────────────────────────────────────────────────────────

const FX_GROUPS = [
  ['--effect-blur-',                          'blur'],
  ['--effect-animation-duration-',            'duration'],
  ['--effect-animation-delay-',               'delay'],
  ['--effect-animation-easing-',              'easing'],
  ['--effect-motion-',                        'motion'],
  ['--effect-transition-interaction-',        'transition'],
  ['--effect-shadow-',                        'elevation'],
  ['--effect-highlight-',                     'elevation'],
  ['--effect-elevation-',                     'elevation'],
  ['--effect-focus-ring',                     'elevation'],
];

function getFxGroup(name) {
  for (const [prefix, group] of FX_GROUPS) {
    if (name.startsWith(prefix)) return group;
  }
  return 'other';
}

const effects = parseVars(effectsCss).map(({ name, value }) => ({
  name,
  group: getFxGroup(name),
  label: name.slice(2),
  value,
  numeric: parseFloat(value) || null,
}));

console.log(`  ✓ effects       (${effects.length} tokens)`);

// ── Build token data ──────────────────────────────────────────────────────────

const total = colors.length + dimensions.length + typography.length + effects.length;
console.log(`  ✓ total         (${total} tokens)\n`);

const TOKEN_DATA_JS =
  `const TOKEN_DATA = ${JSON.stringify({ colors, dimensions, typography, effects })};`;

// ── Generate HTML ─────────────────────────────────────────────────────────────

let html = readFileSync(join(__dirname, 'docs-template.html'), 'utf8');
html = html.replace('/* @@TOKEN_CSS@@ */',  TOKEN_CSS);
html = html.replace('/* @@TOKEN_DATA@@ */', TOKEN_DATA_JS);

writeFileSync(join(docsDir, 'index.html'), html);

const kbSize = Math.round(Buffer.byteLength(html, 'utf8') / 1024);
console.log(`  ✓ docs/index.html  (${kbSize}KB, self-contained)\n\nDocs ready → docs/index.html`);

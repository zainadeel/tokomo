/**
 * Generates machine-readable JSON token files from the CSS source files.
 *
 * Output:
 *   dist/tokens.json              — all tokens in one file (flat, keyed by CSS var name)
 *   dist/json/colors.json         — color tokens only
 *   dist/json/dimensions.json     — dimension tokens only
 *   dist/json/typography.json     — typography tokens only
 *   dist/json/effects.json        — effect tokens only
 *   dist/tokens-index.json        — all tokens grouped by semantic subcategory
 *
 * Format (W3C Design Tokens Community Group compatible):
 *   { "token-name": { "$type": "color|dimension|...", "$value": "..." } }
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PKG_ROOT = path.resolve(__dirname, '..');
const SRC_DIR = path.join(PKG_ROOT, 'src');
const DIST_DIR = path.join(PKG_ROOT, 'dist');

/**
 * Parse CSS custom properties from a CSS file.
 * Returns an array of { name, value } objects.
 */
function parseCssCustomProperties(cssContent) {
  const properties = [];
  const regex = /--([a-zA-Z0-9-]+)\s*:\s*([^;]+);/g;
  let match;

  while ((match = regex.exec(cssContent)) !== null) {
    const name = `--${match[1]}`;
    const value = match[2].trim();
    properties.push({ name, value });
  }

  return properties;
}

/**
 * Infer the token $type from the variable name and value.
 */
function inferType(name, value) {
  if (name.startsWith('--color-')) return 'color';
  if (name.startsWith('--dimension-')) return 'dimension';
  if (name.startsWith('--typography-')) return 'typography';
  if (name.startsWith('--effect-')) return 'effect';
  return 'other';
}

/**
 * Convert parsed properties to W3C Design Tokens format.
 */
function toDesignTokens(properties) {
  const tokens = {};

  for (const { name, value } of properties) {
    tokens[name] = {
      $type: inferType(name, value),
      $value: value,
    };
  }

  return tokens;
}

function generateForFile(filename) {
  const filepath = path.join(SRC_DIR, filename);
  const css = readFileSync(filepath, 'utf8');
  const properties = parseCssCustomProperties(css);
  return toDesignTokens(properties);
}

// Generate individual token files
const categories = {
  colors: 'colors.css',
  dimensions: 'dimensions.css',
  typography: 'typography.css',
  effects: 'effects.css',
};

mkdirSync(path.join(DIST_DIR, 'json'), { recursive: true });

const allTokens = {};

for (const [category, filename] of Object.entries(categories)) {
  const tokens = generateForFile(filename);
  Object.assign(allTokens, tokens);

  const outputPath = path.join(DIST_DIR, 'json', `${category}.json`);
  writeFileSync(outputPath, JSON.stringify(tokens, null, 2), 'utf8');

  const count = Object.keys(tokens).length;
  console.log(`    ${category}: ${count} tokens → dist/json/${category}.json`);
}

// Generate combined tokens.json
writeFileSync(path.join(DIST_DIR, 'tokens.json'), JSON.stringify(allTokens, null, 2), 'utf8');

const totalCount = Object.keys(allTokens).length;
console.log(`    total: ${totalCount} tokens → dist/tokens.json`);

// Generate tokens-index.json — one layer of nesting: top-level category → subcategory → tokens.
// Colors split by source file (reference / semantic / data); others are flat.
// Longer prefixes must come first so they take priority over the generic --color- fallback.
const INDEX_RULES = [
  [['colors', 'reference'], '--color-reference-'],
  [['colors', 'data'],      '--color-data-'],
  [['colors', 'semantic'],  '--color-'],
  [['dimensions'],          '--dimension-'],
  [['typography'],          '--typography-'],
  [['effects'],             '--effect-'],
];

const indexGroups = {};

for (const [tokenName, token] of Object.entries(allTokens)) {
  const match = INDEX_RULES.find(([, prefix]) => tokenName.startsWith(prefix));
  if (!match) continue;
  const [keyPath] = match;
  let node = indexGroups;
  for (const key of keyPath.slice(0, -1)) {
    if (!node[key]) node[key] = {};
    node = node[key];
  }
  const leaf = keyPath[keyPath.length - 1];
  if (!node[leaf]) node[leaf] = {};
  node[leaf][tokenName] = token;
}

const tokensIndex = {
  _meta: {
    description: 'Tokens grouped by category and subcategory. Single Read, no grep needed.',
    categories: Object.keys(indexGroups).sort(),
  },
  ...indexGroups,
};

writeFileSync(path.join(DIST_DIR, 'tokens-index.json'), JSON.stringify(tokensIndex, null, 2), 'utf8');
const topLevelCount = Object.keys(indexGroups).length;
console.log(`    index: ${topLevelCount} categories → dist/tokens-index.json`);

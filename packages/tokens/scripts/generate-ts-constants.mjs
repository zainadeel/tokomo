/**
 * Generates TypeScript constants for token names.
 *
 * Output: dist/index.mjs, dist/index.cjs, dist/index.d.ts
 *
 * Usage in consuming apps:
 *   import { colorBackgroundPrimary, dimensionSpaceBase } from '@motive/tokens/ts';
 *   // colorBackgroundPrimary === '--color-background-primary'
 *
 * This enables type-safe token references in JavaScript/TypeScript code
 * (e.g., for inline styles, CSS-in-JS, or dynamic theming).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PKG_ROOT = path.resolve(__dirname, '..');
const DIST_DIR = path.join(PKG_ROOT, 'dist');

/**
 * Parse all CSS custom property names from a CSS file.
 */
function parseTokenNames(cssContent) {
  const names = new Set();
  const regex = /--([a-zA-Z0-9-]+)\s*:/g;
  let match;

  while ((match = regex.exec(cssContent)) !== null) {
    names.add(`--${match[1]}`);
  }

  return [...names];
}

/**
 * Convert a CSS variable name to a camelCase JS constant name.
 * --color-background-primary → colorBackgroundPrimary
 */
function toCamelCase(cssVarName) {
  return cssVarName
    .replace(/^--/, '')
    .replace(/-([a-z0-9])/g, (_, char) => char.toUpperCase());
}

// Read all token CSS files
const tokenFiles = ['colors.css', 'dimensions.css', 'typography.css', 'effects.css'];
const allNames = [];

for (const file of tokenFiles) {
  const filepath = path.join(PKG_ROOT, 'src', file);
  const css = readFileSync(filepath, 'utf8');
  allNames.push(...parseTokenNames(css));
}

// Deduplicate (dark mode overrides same names)
const uniqueNames = [...new Set(allNames)].sort();

// Generate ESM
const esmLines = uniqueNames.map(
  name => `export const ${toCamelCase(name)} = '${name}';`
);
writeFileSync(path.join(DIST_DIR, 'index.mjs'), esmLines.join('\n') + '\n', 'utf8');

// Generate CJS
const cjsLines = uniqueNames.map(
  name => `exports.${toCamelCase(name)} = '${name}';`
);
writeFileSync(path.join(DIST_DIR, 'index.cjs'), cjsLines.join('\n') + '\n', 'utf8');

// Generate TypeScript declarations
const dtsLines = uniqueNames.map(
  name => `export declare const ${toCamelCase(name)}: '${name}';`
);
writeFileSync(path.join(DIST_DIR, 'index.d.ts'), dtsLines.join('\n') + '\n', 'utf8');

console.log(`    TypeScript: ${uniqueNames.length} token constants → dist/index.{mjs,cjs,d.ts}`);

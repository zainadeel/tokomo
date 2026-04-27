/**
 * copy-tool-assets.mjs
 *
 * Two responsibilities:
 *   1. Copy the source reference token JSON into `tools/color-system/tokens.json`
 *      so the visual tool can load it as a relative asset (works in dev + deployed).
 *   2. When `--to-docs` is passed, also stage the entire tool into `docs/tool/`
 *      so it ships with the GH Pages deploy.
 */

import { readFileSync, mkdirSync, writeFileSync, copyFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const root = join(__dirname, '..');
const tokensSrc = join(root, 'src/json/colors/reference/color.reference.tokens.json');
const toolDir = join(root, 'tools/color-system');
const toolTokens = join(toolDir, 'tokens.json');

const json = readFileSync(tokensSrc, 'utf8');
writeFileSync(toolTokens, json);
console.log(`  ✓ tools/color-system/tokens.json  (${(Buffer.byteLength(json) / 1024).toFixed(1)}KB)`);

if (process.argv.includes('--to-docs')) {
  const docsToolDir = join(root, 'docs/tool');
  mkdirSync(docsToolDir, { recursive: true });
  const files = readdirSync(toolDir).filter(f => !statSync(join(toolDir, f)).isDirectory());
  for (const f of files) {
    copyFileSync(join(toolDir, f), join(docsToolDir, f));
  }
  console.log(`  ✓ docs/tool/  (${files.length} files)`);
}

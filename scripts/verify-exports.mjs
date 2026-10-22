/**
 * verify-exports.mjs
 *
 * Fails when a `package.json` `exports` target is missing after `npm run build`.
 * Every target must sit under `dist/` (the only published directory). A wildcard
 * subpath such as `./mobile/*` passes when at least one built file matches it.
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));

// An export value is a path string or a (possibly nested) map of conditions.
function targetsOf(value) {
  if (typeof value === 'string') return [value];
  if (value && typeof value === 'object') return Object.values(value).flatMap(targetsOf);
  return [];
}

function filesUnder(dir) {
  if (!existsSync(dir) || !statSync(dir).isDirectory()) return [];
  return readdirSync(dir, { recursive: true })
    .map(entry => path.join(dir, entry))
    .filter(file => statSync(file).isFile());
}

function isPresent(target) {
  const relative = path.posix.normalize(target);
  if (!relative.includes('*')) {
    const file = path.join(root, relative);
    return existsSync(file) && statSync(file).isFile();
  }
  // Node matches `*` against any substring, including `/`.
  const [prefix, suffix] = relative.split('*');
  return filesUnder(path.join(root, path.posix.dirname(`${prefix}x`))).some(file => {
    const candidate = path.relative(root, file).split(path.sep).join('/');
    return candidate.startsWith(prefix) && candidate.endsWith(suffix);
  });
}

const failures = [];
let checked = 0;
for (const [subpath, value] of Object.entries(pkg.exports ?? {})) {
  for (const target of targetsOf(value)) {
    checked += 1;
    if (!target.startsWith('./dist/')) {
      failures.push(`${subpath} → ${target} is outside dist/ and will not be published`);
    } else if (!isPresent(target)) {
      failures.push(`${subpath} → ${target} is missing`);
    }
  }
}

if (checked === 0) failures.push('package.json declares no exports');

if (failures.length > 0) {
  for (const failure of failures) console.error(`❌ ${failure}`);
  process.exit(1);
}
console.log(`✅ All ${checked} package export targets present.`);

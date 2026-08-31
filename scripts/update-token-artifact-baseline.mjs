import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { compileTokenProject } from './lib/token-compiler.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(
  root,
  'tests/fixtures/token-compiler/production-artifact-hashes.json',
);
const compilation = await compileTokenProject({ root });
const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
const hashes = Object.fromEntries(
  [...compilation.artifacts].map(([relativePath, contents]) => [
    relativePath,
    createHash('sha256').update(contents).digest('hex'),
  ]),
);
for (const relativePath of ['agent.json', 'agent.mjs', 'agent.d.ts', 'agent.schema.json']) {
  const contents = readFileSync(path.join(root, 'dist', relativePath), 'utf8')
    .replaceAll(pkg.version, '__PACKAGE_VERSION__');
  hashes[relativePath] = createHash('sha256').update(contents).digest('hex');
}

writeFileSync(output, `${JSON.stringify(hashes, null, 2)}\n`, 'utf8');
console.log(`Updated ${path.relative(root, output)} for ${Object.keys(hashes).length} artifacts.`);

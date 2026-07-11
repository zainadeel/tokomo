#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const source = JSON.parse(readFileSync(path.join(ROOT, 'src/agent/token-families.agent.json'), 'utf8'));
const tokens = JSON.parse(readFileSync(path.join(ROOT, 'dist/tokens.json'), 'utf8'));
const tokenNames = Object.keys(tokens);
const ids = new Set();
const ENTRY_FIELDS = new Set([
  'id', 'status', 'summary', 'tokenPatterns', 'useWhen', 'avoidWhen', 'constraints',
]);
const STATUSES = new Set(['experimental', 'stable', 'deprecated', 'removed']);

function matchesPattern(name, pattern) {
  if (!pattern.endsWith('*')) return name === pattern;
  return name.startsWith(pattern.slice(0, -1));
}

if (source.schemaVersion !== '1.0.0' || source.kind !== 'tokens' || !Array.isArray(source.entries)) {
  throw new Error('Invalid token agent manifest envelope.');
}

for (const entry of source.entries) {
  for (const key of Object.keys(entry)) {
    if (!ENTRY_FIELDS.has(key)) throw new Error(`${entry.id ?? 'token family'} has unknown field ${key}`);
  }
  if (!entry.id?.startsWith('token-family:')) throw new Error(`Invalid token family id: ${entry.id}`);
  if (ids.has(entry.id)) throw new Error(`Duplicate token family id: ${entry.id}`);
  ids.add(entry.id);
  if (!STATUSES.has(entry.status)) throw new Error(`${entry.id} has invalid status ${entry.status}`);
  if (typeof entry.summary !== 'string' || !entry.summary) throw new Error(`${entry.id} requires a summary.`);
  for (const field of ['tokenPatterns', 'useWhen', 'avoidWhen', 'constraints']) {
    if (!Array.isArray(entry[field]) || entry[field].length === 0) {
      throw new Error(`${entry.id} requires non-empty ${field}.`);
    }
    if (new Set(entry[field]).size !== entry[field].length) {
      throw new Error(`${entry.id}.${field} contains duplicate values.`);
    }
  }
  for (const pattern of entry.tokenPatterns) {
    if (!tokenNames.some(name => matchesPattern(name, pattern))) {
      throw new Error(`${entry.id} pattern matches no published token: ${pattern}`);
    }
  }
}

const manifest = {
  schemaVersion: source.schemaVersion,
  package: pkg.name,
  packageVersion: pkg.version,
  kind: source.kind,
  entries: source.entries,
};

writeFileSync(path.join(ROOT, 'dist/agent.json'), `${JSON.stringify(manifest, null, 2)}\n`);
writeFileSync(
  path.join(ROOT, 'dist/agent.mjs'),
  `const manifest = ${JSON.stringify(manifest, null, 2)};\nexport default manifest;\n`,
);
writeFileSync(path.join(ROOT, 'dist/agent.d.ts'), `export interface TokenFamilyAgentEntry {
  id: string;
  status: 'experimental' | 'stable' | 'deprecated' | 'removed';
  summary: string;
  tokenPatterns: string[];
  useWhen: string[];
  avoidWhen: string[];
  constraints: string[];
}

export interface TokenAgentManifest {
  schemaVersion: '1.0.0';
  package: '@ds-mo/tokens';
  packageVersion: string;
  kind: 'tokens';
  entries: TokenFamilyAgentEntry[];
}

declare const manifest: TokenAgentManifest;
export default manifest;
`);
console.log(`    agent: ${manifest.entries.length} token families → dist/agent.json`);

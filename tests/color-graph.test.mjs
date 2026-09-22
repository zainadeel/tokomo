import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { compileTokenProject } from '../scripts/lib/token-compiler.mjs';
import { makeResolver, makeChainResolver } from '../scripts/lib/token-colors.mjs';
import { buildActiveMatrix } from '../scripts/lib/active-contrast.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
execFileSync(process.execPath, ['scripts/build-color-graph.mjs'], { cwd: root });
const graph = JSON.parse(readFileSync(new URL('../docs/graph/graph-data.json', import.meta.url)));
const compilation = await compileTokenProject();
const modes = JSON.parse(compilation.artifacts.get('json/colors.modes.json'));
const resolve = makeResolver(modes);
const semantic = compilation.graph.nodes.filter(n => n.category === 'colors' && n.layer === 'semantic');

test('graph includes every semantic token once, with both shipped values and valid alias endpoints', () => {
  assert.deepEqual(graph.tokens.map(t => t.name).sort(), semantic.map(n => n.cssName).sort());
  for (const token of graph.tokens) {
    const source = compilation.graph.byCssName.get(token.name);
    assert.equal(token.path, source.path.join('.'));
    assert.equal(token.figmaName, source.path.join('/'));
    for (const mode of ['light', 'dark']) {
      assert.equal(token[mode].css, resolve(mode, token.name));
      assert.equal(token[mode].reference, source.values[mode].target ?? null);
      if (token[mode].reference) assert.ok(compilation.graph.byCssName.has(token[mode].reference));
    }
    assert.ok(token.guidance.length, `Missing guidance for ${token.name}`);
    for (const id of token.guidance) assert.ok(graph.families.some(f => f.id === id));
  }
});

test('graph preserves the audit’s exact pairings, thresholds, restrictions, and conditional backdrops', () => {
  assert.deepEqual(graph.pairings, buildActiveMatrix(resolve, makeChainResolver(modes)));
  assert.ok(graph.pairings.some(p => p.conditional && p.baseUnderToken));
  assert.ok(graph.pairings.some(p => p.threshold === 3));
  assert.ok(graph.pairings.some(p => p.contrastAfter < 4.5));
  const names = new Set(graph.tokens.map(t => t.name));
  for (const pair of graph.pairings) {
    for (const name of [pair.baseToken, pair.foregroundToken, pair.activeToken]) assert.ok(names.has(name));
  }
});

test('graph core intent groups do not assign meaning to literal hues or specialized contexts', () => {
  assert.equal(graph.intents.length, 9);
  assert.equal(graph.tokens.find(t => t.path === 'background.bold.brand').intent, 'brand');
  assert.equal(graph.tokens.find(t => t.path === 'background.medium.AI').intent, 'ai');
  assert.ok(graph.tokens.filter(t => t.family === 'color-intent').every(t => t.intent === null));
  assert.ok(graph.tokens.filter(t => t.intent).every(t => ['background', 'foreground', 'border'].includes(t.family)));
});

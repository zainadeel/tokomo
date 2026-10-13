import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { compileTokenProject } from '../scripts/lib/token-compiler.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const production = await compileTokenProject({ root });
const pkg = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
const manifest = JSON.parse(production.artifacts.get('mobile/manifest.json'));
const jsonArtifact = name => JSON.parse(production.artifacts.get(`mobile/tokens/${name}`));

async function fixture(t, sourceId, mutate) {
  const temporary = await mkdtemp(path.join(os.tmpdir(), 'tokomo-mobile-'));
  t.after(() => rm(temporary, { recursive: true, force: true }));
  await writeFile(path.join(temporary, 'package.json'), JSON.stringify(pkg));
  for (const source of production.sources) {
    const target = path.join(temporary, source.file);
    await mkdir(path.dirname(target), { recursive: true });
    const document = structuredClone(source.document);
    if (source.id === sourceId) mutate(document);
    await writeFile(target, JSON.stringify(document));
  }
  return temporary;
}

test('mobile export preserves all nine native files and records their release and checksums', () => {
  assert.equal(manifest.schemaVersion, 1);
  assert.equal(manifest.platform, 'mobile');
  assert.equal(manifest.package, pkg.name);
  assert.equal(manifest.version, pkg.version);
  assert.deepEqual(manifest.files.map(file => file.path).sort(), [
    'tokens/colors/data/dark.tokens.json',
    'tokens/colors/data/light.tokens.json',
    'tokens/colors/reference/hex.tokens.json',
    'tokens/colors/semantic/dark.tokens.json',
    'tokens/colors/semantic/light.tokens.json',
    'tokens/dimensions/mobile/value.tokens.json',
    'tokens/effects/value.tokens.json',
    'tokens/typography/mobile/semantic.tokens.json',
    'tokens/typography/mobile/value.tokens.json',
  ]);
  for (const file of manifest.files) {
    const source = production.sources.find(source => source.file === file.source);
    const output = production.artifacts.get(`mobile/${file.path}`);
    assert.equal(output, source.contents, `${file.path} must retain its native source format`);
    assert.equal(file.sha256, createHash('sha256').update(output).digest('hex'));
    assert.equal(file.platform, file.category === 'colors' || file.category === 'effects' ? 'shared' : 'mobile');
  }
});

test('mobile values and text-style bindings use the latest Figma export', () => {
  const dimensions = jsonArtifact('dimensions/mobile/value.tokens.json');
  const typography = jsonArtifact('typography/mobile/value.tokens.json');
  const styles = jsonArtifact('typography/mobile/semantic.tokens.json');
  assert.equal(dimensions['size-icon'].xl.$value, 36);
  assert.equal(dimensions['size-icon']['2xl'].$value, 40);
  assert.equal(dimensions['size-icon'].md.$value, 24);
  assert.equal(dimensions['height-sheet'].half.$value, '50%');
  assert.equal(typography['font-size'].md.$value, 17);
  assert.equal(typography['line-height'].xl.$value, 36);
  assert.equal(typography['line-height']['2xl'].$value, 40);
  assert.equal(Object.keys(styles).length, 14);
  assert.equal(styles['mobile/display/display'].lineHeight.value, 40);
  assert.equal(styles['mobile/title/large'].lineHeight.value, 36);
  assert.equal(production.graph.byCssName.get('--dimension-iconography-md').values.default.raw, 20);
  assert.equal(production.graph.byCssName.get('--typography-fontsize-md').values.default.raw, 14);
});

test('mobile export carries current shared color names and both themes', () => {
  const light = jsonArtifact('colors/semantic/light.tokens.json');
  const dark = jsonArtifact('colors/semantic/dark.tokens.json');
  assert.ok(light['map-marker'].entity);
  assert.ok(light.translucent.background);
  assert.ok(light.chrome);
  assert.equal(light['entity-marker'], undefined);
  assert.notDeepEqual(light.background.primary.$value, dark.background.primary.$value);
  assert.ok(light.background.primary.$extensions['com.figma.aliasData']);
});

test('mobile JSON requires a mobile package subpath', async () => {
  assert.equal(pkg.exports['.'], './dist/index.css');
  assert.equal(pkg.exports['./json'], './dist/tokens.json');
  assert.equal(pkg.exports['./mobile'], './dist/mobile/manifest.json');
  const imported = await import('@ds-mo/tokens/mobile', { with: { type: 'json' } });
  assert.deepEqual(imported.default, manifest);
  for (const file of manifest.files) {
    const resolved = fileURLToPath(import.meta.resolve(`@ds-mo/tokens/mobile/${file.path}`));
    assert.equal(resolved, path.join(root, 'dist/mobile', file.path));
  }
});

test('changing a mobile primitive cannot change any web CSS or legacy artifact', async t => {
  const temporary = await fixture(t, 'dimensions.mobile', data => { data['size-icon'].md.$value = 28; });
  const changed = await compileTokenProject({ root: temporary });
  assert.deepEqual(changed.css, production.css);
  for (const [file, contents] of production.artifacts) {
    if (!file.startsWith('mobile/')) assert.equal(changed.artifacts.get(file), contents, file);
  }
  const dimensions = JSON.parse(changed.artifacts.get('mobile/tokens/dimensions/mobile/value.tokens.json'));
  assert.equal(dimensions['size-icon'].md.$value, 28);
});

for (const [name, sourceId, mutate, expected] of [
  ['malformed number', 'dimensions.mobile', d => { d['size-icon'].md.$value = false; }, /invalid primitive value/],
  ['unknown group', 'dimensions.mobile', d => { d.accidental = { token: { $type: 'number', $value: 8 } }; }, /unsupported mobile token group/],
  ['missing group', 'dimensions.mobile', d => { delete d.space; }, /expected token group space/],
  ['invalid grid value', 'dimensions.mobile', d => { d.space['100'].$value = 9; }, /scale key and base/],
  ['unsupported sheet height', 'dimensions.mobile', d => { d['height-sheet'].half.$value = '150%'; }, /sheet height/],
  ['stale text style', 'typography.mobile', d => { d['line-height']['2xl'].$value = 42; }, /value disagrees/],
  ['missing style primitive', 'typography.mobile.semantic', d => { d['mobile/display/display'].lineHeight.variable = 'typography-mobile/line-height/missing'; }, /missing numeric primitive/],
  ['web style reference', 'typography.mobile.semantic', d => { d['mobile/display/display'].lineHeight.variable = 'typography-web/line-height/2xl'; }, /typography-mobile/],
  ['wrong reference category', 'typography.mobile.semantic', d => { d['mobile/display/display'].fontSize.variable = 'typography-mobile/line-height/2xl'; }, /typography-mobile\/font-size/],
  ['missing style category', 'typography.mobile.semantic', d => { delete d['mobile/display/display']; }, /missing required mobile text-style category/],
  ['unsupported text transform', 'typography.mobile.semantic', d => { d['mobile/display/display'].textCase = 'uppercase'; }, /native text-style generators/],
  ['invalid native color', 'colors.semantic.light', d => { d.background.primary.$value.hex = '#bad-color'; }, /native colors require/],
  ['CSS-only duration shape', 'effects', d => { d.animation.duration.instant = { $type: 'number', $value: 0 }; }, /native durations require/],
]) {
  test(`mobile validation rejects ${name} before emitting artifacts`, async t => {
    const temporary = await fixture(t, sourceId, mutate);
    await assert.rejects(compileTokenProject({ root: temporary }), expected);
  });
}

test('invalid mobile input leaves existing dist and source CSS intact', async t => {
  const temporary = await fixture(t, 'typography.mobile', d => { d['line-height']['2xl'].$value = 42; });
  await cp(path.join(root, 'scripts'), path.join(temporary, 'scripts'), { recursive: true });
  await mkdir(path.join(temporary, 'dist'));
  await writeFile(path.join(temporary, 'dist/previous-output'), 'previous build');
  await writeFile(path.join(temporary, 'src/colors.css'), 'previous CSS');
  assert.throws(() => execFileSync(process.execPath, ['scripts/build.mjs'], {
    cwd: temporary,
    stdio: 'pipe',
  }), /value disagrees/);
  assert.equal(await readFile(path.join(temporary, 'dist/previous-output'), 'utf8'), 'previous build');
  assert.equal(await readFile(path.join(temporary, 'src/colors.css'), 'utf8'), 'previous CSS');
  assert.equal((await readdir(temporary)).some(name => name.startsWith('.tokomo-')), false);
});

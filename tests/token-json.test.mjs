import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const readJson = async path => JSON.parse(await readFile(new URL(`../${path}`, import.meta.url), 'utf8'));

test('semantic colors preserve light and dark mode values', async () => {
  const colors = await readJson('dist/json/colors.json');
  const primary = colors['--color-background-primary'];
  assert.equal(primary.$value, 'var(--color-reference-white-100)');
  assert.deepEqual(primary.$extensions['ds-mo'].modes, {
    light: 'var(--color-reference-white-100)',
    dark: 'var(--color-reference-grey-l20)',
  });
});

test('explicit mode output has matching semantic token sets', async () => {
  const modes = await readJson('dist/json/colors.modes.json');
  assert.deepEqual(Object.keys(modes.dark).sort(), Object.keys(modes.dark).filter(name => modes.light[name]).sort());
  assert.ok(Object.keys(modes.dark).length > 0);
});

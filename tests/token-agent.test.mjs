import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const readJson = async path => JSON.parse(await readFile(new URL(`../${path}`, import.meta.url), 'utf8'));

const patternRegex = pattern => new RegExp(
  `^${pattern.split('*').map(part => part.replace(/[|\\{}()[\]^$+?.]/g, '\\$&')).join('.*')}$`,
);

const matches = (name, pattern) => patternRegex(pattern).test(name);

test('agent guidance exposes one validated family-and-recipe contract', async () => {
  const manifest = await readJson('dist/agent.json');
  const schema = await readJson('dist/agent.schema.json');

  assert.equal(manifest.$schema, './agent.schema.json');
  assert.equal(manifest.schemaVersion, '2.0.0');
  assert.equal(manifest.package, '@ds-mo/tokens');
  assert.equal(manifest.kind, 'tokens');
  assert.equal(schema.properties.schemaVersion.const, manifest.schemaVersion);
  assert.equal(manifest.intents.length, 9);
  assert.ok(manifest.families.length > 0);
  assert.ok(manifest.recipes.length > 0);
  assert.equal('entries' in manifest, false, 'the restrictive 1.0 entries shape must not survive');
});

test('every published token is covered by at least one guidance family', async () => {
  const manifest = await readJson('dist/agent.json');
  const tokens = await readJson('dist/tokens.json');

  const uncovered = Object.keys(tokens).filter(name => !manifest.families.some(family =>
    family.tokenPatterns.some(pattern => matches(name, pattern))
  ));

  assert.deepEqual(uncovered, []);
});

test('recipe assignments reference published tokens or productive patterns', async () => {
  const manifest = await readJson('dist/agent.json');
  const tokens = await readJson('dist/tokens.json');
  const tokenNames = Object.keys(tokens);

  for (const recipe of manifest.recipes) {
    for (const variant of recipe.variants) {
      for (const assignment of variant.assignments) {
        if (assignment.token) {
          assert.ok(tokens[assignment.token], `${recipe.id}.${variant.id} references ${assignment.token}`);
        }
        if (assignment.tokenPattern) {
          assert.ok(
            tokenNames.some(name => matches(name, assignment.tokenPattern)),
            `${recipe.id}.${variant.id} pattern matches no token: ${assignment.tokenPattern}`,
          );
        }
      }
    }
  }
});

test('typography composites and elevation parts remain complete', async () => {
  const manifest = await readJson('dist/agent.json');
  const typography = manifest.recipes.find(recipe => recipe.id === 'token-recipe:typography-composites');
  const elevation = manifest.recipes.find(recipe => recipe.id === 'token-recipe:elevation-composition');

  assert.equal(typography.variants.length, 18, 'nine styles must each have regular and emphasis variants');

  for (const variant of elevation.variants) {
    const byRole = Object.fromEntries(variant.assignments.map(assignment => [assignment.role, assignment.token]));
    assert.equal(byRole.shadow, `--effect-shadow-${variant.id}`);
    assert.equal(byRole.highlight, `--effect-highlight-${variant.id}`);
    assert.equal(byRole.combined, `--effect-elevation-${variant.id}`);
  }
});

test('foreground and neutral-border hierarchies carry their usage and contrast contracts', async () => {
  const manifest = await readJson('dist/agent.json');
  const foreground = manifest.recipes.find(recipe => recipe.id === 'token-recipe:foreground-hierarchy');
  const borders = manifest.recipes.find(recipe => recipe.id === 'token-recipe:neutral-border-hierarchy');
  const surfacePairing = manifest.recipes.find(recipe => recipe.id === 'token-recipe:semantic-color-pairing');

  assert.ok(foreground, 'foreground hierarchy recipe must be published');
  assert.ok(borders, 'neutral border hierarchy recipe must be published');

  assert.ok(foreground.compositionRules.some(rule =>
    rule.includes('Default most body copy') && rule.includes('secondary')
  ));
  assert.ok(foreground.compositionRules.some(rule =>
    rule.includes('Reserve primary') && rule.includes('high emphasis')
  ));
  assert.ok(foreground.accessibility.some(rule =>
    rule.includes('primary and secondary') && rule.includes('4.5:1')
  ));
  assert.ok(foreground.accessibility.some(rule =>
    rule.includes('tertiary') && rule.includes('3:1')
  ));

  for (const id of ['faint', 'medium', 'bold', 'strong', 'literal-faint', 'literal-medium', 'literal-bold', 'literal-strong']) {
    const variant = surfacePairing.variants.find(candidate => candidate.id === id);
    const content = variant.assignments.find(assignment => assignment.role === 'content');
    assert.match(content.token, /secondary$/, `${id} should default ordinary content to secondary`);
  }

  assert.ok(borders.compositionRules.some(rule =>
    rule.includes('tertiary') && rule.includes('non-interactive')
  ));
  assert.ok(borders.compositionRules.some(rule =>
    rule.includes('secondary') && rule.includes('interactive control')
  ));
  assert.ok(borders.compositionRules.some(rule =>
    rule.includes('primary') && rule.includes('stroke itself')
  ));
  assert.ok(borders.accessibility.some(rule =>
    rule.includes('primary neutral border') && rule.includes('3:1')
  ));
});

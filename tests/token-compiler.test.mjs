import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  compileTokenProject,
  normalizeTokenSources,
  validateTokenGraph,
  walkTokenLeaves,
} from '../scripts/lib/token-compiler.mjs';
import { replaceTransactionally } from '../scripts/lib/transactional-output.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fixture = JSON.parse(
  await readFile(path.join(root, 'tests/fixtures/token-compiler/colors.json'), 'utf8'),
);
const nonColorFixture = JSON.parse(
  await readFile(path.join(root, 'tests/fixtures/token-compiler/non-colors.json'), 'utf8'),
);
const artifactHashes = JSON.parse(
  await readFile(
    path.join(root, 'tests/fixtures/token-compiler/production-artifact-hashes.json'),
    'utf8',
  ),
);
const pkg = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
const production = await compileTokenProject({ root });
const agentArtifacts = ['agent.json', 'agent.mjs', 'agent.d.ts', 'agent.schema.json'];

function colorSources(document = fixture) {
  return [
    {
      id: 'colors.reference',
      file: 'fixture:reference',
      category: 'colors',
      layer: 'reference',
      mode: 'light',
      document: document.reference,
    },
    {
      id: 'colors.semantic.light',
      file: 'fixture:semantic-light',
      category: 'colors',
      layer: 'semantic',
      mode: 'light',
      document: document.semanticLight,
    },
    {
      id: 'colors.semantic.dark',
      file: 'fixture:semantic-dark',
      category: 'colors',
      layer: 'semantic',
      mode: 'dark',
      document: document.semanticDark,
    },
    {
      id: 'colors.data.light',
      file: 'fixture:data-light',
      category: 'colors',
      layer: 'data',
      mode: 'light',
      document: document.dataLight,
    },
    {
      id: 'colors.data.dark',
      file: 'fixture:data-dark',
      category: 'colors',
      layer: 'data',
      mode: 'dark',
      document: document.dataDark,
    },
  ];
}

test('production compilation preserves committed CSS and golden artifact hashes', async () => {
  for (const [category, contents] of Object.entries(production.css)) {
    const current = await readFile(path.join(root, 'src', `${category}.css`), 'utf8');
    assert.equal(contents, current, `src/${category}.css changed`);
  }

  const compilerBaselines = Object.keys(artifactHashes)
    .filter(relativePath => !agentArtifacts.includes(relativePath))
    .sort();
  assert.deepEqual([...production.artifacts.keys()].sort(), compilerBaselines);
  for (const [relativePath, contents] of production.artifacts) {
    const digest = createHash('sha256').update(contents).digest('hex');
    assert.equal(digest, artifactHashes[relativePath], `${relativePath} changed`);
  }

  for (const relativePath of agentArtifacts) {
    const contents = (await readFile(path.join(root, 'dist', relativePath), 'utf8'))
      .replaceAll(pkg.version, '__PACKAGE_VERSION__');
    const digest = createHash('sha256').update(contents).digest('hex');
    assert.equal(digest, artifactHashes[relativePath], `${relativePath} changed`);
  }
});

test('documentation inventory reads graph JSON instead of reparsing CSS', async () => {
  const docsBuilder = await readFile(path.join(root, 'scripts/build-docs.mjs'), 'utf8');
  assert.match(docsBuilder, /distDir, 'json'/);
  assert.doesNotMatch(docsBuilder, /function parseVars|matchAll\([^)]*--/);
});

test('graph preserves source semantics, aliases, modes, provenance, and metadata', () => {
  assert.equal(production.graph.nodes.length, 1065);
  const primary = production.graph.byCssName.get('--color-background-primary');
  assert.equal(primary.sourceType, 'color');
  assert.equal(primary.publicType, 'color');
  assert.equal(primary.defaultMode, 'light');
  assert.equal(primary.provenance, 'figma');
  assert.equal(primary.values.light.kind, 'alias');
  assert.equal(primary.values.light.target, '--color-reference-white-100');
  assert.equal(primary.values.dark.target, '--color-reference-grey-l20');
  assert.ok(primary.extensions.light['com.figma.variableId']);

  const focusRing = production.graph.byCssName.get('--effect-focus-ring');
  assert.equal(focusRing.provenance, 'hand-authored');
  assert.deepEqual(focusRing.values.default.dependencies, [
    '--dimension-space-025',
    '--dimension-stroke-width-025',
    '--color-foreground-medium-brand',
  ]);
});

test('compact color fixture compiles all layers from one graph', () => {
  const graph = normalizeTokenSources(colorSources(), { includeManualEffects: false });
  validateTokenGraph(graph);
  const primary = graph.byCssName.get('--color-background-primary');
  assert.equal(primary.values.light.cssValue, 'var(--color-reference-white-100)');
  assert.equal(primary.values.dark.cssValue, 'var(--color-reference-grey-l20)');
  assert.equal(primary.sources.light.file, 'fixture:semantic-light');
  assert.equal(primary.sources.dark.file, 'fixture:semantic-dark');
});

test('compact fixtures cover supported dimension, typography, and effect shapes', () => {
  const graph = normalizeTokenSources([
    {
      file: 'fixture:dimensions',
      category: 'dimensions',
      mode: 'default',
      document: nonColorFixture.dimensions,
    },
    {
      file: 'fixture:typography',
      category: 'typography',
      mode: 'default',
      document: nonColorFixture.typography,
    },
    {
      file: 'fixture:effects',
      category: 'effects',
      mode: 'default',
      document: nonColorFixture.effects,
    },
  ]);
  validateTokenGraph(graph);

  assert.equal(
    graph.byCssName.get('--dimension-offset-negative').values.default.cssValue,
    'calc(var(--dimension-space-base) * -1 / 4)',
  );
  assert.equal(
    graph.byCssName.get('--typography-font-family-code').values.default.cssValue,
    "'Fira Code', monospace",
  );
  assert.equal(
    graph.byCssName.get('--effect-animation-duration-short').values.default.cssValue,
    '100ms',
  );
});

test('compiler can omit optional manual effect inputs without crashing', async () => {
  const withoutManualEffects = await compileTokenProject({
    root,
    includeManualEffects: false,
  });
  assert.equal(withoutManualEffects.graph.byCssName.has('--effect-focus-ring'), false);
  assert.doesNotMatch(withoutManualEffects.css.effects, /--effect-motion-/);
});

test('walker rejects malformed leaves with source-aware diagnostics', () => {
  const source = { file: 'fixture:malformed' };
  assert.throws(
    () => walkTokenLeaves({ group: { token: { $type: 'number' } } }, source),
    error =>
      error.code === 'MALFORMED_TOKEN' &&
      error.message.includes('fixture:malformed:group.token'),
  );
});

test('token-bearing branches cannot be silently ignored', () => {
  const source = {
    file: 'fixture:unexpected-group',
    category: 'dimensions',
    mode: 'default',
    document: {
      futureGroup: {
        token: { $type: 'number', $value: 8 },
      },
    },
  };
  assert.throws(
    () => normalizeTokenSources([source], { includeManualEffects: false }),
    { code: 'UNEXPECTED_TOKEN_GROUP' },
  );
});

test('semantic and data colors require matching light and dark paths', () => {
  const document = structuredClone(fixture);
  delete document.semanticDark.background.primary;
  const graph = normalizeTokenSources(colorSources(document), { includeManualEffects: false });
  assert.throws(() => validateTokenGraph(graph), { code: 'MISSING_MODE' });
});

test('aliases must target existing reference colors in the reference collection', () => {
  const missing = structuredClone(fixture);
  missing.semanticLight.background.primary.$extensions[
    'com.figma.aliasData'
  ].targetVariableName = 'white/missing';
  const missingGraph = normalizeTokenSources(colorSources(missing), { includeManualEffects: false });
  assert.throws(() => validateTokenGraph(missingGraph), { code: 'MISSING_DEPENDENCY' });

  const wrongCollection = structuredClone(fixture);
  wrongCollection.semanticLight.background.primary.$extensions[
    'com.figma.aliasData'
  ].targetVariableSetName = 'colors-semantic';
  assert.throws(
    () => normalizeTokenSources(colorSources(wrongCollection), { includeManualEffects: false }),
    { code: 'INVALID_COLOR' },
  );

  const invalidLiteral = structuredClone(fixture);
  invalidLiteral.semanticLight.background.primary.$value = null;
  assert.throws(
    () => normalizeTokenSources(colorSources(invalidLiteral), { includeManualEffects: false }),
    { code: 'INVALID_COLOR' },
  );
});

test('sanitized CSS names and TypeScript export names are globally unique', () => {
  const cssCollision = structuredClone(fixture);
  cssCollision.reference['white!'] = structuredClone(cssCollision.reference.white);
  assert.throws(
    () => normalizeTokenSources(colorSources(cssCollision), { includeManualEffects: false }),
    { code: 'CSS_NAME_COLLISION' },
  );

  const tsCollision = structuredClone(fixture);
  const blackToken = structuredClone(tsCollision.reference.white['100']);
  tsCollision.reference.black = {
    'foo-1': blackToken,
    foo1: structuredClone(blackToken),
  };
  const graph = normalizeTokenSources(colorSources(tsCollision), { includeManualEffects: false });
  assert.throws(() => validateTokenGraph(graph), { code: 'TS_NAME_COLLISION' });
});

test('invalid numeric, color, opacity, and duration values fail during normalization', () => {
  const invalidColor = structuredClone(fixture);
  invalidColor.reference.white['100'].$value.components[0] = 1.1;
  assert.throws(
    () => normalizeTokenSources(colorSources(invalidColor), { includeManualEffects: false }),
    { code: 'INVALID_COLOR' },
  );

  const dimensions = {
    file: 'fixture:dimensions',
    category: 'dimensions',
    mode: 'default',
    document: {
      space: {
        value: { $type: 'number', $value: Number.POSITIVE_INFINITY },
      },
    },
  };
  assert.throws(
    () => normalizeTokenSources([dimensions], { includeManualEffects: false }),
    { code: 'INVALID_DIMENSION' },
  );

  const malformedOffset = {
    file: 'fixture:offset',
    category: 'dimensions',
    mode: 'default',
    document: {
      offset: {
        bad: { $type: 'string', $value: '8garbage' },
      },
    },
  };
  assert.throws(
    () => normalizeTokenSources([malformedOffset], { includeManualEffects: false }),
    { code: 'INVALID_DIMENSION' },
  );

  const invalidDuration = {
    file: 'fixture:effects',
    category: 'effects',
    mode: 'default',
    expectedGroups: ['animation', 'blur', 'opacity'],
    document: {
      animation: {
        duration: {
          bad: { $type: 'duration', $value: { value: 1, unit: 'minutes' } },
        },
        delay: {},
        easing: {},
      },
      blur: {},
      opacity: {
        bad: { $type: 'number', $value: 101 },
      },
    },
  };
  assert.throws(
    () => normalizeTokenSources([invalidDuration], { includeManualEffects: false }),
    { code: 'INVALID_EFFECT' },
  );

  const invalidOpacity = structuredClone(invalidDuration);
  invalidOpacity.document.animation.duration = {};
  assert.throws(
    () => normalizeTokenSources([invalidOpacity], { includeManualEffects: false }),
    { code: 'INVALID_EFFECT' },
  );
});

test('required nested effect groups cannot disappear silently', () => {
  const source = {
    file: 'fixture:effects-groups',
    category: 'effects',
    mode: 'default',
    expectedGroups: ['animation', 'blur', 'opacity'],
    expectedPaths: [
      ['animation', 'duration'],
      ['animation', 'delay'],
      ['animation', 'easing'],
    ],
    document: {
      animation: {
        duration: {},
        easing: {},
      },
      blur: {},
      opacity: {},
    },
  };
  assert.throws(
    () => normalizeTokenSources([source], { includeManualEffects: false }),
    { code: 'MISSING_GROUP' },
  );
});

test('dependency cycles fail before artifacts are emitted', () => {
  const source = file => ({ default: { file, path: ['token'] } });
  const node = (cssName, dependency) => ({
    id: cssName,
    category: 'effects',
    path: ['token'],
    cssName,
    tsName: cssName.slice(2),
    sourceType: 'composite',
    publicType: 'effect',
    provenance: 'derived',
    section: 'manual',
    order: 0,
    values: {
      default: {
        kind: 'composite',
        raw: `var(${dependency})`,
        cssValue: `var(${dependency})`,
        dependencies: [dependency],
      },
    },
    sources: source('fixture:cycle'),
    extensions: { default: undefined },
  });
  const left = node('--effect-cycle-left', '--effect-cycle-right');
  const right = node('--effect-cycle-right', '--effect-cycle-left');
  const graph = {
    nodes: [left, right],
    byCssName: new Map([[left.cssName, left], [right.cssName, right]]),
    byId: new Map([[left.id, left], [right.id, right]]),
  };
  assert.throws(() => validateTokenGraph(graph), { code: 'DEPENDENCY_CYCLE' });
});

test('transactional replacement restores every previous output after a failure', async () => {
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'tokomo-compiler-'));
  const firstTarget = path.join(temporaryRoot, 'first.txt');
  const secondTarget = path.join(temporaryRoot, 'second.txt');
  const firstStaged = path.join(temporaryRoot, 'first.staged.txt');
  const missingStaged = path.join(temporaryRoot, 'missing.staged.txt');

  try {
    await Promise.all([
      writeFile(firstTarget, 'first-old'),
      writeFile(secondTarget, 'second-old'),
      writeFile(firstStaged, 'first-new'),
    ]);
    assert.throws(() => replaceTransactionally(
      [
        { staged: firstStaged, target: firstTarget },
        { staged: missingStaged, target: secondTarget },
      ],
      { nonce: 'rollback-test' },
    ));
    assert.equal(await readFile(firstTarget, 'utf8'), 'first-old');
    assert.equal(await readFile(secondTarget, 'utf8'), 'second-old');
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
});

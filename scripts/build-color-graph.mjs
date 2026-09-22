/** Build the static Color graph from the validated compiler graph and guidance. */
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { compileTokenProject } from './lib/token-compiler.mjs';
import { makeResolver, makeChainResolver, parseCssColor } from './lib/token-colors.mjs';
import { buildActiveMatrix } from './lib/active-contrast.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const compilation = await compileTokenProject({ root });
const modes = JSON.parse(compilation.artifacts.get('json/colors.modes.json'));
const guidance = JSON.parse(readFileSync(join(root, 'dist/agent.json'), 'utf8'));
const resolve = makeResolver(modes);
const chain = makeChainResolver(modes);
const matches = (name, pattern) => new RegExp(`^${pattern.split('*').map(p => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*')}$`).test(name);
const families = guidance.families.filter(f => f.category === 'color');
const intents = guidance.intents.map(i => ({ ...i, name: i.id.replace('intent:', '') }));

function color(mode, node) {
  const css = resolve(mode, node.cssName);
  const rgba = parseCssColor(css);
  const channels = [rgba.r, rgba.g, rgba.b].map(n => Math.round(n * 255));
  return {
    css,
    rgb: `rgb(${channels.join(' ')} / ${rgba.a})`,
    hex: `#${channels.map(n => n.toString(16).padStart(2, '0')).join('').toUpperCase()}`,
    alpha: rgba.a,
    reference: (node.values[mode] ?? node.values.light).target ?? null,
    referencePath: node.extensions[mode]?.['com.figma.aliasData']?.targetVariableName ?? null,
  };
}

const nodes = compilation.graph.nodes.filter(n => n.category === 'colors' && n.layer === 'semantic');
const tokens = nodes.map(n => ({
  name: n.cssName,
  path: n.path.join('.'),
  family: n.path[0],
  intent: intents.find(i => n.path.at(-1).toLowerCase() === i.name && ['background', 'foreground', 'border'].includes(n.path[0]))?.name ?? null,
  guidance: families.filter(f => f.tokenPatterns.some(p => matches(n.cssName, p))).map(f => f.id),
  figmaName: n.path.join('/'),
  light: color('light', n),
  dark: color('dark', n),
}));

const tokenNames = new Set(tokens.map(token => token.name));
const relationships = [];
const relationshipKeys = new Set();
const addRelationship = (source, target, kind) => {
  if (!tokenNames.has(source) || !tokenNames.has(target) || source === target) return;
  const endpoints = [source, target].sort();
  const key = `${endpoints[0]}\0${endpoints[1]}\0${kind}`;
  if (relationshipKeys.has(key)) return;
  relationshipKeys.add(key);
  relationships.push({ source, target, kind });
};
const addMany = (background, related, kind) => {
  for (const name of related) addRelationship(background, name, kind);
};
const hierarchy = prefix => ['primary', 'secondary', 'tertiary', 'quaternary'].map(step => `${prefix}-${step}`);
const borderHierarchy = prefix => ['primary', 'secondary', 'tertiary'].map(step => `${prefix}-${step}`);
const states = prefix => ['active', 'hover', 'pressed', 'focus'].map(state => `${prefix}-${state}`);
const addOrdinarySurfaceTokens = background => {
  addMany(background, borderHierarchy('--color-border'), 'border');
  addRelationship(background, '--color-divider-divider', 'divider');
  addRelationship(background, '--color-shimmer-shimmer', 'shimmer');
};
const addOnToneSurfaceTokens = (background, tone) => {
  addMany(background, borderHierarchy(`--color-border-on-${tone}-background`), 'border');
  addRelationship(background, `--color-divider-divider-on-${tone}-background`, 'divider');
  addRelationship(background, `--color-shimmer-shimmer-on-${tone}-background`, 'shimmer');
};

// Core semantic surfaces. These are the documented foreground hierarchies and
// interaction families in color-usage.md, including optional chromatic pairs.
for (const token of tokens.filter(token => token.family === 'background')) {
  const [, tone, intent] = token.path.split('.');
  if (['primary', 'secondary'].includes(tone)) {
    addMany(token.name, hierarchy('--color-foreground'), 'foreground');
    addOrdinarySurfaceTokens(token.name);
    addMany(token.name, [
      '--color-interaction-active-brand',
      '--color-interaction-hover',
      '--color-interaction-pressed',
      '--color-interaction-focus',
    ], 'interaction');
  } else if (tone === 'faint') {
    addMany(token.name, hierarchy('--color-foreground'), 'foreground');
    addRelationship(token.name, `--color-foreground-bold-${intent.toLowerCase()}`, 'foreground');
    addRelationship(token.name, `--color-border-faint-${intent.toLowerCase()}`, 'border');
    addRelationship(token.name, '--color-divider-divider', 'divider');
    addRelationship(token.name, '--color-shimmer-shimmer', 'shimmer');
    addMany(token.name, [
      '--color-interaction-active',
      '--color-interaction-hover',
      '--color-interaction-pressed',
      '--color-interaction-focus',
    ], 'interaction');
  } else if (['medium', 'bold', 'strong'].includes(tone)) {
    addMany(token.name, hierarchy(`--color-foreground-on-${tone}-background`), 'foreground');
    const reciprocal = { medium: 'strong', bold: 'faint', strong: 'medium' }[tone];
    addRelationship(token.name, `--color-foreground-${reciprocal}-${intent.toLowerCase()}`, 'foreground');
    addRelationship(token.name, `--color-border-${tone}-${intent.toLowerCase()}`, 'border');
    addOnToneSurfaceTokens(token.name, tone);
    addMany(token.name, states(`--color-interaction-on-${tone}-background`), 'interaction');
  }
}

// Reciprocal semantic tones form a composition across roles: faint with bold,
// and medium with strong. Make that relationship navigable from the border or
// foreground as well as from the background.
const reciprocalSurface = { faint: 'bold', bold: 'faint', medium: 'strong', strong: 'medium' };
for (const border of tokens.filter(token => token.family === 'border')) {
  const [, tone, intent] = border.path.split('.');
  if (!reciprocalSurface[tone] || !intent) continue;
  const suffix = intent.toLowerCase();
  const background = `--color-background-${reciprocalSurface[tone]}-${suffix}`;
  const foreground = `--color-foreground-${tone}-${suffix}`;
  addRelationship(background, border.name, 'border');
  addRelationship(border.name, foreground, 'semantic-pair');
}

// Literal hue surfaces support both the ordinary hierarchy for their tone and
// the same-hue foreground, plus the complete tone-specific interaction family.
for (const token of tokens.filter(token => token.family === 'color-intent' && token.path.endsWith('.background'))) {
  const [, hue, tone] = token.path.split('.');
  const ordinaryPrefix = tone === 'faint' ? '--color-foreground' : `--color-foreground-on-${tone}-background`;
  addMany(token.name, hierarchy(ordinaryPrefix), 'foreground');
  addRelationship(token.name, `--color-color-intent-${hue}-${tone}-foreground`, 'foreground');
  addRelationship(token.name, `--color-color-intent-${hue}-${tone}-border`, 'border');
  if (tone === 'faint') {
    addRelationship(token.name, '--color-divider-divider', 'divider');
    addRelationship(token.name, '--color-shimmer-shimmer', 'shimmer');
  } else {
    addOnToneSurfaceTokens(token.name, tone);
  }
  addMany(token.name, states(`--color-color-intent-interaction-on-${tone}-background`), 'interaction');
}

// Fixed and specialized contexts keep their foregrounds and state colors inside
// the same family. Driver status and safety score have per-surface foregrounds
// (and, for driver status, per-surface interactions), so preserve that matching.
for (const token of tokens.filter(token => token.path.includes('.background') || token.path === 'translucent.translucent')) {
  const [family, , variant] = token.path.split('.');
  if (['background', 'color-intent'].includes(family)) continue;
  const familyTokens = tokens.filter(candidate => candidate.family === family);
  let foregrounds = familyTokens.filter(candidate => candidate.path.startsWith(`${family}.foreground.`) || candidate.path === `${family}.foreground`);
  let interactions = familyTokens.filter(candidate => candidate.path.startsWith(`${family}.interaction.`));
  const supporting = familyTokens.filter(candidate => ['border', 'divider', 'shimmer'].includes(candidate.path.split('.')[1]));
  if (family === 'driver-status') {
    foregrounds = foregrounds.filter(candidate => candidate.path === `${family}.foreground.${variant}`);
    interactions = interactions.filter(candidate => candidate.path.startsWith(`${family}.interaction.on-${variant}.`));
  } else if (family === 'safety-score') {
    foregrounds = foregrounds.filter(candidate => candidate.path === `${family}.foreground.on-${variant}`);
  }
  addMany(token.name, foregrounds.map(candidate => candidate.name), 'foreground');
  addMany(token.name, interactions.map(candidate => candidate.name), 'interaction');
  for (const candidate of supporting) addRelationship(token.name, candidate.name, candidate.path.split('.')[1]);
}

const output = join(root, 'docs/graph');
mkdirSync(output, { recursive: true });
for (const file of ['index.html', 'graph.css', 'graph.mjs']) {
  copyFileSync(join(root, 'tools/color-graph', file), join(output, file));
}
writeFileSync(join(output, 'colors.css'), compilation.css.colors);
writeFileSync(join(output, 'graph-data.json'), JSON.stringify({
  version: JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).version,
  tokens,
  families,
  intents,
  recipes: guidance.recipes.filter(r => families.some(f => f.recipes?.includes(r.id))),
  pairings: buildActiveMatrix(resolve, chain),
  relationships,
}));
console.log(`  ✓ docs/graph/ (${tokens.length} semantic tokens, both themes)`);

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
}));
console.log(`  ✓ docs/graph/ (${tokens.length} semantic tokens, both themes)`);

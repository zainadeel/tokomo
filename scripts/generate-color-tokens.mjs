import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { compileTokenProject, writeCategoryCss } from './lib/token-compiler.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'src/colors.css');
const compilation = await compileTokenProject({ root });

writeCategoryCss(compilation, 'colors', output);

const count = (layer, mode) => compilation.graph.nodes.filter(
  node => node.category === 'colors' && node.layer === layer && node.values[mode],
).length;
const summary = [
  `reference=${count('reference', 'light')}`,
  `semanticLight=${count('semantic', 'light')}`,
  `semanticDark=${count('semantic', 'dark')}`,
  `dataLight=${count('data', 'light')}`,
  `dataDark=${count('data', 'dark')}`,
].join(' ');

console.log(`Generated ${path.relative(root, output)} (${summary})`);

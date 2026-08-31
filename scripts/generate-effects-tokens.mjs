import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { compileTokenProject, writeCategoryCss } from './lib/token-compiler.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'src/effects.css');
const compilation = await compileTokenProject({ root });

writeCategoryCss(compilation, 'effects', output);

const generated = compilation.graph.nodes.filter(
  node => node.category === 'effects' && node.provenance === 'figma',
).length;
console.log(`    effects: ${generated} tokens generated → src/effects.css`);

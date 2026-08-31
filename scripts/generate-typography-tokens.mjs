import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { compileTokenProject, writeCategoryCss } from './lib/token-compiler.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'src/typography.css');
const compilation = await compileTokenProject({ root });

writeCategoryCss(compilation, 'typography', output);

const count = compilation.graph.nodes.filter(node => node.category === 'typography').length;
console.log(`    typography: ${count} tokens generated → src/typography.css`);

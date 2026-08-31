import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { compileTokenProject, writeCategoryCss } from './lib/token-compiler.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'src/dimensions.css');
const compilation = await compileTokenProject({ root });

writeCategoryCss(compilation, 'dimensions', output);

const count = compilation.graph.nodes.filter(node => node.category === 'dimensions').length;
console.log(`    dimensions: ${count} tokens generated → src/dimensions.css`);

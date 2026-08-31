/**
 * Generate the legacy public JSON artifacts directly from the normalized token graph.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { compileTokenProject, writeDistArtifacts } from './lib/token-compiler.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDir = process.env.TOKOMO_DIST_DIR
  ? path.resolve(process.env.TOKOMO_DIST_DIR)
  : path.join(root, 'dist');
const compilation = await compileTokenProject({ root });

writeDistArtifacts(compilation, distDir, relativePath => relativePath.endsWith('.json'));

for (const category of ['colors', 'dimensions', 'typography', 'effects']) {
  const count = compilation.graph.nodes.filter(node => node.category === category).length;
  console.log(`    ${category}: ${count} tokens → dist/json/${category}.json`);
}
console.log(`    total: ${compilation.graph.nodes.length} tokens → dist/tokens.json`);
console.log('    index: 4 categories → dist/tokens-index.json');

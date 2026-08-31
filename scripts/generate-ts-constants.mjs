/**
 * Generate TypeScript/JavaScript token-name constants from the normalized graph.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { compileTokenProject, writeDistArtifacts } from './lib/token-compiler.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDir = process.env.TOKOMO_DIST_DIR
  ? path.resolve(process.env.TOKOMO_DIST_DIR)
  : path.join(root, 'dist');
const compilation = await compileTokenProject({ root });

writeDistArtifacts(compilation, distDir, relativePath => /^index\.(mjs|cjs|d\.ts)$/.test(relativePath));

console.log(`    TypeScript: ${compilation.graph.nodes.length} token constants → dist/index.{mjs,cjs,d.ts}`);

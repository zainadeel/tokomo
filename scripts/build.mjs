/**
 * Build @ds-mo/tokens from one normalized, validated token graph.
 *
 * All token artifacts are rendered into staging before any committed source or
 * dist output is replaced. Replacement is rolled back if a filesystem step fails.
 */
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  writeFileSync,
} from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { compileTokenProject, writeDistArtifacts } from './lib/token-compiler.mjs';
import { removePath, replaceTransactionally } from './lib/transactional-output.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = path.resolve(__dirname, '..');
const SRC_DIR = path.join(PKG_ROOT, 'src');
const DIST_DIR = path.join(PKG_ROOT, 'dist');
const GENERATED_CATEGORIES = ['colors', 'dimensions', 'typography', 'effects'];
const isWatch = process.argv.includes('--watch');

function stageBuild(compilation) {
  const stageDist = mkdtempSync(path.join(PKG_ROOT, '.tokomo-dist-'));
  try {
    mkdirSync(path.join(stageDist, 'themes'), { recursive: true });
    mkdirSync(path.join(stageDist, 'json'), { recursive: true });

    for (const category of GENERATED_CATEGORIES) {
      writeFileSync(path.join(stageDist, `${category}.css`), compilation.css[category], 'utf8');
    }

    for (const file of ['index.css', 'reset.css', 'globals.css', 'utilities.css']) {
      cpSync(path.join(SRC_DIR, file), path.join(stageDist, file));
    }
    for (const file of ['light.css', 'dark.css']) {
      cpSync(path.join(SRC_DIR, 'themes', file), path.join(stageDist, 'themes', file));
    }

    writeDistArtifacts(compilation, stageDist);
    execFileSync(process.execPath, ['scripts/generate-agent-manifest.mjs'], {
      cwd: PKG_ROOT,
      env: { ...process.env, TOKOMO_DIST_DIR: stageDist },
      stdio: 'inherit',
    });
    return stageDist;
  } catch (error) {
    removePath(stageDist);
    throw error;
  }
}

function prepareSourceCss(compilation) {
  const nonce = `${process.pid}-${Date.now()}`;
  const replacements = [];
  try {
    for (const category of GENERATED_CATEGORIES) {
      const staged = path.join(SRC_DIR, `.${category}.css.${nonce}.tmp`);
      const replacement = {
        staged,
        target: path.join(SRC_DIR, `${category}.css`),
      };
      replacements.push(replacement);
      writeFileSync(staged, compilation.css[category], 'utf8');
    }
    return replacements;
  } catch (error) {
    for (const replacement of replacements) removePath(replacement.staged);
    throw error;
  }
}

async function build() {
  const startTime = Date.now();
  let stageDist;
  let sourceReplacements = [];
  console.log('\n🔨 Building @ds-mo/tokens...\n');

  try {
    console.log('  → Loading, normalizing, and validating token sources...');
    const compilation = await compileTokenProject({ root: PKG_ROOT });

    console.log('  → Rendering CSS, JSON, index, and TypeScript artifacts...');
    stageDist = stageBuild(compilation);
    sourceReplacements = prepareSourceCss(compilation);

    console.log('  → Replacing generated outputs...');
    replaceTransactionally([
      ...sourceReplacements,
      { staged: stageDist, target: DIST_DIR },
    ]);

    const elapsed = Date.now() - startTime;
    console.log(`\n✅ @ds-mo/tokens built (${compilation.graph.nodes.length} tokens) in ${elapsed}ms\n`);
  } catch (error) {
    for (const replacement of sourceReplacements) removePath(replacement.staged);
    if (stageDist) removePath(stageDist);
    throw error;
  }
}

await build();

if (isWatch) {
  console.log('👀 Watching authored token inputs...\n');

  const { watch } = await import('chokidar');
  const watcher = watch([
    path.join(SRC_DIR, 'json'),
    path.join(SRC_DIR, 'agent'),
    path.join(PKG_ROOT, 'agent'),
    path.join(PKG_ROOT, 'scripts/lib/manual-effects.mjs'),
    path.join(SRC_DIR, 'themes'),
    ...['index.css', 'reset.css', 'globals.css', 'utilities.css']
      .map(file => path.join(SRC_DIR, file)),
  ], {
    ignoreInitial: true,
  });

  let debounceTimer = null;
  let rebuildInProgress = false;
  let rebuildQueued = false;
  const runRebuild = async () => {
    if (rebuildInProgress) {
      rebuildQueued = true;
      return;
    }
    rebuildInProgress = true;
    do {
      rebuildQueued = false;
      console.log('♻️  Change detected, rebuilding...');
      try {
        await build();
      } catch (error) {
        console.error(`\n❌ Build failed; watching for the next change.\n${error.stack ?? error}\n`);
      }
    } while (rebuildQueued);
    rebuildInProgress = false;
  };
  const rebuild = () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(runRebuild, 200);
  };

  watcher.on('change', rebuild);
  watcher.on('add', rebuild);
  watcher.on('unlink', rebuild);
  watcher.on('error', error => {
    console.error(`\n❌ Watcher error: ${error.stack ?? error}\n`);
  });
}

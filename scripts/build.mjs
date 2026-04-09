/**
 * Build script for @tokomo/tokens
 *
 * 1. Generates colors.css from JSON token sources (Figma export)
 * 2. Copies all CSS token files to dist/
 * 3. Generates tokens.json (machine-readable format for tooling)
 * 4. Generates TypeScript constants for token names
 */
import { cpSync, mkdirSync, existsSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PKG_ROOT = path.resolve(__dirname, '..');
const SRC_DIR = path.join(PKG_ROOT, 'src');
const DIST_DIR = path.join(PKG_ROOT, 'dist');

const isWatch = process.argv.includes('--watch');

function clean() {
  if (existsSync(DIST_DIR)) {
    rmSync(DIST_DIR, { recursive: true });
  }
}

function build() {
  const startTime = Date.now();
  console.log('\n🔨 Building @tokomo/tokens...\n');

  // Step 1: Clean dist
  clean();
  mkdirSync(DIST_DIR, { recursive: true });
  mkdirSync(path.join(DIST_DIR, 'themes'), { recursive: true });
  mkdirSync(path.join(DIST_DIR, 'json'), { recursive: true });

  // Step 2: Generate CSS files from JSON token sources
  console.log('  → Generating colors.css from Figma token JSON...');
  execSync('node scripts/generate-color-tokens.mjs', { cwd: PKG_ROOT, stdio: 'inherit' });

  console.log('  → Generating dimensions.css from Figma token JSON...');
  execSync('node scripts/generate-dimension-tokens.mjs', { cwd: PKG_ROOT, stdio: 'inherit' });

  console.log('  → Generating typography.css from Figma token JSON...');
  execSync('node scripts/generate-typography-tokens.mjs', { cwd: PKG_ROOT, stdio: 'inherit' });

  console.log('  → Generating effects.css from Figma token JSON...');
  execSync('node scripts/generate-effects-tokens.mjs', { cwd: PKG_ROOT, stdio: 'inherit' });

  // Step 3: Copy CSS files to dist
  console.log('  → Copying CSS token files to dist/...');
  const cssFiles = [
    'index.css',
    'colors.css',
    'dimensions.css',
    'typography.css',
    'effects.css',
    'reset.css',
    'globals.css',
    'utilities.css',
  ];

  for (const file of cssFiles) {
    const src = path.join(SRC_DIR, file);
    const dest = path.join(DIST_DIR, file);
    if (existsSync(src)) {
      cpSync(src, dest);
    } else {
      console.warn(`  ⚠ Missing: ${file}`);
    }
  }

  // Copy theme files
  const themeFiles = ['light.css', 'dark.css'];
  for (const file of themeFiles) {
    const src = path.join(SRC_DIR, 'themes', file);
    const dest = path.join(DIST_DIR, 'themes', file);
    if (existsSync(src)) {
      cpSync(src, dest);
    }
  }

  // Step 4: Generate JSON tokens
  console.log('  → Generating JSON token files...');
  execSync('node scripts/generate-json-tokens.mjs', { cwd: PKG_ROOT, stdio: 'inherit' });

  // Step 5: Generate TypeScript constants
  console.log('  → Generating TypeScript constants...');
  execSync('node scripts/generate-ts-constants.mjs', { cwd: PKG_ROOT, stdio: 'inherit' });

  const elapsed = Date.now() - startTime;
  console.log(`\n✅ @tokomo/tokens built in ${elapsed}ms\n`);
}

build();

if (isWatch) {
  console.log('👀 Watching for changes...\n');

  const { watch } = await import('chokidar');

  const watcher = watch([path.join(SRC_DIR, '**/*.css'), path.join(SRC_DIR, '**/*.json')], {
    ignoreInitial: true,
  });

  let debounceTimer = null;
  const rebuild = () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      console.log('♻️  Change detected, rebuilding...');
      build();
    }, 200);
  };

  watcher.on('change', rebuild);
  watcher.on('add', rebuild);
  watcher.on('unlink', rebuild);
}

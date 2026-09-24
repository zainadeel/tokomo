/**
 * package-label.mjs
 *
 * The site header shows `@ds-mo/tokens vX.Y.Z` on every page. The graph and
 * tool pages are authored as static HTML that also runs standalone, so their
 * source carries the bare package name and the docs build stamps the version.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..', '..');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));

export const packageLabel = `${pkg.name} v${pkg.version}`;

/** Replace the bare name inside `<… data-package-label>` with the versioned label. */
export function stampPackageLabel(html) {
  return html.replace(
    /(<[^>]*\bdata-package-label\b[^>]*>)[^<]*(<)/,
    `$1${packageLabel}$2`,
  );
}

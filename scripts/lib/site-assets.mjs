/** One source for the site's header styles and theme preference behavior. */
import { readFileSync, copyFileSync } from 'node:fs';
import { join } from 'node:path';

const source = new URL('../../tools/site/', import.meta.url);
export const siteCss = readFileSync(new URL('site.css', source), 'utf8');
export const themeScript = readFileSync(new URL('theme.js', source), 'utf8');

export function copySiteAssets(destination) {
  for (const file of ['site.css', 'theme.js']) {
    copyFileSync(new URL(file, source), join(destination, file));
  }
}

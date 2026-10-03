import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { makeResolver, parseCssColor, compositeRgb } from '../scripts/lib/token-colors.mjs';
import { contrastFromY, rgbEncodedToY } from '../tools/color-system/oklch-utils.mjs';

const modes = JSON.parse(await readFile(
  new URL('../dist/json/colors.modes.json', import.meta.url), 'utf8',
));
const resolve = makeResolver(modes);

function contrastOnBackdrop(theme, foreground, backdrop) {
  const surface = compositeRgb(
    parseCssColor(resolve(theme, '--color-translucent-background')), backdrop,
  );
  const content = compositeRgb(parseCssColor(resolve(theme, foreground)), surface);
  return contrastFromY(rgbEncodedToY(content), rgbEncodedToY(surface));
}

test('every semantic bold backdrop supports the documented resting translucent hierarchy', () => {
  for (const theme of ['light', 'dark']) {
    const backdrops = Object.keys(modes[theme]).filter(name => name.startsWith('--color-background-bold-'));
    assert.equal(backdrops.length, 9, 'the boundary must cover every semantic intent');
    for (const name of backdrops) {
      const backdrop = parseCssColor(resolve(theme, name));
      for (const [step, target] of [['primary', 4.5], ['secondary', 4.5], ['tertiary', 3], ['border-primary', 3]]) {
        const foreground = step === 'border-primary'
          ? '--color-translucent-border-primary'
          : `--color-translucent-foreground-${step}`;
        const contrast = contrastOnBackdrop(theme, foreground, backdrop);
        assert.ok(contrast >= target, `${foreground} on translucent over ${name} (${theme}): ${contrast} < ${target}`);
      }
    }
  }
});

test('translucent contrast is conditional even with a uniform backdrop that blur cannot change', () => {
  for (const [theme, css] of [['light', 'rgb(0 0 0)'], ['dark', 'rgb(255 255 255)']]) {
    const contrast = contrastOnBackdrop(
      theme, '--color-translucent-foreground-secondary', parseCssColor(css),
    );
    assert.ok(contrast < 4.5, `${theme} extreme backdrop must not imply a universal secondary-text guarantee`);
  }
});

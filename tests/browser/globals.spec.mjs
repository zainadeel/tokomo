import { readFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';

const css = name => readFileSync(new URL(`../../dist/${name}.css`, import.meta.url), 'utf8');
const tokens = ['colors', 'dimensions', 'typography'].map(css).join('\n');
const globals = css('globals');
const reset = css('reset');

async function fixture(page, theme, reducedMotion = 'no-preference', forcedColors = 'none') {
  await page.emulateMedia({ reducedMotion, forcedColors });
  // Consumer styles intentionally precede globals, as with lazy package imports.
  await page.setContent(`<!doctype html><html data-theme="${theme}"><head>
    <style>${tokens}\n${reset}\n${css(`themes/${theme}`)}</style>
    <style>
      .owned:focus-visible { outline: 4px dashed var(--color-foreground-medium-brand); outline-offset: 5px; }
      .owned { transition: opacity 200ms; }
    </style>
    <style>${globals}</style>
    </head><body>
      <button id="button">Button</button>
      <a id="link" href="#target">Link</a>
      <input id="input" aria-label="Input">
      <textarea id="textarea" aria-label="Textarea"></textarea>
      <select id="select" aria-label="Select"><option>Option</option></select>
      <div id="generic" tabindex="0">Generic focusable target</div>
      <button id="owned" class="owned">Consumer button</button>
      <focus-control id="shadow" tabindex="0" role="switch" aria-checked="false">Custom control</focus-control>
      <button id="shortcut" data-focus-from-shortcut>Shortcut target</button>
    </body></html>`);
  await page.evaluate(() => {
    const host = document.getElementById('shadow');
    host.attachShadow({ mode: 'open' }).innerHTML = `<style>
      :host { display: inline-block; outline: 4px none var(--color-foreground-medium-brand);
        outline-offset: 5px; transition: opacity 200ms; }
      :host(:focus-visible) { outline-style: dashed; }
    </style><slot></slot>`;
  });
}

// Capture at the focus event, then every paint across the old 100ms animation.
// Sampling only the final settled color would miss the black first-frame flash.
async function tabSamples(page, id) {
  await page.evaluate(id => {
    const target = document.getElementById(id);
    window.focusSamples = new Promise(resolve => {
      target.addEventListener('focus', () => {
        const samples = [];
        const sample = () => {
          const style = getComputedStyle(target);
          samples.push({
            color: style.outlineColor, width: style.outlineWidth,
            style: style.outlineStyle, offset: style.outlineOffset,
            transition: style.transitionProperty,
          });
          if (samples.length === 13) resolve(samples);
          else requestAnimationFrame(sample);
        };
        sample();
      }, { once: true });
    });
  }, id);
  // WebKit on macOS requires Option+Tab to include native buttons and links.
  const fullNavigation = page.context().browser().browserType().name() === 'webkit' && process.platform === 'darwin';
  await page.keyboard.press(fullNavigation ? 'Alt+Tab' : 'Tab');
  await expect(page.locator(`#${id}`)).toBeFocused();
  return page.evaluate(() => window.focusSamples);
}

async function resolvedColor(page, value) {
  return page.evaluate(value => {
    const probe = document.createElement('span');
    probe.style.color = value;
    document.body.append(probe);
    const result = getComputedStyle(probe).color;
    probe.remove();
    return result;
  }, value);
}

for (const theme of ['light', 'dark']) {
  for (const motion of ['no-preference', 'reduce']) {
    test(`${theme}, ${motion}: immediate native fallback and component ownership`, async ({ page }) => {
      await fixture(page, theme, motion);
      const nativeColor = await resolvedColor(page, 'var(--color-interaction-focus)');
      const ownedColor = await resolvedColor(page, 'var(--color-foreground-medium-brand)');
      for (const id of ['button', 'link', 'input', 'textarea', 'select']) {
        const samples = await tabSamples(page, id);
        for (const sample of samples) {
          expect(sample).toMatchObject({ color: nativeColor, width: '2px', style: 'solid', offset: '2px' });
        }
      }
      // A generic focusable target retains the browser's keyboard indicator.
      for (const sample of await tabSamples(page, 'generic')) {
        expect(sample.style).not.toBe('none');
        expect(parseFloat(sample.width)).toBeGreaterThan(0);
      }
      for (const id of ['owned', 'shadow']) {
        for (const sample of await tabSamples(page, id)) {
          expect(sample).toMatchObject({ color: ownedColor, width: '4px', style: 'dashed', offset: '5px', transition: 'opacity' });
        }
        const duration = await page.locator(`#${id}`).evaluate(el => getComputedStyle(el).transitionDuration);
        expect(parseFloat(duration)).toBe(motion === 'reduce' ? 0 : 0.2);
      }
    });
  }
}

test('shortcut suppression is explicit and ends when its marker is removed', async ({ page }) => {
  await fixture(page, 'light');
  await page.locator('#shadow').focus();
  const samples = await tabSamples(page, 'shortcut');
  expect(samples.every(sample => sample.style === 'none')).toBe(true);
  await page.locator('#shortcut').evaluate(el => el.removeAttribute('data-focus-from-shortcut'));
  await expect(page.locator('#shortcut')).toHaveCSS('outline-style', 'solid');
});

test('forced colors uses the system focus color', async ({ page, browserName }) => {
  test.skip(browserName === 'webkit', 'WebKit does not emulate forced colors.');
  await fixture(page, 'light', 'no-preference', 'active');
  const systemColor = await resolvedColor(page, 'Highlight');
  for (const sample of await tabSamples(page, 'button')) {
    expect(sample).toMatchObject({ color: systemColor, width: '2px', style: 'solid' });
  }
});

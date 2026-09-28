import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const script = readFileSync(new URL('../tools/site/theme.js', import.meta.url), 'utf8');

function page({ dark = false, saved = null, storage = new Map(), blocked = false } = {}) {
  if (saved !== null) storage.set('tokomo-theme', saved);
  const window = new EventTarget();
  const document = new EventTarget();
  const system = new EventTarget();
  system.matches = dark;
  window.matchMedia = query => {
    assert.equal(query, '(prefers-color-scheme: dark)');
    return system;
  };
  document.documentElement = { dataset: {}, style: {} };
  let buttons = [];
  document.querySelectorAll = () => buttons;
  const localStorage = {
    getItem(key) {
      if (blocked) throw new Error('Storage blocked');
      return storage.get(key) ?? null;
    },
    setItem(key, value) {
      if (blocked) throw new Error('Storage blocked');
      storage.set(key, value);
    },
  };
  runInNewContext(script, { window, document, localStorage, CustomEvent });
  return {
    window, document, storage,
    get preference() { return window.TokomoTheme.preference; },
    get theme() { return document.documentElement.dataset.theme; },
    get active() { return buttons.filter(b => b.pressed === 'true').map(b => b.dataset.themeChoice); },
    ready() {
      buttons = ['light', 'dark', 'system'].map(choice => ({
        dataset: { themeChoice: choice },
        classList: { toggle() {} },
        setAttribute(name, value) {
          assert.equal(name, 'aria-pressed');
          this.pressed = value;
        },
      }));
      document.dispatchEvent(new Event('DOMContentLoaded'));
    },
    choose(choice) {
      const button = buttons.find(b => b.dataset.themeChoice === choice);
      const event = new Event('click');
      Object.defineProperty(event, 'target', { value: { closest: () => button } });
      document.dispatchEvent(event);
    },
    systemChanges(isDark) {
      system.matches = isDark;
      system.dispatchEvent(new Event('change'));
    },
    storedElsewhere(value, key = 'tokomo-theme') {
      if (value === null) storage.delete('tokomo-theme');
      else storage.set(key, value);
      window.dispatchEvent(Object.assign(new Event('storage'), { key, newValue: value }));
    },
    restore() {
      window.dispatchEvent(Object.assign(new Event('pageshow'), { persisted: true }));
    },
  };
}

for (const dark of [false, true]) {
  test(`a fresh page follows the ${dark ? 'dark' : 'light'} OS before its body exists`, () => {
    const p = page({ dark });
    assert.equal(p.theme, dark ? 'dark' : 'light');
    assert.equal(p.document.documentElement.style.colorScheme, p.theme);
    assert.equal(p.preference, 'system');
    assert.equal(p.storage.has('tokomo-theme'), false);
    p.ready();
    assert.deepEqual(p.active, ['system']);
  });
}

test('existing Light/Dark preferences override the OS and survive navigation', () => {
  for (const saved of ['light', 'dark']) {
    const p = page({ saved, dark: saved === 'light' });
    p.ready();
    assert.equal(p.theme, saved);
    assert.deepEqual(p.active, [saved]);
    p.systemChanges(saved === 'dark');
    p.systemChanges(saved === 'light');
    assert.equal(p.theme, saved);
    assert.equal(page({ storage: p.storage }).theme, saved);
  }
});

test('choosing System persists the preference, follows live OS changes, and notifies page content', () => {
  const p = page({ saved: 'light', dark: true });
  p.ready();
  const changes = [];
  p.window.addEventListener('tokomo-theme-change', event => changes.push(event.detail.theme));
  p.choose('system');
  assert.equal(p.storage.get('tokomo-theme'), 'system');
  assert.equal(p.theme, 'dark');
  assert.deepEqual(p.active, ['system']);
  p.systemChanges(false);
  assert.equal(p.theme, 'light');
  assert.deepEqual(p.active, ['system']);
  assert.deepEqual(changes, ['dark', 'light']);
  const next = page({ storage: p.storage, dark: true });
  assert.equal(next.preference, 'system');
  assert.equal(next.theme, 'dark');
});

test('clicking Light or Dark stops following the OS and saves the explicit choice', () => {
  const p = page();
  p.ready();
  for (const choice of ['dark', 'light']) {
    p.choose(choice);
    p.systemChanges(choice === 'light');
    assert.equal(p.theme, choice);
    assert.equal(p.storage.get('tokomo-theme'), choice);
    assert.deepEqual(p.active, [choice]);
  }
});

test('other browser tabs synchronize preferences, including storage removal and clearing', () => {
  const p = page({ dark: true });
  p.ready();
  p.storedElsewhere('light');
  assert.equal(p.theme, 'light');
  assert.deepEqual(p.active, ['light']);
  p.storedElsewhere('dark', 'unrelated');
  assert.equal(p.theme, 'light');
  p.storedElsewhere(null);
  assert.equal(p.theme, 'dark');
  assert.deepEqual(p.active, ['system']);
  p.storedElsewhere('light');
  p.storedElsewhere(null, null);
  assert.deepEqual(p.active, ['system']);
});

test('a page restored from the back/forward cache picks up the latest preference', () => {
  const p = page({ saved: 'light', dark: true });
  p.ready();
  p.storage.set('tokomo-theme', 'system');
  p.restore();
  assert.equal(p.theme, 'dark');
  assert.deepEqual(p.active, ['system']);
});

test('an invalid saved value falls back to System', () => {
  const p = page({ saved: 'invalid', dark: true });
  p.ready();
  assert.equal(p.theme, 'dark');
  assert.deepEqual(p.active, ['system']);
});

test('theme controls still work when local storage is unavailable', () => {
  const p = page({ blocked: true, dark: true });
  p.ready();
  assert.equal(p.theme, 'dark');
  p.choose('light');
  p.restore();
  assert.equal(p.theme, 'light');
  assert.deepEqual(p.active, ['light']);
});

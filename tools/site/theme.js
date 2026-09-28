// Runs synchronously in <head> so the saved/system theme is applied before paint.
(() => {
  const storageKey = 'tokomo-theme';
  const choices = ['light', 'dark', 'system'];
  const system = window.matchMedia('(prefers-color-scheme: dark)');
  const normalize = value => choices.includes(value) ? value : 'system';
  function readPreference(fallback = 'system') {
    try { return normalize(localStorage.getItem(storageKey)); }
    catch { return fallback; }
  }
  let preference = readPreference();
  let theme;

  function apply() {
    theme = preference === 'system' ? (system.matches ? 'dark' : 'light') : preference;
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    document.querySelectorAll('[data-theme-choice]').forEach(button => {
      const active = button.dataset.themeChoice === preference;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    window.dispatchEvent(new CustomEvent('tokomo-theme-change', { detail: { preference, theme } }));
  }

  function setPreference(value) {
    preference = normalize(value);
    try { localStorage.setItem(storageKey, preference); }
    catch { /* The choice still works for this page when storage is unavailable. */ }
    apply();
  }

  window.TokomoTheme = {
    get preference() { return preference; },
    get theme() { return theme; },
    setPreference,
  };
  apply();
  document.addEventListener('DOMContentLoaded', apply, { once: true });
  document.addEventListener('click', event => {
    const button = event.target.closest('button[data-theme-choice]');
    if (button) setPreference(button.dataset.themeChoice);
  });
  system.addEventListener('change', () => {
    if (preference === 'system') apply();
  });
  window.addEventListener('storage', event => {
    if (event.key !== storageKey && event.key !== null) return;
    preference = normalize(event.newValue);
    apply();
  });
  window.addEventListener('pageshow', event => {
    if (!event.persisted) return;
    preference = readPreference(preference);
    apply();
  });
})();

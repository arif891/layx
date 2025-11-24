/**************************************************************************************************
 * Theme manager – drop-in, zero-dependency, framework-agnostic
 * 1.  CSS-only dark / light / auto  (no FOUC)
 * 2.  System change listener        (respects “auto”)
 * 3.  <meta name="theme-color">     (PWA tint bar)
 * 4.  aria-pressed on toggler       (a11y)
 * 5.  dispatch “theme:changed”      (decouple UI)
 * 6.  tiny public API               (Theme.get() / .set() / .toggle())
 * 7.  guarded against double-init   (safe to import many times)
 **************************************************************************************************/
class Theme {
  /* ---------- static façade --------------------------------------------------------------- */
  static _instance = null;

  static get() { return Theme._instance?.getStoredTheme() ?? 'auto'; }
  static set(t) { Theme._instance?.setTheme(t); }
  static toggle() { Theme._instance?.toggleTheme(); }

  /* ---------- ctor ------------------------------------------------------------------------ */
  constructor() {
    if (Theme._instance) return Theme._instance;          // singleton
    Theme._instance = this;

    this.root = document.documentElement;
    this.store = localStorage;
    this.key = 'theme';                                // localStorage key
    this.themes = ['light', 'dark'];                      // allowed values

    this.toggler = document.querySelector('[data-theme-toggle]');
    this.radioGroup = document.querySelector('[data-theme-group]');
    this.updatables = document.querySelectorAll('[data-theme-update]');
    this.metaColor = this._ensureMetaThemeColor();

    this.init();
  }

  /* ---------- public ---------------------------------------------------------------------- */
  init() {
    /* 1. paint ASAP – prevents FOUC */
    this.setTheme(this.getStoredTheme());

    /* 2. listeners */
    this.toggler?.addEventListener('click', () => this.toggleTheme());
    this.radioGroup?.addEventListener('click', e => {
      const btn = e.target.closest('[data-theme-value]');
      if (btn) this.setTheme(btn.dataset.themeValue);
    });

    window.matchMedia('(prefers-color-scheme: dark)')
      .addEventListener('change', () => {
        if (this.getStoredTheme() === 'auto') this.setTheme('auto');
      });
  }

  getStoredTheme() { return this.store.getItem(this.key) || 'auto'; }

  setTheme(theme) {
    if (!['light', 'dark', 'auto'].includes(theme)) return;

    const applied = theme === 'auto' ? this._systemTheme() : theme;
    this.root.setAttribute('theme', applied);
    this.store.setItem(this.key, theme);

    this._syncUI(theme);
    this._updateMeta();
    this._announce(theme);
  }

  toggleTheme() {
    const stored = this.getStoredTheme();
    const active = stored === 'auto' ? this._systemTheme() : stored;
    this.setTheme(active === 'light' ? 'dark' : 'light');
  }

  /* ---------- private --------------------------------------------------------------------- */
  _systemTheme() {
    return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  _syncUI(theme) {
    /* toggler pressed state */
    this.toggler?.setAttribute('aria-pressed', theme === 'dark');

    /* radio buttons */
    this.radioGroup
      ?.querySelectorAll('[data-theme-value]')
      .forEach(btn => btn.classList.toggle('active', btn.dataset.themeValue === theme));

    /* generic updatable elements */
    this.updatables.forEach(el => el.setAttribute('data-theme-update', theme));
  }

  _updateMeta() {
    const color = getComputedStyle(this.root)
      .getPropertyValue('--bg-color')
      .trim() || (this.root.getAttribute('theme') === 'dark' ? '#000' : '#fff');
    this.metaColor.setAttribute('content', color);
  }

  _ensureMetaThemeColor() {
    let meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'theme-color');
      document.head.appendChild(meta);
    }
    return meta;
  }

  _announce(theme) {
    this.root.dispatchEvent(new CustomEvent('theme:changed', { detail: { theme } }));
  }
}

// Initialize Theme
export default new Theme();
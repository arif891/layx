/**************************************************************************************************
 * Theme manager – drop-in, zero-dependency, framework-agnostic
 * 1.  System change listener        (respects “auto”)
 * 2.  <meta name="theme-color">     (PWA tint bar)
 * 3.  dispatch “theme-changed”      (decouple UI)
 * 4.  tiny public API               (Theme.get() / .set() / .toggle())
 * 5.  guarded against double-init   (safe to import many times)
 **************************************************************************************************/
class Theme {
  /* ---------- static façade --------------------------------------------------------------- */
  static _i = null;                                    // private singleton

  static get() { return Theme._i?._stored ?? 'auto'; }
  static set(t) { Theme._i?._set(t); }
  static toggle() { Theme._i?._toggle(); }

  /* ---------- constants ------------------------------------------------------------------- */
  static STORAGE_KEY = 'theme';
  static THEMES = Object.freeze(['light', 'dark', 'auto']);

  /* ---------- ctor ------------------------------------------------------------------------ */
  constructor() {
    if (Theme._i) return Theme._i;
    Theme._i = this;

    this._root = document.documentElement;
    this._media = matchMedia('(prefers-color-scheme: dark)');

    this._raf = 0;

    this._stored = this._load();
    this._apply(this._stored);
    this._wire();
  }

  /* ---------- public ---------------------------------------------------------------------- */
  _set(next) {
    if (!Theme.THEMES.includes(next)) return void console.warn(`[Theme] invalid value "${next}"`);
    if (next === this._stored) return;
    this._stored = next;
    try { localStorage.setItem(Theme.STORAGE_KEY, next); } catch {}
    this._apply(next);
  }

  _toggle() {
    const active = this._stored === 'auto' ? this._sys() : this._stored;
    this._set(active === 'light' ? 'dark' : 'light');
  }

  destroy() {
    document.removeEventListener('click', this._onClick, true);
    this._media.removeEventListener('change', this._onMedia);
    window.removeEventListener('storage', this._onStorage);
    Theme._i = null;
  }

  /* ---------- private --------------------------------------------------------------------- */
  _load() {
    try {
      const v = localStorage.getItem(Theme.STORAGE_KEY);
      return Theme.THEMES.includes(v) ? v : 'auto';
    } catch { return 'auto'; }
  }

  _sys() { return this._media.matches ? 'dark' : 'light'; }

  _apply(theme) {
    const effective = theme === 'auto' ? this._sys() : theme;
    this._root.setAttribute('theme', effective);
    this._syncUI(theme);
    this._paintMeta();
    this._announce(theme, effective);
  }

  _wire() {
    this._ensureMeta();
    this._paintMeta(true);

    this._onClick = (e) => {
      const t = e.target.closest('[data-theme-set], [data-theme-toggle]');
      if (!t) return;
      t.dataset.themeSet ? this._set(t.dataset.themeSet) : this._toggle();
    };

    this._onMedia = () => this._stored === 'auto' && this._apply('auto');
    this._onStorage = (e) => e.key === Theme.STORAGE_KEY && this._set(e.newValue ?? 'auto');

    document.addEventListener('click', this._onClick, { passive: true, capture: true });
    this._media.addEventListener('change', this._onMedia, { passive: true });
    window.addEventListener('storage', this._onStorage);
  }

  _syncUI(theme) {
    document.querySelectorAll('[data-theme-update]').forEach(el => el.setAttribute('data-theme-update', theme));
  }

  _ensureMeta() {
    this._meta = document.querySelector('meta[name="theme-color"]')
    || Object.assign(document.head.appendChild(document.createElement('meta')), { name: 'theme-color' });
    if (!this._meta.content) this._meta.dataset.update = 'true';
  }

  _paintMeta(initial = false) {
    if (this._meta?.dataset.update !== 'true') return;
    cancelAnimationFrame(this._raf);
    const color = getComputedStyle(document.body).backgroundColor;

    this._meta.content = color;
    if (initial) return;

    const { transitionProperty, transitionDuration } = getComputedStyle(document.body);
    const dur = parseFloat(transitionDuration) * (transitionDuration.includes('ms') ? 1 : 1000);
    const isBgTransition = /\b(background|background-color|all)\b/.test(transitionProperty);

    if (!isBgTransition || dur <= 0) return this._meta.content = color;

    const start = performance.now();
    const loop = (t) => {
      this._meta.content = getComputedStyle(document.body).backgroundColor;
      if (t - start < dur) this._raf = requestAnimationFrame(loop);
    };
    this._raf = requestAnimationFrame(loop);
  }

  _announce(theme, applied) {
    this._root.dispatchEvent(new CustomEvent('theme-changed', { detail: { theme, applied } }));
  }
}

export default new Theme();
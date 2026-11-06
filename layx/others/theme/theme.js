/**
 * Theme manager – drop-in, zero-dependency, framework-agnostic
 * 1. System change listener (respects "auto")
 * 2. <meta name="theme-color"> (PWA tint bar synchronization)
 * 3. View Transitions API integration (smooth cross-fade when supported)
 * 4. Dispatches "theme-changed" event (decoupled UI)
 * 5. Full accessibility (aria-pressed, aria-label sync)
 * 6. SSR safe & ESM exported (safe to import anywhere)
 * 7. Anti-FOUC helper script included
 */
class Theme {
  /* ---------- static façade --------------------------------------------------------------- */
  static _i = null; // private singleton

  static get() { return Theme._i?._stored ?? 'auto'; }
  static get resolved() { return Theme._i?.resolved ?? (Theme._systemMatches() ? 'dark' : 'light'); }
  static get system() { return Theme._systemMatches() ? 'dark' : 'light'; }
  static set(t, options) { Theme._i?._set(t, options); }
  static toggle(options) { Theme._i?._toggle(options); }
  static init() { return Theme._i || (typeof window !== 'undefined' ? new Theme() : null); }

  /* ---------- anti-FOUC inline snippet ---------------------------------------------------- */
  static headScript = `!(function(){try{var t=localStorage.getItem('theme'),m=window.matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.setAttribute('theme',t==='auto'||!t?(m?'dark':'light'):t)}catch(e){}})();`;

  /* ---------- constants ------------------------------------------------------------------- */
  static STORAGE_KEY = 'theme';
  static THEMES = Object.freeze(['light', 'dark', 'auto']);

  static _systemMatches() {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  /* ---------- ctor ------------------------------------------------------------------------ */
  constructor() {
    if (Theme._i) return Theme._i;
    Theme._i = this;

    this._raf = 0;
    this._stored = 'auto';

    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    this._root = document.documentElement;
    this._media = typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-color-scheme: dark)') : null;
    this._reducedMotion = typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;

    this._stored = this._load();
    this._apply(this._stored, false);
    this._wire();
  }

  /* ---------- public properties ----------------------------------------------------------- */
  get resolved() {
    return this._stored === 'auto' ? this._sys() : this._stored;
  }

  /* ---------- public methods -------------------------------------------------------------- */
  _set(next, { transition = true } = {}) {
    if (!Theme.THEMES.includes(next)) return void console.warn(`[Theme] invalid value "${next}"`);
    if (next === this._stored) return;
    this._stored = next;
    try { localStorage.setItem(Theme.STORAGE_KEY, next); } catch {}
    this._apply(next, transition);
  }

  _toggle({ transition = true } = {}) {
    const active = this.resolved;
    this._set(active === 'light' ? 'dark' : 'light', { transition });
  }

  destroy() {
    if (typeof document !== 'undefined') {
      document.removeEventListener('click', this._onClick, true);
    }
    if (this._media) {
      if (typeof this._media.removeEventListener === 'function') {
        this._media.removeEventListener('change', this._onMedia);
      } else if (typeof this._media.removeListener === 'function') {
        this._media.removeListener(this._onMedia);
      }
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', this._onStorage);
      if (typeof cancelAnimationFrame === 'function') cancelAnimationFrame(this._raf);
    }
    Theme._i = null;
  }

  /* ---------- private --------------------------------------------------------------------- */
  _load() {
    try {
      const v = localStorage.getItem(Theme.STORAGE_KEY);
      return Theme.THEMES.includes(v) ? v : 'auto';
    } catch { return 'auto'; }
  }

  _sys() {
    return this._media?.matches ? 'dark' : 'light';
  }

  _apply(theme, withTransition = true) {
    if (!this._root) return;
    const effective = theme === 'auto' ? this._sys() : theme;

    const commitTheme = () => {
      this._root.setAttribute('theme', effective);
      this._syncUI(theme, effective);
      this._paintMeta();
      this._announce(theme, effective);
    };

    const canTransition = withTransition &&
      typeof document !== 'undefined' &&
      typeof document.startViewTransition === 'function' &&
      !(this._reducedMotion?.matches);

    if (canTransition) {
      try {
        document.startViewTransition(() => {
          commitTheme();
        });
      } catch {
        commitTheme();
      }
    } else {
      commitTheme();
    }
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

    this._onStorage = (e) => {
      if (e.key !== Theme.STORAGE_KEY) return;
      const next = Theme.THEMES.includes(e.newValue) ? e.newValue : 'auto';
      if (next === this._stored) return;
      this._stored = next;
      this._apply(next, false);
    };

    document.addEventListener('click', this._onClick, { passive: true, capture: true });

    if (this._media) {
      if (typeof this._media.addEventListener === 'function') {
        this._media.addEventListener('change', this._onMedia, { passive: true });
      } else if (typeof this._media.addListener === 'function') {
        this._media.addListener(this._onMedia);
      }
    }

    window.addEventListener('storage', this._onStorage);
  }

  _syncUI(theme, effective) {
    if (typeof document === 'undefined') return;

    // Update data-theme-update elements (for icon or text feedback)
    document.querySelectorAll('[data-theme-update]').forEach(el => {
      el.setAttribute('data-theme-update', theme);
      if (el.hasAttribute('data-theme-text')) {
        el.textContent = theme.charAt(0).toUpperCase() + theme.slice(1);
      }
    });

    // Update data-theme-set buttons (active state + aria-pressed)
    document.querySelectorAll('[data-theme-set]').forEach(el => {
      const isCurrent = el.dataset.themeSet === theme;
      el.classList.toggle('active', isCurrent);
      el.setAttribute('aria-pressed', isCurrent ? 'true' : 'false');
    });

    // Update data-theme-toggle buttons (current state + accessible label)
    document.querySelectorAll('[data-theme-toggle]').forEach(el => {
      el.setAttribute('data-theme-current', effective);
      const next = effective === 'dark' ? 'light' : 'dark';
      el.setAttribute('aria-label', `Switch to ${next} theme`);
    });
  }

  _ensureMeta() {
    if (typeof document === 'undefined' || !document.head) return;
    this._meta = document.querySelector('meta[name="theme-color"]');
    if (!this._meta) {
      this._meta = document.createElement('meta');
      this._meta.setAttribute('name', 'theme-color');
      document.head.appendChild(this._meta);
    }
  }

  _paintMeta(initial = false) {
    if (!this._meta || this._meta.dataset.themeIgnore === 'true') return;
    if (typeof cancelAnimationFrame === 'function') cancelAnimationFrame(this._raf);

    if (typeof document === 'undefined' || !document.body) return;

    const resolveColor = () => {
      const bg = typeof getComputedStyle === 'function' ? getComputedStyle(document.body).backgroundColor : null;
      if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') return bg;
      const rootBg = typeof getComputedStyle === 'function' && this._root ? getComputedStyle(this._root).backgroundColor : null;
      if (rootBg && rootBg !== 'rgba(0, 0, 0, 0)' && rootBg !== 'transparent') return rootBg;
      return this.resolved === 'dark' ? '#000000' : '#ffffff';
    };

    const color = resolveColor();
    this._meta.content = color;
    if (initial) return;

    if (typeof getComputedStyle !== 'function') return;
    const { transitionProperty, transitionDuration } = getComputedStyle(document.body);
    const dur = parseFloat(transitionDuration) * (transitionDuration?.includes('ms') ? 1 : 1000);
    const isBgTransition = /\b(background|background-color|all)\b/.test(transitionProperty);

    if (!isBgTransition || dur <= 0 || typeof requestAnimationFrame !== 'function') return;

    const start = performance.now();
    const loop = (t) => {
      this._meta.content = resolveColor();
      if (t - start < dur) {
        this._raf = requestAnimationFrame(loop);
      }
    };
    this._raf = requestAnimationFrame(loop);
  }

  _announce(theme, applied) {
    if (this._root && typeof CustomEvent === 'function') {
      this._root.dispatchEvent(new CustomEvent('theme-changed', { detail: { theme, applied } }));
    }
  }
}

const themeInstance = typeof window !== 'undefined' ? new Theme() : null;

export { Theme };
export default themeInstance;

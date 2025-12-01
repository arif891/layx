/**
 * MouseTracker
 * Minimal API, smaller, faster, safer – no rect cache, no external listeners.
 */
class MouseTracker {
  constructor(selector = '[data-mouse-track]') {
    this.selector = selector;
    this.trackers = new Map();
    this._x = 0;
    this._y = 0;
    this._raf = null;
    this._mv = null;
    this._ttl = 100; // cache lifetime (ms)
    this.init();
  }

  /* ---------- public ---------- */
  init() {
    this.destroy();
    document.querySelectorAll(this.selector).forEach(el => this.addElement(el));
    if (this.trackers.size) this._attachGlobals();
  }

  addElement(el) {
    if (this.trackers.has(el)) return;
    const isDoc = el === document.documentElement || el === document.body;
    const state = {
      el,
      isDoc,
      norm: el.dataset.mouseTrack === 'normalized',
      hover: isDoc,
      lastX: NaN,
      lastY: NaN,
      cache: null // {rect, ts}
    };

    if (!isDoc) {
      el.addEventListener('mouseenter', this._enter, { passive: true });
      el.addEventListener('mouseleave', this._leave, { passive: true });
    }
    this.trackers.set(el, state);
  }

  untrackElement(el) {
    const s = this.trackers.get(el);
    if (!s) return;
    if (!s.isDoc) {
      s.el.removeEventListener('mouseenter', this._enter);
      s.el.removeEventListener('mouseleave', this._leave);
    }
    this.trackers.delete(el);
  }

  destroy() {
    cancelAnimationFrame(this._raf);
    if (this._mv) {
      document.removeEventListener('mousemove', this._mv, { passive: true });
      this._mv = null;
    }
    this.trackers.clear();
    this._raf = null;
  }

  /* ---------- private ---------- */
  _attachGlobals() {
    if (this._mv) return;
    this._mv = e => { this._x = e.clientX; this._y = e.clientY; this._schedule(); };
    document.addEventListener('mousemove', this._mv, { passive: true });
  }

  _enter = e => {
    const s = this.trackers.get(e.currentTarget);
    if (s) s.hover = true;
  };

  _leave = e => {
    const s = this.trackers.get(e.currentTarget);
    if (s) {
      s.hover = false;
      if (s.norm) this._write(s, 0, 0);
    }
  };

  _schedule() {
    if (this._raf === null) this._raf = requestAnimationFrame(() => this._tick());
  }

  _getRect(s) {
    const now = performance.now();
    if (!s.cache || now - s.cache.ts > this._ttl) {
      s.cache = { rect: s.el.getBoundingClientRect(), ts: now };
    }
    return s.cache.rect;
  }

  _tick() {
    this._raf = null;
    const x = this._x, y = this._y;
    for (const s of this.trackers.values()) {
      if (!s.hover) continue;
      let vx = x, vy = y;
      if (!s.isDoc) {
        const r = this._getRect(s); // cached or fresh
        if (x < r.left || x > r.right || y < r.top || y > r.bottom) continue;
        if (s.norm) {
          vx = ((x - r.left) / r.width) * 2 - 1;
          vy = ((y - r.top) / r.height) * 2 - 1;
          vx = Math.max(-1, Math.min(1, vx));
          vy = Math.max(-1, Math.min(1, vy));
        } else {
          vx = x - r.left;
          vy = y - r.top;
        }
      }
      if (vx !== s.lastX || vy !== s.lastY) {
        this._write(s, vx, vy);
        s.lastX = vx;
        s.lastY = vy;
      }
    }
  }

  _write(s, x, y) {
    const unit = s.norm ? '' : 'px';
    s.el.style.setProperty('--mouse-x',
      `${s.norm ? Math.round(x * 100) / 100 : Math.round(x)}${unit}`);
    s.el.style.setProperty('--mouse-y',
      `${s.norm ? Math.round(y * 100) / 100 : Math.round(y)}${unit}`);
  }
}


export default new MouseTracker();
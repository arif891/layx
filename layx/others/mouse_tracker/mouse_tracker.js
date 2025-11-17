/**
 * MouseTracker
 * Minimal API, smaller, faster, safer.
 */
class MouseTracker {
  constructor(selector = '[data-mouse-track]') {
    this.selector   = selector;
    this.trackers   = new Map();
    this._x         = 0;                       // current mouse coords
    this._y         = 0;
    this._raf       = null;                    // shared rAF id
    this._mv        = null;                    // bound mouse-move handler

    /*  create shared RO here, once  */
    this._ro = new ResizeObserver(() => this.refresh());
    this.init();
  }

  /* ---------- public ---------- */
  init() {
    this.destroy();                            // allow re-init
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
      rect: null,                              // cached bounding rect
      hover: isDoc,                            // document is always “hovered”
      lastX: NaN,                              // NaN → always update first frame
      lastY: NaN
    };

    if (!isDoc) {
      state.rect = el.getBoundingClientRect();
      el.addEventListener('mouseenter', this._enter, { passive: true });
      el.addEventListener('mouseleave', this._leave, { passive: true });
      this._ro.observe(el);                    // one RO for every tracked node
    }
    this.trackers.set(el, state);
  }

  untrackElement(el) {
    const s = this.trackers.get(el);
    if (!s) return;
    if (!s.isDoc) {
      s.el.removeEventListener('mouseenter', this._enter);
      s.el.removeEventListener('mouseleave', this._leave);
      this._ro.unobserve(s.el);
    }
    this.trackers.delete(el);
  }

  refresh() {                                  // update all cached rects
    this.trackers.forEach(s => {
      if (!s.isDoc) s.rect = s.el.getBoundingClientRect();
    });
  }

   destroy() {
    cancelAnimationFrame(this._raf);
    if (this._mv)  document.removeEventListener('mousemove', this._mv, { passive: true });
    this._ro.disconnect(); 
    this.trackers.clear();
    this._raf = this._mv = null;
  }

  /* ---------- private ---------- */
 _attachGlobals() {
    if (this._mv) return;
    this._mv = e => { this._x = e.clientX; this._y = e.clientY; this._schedule(); };
    document.addEventListener('mousemove', this._mv, { passive: true });
  }


 _enter = e => {
    const s = this.trackers.get(e.currentTarget);
    if (s) s.hover = true;          // guard
  };
  _leave = e => {
    const s = this.trackers.get(e.currentTarget);
    if (s) {
      s.hover = false;
      this._write(s, 0, 0);
    }
  };

  _schedule() {
    if (this._raf === null) this._raf = requestAnimationFrame(() => this._tick());
  }

  _tick() {
    this._raf = null;
    const x = this._x, y = this._y;
    for (const s of this.trackers.values()) {
      if (!s.hover) continue;                  // outside element
      let vx = x, vy = y;
      if (!s.isDoc) {
        const r = s.rect;
        if (x < r.left || x > r.right || y < r.top || y > r.bottom) continue;
        if (s.norm) {
          vx = ((x - r.left) / r.width)  * 2 - 1;
          vy = ((y - r.top)  / r.height) * 2 - 1;
          vx = Math.max(-1, Math.min(1, vx));
          vy = Math.max(-1, Math.min(1, vy));
        } else {
          vx = x - r.left;
          vy = y - r.top;
        }
      }
      if (vx !== s.lastX || vy !== s.lastY) {
        this._write(s, vx, vy);
        s.lastX = vx; s.lastY = vy;
      }
    }
  }

  _write(s, x, y) {
    const unit = s.norm ? '' : 'px';
    // keep rounding to kill sub-pixel junk
    s.el.style.setProperty('--mouse-x', `${s.norm ? Math.round(x * 100) / 100 : Math.round(x)}${unit}`);
    s.el.style.setProperty('--mouse-y', `${s.norm ? Math.round(y * 100) / 100 : Math.round(y)}${unit}`);
  }
}


export default new MouseTracker();
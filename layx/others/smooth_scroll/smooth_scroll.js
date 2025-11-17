/*********************************************************************
 *  SmoothScroll – zero-dependency, no-touch, minimal API surface
 *********************************************************************/
class SmoothScroll {
  /* ---------- static ------------------------------------------------ */
  static EASING = {
    linear: t => t,
    easeOutCubic: t => 1 - Math.pow(1 - t, 3),
  };

  /* ---------- ctor -------------------------------------------------- */
  constructor(opts = {}) {
    this.ease = opts.ease ?? 0.025;
    this.threshold = opts.threshold ?? .1;   // px under which we snap
    this.easing = this._validateEasing(opts.easing ?? 'easeOutCubic');

    this.target = window.scrollY;           // where we want to be
    this.current = window.scrollY;          // where we are
    this.isRunning = false;
    this.raf = 0;

    this.events = { start: [], update: [], complete: [], interrupt: [] };

    this._wheel = this._wheel.bind(this);
    this._native = this._native.bind(this);
    this._keys = this._keys.bind(this);
    this._tick = this._tick.bind(this);

    if (window.__smoothScrollInstance) {
      console.warn('Smooth Scroll already initialized.'); return
    }

    this._addListeners();
    window.__smoothScrollInstance = this;   // keep singleton reachable
  }

  /* ---------- public event bus ------------------------------------- */
  on(ev, cb) {
    (this.events[ev] ??= []).push(cb);
    return this;
  }
  off(ev, cb) {
    if (this.events[ev])
      this.events[ev] = this.events[ev].filter(f => f !== cb);
    return this;
  }
  emit(ev, detail = {}) {
    this.events[ev]?.forEach(fn => {
      try { fn({ ...detail, target: this }); }
      catch (e) { console.error(`[SmoothScroll] ${ev} callback error`, e); }
    });
  }

  /* ---------- public scroll-to ------------------------------------- */
  scrollTo(y) {
    this.target = this._clamp(y);
    this._start();
  }

  /* ---------- public destroy --------------------------------------- */
  destroy() {
    this._stop();
    removeEventListener('wheel', this._wheel, { passive: false });
    removeEventListener('scroll', this._native);
    removeEventListener('keydown', this._keys);
    document.documentElement.style.scrollBehavior = '';
  }

  /* ---------- private ---------------------------------------------- */
  _validateEasing(e) {
    if (typeof e === 'function') return e;
    if (SmoothScroll.EASING[e]) return SmoothScroll.EASING[e];
    console.warn(`[SmoothScroll] unknown easing “${e}” → linear`);
    return SmoothScroll.EASING.linear;
  }
  _clamp(y) {
    const max = document.documentElement.scrollHeight - innerHeight;
    return Math.max(0, Math.min(y, max));
  }
  _addListeners() {
    addEventListener('wheel', this._wheel, { passive: false });
    addEventListener('scroll', this._native, { passive: true });
    addEventListener('keydown', this._keys);
  }
  _wheel(e) {
    e.preventDefault();
    this.target = this._clamp(this.target + e.deltaY);
    this._start();
  }
  _native() {
    if (!this.isRunning) {
      this.current = this.target = window.scrollY;
    }
  }
  _keys(e) {
    const map = {
      PageUp: -innerHeight,
      PageDown: innerHeight,
      Home: 0,
      End: document.documentElement.scrollHeight,
    };
    if (map[e.key] == null) return;
    e.preventDefault();
    if (this.isRunning) this.emit('interrupt');
    this.target = ['Home', 'End'].includes(e.key)
      ? map[e.key]
      : this.target + map[e.key];
    this.target = this._clamp(this.target);
    this._start();
  }
  _start() {
    if (this.isRunning) return;
    this.isRunning = true;
    document.documentElement.style.scrollBehavior = 'auto';
    this.emit('start');
    this.raf = requestAnimationFrame(this._tick);
  }
  _stop() {
    this.isRunning = false;
    cancelAnimationFrame(this.raf);
    document.documentElement.style.scrollBehavior = '';
  }
  _tick() {
    const dy = this.target - this.current;
    if (Math.abs(dy) < this.threshold) {
      this.current = this.target;
      scrollTo(0, this.current);
      this._stop();
      this.emit('complete', { finalScroll: this.current });
      return;
    }
    const fn = this.easing;
    const norm = Math.min(1, Math.abs(dy) / innerHeight);
    this.current += dy * this.ease * (1 + fn(1 - norm));
    scrollTo(0, Math.round(this.current));
    this.emit('update', { currentScroll: this.current, diff: dy });
    this.raf = requestAnimationFrame(this._tick);
  }
}

export default new SmoothScroll();
export { SmoothScroll };
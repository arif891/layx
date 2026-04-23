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
    if (window.__smoothScrollInstance) {
      console.warn('Smooth Scroll already initialized.');
      return window.__smoothScrollInstance;
    }

    this.lerp              = opts.lerp              ?? document.documentElement.dataset.lerp      ?? .1 / 4;
    this.threshold         = opts.threshold         ?? document.documentElement.dataset.threshold ?? 1;
    this.easing            = this._validateEasing(opts.easing ?? document.documentElement.dataset.easing ?? 'easeOutCubic');
    this.preventWithKeys   = opts.preventWithKeys   ?? true;
    this.preventWithAttribute = opts.preventWithAttribute ?? true;
    this.targetFPS         = opts.targetFPS         ?? 60;

    this.target      = window.scrollY;
    this.current     = window.scrollY;
    this.scrollLocked = false;
    this.isRunning   = false;
    this.raf         = 0;
    this.lastTime    = 0;

    // Per-element scroll state: Map<Element, { target, current, raf, lastTime, isRunning }>
    this.elements = new Map();

    this.events = { start: [], update: [], complete: [], interrupt: [] };

    this._wheel  = this._wheel.bind(this);
    this._native = this._native.bind(this);
    this._keys   = this._keys.bind(this);
    this._tick   = this._tick.bind(this);

    this._addListeners();
    window.__smoothScrollInstance = this;
  }

  /* ---------- public event bus ------------------------------------- */
  on(ev, cb)  { (this.events[ev] ??= []).push(cb); return this; }
  off(ev, cb) { if (this.events[ev]) this.events[ev] = this.events[ev].filter(f => f !== cb); return this; }
  emit(ev, detail = {}) {
    this.events[ev]?.forEach(fn => {
      try { fn({ ...detail, target: this }); }
      catch (e) { console.error(`[SmoothScroll] ${ev} callback error`, e); }
    });
  }

  /* ---------- public ----------------------------------------------- */
  scrollTo(y) {
    this.target = this._clamp(y);
    this._start();
  }

  destroy() {
    this._stop();
    // Cancel any in-flight element animations
    for (const state of this.elements.values()) cancelAnimationFrame(state.raf);
    this.elements.clear();
    removeEventListener('wheel', this._wheel, { passive: false });
    removeEventListener('scroll', this._native);
    removeEventListener('keydown', this._keys);
    document.documentElement.style.scrollBehavior = '';
    delete window.__smoothScrollInstance;
  }

  /* ---------- private – root scroll -------------------------------- */
  _validateEasing(e) {
    if (typeof e === 'function') return e;
    if (SmoothScroll.EASING[e]) return SmoothScroll.EASING[e];
    console.warn(`[SmoothScroll] unknown easing "${e}" → linear`);
    return SmoothScroll.EASING.linear;
  }
  _clamp(y) {
    return Math.max(0, Math.min(y, document.documentElement.scrollHeight - innerHeight));
  }
  _clampEl(el, y) {
    return Math.max(0, Math.min(y, el.scrollHeight - el.clientHeight));
  }
  _addListeners() {
    addEventListener('wheel', this._wheel, { passive: false });
    addEventListener('scroll', this._native, { passive: true });
    addEventListener('keydown', this._keys);
  }

  /* ---------- private – wheel handler ------------------------------ */
  _wheel(e) {
    if (this.preventWithKeys && (e.shiftKey || e.altKey || e.ctrlKey || e.metaKey)) return;

    // "prevent" zone – bail out of smooth scroll entirely
    if (this.preventWithAttribute && e.target.closest('[data-smooth-scroll="prevent"]')) {
      if (this.isRunning) this.emit('interrupt');
      this._stop();
      return;
    }

    // "self" zone – scroll the element, not the root
    const selfEl = e.target.closest('[data-smooth-scroll="self"]');
    if (selfEl) {
      // Only intercept if the element can actually scroll in that direction
      const canScroll =
        (e.deltaY > 0 && selfEl.scrollTop < selfEl.scrollHeight - selfEl.clientHeight) ||
        (e.deltaY < 0 && selfEl.scrollTop > 0);
      if (canScroll) {
        e.preventDefault();
        this._scrollElement(selfEl, e.deltaY);
        return;
      }
      // Element is at its boundary → fall through to root scroll
    }

    if (this.scrollLocked) return;
    e.preventDefault();
    this.target = this._clamp(this.target + e.deltaY);
    this._start();
  }

  /* ---------- private – per-element smooth scroll ------------------ */
  _scrollElement(el, delta) {
    let state = this.elements.get(el);
    if (!state) {
      state = {
        target:    el.scrollTop,
        current:   el.scrollTop,
        raf:       0,
        lastTime:  0,
        isRunning: false,
      };
      this.elements.set(el, state);
    }

    state.target = this._clampEl(el, state.target + delta);
    if (!state.isRunning) this._startElement(el, state);
  }

  _startElement(el, state) {
    state.isRunning = true;
    state.lastTime  = performance.now();
    state.raf = requestAnimationFrame(t => this._tickElement(el, state, t));
  }

  _tickElement(el, state, currentTime) {
    const deltaTime      = currentTime - state.lastTime;
    state.lastTime       = currentTime;
    const deltaMultiplier = deltaTime / (1000 / this.targetFPS);

    const dy = state.target - state.current;
    if (Math.abs(dy) < this.threshold) {
      state.current   = state.target;
      el.scrollTop    = state.current;
      state.isRunning = false;
      return;
    }

    const norm      = Math.min(1, Math.abs(dy) / el.clientHeight);
    state.current  += dy * this.lerp * (1 + this.easing(1 - norm)) * deltaMultiplier;
    el.scrollTop    = state.current;
    state.raf       = requestAnimationFrame(t => this._tickElement(el, state, t));
  }

  /* ---------- private – root tick ---------------------------------- */
  _native() {
    if (!this.isRunning) this.current = this.target = window.scrollY;
  }
  _keys(e) {
    const map = {
      PageUp: -window.innerHeight, PageDown: window.innerHeight,
      Home: 0, End: document.documentElement.scrollHeight,
      ArrowUp: -50, ArrowDown: 50, ' ': window.innerHeight,
    };
    if (this.scrollLocked) return;
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;
    if (map[e.key] == null) return;
    e.preventDefault();
    if (this.isRunning) this.emit('interrupt');
    this.target = ['Home', 'End'].includes(e.key) ? map[e.key] : this.target + map[e.key];
    this.target = this._clamp(this.target);
    this._start();
  }
  _start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime  = performance.now();
    document.documentElement.style.scrollBehavior = 'auto';
    this.emit('start');
    this.raf = requestAnimationFrame(this._tick);
  }
  _stop() {
    this.isRunning = false;
    cancelAnimationFrame(this.raf);
    document.documentElement.style.scrollBehavior = '';
  }
  _tick(currentTime) {
    const deltaTime       = currentTime - this.lastTime;
    this.lastTime         = currentTime;
    const deltaMultiplier = deltaTime / (1000 / this.targetFPS);

    const dy = this.target - this.current;
    if (Math.abs(dy) < this.threshold) {
      this.current = this.target;
      scrollTo(0, this.current);
      this._stop();
      this.emit('complete', { finalScroll: this.current });
      return;
    }

    const norm = Math.min(1, Math.abs(dy) / innerHeight);
    this.current += dy * this.lerp * (1 + this.easing(1 - norm)) * deltaMultiplier;
    scrollTo(0, this.current);
    this.emit('update', { currentScroll: this.current, diff: dy });
    this.raf = requestAnimationFrame(this._tick);
  }
}

export default SmoothScroll;
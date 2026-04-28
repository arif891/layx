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
      console.warn('[SmoothScroll] already initialized.');
      return window.__smoothScrollInstance;
    }

    const docData = document.documentElement.dataset;
    const parseNum = (val, fallback) => {
      if (val == null || val === '') return fallback;
      const n = Number(val);
      return !isNaN(n) ? n : fallback;
    };

    this.lerp              = parseNum(opts.lerp ?? docData.lerp, 0.025);
    this.threshold         = parseNum(opts.threshold ?? docData.threshold, 1);
    this.targetFPS         = parseNum(opts.targetFPS ?? docData.targetFps, 60);
    this.preventWithKeys   = opts.preventWithKeys ?? true;
    this.preventWithAttribute = opts.preventWithAttribute ?? true;
    this.easing            = this._validateEasing(opts.easing ?? docData.easing ?? 'easeOutCubic');

    this.target      = window.scrollY;
    this.current     = window.scrollY;
    this.scrollLocked = false;
    this.isRunning   = false;
    this.raf         = 0;
    this.lastTime    = 0;

    // Per-element scroll state: Map<Element, { target, current, raf, lastTime, isRunning }>
    this.elements = new Map();
    this.events = { start: [], update: [], complete: [], interrupt: [] };

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
    for (const state of this.elements.values()) cancelAnimationFrame(state.raf);
    this.elements.clear();
    
    window.removeEventListener('wheel', this._wheel, { passive: false });
    window.removeEventListener('scroll', this._native);
    window.removeEventListener('keydown', this._keys);
    
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
    return Math.max(0, Math.min(y, document.documentElement.scrollHeight - window.innerHeight));
  }

  _clampEl(el, y) {
    return Math.max(0, Math.min(y, el.scrollHeight - el.clientHeight));
  }

  _addListeners() {
    window.addEventListener('wheel', this._wheel, { passive: false });
    window.addEventListener('scroll', this._native, { passive: true });
    window.addEventListener('keydown', this._keys);
  }

  /* ---------- private – handlers ----------------------------------- */
  _wheel = (e) => {
    if (this.preventWithKeys && (e.shiftKey || e.altKey || e.ctrlKey || e.metaKey)) return;

    // Evaluate single DOM traversal for scroll-behavior rules
    const attrEl = e.target.closest('[data-smooth-scroll]');
    if (attrEl) {
      const type = attrEl.dataset.smoothScroll;
      
      if (this.preventWithAttribute && type === 'prevent') {
        if (this.isRunning) this.emit('interrupt');
        this._stop();
        return;
      }
      
      if (type === 'self') {
        const canScroll = (e.deltaY > 0 && attrEl.scrollTop < attrEl.scrollHeight - attrEl.clientHeight) ||
                          (e.deltaY < 0 && attrEl.scrollTop > 0);
        if (canScroll) {
          e.preventDefault();
          this._scrollElement(attrEl, e.deltaY);
          return;
        }
      }
    }

    if (this.scrollLocked) return;
    
    e.preventDefault();
    this.target = this._clamp(this.target + e.deltaY);
    this._start();
  };

  _native = () => {
    if (!this.isRunning) this.current = this.target = window.scrollY;
  };

  _keys = (e) => {
    if (this.scrollLocked) return;
    const tag = e.target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target.isContentEditable) return;

    let delta = 0;
    let absolute = false;
    
    switch (e.key) {
      case 'PageUp':    delta = -window.innerHeight; break;
      case 'PageDown':
      case ' ':         delta = window.innerHeight; break;
      case 'Home':      absolute = true; delta = 0; break;
      case 'End':       absolute = true; delta = document.documentElement.scrollHeight; break;
      case 'ArrowUp':   delta = -50; break;
      case 'ArrowDown': delta = 50; break;
      default:          return;
    }

    e.preventDefault();
    if (this.isRunning) this.emit('interrupt');
    
    this.target = this._clamp(absolute ? delta : this.target + delta);
    this._start();
  };

  /* ---------- private – per-element smooth scroll ------------------ */
  _scrollElement(el, delta) {
    let state = this.elements.get(el);
    if (!state) {
      state = { target: el.scrollTop, current: el.scrollTop, raf: 0, lastTime: 0, isRunning: false };
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
    const deltaTime = Math.min(currentTime - state.lastTime, 100);
    state.lastTime  = currentTime;
    const deltaMultiplier = deltaTime / (1000 / this.targetFPS);

    const dy = state.target - state.current;
    if (Math.abs(dy) < this.threshold) {
      state.current   = state.target;
      el.scrollTop    = state.current;
      state.isRunning = false;
      return;
    }

    const norm = Math.min(1, Math.abs(dy) / el.clientHeight);
    state.current += dy * this.lerp * (1 + this.easing(1 - norm)) * deltaMultiplier;
    el.scrollTop   = state.current;
    
    state.raf = requestAnimationFrame(t => this._tickElement(el, state, t));
  }

  /* ---------- private – root tick ---------------------------------- */
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

  _tick = (currentTime) => {
    const deltaTime = Math.min(currentTime - this.lastTime, 100);
    this.lastTime   = currentTime;
    const deltaMultiplier = deltaTime / (1000 / this.targetFPS);

    const dy = this.target - this.current;
    if (Math.abs(dy) < this.threshold) {
      this.current = this.target;
      window.scrollTo(0, this.current);
      this._stop();
      this.emit('complete', { finalScroll: this.current });
      return;
    }

    const norm = Math.min(1, Math.abs(dy) / window.innerHeight);
    this.current += dy * this.lerp * (1 + this.easing(1 - norm)) * deltaMultiplier;
    window.scrollTo(0, this.current);
    
    this.emit('update', { currentScroll: this.current, diff: dy });
    this.raf = requestAnimationFrame(this._tick);
  };
}

export default SmoothScroll;
import { EASING, getEasing } from './core/easing.js';
import { clamp } from './core/math.js';
import { EventEmitter } from './core/emitter.js';
import { Dimensions } from './core/dimensions.js';
import { LockManager } from './core/lock.js';
import { AnimationEngine } from './core/animation.js';
import { InputManager } from './core/input.js';

/**
 * SmoothScroll
 *
 * A modern, modular, zero-dependency smooth scrolling engine.
 * Engineered for high performance with fluid momentum, native container coexistence,
 * and an event-driven architecture.
 */
export default class SmoothScroll {
  static EASING = EASING;

  static defaults = {
    damping: 0.5,            // Normalized scale 0.1 to 1.0 (0.1 = floaty glide, 1.0 = snappy/responsive)
    wheelMultiplier: 1.0,    // Multiplier for mouse wheel deltas
    keyboard: true,          // Intercept navigation keys (Arrows, Space, PageUp/Down, Home/End)
    interceptAnchors: true,  // Automatically smooth-scroll in-page hash links (a[href^="#"])
    syncScrollbar: true,     // Detect and sync native scrollbar thumb dragging immediately
    threshold: 0.25,         // Distance (px) at which animation cleanly snaps and completes
    easing: 'easeOutCubic',  // Default easing function for programmatic / eased transitions
    autoRaf: true,           // Run internal RAF loop; set false if driving via scroller.raf(time)
  };

  static _instance = null;

  /**
   * Access the currently active SmoothScroll singleton instance, if any.
   * @returns {SmoothScroll | null}
   */
  static getInstance() {
    return SmoothScroll._instance;
  }

  /**
   * @param {import('./smooth_scroll.d.ts').SmoothScrollOptions} [options]
   */
  constructor(options = {}) {
    const docData = (typeof document !== 'undefined' && document.documentElement?.dataset) || {};
    const parseNum = (val, fallback) => {
      if (val == null || val === '') return fallback;
      const n = Number(val);
      return !Number.isNaN(n) ? n : fallback;
    };

    let dampingVal = parseNum(
      options.damping ?? options.strength ?? docData.smoothScrollDamping ?? docData.smoothScrollStrength,
      SmoothScroll.defaults.damping
    );
    dampingVal = clamp(dampingVal, 0.1, 1.0);

    let lerpVal;
    if (options.lerp != null) {
      lerpVal = clamp(parseNum(options.lerp, 0.12), 0.01, 1.0);
    } else {
      lerpVal = 0.02 + 0.28 * Math.pow(dampingVal, 1.5);
    }

    this.options = {
      damping: dampingVal,
      lerp: lerpVal,
      wheelMultiplier: parseNum(options.wheelMultiplier ?? docData.smoothScrollMultiplier, SmoothScroll.defaults.wheelMultiplier),
      keyboard: options.keyboard ?? SmoothScroll.defaults.keyboard,
      interceptAnchors: options.interceptAnchors ?? SmoothScroll.defaults.interceptAnchors,
      syncScrollbar: options.syncScrollbar ?? SmoothScroll.defaults.syncScrollbar,
      threshold: parseNum(options.threshold ?? docData.smoothScrollThreshold, SmoothScroll.defaults.threshold),
      easing: options.easing ?? docData.smoothScrollEasing ?? SmoothScroll.defaults.easing,
      autoRaf: options.autoRaf ?? SmoothScroll.defaults.autoRaf,
    };

    this.easing = getEasing(this.options.easing);
    this._emitter = new EventEmitter();

    // SSR fallback dummy state
    if (typeof window === 'undefined') {
      this._dimensions = { maxScroll: 0, destroy: () => {} };
      this._lock = { isLocked: false, lock: () => this, unlock: () => this, destroy: () => {} };
      this._engine = { current: 0, target: 0, velocity: 0, isRunning: false, stop: () => {}, start: () => {}, destroy: () => {} };
      this._input = { destroy: () => {} };
      return;
    }

    // Singleton check with explicit warning
    if (SmoothScroll._instance) {
      console.warn(
        '[SmoothScroll] An instance is already active. Returning existing instance.\n' +
        'If you wish to reconfigure with new options, call scroller.destroy() first.'
      );
      return SmoothScroll._instance;
    }

    this._lock = new LockManager(
      () => {
        this._engine.stop(true);
        this.emit('lock', this._getPayload());
      },
      () => {
        this._engine.current = this._engine.target = this._engine.lastWrittenScroll = window.scrollY;
        this.emit('unlock', this._getPayload());
      }
    );

    this._dimensions = new Dimensions(() => {
      this._engine.target = clamp(this._engine.target, 0, this.maxScroll);
      this._engine.current = clamp(this._engine.current, 0, this.maxScroll);
    });

    this._engine = new AnimationEngine(
      this.options,
      () => {
        if (this._emitter.hasListeners('scroll')) {
          this.emit('scroll', this._getPayload());
        }
      },
      () => this.emit('scroll-start', this._getPayload()),
      () => this.emit('scroll-end', this._getPayload())
    );

    this._input = new InputManager(this, this.options);

    SmoothScroll._instance = this;
    window.__smoothScrollInstance = this;
  }

  /* ─── Public Getters ─────────────────────────────────────────────────── */

  get scroll() {
    return this._engine.current;
  }

  get target() {
    return this._engine.target;
  }

  get maxScroll() {
    return this._dimensions.maxScroll;
  }

  get progress() {
    const max = this.maxScroll;
    return max > 0 ? clamp(this.scroll / max, 0, 1) : 0;
  }

  get damping() {
    return this.options.damping;
  }

  get lerp() {
    return this.options.lerp;
  }

  get velocity() {
    return this._engine.velocity;
  }

  get direction() {
    if (Math.abs(this.velocity) < 0.01) return 0;
    return this.velocity > 0 ? 1 : -1;
  }

  get isScrolling() {
    return this._engine.isRunning;
  }

  get isLocked() {
    return this._lock.isLocked;
  }

  /* ─── Internal Testing & State Delegates ─────────────────────────────── */

  get _anim() {
    return this._engine?._anim ?? null;
  }

  get _onComplete() {
    return this._engine?._activeOnComplete ?? null;
  }

  get _onWheel() {
    return this._input?._onWheel;
  }

  get _onKeyDown() {
    return this._input?._onKeyDown;
  }

  get _onScroll() {
    return this._input?._onScroll;
  }

  /* ─── Event Bus ──────────────────────────────────────────────────────── */

  /**
   * Listen to scroller events: 'scroll', 'scroll-start', 'scroll-end', 'lock', 'unlock'
   * @param {'scroll' | 'scroll-start' | 'scroll-end' | 'lock' | 'unlock'} event
   * @param {(payload: any) => void} callback
   */
  on(event, callback) {
    this._emitter.on(event, callback);
    return this;
  }

  /**
   * Unsubscribe from scroller events
   * @param {string} event
   * @param {(payload: any) => void} callback
   */
  off(event, callback) {
    this._emitter.off(event, callback);
    return this;
  }

  /**
   * Emit internal event
   */
  emit(event, detail = {}) {
    this._emitter.emit(event, { ...detail, scroller: this });
  }

  /* ─── Public Controls ────────────────────────────────────────────────── */

  /**
   * Smoothly scroll to a destination
   * @param {number | 'top' | 'bottom' | string | HTMLElement} destination
   * @param {import('./smooth_scroll.d.ts').ScrollToOptions} [options]
   */
  scrollTo(destination, options = {}) {
    if (this.isLocked) return;

    const offset = options.offset || 0;
    let targetY = 0;

    if (typeof destination === 'number') {
      targetY = destination;
    } else if (destination === 'top') {
      targetY = 0;
    } else if (destination === 'bottom') {
      targetY = this.maxScroll;
    } else if (typeof destination === 'string') {
      const el = document.querySelector(destination);
      if (!el) {
        console.warn(`[SmoothScroll] Target element "${destination}" not found.`);
        return;
      }
      targetY = window.scrollY + el.getBoundingClientRect().top;
    } else if (destination instanceof Element) {
      targetY = window.scrollY + destination.getBoundingClientRect().top;
    } else {
      console.warn('[SmoothScroll] Invalid destination passed to scrollTo():', destination);
      return;
    }

    const clampedTarget = clamp(targetY + offset, 0, this.maxScroll);

    if (options.immediate) {
      this._engine.cancelAnim({ interrupted: true });
      this._engine.target = this._engine.current = this._engine.lastWrittenScroll = clampedTarget;
      this._engine.velocity = 0;
      window.scrollTo({ top: clampedTarget, left: 0, behavior: 'instant' });
      this._engine.stop(false);
      const payload = this._getPayload();
      this.emit('scroll', payload);
      this.emit('scroll-end', payload);
      if (options.onComplete) options.onComplete({ scroll: clampedTarget });
      return;
    }

    if (options.duration && options.duration > 0) {
      this._engine.startDurationAnim(
        this.scroll,
        clampedTarget,
        options.duration,
        options.easing || this.easing,
        options.onComplete
      );
    } else {
      this._engine.cancelAnim({ interrupted: true });
      this._engine.target = clampedTarget;
      this._engine._activeOnComplete = options.onComplete || null;
      this._engine.start();
    }
  }

  /**
   * Lock scrolling completely with reference counting
   */
  lock() {
    this._lock.lock();
    return this;
  }

  /**
   * Unlock scrolling
   * @param {boolean} [force=false]
   */
  unlock(force = false) {
    this._lock.unlock(force);
    return this;
  }

  /**
   * Stop running animation loop immediately
   */
  stop() {
    this._engine.stop(true);
    return this;
  }

  /**
   * Resume/start scroller if target doesn't match current position
   */
  start() {
    if (Math.abs(this.target - this.scroll) > this.options.threshold) {
      this._engine.start();
    }
    return this;
  }

  /**
   * External tick runner (for sharing RAF loops with GSAP, Three.js, etc.)
   * @param {number} currentTime
   */
  raf(currentTime) {
    this._engine.tick(currentTime);
  }

  /**
   * Teardown all listeners, observers, and global references cleanly
   */
  destroy() {
    this._engine.destroy();
    this._input.destroy();
    this._dimensions.destroy();
    this._lock.destroy();
    this._emitter.clear();

    SmoothScroll._instance = null;
    if (typeof window !== 'undefined') {
      delete window.__smoothScrollInstance;
    }
  }

  /* ─── Private Internal Helper ────────────────────────────────────────── */

  _getPayload() {
    const max = this.maxScroll;
    const progress = max > 0 ? clamp(this.scroll / max, 0, 1) : 0;
    return {
      scroll: Math.round(this.scroll * 100) / 100,
      target: Math.round(this.target * 100) / 100,
      progress: Math.round(progress * 1000) / 1000,
      velocity: Math.round(this.velocity * 10) / 10,
      direction: this.direction,
    };
  }
}

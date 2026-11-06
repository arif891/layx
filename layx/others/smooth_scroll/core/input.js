import { clamp, normalizeWheel, isTouchpad, findScrollableParent } from './math.js';

/**
 * InputManager coordinates wheel, keyboard, in-page anchor clicks, and native scroll sync.
 */
export class InputManager {
  /**
   * @param {import('../smooth_scroll.js').default} scroller
   * @param {Object} options
   */
  constructor(scroller, options) {
    this.scroller = scroller;
    this.options = options;
    this._bindEvents();
  }

  _bindEvents() {
    if (typeof window === 'undefined') return;

    window.addEventListener('wheel', this._onWheel, { passive: false });
    window.addEventListener('scroll', this._onScroll, { passive: true });

    if (this.options.keyboard) {
      window.addEventListener('keydown', this._onKeyDown);
    }
    if (this.options.interceptAnchors && typeof document !== 'undefined') {
      document.addEventListener('click', this._onAnchorClick);
    }
  }

  _onWheel = (e) => {
    // 1. Never block horizontal swipes, Shift+wheel, or trackpad horizontal pan gestures
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;

    // 2. Let browser modifier keys handle zoom or native shortcuts
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (this.scroller.isLocked) {
      e.preventDefault();
      return;
    }

    const deltaY = normalizeWheel(e, this.options.wheelMultiplier);

    // 3. Permit native scrolling on scrollable sub-containers until they hit boundaries
    const scrollable = findScrollableParent(e.target);
    if (scrollable) {
      const atTop = deltaY < 0 && scrollable.scrollTop <= 0;
      const atBottom = deltaY > 0 && (scrollable.scrollTop + scrollable.clientHeight >= scrollable.scrollHeight - 1);
      if (!atTop && !atBottom) {
        return; // Allow native container scrolling
      }
    }

    e.preventDefault();
    const engine = this.scroller._engine;

    // 4. Precision touchpad detection: pass continuous stream smoothly without double inertia
    if (isTouchpad(e) && !engine.isRunning) {
      engine.current = window.scrollY;
    }

    engine.cancelAnim({ interrupted: true });
    engine.target = clamp(engine.target + deltaY, 0, this.scroller.maxScroll);
    engine.start();
  };

  _onScroll = () => {
    if (this.scroller.isLocked) return;
    const engine = this.scroller._engine;

    if (!engine.isRunning) {
      // Idle: keep current and target aligned with native position to avoid stale skew
      engine.current = engine.target = engine.lastWrittenScroll = window.scrollY;
      return;
    }

    // Running: detect external drift (e.g. user dragged native scrollbar thumb)
    if (Math.abs(window.scrollY - engine.lastWrittenScroll) > 1) {
      engine.cancelAnim({ interrupted: true });
      engine.target = engine.current = engine.lastWrittenScroll = window.scrollY;
      engine.velocity = 0;
      engine.stop(true);
    }
  };

  _onKeyDown = (e) => {
    if (this.scroller.isLocked || e.defaultPrevented) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;

    const target = e.target;
    if (!target) return;
    const tag = target.tagName;

    // Do not hijack form inputs, select boxes, buttons, or editable elements
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || tag === 'BUTTON' || target.isContentEditable) {
      return;
    }

    // Space activates links natively
    if (tag === 'A' && e.key === ' ') {
      return;
    }

    // If focused element is inside an inner scrollable element, let native keyboard handle it
    const scrollable = findScrollableParent(target);
    if (scrollable) return;

    let delta = 0;
    let isAbsolute = false;

    switch (e.key) {
      case 'ArrowUp':
        delta = -80;
        break;
      case 'ArrowDown':
        delta = 80;
        break;
      case 'PageUp':
        delta = -window.innerHeight * 0.85;
        break;
      case 'PageDown':
        delta = window.innerHeight * 0.85;
        break;
      case ' ':
        delta = e.shiftKey ? -window.innerHeight * 0.85 : window.innerHeight * 0.85;
        break;
      case 'Home':
        isAbsolute = true;
        delta = 0;
        break;
      case 'End':
        isAbsolute = true;
        delta = this.scroller.maxScroll;
        break;
      default:
        return;
    }

    e.preventDefault();
    const engine = this.scroller._engine;
    engine.cancelAnim({ interrupted: true });
    engine.target = clamp(isAbsolute ? delta : engine.target + delta, 0, this.scroller.maxScroll);
    engine.start();
  };

  _onAnchorClick = (e) => {
    // Ignore middle-clicks, modifier clicks (open in new tab), or prevented events
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

    const link = e.target.closest('a[href^="#"]');
    if (!link || link.hasAttribute('data-no-smooth')) return;
    if (link.target && link.target !== '_self') return;
    if (link.hasAttribute('download')) return;

    const href = link.getAttribute('href');
    if (!href || href === '#' || href.length < 2) return;

    try {
      const targetEl = document.querySelector(href);
      if (targetEl) {
        e.preventDefault();
        this.scroller.scrollTo(targetEl);
      }
    } catch {
      // Fallback
    }
  };

  destroy() {
    if (typeof window !== 'undefined') {
      window.removeEventListener('wheel', this._onWheel);
      window.removeEventListener('scroll', this._onScroll);
      window.removeEventListener('keydown', this._onKeyDown);
    }
    if (typeof document !== 'undefined') {
      document.removeEventListener('click', this._onAnchorClick);
    }
  }
}


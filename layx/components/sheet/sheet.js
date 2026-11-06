/*********************************************************************
 * Sheet – Modal Bottom Sheet & Slide-over Drawer Component for LayX
 * - CSS scroll-snap based swipeable panel
 * - Automatic ResizeObserver dimension calculation
 * - Event delegation for triggers & close buttons
 * - Multi-axis slide: bottom, top, left, right
 * - Accessibility (ARIA, focus management, modal scroll locking)
 * - Custom lifecycle events (sheet:open, sheet:closed, etc.)
 * - SSR & Node.js safe
 *********************************************************************/

class Sheet {
  // ─── Config ────────────────────────────────────────────────────────────────

  static DEFAULTS = {
    scrollBehavior: 'smooth',
    tolerance:      2,
  };

  static ATTR = {
    TRIGGER:   'data-target-sheet',
    POSITION:  'position',
    ACTIVE:    'active',
    OPEN:      'open',
    MODAL:     'modal',
    SNAP:      'snap',
    CLOSE:     'close',
  };

  static CSS = {
    WRAPPER: '.wrapper',
    WIDTH:   '--_w',
    HEIGHT:  '--_h',
  };

  static POSITION = {
    TOP:    'top',
    LEFT:   'left',
    RIGHT:  'right',
    BOTTOM: 'bottom',
  };

  static _instance = null;

  static getInstance() {
    return Sheet._instance;
  }

  static open(target, options) {
    const inst = Sheet._instance || new Sheet();
    return inst.open(target, options);
  }

  static close(target, options) {
    const inst = Sheet._instance || new Sheet();
    return inst.close(target, options);
  }

  static toggle(target, options) {
    const inst = Sheet._instance || new Sheet();
    return inst.toggle(target, options);
  }

  // ─── Lifecycle ─────────────────────────────────────────────────────────────

  constructor(selector = 'sheet, .sheet', options = {}) {
    if (Sheet._instance) {
      return Sheet._instance;
    }

    this._options         = { ...Sheet.DEFAULTS, ...options };
    this._selector        = selector;
    this._wrapperCache    = new Map();
    this._scrollListeners = new Map();
    this._lockCount       = 0;

    this._onKeydown       = this._onKeydown.bind(this);
    this._onClick         = this._onClick.bind(this);

    Sheet._instance = this;

    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      this._init();
    }
  }

  _init() {
    this._setupA11y();
    this._setupObserver();
    this._attachListeners();
  }

  destroy() {
    if (typeof document !== 'undefined') {
      document.removeEventListener('click', this._onClick);
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('keydown', this._onKeydown);
    }

    if (this._ro) {
      this._ro.disconnect();
      this._ro = null;
    }

    this._scrollListeners.forEach((fn, sheet) => {
      sheet.removeEventListener('scroll', fn);
    });
    this._scrollListeners.clear();
    this._wrapperCache.clear();

    if (this._lockCount > 0) {
      this._lockCount = 1;
      this._unlockScroll();
    }

    if (Sheet._instance === this) {
      Sheet._instance = null;
    }
  }

  // ─── Public API ────────────────────────────────────────────────────────────

  open(target, options = {}) {
    const sheet = this._resolveSheet(target);
    if (!sheet) return;

    const wrapper = this._getWrapper(sheet);
    if (!wrapper) return;

    this._measure(sheet, wrapper);

    const behavior = options.immediate ? 'instant' : this._options.scrollBehavior;
    const [snapPoint] = sheet.querySelectorAll(`[${Sheet.ATTR.SNAP}]`);
    const scrollTarget = snapPoint ?? wrapper;

    this._emit(sheet, 'sheet:open');

    scrollTarget.scrollIntoView({
      behavior,
      block:    'nearest',
      inline:   'nearest',
    });

    sheet.setAttribute(Sheet.ATTR.OPEN, '');
    sheet.setAttribute('aria-hidden', 'false');

    this._syncTriggers(sheet, true);

    if (sheet.hasAttribute(Sheet.ATTR.MODAL)) {
      this._lockScroll();
    }

    this._emit(sheet, 'sheet:opened');
  }

  close(target, options = {}) {
    const sheet = this._resolveSheet(target);
    if (!sheet) return;

    this._emit(sheet, 'sheet:close');

    const position = this._getPosition(sheet);
    const behavior = options.immediate ? 'instant' : this._options.scrollBehavior;
    const scrollOptions = { behavior };

    switch (position) {
      case Sheet.POSITION.TOP:    scrollOptions.top  = sheet.scrollHeight; break;
      case Sheet.POSITION.LEFT:   scrollOptions.left = sheet.scrollWidth;  break;
      case Sheet.POSITION.RIGHT:  scrollOptions.left = 0;                  break;
      case Sheet.POSITION.BOTTOM: scrollOptions.top  = 0;                  break;
      default:
        console.warn(`Sheet: unknown position "${position}".`);
        return;
    }

    sheet.scrollTo(scrollOptions);
    sheet.removeAttribute(Sheet.ATTR.OPEN);
    sheet.setAttribute('aria-hidden', 'true');

    this._syncTriggers(sheet, false);

    if (sheet.hasAttribute(Sheet.ATTR.MODAL)) {
      this._unlockScroll();
    }

    if (sheet._lastTrigger && typeof sheet._lastTrigger.focus === 'function') {
      try { sheet._lastTrigger.focus(); } catch {}
      sheet._lastTrigger = null;
    }

    this._emit(sheet, 'sheet:closed');
  }

  toggle(target, options = {}) {
    const sheet = this._resolveSheet(target);
    if (!sheet) return;
    this.isOpen(sheet) ? this.close(sheet, options) : this.open(sheet, options);
  }

  isOpen(target) {
    const sheet = this._resolveSheet(target);
    return sheet ? sheet.hasAttribute(Sheet.ATTR.OPEN) : false;
  }

  refresh() {
    this._setupA11y();
    this._observeSheets();
    this._bindScrollListeners();
  }

  // ─── Private Core ──────────────────────────────────────────────────────────

  _resolveSheet(target) {
    if (typeof target === 'string') {
      if (typeof document === 'undefined') return null;
      return document.getElementById(target) || document.querySelector(target);
    }
    if (target && typeof target === 'object') {
      return target;
    }
    return null;
  }

  _attachListeners() {
    document.addEventListener('click', this._onClick);
    window.addEventListener('keydown', this._onKeydown);
    this._bindScrollListeners();
  }

  _bindScrollListeners() {
    const sheets = document.querySelectorAll(this._selector);
    sheets.forEach(sheet => {
      if (this._scrollListeners.has(sheet)) return;

      const onScroll = () => this._onSheetScroll(sheet);
      sheet.addEventListener('scroll', onScroll, { passive: true });
      this._scrollListeners.set(sheet, onScroll);
    });
  }

  _onClick(e) {
    // 1. Delegated trigger button click
    const trigger = e.target.closest(`[${Sheet.ATTR.TRIGGER}]`);
    if (trigger) {
      const id = trigger.getAttribute(Sheet.ATTR.TRIGGER);
      const sheet = this._resolveSheet(id);
      if (sheet) {
        sheet._lastTrigger = trigger;
        this.open(sheet);
      } else {
        console.warn(`Sheet: no element found with id "${id}".`);
      }
      return;
    }

    // 2. Delegated close button click
    const closeBtn = e.target.closest(`[${Sheet.ATTR.CLOSE}]`);
    if (closeBtn) {
      const sheet = closeBtn.closest(this._selector);
      if (sheet) {
        this.close(sheet);
      }
    }
  }

  _onKeydown(e) {
    if (e.key !== 'Escape') return;
    const openSheets = document.querySelectorAll(`${this._selector}[${Sheet.ATTR.OPEN}]`);
    openSheets.forEach(sheet => {
      this.close(sheet);
    });
  }

  _onSheetScroll(sheet) {
    if (!sheet.hasAttribute(Sheet.ATTR.OPEN)) return;

    if (this._isScrolledClosed(sheet)) {
      sheet.removeAttribute(Sheet.ATTR.OPEN);
      sheet.setAttribute('aria-hidden', 'true');
      this._syncTriggers(sheet, false);

      if (sheet.hasAttribute(Sheet.ATTR.MODAL)) {
        this._unlockScroll();
      }

      this._emit(sheet, 'sheet:closed');
    }
  }

  _isScrolledClosed(sheet) {
    const { scrollTop, scrollLeft, scrollHeight, scrollWidth, clientHeight, clientWidth } = sheet;
    const tol = this._options.tolerance;

    switch (this._getPosition(sheet)) {
      case Sheet.POSITION.TOP:    return scrollTop  >= (scrollHeight - clientHeight - tol);
      case Sheet.POSITION.LEFT:   return scrollLeft >= (scrollWidth  - clientWidth  - tol);
      case Sheet.POSITION.RIGHT:  return scrollLeft <= tol;
      case Sheet.POSITION.BOTTOM: return scrollTop  <= tol;
      default:                    return false;
    }
  }

  _setupObserver() {
    if (typeof ResizeObserver === 'undefined') {
      this._observeSheets();
      return;
    }

    this._ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const wrapper = entry.target;
        const sheet = wrapper.closest(this._selector);
        if (sheet) {
          this._measure(sheet, wrapper);
        }
      }
    });

    this._observeSheets();
  }

  _observeSheets() {
    const sheets = document.querySelectorAll(this._selector);
    sheets.forEach(sheet => {
      const wrapper = this._getWrapper(sheet);
      if (wrapper) {
        if (this._ro) this._ro.observe(wrapper);
        this._measure(sheet, wrapper);
      }
    });
  }

  _measure(sheet, wrapper) {
    if (!wrapper) return;
    sheet.style.setProperty(Sheet.CSS.WIDTH,  `${wrapper.offsetWidth}px`);
    sheet.style.setProperty(Sheet.CSS.HEIGHT, `${wrapper.offsetHeight}px`);
    sheet.setAttribute(Sheet.ATTR.ACTIVE, '');
  }

  _setupA11y() {
    const sheets = document.querySelectorAll(this._selector);
    sheets.forEach(sheet => {
      if (!sheet.hasAttribute('role')) {
        sheet.setAttribute('role', 'dialog');
      }
      sheet.setAttribute('aria-modal', sheet.hasAttribute(Sheet.ATTR.MODAL) ? 'true' : 'false');
      if (!sheet.hasAttribute('aria-hidden')) {
        sheet.setAttribute('aria-hidden', sheet.hasAttribute(Sheet.ATTR.OPEN) ? 'false' : 'true');
      }

      if (sheet.id) {
        this._syncTriggers(sheet, sheet.hasAttribute(Sheet.ATTR.OPEN));
      }
    });
  }

  _syncTriggers(sheet, isOpen) {
    if (!sheet.id) return;
    document.querySelectorAll(`[${Sheet.ATTR.TRIGGER}="${sheet.id}"]`).forEach(trig => {
      trig.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      trig.setAttribute('aria-controls', sheet.id);
    });
  }

  _lockScroll() {
    if (typeof document === 'undefined') return;
    this._lockCount = (this._lockCount || 0) + 1;
    if (this._lockCount === 1) {
      this._prevOverflow = document.documentElement.style.overflow;
      document.documentElement.style.overflow = 'hidden';
    }
  }

  _unlockScroll() {
    if (typeof document === 'undefined' || !this._lockCount) return;
    this._lockCount = Math.max(0, this._lockCount - 1);
    if (this._lockCount === 0) {
      document.documentElement.style.overflow = this._prevOverflow || '';
      delete this._prevOverflow;
    }
  }

  _emit(sheet, eventName, detail = {}) {
    if (typeof CustomEvent === 'function') {
      sheet.dispatchEvent(new CustomEvent(eventName, { bubbles: true, detail }));
    }
  }

  _getWrapper(sheet) {
    if (this._wrapperCache.has(sheet)) return this._wrapperCache.get(sheet);

    const wrapper = sheet.querySelector(Sheet.CSS.WRAPPER);
    if (!wrapper) {
      console.warn('Sheet: missing a child ".wrapper" element.');
      return null;
    }

    this._wrapperCache.set(sheet, wrapper);
    return wrapper;
  }

  _getPosition(sheet) {
    return sheet.getAttribute(Sheet.ATTR.POSITION) ?? Sheet.POSITION.BOTTOM;
  }
}

export { Sheet };
export default Sheet;

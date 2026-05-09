class Sheet {
  // ─── Config ────────────────────────────────────────────────────────────────

  static DEFAULTS = {
    scrollBehavior: 'smooth',
    resizeDelay:    100,
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

  // ─── Lifecycle ─────────────────────────────────────────────────────────────

  constructor(selector = 'sheet', options = {}) {
    this._options      = { ...Sheet.DEFAULTS, ...options };
    this._sheets       = document.querySelectorAll(selector);
    this._triggers     = document.querySelectorAll(`[${Sheet.ATTR.TRIGGER}]`);
    this._wrapperCache = new Map();
    this._listeners    = new Map(); // sheet/element → bound handlers, for teardown
    this._resizeTimer  = null;

    this._onResize     = this._onResize.bind(this);
    this._onKeydown    = this._onKeydown.bind(this);

    this._init();
  }

  _init() {
    this._update();
    this._attachListeners();
  }

  destroy() {
    clearTimeout(this._resizeTimer);
    window.removeEventListener('resize',  this._onResize);
    window.removeEventListener('keydown', this._onKeydown);

    this._listeners.forEach((handlers, el) => {
      handlers.forEach(([event, fn]) => el.removeEventListener(event, fn));
    });

    this._wrapperCache.clear();
    this._listeners.clear();
  }

  // ─── Public API ────────────────────────────────────────────────────────────

  open(sheet) {
    if (!sheet) return;

    const wrapper    = this._getWrapper(sheet);
    if (!wrapper) return;

    const [snapPoint] = sheet.querySelectorAll(`[${Sheet.ATTR.SNAP}]`);
    const target      = snapPoint ?? wrapper;

    target.scrollIntoView({
      behavior: this._options.scrollBehavior,
      block:    'nearest',
      inline:   'nearest',
    });

    sheet.setAttribute(Sheet.ATTR.OPEN, '');
  }

  close(sheet) {
    if (!sheet) return;

    const position      = this._getPosition(sheet);
    const scrollOptions = { behavior: this._options.scrollBehavior };

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
  }

  // ─── Private ───────────────────────────────────────────────────────────────

  _attachListeners() {
    window.addEventListener('resize',  this._onResize);
    window.addEventListener('keydown', this._onKeydown);

    this._triggers.forEach(trigger => {
      const fn = e => this._onTriggerClick(e);
      trigger.addEventListener('click', fn);
      this._register(trigger, 'click', fn);
    });

    this._sheets.forEach(sheet => {
      const onScroll = () => this._onSheetScroll(sheet);
      sheet.addEventListener('scroll', onScroll);
      this._register(sheet, 'scroll', onScroll);

      sheet.querySelectorAll(`[${Sheet.ATTR.CLOSE}]`).forEach(btn => {
        const onClose = () => this.close(sheet);
        btn.addEventListener('click', onClose);
        this._register(btn, 'click', onClose);
      });
    });
  }

  /** Store a listener reference so destroy() can remove it. */
  _register(el, event, fn) {
    if (!this._listeners.has(el)) this._listeners.set(el, []);
    this._listeners.get(el).push([event, fn]);
  }

  _onResize() {
    clearTimeout(this._resizeTimer);
    this._resizeTimer = setTimeout(() => this._update(), this._options.resizeDelay);
  }

  _onKeydown(e) {
    if (e.key !== 'Escape') return;
    this._sheets.forEach(sheet => {
      if (sheet.hasAttribute(Sheet.ATTR.OPEN) && !sheet.hasAttribute(Sheet.ATTR.MODAL)) {
        this.close(sheet);
      }
    });
  }

  _onTriggerClick(e) {
    const id    = e.currentTarget.getAttribute(Sheet.ATTR.TRIGGER);
    const sheet = document.getElementById(id);
    sheet
      ? this.open(sheet)
      : console.warn(`Sheet: no element found with id "${id}".`);
  }

  _onSheetScroll(sheet) {
    if (!sheet.hasAttribute(Sheet.ATTR.OPEN)) return;

    const closed = this._isScrolledClosed(sheet);
    if (closed) sheet.removeAttribute(Sheet.ATTR.OPEN);
  }

  _isScrolledClosed(sheet) {
    const { scrollTop, scrollLeft, scrollHeight, scrollWidth, clientHeight, clientWidth } = sheet;
    switch (this._getPosition(sheet)) {
      case Sheet.POSITION.TOP:    return scrollTop  >= scrollHeight - clientHeight;
      case Sheet.POSITION.LEFT:   return scrollLeft >= scrollWidth  - clientWidth;
      case Sheet.POSITION.RIGHT:  return scrollLeft <= 0;
      case Sheet.POSITION.BOTTOM: return scrollTop  <= 0;
      default:                    return false;
    }
  }

  _update() {
    this._sheets.forEach(sheet => {
      const wrapper = this._getWrapper(sheet);
      if (!wrapper) return;
      sheet.style.setProperty(Sheet.CSS.WIDTH,  `${wrapper.offsetWidth}px`);
      sheet.style.setProperty(Sheet.CSS.HEIGHT, `${wrapper.offsetHeight}px`);
      sheet.setAttribute(Sheet.ATTR.ACTIVE, '');
    });
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
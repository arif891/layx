/**
 * ViewportTrigger – declarative enter/exit actions for any DOM element
 *
 * DEFAULT BEHAVIOUR (no explicit action):
 *   – media elements (<video>, <audio>)  : toggle .in-viewport class
 *   – everything else                    : add .in-viewport class (never remove)
 *
 * data-vpt="play"           – play <video>/<audio> once, **add** .in-viewport
 * data-vpt="toggle"         – toggle .in-viewport class + play/pause media
 * data-vpt="custom:foo"     – run ViewportTrigger.actions.get('custom')({el,isIn,cfg:'foo'})
 * data-vpt-margin="100px"   – rootMargin in px or percentage (optional) (defult 0px)
 * data-vpt-threshold="0.25" – % of element that must be visible (0-1) (optional) (defult 0.5)
 */
class ViewportTrigger {
  constructor(selector = '[data-vpt]') {
    this.selector = selector;
    this.class = 'ivp';
    this.observers = new WeakMap();   // el → IntersectionObserver

    /* ---------- built-in actions ---------- */
    this.actions = new Map(Object.entries({
      play: ({ el }) => {
        el.classList.add(this.class);          // always add class
        this.safePlay(el);                        // play media if any
        this.unobserve(el);                       // run only once
      },
      toggle: ({ el, isIn }) => {
        el.classList.toggle(this.class, isIn); // always toggle class
        if (el.tagName === 'VIDEO' || el.tagName === 'AUDIO') {
          isIn ? this.safePlay(el) : el.pause();
        }
      },
    }));

    this.init();
  }

  /* ---------- public ---------- */
  init() {
    document.querySelectorAll(this.selector).forEach(el => this.observe(el));
  }

  observe(el) {
    if (this.observers.has(el)) return;

    const raw = (el.dataset.vpt || '').trim();
    const [name, cfg] = raw.split(':');
    const action = this.actions.get(name);

    const margin = el.dataset.vptMargin || '0px';
    const thresh = Math.min(1, Math.max(0, parseFloat(el.dataset.vptThreshold || '0.5')));

    const io = new IntersectionObserver(([entry]) => {
      const isIn = entry.intersectionRatio >= thresh;

      /* 1. explicit action */
      if (action) {
        if (name === 'play' && !isIn) return;   // wait for entrance
        action({ el, isIn, cfg });
        /* unobserve already called inside play action */
        return;
      }

      /* 2. default behaviour */
      const isMedia = el.tagName === 'VIDEO' || el.tagName === 'AUDIO';
      if (isMedia) {
        /* media: toggle class + play/pause */
        el.classList.toggle(this.class, isIn);
        isIn ? this.safePlay(el) : el.pause();
      } else {
        /* non-media: add class once when entering, never remove */
        if (isIn) el.classList.add(this.class);
      }
    }, { rootMargin: margin, threshold: thresh });

    io.observe(el);
    this.observers.set(el, io);
  }

  unobserve(el) {
    this.observers.get(el)?.disconnect();
    this.observers.delete(el);
  }

  disconnect() {
    this.observers.forEach(io => io.disconnect());
    this.observers = new WeakMap();
  }

  /* ---------- helpers ---------- */
  safePlay(el) {
    if (el.tagName !== 'VIDEO' && el.tagName !== 'AUDIO') return true;
    return el.play().catch(() =>
      console.warn('ViewportTrigger: autoplay prevented on', el, '– add "muted" or ensure user interaction.')
    );
  }
}

export default new ViewportTrigger()
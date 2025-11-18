/**
 * ViewportTrigger – declarative enter/exit actions for any DOM element
 *
 * data-vpt="play-once"           – play <video> only the first time it enters
 * data-vpt="play-pause"          – play while inside, pause while outside
 * data-vpt="toggle-class:foo"    – add/remove .foo while inside/outside
 * data-vpt-margin="100px"        – expand root margin (optional)
 * data-vpt-threshold="0.25"      – % of element that must be visible (0-1)
 */
class ViewportTrigger {
  constructor(selector = '[data-vpt]') {
    this.selector = selector;

    /* ---------- built-in actions ---------- */
    this.actions = new Map(Object.entries({
      'play-once':  ({ el }) => this.safePlay(el) && this.unobserve(el),
      'play-pause': ({ el, isIn }) => isIn ? this.safePlay(el) : el.pause(),
      'toggle-class': ({ el, isIn, cfg }) => {
        const cls = cfg || 'in-viewport';
        el.classList.toggle(cls, isIn);
      }
    }));

    this.roots = new Set();          // keeps observers alive
    this.init();
  }

  /* ---------- public ---------- */
  init() {
    document.querySelectorAll(this.selector).forEach(el => this.observe(el));
  }

  observe(el) {
    if (el._vptObserver) return;     // already handled

    const raw  = (el.dataset.vpt || '').trim();
    const [name, cfg] = raw.split(':');
    const explicitAction = this.actions.get(name);

    const margin  = el.dataset.vptMargin  || '0px';
    const thresh  = parseFloat(el.dataset.vptThreshold || '0.5');
    const once    = name.endsWith('-once');

    const io = new IntersectionObserver(entries => {
      const e    = entries[0];
      const isIn = e.intersectionRatio >= thresh;

      /* 1. run explicit action if one was supplied */
      if (explicitAction) {
        if (once && !isIn) return;   // wait for real entrance
        explicitAction({ el, isIn, cfg });
        if (once && isIn) { io.disconnect(); this.roots.delete(io); }
        return;
      }

      /* 2. default: toggle .in-viewport class */
      el.classList.toggle('in-viewport', isIn);

      /* 3. default: play/pause media elements */
      if (el.tagName === 'VIDEO' || el.tagName === 'AUDIO') {
        isIn ? this.safePlay(el) : el.pause();
      }
    }, { rootMargin: margin, threshold: thresh });

    io.observe(el);
    el._vptObserver = io;
    this.roots.add(io);
  }

  unobserve(el) {
    el._vptObserver?.disconnect();
    this.roots.delete(el._vptObserver);
    delete el._vptObserver;
  }

  disconnect() {
    this.roots.forEach(io => io.disconnect());
    this.roots.clear();
  }

  /* ---------- helpers ---------- */
  safePlay(el) {
    if (el.tagName !== 'VIDEO' && el.tagName !== 'AUDIO') return true;
    return el.play().catch(() => { /* autoplay blocked – ignore */ });
  }
}

export default new ViewportTrigger()
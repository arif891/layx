/**
 * DimensionManager handles viewport bounds and scrollHeight caching via ResizeObserver.
 * Eliminates layout thrashing during the animation tick loop.
 */
export class Dimensions {
  /**
   * @param {() => void} [onResize]
   */
  constructor(onResize) {
    this.maxScroll = 0;
    this._onResize = onResize;
    this._observer = null;

    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      this.update();

      if (typeof ResizeObserver !== 'undefined') {
        this._observer = new ResizeObserver(() => {
          this.update();
          if (this._onResize) this._onResize();
        });

        if (document.documentElement) this._observer.observe(document.documentElement);
        if (document.body) this._observer.observe(document.body);
      }

      window.addEventListener('resize', this._handleWindowResize, { passive: true });
    }
  }

  _handleWindowResize = () => {
    this.update();
    if (this._onResize) this._onResize();
  };

  update() {
    if (typeof document === 'undefined' || typeof window === 'undefined') return;
    this.maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  }

  destroy() {
    if (this._observer) {
      this._observer.disconnect();
      this._observer = null;
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', this._handleWindowResize);
    }
  }
}


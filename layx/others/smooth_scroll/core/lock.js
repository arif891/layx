/**
 * LockManager manages scroll lock state using reference counting.
 * Enables nested modals and drawers without accidental early unlocks.
 */
export class LockManager {
  /**
   * @param {() => void} [onLock]
   * @param {() => void} [onUnlock]
   */
  constructor(onLock, onUnlock) {
    this._count = 0;
    this._prevOverflow = '';
    this._onLock = onLock;
    this._onUnlock = onUnlock;
  }

  get isLocked() {
    return this._count > 0;
  }

  lock() {
    this._count++;
    if (this._count === 1) {
      if (typeof document !== 'undefined' && document.documentElement) {
        this._prevOverflow = document.documentElement.style.overflow;
        document.documentElement.style.overflow = 'hidden';
        document.documentElement.style.scrollbarGutter = 'stable';
      }
      if (this._onLock) this._onLock();
    }
    return this;
  }

  unlock(force = false) {
    if (this._count <= 0) return this;
    if (force) {
      this._count = 0;
    } else {
      this._count--;
    }

    if (this._count === 0) {
      if (typeof document !== 'undefined' && document.documentElement) {
        document.documentElement.style.overflow = this._prevOverflow || '';
        document.documentElement.style.scrollbarGutter = '';
      }
      if (this._onUnlock) this._onUnlock();
    }
    return this;
  }

  destroy() {
    if (this._count > 0 && typeof document !== 'undefined' && document.documentElement) {
      document.documentElement.style.overflow = this._prevOverflow || '';
      document.documentElement.style.scrollbarGutter = '';
    }
    this._count = 0;
  }
}


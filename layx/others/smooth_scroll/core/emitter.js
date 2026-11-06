/**
 * Lightweight, zero-allocation event emitter for SmoothScroll.
 */
export class EventEmitter {
  constructor() {
    this._events = new Map();
  }

  on(event, fn) {
    if (!this._events.has(event)) {
      this._events.set(event, new Set());
    }
    this._events.get(event).add(fn);
    return this;
  }

  off(event, fn) {
    this._events.get(event)?.delete(fn);
    return this;
  }

  emit(event, data) {
    this._events.get(event)?.forEach(fn => {
      try {
        fn(data);
      } catch (err) {
        console.error(`[SmoothScroll] Error in "${event}" listener:`, err);
      }
    });
  }

  hasListeners(event) {
    return (this._events.get(event)?.size ?? 0) > 0;
  }

  clear() {
    this._events.clear();
  }
}


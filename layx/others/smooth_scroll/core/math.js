/**
 * Clamps a number between a minimum and maximum bound.
 *
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export function clamp(value, min, max) {
  return Math.max(min, Math.min(value, max));
}

/**
 * Calculates framerate-independent exponential damping.
 * Safe against negative delta time (dt) and high-refresh clock skew.
 *
 * @param {number} current
 * @param {number} target
 * @param {number} lerp - Damping factor (per 16.6667ms step)
 * @param {number} dt - Elapsed milliseconds since previous frame
 * @returns {number}
 */
export function damp(current, target, lerp, dt) {
  const safeDt = Math.max(0, Math.min(dt, 100));
  if (safeDt === 0) return current;
  const factor = 1 - Math.pow(1 - lerp, safeDt / 16.6667);
  return current + (target - current) * factor;
}

/**
 * Normalizes wheel delta values into uniform CSS pixels.
 *
 * @param {WheelEvent} e
 * @param {number} [multiplier=1.0]
 * @returns {number}
 */
export function normalizeWheel(e, multiplier = 1.0) {
  let delta = e.deltaY;
  if (e.deltaMode === 1) {
    // Line mode (Firefox, Windows standard wheel mouse)
    delta *= 16;
  } else if (e.deltaMode === 2) {
    // Page mode
    delta *= (typeof window !== 'undefined' ? window.innerHeight : 800);
  }
  return delta * multiplier;
}

/**
 * Heuristic to detect touchpad / trackpad micro-deltas vs discrete wheel notches.
 *
 * @param {WheelEvent} e
 * @returns {boolean}
 */
export function isTouchpad(e) {
  // macOS wheelDeltaY heuristic: discrete notches are multiples of 120
  if ('wheelDeltaY' in e && typeof e.wheelDeltaY === 'number') {
    const isStandardWheel = e.wheelDeltaY % 120 === 0 && e.wheelDeltaX === 0;
    if (!isStandardWheel) return true;
  }
  // Fractional deltas or continuous micro-deltas typical of precision touchpads
  if (!Number.isInteger(e.deltaY) && Math.abs(e.deltaY) < 50) return true;
  return false;
}

/**
 * Traverses upwards to find any parent element with native scrolling capability.
 *
 * @param {Element} el
 * @returns {Element | null}
 */
export function findScrollableParent(el) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return null;
  let current = el;
  while (current && current !== document.body && current !== document.documentElement) {
    if (current.hasAttribute('data-smooth-scroll') && current.dataset.smoothScroll === 'prevent') {
      return current;
    }
    const style = window.getComputedStyle(current);
    const overflowY = style.overflowY;
    const isScrollable = (overflowY === 'auto' || overflowY === 'scroll');
    if (isScrollable && current.scrollHeight > current.clientHeight) {
      return current;
    }
    current = current.parentElement;
  }
  return null;
}


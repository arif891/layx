/**
 * Curated easing functions for SmoothScroll.
 * All functions accept normalized progress t in [0, 1] and return eased value in [0, 1].
 */
export const EASING = {
  linear: t => t,
  easeOutQuad: t => 1 - (1 - t) * (1 - t),
  easeOutCubic: t => 1 - Math.pow(1 - t, 3),
  easeOutQuart: t => 1 - Math.pow(1 - t, 4),
  easeOutQuint: t => 1 - Math.pow(1 - t, 5),
  easeOutExpo: t => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  easeInOutCubic: t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
};

/**
 * Resolves an easing function from a string name or function reference.
 *
 * @param {string | ((t: number) => number)} [easing]
 * @returns {(t: number) => number}
 */
export function getEasing(easing) {
  if (typeof easing === 'function') return easing;
  if (typeof easing === 'string' && EASING[easing]) return EASING[easing];
  return EASING.easeOutCubic;
}


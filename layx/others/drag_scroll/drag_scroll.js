/**
 * DragScroll
 *
 * Adds click-and-drag scrolling to any scrollable element.
 * Touch devices are intentionally left to native scroll behaviour.
 *
 * Usage:
 *   <div data-drag-scroll="x"
 *        data-drag-scroll-multiplier="1.2"
 *        data-drag-scroll-momentum="0.9"
 *        data-drag-scroll-easing="expo">…</div>
 *
 *   const scroller = new DragScroll();           // auto-init from DOM
 *   const scroller = new DragScroll('.my-list'); // custom selector
 *   scroller.add(someElement);                   // programmatic
 *   scroller.remove(someElement);
 *   scroller.refresh();                          // re-scan after DOM changes
 *   scroller.destroy();                          // full teardown
 *
 * Data attributes:
 *   data-drag-scroll               – axis: "x" (default) | "y" | "both"
 *   data-drag-scroll-multiplier    – drag-to-scroll ratio (default: 1)
 *   data-drag-scroll-momentum      – enables momentum; optional 0–1 strength (default: 0.75)
 *                                    0 = short coast, 1 = long glide
 *   data-drag-scroll-easing        – easing function name (default: "expo")
 *                                    "sine"    – gentle, short glide; great for small containers
 *                                    "cubic"   – smooth, natural; good general-purpose default
 *                                    "quart"   – snappier start, longer tail than cubic
 *                                    "quint"   – very snappy; strong deceleration
 *                                    "expo"    – fast launch, long asymptotic tail (default)
 *                                    "circ"    – sharp initial burst, abrupt-ish stop
 *                                    "back"    – slight overshoot then settle; playful
 *                                    "elastic" – spring-like bounce at the end; fun/bouncy
 *   data-drag-scroll-cursor        – idle cursor override (default: "grab")
 *   data-drag-scroll-cursor-active – drag cursor override (default: "grabbing")
 */
class DragScroll {
    // ─── Constants ────────────────────────────────────────────────────────────

    static MOVE_THRESHOLD_PX = 3;
    static VELOCITY_SAMPLES = 8;
    static DEFAULT_EASING = 'expo';

    // ─── Easing functions ─────────────────────────────────────────────────────
    //
    // All functions take t ∈ [0, 1] and return progress ∈ [0, 1].
    // They must satisfy f(0) = 0 and f(1) = 1 exactly — this is what
    // guarantees a clean, threshold-free stop at the end of inertia.
    //
    // Each entry also carries slopeAtZero: the derivative f'(0),
    // used to match the scroll velocity at release to the drag velocity
    // so there is zero discontinuity between dragging and coasting.
    //
    //   required launch velocity = dragVelocity × duration / (slopeAtZero × 16ms)

    static EASINGS = {
        sine: {
            // Gentle cosine curve. Low slope at t=0 → short, soft glide.
            // Best for: small containers, subtle lists, refined UIs.
            fn: t => 1 - Math.cos(t * Math.PI / 2),
            slopeAtZero: Math.PI / 2,   // ≈ 1.571
        },
        cubic: {
            // Smooth cubic polynomial. Feels natural and balanced.
            // Best for: general-purpose; the closest to "iOS scroll" feel.
            fn: t => 1 - Math.pow(1 - t, 3),
            slopeAtZero: 3,
        },
        quart: {
            // Quartic — snappier initial burst, longer tail than cubic.
            // Best for: horizontal carousels, image strips.
            fn: t => 1 - Math.pow(1 - t, 4),
            slopeAtZero: 4,
        },
        quint: {
            // Quintic — very snappy start, decelerates firmly.
            // Best for: when you want the content to feel weighty.
            fn: t => 1 - Math.pow(1 - t, 5),
            slopeAtZero: 5,
        },
        expo: {
            // Fast launch into a long asymptotic tail.
            // Best for: wide scrolling surfaces, map-like panning.
            fn: t => t >= 1 ? 1 : 1 - Math.pow(2, -10 * t),
            slopeAtZero: 10 * Math.LN2,   // ≈ 6.931
        },
        circ: {
            // Circular arc — sharpest initial burst of all, then levels off.
            // Best for: when you want a crisp, confident feel.
            fn: t => 1 - Math.sqrt(1 - Math.pow(Math.min(t, 1), 2)),
            slopeAtZero: 0,   // slope is technically 0 at t=0 (vertical tangent)
            // ↑ circ is a special case; we use a fixed effective slope for
            //   velocity matching to avoid divide-by-zero in EASE_K.
            slopeOverride: 1,
        },
        back: {
            // Overshoots slightly past the destination then settles back.
            // The settle is smooth — it does not cut off.
            // Best for: playful UIs, cards, thumbnails.
            fn: t => {
                const c1 = 1.70158, c3 = c1 + 1;
                return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
            },
            slopeAtZero: 0,
            slopeOverride: 3,   // effective slope for velocity matching
        },
        elastic: {
            // Spring bounce at the end. Fun and bouncy.
            // Best for: horizontal tag strips, media carousels, playful apps.
            fn: t => {
                if (t === 0 || t === 1) return t;
                const c4 = (2 * Math.PI) / 3;
                return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
            },
            slopeAtZero: 10 * Math.LN2,   // same launch slope as expo
        },
    };

    // ─── Construction ─────────────────────────────────────────────────────────

    constructor(target = '[data-drag-scroll]') {
        this._cleanups = new WeakMap();
        this._elements = new Set();
        this._selector = typeof target === 'string' ? target : null;
        this._resolveTarget(target).forEach(el => this.add(el));
    }

    // ─── Public API ───────────────────────────────────────────────────────────

    add(el) {
        if (!(el instanceof Element) || this._elements.has(el)) return;
        this._cleanups.set(el, this._bind(el, DragScroll._parseConfig(el)));
        this._elements.add(el);
    }

    remove(el) {
        const cleanup = this._cleanups.get(el);
        if (!cleanup) return;
        cleanup();
        this._cleanups.delete(el);
        this._elements.delete(el);
    }

    refresh() {
        if (!this._selector) return;
        this._resolveTarget(this._selector).forEach(el => this.add(el));
    }

    destroy() {
        this._elements.forEach(el => this.remove(el));
        this._elements.clear();
    }

    // ─── Core binding ─────────────────────────────────────────────────────────

    _bind(el, config) {
        const allowX = config.direction === 'x' || config.direction === 'both';
        const allowY = config.direction === 'y' || config.direction === 'both';

        const { fn: easeFn, slopeAtZero, slopeOverride } = config.easing;
        // EASE_K converts (velocity in px/frame) → (distance in px) for a given duration.
        // Derived from: dist = vel × duration / (slopeAtZero × 16ms/frame)
        const effectiveSlope = slopeOverride ?? slopeAtZero;
        const EASE_K = 16 * effectiveSlope;   // px/frame → px scaling constant

        const state = {
            active: false,
            hasMoved: false,
            startX: 0, startY: 0,
            scrollL: 0, scrollT: 0,
            samples: [],
            rafId: null,
        };

        // ── Style helpers ─────────────────────────────────────────────────────

        const lockStyles = () => {
            el.style.scrollBehavior = 'auto';
            el.style.scrollSnapType = 'none';
            el.style.userSelect = 'none';
        };

        const unlockStyles = () => {
            el.style.scrollBehavior = '';
            el.style.scrollSnapType = '';
            el.style.userSelect = '';
        };

        const setCursor = active =>
        (el.style.cursor = active ? config.cursorActive : config.cursor);

        // ── Inertia ───────────────────────────────────────────────────────────

        const stopInertia = () => {
            if (state.rafId === null) return;
            cancelAnimationFrame(state.rafId);
            state.rafId = null;
        };

        const startInertia = (velX, velY) => {
            const speed = Math.sqrt(velX * velX + velY * velY);
            if (speed < 0.5) { unlockStyles(); return; }

            // Duration scales with release speed, capped by strength setting.
            const maxDuration = 800 + config.strength * 1700;   // 800–2500 ms
            const duration = Math.min(speed * 50, maxDuration);

            // Total distance so scroll velocity at t=0 matches drag release velocity:
            //   d(pos)/dt|_{t=0} = dist × easeFn'(0) / duration = velX  →  dist = velX × duration / EASE_K
            const distX = EASE_K > 0 ? velX * duration / EASE_K : 0;
            const distY = EASE_K > 0 ? velY * duration / EASE_K : 0;

            const originX = el.scrollLeft;
            const originY = el.scrollTop;
            const t0 = performance.now();

            const tick = () => {
                const t = Math.min((performance.now() - t0) / duration, 1);
                const progress = easeFn(t);

                // Absolute position: no drift, no threshold, exact stop at t=1.
                if (allowX) el.scrollLeft = originX + distX * progress;
                if (allowY) el.scrollTop = originY + distY * progress;

                if (t < 1) {
                    state.rafId = requestAnimationFrame(tick);
                } else {
                    state.rafId = null;
                    unlockStyles();
                }
            };

            state.rafId = requestAnimationFrame(tick);
        };

        // ── Mouse handlers ────────────────────────────────────────────────────

        const onMouseDown = e => {
            if (e.button !== 0) return;

            stopInertia();

            state.active = true;
            state.hasMoved = false;
            state.startX = e.clientX;
            state.startY = e.clientY;
            state.scrollL = el.scrollLeft;
            state.scrollT = el.scrollTop;
            state.samples = [];

            el.classList.add('clicked');
            setCursor(true);

            window.addEventListener('mousemove', onMouseMove);
            window.addEventListener('mouseup', onMouseUp);
        };

        const onMouseMove = e => {
            if (!state.active) return;

            lockStyles();

            const dx = (e.clientX - state.startX) * config.multiplier;
            const dy = (e.clientY - state.startY) * config.multiplier;

            if (!state.hasMoved &&
                (Math.abs(dx) > DragScroll.MOVE_THRESHOLD_PX ||
                    Math.abs(dy) > DragScroll.MOVE_THRESHOLD_PX)) {
                state.hasMoved = true;
                el.classList.add('dragging');
            }

            if (allowX) el.scrollLeft = state.scrollL - dx;
            if (allowY) el.scrollTop = state.scrollT - dy;

            if (config.momentum) {
                state.samples.push({ x: e.clientX, y: e.clientY, t: performance.now() });
                if (state.samples.length > DragScroll.VELOCITY_SAMPLES) state.samples.shift();
            }
        };

        const onMouseUp = () => {
            state.active = false;
            el.classList.remove('clicked', 'dragging');
            setCursor(false);

            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);

            if (config.momentum && state.hasMoved && state.samples.length >= 2) {
                const first = state.samples[0];
                const last = state.samples[state.samples.length - 1];
                const dt = Math.max(last.t - first.t, 1);

                const velX = allowX ? -((last.x - first.x) / dt) * 16 * config.multiplier : 0;
                const velY = allowY ? -((last.y - first.y) / dt) * 16 * config.multiplier : 0;

                startInertia(velX, velY);
            } else {
                unlockStyles();
            }
        };

        const onClick = e => {
            if (state.hasMoved) {
                e.preventDefault();
                e.stopImmediatePropagation();
            }
        };

        // ── Register ──────────────────────────────────────────────────────────

        el.addEventListener('mousedown', onMouseDown);
        el.addEventListener('click', onClick, true);
        setCursor(false);

        return () => {
            stopInertia();
            unlockStyles();
            el.style.cursor = '';
            el.classList.remove('clicked', 'dragging');
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
            el.removeEventListener('mousedown', onMouseDown);
            el.removeEventListener('click', onClick, true);
        };
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    _resolveTarget(target) {
        if (typeof target === 'string') return Array.from(document.querySelectorAll(target));
        if (target instanceof Element) return [target];
        if (target instanceof NodeList || Array.isArray(target)) return Array.from(target);
        return [];
    }

    static _parseConfig(el) {
        const raw = (el.dataset.dragScroll ?? 'x').trim().toLowerCase();
        const momentumAttr = el.getAttribute('data-drag-scroll-momentum');
        const momentum = momentumAttr !== null;
        const strength = Math.min(Math.max(parseFloat(momentumAttr) || 0.75, 0), 1);
        const easingKey = (el.dataset.dragScrollEasing ?? DragScroll.DEFAULT_EASING).trim().toLowerCase();

        return {
            direction: ['x', 'y', 'both'].includes(raw) ? raw : 'x',
            multiplier: Math.abs(parseFloat(el.dataset.dragScrollMultiplier)) || 1,
            momentum,
            strength,
            easing: DragScroll.EASINGS[easingKey] ?? DragScroll.EASINGS[DragScroll.DEFAULT_EASING],
            cursor: el.dataset.dragScrollCursor || 'grab',
            cursorActive: el.dataset.dragScrollCursorActive || 'grabbing',
        };
    }
}

export default new DragScroll();
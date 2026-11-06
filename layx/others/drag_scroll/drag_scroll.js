/**
 * DragScroll
 *
 * Adds click-and-drag scrolling with momentum and elastic boundary resistance
 * to any scrollable element. Touch devices are left to native scroll behaviour.
 *
 * Usage:
 *   <div data-drag-scroll="x"
 *        data-drag-scroll-multiplier="1.2"
 *        data-drag-scroll-momentum="0.9"
 *        data-drag-scroll-elastic="true"
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
 *   data-drag-scroll-elastic       – enables rubber-band boundary resistance (default: true)
 *   data-drag-scroll-item          – selector for items to elastically transform (default: direct children)
 *   data-drag-scroll-easing        – easing function name (default: "expo")
 *   data-drag-scroll-cursor        – idle cursor override (default: "grab")
 *   data-drag-scroll-cursor-active – drag cursor override (default: "grabbing")
 */
class DragScroll {
    // ─── Constants ────────────────────────────────────────────────────────────

    static MOVE_THRESHOLD_PX = 3;
    static VELOCITY_SAMPLES = 8;
    static DEFAULT_EASING = 'expo';

    // ─── Easing functions ─────────────────────────────────────────────────────

    static EASINGS = {
        sine: {
            fn: t => (t >= 1 ? 1 : 1 - Math.cos((t * Math.PI) / 2)),
            slopeAtZero: Math.PI / 2,
        },
        cubic: {
            fn: t => 1 - Math.pow(1 - t, 3),
            slopeAtZero: 3,
        },
        quart: {
            fn: t => 1 - Math.pow(1 - t, 4),
            slopeAtZero: 4,
        },
        quint: {
            fn: t => 1 - Math.pow(1 - t, 5),
            slopeAtZero: 5,
        },
        expo: {
            fn: t => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
            slopeAtZero: 10 * Math.LN2,
        },
        circ: {
            fn: t => 1 - Math.sqrt(1 - Math.pow(Math.min(t, 1), 2)),
            slopeAtZero: 0,
            slopeOverride: 1,
        },
        back: {
            fn: t => {
                if (t === 0) return 0;
                if (t >= 1) return 1;
                const c1 = 1.70158;
                const c3 = c1 + 1;
                return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
            },
            slopeAtZero: 0,
            slopeOverride: 3,
        },
        elastic: {
            fn: t => {
                if (t === 0 || t === 1) return t;
                const c4 = (2 * Math.PI) / 3;
                return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
            },
            slopeAtZero: 10 * Math.LN2,
        },
    };

    // ─── Construction ─────────────────────────────────────────────────────────

    constructor(target = '[data-drag-scroll]') {
        this._cleanups = new WeakMap();
        this._elements = new Set();
        this._selector = typeof target === 'string' ? target : null;

        if (typeof window !== 'undefined' && typeof document !== 'undefined') {
            this._resolveTarget(target).forEach(el => this.add(el));
        }
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
        const effectiveSlope = slopeOverride ?? slopeAtZero;
        const EASE_K = 16 * effectiveSlope;

        const state = {
            active: false,
            hasMoved: false,
            startX: 0,
            startY: 0,
            scrollL: 0,
            scrollT: 0,
            overshootX: 0,
            overshootY: 0,
            samples: [],
            rafId: null,
            resetTransformTimer: null,
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

        const setCursor = active => {
            el.style.cursor = active ? config.cursorActive : config.cursor;
        };

        const getItems = () => {
            if (config.itemSelector) {
                return el.querySelectorAll(config.itemSelector);
            }
            return el.children;
        };

        const applyElasticTransform = (x, y) => {
            const transform = (x !== 0 || y !== 0) ? `translate3d(${x}px, ${y}px, 0)` : '';
            const items = getItems();
            for (let i = 0; i < items.length; i++) {
                items[i].style.transform = transform;
            }
        };

        const snapBackElastic = (durationMs = 380) => {
            if (state.overshootX !== 0 || state.overshootY !== 0) {
                state.overshootX = 0;
                state.overshootY = 0;
                clearTimeout(state.resetTransformTimer);
                const items = getItems();
                const transition = `transform ${durationMs}ms cubic-bezier(0.175, 0.885, 0.32, 1.15)`;
                for (let i = 0; i < items.length; i++) {
                    items[i].style.transition = transition;
                    items[i].style.transform = 'translate3d(0, 0, 0)';
                }
                state.resetTransformTimer = setTimeout(() => {
                    for (let i = 0; i < items.length; i++) {
                        items[i].style.transition = '';
                        items[i].style.transform = '';
                    }
                }, durationMs);
            }
        };

        const clearElasticStyles = () => {
            clearTimeout(state.resetTransformTimer);
            const items = getItems();
            for (let i = 0; i < items.length; i++) {
                items[i].style.transform = '';
                items[i].style.transition = '';
            }
            state.overshootX = 0;
            state.overshootY = 0;
        };

        // ── Inertia ───────────────────────────────────────────────────────────

        const stopInertia = () => {
            if (state.rafId === null) return;
            cancelAnimationFrame(state.rafId);
            state.rafId = null;
        };

        const startInertia = (velX, velY) => {
            const speed = Math.sqrt(velX * velX + velY * velY);
            if (speed < 0.5) {
                unlockStyles();
                return;
            }

            const maxDuration = 800 + config.strength * 1700;
            const duration = Math.min(speed * 50, maxDuration);

            const distX = EASE_K > 0 ? (velX * duration) / EASE_K : 0;
            const distY = EASE_K > 0 ? (velY * duration) / EASE_K : 0;

            const originX = el.scrollLeft;
            const originY = el.scrollTop;
            const t0 = performance.now();

            const tick = () => {
                const t = Math.min((performance.now() - t0) / duration, 1);
                const progress = easeFn(t);

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

            // Clear any running snap-back transition
            clearElasticStyles();

            state.active = true;
            state.hasMoved = false;
            state.startX = e.clientX;
            state.startY = e.clientY;
            state.scrollL = el.scrollLeft;
            state.scrollT = el.scrollTop;
            state.overshootX = 0;
            state.overshootY = 0;
            state.samples = [];

            el.classList.add('clicked');
            setCursor(true);

            window.addEventListener('mousemove', onMouseMove);
            window.addEventListener('mouseup', onMouseUp);
        };

        const onMouseMove = e => {
            if (!state.active) return;

            lockStyles();

            const rawDx = e.clientX - state.startX;
            const rawDy = e.clientY - state.startY;
            const dx = rawDx * config.multiplier;
            const dy = rawDy * config.multiplier;

            if (!state.hasMoved &&
                (Math.abs(dx) > DragScroll.MOVE_THRESHOLD_PX ||
                 Math.abs(dy) > DragScroll.MOVE_THRESHOLD_PX)) {
                state.hasMoved = true;
                el.classList.add('dragging');
            }

            const maxL = Math.max(0, el.scrollWidth - el.clientWidth);
            const maxT = Math.max(0, el.scrollHeight - el.clientHeight);

            const targetL = state.scrollL - dx;
            const targetT = state.scrollT - dy;

            let overX = 0;
            let overY = 0;

            if (allowX) {
                if (targetL < 0) {
                    el.scrollLeft = 0;
                    overX = -targetL; // pulling to the right past 0
                } else if (targetL > maxL) {
                    el.scrollLeft = maxL;
                    overX = -(targetL - maxL); // pulling to the left past max
                } else {
                    el.scrollLeft = targetL;
                    overX = 0;
                }
            }

            if (allowY) {
                if (targetT < 0) {
                    el.scrollTop = 0;
                    overY = -targetT;
                } else if (targetT > maxT) {
                    el.scrollTop = maxT;
                    overY = -(targetT - maxT);
                } else {
                    el.scrollTop = targetT;
                    overY = 0;
                }
            }

            // Elastic rubber-band resistance when dragging beyond limits
            if (config.elastic && (overX !== 0 || overY !== 0)) {
                const rx = Math.sign(overX) * Math.min(50, Math.pow(Math.abs(overX), 0.72) * 1.5);
                const ry = Math.sign(overY) * Math.min(50, Math.pow(Math.abs(overY), 0.72) * 1.5);
                applyElasticTransform(rx, ry);
                state.overshootX = rx;
                state.overshootY = ry;
            } else if (state.overshootX !== 0 || state.overshootY !== 0) {
                applyElasticTransform(0, 0);
                state.overshootX = 0;
                state.overshootY = 0;
            }

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

            // Snap back if stretched elastically past boundary
            const wasStretched = state.overshootX !== 0 || state.overshootY !== 0;
            if (wasStretched) {
                snapBackElastic(380);
                unlockStyles();
                return;
            }

            // Check if user paused before release (drop velocity if stationary > 60ms)
            const now = performance.now();
            const lastSample = state.samples[state.samples.length - 1];
            const isPaused = lastSample ? (now - lastSample.t > 60) : false;

            if (config.momentum && state.hasMoved && state.samples.length >= 2 && !isPaused) {
                const first = state.samples[0];
                const dt = Math.max(lastSample.t - first.t, 1);

                const velX = allowX ? -((lastSample.x - first.x) / dt) * 16 * config.multiplier : 0;
                const velY = allowY ? -((lastSample.y - first.y) / dt) * 16 * config.multiplier : 0;

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

        // Prevent native HTML5 ghost image/link drag from interrupting pointer tracking
        const onDragStart = e => {
            if (state.active) {
                e.preventDefault();
            }
        };

        // ── Register ──────────────────────────────────────────────────────────

        el.addEventListener('mousedown', onMouseDown);
        el.addEventListener('click', onClick, true);
        el.addEventListener('dragstart', onDragStart);
        setCursor(false);

        return () => {
            stopInertia();
            unlockStyles();
            clearElasticStyles();
            el.style.cursor = '';
            el.classList.remove('clicked', 'dragging');
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
            el.removeEventListener('mousedown', onMouseDown);
            el.removeEventListener('click', onClick, true);
            el.removeEventListener('dragstart', onDragStart);
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
        const elasticAttr = el.getAttribute('data-drag-scroll-elastic');
        const elastic = elasticAttr !== 'false';
        const easingKey = (el.dataset.dragScrollEasing ?? DragScroll.DEFAULT_EASING).trim().toLowerCase();

        return {
            direction: ['x', 'y', 'both'].includes(raw) ? raw : 'x',
            multiplier: Math.abs(parseFloat(el.dataset.dragScrollMultiplier)) || 1,
            momentum,
            strength,
            elastic,
            itemSelector: el.dataset.dragScrollItem || null,
            easing: DragScroll.EASINGS[easingKey] ?? DragScroll.EASINGS[DragScroll.DEFAULT_EASING],
            cursor: el.dataset.dragScrollCursor || 'grab',
            cursorActive: el.dataset.dragScrollCursorActive || 'grabbing',
        };
    }
}

export { DragScroll };
export default (typeof window !== 'undefined' ? new DragScroll() : null);

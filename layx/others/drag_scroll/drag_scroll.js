class DragScroll {
    constructor(selector = '[data-drag-scroll]') {
        this.elements = document.querySelectorAll(selector);
        this.instances = new Map();
        this.init();
    }

    init() {
        this.elements.forEach(ele => {
            const config = {
                direction: (ele.dataset.dragScroll || 'x').trim().toLowerCase(),
                multiplier: parseFloat(ele.dataset.dragScrollMultiplier) || 1,
                momentum: ele.hasAttribute('data-drag-scroll-momentum'),
                friction: parseFloat(ele.dataset.dragScrollFriction) || 0.91,
            };
            this._bind(ele, config);
        });
    }

    _bind(ele, config) {
        const state = {
            isDragging: false,
            hasMoved: false,
            startX: 0, startY: 0,
            scrollL: 0, scrollT: 0,
            velX: 0, velY: 0,
            rafId: null,
        };

        const allowX = config.direction === 'x' || config.direction === 'both';
        const allowY = config.direction === 'y' || config.direction === 'both';

        // 1. Helper to restore styles when animation is truly finished
        const unlockScrollStyles = () => {
            ele.style.scrollBehavior = '';
            ele.style.scrollSnapType = '';
        };

        const stopInertia = () => {
            if (state.rafId) {
                cancelAnimationFrame(state.rafId);
                state.rafId = null;
            }
        };

        const onPointerDown = (e) => {
            if (e.button !== 0) return;

            stopInertia();
            state.isDragging = true;
            state.hasMoved = false;

            state.startX = e.clientX;
            state.startY = e.clientY;
            state.scrollL = ele.scrollLeft;
            state.scrollT = ele.scrollTop;

            state.velX = 0;
            state.velY = 0;

            // 2. Lock styles immediately on touch/click
            ele.style.scrollBehavior = 'auto';
            ele.style.scrollSnapType = 'none';

            ele.style.cursor = 'grabbing';
            ele.style.userSelect = 'none';
            window.addEventListener('pointermove', onPointerMove);
            window.addEventListener('pointerup', onPointerUp);
        };

        const onPointerMove = (e) => {
            if (!state.isDragging) return;

            const dx = (e.clientX - state.startX) * config.multiplier;
            const dy = (e.clientY - state.startY) * config.multiplier;

            if (Math.abs(dx) > 2 || Math.abs(dy) > 2) state.hasMoved = true;

            if (allowX) {
                const prevLeft = ele.scrollLeft;
                ele.scrollLeft = state.scrollL - dx;
                state.velX = ele.scrollLeft - prevLeft;
            }
            if (allowY) {
                const prevTop = ele.scrollTop;
                ele.scrollTop = state.scrollT - dy;
                state.velY = ele.scrollTop - prevTop;
            }
        };

        const applyInertia = () => {
            state.velX *= config.friction;
            state.velY *= config.friction;

            if (allowX) ele.scrollLeft += state.velX;
            if (allowY) ele.scrollTop += state.velY;

            // Check if movement is still significant
            if (Math.abs(state.velX) > 0.1 || Math.abs(state.velY) > 0.1) {
                state.rafId = requestAnimationFrame(applyInertia);
            } else {
                // 3. Animation finished! Clean up.
                stopInertia();
                unlockScrollStyles();
            }
        };

        const onPointerUp = () => {
            state.isDragging = false;
            ele.style.cursor = '';
            ele.style.userSelect = '';

            window.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('pointerup', onPointerUp);

            if (config.momentum && state.hasMoved) {
                state.rafId = requestAnimationFrame(applyInertia);
            } else {
                // If no momentum is applied, unlock immediately
                unlockScrollStyles();
            }
        };

        const onClick = (e) => {
            if (state.hasMoved) {
                e.preventDefault();
                e.stopImmediatePropagation();
            }
        };

        ele.addEventListener('pointerdown', onPointerDown);
        ele.addEventListener('click', onClick, true);

        this.instances.set(ele, () => {
            stopInertia();
            unlockScrollStyles();
            ele.removeEventListener('pointerdown', onPointerDown);
            ele.removeEventListener('click', onClick, true);
        });
    }

    destroy() {
        this.instances.forEach((cleanup) => cleanup());
        this.instances.clear();
    }
}

export default new DragScroll();

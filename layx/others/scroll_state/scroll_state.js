/*********************************************************************
 * ScrollState – tracks scroll metrics & exposes as CSS variables
 *********************************************************************/
class ScrollState {
    constructor(options = {}) {
        // Bind methods
        this._onSmoothStart = this._onSmoothStart.bind(this);
        this._onSmoothUpdate = this._onSmoothUpdate.bind(this);
        this._onSmoothEnd = this._onSmoothEnd.bind(this);
        this._onNativeScroll = this._onNativeScroll.bind(this);
        this._updateLoop = this._updateLoop.bind(this);

        // State
        this.currentScroll = window.scrollY;
        this.previousScroll = window.scrollY;
        this.instantVelocity = 0;
        this.velocity = 0;
        this.direction = 0;
        this.isScrolling = false;
        this.lastUpdateTime = performance.now();
        this.scrollEndTimeout = null;
        this.rafId = null;

        // Config
        this.updateVelocity = options.updateVelocity ?? false;
        this.updateCSS = options.updateCSS ?? false;
        this.topThreshold = options.topThreshold ?? window.innerHeight / 4;
        this.velocitySmoothing = options.velocitySmoothing ?? 0.1;
        this.velocityDamping = options.velocityDamping ?? 0.9;
        this.scrollEndDelay = options.scrollEndDelay ?? 50;

        // SmoothScroll integration (auto-detect)
        this.smoothScroll = options.smoothScroll || window.__smoothScrollInstance;

        if (window.__scrollStateInstance) {
            console.warn('ScrollState already initialized.');
            return;
        }

        if (this.smoothScroll) {
            this.smoothScroll
                .on('start', this._onSmoothStart)
                .on('update', this._onSmoothUpdate)
                .on('complete', this._onSmoothEnd)
                .on('interrupt', this._onSmoothEnd);
        } else {
            window.addEventListener('scroll', this._onNativeScroll, { passive: true });
        }

        window.__scrollStateInstance = this;
    }

    /* ---------- private event handlers ---------- */
    _onSmoothStart() {
        this.isScrolling = true;
        this._startLoop();
    }

    _onSmoothUpdate(data) {
        this._measureScroll(data.currentScroll ?? window.scrollY);
    }

    _onSmoothEnd() {
        this._scheduleScrollEnd();
    }

    _onNativeScroll() {
        if (!this.isScrolling) {
            this.isScrolling = true;
            this._startLoop();
        }
        this._measureScroll(window.scrollY);
        this._scheduleScrollEnd();
    }

    _measureScroll(scrollY) {

        this.previousScroll = this.currentScroll;
        this.currentScroll = scrollY;
        const deltaY = this.currentScroll - this.previousScroll;

        if (deltaY > 0) this.direction = 1;
        else if (deltaY < 0) this.direction = -1;


        if (this.updateVelocity) {
            const now = performance.now();
            const deltaTime = now - this.lastUpdateTime || 16;
            this.lastUpdateTime = now;

            this.instantVelocity = Math.max(-1, Math.min(1,
                (deltaY / window.innerHeight) / (deltaTime / 1000)));
        }
    }

    _scheduleScrollEnd() {
        clearTimeout(this.scrollEndTimeout);
        this.scrollEndTimeout = setTimeout(() => {
            this.isScrolling = false;
            this.direction = 0;
        }, this.scrollEndDelay);
    }

    _startLoop() {
        if (this.rafId === null) {
            this.rafId = requestAnimationFrame(this._updateLoop);
        }
    }

    _stopLoop() {
        if (this.rafId !== null) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }
    }

    _updateLoop() {
        if (this.updateVelocity) {
            if (this.isScrolling) {
                this.velocity += (this.instantVelocity - this.velocity) * this.velocitySmoothing;
            } else {
                this.velocity *= this.velocityDamping;
            }

            // stop loop when velocity becomes negligible
            if (Math.abs(this.velocity) < 0.001 && !this.isScrolling) {
                this.velocity = 0;
                this._stopLoop();
                this._updateCSS();
                this._updateClasses();
                return;
            }
        }

        this._updateCSS();
        this._updateClasses();
        this.rafId = requestAnimationFrame(this._updateLoop);
    }

    _updateCSS() {
        const root = document.documentElement;
        const maxScroll = root.scrollHeight - window.innerHeight;

        if (this.updateCSS) {
            const scrollPct = maxScroll > 0 ? this.currentScroll / maxScroll : 0;
             
            root.style.setProperty('--scroll-position', scrollPct.toFixed(2));
            root.style.setProperty('--scroll-direction', this.direction);
        }

        if (this.updateVelocity) {
            root.style.setProperty('--scroll-velocity', this.velocity.toFixed(3));
        }

        root.classList.toggle('scrolled', this.currentScroll >= this.topThreshold);
        root.classList.toggle('bottom', this.currentScroll >= maxScroll - 1);
    }

    _updateClasses() {
        const root = document.documentElement;
        root.classList.toggle('scrolling', this.isScrolling);
        if (this.direction !== 0 || this.isScrolling) {
            root.classList.toggle('down', this.direction === 1);
            root.classList.toggle('up', this.direction === -1);
        }
    }

    /* ---------- public API ---------- */
    destroy() {
        clearTimeout(this.scrollEndTimeout);
        this._stopLoop();

        if (this.smoothScroll) {
            this.smoothScroll
                .off('start', this._onSmoothStart)
                .off('update', this._onSmoothUpdate)
                .off('complete', this._onSmoothEnd)
                .off('interrupt', this._onSmoothEnd);
        } else {
            window.removeEventListener('scroll', this._onNativeScroll);
        }

        const root = document.documentElement;
        root.style.removeProperty('--scroll-position');
        root.style.removeProperty('--scroll-velocity');
        root.style.removeProperty('--scroll-direction');
        root.classList.remove('scrolling', 'up', 'down', 'bottom', 'scrolled');
    }
}

export default new ScrollState();
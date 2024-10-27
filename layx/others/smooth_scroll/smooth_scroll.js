class SmoothScroll {
    constructor(options = {}) {
        this.targetScroll = window.scrollY;
        this.currentScroll = window.scrollY;
        this.ease = options.ease || .075;
        this.threshold = options.threshold || .5;
        this.isScrolling = false;
        this.rafId = null;
        this.enableTouch = options.enableTouch || false;
        this.touchSensitivity = options.touchSensitivity || 2; 

        // Bind methods
        this.onWheel = this.onWheel.bind(this);
        this.onScroll = this.onScroll.bind(this);
        this.onKeyDown = this.onKeyDown.bind(this);
        this.update = this.update.bind(this);

        if (this.enableTouch) {
            this.touchStart = 0;
            this.onTouchStart = this.onTouchStart.bind(this);
            this.onTouchMove = this.onTouchMove.bind(this);
        }

        // Add event listeners
        this.addEventListeners();

        // Start the smooth scroll loop
        this.update();
    }

    addEventListeners() {
        window.addEventListener('wheel', this.onWheel, { passive: false });
        window.addEventListener('scroll', this.onScroll, { passive: true });
        window.addEventListener('keydown', this.onKeyDown);

        if (this.enableTouch) {
            window.addEventListener('touchstart', this.onTouchStart, { passive: false });
            window.addEventListener('touchmove', this.onTouchMove, { passive: false });
        }
    }

    onWheel(event) {
        event.preventDefault();
        this.targetScroll += event.deltaY;
        this.clampTargetScroll();
        this.startScrolling();
    }

    onScroll() {
        if (!this.isScrolling) {
            this.targetScroll = window.scrollY;
            this.currentScroll = window.scrollY;
        }
    }

    onKeyDown(event) {
        const keys = {
            ArrowUp: -50,
            ArrowDown: 50,
            PageUp: -window.innerHeight,
            PageDown: window.innerHeight,
            Home: -document.documentElement.scrollHeight,
            End: document.documentElement.scrollHeight
        };

        const delta = keys[event.key];
        if (delta) {
            event.preventDefault();
            this.targetScroll += delta;
            this.clampTargetScroll();
            this.startScrolling();
        }
    }

    onTouchStart(event) {
        this.touchStart = event.touches[0].clientY;
    }

    onTouchMove(event) {
        event.preventDefault();
        const touch = event.touches[0];
        const deltaY = this.touchStart - touch.clientY;
        this.targetScroll += deltaY * this.touchSensitivity; 
        this.touchStart = touch.clientY;
        this.clampTargetScroll();
        this.startScrolling();
    }

    clampTargetScroll() {
        const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
        this.targetScroll = Math.max(0, Math.min(this.targetScroll, maxScroll));
    }

    startScrolling() {
        if (!this.isScrolling) {
            this.isScrolling = true;
            this.update();
        }
    }

    update() {
        const diff = this.targetScroll - this.currentScroll;

        if (Math.abs(diff) > this.threshold) {
            this.currentScroll += diff * this.ease;
            window.scrollTo(0, Math.round(this.currentScroll));
            this.rafId = requestAnimationFrame(this.update);
        } else {
            this.currentScroll = this.targetScroll;
            window.scrollTo(0, Math.round(this.currentScroll));
            this.isScrolling = false;
            cancelAnimationFrame(this.rafId);
        }
    }

    destroy() {
        window.removeEventListener('wheel', this.onWheel);
        window.removeEventListener('scroll', this.onScroll);
        window.removeEventListener('keydown', this.onKeyDown);

        if (this.enableTouch) {
            window.removeEventListener('touchstart', this.onTouchStart);
            window.removeEventListener('touchmove', this.onTouchMove);
        }

        cancelAnimationFrame(this.rafId);
    }
}


export default new SmoothScroll();
export {SmoothScroll};
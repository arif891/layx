class Carousel {
    constructor(selector = 'carousel', options = {}) {
        this.options = {
            scrollerSelector: '.scroller',
            itemSelector: '.item',
            autoplayInterval: 3000,
            loop: true,
            mouseDrag: true,
            keyboardNavigation: true,
            dragMultiplier: 2,
            ...options
        };

        this.carousels = document.querySelectorAll(selector);


        this.states = new WeakMap();
        this.controllers = new WeakMap();
        this.autoplayTimers = new WeakMap();

        this.init();
    }

    init() {
        this.carousels.forEach(carousel => {
            const scroller = carousel.querySelector(this.options.scrollerSelector);
            const items = Array.from(carousel.querySelectorAll(this.options.itemSelector));

            if (!scroller || items.length === 0) return;

            this.states.set(carousel, {
                currentIndex: 0,
                itemCount: items.length,
                isPlaying: carousel.hasAttribute('autoplay'),
                isPaused: false,
                isManualScrolling: false,
                snap: /mandatory|proximity/.test(getComputedStyle(scroller).scrollSnapType),
                autoplay: carousel.hasAttribute('autoplay'),
                autoplayInterval: +carousel.dataset.autoplayInterval || this.options.autoplayInterval,
                dragMultiplier: +carousel.dataset.dragMultiplier || this.options.dragMultiplier,
                mouseDrag: carousel.dataset.mouseDrag !== 'false' && this.options.mouseDrag,
                keyboardNavigation: carousel.dataset.keyboardNavigation !== 'false' && this.options.keyboardNavigation,
                loop: carousel.hasAttribute('loop'),
            });

            // Initialize AbortController for clean destroy()
            const controller = new AbortController();
            this.controllers.set(carousel, controller);

            // Setup UI
            this._buildUI(carousel, items);

            // Bind Events
            this.setupEventListeners(carousel, scroller, items, controller.signal);
            this.setupKeyboardNavigation(carousel, controller.signal);

            if (this.states.get(carousel).autoplay) {
                this.setupAutoplay(carousel, controller.signal);
            }

            // Initial Render
            this.updateUI(carousel, 0);
        });
    }


    /* ---------- DOM helpers ---------- */
    _buildUI(carousel, items) {
        if (!carousel.classList.contains('no-controls') && !carousel.querySelector('.control-wrapper')) {
            carousel.insertAdjacentHTML('beforeend',
                `<div class="control-wrapper">
           <div class="left"><button class="prev" aria-label="Previous"></button></div>
           <div class="right"><button class="next" aria-label="Next"></button></div>
         </div>`);
        }
        if (!carousel.classList.contains('no-indicators') && !carousel.querySelector('.indicator-wrapper')) {
            carousel.insertAdjacentHTML('beforeend',
                `<div class="indicator-wrapper">
           ${items.map((_, i) => `<button class="indicator" data-index="${i}" aria-label="Go to ${i + 1}"></button>`).join('')}
         </div>`);
        }
    }

    setupEventListeners(carousel, scroller, items, signal) {
        carousel.addEventListener('click', (e) => {
            const state = this.states.get(carousel);
            const target = e.target;

            if (target.closest('.prev')) this.navigate(carousel, -1);
            else if (target.closest('.next')) this.navigate(carousel, 1);
            else if (target.matches('.indicator')) {
                const index = target.dataset.index;
                this.goToSlide(carousel, index);
            }
        }, { signal });

        const observer = new IntersectionObserver((entries) => {
            const state = this.states.get(carousel);

            if (state.isManualScrolling) return;

            const visibleEntry = entries.find(entry => entry.isIntersecting && entry.intersectionRatio > 0.5);

            if (visibleEntry) {
                const newIndex = items.indexOf(visibleEntry.target);
                if (newIndex !== -1 && newIndex !== state.currentIndex) {
                    state.currentIndex = newIndex;
                    this.updateUI(carousel, newIndex);
                }
            }
        }, { root: scroller, threshold: 0.5 });

        items.forEach(item => observer.observe(item));

        if (this.states.get(carousel).mouseDrag) {
            this.setupMouseDrag(carousel, scroller, items, signal);
        }
    }

    setupMouseDrag(carousel, scroller, items, signal) {
        let isDown = false;
        let startX, scrollLeft;
        const state = this.states.get(carousel);

        const startDrag = (e) => {
            if (state.dragTimeout) {
                clearTimeout(state.dragTimeout);
                state.dragTimeout = null;
            }
            isDown = true;
            carousel.classList.add('dragging');
            startX = e.pageX - scroller.offsetLeft;
            scrollLeft = scroller.scrollLeft;
            state.isManualScrolling = true;
        };

        const stopDrag = () => {
            if (!isDown) return;
            isDown = false;

            if (state.dragTimeout) {
                clearTimeout(state.dragTimeout);
            }

            state.dragTimeout = setTimeout(() => {
                carousel.classList.remove('dragging');
                state.dragTimeout = null;
            }, 500);

            state.isManualScrolling = false;

            if (this.states.get(carousel).snap) {
                this.snapToNearest(carousel, scroller, items);
            }
        };

        const moveDrag = (e) => {
            if (!isDown) return;
            e.preventDefault();
            const x = e.pageX - scroller.offsetLeft;
            const walk = (x - startX) * state.dragMultiplier;
            scroller.scrollLeft = scrollLeft - walk;
        };

        scroller.addEventListener('mousedown', startDrag, { signal });
        document.addEventListener('mouseleave', stopDrag, { signal });
        document.addEventListener('mouseup', stopDrag, { signal });
        document.addEventListener('mousemove', moveDrag, { signal });
    }

    setupKeyboardNavigation(carousel, signal) {
        const state = this.states.get(carousel);
        if (!state.keyboardNavigation) return;

        carousel.setAttribute('tabindex', '0');
        carousel.addEventListener('keydown', (e) => {
            switch (e.key) {
                case 'ArrowLeft': this.navigate(carousel, -1); break;
                case 'ArrowRight': this.navigate(carousel, 1); break;
                case ' ':
                    e.preventDefault();
                    this.toggleAutoplay(carousel);
                    break;
            }
        }, { signal });
    }

    setupAutoplay(carousel, signal) {
        const start = () => {
            this.clearAutoplay(carousel);
            const state = this.states.get(carousel);
            const timer = setInterval(() => {
                if (!state.isPaused) this.navigate(carousel, 1);
            }, state.autoplayInterval);
            this.autoplayTimers.set(carousel, timer);
        };

        start();

        const pause = () => { this.states.get(carousel).isPaused = true; };
        const resume = () => { this.states.get(carousel).isPaused = false; };

        carousel.addEventListener('mouseenter', pause, { signal });
        carousel.addEventListener('focusin', pause, { signal });
        carousel.addEventListener('mouseleave', resume, { signal });
        carousel.addEventListener('focusout', resume, { signal });
    }

    navigate(carousel, direction) {
        const state = this.states.get(carousel);
        let newIndex = state.currentIndex + direction;

        if (state.loop) {
            newIndex = (newIndex + state.itemCount) % state.itemCount;
        } else {
            newIndex = Math.max(0, Math.min(newIndex, state.itemCount - 1));
        }

        this.goToSlide(carousel, newIndex);
    }

    goToSlide(carousel, index) {
        const state = this.states.get(carousel);
        const scroller = carousel.querySelector(this.options.scrollerSelector);
        const items = carousel.querySelectorAll(this.options.itemSelector);

        if (index < 0 || index >= items.length) return;

        state.currentIndex = index;
        state.isManualScrolling = true

        const targetItem = items[index];
        const scrollSnapAlign = window.getComputedStyle(targetItem).scrollSnapAlign;

        targetItem.scrollIntoView({
            block: 'nearest',
            inline: scrollSnapAlign === 'none' ? 'start' : scrollSnapAlign,
            behavior: 'smooth'
        });


        this.updateUI(carousel, index);

        setTimeout(() => {
            state.isManualScrolling = false;
        }, 500);
    }

    snapToNearest(carousel, scroller, items) {
        let closestIndex = 0;
        let minDistance = Infinity;
        const currentScroll = scroller.scrollLeft;

        items.forEach((item, index) => {
            const itemPos = item.offsetLeft - scroller.offsetLeft;
            const distance = Math.abs(currentScroll - itemPos);
            if (distance < minDistance) {
                minDistance = distance;
                closestIndex = index;
            }
        });

        this.goToSlide(carousel, closestIndex);
    }

    updateUI(carousel, index) {
        const indicators = carousel.querySelectorAll('.indicator');
        indicators.forEach((ind, i) => {
            if (i === index) ind.classList.add('active');
            else ind.classList.remove('active');
        });

        const items = carousel.querySelectorAll(this.options.itemSelector);
        items.forEach((item, i) => {
            if (i === index) item.classList.add('active');
            else item.classList.remove('active');
        });
    }

    toggleAutoplay(carousel) {
        const state = this.states.get(carousel);
        state.isPlaying = !state.isPlaying;
        state.isPaused = !state.isPlaying;

        if (state.isPlaying) this.setupAutoplay(carousel, this.controllers.get(carousel).signal);
        else this.clearAutoplay(carousel);
    }

    clearAutoplay(carousel) {
        if (this.autoplayTimers.has(carousel)) {
            clearInterval(this.autoplayTimers.get(carousel));
            this.autoplayTimers.delete(carousel);
        }
    }

    destroy() {
        this.carousels.forEach(carousel => {
            if (this.controllers.has(carousel)) {
                this.controllers.get(carousel).abort();
            }

            this.clearAutoplay(carousel);
        });
        this.states = new WeakMap();
        this.controllers = new WeakMap();
    }
}

export default new Carousel();
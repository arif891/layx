class Carousel {
    constructor(selector = 'carousel', options = {}) {
        this.options = {
            scrollerSelector: '.scroller',
            itemSelector: '.item',
            autoplay: false,
            autoplayInterval: 3000,
            loop: false,
            mouseDrag: true,
            keyboardNavigation: true,
            snap: true,
            ...options
        };

        this.carousels = document.querySelectorAll(selector);
        this.autoplayIntervals = new WeakMap();
        this.dragData = new WeakMap();

        this.init();
    }

    init() {
        this.carousels.forEach(carousel => {
            const scroller = carousel.querySelector(this.options.scrollerSelector);
            const items = Array.from(carousel.querySelectorAll(this.options.itemSelector));

            if (!scroller || items.length === 0) return;

            this.ensureControls(carousel);
            this.ensureIndicators(carousel, items);

            const state = {
                currentIndex: 0,
                itemCount: items.length,
                isPlaying: this.options.autoplay,
                isPaused: false
            };

            if (!carousel.hasOwnProperty('carouselState')) {
                Object.defineProperty(carousel, 'carouselState', {
                    value: state,
                    writable: false,
                    configurable: false
                });
            }

            const prevBtn = carousel.querySelector('.prev');
            const nextBtn = carousel.querySelector('.next');
            const indicatorsWrapper = carousel.querySelector('.indicator-wrapper');

            this.setupEventListeners(carousel, state, prevBtn, nextBtn, indicatorsWrapper, items);
            this.setupAccessibility(carousel, items);
            this.setupKeyboardNavigation(carousel, state);

            if (this.options.autoplay) {
                this.setupAutoplay(carousel, state);
            }

            this.updateCarousel(carousel, state);
        });
    }

    ensureControls(carousel) {
        if (carousel.hasAttribute('controls') && !carousel.querySelector('.control-wrapper')) {
            const controlWrapper = document.createElement('div');
            controlWrapper.classList.add('control-wrapper');

            const createControl = (className, buttonClass) => {
                const control = document.createElement('div');
                control.classList.add(className);
                const button = document.createElement('button');
                button.classList.add(buttonClass);
                control.appendChild(button);
                return control;
            };

            const leftControl = createControl('left', 'prev');
            const rightControl = createControl('right', 'next');

            controlWrapper.append(leftControl, rightControl);
            carousel.appendChild(controlWrapper);
        }
    }

    ensureIndicators(carousel, items) {
        if (carousel.hasAttribute('indicators')) {
            let indicatorWrapper = carousel.querySelector('.indicator-wrapper');

            if (!indicatorWrapper) {
                indicatorWrapper = document.createElement('div');
                indicatorWrapper.classList.add('indicator-wrapper');
                carousel.appendChild(indicatorWrapper);
            }

            // Clear existing indicators to prevent duplicates
            indicatorWrapper.innerHTML = '';

            // Create indicators more efficiently
            const indicators = items.map((_, index) => {
                const indicatorButton = document.createElement('button');
                indicatorButton.classList.add('indicator');
                indicatorButton.setAttribute('index', index);
                return indicatorButton;
            });

            indicatorWrapper.append(...indicators);
        }
    }

    setupEventListeners(carousel, state, prevBtn, nextBtn, indicatorsWrapper, items) {
        // Consolidated event listeners with delegation
        carousel.addEventListener('click', (event) => {
            if (event.target.closest('.prev')) {
                this.navigate(carousel, state, -1);
            } else if (event.target.closest('.next')) {
                this.navigate(carousel, state, 1);
            } else if (event.target.matches('.indicator')) {
                const index = parseInt(event.target.getAttribute('index'), 10);
                this.goToSlide(carousel, state, index);
            }
        });

        // Intersection Observer for tracking visible slides
        const scroller = carousel.querySelector(this.options.scrollerSelector);
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const newIndex = items.indexOf(entry.target);
                    if (newIndex !== state.currentIndex) {
                        state.currentIndex = newIndex;
                        this.updateIndicators(carousel, state);
                        this.updateActiveItem(items, state.currentIndex);
                    }
                }
            });
        }, {
            root: scroller,
            threshold: 0.5
        });

        items.forEach(item => observer.observe(item));

        // Optional mouse drag support
        if (this.options.mouseDrag) {
            this.setupMouseDrag(carousel, state, items);
        }
    }

    isVertical(carousel) {
        return carousel.classList.contains('vertical');
    }

    setupMouseDrag(carousel, state, items) {
        let startY = 0;
        let startX = 0;
        let scrollLeft = 0;
        let scrollTop = 0;
        let isDragging = false;
        const scroller = carousel.querySelector(this.options.scrollerSelector);
        const isVertical = this.isVertical(carousel);

        const onMouseMove = (e) => {
            if (!isDragging) return;
            e.preventDefault();

            if (isVertical) {
                const y = e.pageY - scroller.offsetTop;
                const walk = (y - startY) * 1;
                scroller.scrollTop = scrollTop - walk;
            } else {
                const x = e.pageX - scroller.offsetLeft;
                const walk = (x - startX) * 1;
                scroller.scrollLeft = scrollLeft - walk;
            }
        };

        const onMouseUp = () => {
            if (!isDragging) return;
            isDragging = false;
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);

            if (this.options.snap) {
                let closestIndex = 0;
                let minDistance = Infinity;

                items.forEach((item, index) => {
                    const itemOffset = isVertical ?
                        item.offsetTop - scroller.offsetTop :
                        item.offsetLeft - scroller.offsetLeft;
                    const scrollPosition = isVertical ? scroller.scrollTop : scroller.scrollLeft;
                    const distance = Math.abs(scrollPosition - itemOffset);

                    if (distance < minDistance) {
                        minDistance = distance;
                        closestIndex = index;
                    }
                });

                this.goToSlide(carousel, state, closestIndex);
            }

            carousel.classList.remove('dragging');
        };

        carousel.addEventListener('mousedown', (e) => {
            isDragging = true;
            if (isVertical) {
                startY = e.pageY - scroller.offsetTop;
                scrollTop = scroller.scrollTop;
            } else {
                startX = e.pageX - scroller.offsetLeft;
                scrollLeft = scroller.scrollLeft;
            }
            carousel.classList.add('dragging');
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });
    }

    navigate(carousel, state, direction) {
        const items = carousel.querySelectorAll(this.options.itemSelector);
        let newIndex = state.currentIndex + direction;

        if (this.options.loop) {
            newIndex = (newIndex + state.itemCount) % state.itemCount;
        } else {
            newIndex = Math.max(0, Math.min(newIndex, state.itemCount - 1));
        }

        if (newIndex !== state.currentIndex) {
            state.currentIndex = newIndex;
            this.updateCarousel(carousel, state);
        }
    }

    goToSlide(carousel, state, index) {
        if (index >= 0 && index < state.itemCount) {
            state.currentIndex = index;
            this.updateCarousel(carousel, state);
        }
    }

    updateCarousel(carousel, state) {
        const items = carousel.querySelectorAll(this.options.itemSelector);
        const targetItem = items[state.currentIndex];
        const isVertical = this.isVertical(carousel);

        targetItem.scrollIntoView({
            behavior: 'smooth',
            block: isVertical ? 'start' : 'nearest',
            inline: isVertical ? 'nearest' : 'start'
        });


        this.updateIndicators(carousel, state);
        this.updateActiveItem(items, state.currentIndex);
    }

    updateIndicators(carousel, state) {
        const wrapper = carousel.querySelector('.indicator-wrapper');
        if (!wrapper) return;

        const activeIndicator = wrapper.querySelector('.indicator.active');
        activeIndicator?.classList.remove('active');
        wrapper.children[state.currentIndex]?.classList.add('active');
    }

    updateActiveItem(items, currentIndex) {
        // Remove active class from current active item
        const currentActive = items[currentIndex]?.parentElement.querySelector('.item.active');
        if (currentActive) currentActive.classList.remove('active');

        // Add active class to new active item
        items[currentIndex]?.classList.add('active');
    }

    setupAccessibility(carousel, items) {
        carousel.setAttribute('role', 'region');
        carousel.setAttribute('aria-label', 'Image Carousel');
        carousel.setAttribute('aria-roledescription', 'carousel');

        const scroller = carousel.querySelector(this.options.scrollerSelector);
        scroller.setAttribute('role', 'list');
        scroller.setAttribute('aria-live', 'polite');

        items.forEach((item, index) => {
            item.setAttribute('role', 'listitem');
            item.setAttribute('aria-label', `Slide ${index + 1} of ${items.length}`);
            item.setAttribute('aria-roledescription', 'slide');
        });
    }

    setupKeyboardNavigation(carousel, state) {
        if (!this.options.keyboardNavigation) return;

        carousel.setAttribute('tabindex', '0');

        const navigationMap = carousel.classList.contains('vertical')
            ? { prev: 'ArrowUp', next: 'ArrowDown' }
            : { prev: 'ArrowLeft', next: 'ArrowRight' };

        carousel.addEventListener('keydown', (event) => {
            switch (event.key) {
                case navigationMap.prev:
                    this.navigate(carousel, state, -1);
                    break;
                case navigationMap.next:
                    this.navigate(carousel, state, 1);
                    break;
                case 'Space':
                    this.toggleAutoplay(carousel, state);
                    break;
            }
        });
    }

    setupAutoplay(carousel, state) {
        if (!this.options.autoplay) return;

        const startAutoplay = () => {
            // Clear existing interval to prevent multiple timers
            if (this.autoplayIntervals.has(carousel)) {
                clearInterval(this.autoplayIntervals.get(carousel));
            }

            const interval = setInterval(() => {
                if (!state.isPaused) {
                    this.navigate(carousel, state, 1);
                }
            }, this.options.autoplayInterval);

            this.autoplayIntervals.set(carousel, interval);
        };

        // Start autoplay
        startAutoplay();

        // Pause on hover and focus
        ['mouseenter', 'focusin'].forEach(event => {
            carousel.addEventListener(event, () => {
                state.isPaused = true;
            });
        });

        ['mouseleave', 'focusout'].forEach(event => {
            carousel.addEventListener(event, () => {
                state.isPaused = false;
            });
        });
    }

    toggleAutoplay(carousel, state) {
        state.isPlaying = !state.isPlaying;
        state.isPaused = !state.isPlaying;

        if (state.isPlaying) {
            this.setupAutoplay(carousel, state);
        } else {
            clearInterval(this.autoplayIntervals.get(carousel));
        }

        // Update play/pause button if it exists
        const playPauseBtn = carousel.querySelector('.play-pause');
        if (playPauseBtn) {
            playPauseBtn.setAttribute('aria-label', state.isPlaying ? 'Pause' : 'Play');
        }
    }

    destroy() {
        this.carousels.forEach(carousel => {
            // Clear autoplay intervals
            if (this.autoplayIntervals.has(carousel)) {
                clearInterval(this.autoplayIntervals.get(carousel));
                this.autoplayIntervals.delete(carousel);
            }

            // Remove drag data
            if (this.dragData.has(carousel)) {
                this.dragData.delete(carousel);
            }

            // Remove attributes
            carousel.removeAttribute('role');
            carousel.removeAttribute('aria-label');
            carousel.removeAttribute('tabindex');
        });
    }
}

export default new Carousel();
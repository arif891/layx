class Carousel {
    constructor(selector = 'carousel', options = {}) {
        this.options = {
            mainSelector: '.main',
            itemSelector: '.item',
            autoplay: false,
            autoplayInterval: 3000,
            loop: false,
            mouseDrag: true,
            keyboardNavigation: true,
            ...options
        };
        
        this.carousels = document.querySelectorAll(selector);
        this.autoplayIntervals = new WeakMap();
        this.dragData = new WeakMap(); 
        
        this.init();
    }

    init() {
        this.carousels.forEach(carousel => {
            const main = carousel.querySelector(this.options.mainSelector);
            const items = Array.from(carousel.querySelectorAll(this.options.itemSelector));

            if (!main || items.length === 0) return;

            this.ensureControls(carousel);
            this.ensureIndicators(carousel, items);

            const state = {
                currentIndex: 0,
                itemCount: items.length,
                isPlaying: this.options.autoplay,
                isPaused: false
            };

            // Use Object.defineProperty for better state management
            Object.defineProperty(carousel, 'carouselState', {
                value: state,
                writable: false,
                configurable: false
            });

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
        const main = carousel.querySelector(this.options.mainSelector);
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
            root: main,
            threshold: 0.5
        });

        items.forEach(item => observer.observe(item));

        // Optional mouse drag support
        if (this.options.mouseDrag) {
            this.setupMouseDrag(carousel, state, items);
        }
    }

    setupMouseDrag(carousel, state, items) {
        let startX = 0;
        let isDragging = false;

        carousel.addEventListener('mousedown', (e) => {
            startX = e.pageX;
            isDragging = true;
        });

        carousel.addEventListener('mousemove', (e) => {
            if (!isDragging) return;

            const diff = startX - e.pageX;
            if (Math.abs(diff) > 50) {
                this.navigate(carousel, state, diff > 0 ? 1 : -1);
                isDragging = false;
            }
        });

        carousel.addEventListener('mouseup', () => {
            isDragging = false;
        });

        carousel.addEventListener('mouseleave', () => {
            isDragging = false;
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
        
        targetItem.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
            inline: 'start'
        });

        this.updateIndicators(carousel, state);
        this.updateActiveItem(items, state.currentIndex);
    }

    updateIndicators(carousel, state) {
        const indicators = carousel.querySelectorAll('.indicator');
        indicators?.forEach((indicator, index) => {
            indicator.classList.toggle('active', index === state.currentIndex);
        });
    }

    updateActiveItem(items, currentIndex) {
        items.forEach((item, index) => {
            item.classList.toggle('active', index === currentIndex);
        });
    }

    setupAccessibility(carousel, items) {
        carousel.setAttribute('role', 'region');
        carousel.setAttribute('aria-label', 'Image Carousel');
        
        const main = carousel.querySelector(this.options.mainSelector);
        main.setAttribute('role', 'list');

        items.forEach((item, index) => {
            item.setAttribute('role', 'listitem');
            item.setAttribute('aria-label', `Slide ${index + 1} of ${items.length}`);
        });

        // Simplified control accessibility
        ['prev', 'next'].forEach(type => {
            const btn = carousel.querySelector(`.${type}`);
            if (btn) {
                btn.setAttribute('aria-label', `${type === 'prev' ? 'Previous' : 'Next'} slide`);
            }
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
export { Carousel };
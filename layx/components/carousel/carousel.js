class Carousel {
    constructor(selector = 'carousel') {
        this.carousels = document.querySelectorAll(selector);
        this.init();
    }

    init() {
        this.carousels.forEach(carousel => {
            const main = carousel.querySelector('.main');
            const items = carousel.querySelectorAll('.item');

            if (!main || items.length === 0) return;

            // Add controls and indicators if they do not exist
            this.ensureControls(carousel);
            this.ensureIndicators(carousel, items);

            const state = {
                currentIndex: 0,
                isVertical: main.classList.contains('vertical'),
                itemCount: items.length,
                itemWidths: Array.from(items).map(item => item.offsetWidth),
                itemHeights: Array.from(items).map(item => item.offsetHeight),
            };

            const prevBtn = carousel.querySelector('.prev');
            const nextBtn = carousel.querySelector('.next');
            const indicatorsWrapper = carousel.querySelector('.indicator-wrapper');

            this.setupEventListeners(carousel, state, prevBtn, nextBtn, indicatorsWrapper);
            this.updateCarousel(carousel, state); // Ensure initial update
        });
    }

    ensureControls(carousel) {
        let controlWrapper = carousel.querySelector('.control-wrapper');

        if (!controlWrapper && carousel.hasAttribute('controls')) {
            controlWrapper = document.createElement('div');
            controlWrapper.classList.add('control-wrapper');

            const leftControl = document.createElement('div');
            leftControl.classList.add('left');
            const prevButton = document.createElement('button');
            prevButton.classList.add('prev');
            leftControl.appendChild(prevButton);

            const rightControl = document.createElement('div');
            rightControl.classList.add('right');
            const nextButton = document.createElement('button');
            nextButton.classList.add('next');
            rightControl.appendChild(nextButton);

            controlWrapper.appendChild(leftControl);
            controlWrapper.appendChild(rightControl);

            carousel.appendChild(controlWrapper);
        }
    }

    ensureIndicators(carousel, items) {
        let indicatorWrapper = carousel.querySelector('.indicator-wrapper');

        if (!indicatorWrapper && carousel.hasAttribute('indicators')) {
            indicatorWrapper = document.createElement('div');
            indicatorWrapper.classList.add('indicator-wrapper');
            carousel.appendChild(indicatorWrapper);
        }

        if (indicatorWrapper && !carousel.querySelectorAll('.indicator').length) {
            // Clear out any existing indicators to avoid duplicates
            indicatorWrapper.innerHTML = '';

            items.forEach((item, index) => {
                const indicatorButton = document.createElement('button');
                indicatorButton.classList.add('indicator');
                indicatorButton.setAttribute('index', index);
                indicatorWrapper.appendChild(indicatorButton);
            });
        }
    }

    setupEventListeners(carousel, state, prevBtn, nextBtn, indicatorsWrapper) {
        // Event listeners for controls
        prevBtn?.addEventListener('click', () => this.navigate(carousel, state, -1));
        nextBtn?.addEventListener('click', () => this.navigate(carousel, state, 1));

        // Event delegation for indicators
        indicatorsWrapper?.addEventListener('click', (event) => {
            if (event.target.matches('.indicator')) {
                const index = parseInt(event.target.getAttribute('index'), 10);
                this.goToSlide(carousel, state, index);
            }
        });

        // Scroll event handling with debouncing
        const main = carousel.querySelector('.main');
        const items = carousel.querySelectorAll('.item');
        let scrollTimeout;
        main?.addEventListener('scroll', () => {
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                const newIndex = this.calculateCurrentIndex(main, state);
                if (newIndex !== state.currentIndex) {
                    state.currentIndex = newIndex;
                    this.updateIndicators(carousel, state);
                    this.updateActiveItem(items, state.currentIndex);
                }
            }, 50);
        });
    }

    navigate(carousel, state, direction) {
        state.currentIndex = (state.currentIndex + direction + state.itemCount) % state.itemCount;
        this.updateCarousel(carousel, state);
    }

    goToSlide(carousel, state, index) {
        state.currentIndex = index;
        this.updateCarousel(carousel, state);
    }

    updateCarousel(carousel, state) {
        const main = carousel.querySelector('.main');
        const items = carousel.querySelectorAll('.item');
        const scrollPosition = state.isVertical
            ? { top: this.calculateScrollPosition(state, 'vertical'), behavior: 'smooth' }
            : { left: this.calculateScrollPosition(state, 'horizontal'), behavior: 'smooth' };

        main.scrollTo(scrollPosition);
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

    calculateCurrentIndex(main, state) {
        const scrollPosition = state.isVertical ? main.scrollTop : main.scrollLeft;
        let accumulatedSize = 0;
        for (let i = 0; i < state.itemCount; i++) {
            const itemSize = state.isVertical ? state.itemHeights[i] : state.itemWidths[i];
            if (accumulatedSize + itemSize / 2 > scrollPosition) {
                return i;
            }
            accumulatedSize += itemSize;
        }
        return state.itemCount - 1;
    }

    calculateScrollPosition(state, direction) {
        let position = 0;
        for (let i = 0; i < state.currentIndex; i++) {
            position += direction === 'vertical' ? state.itemHeights[i] : state.itemWidths[i];
        }
        return position;
    }
}

export default new Carousel();
export {Carousel};
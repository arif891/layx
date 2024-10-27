class Tab {
    constructor(selector = 'tab') {
        this.tabs = document.querySelectorAll(selector);
        this.init();
    }

    init() {
        this.tabs.forEach(tab => {
            const main = tab.querySelector('.main');
            const items = tab.querySelectorAll('.item');

            if (!main || items.length === 0) return;

            const state = {
                currentIndex: 0,
                isVertical: main.classList.contains('vertical'),
                itemCount: items.length,
                itemWidths: Array.from(items).map(item => item.offsetWidth),
                itemHeights: Array.from(items).map(item => item.offsetHeight),
            };

            const indicatorsWrapper = tab.querySelector('.indicator-wrapper');

            this.setupEventListeners(tab, state, indicatorsWrapper);
            this.updatetab(tab, state); 
        });
    }


    setupEventListeners(tab, state, indicatorsWrapper) {
       

        // Event delegation for indicators
        indicatorsWrapper?.addEventListener('click', (event) => {
            if (event.target.matches('.indicator')) {
                const index = parseInt(event.target.getAttribute('index'), 10);
                this.goToSlide(tab, state, index);
            }
        });

        // Scroll event handling with debouncing
        const main = tab.querySelector('.main');
        let scrollTimeout;
        main?.addEventListener('scroll', () => {
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                state.currentIndex = this.calculateCurrentIndex(main, state);
                this.updateIndicators(tab, state);
            }, 100);
        });
    }

    navigate(tab, state, direction) {
        state.currentIndex = (state.currentIndex + direction + state.itemCount) % state.itemCount;
        this.updatetab(tab, state);
    }

    goToSlide(tab, state, index) {
        state.currentIndex = index;
        this.updatetab(tab, state);
    }

    updatetab(tab, state) {
        const main = tab.querySelector('.main');
        const scrollPosition = state.isVertical
            ? { top: this.calculateScrollPosition(state, 'vertical'), behavior: 'smooth' }
            : { left: this.calculateScrollPosition(state, 'horizontal'), behavior: 'smooth' };

        main.scrollTo(scrollPosition);
        this.updateIndicators(tab, state);
    }

    updateIndicators(tab, state) {
        const indicators = tab.querySelectorAll('.indicator');
        indicators?.forEach((indicator, index) => {
            indicator.classList.toggle('active', index === state.currentIndex);
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

export default new Tab();
export {Tab};
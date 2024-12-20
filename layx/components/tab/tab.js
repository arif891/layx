class Tab {
    constructor(selector = 'tab', options = {}) {
        this.options = {
            mainSelector: '.main',
            itemSelector: '.item',
            indicatorSelector: '.indicator',
            mouseDrag: true,
            keyboardNavigation: true,
            ...options
        };
        
        this.tabs = document.querySelectorAll(selector);
        this.init();
    }

    init() {
        this.tabs.forEach(tab => {
            const main = tab.querySelector(this.options.mainSelector);
            const items = tab.querySelectorAll(this.options.itemSelector);

            if (!main || items.length === 0) return;

            const state = {
                currentIndex: 0,
                isVertical: main.classList.contains('vertical'),
                itemCount: items.length
            };

            Object.defineProperty(tab, 'tabState', {
                value: state,
                writable: false,
                configurable: false
            });

            const indicatorsWrapper = tab.querySelector('.indicator-wrapper');

            this.setupEventListeners(tab, state, indicatorsWrapper, items);
            this.setupAccessibility(tab, items);
            
            if (this.options.keyboardNavigation) {
                this.setupKeyboardNavigation(tab, state);
            }

            this.update(tab, state);
        });
    }

    setupEventListeners(tab, state, indicatorsWrapper, items) {
        // Event delegation for indicators
        indicatorsWrapper?.addEventListener('click', (event) => {
            if (event.target.matches(this.options.indicatorSelector)) {
                const index = parseInt(event.target.getAttribute('index'), 10);
                this.goToSlide(tab, state, index);
            }
        });

        // Intersection Observer for tracking visible items
        const main = tab.querySelector(this.options.mainSelector);
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const newIndex = Array.from(items).indexOf(entry.target);
                    if (newIndex !== state.currentIndex) {
                        state.currentIndex = newIndex;
                        this.updateIndicators(tab, state);
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
            this.setupMouseDrag(tab, state);
        }
    }

    setupMouseDrag(tab, state) {
        const main = tab.querySelector(this.options.mainSelector);
        let startX = 0, startY = 0, isDragging = false;

        main.addEventListener('mousedown', (e) => {
            startX = e.pageX;
            startY = e.pageY;
            isDragging = true;
        });

        main.addEventListener('mousemove', (e) => {
            if (!isDragging) return;

            const diffX = startX - e.pageX;
            const diffY = startY - e.pageY;
            const diff = state.isVertical ? diffY : diffX;

            if (Math.abs(diff) > 50) {
                this.navigate(tab, state, diff > 0 ? 1 : -1);
                isDragging = false;
            }
        });

        main.addEventListener('mouseup', () => isDragging = false);
        main.addEventListener('mouseleave', () => isDragging = false);
    }

    setupKeyboardNavigation(tab, state) {
        tab.setAttribute('tabindex', '0');
        
        const navigationMap = state.isVertical
            ? { prev: 'ArrowUp', next: 'ArrowDown' }
            : { prev: 'ArrowLeft', next: 'ArrowRight' };

        tab.addEventListener('keydown', (event) => {
            if (event.key === navigationMap.prev || event.key === navigationMap.next) {
                event.preventDefault();
                this.navigate(tab, state, event.key === navigationMap.next ? 1 : -1);
            }
        });
    }

    setupAccessibility(tab, items) {
        tab.setAttribute('role', 'tablist');
        
        items.forEach((item, index) => {
            item.setAttribute('role', 'tabpanel');
            item.setAttribute('aria-label', `Tab panel ${index + 1}`);
        });
    }

    navigate(tab, state, direction) {
        const newIndex = state.currentIndex + direction;
        if (newIndex >= 0 && newIndex < state.itemCount) {
            state.currentIndex = newIndex;
            this.update(tab, state);
        }
    }

    goToSlide(tab, state, index) {
        state.currentIndex = index;
        this.update(tab, state);
    }

    update(tab, state) {
        const main = tab.querySelector(this.options.mainSelector);
        const targetItem = main.children[state.currentIndex];
        
        if (targetItem) {
            targetItem.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest',
                inline: 'start'
            });
        }
        
        this.updateIndicators(tab, state);
    }

    updateIndicators(tab, state) {
        const indicators = tab.querySelectorAll(this.options.indicatorSelector);
        indicators?.forEach((indicator, index) => {
            indicator.classList.toggle('active', index === state.currentIndex);
        });
    }

    calculateCurrentIndex(main, state) {
        const items = main.children;
        let target = null;
        
        // Use IntersectionObserver or simple scroll position check
        const scrollPosition = state.isVertical ? main.scrollTop : main.scrollLeft;
        let minDistance = Infinity;
        let closestIndex = 0;

        Array.from(items).forEach((item, index) => {
            const rect = item.getBoundingClientRect();
            const mainRect = main.getBoundingClientRect();
            const distance = state.isVertical 
                ? Math.abs(rect.top - mainRect.top)
                : Math.abs(rect.left - mainRect.left);

            if (distance < minDistance) {
                minDistance = distance;
                closestIndex = index;
            }
        });

        return closestIndex;
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
export { Tab };
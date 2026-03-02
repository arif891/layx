
class CarouselPolyfill {
    /**
     * @param {HTMLElement} carousel
     */
    constructor(carousel) {
        this.carousel = carousel;
        this.scroller = carousel.querySelector('.scroller');
        this.items = Array.from(this.scroller.querySelectorAll('.item'));

        this.markerGroup = null;
        this.markers = [];
        this.btnLeft = null;
        this.btnRight = null;

        this._scrolling = false;
        this._scrollTimeout = null;

        this._init();
    }

    _init() {
        if (this.carousel.hasAttribute('indicator')) {
            this._buildIndicators();
        }

        if (this.carousel.hasAttribute('button')) {
            this._buildButtons();
        }

        this._bindScroll();
        this._update();
    }

    // ── Indicators ────────────────────────────────────────────────────────────

    _buildIndicators() {
        const group = document.createElement('div');
        group.className = 'scroll-marker-group';

        this.items.forEach((_, i) => {
            const marker = document.createElement('button');
            marker.className = 'scroll-marker';
            marker.setAttribute('aria-label', `Go to slide ${i + 1}`);
            marker.addEventListener('click', () => this._scrollToIndex(i));
            group.appendChild(marker);
            this.markers.push(marker);
        });

        this.carousel.appendChild(group);

        this.markerGroup = group;
    }

    // ── Buttons ───────────────────────────────────────────────────────────────

    _buildButtons() {
        const btnLeft = document.createElement('button');
        btnLeft.className = 'scroll-button left';
        btnLeft.setAttribute('aria-label', 'Previous');

        const btnRight = document.createElement('button');
        btnRight.className = 'scroll-button right';
        btnRight.setAttribute('aria-label', 'Next');

        btnLeft.addEventListener('click', () => this._step(-1));
        btnRight.addEventListener('click', () => this._step(1));

        this.carousel.appendChild(btnLeft);
        this.carousel.appendChild(btnRight);

        this.btnLeft = btnLeft;
        this.btnRight = btnRight;
    }

    // ── Scroll helpers ────────────────────────────────────────────────────────

    /** Scroll the scroller so that item at `index` is centred. */
    _scrollToIndex(index) {
        const item = this.items[index];
        if (!item) return;

        // Use scrollIntoView-style calculation to centre the item inside the scroller
        const scrollerRect = this.scroller.getBoundingClientRect();
        const itemRect = item.getBoundingClientRect();

        const targetScrollLeft =
            this.scroller.scrollLeft +
            (itemRect.left - scrollerRect.left) -
            (scrollerRect.width - itemRect.width) / 2;

        this.scroller.scrollTo({ left: targetScrollLeft, behavior: 'smooth' });
    }

    /** Step forward (+1) or backward (-1) by one item relative to the most-visible item. */
    _step(direction) {
        const current = this._currentIndex();
        const next = Math.max(0, Math.min(this.items.length - 1, current + direction));
        this._scrollToIndex(next);
    }

    /** Return the index of the item whose centre is closest to the scroller centre. */
    _currentIndex() {
        const scrollerRect = this.scroller.getBoundingClientRect();
        const scrollerCentre = scrollerRect.left + scrollerRect.width / 2;

        let bestIndex = 0;
        let bestDist = Infinity;

        this.items.forEach((item, i) => {
            const rect = item.getBoundingClientRect();
            const itemCentre = rect.left + rect.width / 2;
            const dist = Math.abs(scrollerCentre - itemCentre);
            if (dist < bestDist) {
                bestDist = dist;
                bestIndex = i;
            }
        });

        return bestIndex;
    }

    // ── State sync ────────────────────────────────────────────────────────────

    _update() {
        const index = this._currentIndex();

        // Sync markers
        this.markers.forEach((m, i) => {
            m.classList.toggle('active', i === index);
        });

        // Sync buttons disabled state
        if (this.btnLeft) this.btnLeft.disabled = index === 0;
        if (this.btnRight) this.btnRight.disabled = index === this.items.length - 1;
    }

    _bindScroll() {
        this.scroller.addEventListener('scroll', () => {
            // Debounce: update state after scrolling settles
            clearTimeout(this._scrollTimeout);
            this._scrollTimeout = setTimeout(() => this._update(), 80);
        }, { passive: true });
    }
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────
const carousels = document.querySelectorAll('carousel, .carousel');
carousels.forEach(el => new CarouselPolyfill(el));
/* Polyfill for Safari and Firefox */
class CarouselPolyfill {
    /**
     * @param {string} [selector='carousel, .carousel']
     */
    constructor(selector = 'carousel, .carousel') {
        // Each entry: { carousel, scroller, items, markers, btnLeft, btnRight, scrollTimeout }
        this._carousels = Array.from(document.querySelectorAll(selector)).map(carousel => ({
            carousel,
            scroller: carousel.querySelector('.scroller'),
            items: Array.from(carousel.querySelectorAll('.scroller .item')),
            markers: [],
            btnLeft: null,
            btnRight: null,
            scrollTimeout: null,
        }));
 
        this._init();
    }
 
    _init() {
        this._carousels.forEach(state => {
            if (state.carousel.hasAttribute('indicators')) this._buildIndicators(state);
            if (state.carousel.hasAttribute('controls'))    this._buildButtons(state);
            this._bindScroll(state);
            this._update(state);
        });
    }
 
    // ── Indicators ────────────────────────────────────────────────────────────
 
    _buildIndicators(state) {
        const group = document.createElement('div');
        group.className = 'scroll-marker-group';
 
        state.items.forEach((_, i) => {
            const marker = document.createElement('button');
            marker.className = 'scroll-marker';
            marker.setAttribute('aria-label', `Go to slide ${i + 1}`);
            marker.addEventListener('click', () => this._scrollToIndex(state, i));
            group.appendChild(marker);
            state.markers.push(marker);
        });
 
        state.carousel.appendChild(group);
    }
 
    // ── Buttons ───────────────────────────────────────────────────────────────
 
    _buildButtons(state) {
        const btnLeft = document.createElement('button');
        btnLeft.className = 'scroll-button left';
        btnLeft.setAttribute('aria-label', 'Previous');
 
        const btnRight = document.createElement('button');
        btnRight.className = 'scroll-button right';
        btnRight.setAttribute('aria-label', 'Next');
 
        btnLeft.addEventListener('click',  () => this._step(state, -1));
        btnRight.addEventListener('click', () => this._step(state,  1));
 
        state.carousel.appendChild(btnLeft);
        state.carousel.appendChild(btnRight);
 
        state.btnLeft  = btnLeft;
        state.btnRight = btnRight;
    }
 
    // ── Scroll helpers ────────────────────────────────────────────────────────
 
    _scrollToIndex(state, index) {
        const item = state.items[index];
        if (!item) return;
 
        const scrollerRect = state.scroller.getBoundingClientRect();
        const itemRect     = item.getBoundingClientRect();
 
        const targetScrollLeft =
            state.scroller.scrollLeft +
            (itemRect.left - scrollerRect.left) -
            (scrollerRect.width - itemRect.width) / 2;
 
        state.scroller.scrollTo({ left: targetScrollLeft, behavior: 'smooth' });
    }
 
    _step(state, direction) {
        const current = this._currentIndex(state);
        const next    = Math.max(0, Math.min(state.items.length - 1, current + direction));
        this._scrollToIndex(state, next);
    }
 
    _currentIndex(state) {
        const scrollerRect   = state.scroller.getBoundingClientRect();
        const scrollerCentre = scrollerRect.left + scrollerRect.width / 2;
 
        let bestIndex = 0;
        let bestDist  = Infinity;
 
        state.items.forEach((item, i) => {
            const rect       = item.getBoundingClientRect();
            const itemCentre = rect.left + rect.width / 2;
            const dist       = Math.abs(scrollerCentre - itemCentre);
            if (dist < bestDist) { bestDist = dist; bestIndex = i; }
        });
 
        return bestIndex;
    }
 
    // ── State sync ────────────────────────────────────────────────────────────
 
    _update(state) {
        const index = this._currentIndex(state);
 
        state.markers.forEach((m, i) => m.classList.toggle('active', i === index));
 
        if (state.btnLeft)  state.btnLeft.disabled  = index === 0;
        if (state.btnRight) state.btnRight.disabled = index === state.items.length - 1;
    }
 
    _bindScroll(state) {
        state.scroller.addEventListener('scroll', () => {
            clearTimeout(state.scrollTimeout);
            state.scrollTimeout = setTimeout(() => this._update(state), 50);
        }, { passive: true });
    }
}
 
// ── Bootstrap ─────────────────────────────────────────────────────────────────
new CarouselPolyfill();
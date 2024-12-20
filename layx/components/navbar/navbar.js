class Navbar {
    constructor(selector = 'navbar', options = {}) {
        this.options = {
            dragThreshold: .4,
            wrapperSelector: '.warp-able',
            togglerSelector: '.toggler',
            closeButtonSelector: '.close',
            draggableAreaSelector: '.warp-able',
            updateScrollState: true,
            scrollDistance: window.innerHeight * 0.2,
            scrollThresholdMultiplier: 3,
            ...options
        };
        this.navbars = document.querySelectorAll(selector);
        this.init();
    }

    init() {
        this.navbars.forEach(navbar => {
            const wrapper = navbar.querySelector(this.options.wrapperSelector);
            const toggler = navbar.querySelector(this.options.togglerSelector);
            const closeButton = navbar.querySelector(this.options.closeButtonSelector);

            this.addTriggerListeners(navbar, toggler, wrapper);
            this.addCloseButtonListeners(navbar, closeButton, wrapper);
            this.addBackdropListeners(navbar, wrapper);
            this.updateScrollState(navbar);
        });
    }

    addTriggerListeners(navbar, toggler, wrapper) {
        toggler.addEventListener('click', () => {
            this.open(navbar);
            this.addDragListeners(navbar, wrapper);
        });
    }

    addCloseButtonListeners(navbar, closeButton) {
        if (!closeButton) return;
        closeButton.addEventListener('click', () => this.close(navbar));
    }

    addBackdropListeners(navbar, wrapper) {
        let backdrop = navbar.querySelector('backdrop');
        if (!wrapper.classList.contains('full') && !backdrop) {
            backdrop = document.createElement('backdrop');
            backdrop.classList.add('navbar-backdrop');
            backdrop.addEventListener('click', () => this.close(navbar));
            wrapper.insertAdjacentElement('afterend', backdrop);
        }
    }

    updateScrollState(navbar) {
        if (!navbar.classList.contains('update-scroll-state')) return;

        let previousScrollPosition = 0;
        const scrollDistance = this.options.scrollDistance;
        const scrollThreshold = scrollDistance * this.options.scrollThresholdMultiplier;

        const handleScroll = () => {
            const currentScrollY = window.scrollY;
            const scrolledPastDistance = currentScrollY > scrollDistance;
            const scrollingDown = previousScrollPosition < currentScrollY && currentScrollY > scrollThreshold;

            navbar.classList.toggle('scrolled', scrolledPastDistance);
            navbar.classList.toggle('scrollingDown', scrollingDown);
            previousScrollPosition = currentScrollY;
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
    }

    addDragListeners(navbar, wrapper) {
        const draggableArea = navbar.querySelector(this.options.draggableAreaSelector);
        let startY, startX, currentY, currentX, isDragging = false;

        const onStart = (e) => {
            const { clientY, clientX } = e.type === 'touchstart' ? e.touches[0] : e;
            startY = clientY;
            startX = clientX;
            isDragging = true;
            draggableArea.style.transition = 'none';
        };

        const onMove = (e) => {
            if (!isDragging) return;
            const { clientY, clientX } = e.type === 'touchmove' ? e.touches[0] : e;
            currentY = clientY;
            currentX = clientX;
            this.updateDraggableAreaTransform(draggableArea, startY, startX, currentY, currentX);
        };

        const onEnd = () => {
            if (!isDragging) return;
            isDragging = false;
            draggableArea.style.transition = '';
            draggableArea.style.transform = '';
            this.handleDragEnd(draggableArea, startY, startX, currentY, currentX, navbar, wrapper);
        };

        this.addEventListeners(draggableArea, onStart, onMove, onEnd);
    }

    updateDraggableAreaTransform(draggableArea, startY, startX, currentY, currentX) {
        const deltaY = currentY - startY;
        const deltaX = currentX - startX;

        if (draggableArea.classList.contains('top')) {
            draggableArea.style.transform = `translateY(${Math.min(0, deltaY)}px)`;
        } else if (draggableArea.classList.contains('bottom')) {
            draggableArea.style.transform = `translateY(${Math.max(0, deltaY)}px)`;
        } else if (draggableArea.classList.contains('left')) {
            draggableArea.style.transform = `translateX(${Math.min(0, deltaX)}px)`;
        } else if (draggableArea.classList.contains('right')) {
            draggableArea.style.transform = `translateX(${Math.max(0, deltaX)}px)`;
        }
    }

    handleDragEnd(draggableArea, startY, startX, currentY, currentX, navbar, wrapper) {
        const sheetRect = draggableArea.getBoundingClientRect();
        const threshold = this.options.dragThreshold * (
            draggableArea.classList.contains('top') || draggableArea.classList.contains('bottom')
                ? sheetRect.height
                : sheetRect.width
        );

        const deltaY = currentY - startY;
        const deltaX = currentX - startX;

        let shouldClose = false;

        if (draggableArea.classList.contains('top')) {
            shouldClose = deltaY < -threshold;
        } else if (draggableArea.classList.contains('bottom')) {
            shouldClose = deltaY > threshold;
        } else if (draggableArea.classList.contains('left')) {
            shouldClose = deltaX < -threshold;
        } else if (draggableArea.classList.contains('right')) {
            shouldClose = deltaX > threshold;
        }

        if (shouldClose) {
            this.close(navbar);
        } else {
            draggableArea.style.transform = '';
        }
    }

    addEventListeners(draggableArea, onStart, onMove, onEnd) {
        if ('ontouchstart' in window) {
            draggableArea.addEventListener('touchstart', onStart);
            draggableArea.addEventListener('touchmove', onMove);
            draggableArea.addEventListener('touchend', onEnd);
        } else {
            draggableArea.addEventListener('mousedown', onStart);
            window.addEventListener('mousemove', onMove);
            window.addEventListener('mouseup', onEnd);
        }
    }

    open(navbar) {
        let backdrop = navbar.querySelector('backdrop');
        navbar.setAttribute('open', '');
        document.body.style.overflow = 'hidden';
        if (backdrop) {
            backdrop.setAttribute('open', '');
        }
    }

    close(navbar) {
        let backdrop = navbar.querySelector('backdrop');
        navbar.removeAttribute('open');
        document.body.style.overflow = '';
        if (backdrop) {
            backdrop.removeAttribute('open');
        }
    }

    toggle(navbar) {
        if (navbar.hasAttribute('open')) {
            this.close(navbar);
        } else {
            this.open(navbar);
        }
    }
}

export default new Navbar();
export { Navbar };
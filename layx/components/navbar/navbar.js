class Navbar {
    constructor(selector = 'navbar', dragThreshold = .4) {
        this.navbars = document.querySelectorAll(selector);
        this.dragThreshold = dragThreshold;
        this.init();
    }

    init() {
        this.navbars.forEach(navbar => {
            const wrapper = navbar.querySelector('.warp-able');
            const toggler = navbar.querySelector('.toggler');
            const closeButton = navbar.querySelector('.close');

            this.addTriggerListeners(navbar, toggler, wrapper);
            this.addCloseButtonListeners(navbar, closeButton, wrapper);
            this.addBackdropListeners(navbar, wrapper);
            this.updateScrollState(navbar);
        })
    }

    addTriggerListeners(navbar, toggler, wrapper) {
        toggler.addEventListener('click', () => {
            this.openNavbar(navbar, wrapper);
            this.addDragListeners(navbar, wrapper);
        });
    }

    addCloseButtonListeners(navbar, closeButton, wrapper) {
        if (!closeButton) return;
        closeButton.addEventListener('click', () => {
            this.closeNavbar(navbar, wrapper);
        });
    }

    addBackdropListeners(navbar, wrapper) {
        let backdrop = navbar.querySelector('backdrop');
        if (!wrapper.classList.contains('full') && !backdrop) {
            backdrop = document.createElement('backdrop');
            backdrop.classList.add('navbar-backdrop');
            backdrop.addEventListener('click', () => this.closeNavbar(navbar, wrapper));

            wrapper.insertAdjacentElement('afterend', backdrop);
        }
    }


    updateScrollState(navbar) {
        if (!navbar.classList.contains('update-scroll-state')) return;

        let previousScrollPosition = 0;
        const scrollDistance = window.innerHeight * 0.2;
        const scrollThreshold = scrollDistance * 3;

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

        let startY, startX;
        let currentY, currentX;
        let isDragging = false;
        const draggableArea = navbar.querySelector('.warp-able');

        const onStart = (e) => {
            if (e.type === 'touchstart') {
                startY = e.touches[0].clientY;
                startX = e.touches[0].clientX;
            } else {
                startY = e.clientY;
                startX = e.clientX;
            }
            isDragging = true;
            draggableArea.style.transition = 'none';
        };

        const onMove = (e) => {
            if (!isDragging) return;

            if (e.type === 'touchmove') {
                currentY = e.touches[0].clientY;
                currentX = e.touches[0].clientX;
            } else {
                currentY = e.clientY;
                currentX = e.clientX;
            }

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
        };

        const onEnd = () => {
            if (!isDragging) return;

            isDragging = false;
            draggableArea.style.transition = '';
            draggableArea.style.transform = '';

            const sheetRect = draggableArea.getBoundingClientRect();
            const threshold = this.dragThreshold * (
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
                this.closeNavbar(navbar, wrapper);
            } else {
                draggableArea.style.transform = '';
            }
        };


        const addTouchListeners = () => {
            draggableArea.addEventListener('touchstart', onStart);
            draggableArea.addEventListener('touchmove', onMove);
            draggableArea.addEventListener('touchend', onEnd);
        };

        const addMouseListeners = () => {
            draggableArea.addEventListener('mousedown', onStart);
            window.addEventListener('mousemove', onMove);
            window.addEventListener('mouseup', onEnd);
        };


        if ('ontouchstart' in window) {
            addTouchListeners();
        } else {
            addMouseListeners();
        }
    }

    openNavbar(navbar, wrapper) {
        let backdrop = navbar.querySelector('backdrop');
        navbar.setAttribute('open', '');
        wrapper.setAttribute('open', '');
        document.body.style.overflow = 'hidden';
        if (backdrop) {
            backdrop.setAttribute('open', '')
        }
    }

    closeNavbar(navbar, wrapper) {
        let backdrop = navbar.querySelector('backdrop');
        navbar.removeAttribute('open');
        wrapper.removeAttribute('open');
        document.body.style.overflow = '';
        if (backdrop) {
            backdrop.removeAttribute('open')
        }
    }

    toggleNavbar(navbar, wrapper) {
        if (navbar.hasAttribute('open')) {
            this.closeNavbar(navbar, wrapper);
        } else {
            this.openNavbar(navbar, wrapper);
        }
    }
}

export default new Navbar();
export {Navbar};
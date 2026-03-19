class Navbar {
    constructor(selector = 'navbar') {
        this.selector = selector;
        this.togglers = document.querySelectorAll(`${this.selector} [toggle]`);
        this.closeBtns = document.querySelectorAll(`${this.selector} [close]`);
        this.navbars = document.querySelectorAll(this.selector);
        this.backdrops = document.querySelectorAll(`${this.selector} backdrop`);
        this.init();
    }

    init() {
        this.togglers.forEach(toggler => {
            toggler.addEventListener('click', () => {
                if (toggler.closest(this.selector).hasAttribute('open')) {
                    toggler.closest(this.selector).removeAttribute('open');
                } else {
                    toggler.closest(this.selector).setAttribute('open', '');
                }
            });
        });

        this.navbars.forEach(navbar => {
            const backdrop = navbar.querySelector('backdrop');
            if (backdrop) {
                backdrop.addEventListener('click', () => {
                    navbar.removeAttribute('open');
                });
            }
        });

        this.closeBtns.forEach(closeBtn => {
            closeBtn.addEventListener('click', () => {
                closeBtn.closest(this.selector).removeAttribute('open');
            });
        });

        this.backdrops.forEach(backdrop => {
            backdrop.addEventListener('click', () => {
                backdrop.closest(this.selector).removeAttribute('open');
            });
        });
    }
}

new Navbar();
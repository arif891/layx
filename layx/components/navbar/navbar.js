class Navbar {
    constructor(selector = 'navbar') {
        this.selector = selector;
        this.togglers = document.querySelectorAll(`${this.selector} [toggle]`);
        this.navbars = document.querySelectorAll(this.selector);
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
    }
}

new Navbar();
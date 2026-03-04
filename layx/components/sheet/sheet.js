class Sheet {
    constructor(selector = 'sheet') {
        this.sheets = document.querySelectorAll(selector);
        this.init();
    }

    init() {
        this.update();

        window.addEventListener('resize', () => {
            this.update();
        });
    }

    open(sheet) {
        if (!sheet) return;
        const wrapper = sheet.querySelector('.wrapper');
        const snapPoints = sheet.querySelectorAll('[snap]');

        if (snapPoints.length > 0) {
            snapPoints[0].scrollIntoView({ behavior: 'smooth' });
        } else if (wrapper) {
            wrapper.scrollIntoView({ behavior: 'smooth' });
        } else {
            console.warn('Sheet component requires a child element with class "wrapper" to function properly.');
        }
    }

    close(sheet) {
        if (!sheet) return;
        if (sheet.hasAttribute('position')) {
            const position = sheet.getAttribute('position');
            if (position === 'top') {
                sheet.scrollTo({ top: sheet.scrollHeight, behavior: 'smooth' });
            } else if (position === 'left') {
                sheet.scrollTo({ left: sheet.scrollWidth, behavior: 'smooth' });
            } else if (position === 'right') {
                sheet.scrollTo({ left: 0, behavior: 'smooth' });
            } else {
                console.warn('Invalid position attribute value. Expected "top", "left", or "right".');
            }
        } else {
            sheet.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }

    update() {
        this.sheets.forEach(sheet => {
            const wrapper = sheet.querySelector('.wrapper');
            if (wrapper) {
                sheet.style.setProperty('--_w', `${wrapper.offsetWidth}px`);
                sheet.style.setProperty('--_h', `${wrapper.offsetHeight}px`);
                sheet.setAttribute('active', '');
            } else {
                console.warn('Sheet component requires a child element with class "wrapper" to function properly.');
            }
        });
    }
}

export { Sheet };
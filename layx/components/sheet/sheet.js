class Sheet {
    constructor(selector = 'sheet') {
        this.sheets = document.querySelectorAll(selector);
        this.init();
    }

    init() {
        this.update();

        window.addEventListener('resize', () => {
            // debounce
            clearTimeout(this.resizeTimeout);
            this.resizeTimeout = setTimeout(() => {
                this.update(true);
            }, 100);
        });
    }

    update(resize = false) {
        this.sheets.forEach(sheet => {
            if (resize) { sheet.setAttribute('resizing', ''); }
            sheet.style.setProperty('--el-w', `${sheet.offsetWidth}px`);
            sheet.style.setProperty('--el-h', `${sheet.offsetHeight}px`);
            sheet.setAttribute('active', '');
            sheet.removeAttribute('resizing');
        });
    }
}

new Sheet();
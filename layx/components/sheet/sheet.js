/**
 * Sheet Component
 * Manages bottom/side sheet overlays with smooth scroll-based animations
 */
class Sheet {
    static SELECTORS = {
        WRAPPER: '.wrapper',
        SNAP_POINTS: '[snap]',
        CLOSE_BUTTONS: '[close]',
        TRIGGER_ATTR: 'data-target-sheet',
        POSITION_ATTR: 'position',
        ACTIVE_ATTR: 'active',
        OPEN_ATTR: 'open',
        MODAL_ATTR: 'modal',
    };

    static CSS_VARS = {
        WIDTH: '--_w',
        HEIGHT: '--_h'
    };

    static POSITIONS = {
        TOP: 'top',
        LEFT: 'left',
        RIGHT: 'right',
        BOTTOM: 'bottom'
    };

    static SCROLL_BEHAVIOR = 'smooth';
    static WARNING_MSG = 'Sheet component requires a child element with class "wrapper" to function properly.';

    constructor(selector = 'sheet') {
        this.sheets = document.querySelectorAll(selector);
        this.triggers = document.querySelectorAll(`[${Sheet.SELECTORS.TRIGGER_ATTR}]`);
        this.wrapperCache = new Map();
        this.handleResize = this.handleResize.bind(this);
        this.init();
    }

    /**
     * Initialize all event listeners and UI state
     */
    init() {
        this.update();
        this.attachEventListeners();
    }

    /**
     * Debounced resize handler
     */
    handleResize() {
        this.update()
    }

    /**
     * Attach all event listeners to triggers and sheets
     */
    attachEventListeners() {
        window.addEventListener('resize', this.handleResize);

        this.triggers.forEach(trigger => {
            trigger.addEventListener('click', e => this.handleTriggerClick(e));
        });

        this.sheets.forEach(sheet => {
            const closeButtons = sheet.querySelectorAll(Sheet.SELECTORS.CLOSE_BUTTONS);
            closeButtons.forEach(button => {
                button.addEventListener('click', () => this.close(sheet));
            });
        });

        window.addEventListener('keydown', e => {
            if (e.key === 'Escape') {
                this.sheets.forEach(sheet => {
                    if (sheet.hasAttribute(Sheet.SELECTORS.OPEN_ATTR) && !sheet.hasAttribute(Sheet.SELECTORS.MODAL_ATTR)) {
                        this.close(sheet);
                    }
                });
            }
        });
    }

    /**
     * Handle trigger click event
     */
    handleTriggerClick(e) {
        const targetSelector = e.currentTarget.getAttribute(Sheet.SELECTORS.TRIGGER_ATTR);
        const targetSheet = document.getElementById(targetSelector);

        if (targetSheet) {
            this.open(targetSheet);
        } else {
            console.warn(`Sheet: No element found with id "${targetSelector}"`);
        }
    }

    /**
     * Open a sheet by scrolling to its content
     */
    open(sheet) {
        if (!sheet) return;

        const wrapper = this.getWrapper(sheet);
        if (!wrapper) return;

        const snapPoints = sheet.querySelectorAll(Sheet.SELECTORS.SNAP_POINTS);
        const target = snapPoints.length > 0 ? snapPoints[0] : wrapper;
        

        target.scrollIntoView({ behavior: Sheet.SCROLL_BEHAVIOR, block: 'nearest', inline: 'nearest' });
        sheet.setAttribute(Sheet.SELECTORS.OPEN_ATTR, '');
    }

    /**
     * Close a sheet based on its position attribute
     */
    close(sheet) {
        if (!sheet) return;

        const position = sheet.getAttribute(Sheet.SELECTORS.POSITION_ATTR) || Sheet.POSITIONS.BOTTOM;
        const scrollOptions = { behavior: Sheet.SCROLL_BEHAVIOR };

        switch (position) {
            case Sheet.POSITIONS.TOP:
                scrollOptions.top = sheet.scrollHeight;
                break;
            case Sheet.POSITIONS.LEFT:
                scrollOptions.left = sheet.scrollWidth;
                break;
            case Sheet.POSITIONS.RIGHT:
                scrollOptions.left = 0;
                break;
            case Sheet.POSITIONS.BOTTOM:
                scrollOptions.top = 0;
                break;
            default:
                console.warn(`Sheet: Invalid position "${position}". Expected: top, left, right, or bottom.`);
                return;
        }

        sheet.scrollTo(scrollOptions);
        sheet.removeAttribute(Sheet.SELECTORS.OPEN_ATTR);
    }

    /**
     * Get cached wrapper or query and cache it
     */
    getWrapper(sheet) {
        if (this.wrapperCache.has(sheet)) {
            return this.wrapperCache.get(sheet);
        }

        const wrapper = sheet.querySelector(Sheet.SELECTORS.WRAPPER);
        if (!wrapper) {
            console.warn(`Sheet: ${Sheet.WARNING_MSG}`);
            return null;
        }

        this.wrapperCache.set(sheet, wrapper);
        return wrapper;
    }

    /**
     * Update CSS variables for all sheets based on wrapper dimensions
     */
    update() {
        this.sheets.forEach(sheet => {
            const wrapper = this.getWrapper(sheet);
            if (!wrapper) return;

            sheet.style.setProperty(Sheet.CSS_VARS.WIDTH, `${wrapper.offsetWidth}px`);
            sheet.style.setProperty(Sheet.CSS_VARS.HEIGHT, `${wrapper.offsetHeight}px`);
            sheet.setAttribute(Sheet.SELECTORS.ACTIVE_ATTR, '');
        });
    }

    /**
     * Cleanup and remove all event listeners
     */
    destroy() {
        clearTimeout(this.resizeTimeout);
        window.removeEventListener('resize', this.handleResize);

        this.triggers.forEach(trigger => {
            trigger.removeEventListener('click', this.handleTriggerClick);
        });

        this.sheets.forEach(sheet => {
            sheet.querySelectorAll(Sheet.SELECTORS.CLOSE_BUTTONS).forEach(button => {
                button.removeEventListener('click', () => this.close(sheet));
            });
        });

        this.wrapperCache.clear();
    }
}

export { Sheet };
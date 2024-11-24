/**
 * @typedef {Object} AlertOptions
 * @property {string} [globalWrapperSelector='.global-alert-wrapper']
 * @property {string} [wrapperSelector='.alert-wrapper']
 * @property {string} [closeBtnSelector='.close']
 * @property {number} [animationDuration=600]
 * @property {boolean} [autoClose=false]
 * @property {number} [autoCloseDelay=5000]
 * @property {'top'|'bottom'} [position='top']
 * @property {'left'|'right'|'center'} [alignment='center']
 * @property {boolean} [modern=false]
 * @property {boolean} [fit=false]
 * @property {function(HTMLElement): void} [onOpen]
 * @property {function(HTMLElement): void} [onClose]
 */

class Alert {
    /**
     * @param {string} [selector='.alert'] 
     * @param {AlertOptions} [options={}]
     */
    constructor(selector = 'alert', options = {}) {
        this.options = {
            globalWrapperSelector: '.global-alert-wrapper',
            wrapperSelector: '.alert-wrapper',
            closeBtnSelector: '.close',
            animationDuration: null,
            autoClose: false,
            autoCloseDelay: 5000,
            position: 'top',
            alignment: 'center',
            modern: false,
            fit: false,
            onOpen: () => { },
            onClose: () => { },
            ...options
        };

        this.alerts = document.querySelectorAll(selector);
        this.init();
    }

    init() {
        this.setupGlobalWrapper();
        this.setupEventListeners();
    }

    setupGlobalWrapper() {
        if (!document.querySelector(this.options.globalWrapperSelector)) {
            const wrapper = document.createElement('div');
            wrapper.className = `global-alert-wrapper ${this.options.alignment} ${this.options.position}`;
            document.body.appendChild(wrapper);
        }
    }

    setupEventListeners() {
        this.alerts.forEach(alert => {
            const closeButton = alert.querySelector(this.options.closeBtnSelector);

            if (closeButton) {
                closeButton.addEventListener('click', () => this.close(alert));
            }

            if (this.options.autoClose) {
                alert.style.setProperty('--animation-delay', `${this.options.autoCloseDelay}ms`);
                setTimeout(() => this.close(alert), this.options.autoCloseDelay);
            }
        });
    }

    /**
     * @param {string} content 
     * @param {AlertOptions} [options={}]
     */
    create(content, options = {}) {
        const alertOptions = { ...this.options, ...options };
        const wrapper = document.querySelector(alertOptions.globalWrapperSelector);

        if (!wrapper) {
            throw new Error('Global wrapper not found');
        }

        const alert = document.createElement('alert');
        if (alertOptions.modern) alert.classList.add('modern');
        if (alertOptions.fit) alert.classList.add('fit');

        // Set custom properties if provided
        if (options.animationDuration) {
            alert.style.setProperty('--animation-duration', `${options.animationDuration}ms`);
        }

        const contentDiv = document.createElement('div');
        contentDiv.className = 'content';
        contentDiv.innerHTML = content;

        const closeButton = document.createElement('button');
        closeButton.className = 'close';
        closeButton.setAttribute('aria-label', 'Close alert');

        alert.appendChild(contentDiv);
        alert.appendChild(closeButton);
        wrapper.appendChild(alert);


        alert.setAttribute('open', '');


        if (alertOptions.autoClose) {
            setTimeout(() => this.close(alert), alertOptions.autoCloseDelay);
        }

        closeButton.addEventListener('click', () => this.close(alert));
        alertOptions.onOpen(alert);
        return alert;
    }

    open(alert) {
        if (!alert) return;
        alert.setAttribute('open', '');
        this.options.onOpen(alert);
    }

    close(alert) {
        if (!alert) return;
        alert.removeAttribute('open');

        // Wait for hide animation to complete before removing
        alert.addEventListener('animationend', () => {
            alert.remove();
            this.options.onClose(alert);
        }, { once: true });
    }

    closeAll() {
        this.alerts.forEach(alert => this.close(alert));
    }
}

// Export class and create a default instance
export { Alert };
export default new Alert();
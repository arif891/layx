class Window {
    constructor(selector = 'window') {
        this.windows = document.querySelectorAll(selector);
        this.init();
    }

    init() {
        this.addTriggerListeners();
        this.addCloseButtonListeners();
        this.addBackdropListeners();
    }

    addTriggerListeners() {
        document.querySelectorAll('[data-window-target]').forEach(trigger => {
            trigger.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = trigger.getAttribute('data-window-target');
                const targetwindow = document.querySelector(targetId);
                if (targetwindow) {
                    this.toggle(targetwindow);
                }
            });
        });
    }

    addCloseButtonListeners() {
        document.querySelectorAll('.close').forEach(closeButton => {
            closeButton.addEventListener('click', (e) => {
                e.preventDefault();
                const window = closeButton.closest('window');
                if (window) {
                    this.close(window);
                }
            });
        });
    }

    addBackdropListeners() {
        this.windows.forEach(window => {
            if (!window.classList.contains('none-modal')) {
                let windowBackdrop = window.querySelector('backdrop');
                if (!windowBackdrop) {
                    windowBackdrop = document.createElement('backdrop');
                    windowBackdrop.classList.add('window-backdrop');
                    window.appendChild(windowBackdrop);
                }
                windowBackdrop.addEventListener('click', () => {
                    this.close(window);
                    console.log('test');
                    
                });
            } else {
                return
            }
        }) 
    }


    open(window) {
        window.setAttribute('open', '');
        let windowBackdrop = window.querySelector('backdrop');
        if (windowBackdrop) {
            windowBackdrop.setAttribute('open', '');
        }
    }

    close(window) {
        window.removeAttribute('open', '');
        if (!window.classList.contains('none-modal')) {
            let windowBackdrop = window.querySelector('backdrop');
            if (windowBackdrop) {
                windowBackdrop.removeAttribute('open', '');
            }
        }
    }

    toggle(window) {
        if (window.hasAttribute('open', '')) {
            this.close(window);
        } else {
            this.open(window);
        }
    }

}

export default new Window();
export {Window};
class Alert {
    constructor(selector = 'alert') {
        this.alerts = document.querySelectorAll(selector);
        this.init();
    }

    init() {
        this.alerts.forEach(alert => {
            const closeButton = alert.querySelector('.close');

            if (closeButton) {
                closeButton.addEventListener('click', () => {
                    alert.removeAttribute('open');
                });
            }
        });
    }
}

export default new Alert();
export {Alert};
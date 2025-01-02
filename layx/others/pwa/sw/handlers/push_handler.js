export class PushHandler {
    constructor(logger) {
        this.logger = logger;
    }

    async handle(event) {
        if (!event.data) return;

        const data = event.data.json();
        this.logger.log('Push notification received:', data);
        
        return self.registration.showNotification(data.title, {
            body: data.body,
            icon: data.icon,
            badge: data.badge,
            data: data
        });
    }
}

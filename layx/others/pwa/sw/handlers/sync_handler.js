export class SyncHandler {
    constructor(formHandler, logger) {
        this.formHandler = formHandler;
        this.logger = logger;
    }

    async handle(event) {
        switch (event.tag) {
            case 'form-sync':
                return this.formHandler.syncPendingForms();
            default:
                this.logger.warn(`Unknown sync tag: ${event.tag}`);
        }
    }
}

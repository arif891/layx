export class MessageHandler {
    constructor(cacheManager, config, logger) {
        this.cache = cacheManager;
        this.config = config;
        this.logger = logger;
    }

    async handle(event) {
        const { type, payload } = event.data;
        
        switch (type) {
            case 'CACHE_CLEANUP':
                return this.cache.cleanup();
            
            case 'CACHE_UPDATE':
                return this.cache.update(payload);
            
            case 'CONFIG_UPDATE':
                return this.updateConfig(payload);
            
            default:
                this.logger.warn(`Unknown message type: ${type}`);
        }
    }

    updateConfig(newConfig) {
        Object.assign(this.config, newConfig);
        this.logger.debug('Config updated:', this.config);
    }
}

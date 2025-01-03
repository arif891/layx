import { CacheManager } from './modules/cache/cache_manager.js';
import { RequestHandler } from './handlers/request_handler.js';
import { FormHandler } from './handlers/form_handler.js';
import { PushHandler } from './handlers/push_handler.js';
import { SyncHandler } from './handlers/sync_handler.js';
import { MessageHandler } from './handlers/message_handler.js';
import { Logger } from './utils/logger.js';
import { CONFIG } from './config.js';

class ServiceWorkerApp {
    constructor() {
        this.logger = new Logger(CONFIG.debug);
        this.cache = new CacheManager(CONFIG.caches, this.logger);
        this.requestHandler = new RequestHandler(this.cache, CONFIG, this.logger);
        this.formHandler = new FormHandler(this.logger);
        this.pushHandler = new PushHandler(this.logger);
        this.syncHandler = new SyncHandler(this.formHandler, this.logger);
        this.messageHandler = new MessageHandler(this.cache, CONFIG, this.logger);
        
        this.init();
    }

    init() {
        // Register core event listeners
        self.addEventListener('install', e => this.handleInstall(e));
        self.addEventListener('activate', e => this.handleActivate(e));
        self.addEventListener('fetch', e => this.handleFetch(e));
        self.addEventListener('message', e => this.handleMassage(e));
        self.addEventListener('push', e => this.handlePush(e));
        self.addEventListener('sync', e => this.handleSync(e));

        this.setupBroadcastChannel();
    }

    async handleInstall(event) {
        this.logger.log('Installing Service Worker...');
        event.waitUntil(
            Promise.all([
                this.cache.precache(),
                self.skipWaiting()
            ])
        );
    }

    async handleActivate(event) {
        this.logger.log('Activating Service Worker...');
        event.waitUntil(
            Promise.all([
                this.cache.cleanup(),
                self.clients.claim(),
                this.enableNavigationPreload()
            ])
        );
    }


    async handleFetch(event) {
        const request = event.request;

        // Handle API requests
        if (this.isApiRequest(request)) {
            return this.requestHandler.handleApi(event);
        }

        // Handle form submissions
        if (request.method === 'POST' && request.headers.get('X-Requested-With') === 'FormSubmission') {
            return this.formHandler.handle(event);
        }

        // Handle asset requests
        return this.requestHandler.handleAsset(event);
    }

    handlePush(event) {
        event.waitUntil(this.pushHandler.handle(event));
    }

    handleSync(event) {
        event.waitUntil(this.syncHandler.handle(event));
    }

    handleMassage(event) {
        this.messageHandler.handle(event);
    }

    isApiRequest(request) {
        return CONFIG.api.endpoints.some(endpoint => 
            request.url.includes(endpoint.replace('*', '')));
    }

    async enableNavigationPreload() {
        if (self.registration.navigationPreload) {
            await self.registration.navigationPreload.enable();
        }
    }

    setupBroadcastChannel() {
        const channel = new BroadcastChannel('sw-messages');
        channel.onmessage = event => {
            this.messageHandler.handle(event);
        };
    }

}

// Initialize Service Worker with error handling
try {
    const sw = new ServiceWorkerApp();
    self.__SW__ = sw; // For debugging purposes
} catch (error) {
    console.error('Failed to initialize Service Worker:', error);
}

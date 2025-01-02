import { CacheManager } from './modules/cache/cache_manager.js';
import { RequestHandler } from './handlers/request_handler.js';
import { FormHandler } from './handlers/form_handler.js';
import { Logger } from './utils/logger.js';
import { CONFIG } from './config.js';

class ServiceWorkerApp {
    constructor() {
        this.logger = new Logger(CONFIG.debug);
        this.cache = new CacheManager(CONFIG.caches, this.logger);
        this.requestHandler = new RequestHandler(this.cache, CONFIG, this.logger);
        this.formHandler = new FormHandler(this.logger);
        this.version = CONFIG.version;
        
        this.init();
    }

    init() {
        // Register core event listeners
        self.addEventListener('install', e => this.handleInstall(e));
        self.addEventListener('activate', e => this.handleActivate(e));
        self.addEventListener('fetch', e => this.handleFetch(e));
        self.addEventListener('message', e => this.handleMessage(e));
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

        // Handle form submissions
        if (request.method === 'POST' && request.headers.get('X-Requested-With') === 'FormSubmission') {
            return this.formHandler.handle(event);
        }

        // Handle API requests
        if (this.isApiRequest(request)) {
            return this.requestHandler.handleApi(event);
        }

        // Handle asset requests
        return this.requestHandler.handleAsset(event);
    }

    async handleMessage(event) {
        const { type, payload } = event.data;
        
        switch (type) {
            case 'CACHE_CLEANUP':
                await this.cache.cleanup();
                break;
            case 'CACHE_UPDATE':
                await this.cache.update(payload);
                break;
            case 'CONFIG_UPDATE':
                this.updateConfig(payload);
                break;
            default:
                this.logger.warn(`Unknown message type: ${type}`);
        }
    }

    handlePush(event) {
        if (!event.data) return;

        const data = event.data.json();
        this.logger.log('Push notification received:', data);
        
        event.waitUntil(
            self.registration.showNotification(data.title, {
                body: data.body,
                icon: data.icon,
                badge: data.badge,
                data: data
            })
        );
    }

    handleSync(event) {
        if (event.tag === 'form-sync') {
            event.waitUntil(this.formHandler.syncPendingForms());
        }
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
            this.handleMessage(event);
        };
    }

    updateConfig(newConfig) {
        Object.assign(CONFIG, newConfig);
        this.logger.debug('Config updated:', CONFIG);
    }
}

// Initialize Service Worker with error handling
try {
    const sw = new ServiceWorkerApp();
    self.__SW__ = sw; // For debugging purposes
} catch (error) {
    console.error('Failed to initialize Service Worker:', error);
}

export class RequestHandler {
    constructor(cacheManager, config, logger) {
        this.cache = cacheManager;
        this.config = config;
        this.logger = logger;
    }

    async handleApi(event) {
        const strategy = this.config.api.cacheStrategy;
        return this[strategy](event);
    }

    async handleAsset(event) {
        const request = event.request;
        const isStatic = this.isStaticAsset(request.url);
        
        return isStatic ? 
            this.cacheFirst(event) : 
            this.networkFirst(event);
    }

    async networkFirst(event) {
        try {
            const response = await this.fetchWithTimeout(event);
            await this.cache.put(event.request, response.clone(), 'runtime');
            return response;
        } catch (error) {
            this.logger.error('Network request failed:', error);
            const cached = await this.cache.get(event.request, 'runtime');
            return cached || this.getFallback(event.request);
        }
    }

    async cacheFirst(event) {
        const cached = await this.cache.get(event.request, 'static');
        if (cached) return cached;

        try {
            const response = await this.fetchWithTimeout(event);
            await this.cache.put(event.request, response.clone(), 'static');
            return response;
        } catch (error) {
            this.logger.error('Cache-first fetch failed:', error);
            return this.getFallback(event.request);
        }
    }

    async staleWhileRevalidate(event) {
        const cached = await this.cache.get(event.request, 'runtime');
        const fetchPromise = this.fetchWithTimeout(event)
            .then(response => {
                this.cache.put(event.request, response.clone(), 'runtime');
                return response;
            })
            .catch(error => {
                this.logger.error('Background fetch failed:', error);
                return null;
            });

        return cached || fetchPromise || this.getFallback(event.request);
    }

    async fetchWithTimeout(event) {
        const timeout = this.config.performance.requestTimeout;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        try {
            const response = await Promise.race([
                event.preloadResponse,
                fetch(event.request, { signal: controller.signal })
            ]);
            clearTimeout(timeoutId);
            return response;
        } catch (error) {
            clearTimeout(timeoutId);
            throw error;
        }
    }

    async getFallback(request) {
        if (request.destination === 'image') {
            return this.cache.get('/assets/images/offline.svg', 'offline');
        }
        if (request.destination === 'document') {
            return this.cache.get('/offline.html', 'offline');
        }
        return new Response('Resource unavailable offline', { status: 503 });
    }

    isStaticAsset(url) {
        return this.config.caches.static.urls.some(pattern => {
            const regex = new RegExp(pattern.replace('*', '.*'));
            return regex.test(url);
        });
    }
}

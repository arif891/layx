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
        
        if (this.isStaticAsset(request)) {
            return this.handleStaticAsset(event);
        }

        return this.networkFirst(event);
    }

    async handleStaticAsset(event) {
        const cached = await this.cache.get(event.request, 'static');
        if (cached) {
            this.logger.debug('Serving from static cache:', event.request.url);
            return cached;
        }

        try {
            const response = await this.fetchWithTimeout(event);
            if (response.ok) {
                this.logger.debug('Caching static asset:', event.request.url);
                await this.cache.put(event.request, response.clone(), 'static');
            }
            return response;
        } catch (error) {
            this.logger.error('Static asset fetch failed:', error);
            return this.getFallback(event.request);
        }
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
            return this.cache.get(this.config.fallback.image, 'offline');
        }
        if (request.destination === 'document') {
            return this.cache.get(this.config.fallback.document, 'offline');
        }
        return new Response('Resource unavailable offline', { status: 503 });
    }

    isStaticAsset(request) {
        const config = this.config.caches.static;
        
        // Check if URL matches static patterns
        const urlMatches = config.urls.some(pattern => {
            const regex = new RegExp(pattern.replace('*', '.*'));
            return regex.test(request.url);
        });

        // Check if resource type is included
        const typeMatches = config.types.includes(request.destination);

        return urlMatches || typeMatches;
    }
}

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

        try {
            if (this.isStaticAsset(request)) {
                return this.cacheFirst(event);
            }
            if (this.isExcluded(request, this.config.caches.runtime)) {
                return this.fetch(event);
            }

            return this.networkFirst(event);

        } catch (error) {
            try {
                return this.getFallback(request);
            } catch (error) {
                throw error;
            }
        }
    }


    async networkFirst(event) {
        try {
            const response = await this.fetch(event);
            await this.cache.put(event.request, response.clone(), 'runtime');
            return response;
        } catch (error) {
            this.logger.error('Network request failed:', error);
            const cached = await this.cache.get(event.request);
            if (cached) { return cached };
            throw error;
        }
    }

    async cacheFirst(event) {
        const cached = await this.cache.get(event.request);
        if (cached) return cached;

        try {
            const response = await this.fetch(event);
            await this.cache.put(event.request, response.clone(), 'static');
            return response;
        } catch (error) {
            this.logger.error('Cache-first fetch failed:', error);
            throw error;
        }
    }

    async fetch(event) {
        try {
            const response = await Promise.race([
                event.preloadResponse,
                fetch(event.request, { signal: controller.signal })
            ]);
            return response;
        } catch (error) {
            this.logger.error('Fetch failed:', error);
            throw error;
        }
    }

    async getFallback(request) {
        try {
            if (request.destination === 'image') {
                return this.cache.get(this.config.fallback.image);
            }
            if (request.destination === 'document') {
                return this.cache.get(this.config.fallback.document);
            }
        } catch (error) {
            throw error;
        }

        return new Response('Resource unavailable offline', { status: 503 });
    }

    isStaticAsset(request) {
        const urls = [...this.config.caches.static.urls, ...this.config.caches.offline.urls];

        // Check if URL matches static patterns
        const urlMatches = urls.some(pattern => {
            const regex = new RegExp(pattern.replace('*', '.*'));
            return regex.test(request.url);
        });

        // Check if resource type is included
        const typeMatches = this.config.caches.static.types.includes(request.destination);

        return urlMatches || typeMatches;
    }

    isExcluded(request, config) {
        if (!config.exclude) return false;

        // Check if URL matches static patterns
        const urlMatches = config.urls.some(pattern => {
            const regex = new RegExp(pattern.replace('*', '.*'));
            return regex.test(request.url);
        });

        // Check if resource type is included
        const typeMatches = config.types.includes(request.destination);

        if (urlMatches || typeMatches) return true;

        return false;
    }
}

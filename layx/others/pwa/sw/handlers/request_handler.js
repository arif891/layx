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
        let headers = new Headers(event.request.headers);
        const cached = await this.cache.get(event.request);

        if (cached) {
            const metadata = this.cache.getResponseMetadata(cached);
            if (metadata?.timestamp) {
                headers.set('If-Modified-Since', new Date(metadata.timestamp).toUTCString());
            }
        }

        try {
            const response = await fetch(new Request(event.request.url, {
                method: event.request.method,
                headers: headers,
                mode: event.request.mode,
                credentials: event.request.credentials,
                redirect: event.request.redirect
            }));

            if (response.status === 304 && cached) {
                this.logger.debug('Resource not modified, using cached version');
                return cached;
            }

            if (response.ok) {
                await this.cache.put(event.request, response.clone(), 'runtime');
            }
            return response;
        } catch (error) {
            this.logger.error('Network request failed:', error);
            if (cached) return cached;
            throw error;
        }
    }

    async cacheFirst(event, revalidate = false) {
        const cached = await this.cache.get(event.request);
        if (cached) {
            if (revalidate) {
                this.revalidate(event.request, cached.clone());
            }
            return cached;
        }

        try {
            const response = await this.fetch(event);
            if (response.ok) {
                await this.cache.put(event.request, response.clone(), 'static');
            }
            return response;
        } catch (error) {
            this.logger.error('Cache-first fetch failed:', error);
            throw error;
        }
    }

    async fetch(event) {
        try {
            return await Promise.race([
                event.preloadResponse,
                fetch(event.request)
            ]);
        } catch (error) {
            this.logger.error('Fetch failed:', error);
            throw error;
        }
    }

    async revalidate(request, cachedResponse) {
        const headers = new Headers(request.headers);
        const metadata = this.cache.getResponseMetadata(cachedResponse);
        
        if (metadata?.timestamp) {
            headers.set('If-Modified-Since', new Date(metadata.timestamp).toUTCString());
        }

        try {
            const response = await fetch(new Request(request.url, {
                method: request.method,
                headers: headers,
                mode: request.mode,
                credentials: request.credentials,
                redirect: request.redirect
            }));

            if (response.ok && response.status !== 304) {
                await this.cache.put(request, response, 'static');
                this.logger.debug('Background revalidation updated cache');
            }
        } catch (error) {
            this.logger.error('Background revalidation failed:', error);
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

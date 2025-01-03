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
        event.respondWith((async () => {
            try {
                if (this.isStaticAsset(request)) {
                    return await this.cacheFirst(event);
                }
                if (this.isExcluded(request, this.config.caches.runtime)) {
                    return await this.fetch(event);
                }
                return await this.networkFirst(event);
            } catch (error) {
                this.logger.error('Asset handling failed:', error);
                return await this.getFallback(request);
            }
        })());
    }

    async networkFirst(event) {
        try {
            const response = await this.fetch(event);
            if (response && response.ok) {
                await this.cache.put(event.request, response.clone(), 'runtime');
            }
            return response;
        } catch (error) {
            this.logger.warn('Network request failed, falling back to cache');
            const cached = await this.cache.get(event.request, 'runtime');
            if (cached) return cached;
            throw error;
        }
    }

    async cacheFirst(event) {
        try {
            const cached = await this.cache.get(event.request, 'static');
            if (cached) {
                this.logger.debug('Serving from cache:', event.request.url);
                // Start revalidation in background
                this.revalidate(event.request, cached.clone());
                return cached;
            }

            const response = await this.fetch(event);
            if (response && response.ok) {
                this.logger.debug('Caching new response:', event.request.url);
                await this.cache.put(event.request, response.clone(), 'static');
            }
            return response;
        } catch (error) {
            this.logger.error('Cache-first strategy failed:', error);
            throw error;
        }
    }

    async fetch(event) {
        try {
            let response;
            if (event.preloadResponse) {
                response = await event.preloadResponse;
                if (response) {
                    this.logger.debug('Using preloaded response');
                    return response;
                }
            }
            
            response = await fetch(event.request);
            if (!response) {
                throw new Error('Fetch returned empty response');
            }
            return response;
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

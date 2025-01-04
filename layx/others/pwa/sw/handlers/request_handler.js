import { urlMatchesPattern, testPattern, createHeadersWithTimestamp, createRequest } from '../utils/functions.js';

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
                return await this.cacheFirst(event);
            }
            if (this.isExcluded(request, this.config.caches.runtime) || this.config.caches.runtime?.enabled === false) {
                return await this.fetch(event);
            }
            return await this.networkFirst(event);
        } catch (error) {
            this.logger.error('Asset handling failed:', error);
            return await this.getFallback(request);
        }
    }

    async networkFirst(event) {
        try {
            const response = await this.fetch(event);
            if (response.ok) {
                event.waitUntil(
                    this.cache.put(event.request, response.clone(), 'runtime')
                );
            }
            return response;
        } catch (error) {
            this.logger.warn('Network request failed, falling back to cache');
            const cached = await this.cache.get(event.request, 'runtime');
            if (cached) return cached;
            throw error;
        }
    }

    async cacheFirst(event , revalidate = false) {
        const cached = await this.cache.get(event.request, 'static');
        if (cached) {
            if (revalidate) {
            // Start revalidation in background
            event.waitUntil(this.revalidate(event.request, cached.clone()));
            }
            return cached;
        }

        try {
            const response = await this.fetch(event);
            if (response.ok) {
                event.waitUntil(
                    this.cache.put(event.request, response.clone(), 'static')
                );
            }
            return response;
        } catch (error) {
            this.logger.error('Cache-first fetch failed:', error);
            throw error;
        }
    }

    async fetch(event) {
        try {
            // Handle preload response
            const preloadResponse = await event.preloadResponse;
            if (preloadResponse) {
                this.logger.debug('Using preloaded response');
                return preloadResponse;
            }

            // Fall back to normal fetch
            const response = await fetch(event.request);
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
        try {
            const metadata = this.cache.getResponseMetadata(cachedResponse);
            const headers = createHeadersWithTimestamp(request.headers, metadata?.timestamp);
            const newRequest = createRequest(request, headers);
            
            const response = await fetch(newRequest);
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
        const staticUrls = this.config.caches.static?.urls || [];
        const offlineUrls = this.config.caches.offline?.urls || [];
        const urls = [...staticUrls, ...offlineUrls];
        const types = this.config.caches.static?.types || [];

        const urlMatches = urls.some(pattern => urlMatchesPattern(request.url, pattern));
        const typeMatches = types.includes(request.destination);

        return urlMatches || typeMatches;
    }

    isExcluded(request, config) {
        if (!config?.exclude) return false;
        const { urls = [], types = [], patterns = [] } = config.exclude;

        return (
            urls.some(pattern => urlMatchesPattern(request.url, pattern)) ||
            types.includes(request.destination) ||
            patterns.some(pattern => testPattern(pattern, request.url))
        );
    }
}

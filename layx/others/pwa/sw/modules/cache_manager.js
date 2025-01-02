export class CacheManager {
    constructor(config, logger) {
        this.config = config;
        this.logger = logger;
    }

    async precache() {
        const { static: staticCache, offline: offlineCache } = this.config;
        
        await Promise.all([
            this.precacheUrls(staticCache.name, staticCache.urls),
            this.precacheUrls(offlineCache.name, offlineCache.urls)
        ]);
    }

    async precacheUrls(cacheName, urls) {
        const cache = await caches.open(cacheName);
        await Promise.all(
            urls.map(async url => {
                try {
                    await cache.add(url);
                } catch (error) {
                    this.logger.error(`Failed to cache ${url}:`, error);
                }
            })
        );
    }

    async cleanup() {
        const keys = await caches.keys();
        const validCacheNames = Object.values(this.config)
            .map(cache => cache.name);

        await Promise.all(
            keys.filter(key => !validCacheNames.includes(key))
                .map(key => caches.delete(key))
        );
    }

    async get(request, cacheName) {
        const cache = await caches.open(cacheName);
        const response = await cache.match(request);

        if (response) {
            // Check if cached response is still valid
            const cacheConfig = this.getCacheConfig(cacheName);
            if (this.isResponseValid(response, cacheConfig)) {
                return response;
            }
            await cache.delete(request);
        }

        return null;
    }

    async put(request, response, cacheName) {
        const cache = await caches.open(cacheName);
        const cacheConfig = this.getCacheConfig(cacheName);

        // Check cache limits before storing
        await this.enforceLimit(cache, cacheConfig);
        
        // Store with metadata
        const metadata = {
            timestamp: Date.now(),
            size: this.getResponseSize(response)
        };

        const enhancedResponse = new Response(response.body, {
            ...response,
            headers: new Headers({
                ...Object.fromEntries(response.headers),
                'sw-cache-metadata': JSON.stringify(metadata)
            })
        });

        await cache.put(request, enhancedResponse);
    }

    getCacheConfig(cacheName) {
        return Object.values(this.config)
            .find(cache => cache.name === cacheName);
    }

    isResponseValid(response, config) {
        if (!config.maxAge) return true;

        const metadata = this.getResponseMetadata(response);
        if (!metadata) return true;

        return Date.now() - metadata.timestamp < config.maxAge;
    }

    async enforceLimit(cache, config) {
        if (!config.maxItems && !config.maxSize) return;

        const entries = await cache.keys();
        if (config.maxItems && entries.length >= config.maxItems) {
            await cache.delete(entries[0]);
        }

        if (config.maxSize) {
            let totalSize = 0;
            for (const request of entries) {
                const response = await cache.match(request);
                const metadata = this.getResponseMetadata(response);
                if (metadata) {
                    totalSize += metadata.size;
                    if (totalSize > config.maxSize) {
                        await cache.delete(request);
                    }
                }
            }
        }
    }

    getResponseMetadata(response) {
        try {
            const metadata = response.headers.get('sw-cache-metadata');
            return metadata ? JSON.parse(metadata) : null;
        } catch {
            return null;
        }
    }

    getResponseSize(response) {
        const contentLength = response.headers.get('content-length');
        return contentLength ? parseInt(contentLength, 10) : 0;
    }
}

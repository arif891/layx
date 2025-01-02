export class CacheManager {
    constructor(config, logger) {
        this.config = config;
        this.logger = logger;
        this.versionKey = 'sw-cache-versions';
    }

    async precache() {
        // Only precache offline files
        const { offline: offlineCache } = this.config;
        await this.precacheUrls(offlineCache.name, offlineCache.urls);
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
        const storedVersions = await this.getStoredVersions();
        const currentVersions = this.getCurrentVersions();
        
        for (const [cacheName, version] of Object.entries(currentVersions)) {
            if (storedVersions[cacheName] !== version) {
                // Version changed, delete old cache
                const oldCacheName = `${cacheName}-v${storedVersions[cacheName]}`;
                if (keys.includes(oldCacheName)) {
                    await caches.delete(oldCacheName);
                    this.logger.debug(`Deleted outdated cache: ${oldCacheName}`);
                }
            }
        }

        // Delete any unrecognized caches
        const validCacheNames = Object.keys(this.config).map(key => 
            this.getVersionedCacheName(key)
        );

        await Promise.all(
            keys
                .filter(key => !validCacheNames.includes(key))
                .map(key => caches.delete(key))
        );

        // Store new versions
        await this.storeVersions(currentVersions);
    }

    async getStoredVersions() {
        try {
            const data = await localStorage.getItem(this.versionKey);
            return data ? JSON.parse(data) : {};
        } catch {
            return {};
        }
    }

    getCurrentVersions() {
        return Object.entries(this.config).reduce((acc, [name, config]) => {
            acc[name] = config.version;
            return acc;
        }, {});
    }

    async storeVersions(versions) {
        try {
            await localStorage.setItem(this.versionKey, JSON.stringify(versions));
        } catch (error) {
            this.logger.error('Failed to store cache versions:', error);
        }
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
        const cache = await caches.open(this.getVersionedCacheName(cacheName));
        const cacheConfig = this.getCacheConfig(cacheName);

        // Don't cache excluded resources for static cache
        if (cacheName === 'static' && this.isExcluded(request, cacheConfig)) {
            return;
        }

        // Check cache limits before storing
        await this.enforceLimit(cache, cacheConfig);
        
        const metadata = {
            timestamp: Date.now(),
            size: this.getResponseSize(response),
            url: request.url,
            type: request.destination
        };

        const enhancedResponse = new Response(response.body, {
            ...response,
            headers: new Headers({
                ...Object.fromEntries(response.headers),
                'sw-cache-metadata': JSON.stringify(metadata)
            })
        });

        await cache.put(request, enhancedResponse);
        this.logger.debug(`Cached ${request.url} in ${cacheName}`);
    }

    getVersionedCacheName(baseName) {
        const config = this.getCacheConfig(baseName);
        return config ? `${config.name}-v${config.version}` : baseName;
    }

    isExcluded(request, config) {
        if (!config.exclude) return false;

        // Check excluded URLs
        if (config.exclude.urls?.some(url => request.url.includes(url))) {
            return true;
        }

        // Check excluded types
        if (config.exclude.types?.includes(request.destination)) {
            return true;
        }

        // Check excluded patterns
        if (config.exclude.patterns?.some(pattern => pattern.test(request.url))) {
            return true;
        }

        return false;
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

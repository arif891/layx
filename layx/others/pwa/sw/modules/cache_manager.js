import { IndexedDBUtil } from '../utils/indexedDB.js';
import { 
    getMetadataFromResponse, 
    getResponseSize, 
    enhanceResponseWithMetadata 
} from '../utils/functions.js';

export class CacheManager {
    constructor(config, logger) {
        this.config = config;
        this.logger = logger;
        this.caches = new Map();
        this.versionDB = new IndexedDBUtil('sw-cache-store', 1)
            .addStore('versions', { 
                keyPath: 'name',
                indexes: [
                    { name: 'timestamp', keyPath: 'timestamp' },
                    { name: 'version', keyPath: 'version' }
                ]
            });
        this.init();
    }

    async init() {
        try {
            await this.versionDB.connect();
            await this.initializeCaches();
        } catch (error) {
            this.logger.error('Failed to initialize CacheManager:', error);
        }
    }

    async initializeCaches() {
        for (const [name, config] of Object.entries(this.config)) {
            if (!config.name || !config.version) continue;
            
            const cacheName = this.getVersionedCacheName(name);
            this.caches.set(name, await caches.open(cacheName));
            
            this.logger.debug(`Initialized cache: ${cacheName}`);
        }
    }

    async precache() {
        const { offline } = this.config;
        if (!offline?.urls?.length) return;

        try {
            const cache = await caches.open('offline');
            if (!cache) return;

            const results = await Promise.allSettled(
                offline.urls.map(async url => {
                    try {
                        const response = await fetch(url);
                        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                        await cache.put(url, response);
                        this.logger.debug(`Precached: ${url}`);
                    } catch (error) {
                        this.logger.error(`Failed to precache ${url}:`, error);
                    }
                })
            );

            const failed = results.filter(r => r.status === 'rejected').length;
            if (failed > 0) {
                this.logger.warn(`Failed to precache ${failed} resources`);
            }
        } catch (error) {
            this.logger.error('Precache failed:', error);
        }
    }


    async cleanup() {
        try {
            const keys = await caches.keys();
            const storedVersions = await this.getStoredVersions();
            const currentVersions = this.getCurrentVersions();
            const deletions = [];

            // Delete outdated version caches
            for (const [name, version] of Object.entries(currentVersions)) {
                const oldVersion = storedVersions[name];
                if (oldVersion && oldVersion !== version) {
                    const oldCacheName = `${name}-v${oldVersion}`;
                    if (keys.includes(oldCacheName)) {
                        deletions.push(
                            caches.delete(oldCacheName)
                                .then(() => this.logger.debug(`Deleted outdated cache: ${oldCacheName}`))
                        );
                    }
                }
            }

            // Delete unrecognized caches
            const validNames = new Set(
                Object.entries(this.config)
                    .map(([name, cfg]) => `${cfg.name}-v${cfg.version}`)
            );

            keys.forEach(key => {
                if (!validNames.has(key)) {
                    deletions.push(
                        caches.delete(key)
                            .then(() => this.logger.debug(`Deleted unrecognized cache: ${key}`))
                    );
                }
            });

            await Promise.all(deletions);
            await this.storeVersions(currentVersions);
            await this.initializeCaches(); // Reinitialize caches after cleanup

        } catch (error) {
            this.logger.error('Cache cleanup failed:', error);
        }
    }

    async getStoredVersions() {
        try {
            const data = await this.versionDB.getAll('versions');
            return data.reduce((acc, { name, version }) => {
                acc[name] = version;
                return acc;
            }, {});
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
            const timestamp = Date.now();
            const entries = Object.entries(versions).map(([name, version]) => ({
                name,
                version,
                timestamp
            }));

            // Store one by one if bulk operation fails
            try {
                await this.versionDB.putBulk('versions', entries);
            } catch {
                await Promise.all(
                    entries.map(entry => this.versionDB.put('versions', entry))
                );
            }
        } catch (error) {
            this.logger.error('Failed to store cache versions:', error);
        }
    }

    async get(request, cacheName) {
        const response = await caches.match(request);

        if (response) {
            // Check if cached response is still valid
            const cacheConfig = this.getCacheConfig(cacheName);
            if (this.isResponseValid(response, cacheConfig)) {
                return response;
            }
            await caches.delete(request);
        }

        return null;
    }

    async put(request, response, cacheName) {
        const cache = await caches.open(this.getVersionedCacheName(cacheName));
        const cacheConfig = this.getCacheConfig(cacheName);

        // Check cache limits before storing
        await this.enforceLimit(cache, cacheConfig);
        
        const metadata = {
            timestamp: Date.now(),
            size: getResponseSize(response),
            url: request.url,
            type: request.destination
        };

        const enhancedResponse = enhanceResponseWithMetadata(response, metadata);
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
        return getMetadataFromResponse(response);
    }

    getResponseSize(response) {
        const contentLength = response.headers.get('content-length');
        return contentLength ? parseInt(contentLength, 10) : 0;
    }
}

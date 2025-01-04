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
        this.lastCleanup = new Map();
        this.cleanupInterval = 5 * 60 * 1000; // 5 minutes
        this.batchSize = 50; // Process in batches of 50
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
        try {
            const cache = await caches.open(this.getVersionedCacheName(cacheName));
            const response = await cache.match(request);

            if (!response) return null;

            // Check if cached response is still valid
            const cacheConfig = this.getCacheConfig(cacheName);
            if (!cacheConfig || this.isResponseValid(response, cacheConfig)) {
                return response;
            }

            // If response is invalid, delete it
            await cache.delete(request);
            return null;
        } catch (error) {
            this.logger.error(`Failed to get cached response for ${request.url}:`, error);
            return null;
        }
    }

    async put(request, response, cacheName) {
        try {
            const cache = await caches.open(this.getVersionedCacheName(cacheName));
            
            if (!response.ok) {
                this.logger.warn(`Skipping cache for non-ok response: ${request.url}`);
                return;
            }

            const metadata = {
                timestamp: Date.now(),
                size: getResponseSize(response),
                url: request.url,
                type: request.destination
            };

            const enhancedResponse = enhanceResponseWithMetadata(response, metadata);
            await cache.put(request, enhancedResponse);
            
            // Check if cleanup is needed
            this.checkCleanupNeeded(cacheName);
            
            this.logger.debug(`Cached ${request.url} in ${cacheName}`);
        } catch (error) {
            this.logger.error(`Failed to cache ${request.url}:`, error);
        }
    }

    async checkCleanupNeeded(cacheName) {
        const lastCleanup = this.lastCleanup.get(cacheName) || 0;
        const now = Date.now();

        if (now - lastCleanup >= this.cleanupInterval) {
            // Schedule cleanup in the background
            this.scheduleCacheCleanup(cacheName);
            this.lastCleanup.set(cacheName, now);
        }
    }

    scheduleCacheCleanup(cacheName) {
        setTimeout(async () => {
            try {
                await this.cleanupCache(cacheName);
            } catch (error) {
                this.logger.error(`Scheduled cleanup failed for ${cacheName}:`, error);
            }
        }, 0);
    }

    async cleanupCache(cacheName) {
        const cache = await caches.open(this.getVersionedCacheName(cacheName));
        const config = this.getCacheConfig(cacheName);
        if (!config) return;

        try {
            const entries = await cache.keys();
            const totalEntries = entries.length;
            
            if (this.needsSizeCleanup(config, totalEntries)) {
                await this.batchCleanup(cache, entries, config);
            }
        } catch (error) {
            this.logger.error(`Cache cleanup failed for ${cacheName}:`, error);
        }
    }

    needsSizeCleanup(config, totalEntries) {
        return (config.maxItems && totalEntries > config.maxItems * 1.2) || // 20% over limit
               (config.maxSize && totalEntries > this.batchSize); // Only check size in batches
    }

    async batchCleanup(cache, entries, config) {
        let totalSize = 0;
        let processedEntries = [];

        // Process entries in batches
        for (let i = 0; i < entries.length; i += this.batchSize) {
            const batch = entries.slice(i, i + this.batchSize);
            const batchStats = await this.processBatch(cache, batch, config);
            
            totalSize += batchStats.size;
            processedEntries = processedEntries.concat(batchStats.entries);

            // Sort and remove oldest entries if needed
            if (this.shouldRemoveEntries(config, processedEntries.length, totalSize)) {
                await this.removeOldestEntries(cache, processedEntries, config);
                break; // Exit after cleanup
            }
        }
    }

    async processBatch(cache, batch, config) {
        let batchSize = 0;
        let batchEntries = [];

        for (const request of batch) {
            const response = await cache.match(request);
            if (!response) continue;

            const metadata = getMetadataFromResponse(response);
            if (metadata) {
                batchEntries.push({
                    request,
                    timestamp: metadata.timestamp,
                    size: metadata.size || 0
                });
                batchSize += metadata.size || 0;
            }
        }

        return { size: batchSize, entries: batchEntries };
    }

    shouldRemoveEntries(config, entryCount, totalSize) {
        return (config.maxItems && entryCount > config.maxItems) ||
               (config.maxSize && totalSize > config.maxSize);
    }

    async removeOldestEntries(cache, entries, config) {
        // Sort by timestamp
        entries.sort((a, b) => a.timestamp - b.timestamp);

        let removed = 0;
        let removedSize = 0;

        while (entries.length > 0 && 
               this.shouldRemoveEntries(config, entries.length - removed, entries.reduce((sum, e) => sum + e.size, 0) - removedSize)) {
            const entry = entries.shift();
            await cache.delete(entry.request);
            removed++;
            removedSize += entry.size;
            this.logger.debug(`Removed old cache entry: ${entry.request.url}`);
        }
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
        // Find the cache config in this.config that matches the cache name
        const cacheEntry = Object.entries(this.config).find(([_, config]) => 
            config.name === cacheName
        );
        return cacheEntry ? cacheEntry[1] : null;
    }

    isResponseValid(response, config) {
        // If no config or no maxAge, consider response valid
        if (!config?.maxAge) return true;

        const metadata = getMetadataFromResponse(response);
        if (!metadata?.timestamp) return true;

        const age = Date.now() - metadata.timestamp;
        const isValid = age < config.maxAge;

        if (!isValid) {
            this.logger.debug(`Cache entry expired: ${response.url}, age: ${age}ms`);
        }

        return isValid;
    }

    async enforceLimit(cache, config) {
        if (!config) return;

        try {
            const entries = await cache.keys();
            
            // Handle item count limit
            if (config.maxItems && typeof config.maxItems === 'number') {
                while (entries.length >= config.maxItems) {
                    const oldestEntry = entries.shift();
                    if (oldestEntry) {
                        await cache.delete(oldestEntry);
                        this.logger.debug(`Removed old cache entry: ${oldestEntry.url}`);
                    }
                }
            }

            // Handle size limit
            if (config.maxSize && typeof config.maxSize === 'number') {
                let totalSize = 0;
                for (const request of entries) {
                    const response = await cache.match(request);
                    if (!response) continue;

                    const metadata = getMetadataFromResponse(response);
                    if (metadata?.size) {
                        totalSize += metadata.size;
                        if (totalSize > config.maxSize) {
                            await cache.delete(request);
                            this.logger.debug(`Removed cache entry due to size limit: ${request.url}`);
                        }
                    }
                }
            }
        } catch (error) {
            this.logger.error('Error enforcing cache limits:', error);
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

// Function for match url pattern
function matchUrlPattern(url, combinedPattern) {
    if (combinedPattern.test(url)) {
        return true;
    } else {
        return false;
    }
}

// Function to get the size of any cache
async function getCacheNumber(cacheName) {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    const cacheNum = keys.length;
    return { cached: cacheNum };
}

// Function to estimate and present the percentage of storage capacity
async function storageCapacityDetail() {
    const { usage, quota } = await navigator.storage.estimate();
    const storageUsedPercent = Math.round((usage / quota) * 100);
    const storageUsed = Math.round(usage / (1024 * 1024));
    const storageAvailable = Math.round(quota / (1024 * 1024));
    return { storageUsedPercent, storageUsed, storageAvailable };
}

// Function to check storage usage and clear runtime cache if needed
async function checkAndClearCache(cacheName = RUNTIME_CACHE) {
    try {
        const { storageUsedPercent, storageUsed, storageAvailable } = await storageCapacityDetail();
        const storageThresholdPercent = 80; // 80%
        const lowStorageThresholdMB = 1024 * 4; // 4 GB
        const minimalUsedStorageMB = 1024; // 1 GB

        if (
            storageUsedPercent > storageThresholdPercent &&
            storageAvailable < lowStorageThresholdMB &&
            storageUsed >= minimalUsedStorageMB
        ) {
            await caches.delete(cacheName);
            return { cleared: true, message: `${cacheName}  cache cleared successfully` };
        }

        return { cleared: false, message: `There's no need to clear the ${cacheName} cache at the moment. User devices currently have sufficient free space.` };
    } catch (error) {
        console.error('Error checking storage usage:', error);
        throw new Error('Failed to check storage usage');
    }
}

export {matchUrlPattern, getCacheNumber, storageCapacityDetail, checkAndClearCache}
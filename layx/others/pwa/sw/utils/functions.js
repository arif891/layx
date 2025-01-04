export function urlMatchesPattern(url, pattern) {
    try {
        const regex = new RegExp(pattern.replace('*', '.*'));
        return regex.test(url);
    } catch {
        return false;
    }
}

export function testPattern(pattern, url) {
    try {
        return pattern.test(url);
    } catch {
        return false;
    }
}

export function getMetadataFromResponse(response) {
    try {
        const metadata = response.headers.get('sw-cache-metadata');
        return metadata ? JSON.parse(metadata) : null;
    } catch {
        return null;
    }
}

export function getResponseSize(response) {
    const contentLength = response.headers.get('content-length');
    return contentLength ? parseInt(contentLength, 10) : 0;
}

export function enhanceResponseWithMetadata(response, metadata) {
    return new Response(response.body, {
        ...response,
        headers: new Headers({
            ...Object.fromEntries(response.headers),
            'sw-cache-metadata': JSON.stringify(metadata)
        })
    });
}

export function createHeadersWithTimestamp(originalHeaders, timestamp) {
    const headers = new Headers(originalHeaders);
    if (timestamp) {
        headers.set('If-Modified-Since', new Date(timestamp).toUTCString());
    }
    return headers;
}

export function createRequest(originalRequest, headers) {
    return new Request(originalRequest.url, {
        method: originalRequest.method,
        headers: headers,
        mode: originalRequest.mode,
        credentials: originalRequest.credentials,
        redirect: originalRequest.redirect
    });
}


// Function to get the size of any cache
export async function getCacheNumber(cacheName) {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    return  keys.length;
}

// Function to estimate and present the percentage of storage capacity
export async function storageCapacityDetail() {
    const { usage, quota } = await navigator.storage.estimate();
    const storageUsedPercent = Math.round((usage / quota) * 100);
    const storageUsed = Math.round(usage / (1024 * 1024));
    const storageAvailable = Math.round(quota / (1024 * 1024));
    return { storageUsedPercent, storageUsed, storageAvailable };
}
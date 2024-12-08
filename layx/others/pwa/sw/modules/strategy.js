// Generic function for network-first strategy
async function networkFirstStrategy(request, event, cacheName = RUNTIME_CACHE) {

    try {
        const preloadResponse = await event.preloadResponse;
        const cache = await caches.open(cacheName);

        if (preloadResponse) {
            cache.put(request, preloadResponse.clone());
            return preloadResponse;
        } else {
            const response = await fetch(request);
            cache.put(request, response.clone());
            return response;
        }
    } catch (error) {
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        return error;
    }
}

// Generic function for cache-first strategy
async function cacheFirstStrategy(request, event, cacheName = STATIC_CACHE) {

    const cachedResponse = await caches.match(request);
    const cache = await caches.open(cacheName);

    if (cachedResponse) {
        return cachedResponse;
    }

    try {
        const preloadResponse = await event.preloadResponse;
        if (preloadResponse) {
            cache.put(request, preloadResponse.clone());
            return preloadResponse;
        } else {
            const response = await fetch(request);
            cache.put(request, response.clone());
            return response;
        }
    } catch (error) {
        return error;
    }
}


// Generic function for stale-while-revalidate strategy
async function staleWhileRevalidateStrategy(request, event, cacheName = RUNTIME_CACHE) {

    try {
        const cachedResponse = await caches.match(request);
        const cache = await caches.open(cacheName);

        const fetchPromise = fetch(request).then(async (networkResponse) => {
            const preloadResponse = await event.preloadResponse;

            if (preloadResponse) {
                cache.put(request, preloadResponse.clone());
            } else {
                cache.put(request, networkResponse.clone());
            }

            return networkResponse;
        });

        return cachedResponse || fetchPromise;
    } catch (error) {
        return error;
    }
}

export {networkFirstStrategy, cacheFirstStrategy, staleWhileRevalidateStrategy}
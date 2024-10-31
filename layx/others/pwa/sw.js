const SW_VER = 1; // Increment when service worker code logic changes
const STATIC_CACHE_VER = 1; // Increment when static assets change
const OFFLINE_CACHE_VER = 1; // Increment when offline assets change
const RUNTIME_CACHE_NEED_CLEAR = false; // Set true when runtime cached assets need to clear

// Cache name template
const makeCacheName = (baseName, version) => `${baseName}-v${version}`;

// Cache bukets name
const OFFLINE_CACHE = makeCacheName("pwa-cache", OFFLINE_CACHE_VER);
const STATIC_CACHE = makeCacheName("static-cache", STATIC_CACHE_VER);
const RUNTIME_CACHE = "runtime-cache";

// Fallback Urls
const OFFLINE_FALLBACK_DOCUMENT = "pages/pwa/fallback.html";
const OFFLINE_FALLBACK_IMAGE = "assets/image/pwa/fallback.webp";

// This assets are downloded and added to chche when srvice worker install. Does not support RegExp url pattern
const OFFLINE_CACHE_ASSETS = [
    "pages/pwa/offline_activity.html",
    "pages/pwa/fallback.html",
    "assets/css/pwa/pwa.css",
    "assets/js/pwa/pwa.js",
    "pwa/caches/fallback.webp",
];

// This assets are downloded and added to chche when use accses them. Support RegExp url pattern
const STATIC_CACHE_ASSETS = [
    "/pages/static/*",
    "/assets/static/*",
];

const STATIC_CACHE_ASSETS_PATTERN = new RegExp(STATIC_CACHE_ASSETS.join("|").replace(/\*/g, "(.+)"));


self.addEventListener("install", (event) => {
    event.waitUntil(
        (async () => {
            const cache = await caches.open(OFFLINE_CACHE);
            await cache.addAll(OFFLINE_CACHE_ASSETS);
        })()
    );
    self.skipWaiting();
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        (async () => {
            if (self.registration.navigationPreload) {
                await self.registration.navigationPreload.enable();
            }

            if (RUNTIME_CACHE_NEED_CLEAR) {
                await caches.delete(RUNTIME_CACHE);
            }

            checkAndClearCache();
        })()
    );
    self.clients.claim();
});

self.addEventListener("fetch", (event) => {
    const { request } = event;

    switch (request.method) {
        case "GET":
            switch (request.destination) {
                case "document":
                    event.respondWith(
                        (async () => {
                            try {
                                const isStaticAsset = matchUrlPattern(request.url, STATIC_CACHE_ASSETS_PATTERN);

                                if (isStaticAsset) {
                                    const cachedResponse = await cacheFirstStrategy(request, event);
                                    return cachedResponse;
                                } else {
                                    const networkResponse = await networkFirstStrategy(request, event);
                                    return networkResponse;
                                }
                            } catch (error) {
                                console.error("Navigation fetch failed:", error);
                                const fallbackResponse = await caches.match(OFFLINE_FALLBACK_DOCUMENT);
                                return fallbackResponse;
                            }
                        })()
                    );
                    break;

                case "image":
                    event.respondWith(
                        (async () => {
                            try {
                                const isStaticAsset = matchUrlPattern(request.url, STATIC_CACHE_ASSETS_PATTERN);

                                if (isStaticAsset) {
                                    const cachedResponse = await cacheFirstStrategy(request, event);
                                    return cachedResponse;
                                } else {
                                    const networkResponse = await networkFirstStrategy(request, event);
                                    return networkResponse;
                                }
                            } catch (error) {
                                console.error("Image fetch failed:", error);
                                const fallbackResponse = await caches.match(OFFLINE_FALLBACK_IMAGE);
                                return fallbackResponse;
                            }
                        })()
                    );
                    break;

                default:
                    event.respondWith(
                        (async () => {
                            try {
                                const isStaticAsset = matchUrlPattern(request.url, STATIC_CACHE_ASSETS_PATTERN);

                                if (isStaticAsset) {
                                    const cachedResponse = await cacheFirstStrategy(request, event);
                                    return cachedResponse;
                                } else {
                                    const networkResponse = await networkFirstStrategy(request, event);
                                    return networkResponse;
                                }
                            } catch (error) {
                                console.error("Navigation fetch failed:", error);
                            }
                        })()
                    );
                    break;
            }
            break;

        case "POST":
            if (request.headers.get('X-Requested-With') === 'FormSubmission') {
                console.log('Intercepted a form submission in the service worker');
                handleFormSubmission(request);
            };
            break

        default:

            break;
    }

});

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

async function handleFormSubmission(request) {
    // Clone the request to read its body
    const formData = await request.formData();

    // Process the form data
    for (let [key, value] of formData.entries()) {
        console.log(`${key}: ${value}`);
    }

    // Forward the request to the network
    return fetch(request);
}

// Funtion for match url pattern
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

// Broadcast Channel for service worker communication
const SwBroadcastChannel = new BroadcastChannel('SwBroadcastChannel');

SwBroadcastChannel.onmessage = async (event) => {
    const SwReceivedData = event.data;
    if (SwReceivedData.runFunction) {
        const functionName = SwReceivedData.runFunction;
        const functionParams = SwReceivedData.params || [];

        try {
            const result = await self[functionName](...functionParams);

            SwBroadcastChannel.postMessage({ RunSuccess: true, result });
        } catch (error) {
            SwBroadcastChannel.postMessage({ RunSuccess: false, error: error.message });
        }
    } else {
        console.log(SwReceivedData, 'Unabale to handale Received Data.')
    }
};
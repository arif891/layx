/* Move this file to the root directory, update its name, and adjust module import paths accordingly */

import {networkFirstStrategy, cacheFirstStrategy, staleWhileRevalidateStrategy} from "./modules/strategy.js";
import {matchUrlPattern, getCacheNumber, storageCapacityDetail, checkAndClearCache} from "./modules/functions.js";
import {handleFormSubmission} from "./modules/form_handler.js";
import {handleBroadcastChannel} from "./modules/bc_handler.js";

const SW_VER = 1; // Increment when service worker code logic changes
const STATIC_CACHE_VER = 1; // Increment when static assets change
const OFFLINE_CACHE_VER = 1; // Increment when offline assets change
const RUNTIME_CACHE_NEED_CLEAR = false; // Set true when runtime cached assets need to clear

// Cache name template
const makeCacheName = (baseName, version) => `${baseName}-v${version}`;

// Cache buckets name
const OFFLINE_CACHE = makeCacheName("pwa-cache", OFFLINE_CACHE_VER);
const STATIC_CACHE = makeCacheName("static-cache", STATIC_CACHE_VER);
const RUNTIME_CACHE = "runtime-cache";

// Fallback Urls
const OFFLINE_FALLBACK_DOCUMENT = "pages/pwa/fallback.html";
const OFFLINE_FALLBACK_IMAGE = "assets/image/pwa/fallback.webp";

// This assets are downloaded and added to cache when service worker install. Does not support RegExp url pattern
const OFFLINE_CACHE_ASSETS = [
    "pages/pwa/offline_activity.html",
    "pages/pwa/fallback.html",
    "assets/css/pwa/pwa.css",
    "assets/js/pwa/pwa.js",
    "pwa/caches/fallback.webp",
];

// This assets are downloaded and added to cache when use access them. Support RegExp url pattern
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

// Broadcast Channel for service worker communication
const SwBroadcastChannel = new BroadcastChannel('SwBroadcastChannel');

SwBroadcastChannel.onmessage = handleBroadcastChannel(event);
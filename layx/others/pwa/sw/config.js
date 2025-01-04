export const CONFIG = {
    version: '1.0.0',
    navigationPreload: true,
    debug: {
        enabled: true,
        level: 'debug', // 'error' | 'warn' | 'info' | 'debug'
        logToServer: false,
        serverEndpoint: '/api/logs'
    },

    caches: {
        offline: {
            name: 'offline-cache',
            version: 1,
            urls: [
                '/pages/pwa/offline_activity.html',
                '/pages/pwa/fallback.html',
                '/assets/css/pwa/pwa.css',
                '/assets/js/pwa/pwa.js',
                '/assets/pwa/caches/fallback.webp'
            ],
            priority: 'reliability'
        },
        static: {
            name: 'static-cache',
            version: 1,
            urls: ['/pages/static/*', '/assets/static/*'],
            types: ['image', 'font'],
            maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
            maxItems: 100,
            maxSize: 100 * 1024 * 1024, // 100MB
            priority: 'speed',
            exclude: {
                urls: ['/api/*', '/dynamic/*'],
                types: ['video', 'audio'],
                patterns: [/\.(php|aspx)$/]
            }
        },
        runtime: {
            enabled: true,
            name: 'runtime-cache',
            version: 1,
            exclude: {
                urls: ['/form/*'],
                types: ['video', 'audio']
            },
            maxItems: 200,
            maxAge: 3 * 24 * 60 * 60 * 1000, // 3 days
            maxSize: 500 * 1024 * 1024, // 500MB
            priority: 'balance',
            cleanupStrategy: 'lru' // 'lru' | 'fifo' | 'size'
        }
    },

    api: {
        endpoints: ['/api/*'],
        version: 'v1',
        cacheStrategy: 'network-first',
        timeout: 5000,
        retryAttempts: 3,
        retryDelay: 1000,
        errorHandling: {
            retry4xx: false,
            retry5xx: true,
            retryTimeout: true,
            fallbackToCache: true
        },
        headers: {
            'X-API-Version': 'v1',
            'X-Client-Type': 'pwa'
        }
    },

    form: {
        enabled: true,
        syncInterval: 5 * 60 * 1000, // 5 minutes
        maxRetries: 3,
        queueName: 'form-sync-queue',
    },

    fallback: {
        document: '/pages/pwa/fallback.html',
        image: '/assets/pwa/caches/fallback.webp'
    },

    performance: {
       
    },

    notifications: {
        enabled: true,
        defaultIcon: '/assets/icons/notification.png',
        defaultBadge: '/assets/icons/badge.png',
        requireInteraction: false,
        defaultVibrate: [200, 100, 200]
    },

    offline: {
        autoSync: true,
        syncPriority: ['notifications', 'forms'],
        connectionChecks: {
            interval: 30000,
            timeout: 5000
        }
    },
};
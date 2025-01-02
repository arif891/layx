export const CONFIG = {
    version: '1.0.0',
    debug: {
        enabled: true,
        level: 'info', // 'error' | 'warn' | 'info' | 'debug'
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
            types: ['image', 'font', 'style', 'script'],
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
            maxItems: 100,
            priority: 'speed',
            preload: true,
            compression: true,
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
                urls: ['/form/*', '/api/analytics'],
                types: ['video', 'audio'],
                patterns: [/\/private\/.*/]
            },
            maxItems: 200,
            maxAge: 3 * 24 * 60 * 60 * 1000, // 3 days
            maxSize: 50 * 1024 * 1024, // 50MB
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
        requestTimeout: 10000,
        maxConcurrentRequests: 6,
        preload: {
            enabled: true,
            routes: ['/'],
            resources: ['style', 'script', 'font']
        },
        optimization: {
            compression: true,
            minification: true,
            imageOptimization: true
        }
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
        syncPriority: ['forms', 'notifications'],
        connectionChecks: {
            interval: 30000,
            timeout: 5000
        }
    },
};

// Optional: Add configuration validation
if (process.env.NODE_ENV === 'development') {
    validateConfig(CONFIG);
}

function validateConfig(config) {
    // Add your validation logic here
    const required = ['version', 'caches', 'api'];
    required.forEach(key => {
        if (!config[key]) throw new Error(`Missing required config key: ${key}`);
    });
}

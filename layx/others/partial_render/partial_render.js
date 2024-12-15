class PartialRender {
    constructor(selector = '.partial-render', linksSelector = '.partial-link', options = {}) {
        this.partial = document.querySelector(selector);
        this.linksSelector = linksSelector;
        this.links = options.linksWrapper
            ? options.linksWrapper.querySelectorAll(linksSelector)
            : document.querySelectorAll(linksSelector);

        this.options = {
            fetch: true,
            preFetch: true,
            handleNavigation: true,
            defaultAction: true,
            contentType: 'html',
            partialPath: 'partial/',
            maxPrefetchLimit: 150,
            maxCacheSize: 250,
            observerOptions: { rootMargin: '50px', threshold: 0.1 },
            throttleTime: 10,
            timeout: 5000,
            retryAttempts: 2,
            retryDelay: 1000,
            onSuccess: null,
            onError: null,
            onErrorRedirect: true,
            onNavigationChange: null,
            beforeRender: null,
            beforeFetch: null,
            debug: false,
            ...options
        };

        this.initialState = {
            content: this.partial?.innerHTML || '',
            url: window.location.href
        };

        this.routesCache = new Map();
        this.prefetchQueue = new Set();
        this.prefetchedUrls = new Set();
        this.observer = null;
        this.abortControllers = new Map();
        this.retryCount = new Map();

        this.linkClickHandler = this.linkClickHandler.bind(this);

        this.init();
    }

    init() {
        if (!this.initializeElements()) return;

        this.links.forEach(link => {
            link.removeEventListener('click', this.linkClickHandler);
            link.addEventListener('click', this.linkClickHandler);
        });

        if (this.options.preFetch) {
            this.setupPrefetching();
        }

        if (this.options.handleNavigation) {
            this.setupNavigation();
        }
    }

    initializeElements() {
        if (!this.partial) {
            console.warn('No partial element found. Ensure the selector matches an existing element.');
            return false;
        }
        if (!this.links.length) {
            console.warn('No links found for partial rendering. Ensure links match the provided selector.');
            return false;
        }
        return true;
    }

    setupPrefetching() {
        this.observer = new IntersectionObserver(
            this.throttle(this.prefetchLinks.bind(this), this.options.throttleTime),
            this.options.observerOptions
        );

        Array.from(this.links).slice(0, this.options.maxPrefetchLimit).forEach(link => {
            this.observer.observe(link);
        });
    }

    setupNavigation() {
        window.history.replaceState({
            url: this.initialState.url,
            content: this.initialState.content
        }, '', this.initialState.url);

        window.addEventListener('popstate', event => {
            if (event.state) {
                this.partial.innerHTML = event.state.content;
                if (typeof this.options.onNavigationChange === 'function') {
                    this.options.onNavigationChange(event.state.url || window.location.href);
                }
                this.initializeLinksInPartial();
            }
        });
    }

   
    linkClickHandler(event) {
        event.preventDefault();
        const link = event.currentTarget;
        this.loadPartial(link.href);
    
        if (this.options.handleNavigation) {
            window.history.pushState({
                url: link.href,
                content: this.partial.innerHTML
            }, '', link.href);
        }
    }
    

    prefetchLinks(entries) {
        entries.forEach(entry => {
            const href = entry.target.href;

            if (!entry.isIntersecting ||
                this.routesCache.has(href) ||
                this.prefetchQueue.has(href) ||
                this.prefetchedUrls.has(href) ||
                this.routesCache.size >= this.options.maxCacheSize) {
                return;
            }

            this.queuePrefetch(href);
        });
    }

    async queuePrefetch(url) {
        if (this.prefetchQueue.has(url) || this.prefetchedUrls.has(url)) return;

        const transformedUrl = this.transformUrl(url);
        this.prefetchQueue.add(url);

        try {
            const content = await this.fetchWithRetry(transformedUrl);
            this.routesCache.set(url, content);
            this.prefetchedUrls.add(url);
            this.purgeCache();
        } catch (error) {
            console.error(`Failed to prefetch ${url}:`, error);
        } finally {
            this.prefetchQueue.delete(url);
        }
    }

    async fetchWithRetry(url, attempt = 0) {
        const controller = new AbortController();
        this.abortControllers.set(url, controller);

        try {
            const response = await Promise.race([
                fetch(url, { signal: controller.signal }),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Fetch timeout')), this.options.timeout)
                )
            ]);

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const content = await response.text();
            this.abortControllers.delete(url);
            return content;
        } catch (error) {
            this.abortControllers.delete(url);

            if (attempt < this.options.retryAttempts) {
                await new Promise(resolve =>
                    setTimeout(resolve, this.options.retryDelay * (attempt + 1))
                );
                return this.fetchWithRetry(url, attempt + 1);
            }

            throw error;
        }
    }

    transformUrl(url) {
        try {
            const urlObj = new URL(url);
            urlObj.pathname = urlObj.pathname.replace(/\/([^\/]+)$/, `/${this.options.partialPath}$1`);
            return urlObj.toString();
        } catch (e) {
            console.error('Invalid URL:', url);
            return url;
        }
    }

    loadPartial(url) {
        const cachedContent = this.routesCache.get(url);

        if (cachedContent) {
            this.updatePartial(cachedContent, url);
            return;
        }

        this.partial.classList.add('loading');
        const fetchUrl = this.transformUrl(url);

        this.fetchWithRetry(fetchUrl)
            .then(content => {
                this.routesCache.set(url, content);
                this.updatePartial(content, url);
                this.purgeCache();
            })
            .catch(error => {
                this.handleError(error, url);
            })
            .finally(() => {
                this.partial.classList.remove('loading');
            });
    }

    updatePartial(content, url) {
        if (typeof this.options.beforeRender === 'function') {
            this.options.beforeRender(this.partial, content, this.options.contentType);
        }

        if (this.options.defaultAction) {
            this.partial.innerHTML = content;
        }

        this.initializeLinksInPartial();

        if (typeof this.options.onSuccess === 'function') {
            this.options.onSuccess(this.partial, content);
        }

        if (typeof this.options.onNavigationChange === 'function') {
            this.options.onNavigationChange(url);
        }
    }

   
    initializeLinksInPartial() {
        const partialLinks = this.partial.querySelectorAll(this.linksSelector);
        
        partialLinks.forEach(link => {
            link.removeEventListener('click', this.linkClickHandler);
            
            link.addEventListener('click', this.linkClickHandler);
        });
    }

    handleError(error, url) {
        this.partial.classList.add('error');

        if (typeof this.options.onError === 'function') {
            this.options.onError(this.partial, error);
        }

        console.error('Failed to load partial:', error);

        if (this.options.onErrorRedirect) {
            window.location.href = url;
        }
    }

    throttle(fn, limit) {
        let lastCall = 0;
        return (...args) => {
            const now = Date.now();
            if (now - lastCall < limit) return;
            lastCall = now;
            fn(...args);
        };
    }

    cleanup() {
        if (this.observer) {
            this.observer.disconnect();
        }

        this.abortControllers.forEach(controller => controller.abort());
        this.abortControllers.clear();

        this.clearCache();
    }

    clearCache() {
        this.routesCache.clear();
        this.prefetchedUrls.clear();
        console.info('Cache cleared');
    }

    purgeCache() {
        while (this.routesCache.size > this.options.maxCacheSize) {
            const firstKey = this.routesCache.keys().next().value;
            this.routesCache.delete(firstKey);
        }
    }

    restoreInitialContent() {
        this.partial.innerHTML = this.initialState.content;
        window.history.replaceState({
            url: this.initialState.url,
            content: this.initialState.content
        }, '', this.initialState.url);
    }
}

export { PartialRender };
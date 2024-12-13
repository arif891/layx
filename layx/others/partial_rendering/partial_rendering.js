class PartialRender {
  constructor(selector = '.partial-render', linksSelector = '.partial-link', options = {}) {
    this.partial = document.querySelector(selector);
    this.links = options.linksWrapper
      ? options.linksWrapper.querySelectorAll(linksSelector)
      : document.querySelectorAll(linksSelector);

    this.options = {
      fetch: options.fetch ?? true,
      preFetch: options.preFetch ?? true,
      handleNavigation: options.handleNavigation ?? true,
      contentType: options.contentType ?? 'html',
      partialPath: options.partialPath ?? 'partial/',
      linksWrapper: options.linksWrapper,
      observerOptions: options.observerOptions ?? { rootMargin: '50px', threshold: 0.1 },
      throttleTime: options.throttleTime ?? 100,
      onSuccess: options.onSuccess,
      onError: options.onError,
      onErrorRedirect: options.onErrorRedirect ?? true,
      beforeRender: options.beforeRender,
      ...options
    };

    this.routesCache = new Map(); 
    this.prefetchQueue = new Set();
    this.lastClickedLink = null;

    this.init();
  }

  init() {
    this.initializeElements();
    if (this.options.preFetch) {
      this.setupPrefetching();
    }
    if (this.options.handleNavigation) {
      this.setupNavigation();
    }
  }

  initializeElements() {
    if (!this.partial || !this.links.length) {
      console.error('.partial-render and .partial-link elements are required');
      return;
    }
  }

  setupPrefetching() {
    const observer = new IntersectionObserver(this.prefetchLinks.bind(this), this.options.observerOptions);
    this.links.forEach(link => observer.observe(link));
  }

  prefetchLinks(entries) {
    entries.forEach(entry => {
      if (entry.isIntersecting && !this.prefetchQueue.has(entry.target.href)) {
        const href = entry.target.href.replace(/\/([^\/]+)$/, `/${this.options.partialPath}$1`);
        this.prefetchQueue.add(entry.target.href);
        fetch(href)
          .then(response => response.text())
          .then(content => this.routesCache.set(entry.target.href, content))
          .catch(err => console.error('Prefetch failed for:', entry.target.href, err));
      }
    });
  }

  setupNavigation() {
    this.links.forEach(link => {
      link.addEventListener('click', event => {
        event.preventDefault();
        this.lastClickedLink = link;
        this.loadPartial(link.href);
        window.history.pushState({ url: link.href }, '', link.href);
      });
    });

    window.addEventListener('popstate', event => {
      if (event.state && event.state.url) {
        this.loadPartial(event.state.url, false);
      }
    });
  }

  loadPartial(url, updateHistory = true) {
    const cachedContent = this.routesCache.get(url);

    if (cachedContent) {
      this.updatePartial(cachedContent);
    } else {
      const fetchUrl = url.replace(/\/([^\/]+)$/, `/${this.options.partialPath}$1`);
      fetch(fetchUrl)
        .then(response => {
          if (!response.ok) throw new Error(`Failed to fetch ${fetchUrl}`);
          return response.text();
        })
        .then(content => {
          this.routesCache.set(url, content);
          this.updatePartial(content);
        })
        .catch(error => {
          console.error('Failed to load partial:', error);
          if (typeof this.options.onError === 'function') {
            this.options.onError(this.partial, error, this.lastClickedLink);
          }
          if (this.options.onErrorRedirect) window.location.href = url;
        });
    }
  }

  updatePartial(content) {
    if (typeof this.options.beforeRender === 'function') {
      this.options.beforeRender(this.partial, content, this.lastClickedLink);
    }
    if(this.options.contentType === 'html') {
      this.partial.innerHTML = content;
    }
    if (typeof this.options.onSuccess === 'function') {
      this.options.onSuccess(this.partial, content, this.lastClickedLink);
    }
  }
}

export default new PartialRender();
export {PartialRender};
class DynamicRender {
    constructor(selector = '.dynamic') {
        this.selector = selector;
        this.elements = document.querySelectorAll(selector);
        this.init();
    }

    init() {
        this.elements.forEach(element => {
            const isAfterElement = element.classList.contains('after');
            this.saveOriginalTemplate(element);
            this.updateElement(element, isAfterElement);
        });

        this.observeDOMChanges();
    }

    saveOriginalTemplate(element) {
        if (!element.dataset.originalTemplate) {
            element.dataset.originalTemplate = element.innerHTML; 
            Array.from(element.attributes).forEach(attr => {
                if (attr.name !== 'class' && !attr.name.startsWith('data-original-')) {
                    element.dataset[`original${this.camelCase(attr.name)}`] = attr.value;
                }
            });
        }
    }

    camelCase(str) {
        return str.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
    }

    updateElement(element, useFallbackOnly = false) {
        this.updateElementContent(element, useFallbackOnly);
        this.updateElementAttributes(element, useFallbackOnly);
    }

    updateElementContent(element, useFallbackOnly = false) {
        const template = element.dataset.originalTemplate || element.innerHTML;
        element.innerHTML = this.processTemplate(template, useFallbackOnly);
    }

    updateElementAttributes(element, useFallbackOnly = false) {
        Object.keys(element.dataset).forEach(key => {
            if (key.startsWith('original') && key !== 'originalTemplate') {
                const attrName = this.decamelCase(key.slice(8));
                const template = element.dataset[key];
                const processedValue = this.processTemplate(template, useFallbackOnly);
                element.setAttribute(attrName, processedValue);
            }
        });
    }

    decamelCase(str) {
        return str.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`);
    }

    processTemplate(template, useFallbackOnly = false) {
        return template.replace(/\{([^}|]+)(?:\|([^}]+))?\}/g, (match, expression, defaultValue) => {
            if (useFallbackOnly) {
                return defaultValue ?? match;
            }

            try {
                const result = this.evaluateExpression(expression);
                return (result == null) ? (defaultValue ?? match) : result;
            } catch (error) {
                console.warn(`Error evaluating ${match}: ${error}`);
                return defaultValue ?? match;
            }
        });
    }

    evaluateExpression(expression) {
        const safeEval = new Function('expression', `
            with (Object.create(null)) {
                return (${expression});
            }
        `);
        return safeEval(expression);
    }

    updateAfterElements() {
        document.querySelectorAll(`${this.selector}.after`).forEach(element => {
            this.updateElement(element, false);
        });
    }

    observeDOMChanges() {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE && node.matches(this.selector)) {
                            this.saveOriginalTemplate(node);
                            this.updateElement(node, node.classList.contains('after'));
                        }
                    });
                }
            });
        });

        observer.observe(document.body, { childList: true, subtree: true });
    }

    static init(selector) {
        return new DynamicRender(selector);
    }
}

/*********************************************************************
 * Component Manager – Lightweight Web Component Engine for LayX
 * - Dynamic & static component loading
 * - Native JS template literals with compilation caching
 * - Standard <slot> and named slots (<slot name="...">)
 * - Intelligent class and style merging
 * - Built-in template helpers: renderList, when, esc, cls, raw
 * - SSR & Node.js safe with zero runtime dependencies
 *********************************************************************/

class Component {
    static _instance = null;

    static getInstance() {
        return Component._instance;
    }

    /**
     * Programmatic scan & render
     * @param {Element|Document} [root=document]
     * @param {Object} [dataContext={}]
     */
    static async render(root, dataContext = {}) {
        const inst = Component._instance || new Component(dataContext);
        return inst.render(root);
    }

    /**
     * Programmatic component registration
     * @param {string} name
     * @param {string|Element} htmlOrElement
     */
    static register(name, htmlOrElement) {
        const inst = Component._instance || new Component();
        return inst.register(name, htmlOrElement);
    }

    constructor(dataContext = {}, options = {}) {
        if (Component._instance) {
            console.warn('[CM] Component instance already initialized');
            return Component._instance;
        }

        this.options = {
            debug: true,
            ...options,
        };

        // Static helpers available in all templates
        this._helpers = {
            renderList: (items, cb) => items?.map(cb).join('') ?? '',
            when: (cond, html, otherwise = '') => (cond ? html : otherwise),
            esc: (str) => String(str ?? '').replace(/[&<>"']/g, s => ({
                '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
            })[s]),
            raw: (str) => String(str ?? ''),
            cls: (...args) => {
                const classes = [];
                for (const arg of args) {
                    if (!arg) continue;
                    if (typeof arg === 'string' || typeof arg === 'number') {
                        classes.push(arg);
                    } else if (Array.isArray(arg)) {
                        const nested = this._helpers.cls(...arg);
                        if (nested) classes.push(nested);
                    } else if (typeof arg === 'object') {
                        for (const [k, v] of Object.entries(arg)) {
                            if (v) classes.push(k);
                        }
                    }
                }
                return classes.join(' ');
            },
        };

        this._ctx = { ...this._helpers, ...dataContext };
        this._debug = this.options.debug;
        this._registry = Object.create(null);
        this._fetching = new Map();
        this._tplCache = new Map();

        Component._instance = this;
        if (typeof window !== 'undefined') {
            window.__componentInstance = this;
        }

        this.ready = this.init();
    }

    /* ---------- Public API ---------- */

    async init() {
        if (typeof document === 'undefined') return;
        return this.render(document);
    }

    /**
     * Scan and instantiate all <component> elements inside root
     * @param {Element|Document} [root=document]
     */
    async render(root) {
        if (typeof document === 'undefined') return;
        const target = root || document;
        const elements = target.querySelectorAll ? target.querySelectorAll('component') : [];
        await Promise.all([...elements].map(el => this._walk(el)));
        document.dispatchEvent(new CustomEvent('components-ready'));
    }

    /**
     * Register a component definition directly
     * @param {string} name
     * @param {string|Element} htmlOrElement
     */
    register(name, htmlOrElement) {
        if (!name) return;
        if (typeof htmlOrElement === 'string') {
            this._registerHTML(htmlOrElement);
        } else if (htmlOrElement instanceof Element) {
            this._registerNode(htmlOrElement, name);
        }
    }

    /**
     * Get a registered component by name
     * @param {string} name
     */
    get(name) {
        return this._registry ? this._registry[name] : null;
    }

    destroy() {
        Component._instance = null;
        if (typeof window !== 'undefined') {
            window.__componentInstance = null;
        }
        this._ctx = null;
        this._registry = null;
        this._fetching = null;
        this._tplCache = null;
    }

    /* ---------- Private Core ---------- */

    /* Depth-first walk with cycle detection + context inheritance */
    async _walk(el, seen = new Set(), parentCtx = this._ctx) {
        if (!el || !el.getAttribute) return;
        const name = el.getAttribute('name');
        const src = el.getAttribute('src');

        try {
            if (src) await this._load(src);
            if (!name) return;

            if (seen.has(name)) {
                const chain = [...seen, name].join(' → ');
                throw new Error(`Circular reference: ${chain}`);
            }

            const tpl = this._registry[name];
            if (!tpl) {
                return this._die(el, `component '${name}' not found`);
            }

            /* Build instance and swap into DOM */
            const { node: instance, ctx: instanceCtx } = await this._instantiate(tpl, el, parentCtx);
            el.replaceWith(instance);

            /* Process nested components inside the new instance */
            const next = new Set(seen).add(name);
            const nested = instance.querySelectorAll ? instance.querySelectorAll('component') : [];
            await Promise.all([...nested].map(c => this._walk(c, next, instanceCtx)));

            if (typeof document !== 'undefined') {
                document.dispatchEvent(new CustomEvent('component-loaded', { detail: { name, element: instance } }));
            }
        } catch (err) {
            this._die(el, err.message);
            if (typeof document !== 'undefined') {
                document.dispatchEvent(new CustomEvent('component-error', { detail: { name, error: err } }));
            }
        }
    }

    /* Fetch + register once per src URL */
    async _load(src) {
        if (this._fetching.has(src)) return this._fetching.get(src);

        const job = fetch(src)
            .then(r => (r.ok ? r.text() : Promise.reject(new Error(`${r.status} @ ${src}`))))
            .then(html => this._registerHTML(html))
            .catch(err => {
                this._fetching.delete(src);
                throw err;
            });

        this._fetching.set(src, job);
        return job;
    }

    /* Register single DOM node template */
    _registerNode(node, explicitName) {
        const name = explicitName || node.getAttribute('component')?.trim();
        if (!name) return;

        let rootNode;
        if (node.tagName === 'TEMPLATE') {
            const content = node.content;
            if (content && content.firstElementChild) {
                rootNode = content.firstElementChild.cloneNode(true);
            } else {
                const temp = document.createElement('div');
                temp.innerHTML = node.innerHTML;
                rootNode = temp.firstElementChild || temp;
            }
            // Copy user attributes from <template> onto rootNode if missing
            for (const attr of node.attributes) {
                if (attr.name !== 'component' && !rootNode.hasAttribute(attr.name)) {
                    rootNode.setAttribute(attr.name, attr.value);
                }
            }
        } else {
            rootNode = node.cloneNode(true);
        }

        if (rootNode.hasAttribute('dynamic') || node.hasAttribute('dynamic')) {
            rootNode._raw = this._preprocess(rootNode.innerHTML);
            rootNode.setAttribute('dynamic', '');
        }

        this._registry[name] = rootNode;
    }

    /* Parse HTML string into component templates */
    _registerHTML(html) {
        if (typeof DOMParser === 'undefined') return;
        const doc = new DOMParser().parseFromString(html, 'text/html');
        doc.querySelectorAll('[component]').forEach(node => {
            this._registerNode(node);
        });
    }

    /* Produce real DOM from template */
    async _instantiate(tpl, placeholder, parentCtx) {
        const node = tpl.cloneNode(true);
        this._copyAttrs(placeholder, node);
        let ctx = parentCtx;

        if (tpl._raw) {
            try {
                ctx = this._buildCtx(tpl, placeholder, parentCtx);
                node.innerHTML = this._render(tpl._raw, ctx);
            } catch (e) {
                this._die(node, `Render error: ${e.message}`);
            }
            node.removeAttribute('dynamic');
            node.removeAttribute('prop');
        }

        this._resolveSlots(node, placeholder);

        return { node, ctx };
    }

    /* Standard slot composition (<slot name="..."> and default <slot>) */
    _resolveSlots(node, placeholder) {
        if (typeof document === 'undefined') return;

        const namedSlots = new Map();
        const defaultNodes = [];

        const tempContainer = document.createElement('div');
        tempContainer.innerHTML = placeholder.innerHTML;

        Array.from(tempContainer.childNodes).forEach(child => {
            if (child.nodeType === 1 && child.hasAttribute('slot')) {
                const slotName = child.getAttribute('slot');
                child.removeAttribute('slot');
                if (!namedSlots.has(slotName)) namedSlots.set(slotName, []);
                namedSlots.get(slotName).push(child);
            } else {
                defaultNodes.push(child);
            }
        });

        const hasDefaultContent = defaultNodes.some(n =>
            n.nodeType === 1 || (n.textContent && n.textContent.trim().length > 0)
        );

        // 1. Named slots: <slot name="..."> or <content name="...">
        node.querySelectorAll('slot[name], content[name]').forEach(slotEl => {
            const name = slotEl.getAttribute('name');
            const provided = namedSlots.get(name);
            if (provided && provided.length > 0) {
                const frag = document.createDocumentFragment();
                provided.forEach(p => frag.appendChild(p));
                slotEl.replaceWith(frag);
            } else {
                // Keep fallback children of slot or remove empty slot
                const fallback = document.createDocumentFragment();
                while (slotEl.firstChild) fallback.appendChild(slotEl.firstChild);
                slotEl.replaceWith(fallback);
            }
        });

        // 2. Default slots: <slot> (without name) or <content>
        node.querySelectorAll('slot:not([name]), content:not([name])').forEach(slotEl => {
            if (hasDefaultContent) {
                const frag = document.createDocumentFragment();
                defaultNodes.forEach(n => frag.appendChild(n.cloneNode(true)));
                slotEl.replaceWith(frag);
            } else {
                const fallback = document.createDocumentFragment();
                while (slotEl.firstChild) fallback.appendChild(slotEl.firstChild);
                slotEl.replaceWith(fallback);
            }
        });
    }

    /* Merge parent context + prop expression */
    _buildCtx(tpl, ph, parentCtx) {
        const ctx = { ...parentCtx };
        ctx.$content = ph.innerHTML.trim();

        const expr = ph.getAttribute('prop');
        if (!expr) return ctx;

        const values = this._eval(expr, ctx);
        const keys = tpl.getAttribute('prop')?.replace(/[()]/g, '').split(',').map(s => s.trim()).filter(Boolean) ?? [];

        if (keys.length) {
            keys.forEach((k, i) => { ctx[k] = values[i]; });
        } else if (values.length === 1 && typeof values[0] === 'object' && values[0] !== null && !Array.isArray(values[0])) {
            Object.assign(ctx, values[0]);
        }
        return ctx;
    }

    /* Safe Function evaluation with sanitized context keys */
    _eval(expr, ctx) {
        const keys = Object.keys(ctx).filter(k => /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(k));
        try {
            const fn = new Function(...keys, `return [${expr.trim()}];`);
            return fn(...keys.map(k => ctx[k]));
        } catch (e) {
            console.warn(`[CM] Bad prop expression “${expr}”`, e);
            return [];
        }
    }

    /* Deterministic cached template engine */
    _render(raw, ctx) {
        // Strictly sort valid context keys to ensure deterministic parameter binding
        const validKeys = Object.keys(ctx).filter(k => /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(k)).sort();
        const key = raw + '|' + validKeys.join(',');

        let fn = this._tplCache.get(key);
        if (!fn) {
            fn = new Function(...validKeys, `return \`${raw}\`;`);
            this._tplCache.set(key, fn);
        }
        return fn(...validKeys.map(k => ctx[k]));
    }

    /* Intelligent attribute copying (merges classes and styles) */
    _copyAttrs(src, dst) {
        if (!src.attributes || !dst.setAttribute) return;

        for (const attr of src.attributes) {
            if (['name', 'src', 'prop', 'dynamic'].includes(attr.name)) continue;

            if (attr.name === 'class') {
                const existing = dst.getAttribute('class') || '';
                const incoming = attr.value || '';
                const merged = Array.from(new Set(`${existing} ${incoming}`.trim().split(/\s+/)))
                    .filter(Boolean)
                    .join(' ');
                if (merged) dst.setAttribute('class', merged);
            } else if (attr.name === 'style') {
                const existing = (dst.getAttribute('style') || '').trim();
                const incoming = attr.value.trim();
                const sep = existing && !existing.endsWith(';') ? '; ' : ' ';
                dst.setAttribute('style', existing ? `${existing}${sep}${incoming}` : incoming);
            } else {
                dst.setAttribute(attr.name, attr.value);
            }
        }
    }

    /* Strip <template> tags + handle ${…} with balanced braces & HTML entity decoding */
    _preprocess(html) {
        const out = [];
        let i = 0;
        const s = html.replace(/<\/?template[^>]*>/g, '');

        while (i < s.length) {
            const open = s.indexOf('${', i);
            if (open === -1) {
                out.push(s.slice(i).replace(/\\/g, '\\\\').replace(/`/g, '\\`'));
                break;
            }
            out.push(s.slice(i, open).replace(/\\/g, '\\\\').replace(/`/g, '\\`'));
            let depth = 1;
            let cur = open + 2;
            let inStr = null;

            while (cur < s.length && depth) {
                const ch = s[cur];
                if (inStr) {
                    if (ch === inStr && s[cur - 1] !== '\\') inStr = null;
                } else {
                    if (ch === '"' || ch === "'" || ch === '`') inStr = ch;
                    else if (ch === '{') ++depth;
                    else if (ch === '}') --depth;
                }
                ++cur;
            }

            if (!depth) {
                const expr = s.slice(open + 2, cur - 1)
                    .replace(/&lt;/g, '<')
                    .replace(/&gt;/g, '>')
                    .replace(/&amp;/g, '&')
                    .replace(/&quot;/g, '"')
                    .replace(/&#39;/g, "'");
                out.push('${' + expr + '}');
                i = cur;
            } else {
                console.warn('[CM] Unclosed interpolation in template');
                out.push(s.slice(open).replace(/\\/g, '\\\\').replace(/`/g, '\\`'));
                i = s.length;
            }
        }
        return out.join('');
    }

    /* Visual error in DOM + console */
    _die(node, msg) {
        console.error('[CM] ' + msg);
        if (this._debug && node) {
            node.innerHTML = `<span class="cm-error" style="color: #ef4444; font-family: monospace; font-size: 0.85em; background: rgba(239,68,68,0.1); padding: 2px 6px; border-radius: 4px;">[CM Error: ${msg}]</span>`;
        }
    }
}

export { Component };
export default Component;

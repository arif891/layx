/*********************************************************************
Component Manager - A simple web component system for quick prototyping
*********************************************************************/

/* WARNING: Don't use in production, can be used in development stage for quick prototyping */

class Component {
    constructor(dataContext = {}, options = {}) {
        if (window.__componentInstance) {
            console.warn('ComponentManager already initialized');
            return window.__componentInstance;
        }
        this.options = {
            debug: true,
            ...options
        }
        // static helpers available in templates
        this._helpers = {
            renderList: (items, cb) => items?.map(cb).join('') ?? '',
            when: (cond, html, otherwise = '') => cond ? html : otherwise,
            esc: (str) => String(str).replace(/[&<>"']/g, s => ({
                '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
            })[s]),
        };

        this._ctx = { ...this._helpers, ...dataContext };
        this._debug = this.options.debug;
        this._registry = Object.create(null);
        this._fetching = new Map();
        this._tplCache = new Map();

        window.__componentInstance = this;
        this.ready = this.init();
    }

    /* ---------- public ---------- */

    async init() {
        const roots = document.querySelectorAll('component');
        await Promise.all([...roots].map(el => this._walk(el)));
        document.dispatchEvent(new CustomEvent('components-ready'));
    }

    destroy() {
        window.__componentInstance = null;
        this._ctx = null;
        this._registry = null;
        this._fetching = null;
        this._tplCache = null;
    }

    /* ---------- private ---------- */


    /* depth-first walk with cycle detection + context inheritance */
    async _walk(el, seen = new Set(), parentCtx = this._ctx) {
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
            if (!tpl) return this._die(el, `component '${name}' not found`);

            /* build instance and swap into DOM */
            const { node: instance, ctx: instanceCtx } = await this._instantiate(tpl, el, parentCtx);
            el.replaceWith(instance);

            /* process nested components in the new instance */
            const next = new Set(seen).add(name);
            await Promise.all([...instance.querySelectorAll('component')]
                .map(c => this._walk(c, next, instanceCtx)));

            document.dispatchEvent(new CustomEvent('component-loaded', { detail: { name } }));
        } catch (err) {
            this._die(el, err.message);
            document.dispatchEvent(new CustomEvent('component-error', { detail: { name, error: err } }));
        }
    }

    /* fetch + register once per src */
    async _load(src) {
        if (this._fetching.has(src)) return this._fetching.get(src);

        const job = fetch(src)
            .then(r => r.ok ? r.text() : Promise.reject(new Error(`${r.status} @ ${src}`)))
            .then(html => this._registerHTML(html))
            .catch(err => { this._fetching.delete(src); throw err; });

        this._fetching.set(src, job);
        return job;
    }

    /* parse <div component="…"> or any tag with component */
    _registerHTML(html) {
        const doc = new DOMParser().parseFromString(html, 'text/html');
        doc.querySelectorAll('[component]').forEach(node => {
            const name = node.getAttribute('component')?.trim();
            if (!name) return;
            if (this._registry[name]) console.warn(`[CM] redefining component '${name}'`);
            const clone = node.cloneNode(true);
            if (clone.hasAttribute('dynamic')) {
                clone._raw = this._preprocess(clone.innerHTML);
            }
            this._registry[name] = clone;
        });
    }

    /* produce real DOM from template */
    async _instantiate(tpl, placeholder, parentCtx) {
        const node = tpl.cloneNode(true);
        this._copyAttrs(placeholder, node);
        let ctx = parentCtx;

        if (tpl._raw) {                 // dynamic template
            try {
                ctx = this._buildCtx(tpl, placeholder, parentCtx);
                node.innerHTML = this._render(tpl._raw, ctx);
            } catch (e) {
                this._die(node, `Render error: ${e.message}`);
            }
            node.removeAttribute('dynamic');
            node.removeAttribute('prop');
        }
        return { node, ctx };
    }

    /* merge parent context + prop expression */
    _buildCtx(tpl, ph, parentCtx) {
        const ctx = { ...parentCtx };

        // 2. Data prop (rich types via evaluation)
        const expr = ph.getAttribute('prop');
        if (!expr) return ctx;

        const values = this._eval(expr, ctx);
        const keys = tpl.getAttribute('prop')?.replace(/[()]/g, '').split(',').map(s => s.trim()).filter(Boolean) ?? [];

        if (keys.length) {                       // positional: prop="a,b"
            keys.forEach((k, i) => ctx[k] = values[i]);
        } else if (values.length === 1 && typeof values[0] === 'object' && values[0]) {
            Object.assign(ctx, values[0]);         // object spread: prop="{…}"
        }
        return ctx;
    }

    /* safer Function constructor – only expose allowed keys */
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

    /* tiny template engine – cached */
    _render(raw, ctx) {
        const key = raw + '|' + Object.keys(ctx).sort().join(',');
        let fn = this._tplCache.get(key);
        if (!fn) {
            fn = new Function(...Object.keys(ctx), `return \`${raw}\`;`);
            this._tplCache.set(key, fn);
        }
        return fn(...Object.values(ctx));
    }

    /* copy user attributes except internals */
    _copyAttrs(src, dst) {
        [...src.attributes]
            .filter(a => !['name', 'src'].includes(a.name))
            .forEach(a => dst.setAttribute(a.name, a.value));
    }

    /* strip <template> tags + handle ${…} with balanced braces */
    _preprocess(html) {
        let out = [], i = 0, s = html.replace(/<\/?template[^>]*>/g, '');

        while (i < s.length) {
            const open = s.indexOf('${', i);
            if (open === -1) {                                 // plain text
                out.push(s.slice(i).replace(/`/g, '\\`'));
                break;
            }
            out.push(s.slice(i, open).replace(/`/g, '\\`'));    // text before
            let depth = 1, cur = open + 2, inStr = null;

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
            if (!depth) {                                      // balanced
                const expr = s.slice(open + 2, cur - 1)
                    .replace(/&lt;/g, '<')
                    .replace(/&gt;/g, '>')
                    .replace(/&amp;/g, '&');
                out.push('${' + expr + '}');
                i = cur;
            } else {                                           // unclosed
                console.warn('[CM] Unclosed interpolation');
                out.push(s.slice(open).replace(/`/g, '\\`'));
                i = s.length;
            }
        }
        return out.join('');
    }

    /* visual error in DOM + console */
    _die(node, msg) {
        console.error('[CM] ' + msg);
        if (this._debug) node.innerHTML = `<span class="cm-error">${msg}</span>`;
    }
}

export default Component;
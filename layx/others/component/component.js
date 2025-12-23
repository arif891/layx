/*********************************************************************
Component Manager - A simple web component system for quick prototyping
*********************************************************************/

/* WARNING: Don't use in production, can be used in development stage for quick prototyping */

class Component {
    constructor(dataContext = {}, debug = true) {
        this._components = Object.create(null);
        this._fetchCache = new Map();
        this._tplCache = new Map();
        this._dataCtx = dataContext;
        this._debug = debug;

        if (window.__componentInstance) {
            console.warn('Component Manager already initialized'); return
        }

        this.init();
        window.__componentInstance = this;
    }

    async init() {
        const roots = document.querySelectorAll('component');
        await Promise.all([...roots].map(el => this._processComponent(el)));
    }

    /* --------------------------------------------------------------- */
    async _processComponent(el) {
        const name = el.getAttribute('name');
        const src = el.getAttribute('src');
        try {
            if (src) await this._loadSource(src);
            if (!name) return;

            const def = this._components[name];
            if (!def) {
                const msg = `ComponentManager: component '${name}' not found`;
                return this._showError(el, msg);
            }

            const nestedInDef = [...def.querySelectorAll('component')];
            await Promise.all(nestedInDef.map(c => this._processComponent(c)));

            const frag = await this._instantiate(def, el);
            el.replaceWith(frag);
        } catch (e) {
            this._showError(el, `ComponentManager: ${e.message}`);
        }
    }

    async _loadSource(src) {
        if (this._fetchCache.has(src)) return this._fetchCache.get(src);
        const job = fetch(src)
            .then(r => {
                if (!r.ok) throw new Error(`${r.status} while fetching ${src}`);
                return r.text();
            })
            .then(html => this._registerFromHTML(html))
            .catch(err => {
                this._fetchCache.delete(src);
                throw err;
            });
        this._fetchCache.set(src, job);
        return job;
    }

    _registerFromHTML(html) {
        const doc = new DOMParser().parseFromString(html, 'text/html');
        doc.querySelectorAll('[data-component]').forEach(node => {
            const name = node.dataset.component;
            if (!name) return;
            if (this._components[name]) { console.warn(`ComponentManager: component '${name}' redefined`) };
            const tpl = node.cloneNode(true);
            if (tpl.hasAttribute('dynamic')) {
                tpl._rawTemplate = this._preprocess(tpl.innerHTML);
            }
            this._components[name] = tpl;
        });
    }

    async _instantiate(def, placeholder) {
        const frag = document.createDocumentFragment();
        const node = def.cloneNode(true);
        this._copyAttrs(placeholder, node);

        if (def._rawTemplate) {
            try {
                const ctx = this._buildContext(def, placeholder);
                node.innerHTML = this._render(def._rawTemplate, ctx);
            } catch (e) {
                this._showError(node, `Render error: ${e.message}`);
            }
            node.removeAttribute('dynamic');
            node.removeAttribute('prop');
        }
        frag.appendChild(node);
        return frag;
    }

    _buildContext(def, placeholder) {
        const base = { ...this._dataCtx };
        const expr = placeholder.getAttribute('prop');
        if (!expr) return base;
        const values = this._evaluate(expr, base);
        const keys = def.getAttribute('prop')?.replace(/[()]/g, '').split(',').map(s => s.trim()).filter(Boolean) ?? [];
        if (keys.length) {
            keys.forEach((k, i) => base[k] = values[i]);
        } else if (values.length === 1 && typeof values[0] === 'object' && values[0]) {
            Object.assign(base, values[0]);
        }
        return base;
    }

    _evaluate(expr, ctx) {
        const keys = Object.keys(ctx).filter(k => /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(k));
        try {
            const fn = new Function(...keys, `return [${expr.trim()}];`);
            return fn(...keys.map(k => ctx[k]));
        } catch (e) {
            console.warn(`Bad prop expression “${expr}”`, e);
            return [];
        }
    }

    _render(tpl, ctx) {
        const key = tpl + '|' + Object.keys(ctx).sort().join(',');
        let fn = this._tplCache.get(key);
        if (!fn) {
            fn = new Function(...Object.keys(ctx), `return \`${tpl}\`;`);
            this._tplCache.set(key, fn);
        }
        return fn(...Object.values(ctx));
    }

    _copyAttrs(src, dst) {
        [...src.attributes]
            .filter(a => !['name', 'src'].includes(a.name))
            .forEach(a => dst.setAttribute(a.name, a.value));
    }

    _preprocess(html) {
        return html
            .replace(/\${([^}]+)}/g, (_, exp) =>
                `\${${exp.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')}}`)
            .replace(/`/g, '\\`');
    }

    _showError(node, msg) {
        console.error(msg);
        if (this._debug) node.innerHTML = `<span class="cm-error">${msg}</span>`;
    }
}

export default new Component();
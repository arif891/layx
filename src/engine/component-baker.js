import path from 'node:path';
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { removeComponentScriptEntries } from './component-unwrapper.js';

export {
    bakeComponentsInHtml,
    bakeComponentsInFile,
    HtmlNode,
    parseHtml,
    serializeNode,
    serializeChildren
};

const VOID_ELEMENTS = new Set([
    'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'
]);

/**
 * Lightweight HTML DOM Node for static component baking without external dependencies.
 */
class HtmlNode {
    constructor(type, tagName = '', attrs = {}) {
        this.type = type; // 'element' | 'text' | 'comment' | 'doctype'
        this.tagName = tagName ? tagName.toLowerCase() : '';
        this.attrs = { ...attrs };
        this.children = [];
        this.parent = null;
        this.textContent = '';
    }

    getAttribute(name) {
        if (!name) return null;
        const key = name.toLowerCase();
        return Object.prototype.hasOwnProperty.call(this.attrs, key) ? this.attrs[key] : null;
    }

    setAttribute(name, value) {
        if (!name) return;
        this.attrs[name.toLowerCase()] = String(value);
    }

    hasAttribute(name) {
        if (!name) return false;
        return Object.prototype.hasOwnProperty.call(this.attrs, name.toLowerCase());
    }

    removeAttribute(name) {
        if (!name) return;
        delete this.attrs[name.toLowerCase()];
    }

    appendChild(child) {
        if (!child) return;
        child.parent = this;
        this.children.push(child);
    }

    replaceWith(...newNodes) {
        if (!this.parent) return;
        const siblings = this.parent.children;
        const idx = siblings.indexOf(this);
        if (idx === -1) return;

        const flattened = [];
        for (const n of newNodes) {
            if (!n) continue;
            if (n.type === 'fragment') {
                flattened.push(...n.children);
            } else {
                flattened.push(n);
            }
        }

        for (const n of flattened) {
            n.parent = this.parent;
        }

        siblings.splice(idx, 1, ...flattened);
        this.parent = null;
    }

    cloneNode(deep = true) {
        const clone = new HtmlNode(this.type, this.tagName, { ...this.attrs });
        clone.textContent = this.textContent;
        if (deep) {
            for (const child of this.children) {
                const childClone = child.cloneNode(true);
                clone.appendChild(childClone);
            }
        }
        return clone;
    }

    querySelectorAll(predicate) {
        const results = [];
        for (const child of this.children) {
            if (child.type === 'element') {
                if (predicate(child)) {
                    results.push(child);
                }
                results.push(...child.querySelectorAll(predicate));
            }
        }
        return results;
    }

    get innerHTML() {
        return serializeChildren(this);
    }

    set innerHTML(html) {
        this.children = [];
        const parsed = parseHtml(html);
        for (const child of parsed.children) {
            this.appendChild(child);
        }
    }

    get outerHTML() {
        return serializeNode(this);
    }
}

/**
 * Parses an HTML string into an HtmlNode tree.
 */
function parseHtml(html) {
    const root = new HtmlNode('element', 'root');
    const stack = [root];
    let i = 0;
    const len = html.length;

    while (i < len) {
        const current = stack[stack.length - 1];

        // Handle raw text containers (<script>, <style>)
        if (current && (current.tagName === 'script' || current.tagName === 'style')) {
            const closeTag = `</${current.tagName}>`;
            const closeIndex = html.toLowerCase().indexOf(closeTag, i);
            if (closeIndex === -1) {
                const textNode = new HtmlNode('text');
                textNode.textContent = html.slice(i);
                current.appendChild(textNode);
                break;
            } else {
                const textNode = new HtmlNode('text');
                textNode.textContent = html.slice(i, closeIndex);
                current.appendChild(textNode);
                stack.pop();
                i = closeIndex + closeTag.length;
                continue;
            }
        }

        // HTML Comment
        if (html.startsWith('<!--', i)) {
            const endIndex = html.indexOf('-->', i + 4);
            const commentText = endIndex !== -1 ? html.slice(i + 4, endIndex) : html.slice(i + 4);
            const commentNode = new HtmlNode('comment');
            commentNode.textContent = commentText;
            current.appendChild(commentNode);
            i = endIndex !== -1 ? endIndex + 3 : len;
            continue;
        }

        // DOCTYPE or declaration
        if (html.startsWith('<!', i)) {
            const endIndex = html.indexOf('>', i + 2);
            const doctypeText = endIndex !== -1 ? html.slice(i, endIndex + 1) : html.slice(i);
            const doctypeNode = new HtmlNode('doctype');
            doctypeNode.textContent = doctypeText;
            current.appendChild(doctypeNode);
            i = endIndex !== -1 ? endIndex + 1 : len;
            continue;
        }

        // Tag
        if (html[i] === '<') {
            // Closing tag
            if (html[i + 1] === '/') {
                const closeEnd = html.indexOf('>', i + 2);
                if (closeEnd !== -1) {
                    const tagContent = html.slice(i + 2, closeEnd).trim().toLowerCase();
                    const tagName = tagContent.split(/\s+/)[0];
                    for (let s = stack.length - 1; s > 0; s--) {
                        if (stack[s].tagName === tagName) {
                            stack.length = s;
                            break;
                        }
                    }
                    i = closeEnd + 1;
                    continue;
                }
            }

            // Opening or self-closing tag
            const tagMatch = html.slice(i).match(/^<([a-zA-Z0-9_-]+)/);
            if (tagMatch) {
                const tagName = tagMatch[1].toLowerCase();
                let cursor = i + tagMatch[0].length;
                const attrs = {};
                let isSelfClosing = false;

                while (cursor < len) {
                    while (cursor < len && /\s/.test(html[cursor])) cursor++;
                    if (cursor >= len) break;

                    if (html[cursor] === '>') {
                        cursor++;
                        break;
                    }
                    if (html[cursor] === '/' && html[cursor + 1] === '>') {
                        isSelfClosing = true;
                        cursor += 2;
                        break;
                    }

                    const attrNameMatch = html.slice(cursor).match(/^([^\s=>/]+)/);
                    if (!attrNameMatch) {
                        cursor++;
                        continue;
                    }

                    const attrName = attrNameMatch[1];
                    cursor += attrName.length;

                    while (cursor < len && /\s/.test(html[cursor])) cursor++;

                    let attrVal = '';
                    if (cursor < len && html[cursor] === '=') {
                        cursor++;
                        while (cursor < len && /\s/.test(html[cursor])) cursor++;

                        if (cursor < len && (html[cursor] === '"' || html[cursor] === "'")) {
                            const quote = html[cursor];
                            cursor++;
                            const valStart = cursor;
                            while (cursor < len && html[cursor] !== quote) {
                                cursor++;
                            }
                            attrVal = html.slice(valStart, cursor);
                            if (cursor < len && html[cursor] === quote) {
                                cursor++;
                            }
                        } else {
                            const valMatch = html.slice(cursor).match(/^([^\s>]+)/);
                            if (valMatch) {
                                attrVal = valMatch[1];
                                cursor += attrVal.length;
                            }
                        }
                    }

                    attrs[attrName.toLowerCase()] = attrVal;
                }

                const elementNode = new HtmlNode('element', tagName, attrs);
                current.appendChild(elementNode);

                const isVoid = VOID_ELEMENTS.has(tagName);
                if (!isVoid && !isSelfClosing) {
                    stack.push(elementNode);
                }
                i = cursor;
                continue;
            }
        }

        // Text node
        const nextTagIndex = html.indexOf('<', i);
        const textContent = nextTagIndex !== -1 ? html.slice(i, nextTagIndex) : html.slice(i);
        const textNode = new HtmlNode('text');
        textNode.textContent = textContent;
        current.appendChild(textNode);
        i = nextTagIndex !== -1 ? nextTagIndex : len;
    }

    return root;
}

/**
 * Serializes an HtmlNode back to an HTML string.
 */
function serializeNode(node) {
    if (!node) return '';
    if (node.type === 'text') {
        return node.textContent;
    }
    if (node.type === 'comment') {
        return `<!--${node.textContent}-->`;
    }
    if (node.type === 'doctype') {
        return node.textContent;
    }
    if (node.type === 'element') {
        if (node.tagName === 'root') {
            return serializeChildren(node);
        }

        let attrStr = '';
        for (const [k, v] of Object.entries(node.attrs)) {
            if (v === '' && !['value', 'placeholder', 'alt', 'title'].includes(k)) {
                attrStr += ` ${k}`;
            } else {
                attrStr += ` ${k}="${String(v).replace(/"/g, '&quot;')}"`;
            }
        }

        if (VOID_ELEMENTS.has(node.tagName)) {
            return `<${node.tagName}${attrStr}>`;
        }

        const inner = serializeChildren(node);
        return `<${node.tagName}${attrStr}>${inner}</${node.tagName}>`;
    }
    return '';
}

function serializeChildren(node) {
    return node.children.map(serializeNode).join('');
}

/**
 * Default template helpers matching Component engine.
 */
const DEFAULT_HELPERS = {
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
                const nested = DEFAULT_HELPERS.cls(...arg);
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

/**
 * Strip <template> tags + handle ${...} with balanced braces & HTML entity decoding.
 */
function preprocessTemplate(html) {
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
            console.warn('[ComponentBaker] Unclosed interpolation in template');
            out.push(s.slice(open).replace(/\\/g, '\\\\').replace(/`/g, '\\`'));
            i = s.length;
        }
    }
    return out.join('');
}

/**
 * Evaluates template expressions against context safely using a Proxy.
 */
function renderTemplate(raw, ctx) {
    try {
        const proxy = new Proxy(ctx, {
            has() { return true; },
            get(target, key) {
                if (key === Symbol.unscopables) return undefined;
                return target[key] !== undefined ? target[key] : '';
            }
        });
        const fn = new Function('ctx', `with (ctx) { return \`${raw}\`; }`);
        return fn(proxy);
    } catch (e) {
        console.warn(`[ComponentBaker] Template render error: ${e.message}`);
        return raw;
    }
}

/**
 * Evaluates a prop expression string against context.
 */
function evalPropExpr(expr, ctx) {
    try {
        const proxy = new Proxy(ctx, {
            has() { return true; },
            get(target, key) {
                if (key === Symbol.unscopables) return undefined;
                return target[key];
            }
        });
        const fn = new Function('ctx', `with (ctx) { return [${expr.trim()}]; }`);
        return fn(proxy);
    } catch (e) {
        console.warn(`[ComponentBaker] Bad prop expression "${expr}": ${e.message}`);
        return [];
    }
}

/**
 * Copies attributes from placeholder to template root node (merging classes and styles).
 */
function copyAttrs(srcNode, dstNode) {
    if (!srcNode.attrs || !dstNode.attrs) return;

    for (const [name, value] of Object.entries(srcNode.attrs)) {
        if (['name', 'src', 'prop', 'dynamic', 'component'].includes(name)) continue;

        if (name === 'class') {
            const existing = dstNode.getAttribute('class') || '';
            const incoming = value || '';
            const merged = Array.from(new Set(`${existing} ${incoming}`.trim().split(/\s+/)))
                .filter(Boolean)
                .join(' ');
            if (merged) dstNode.setAttribute('class', merged);
        } else if (name === 'style') {
            const existing = (dstNode.getAttribute('style') || '').trim();
            const incoming = (value || '').trim();
            const sep = existing && !existing.endsWith(';') ? '; ' : ' ';
            dstNode.setAttribute('style', existing ? `${existing}${sep}${incoming}` : incoming);
        } else {
            dstNode.setAttribute(name, value);
        }
    }
}

/**
 * Resolves standard slots (<slot name="..."> and default <slot>).
 */
function resolveSlots(instanceNode, placeholderNode) {
    const namedSlots = new Map();
    const defaultNodes = [];

    for (const child of placeholderNode.children) {
        if (child.type === 'element' && child.hasAttribute('slot')) {
            const slotName = child.getAttribute('slot');
            const clone = child.cloneNode(true);
            clone.removeAttribute('slot');
            if (!namedSlots.has(slotName)) namedSlots.set(slotName, []);
            namedSlots.get(slotName).push(clone);
        } else if (
            child.type === 'element' ||
            (child.type === 'text' && child.textContent.trim().length > 0)
        ) {
            defaultNodes.push(child.cloneNode(true));
        }
    }

    const hasDefaultContent = defaultNodes.length > 0;

    // 1. Named slots: <slot name="..."> or <content name="...">
    const namedSlotElements = instanceNode.querySelectorAll(el =>
        (el.tagName === 'slot' || el.tagName === 'content') && el.hasAttribute('name')
    );

    for (const slotEl of namedSlotElements) {
        const name = slotEl.getAttribute('name');
        const provided = namedSlots.get(name);
        if (provided && provided.length > 0) {
            slotEl.replaceWith(...provided);
        } else {
            // Keep fallback children of slot or remove empty slot
            slotEl.replaceWith(...slotEl.children);
        }
    }

    // 2. Default slots: <slot:not([name])> or <content:not([name])>
    const defaultSlotElements = instanceNode.querySelectorAll(el =>
        (el.tagName === 'slot' || el.tagName === 'content') && !el.hasAttribute('name')
    );

    for (const slotEl of defaultSlotElements) {
        if (hasDefaultContent) {
            slotEl.replaceWith(...defaultNodes.map(n => n.cloneNode(true)));
        } else {
            // Keep fallback children of slot
            slotEl.replaceWith(...slotEl.children);
        }
    }
}

/**
 * Bakes all <component> elements in an HTML string statically into final HTML.
 *
 * @param {string} htmlContent - The input HTML
 * @param {string} currentFilePath - Path of the HTML file (for resolving relative `src="..."`)
 * @param {Object} [dataContext={}] - Global data context for expression evaluation
 * @param {string} [projectRoot=process.cwd()] - Project root directory
 * @returns {Promise<string>} Statically baked HTML
 */
async function bakeComponentsInHtml(htmlContent, currentFilePath = '', dataContext = {}, projectRoot = process.cwd()) {
    if (!htmlContent || typeof htmlContent !== 'string') return htmlContent;

    const baseDir = currentFilePath ? path.dirname(path.resolve(currentFilePath)) : projectRoot;
    const ast = parseHtml(htmlContent);

    // Global registry for this bake pass
    const registry = Object.create(null);
    const loadedFiles = new Set();

    // Helper to register components from an HtmlNode tree
    function registerFromAst(tree) {
        let count = 0;
        const compNodes = tree.querySelectorAll(node => node.hasAttribute('component'));
        for (const node of compNodes) {
            const compName = node.getAttribute('component')?.trim();
            if (!compName) continue;
            count++;

            let rootNode;
            if (node.tagName === 'template') {
                const elementChildren = node.children.filter(c => c.type === 'element');
                if (elementChildren.length > 0) {
                    rootNode = elementChildren[0].cloneNode(true);
                } else {
                    const temp = new HtmlNode('element', 'div');
                    for (const c of node.children) {
                        temp.appendChild(c.cloneNode(true));
                    }
                    rootNode = temp;
                }
                // Copy non-component attributes from <template> onto rootNode if missing
                for (const [k, v] of Object.entries(node.attrs)) {
                    if (k !== 'component' && !rootNode.hasAttribute(k)) {
                        rootNode.setAttribute(k, v);
                    }
                }
            } else {
                rootNode = node.cloneNode(true);
            }

            if (rootNode.hasAttribute('dynamic') || node.hasAttribute('dynamic')) {
                rootNode._raw = preprocessTemplate(rootNode.innerHTML);
                rootNode.setAttribute('dynamic', '');
            }

            registry[compName] = rootNode;
        }
        return count;
    }

    // 1. Register inline components present in the file itself
    registerFromAst(ast);

    // 2. Helper to load and register components from external file
    async function loadSrcFile(src, explicitName = null) {
        if (!src) return;
        let absPath;
        if (src.startsWith('/')) {
            absPath = path.join(projectRoot, src.slice(1));
            if (!existsSync(absPath)) {
                if (src.startsWith('/pages/')) {
                    const withoutPages = path.join(projectRoot, src.slice('/pages/'.length));
                    if (existsSync(withoutPages)) absPath = withoutPages;
                } else {
                    const withPages = path.join(projectRoot, 'pages', src.slice(1));
                    if (existsSync(withPages)) absPath = withPages;
                }
            }
        } else {
            absPath = path.resolve(baseDir, src);
            if (!existsSync(absPath)) {
                const rootRel = path.join(projectRoot, src);
                if (existsSync(rootRel)) absPath = rootRel;
            }
        }

        if (loadedFiles.has(absPath)) return;
        loadedFiles.add(absPath);

        if (existsSync(absPath)) {
            let content = await fs.readFile(absPath, 'utf8');
            content = content
                .replace(/<noscript\b[^>]*>[\s\S]*?<\/body>[\s\S]*?<\/noscript>/gi, '')
                .replace(/<noscript>\s*<\/body>\s*<\/html>\s*<\/noscript>/gi, '')
                .replace(/<!--\s*<\/body>\s*<\/html>\s*-->/gi, '')
                .trim();

            const fileAst = parseHtml(content);
            const registeredCount = registerFromAst(fileAst);

            // Standalone component file without explicit [component] attribute
            if (registeredCount === 0) {
                const baseName = path.basename(absPath, '.html');
                const compName = explicitName || baseName;

                const elementChildren = fileAst.children.filter(c => c.type === 'element');
                let rootNode;
                if (elementChildren.length === 1) {
                    rootNode = elementChildren[0].cloneNode(true);
                } else {
                    const temp = new HtmlNode('element', 'div');
                    for (const c of fileAst.children) {
                        temp.appendChild(c.cloneNode(true));
                    }
                    rootNode = temp;
                }

                if (content.includes('${') || rootNode.hasAttribute('dynamic')) {
                    rootNode._raw = preprocessTemplate(rootNode.innerHTML);
                    rootNode.setAttribute('dynamic', '');
                }

                registry[compName] = rootNode;
                if (explicitName && explicitName !== baseName) {
                    registry[baseName] = rootNode;
                }
            }
        } else {
            console.warn(`[ComponentBaker] Referenced component file not found: ${src} (${absPath})`);
        }
    }

    // 3. Walk and instantiate all <component> elements
    async function walkComponent(el, seen = new Set(), parentCtx = { ...DEFAULT_HELPERS, ...dataContext }) {
        let name = el.getAttribute('name');
        const src = el.getAttribute('src');

        if (!name && src) {
            const clean = src.split('?')[0].split('#')[0];
            name = path.basename(clean, '.html');
        }

        if (src) {
            await loadSrcFile(src, name);
        }

        if (!name) return;

        if (seen.has(name)) {
            const chain = [...seen, name].join(' -> ');
            throw new Error(`[ComponentBaker] Circular component reference detected: ${chain}`);
        }

        const tpl = registry[name];
        if (!tpl) {
            console.warn(`[ComponentBaker] Component "${name}" not found in registry.`);
            return;
        }

        // Instantiate
        const instance = tpl.cloneNode(true);
        copyAttrs(el, instance);
        let ctx = { ...parentCtx };

        ctx.$content = el.innerHTML.trim();

        const expr = el.getAttribute('prop');
        if (expr) {
            const values = evalPropExpr(expr, ctx);
            const keys = (tpl.getAttribute('prop') || '')
                .replace(/[()]/g, '')
                .split(',')
                .map(s => s.trim())
                .filter(Boolean);

            if (keys.length > 0) {
                keys.forEach((k, idx) => { ctx[k] = values[idx]; });
            } else if (values.length === 1 && typeof values[0] === 'object' && values[0] !== null && !Array.isArray(values[0])) {
                Object.assign(ctx, values[0]);
            } else if (values.length > 0) {
                // If single or multiple without explicit keys, also expose values array
                ctx.props = values;
            }
        }

        if (tpl._raw || instance.hasAttribute('dynamic')) {
            const raw = tpl._raw || preprocessTemplate(instance.innerHTML);
            const renderedHtml = renderTemplate(raw, ctx);
            instance.innerHTML = renderedHtml;
            instance.removeAttribute('dynamic');
            instance.removeAttribute('prop');
        }

        resolveSlots(instance, el);

        // Remove component definition marker attribute
        instance.removeAttribute('component');

        // Replace placeholder <component> with instantiated node
        el.replaceWith(instance);

        // Recursively walk any nested <component> elements inside the new instance
        const nextSeen = new Set(seen).add(name);
        const nestedComponents = instance.querySelectorAll(node => node.tagName === 'component');
        for (const nested of nestedComponents) {
            await walkComponent(nested, nextSeen, ctx);
        }
    }

    // Process top-level <component> elements in AST
    const components = ast.querySelectorAll(node => node.tagName === 'component');
    for (const comp of components) {
        await walkComponent(comp);
    }

    // 4. Remove all component definition elements (<template component="...">, <div component="...">) from final markup
    const inlineDefinitions = ast.querySelectorAll(node => node.hasAttribute('component'));
    for (const defNode of inlineDefinitions) {
        defNode.replaceWith();
    }

    // 5. Serialize back to HTML
    let outputHtml = serializeNode(ast);

    // 6. Remove component script tags and unwrap inline scripts
    outputHtml = removeComponentScriptEntries(outputHtml);

    return outputHtml;
}

/**
 * Bakes components in a specific file and writes the result to output path.
 */
async function bakeComponentsInFile(inputFilePath, outputFilePath, dataContext = {}, projectRoot = process.cwd()) {
    const content = await fs.readFile(inputFilePath, 'utf8');
    const baked = await bakeComponentsInHtml(content, inputFilePath, dataContext, projectRoot);
    await fs.mkdir(path.dirname(outputFilePath), { recursive: true });
    await fs.writeFile(outputFilePath, baked, 'utf8');
    return baked;
}

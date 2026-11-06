/*********************************************************************
 * SyntaxHighlighter – Pure Client-Side Syntax Highlighter for LayX
 * - Fast registry-free tokenizer based on speed-highlight/core
 * - Auto-detects programming languages & normalizes aliases
 * - Line numbers, header with language label & accessible copy button
 * - Functional and Class-based APIs matching speed-highlight & Layx conventions
 * - SSR & Node.js safe with zero runtime dependencies
 *********************************************************************/

import { tokenizer, tokenize as tokenizeCore, tokenizeSync, expandData } from './core/tokenize.js';
import { normalizeLang, detectLanguage, ALIASES } from './core/detect.js';
import { sanitize, renderLineNumbers, buildUI, copyToClipboard, bindCopyButton } from './core/dom.js';

/**
 * Default dynamic language loader
 * @param {string} name
 */
export const defaultLoader = (name) => import(`./languages/${normalizeLang(name)}.js`);

let customLoader = defaultLoader;
const languageCache = Object.create(null);

/**
 * Configure custom language loader
 * @param {Function} loaderFn
 */
export function setLoader(loaderFn) {
    customLoader = loaderFn;
}

/**
 * Tokenize source code with registered / dynamic languages
 * @param {string} src
 * @param {string|Object} lang
 * @param {Function} onToken
 */
export async function tokenize(src, lang, onToken) {
    const resolved = typeof lang === 'string' ? normalizeLang(lang) : lang;
    return tokenizeCore(src, resolved, onToken, async (name) => {
        const norm = normalizeLang(name);
        if (!languageCache[norm]) {
            languageCache[norm] = await customLoader(norm);
        }
        return languageCache[norm];
    });
}

/**
 * Highlight code string and return HTML
 * @param {string} src
 * @param {string|Object} [lang='plain']
 * @param {Object} [options]
 * @returns {Promise<string>}
 */
export async function highlightHTML(src, lang = 'plain', options = {}) {
    let targetLang = typeof lang === 'string' ? normalizeLang(lang) : lang;

    if (targetLang === 'auto' || !targetLang) {
        targetLang = detectLanguage(src);
    }

    let codeHtml = '';
    await tokenize(src, targetLang, (text, type) => {
        const safe = sanitize(text);
        codeHtml += type ? `<span class="${type}">${safe}</span>` : safe;
    });

    const isMultiline = options.multiline !== undefined
        ? Boolean(options.multiline)
        : src.includes('\n');

    return buildUI(codeHtml, typeof targetLang === 'string' ? targetLang : 'code', isMultiline, options);
}

/** Alias for highlightHTML */
export const highlightText = highlightHTML;

/**
 * Highlight a specific DOM element in-place
 * @param {HTMLElement} el
 * @param {string} [lang]
 * @param {Object} [options]
 */
export async function highlightElement(el, lang, options = {}) {
    if (!el || typeof el.getAttribute !== 'function') return;

    const rawCode = el.textContent || '';
    const trimmedCode = rawCode.trim();

    let targetLang = lang || el.dataset?.codeLang || el.dataset?.lang || resolveClassLang(el);
    if ((targetLang === 'auto' || !targetLang) && options.autoDetect !== false) {
        targetLang = detectLanguage(trimmedCode);
    }
    targetLang = normalizeLang(targetLang);

    const isMultiline = options.multiline !== undefined
        ? Boolean(options.multiline)
        : (options.block ?? (el.tagName !== 'CODE' && trimmedCode.includes('\n')));

    const mode = isMultiline ? 'multiline' : 'oneline';

    el.classList.add('code-block', targetLang, mode, 'highlighted');
    if (el.dataset) {
        el.dataset.codeLang = targetLang;
        el.dataset.lang = targetLang;
    }

    const html = await highlightHTML(trimmedCode, targetLang, { ...options, multiline: isMultiline });
    el.innerHTML = html;

    const btn = el.querySelector('.copy');
    const codeEl = el.querySelector('.code');
    if (btn && codeEl) {
        bindCopyButton(btn, codeEl);
    }
}

function resolveClassLang(el) {
    if (!el.className || typeof el.className !== 'string') return null;
    const match = el.className.match(/(?:shj-lang-|language-|lang-)([\w-]+)/);
    return match ? match[1] : null;
}

/**
 * Scan and highlight all matching code elements in document
 * @param {Object|string} [options]
 */
export async function highlightAll(options = {}) {
    if (typeof document === 'undefined') return [];

    const sel = typeof options === 'string'
        ? options
        : '[data-code-lang]:not(.highlighted), [data-lang]:not(.highlighted), pre:not(.highlighted) > code:not(.highlighted), pre.code-block:not(.highlighted), [class*="shj-lang-"]:not(.highlighted), [class*="language-"]:not(.highlighted)';

    const opts = typeof options === 'object' ? options : {};
    const elements = Array.from(document.querySelectorAll(sel));

    return Promise.all(elements.map(el => {
        const target = el.tagName === 'CODE' && el.parentElement?.tagName === 'PRE' ? el.parentElement : el;
        return highlightElement(target, undefined, opts);
    }));
}

/**
 * Terminal ANSI syntax highlighter
 * @param {string} src
 * @param {string|Object} lang
 * @param {Object} theme
 * @returns {Promise<string>}
 */
export async function highlightANSI(src, lang, theme = {}) {
    let res = '';
    await tokenize(src, lang, (text, token) => {
        res += token ? `${theme[token] ?? ''}${text}\x1b[0m` : text;
    });
    return res;
}

/**
 * SyntaxHighlighter Facade Class
 */
export class SyntaxHighlighter {
    static _instance = null;
    static detect = detectLanguage;
    static normalize = normalizeLang;
    static highlight = highlightHTML;
    static highlightText = highlightHTML;
    static highlightElement = highlightElement;
    static highlightAll = highlightAll;
    static highlightANSI = highlightANSI;
    static tokenize = tokenize;
    static setLoader = setLoader;
    static defaultLoader = defaultLoader;

    static getInstance() {
        if (!SyntaxHighlighter._instance) {
            SyntaxHighlighter._instance = new SyntaxHighlighter();
        }
        return SyntaxHighlighter._instance;
    }

    static register(name, grammar) {
        languageCache[normalizeLang(name)] = grammar;
        return SyntaxHighlighter;
    }

    constructor(options = {}) {
        if (SyntaxHighlighter._instance) {
            return SyntaxHighlighter._instance;
        }

        this._options = {
            lineNumbers: true,
            copyButton: true,
            header: true,
            autoDetect: true,
            ...options,
        };

        SyntaxHighlighter._instance = this;

        // Auto-run in browser when DOM is ready
        if (typeof window !== 'undefined' && typeof document !== 'undefined') {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => highlightAll(this._options), { once: true });
            } else {
                highlightAll(this._options);
            }
        }
    }

    async tokenize(src, lang, onToken) {
        return tokenize(src, lang, onToken);
    }

    async highlight(src, lang, options) {
        return highlightHTML(src, lang, { ...this._options, ...options });
    }

    async highlightText(src, lang, multiline = true, opt = {}) {
        return highlightHTML(src, lang, { ...this._options, multiline, ...opt });
    }

    async highlightElement(el, lang, mode, opt) {
        const isMulti = mode !== undefined ? mode === 'multiline' : undefined;
        return highlightElement(el, lang, { ...this._options, multiline: isMulti, ...opt });
    }

    async highlightAll(opt) {
        return highlightAll({ ...this._options, ...(typeof opt === 'object' ? opt : {}) });
    }

    loadLanguage(name, grammar) {
        languageCache[normalizeLang(name)] = grammar;
        return this;
    }

    async preLoadLanguages(...names) {
        await Promise.all(names.map(name => {
            const norm = normalizeLang(name);
            if (!languageCache[norm]) {
                return customLoader(norm).then(mod => { languageCache[norm] = mod; }).catch(() => {});
            }
        }));
        return this;
    }
}

export {
    tokenizer,
    tokenizeSync,
    detectLanguage,
    normalizeLang,
    sanitize,
    renderLineNumbers,
    buildUI,
    copyToClipboard,
    bindCopyButton,
    expandData,
    ALIASES,
};

export default SyntaxHighlighter;

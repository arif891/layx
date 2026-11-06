/*********************************************************************
 * SyntaxHighlighter – Pure Client-Side Syntax Highlighter for LayX
 * - Fast registry-free tokenizer based on speed-highlight/core
 * - Auto-detects programming languages & normalizes aliases
 * - Line numbers, header with language label & accessible copy button
 * - CSS layer-scoped theme with automatic light/dark mode adaptation
 * - SSR & Node.js safe with zero runtime dependencies
 *********************************************************************/

import { tokenize, tokenizeSync } from './core/tokenize.js';
import { normalizeLang, detectLanguage } from './core/detect.js';
import { sanitize, buildUI, bindCopyButton } from './core/dom.js';

class SyntaxHighlighter {
    static _instance = null;
    static detect = detectLanguage;
    static normalize = normalizeLang;

    static getInstance() {
        if (!SyntaxHighlighter._instance) {
            SyntaxHighlighter._instance = new SyntaxHighlighter();
        }
        return SyntaxHighlighter._instance;
    }

    /**
     * Highlight code string and return HTML
     * @param {string} src
     * @param {string|Object} [lang='plain']
     * @param {Object} [options]
     */
    static async highlight(src, lang, options) {
        return SyntaxHighlighter.getInstance().highlight(src, lang, options);
    }

    /**
     * Highlight a DOM element
     * @param {HTMLElement} el
     * @param {Object} [options]
     */
    static async highlightElement(el, options) {
        return SyntaxHighlighter.getInstance().highlightElement(el, options);
    }

    /**
     * Scan and highlight all matching code elements
     * @param {string} [selector]
     * @param {Object} [options]
     */
    static async highlightAll(selector, options) {
        return SyntaxHighlighter.getInstance().highlightAll(selector, options);
    }

    /**
     * Register a custom language definition
     * @param {string} name
     * @param {Object} grammar
     */
    static register(name, grammar) {
        return SyntaxHighlighter.getInstance().loadLanguage(name, grammar);
    }

    constructor(options = {}) {
        if (SyntaxHighlighter._instance) {
            return SyntaxHighlighter._instance;
        }

        this._langs = Object.create(null);
        this._options = {
            lineNumbers: true,
            copyButton: true,
            header: true,
            autoDetect: true,
            ...options,
        };

        SyntaxHighlighter._instance = this;

        // Auto-initialize when running in browser
        if (typeof window !== 'undefined' && typeof document !== 'undefined') {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this.highlightAll(), { once: true });
            } else {
                this.highlightAll();
            }
        }
    }

    /**
     * Tokenize source code with the requested language grammar
     * @param {string} src
     * @param {string|Object} lang
     * @param {Function} onToken
     */
    async tokenize(src, lang, onToken) {
        const resolvedName = typeof lang === 'string' ? normalizeLang(lang) : lang;
        return tokenize(src, resolvedName, onToken, async (name) => {
            const normalized = normalizeLang(name);
            if (!this._langs[normalized]) {
                this._langs[normalized] = await import(`./languages/${normalized}.js`);
            }
            return this._langs[normalized];
        });
    }

    /**
     * Tokenize code and return HTML string with wrapped spans
     * @param {string} src
     * @param {string|Object} [lang='plain']
     * @param {Object} [options]
     */
    async highlight(src, lang = 'plain', options = {}) {
        const opts = { ...this._options, ...options };
        let targetLang = typeof lang === 'string' ? normalizeLang(lang) : lang;

        // Run auto-detection if language is auto or missing
        if (targetLang === 'auto' || !targetLang) {
            targetLang = detectLanguage(src);
        }

        let codeHtml = '';
        await this.tokenize(src, targetLang, (text, type) => {
            const safeText = sanitize(text);
            codeHtml += type ? `<span class="${type}">${safeText}</span>` : safeText;
        });

        const isMultiline = opts.multiline !== undefined
            ? Boolean(opts.multiline)
            : src.includes('\n');

        return buildUI(codeHtml, typeof targetLang === 'string' ? targetLang : 'code', isMultiline, opts);
    }

    /**
     * Highlight a specific DOM element in-place
     * @param {HTMLElement} el
     * @param {Object} [options]
     */
    async highlightElement(el, options = {}) {
        if (!el || typeof el.getAttribute !== 'function') return;

        const opts = { ...this._options, ...options };
        const rawCode = el.textContent || '';
        const trimmedCode = rawCode.trim();

        // 1. Resolve language from attributes or class
        let lang = this._resolveLanguage(el);
        if ((lang === 'auto' || !lang) && opts.autoDetect) {
            lang = detectLanguage(trimmedCode);
        }

        const isMultiline = opts.multiline !== undefined
            ? Boolean(opts.multiline)
            : trimmedCode.includes('\n');

        const mode = isMultiline ? 'multiline' : 'oneline';

        // 2. Set classes and attributes
        el.classList.add('code-block', lang, mode, 'highlighted');
        el.dataset.codeLang = lang;

        // 3. Generate HTML
        const html = await this.highlight(trimmedCode, lang, { ...opts, multiline: isMultiline });
        el.innerHTML = html;

        // 4. Hook up copy button
        const btn = el.querySelector('.copy');
        const codeEl = el.querySelector('.code');
        if (btn && codeEl) {
            bindCopyButton(btn, codeEl);
        }
    }

    /**
     * Scan and highlight code blocks in the document
     * @param {string} [selector='[data-code-lang]:not(.highlighted), pre > code:not(.highlighted)']
     * @param {Object} [options]
     */
    async highlightAll(selector, options) {
        if (typeof document === 'undefined') return [];

        const defaultSel = '[data-code-lang]:not(.highlighted), [data-lang]:not(.highlighted), pre:not(.highlighted) > code:not(.highlighted), pre.code-block:not(.highlighted)';
        const sel = selector || defaultSel;
        const elements = Array.from(document.querySelectorAll(sel));

        return Promise.all(elements.map(el => {
            // If selecting a <code> inside a <pre>, highlight the <pre> container instead for proper block layout
            const target = el.tagName === 'CODE' && el.parentElement?.tagName === 'PRE' ? el.parentElement : el;
            return this.highlightElement(target, options);
        }));
    }

    /**
     * Manually register or pre-register a language grammar
     * @param {string} name
     * @param {Object} grammar
     */
    loadLanguage(name, grammar) {
        const norm = normalizeLang(name);
        this._langs[norm] = grammar;
        return this;
    }

    /**
     * Preload multiple languages in parallel
     * @param {...string} langNames
     */
    async preLoadLanguages(...langNames) {
        await Promise.all(langNames.map(async (name) => {
            const norm = normalizeLang(name);
            if (this._langs[norm]) return;
            try {
                this._langs[norm] = await import(`./languages/${norm}.js`);
            } catch (err) {
                console.error(`[SyntaxHighlighter] Failed to load language: ${name}`, err);
            }
        }));
        return this;
    }

    /**
     * Resolve language identifier from element attributes and classes
     * @param {HTMLElement} el
     * @returns {string}
     */
    _resolveLanguage(el) {
        // Explicit dataset attributes
        const explicit = el.dataset.codeLang || el.dataset.lang;
        if (explicit && explicit !== 'auto') {
            return normalizeLang(explicit);
        }

        // Check element classes: language-*, lang-*, shj-lang-*
        const classMatch = el.className.match(/\b(?:language|lang|shj-lang)-([a-zA-Z0-9_#-]+)\b/);
        if (classMatch) {
            return normalizeLang(classMatch[1]);
        }

        // Check child <code> if el is a <pre>
        const childCode = el.querySelector ? el.querySelector('code') : null;
        if (childCode) {
            if (childCode.dataset.codeLang || childCode.dataset.lang) {
                return normalizeLang(childCode.dataset.codeLang || childCode.dataset.lang);
            }
            const childMatch = childCode.className.match(/\b(?:language|lang|shj-lang)-([a-zA-Z0-9_#-]+)\b/);
            if (childMatch) {
                return normalizeLang(childMatch[1]);
            }
        }

        return explicit === 'auto' ? 'auto' : 'auto';
    }
}

const defaultHighlighter = typeof window !== 'undefined' ? SyntaxHighlighter.getInstance() : null;

export { SyntaxHighlighter, tokenize, tokenizeSync, detectLanguage, normalizeLang };
export default defaultHighlighter;

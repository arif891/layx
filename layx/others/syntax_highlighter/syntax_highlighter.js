/**
 * Token types
 * @typedef {('deleted'|'err'|'var'|'section'|'kwd'|'class'|'cmnt'|'insert'|'type'|'func'|'bool'|'num'|'oper'|'str'|'esc')} Token
 */

class SyntaxHighlighter {
    #langs = new Map();
    #expandData = {
        num: {
            type: 'num',
            match: /(\.e?|\b)\d(e-|[\d.oxa-fA-F_])*(\.|\b)/g
        },
        str: {
            type: 'str',
            match: /(["'])(\\[^]|(?!\1)[^\r\n\\])*\1?/g
        },
        strDouble: {
            type: 'str',
            match: /"((?!")[^\r\n\\]|\\[^])*"?/g
        }
    };

    constructor() {
        this.highlightAll = this.highlightAll.bind(this);
        this.init();
    }

    init() {
        this.highlightAll();
    }

    #sanitize(str = '') {
        const entities = {
            '&': '&#38;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        };
        return str.replace(/[&<>"']/g, char => entities[char]);
    }

    #toSpan(str, token) {
        return token ? `<span class="${token}">${str}</span>` : str;
    }

    async tokenize(src, lang, token) {
        try {
            let data;
            if (typeof lang === 'string') {
                data = this.#langs.get(lang);
                if (!data) {
                    data = await import(`./languages/${lang}.js`);
                    if (!data?.default) {
                        throw new Error(`Invalid language module for ${lang}`);
                    }
                }
            } else {
                data = lang;
            }

            let m, part, first = {}, match, cache = [], i = 0;
            const arr = Array.isArray(data.sub) ? [...data.sub] :
                       Array.isArray(data.default) ? [...data.default] : [];

            if (arr.length === 0) {
                token(src);
                return;
            }

            while (i < src.length) {
                first.index = null;
                for (m = arr.length; m-- > 0;) {
                    part = arr[m].expand ? this.#expandData[arr[m].expand] : arr[m];
                    if (cache[m] === undefined || cache[m].match.index < i) {
                        part.match.lastIndex = i;
                        match = part.match.exec(src);
                        if (match === null) {
                            arr.splice(m, 1);
                            cache.splice(m, 1);
                            continue;
                        }
                        cache[m] = { match, lastIndex: part.match.lastIndex };
                    }
                    if (cache[m].match[0] && (cache[m].match.index <= first.index || first.index === null)) {
                        first = {
                            part: part,
                            index: cache[m].match.index,
                            match: cache[m].match[0],
                            end: cache[m].lastIndex
                        }
                    }
                }
                if (first.index === null) break;
                token(src.slice(i, first.index), data.type);
                i = first.end;
                if (first.part.sub)
                    await this.tokenize(first.match, typeof first.part.sub === 'string' ? first.part.sub : (typeof first.part.sub === 'function' ? first.part.sub(first.match) : first.part), token);
                else
                    token(first.match, first.part.type);
            }
            token(src.slice(i, src.length), data.type);
        } catch (error) {
            console.error(`Tokenization error: ${error.message}`);
            token(src);
        }
    }

    #handleCopy(button, codeElement) {
        navigator.clipboard.writeText(codeElement.textContent).then(() => {
            button.classList.add('copied');
            setTimeout(() => {
                button.classList.remove('copied');
            }, 2000);
        }).catch(err => {
            console.error('Failed to copy:', err);
            button.classList.add('failed');
        });
    }

    async highlightText(src, lang, multiline = true, opt = {}) {
        let tmp = '';
        await this.tokenize(src, lang, (str, type) => tmp += this.#toSpan(this.#sanitize(str), type));

        const html = multiline
            ? `<div class="header"><span class="lang">${lang}</span><button class="copy" title="Copy Code"></button></div><div class="wrapper"><div class="numbers">${'<div></div>'.repeat(opt.lineNumbers && src.split('\n').length)}</div><code class="code">${tmp}</code></div>`
            : `<div class="wrapper"><code class="code">${tmp}</code></div><button class="copy" title="Copy Code"></button>`;

        return html;
    }

    async highlightElement(elm, lang = elm.dataset.codeLang, mode, opt) {
        let txt = elm.textContent.trim();
        mode ??= `${(txt.split('\n').length < 2 ? 'one' : 'multi')}line`;
        elm.className = `${[...elm.classList].filter(className => !className.startsWith('')).join(' ')}code-block ${lang} ${mode} highlighted`;
        elm.innerHTML = await this.highlightText(txt, lang, mode == 'multiline', opt);
        
        const copyButton = elm.querySelector('.copy');
        const codeElement = elm.querySelector('.code');
        if (copyButton && codeElement) {
            copyButton.addEventListener('click', () => this.#handleCopy(copyButton, codeElement));
        }
    }

    async highlightAll(opt = {}) {
        return Promise.all(
            Array.from(document.querySelectorAll('[data-code-lang]:not(.highlighted)'))
            .map(elm => this.highlightElement(elm, undefined, undefined, opt))
        );
    }

    async loadLanguage(languageName, language) {
        if (!language?.default?.length) {
            throw new Error(`Invalid language definition for ${languageName}`);
        }
        this.#langs.set(languageName, language);
    }

    clearLanguageCache() {
        this.#langs.clear();
    }
}

export default new SyntaxHighlighter();
export {SyntaxHighlighter};
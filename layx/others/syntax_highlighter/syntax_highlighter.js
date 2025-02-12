/**
 * @typedef {Object} Options
 * @property {Boolean} [lineNumbers=false] Indicates whether to hide line numbers
 */

/**
 * @typedef {('oneline'|'multiline')} DisplayMode
 * * `oneline` inside `div` element and containing only one line
 * * `multiline` inside `div` element
 */

/**
 * Token types
 * @typedef {('deleted'|'err'|'var'|'section'|'kwd'|'class'|'cmnt'|'insert'|'type'|'func'|'bool'|'num'|'oper'|'str'|'esc')} Token
 */

const expandData = {
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
}

const langs = new Map(),
	sanitize = (str = '') => {
		const entities = {
			'&': '&#38;',
			'<': '&lt;',
			'>': '&gt;',
			'"': '&quot;',
			"'": '&#39;'
		};
		return str.replace(/[&<>"']/g, char => entities[char]);
	},
	/**
	 * Create a HTML element with the right token styling
	 *
	 * @function
	 * @ignore
	 * @param {string} str The content (need to be sanitized)
	 * @param {Token} [token] The type of token
	 * @returns A HMTL string
	 */
	toSpan = (str, token) => token ? `<span class="${token}">${str}</span>` : str;

/**
 * Find and process tokens in the given code using the language definition
 *
 * @function tokenize
 * @param {string} src The source code to tokenize
 * @param {Language|Array} lang The language definition or name
 * @param {function(string, Token=):void} token Callback function that receives:
 * - text of the token
 * - type of the token
 */
export async function tokenize(src, lang, token) {
    try {
        let data;
        if (typeof lang === 'string') {
            data = langs.get(lang);
            if (!data) {
                data = await import(`./languages/${lang}.js`);
                if (!data?.default) {
                    throw new Error(`Invalid language module for ${lang}`);
                }
            }
        } else {
            data = lang;
        }

        let m,
            part,
            first = {},
            match,
            cache = [],
            i = 0,
            // Ensure we have a valid array to work with
            arr = Array.isArray(data.sub) ? [...data.sub] : 
                  Array.isArray(data.default) ? [...data.default] : 
                  [];

        if (arr.length === 0) {
            token(src);
            return;
        }

        while (i < src.length) {
            first.index = null;
            for (m = arr.length; m-- > 0;) {
                part = arr[m].expand ? expandData[arr[m].expand] : arr[m];
                // do not call again exec if the previous result is sufficient
                if (cache[m] === undefined || cache[m].match.index < i) {
                    part.match.lastIndex = i;
                    match = part.match.exec(src);
                    if (match === null) {
                        // no more match with this regex can be disposed
                        arr.splice(m, 1);
                        cache.splice(m, 1);
                        continue;
                    }
                    // save match for later use to decrease performance cost
                    cache[m] = { match, lastIndex: part.match.lastIndex };
                }
                // check if it the first match in the string
                if (cache[m].match[0] && (cache[m].match.index <= first.index || first.index === null))
                    first = {
                        part: part,
                        index: cache[m].match.index,
                        match: cache[m].match[0],
                        end: cache[m].lastIndex
                    }
            }
            if (first.index === null)
                break;
            token(src.slice(i, first.index), data.type);
            i = first.end;
            if (first.part.sub)
                await tokenize(first.match, typeof first.part.sub === 'string' ? first.part.sub : (typeof first.part.sub === 'function' ? first.part.sub(first.match) : first.part), token);
            else
                token(first.match, first.part.type);
        }
        token(src.slice(i, src.length), data.type);
    }
    catch (error) {
        console.error(`Tokenization error: ${error.message}`);
        token(src);
    }
}

/**
 * Handle copy button click event
 * @param {Element} button Copy button element
 * @param {Element} codeElement Code element to copy from
 */
function handleCopy(button, codeElement) {
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

/**
 * Highlight code text and return HTML string with syntax highlighting
 * 
 * @async
 * @function highlightText
 * @param {string} src The source code
 * @param {Language} lang The language identifier
 * @param {Boolean} [multiline=true] Whether to add wrapper for line numbers and header
 * @param {Options} [opt={}] Highlighting options
 * @returns {Promise<string>} HTML string with syntax highlighting
 */
export async function highlightText(src, lang, multiline = true, opt = {}) {
    let tmp = ''
    await tokenize(src, lang, (str, type) => tmp += toSpan(sanitize(str), type))

    const html = multiline
        ? `<div class="header"><span class="lang">${lang}</span><button class="copy" title="Copy Code"></button></div><div class="wrapper"><div class="numbers">${'<div></div>'.repeat(opt.lineNumbers && src.split('\n').length)}</div><code class="code">${tmp}</code></div>`
        : `<div class="wrapper"><code class="code">${tmp}</code></div><button class="copy" title="Copy Code"></button>`;

    return html;
}

/**
 * Highlight a DOM element by applying syntax highlighting
 *
 * @async
 * @function highlightElement
 * @param {Element} elm The DOM element to highlight
 * @param {Language} [lang] Language identifier (defaults to element's data-code-lang attribute)
 * @param {DisplayMode} [mode] Display mode (auto-detected if not specified)
 * @param {Options} [opt] Highlighting options
 */
export async function highlightElement(elm, lang = elm.dataset.codeLang, mode, opt) {
    let txt = elm.textContent.trim();
    mode ??= `${(txt.split('\n').length < 2 ? 'one' : 'multi')}line`;
    elm.className = `${[...elm.classList].filter(className => !className.startsWith('')).join(' ')}code-block ${lang} ${mode} highlighted`;
    elm.innerHTML = await highlightText(txt, lang, mode == 'multiline', opt);
    
    // Add click handler for copy button
    const copyButton = elm.querySelector('.copy');
    const codeElement = elm.querySelector('.code');
    if (copyButton && codeElement) {
        copyButton.addEventListener('click', () => handleCopy(copyButton, codeElement));
    }
}

/**
 * Call highlightElement on element with a css class starting with `lang-`
 *
 * @async
 * @function highlightAll
 * @param {Options} [opt={}] Customization options
 */
export let highlightAll = async (opt) =>
	Promise.all(
		Array.from(document.querySelectorAll('[data-code-lang]:not(.highlighted)'))
		.map(elm => highlightElement(elm, undefined, undefined, opt)))

/**
 * Language component definition
 * @typedef {{ 
 *   match?: RegExp, 
 *   type?: string,
 *   sub?: string | LanguageDefinition | ((code:string) => LanguageComponent),
 *   expand?: string 
 * }} LanguageComponent
 */

/**
 * @typedef {LanguageComponent[]} LanguageDefinition
 */

/**
 * Load a language and add it to the langs object
 *
 * @function loadLanguage
 * @param {string} languageName The name of the language
 * @param {{ default: LanguageDefinition }} language The language
 */
export async function loadLanguage(languageName, language) {
	if (!language?.default?.length) {
		throw new Error(`Invalid language definition for ${languageName}`);
	}
	langs.set(languageName, language);
}

export function clearLanguageCache() {
	langs.clear();
}
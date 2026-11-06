/**
 * Tokenizer – High-performance Registry-free Syntax Tokenizer
 * Based on speed-highlight/core architecture
 */

const expandData = {
    num: {
        type: 'num',
        match: /(\.e?|\b)\d(e-|[\d.oxa-fA-F_])*(\.|\b)/g,
    },
    str: {
        type: 'str',
        match: /(["'])(\\[^]|(?!\1)[^\r\n\\])*\1?/g,
    },
    strDouble: {
        type: 'str',
        match: /"((?!")[^\r\n\\]|\\[^])*"?/g,
    },
};

/**
 * Generator tokenizer: emits tokens and yields language names needed for nested grammars
 * @param {string} src - Source code to tokenize
 * @param {string|Object} lang - Language name or grammar definition
 * @param {Function} onToken - Callback (text, type) => void
 * @param {string} [fallback] - Fallback token type on error
 */
function* tokenizer(src, lang, onToken, fallback) {
    let i = 0;
    try {
        let m, part, first = {}, match, cache = [];
        const data = typeof lang === 'string' ? yield lang : lang;
        if (!data) {
            onToken(src.slice(i), fallback);
            return;
        }

        const grammar = data.sub ?? data;
        const arr = Array.isArray(grammar) ? [...grammar] : [];

        while (i < src.length) {
            first.index = null;
            for (m = arr.length; m-- > 0;) {
                part = arr[m].expand ? expandData[arr[m].expand] : arr[m];
                if (!part || !part.match) continue;

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

                if (cache[m].match[0] && (first.index === null || cache[m].match.index <= first.index)) {
                    first = {
                        part,
                        index: cache[m].match.index,
                        match: cache[m].match[0],
                        end: cache[m].lastIndex,
                    };
                }
            }

            if (first.index === null) break;

            // Emit plain code preceding the match
            onToken(src.slice(i, first.index), data.type);
            i = first.index;

            // Handle nested grammar or emit matched token
            if (first.part.sub) {
                const subLang = typeof first.part.sub === 'function' ? first.part.sub(first.match) : first.part.sub;
                yield* tokenizer(first.match, subLang, onToken, first.part.type);
            } else {
                onToken(first.match, first.part.type);
            }

            i = first.end;
        }

        onToken(src.slice(i), data.type);
    } catch {
        onToken(src.slice(i), fallback);
    }
}

/**
 * Asynchronously tokenize code with dynamic language loader
 * @param {string} src
 * @param {string|Object} lang
 * @param {Function} onToken
 * @param {Function} loadLang
 */
async function tokenize(src, lang, onToken, loadLang) {
    const it = tokenizer(src, lang, onToken);
    let res = it.next();

    while (!res.done) {
        const name = res.value;
        let data = null;
        try {
            data = loadLang ? await loadLang(name) : null;
        } catch {}
        res = it.next(data?.default ?? data);
    }
}

/**
 * Synchronously tokenize code using pre-registered languages
 * @param {string} src
 * @param {string|Object} lang
 * @param {Function} onToken
 * @param {Object} [registry={}]
 */
function tokenizeSync(src, lang, onToken, registry = {}) {
    const it = tokenizer(src, lang, onToken);
    let res = it.next();

    while (!res.done) {
        const name = res.value;
        const data = registry[name]?.default ?? registry[name];
        res = it.next(data);
    }
}

export { tokenizer, tokenize, tokenizeSync, expandData };

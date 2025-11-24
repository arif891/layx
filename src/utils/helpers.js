import { breakPoints } from "../core/config.js";

export { getCssContentBlock, minify, extractClasses, extractImportUrls };

function getCssContentBlock(content, tag) {
    const regex = new RegExp(`/\\*<${tag}>\\*/(.*?)\\/\\*<\\/${tag}>\\*/`, 'gs');
    return [...content.matchAll(regex)]
        .map(match => match[1])
        .join('');
}

function minify(content, type = 'css') {
    if (typeof content !== 'string' || !content) return '';

    const mode = String(type).toLowerCase();

    /* ---------- HTML / XML ---------- */
    if (mode === 'html' || mode === 'xml') {
        // 1.  Protect <pre> and <code> blocks ------------------------------------
        const stash = [];
        let counter = 0;
        const key = () => `__MINIFY_STASH_${counter++}__`;

        const safe = content
            .replace(/<(pre|code)\b[^>]*>[\s\S]*?<\/\1>/gi, match => {
                const k = key();
                stash.push([k, match]);
                return k;
            });

        // 2.  Minify everything else ---------------------------------------------
        const minified = safe
            .replace(/<!--[\s\S]*?-->/g, '')       // comments
            .replace(/\/\*[\s\S]*?\*\//g, '')      // css comments
            .replace(/>[\r\n]+\s*</g, '><')        // space between tags
            .replace(/\s{2,}/g, ' ')               // collapse inner runs
            .trim();

        // 3.  Restore protected blocks ------------------------------------------
        return stash.reduce((out, [k, original]) => out.replace(k, original), minified);
    }

    /* ---------- CSS ---------- */
    if (mode === 'css') {
        return content
            .replace(/\/\*[\s\S]*?\*\//g, '')
            .replace(/\s*([{}:;,])\s*/g, '$1')
            .replace(/\s*\n\s*/g, '')
            .replace(/;\}/g, '}')
            .trim()
    }

    /* ---------- JS / JSON ---------- */
    if (mode === 'js' || mode === 'json') {
        const TOKEN = /(["'`])(?:\\[\s\S]|(?!\1).)*?\1|\/(?!\*)(?:\\.|[^\/\n])+\/[gimuy]*|\/\*[\s\S]*?\*\/|\/\/.*$/gm;
        return content
            .replace(TOKEN, m => (m[0] === '/' && m[1] !== '*') ? m : '')
            .replace(/\s+/g, ' ')
            .trim();
    }

    /* ---------- Unknown ---------- */
    return content;
}

function extractClasses(html, startClass, type = 'class') {
    if (!html || typeof html !== 'string') {
        throw new Error('Invalid HTML input');
    }

    const breakPointKeys = Object.keys(breakPoints);
    const escapedStartClass = startClass.replace(/[-_]/g, '\\$&');
    const patterns = {
        class: {
            regex: new RegExp(`\\b${escapedStartClass}-(\\d+)\\b(?!-${breakPointKeys.join('|')})`, 'g'),
            process: match => [match[0]]
        },
        media: {
            regex: new RegExp(`\\b${escapedStartClass}-(${breakPointKeys.join('|')})-(\\d+)\\b`, 'g'),
            process: match => [match[1]]
        },
        number: {
            regex: new RegExp(`\\b${escapedStartClass}-(\\d+)\\b(?!-${breakPointKeys.join('|')})`, 'g'),
            process: match => [parseInt(match[0].split('-').pop())]
        }
    };

    if (!patterns[type]) {
        throw new Error(`Invalid type: ${type}`);
    }

    const { regex, process } = patterns[type];
    const resultSet = new Set();
    let match;

    while ((match = regex.exec(html)) !== null) {
        process(match).forEach(item => resultSet.add(item));
    }

    const sortFunctions = {
        class: (a, b) => parseInt(a.split('-')[1]) - parseInt(b.split('-')[1]),
        media: (a, b) => breakPointKeys.indexOf(a) - breakPointKeys.indexOf(b),
        number: (a, b) => a - b
    };

    return Array.from(resultSet).sort(sortFunctions[type]);
}

function extractImportUrls(content, type) {
    const regex = type === 'css'
        ? /@import\s+url\(([^)]+)\);/g
        : /import\s+(?:\w+|\{[^}]+\})\s+from\s+['"]([^'"]+)['"]/g;

    return [...content.matchAll(regex)].map(match => match[1].replace(/['"]/g, ''));
}

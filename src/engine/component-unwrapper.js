/**
 * Component Unwrapper
 * Strips Component imports and instantiations, and unwraps `components-ready`
 * and `component-ready` event listeners so their inner logic runs immediately
 * without runtime component engine overhead.
 */

export { unwrapComponentCode, removeComponentScriptEntries };

/**
 * Checks if an import/require path refers to the component engine.
 */
function isComponentPath(importPath) {
    if (!importPath || typeof importPath !== 'string') return false;
    const clean = importPath.trim().replace(/\\/g, '/');
    return (
        /(?:^|\/|\b)layx\/others\/component\/component(?:\.js)?$/i.test(clean) ||
        /(?:^|\/|\b)others\/component\/component(?:\.js)?$/i.test(clean) ||
        /(?:^|\/|\b)component\.js$/i.test(clean)
    );
}

/**
 * Unwraps component code in JavaScript source text:
 * 1. Removes imports and requires of component.js
 * 2. Removes `new Component(...)` and `Component.render(...)` calls
 * 3. Unwraps `document.addEventListener('components-ready', ...)` listeners
 * 4. Removes `component-loaded` and `component-error` listeners
 */
function unwrapComponentCode(code) {
    if (!code || typeof code !== 'string') return code;

    let result = code;

    // 1. Remove ES import statements for component.js
    result = result.replace(
        /^[ \t]*import\s+(?:(?:\w+|\{[^}]*\}|\*\s+as\s+\w+)(?:\s*,\s*(?:\{[^}]*\}|\w+))?\s+from\s+)?['"]([^'"]+)['"];?[ \t]*\r?\n?/gm,
        (match, importPath) => {
            if (isComponentPath(importPath)) {
                return '';
            }
            return match;
        }
    );

    // 2. Remove CommonJS require statements for component.js
    result = result.replace(
        /^[ \t]*(?:const|let|var)\s+(?:\{?[^=}]*\}?)\s*=\s*require\s*\(\s*['"]([^'"]+)['"]\s*\);?[ \t]*\r?\n?/gm,
        (match, importPath) => {
            if (isComponentPath(importPath)) {
                return '';
            }
            return match;
        }
    );

    // 3. Remove `new Component(...)` and declarations like `const x = new Component(...)`
    result = removeNewComponentCalls(result);

    // 4. Remove static calls like `Component.render(...)` and `Component.register(...)`
    result = removeComponentStaticCalls(result);

    // 5. Remove `component-loaded` and `component-error` listeners
    result = removeLifecycleListeners(result);

    // 6. Unwrap `components-ready` and `component-ready` event listeners
    result = unwrapReadyListeners(result);

    return result;
}

/**
 * Removes `new Component(...)` calls (including multiline calls).
 */
function removeNewComponentCalls(code) {
    const pattern = /(?:^[ \t]*(?:(?:const|let|var)\s+\w+\s*=\s*)?new\s+Component\s*\()/gm;
    let match;

    while ((match = pattern.exec(code)) !== null) {
        const startIndex = match.index;
        const openParenIndex = startIndex + match[0].length - 1;
        const closeParenIndex = findMatchingParen(code, openParenIndex);

        if (closeParenIndex !== -1) {
            let endIndex = closeParenIndex + 1;
            // Consume trailing semicolon and whitespace/newline
            while (endIndex < code.length && (code[endIndex] === ';' || code[endIndex] === ' ' || code[endIndex] === '\t')) {
                endIndex++;
            }
            if (code[endIndex] === '\r') endIndex++;
            if (code[endIndex] === '\n') endIndex++;

            code = code.slice(0, startIndex) + code.slice(endIndex);
            pattern.lastIndex = startIndex;
        } else {
            break;
        }
    }
    return code;
}

/**
 * Removes `Component.render(...)`, `Component.register(...)`, `Component._instance = ...`
 */
function removeComponentStaticCalls(code) {
    const pattern = /(?:^[ \t]*Component\.(?:render|register|getInstance)\s*\()/gm;
    let match;

    while ((match = pattern.exec(code)) !== null) {
        const startIndex = match.index;
        const openParenIndex = startIndex + match[0].length - 1;
        const closeParenIndex = findMatchingParen(code, openParenIndex);

        if (closeParenIndex !== -1) {
            let endIndex = closeParenIndex + 1;
            while (endIndex < code.length && (code[endIndex] === ';' || code[endIndex] === ' ' || code[endIndex] === '\t')) {
                endIndex++;
            }
            if (code[endIndex] === '\r') endIndex++;
            if (code[endIndex] === '\n') endIndex++;

            code = code.slice(0, startIndex) + code.slice(endIndex);
            pattern.lastIndex = startIndex;
        } else {
            break;
        }
    }

    // Remove window.__componentInstance / Component._instance assignments
    code = code.replace(/^[ \t]*(?:window\.__componentInstance|Component\._instance)\s*=\s*[^;]+;?[ \t]*\r?\n?/gm, '');

    return code;
}

/**
 * Removes `component-loaded` and `component-error` event listeners.
 */
function removeLifecycleListeners(code) {
    const pattern = /(?:^[ \t]*(?:document|window)\s*\.\s*addEventListener\s*\(\s*['"]component-(?:loaded|error)['"]\s*,\s*)/gm;
    let match;

    while ((match = pattern.exec(code)) !== null) {
        const startIndex = match.index;
        const openParenIndex = startIndex + match[0].indexOf('(');
        const closeParenIndex = findMatchingParen(code, openParenIndex);

        if (closeParenIndex !== -1) {
            let endIndex = closeParenIndex + 1;
            while (endIndex < code.length && (code[endIndex] === ';' || code[endIndex] === ' ' || code[endIndex] === '\t')) {
                endIndex++;
            }
            if (code[endIndex] === '\r') endIndex++;
            if (code[endIndex] === '\n') endIndex++;

            code = code.slice(0, startIndex) + code.slice(endIndex);
            pattern.lastIndex = startIndex;
        } else {
            break;
        }
    }
    return code;
}

/**
 * Unwraps `document.addEventListener('components-ready', ...)` and `component-ready`.
 */
function unwrapReadyListeners(code) {
    const pattern = /(?:(?:document|window)\s*\.\s*addEventListener\s*\(\s*['"]components?-ready['"]\s*,\s*)/g;
    let match;

    while ((match = pattern.exec(code)) !== null) {
        const fullStartIndex = match.index;
        const addEventOpenParen = fullStartIndex + match[0].indexOf('(');
        const addEventCloseParen = findMatchingParen(code, addEventOpenParen);

        if (addEventCloseParen === -1) break;

        const argsStringStart = fullStartIndex + match[0].length;
        const unwrapped = extractAndUnwrapCallback(code, argsStringStart, addEventCloseParen);

        let fullEndIndex = addEventCloseParen + 1;
        while (fullEndIndex < code.length && (code[fullEndIndex] === ';' || code[fullEndIndex] === ' ' || code[fullEndIndex] === '\t')) {
            fullEndIndex++;
        }
        if (code[fullEndIndex] === '\r') fullEndIndex++;
        if (code[fullEndIndex] === '\n') fullEndIndex++;

        // Determine line prefix / indentation
        const lineStart = code.lastIndexOf('\n', fullStartIndex - 1) + 1;
        const indent = code.slice(lineStart, fullStartIndex).match(/^[ \t]*/)[0] || '';

        const replacement = formatUnwrappedCode(unwrapped, indent);

        code = code.slice(0, lineStart) + replacement + code.slice(fullEndIndex);
        pattern.lastIndex = lineStart + replacement.length;
    }

    return code;
}

/**
 * Extracts the callback body from the arguments of `addEventListener('components-ready', <callback>, ...)`.
 */
function extractAndUnwrapCallback(code, startPos, endPos) {
    let pos = startPos;
    // Skip leading whitespace
    while (pos < endPos && /\s/.test(code[pos])) pos++;

    let isAsync = false;
    if (code.slice(pos, pos + 5) === 'async' && /\s/.test(code[pos + 5])) {
        isAsync = true;
        pos += 5;
        while (pos < endPos && /\s/.test(code[pos])) pos++;
    }

    // Check if it's `function` keyword
    if (code.slice(pos, pos + 8) === 'function') {
        pos += 8;
        // Skip function name if any
        while (pos < endPos && /[\w$]/.test(code[pos])) pos++;
        while (pos < endPos && /\s/.test(code[pos])) pos++;
        // Skip parameter list (...)
        if (code[pos] === '(') {
            const closingParen = findMatchingParen(code, pos);
            if (closingParen !== -1) pos = closingParen + 1;
        }
        while (pos < endPos && /\s/.test(code[pos])) pos++;
        if (code[pos] === '{') {
            const closingBrace = findMatchingBrace(code, pos);
            if (closingBrace !== -1) {
                const body = code.slice(pos + 1, closingBrace);
                return { body, isAsync, isBlock: true };
            }
        }
    }

    // Check if it's an arrow function: () => ... or (e) => ... or e => ...
    const arrowIndex = findArrowToken(code, pos, endPos);
    if (arrowIndex !== -1) {
        let bodyStart = arrowIndex + 2;
        while (bodyStart < endPos && /\s/.test(code[bodyStart])) bodyStart++;

        if (code[bodyStart] === '{') {
            const closingBrace = findMatchingBrace(code, bodyStart);
            if (closingBrace !== -1) {
                const body = code.slice(bodyStart + 1, closingBrace);
                return { body, isAsync, isBlock: true };
            }
        } else {
            // Concise body arrow function, e.g. () => initApp()
            // Find end of expression: comma before options or closing paren
            let exprEnd = bodyStart;
            let pDepth = 0;
            let bDepth = 0;
            while (exprEnd < endPos) {
                const ch = code[exprEnd];
                if (ch === '(') pDepth++;
                else if (ch === ')') {
                    if (pDepth === 0) break;
                    pDepth--;
                } else if (ch === '{') bDepth++;
                else if (ch === '}') bDepth--;
                else if (ch === ',' && pDepth === 0 && bDepth === 0) break;
                exprEnd++;
            }
            const expr = code.slice(bodyStart, exprEnd).trim();
            const body = expr.endsWith(';') ? expr : `${expr};`;
            return { body, isAsync, isBlock: false };
        }
    }

    // Check if it's an identifier, e.g. addEventListener('components-ready', initApp)
    let identEnd = pos;
    while (identEnd < endPos && /[\w$]/.test(code[identEnd])) identEnd++;
    const identifier = code.slice(pos, identEnd).trim();
    if (identifier) {
        return { body: `${identifier}();`, isAsync: false, isBlock: false };
    }

    return { body: '', isAsync: false, isBlock: false };
}

/**
 * Finds `=>` within the callback start without crossing strings or comments.
 */
function findArrowToken(code, startPos, endPos) {
    let i = startPos;
    let parenDepth = 0;

    while (i < endPos - 1) {
        const ch = code[i];
        if (ch === '\'' || ch === '"' || ch === '`') {
            i = skipString(code, i);
            continue;
        }
        if (ch === '/' && code[i + 1] === '/') {
            i = skipLineComment(code, i);
            continue;
        }
        if (ch === '/' && code[i + 1] === '*') {
            i = skipBlockComment(code, i);
            continue;
        }
        if (ch === '(') parenDepth++;
        else if (ch === ')') parenDepth--;
        else if (ch === '=' && code[i + 1] === '>') {
            return i;
        }
        i++;
    }
    return -1;
}

/**
 * Formats unwrapped code body.
 */
function formatUnwrappedCode({ body, isAsync, isBlock }, baseIndent) {
    let cleanBody = body.replace(/^\r?\n/, '').replace(/\r?\n\s*$/, '');
    if (!cleanBody.trim()) return '';

    if (isAsync && /\bawait\b/.test(cleanBody)) {
        return `${baseIndent}(async () => {\n${cleanBody}\n${baseIndent}})();\n`;
    }

    // Trim common leading whitespace if multiline
    const lines = cleanBody.split(/\r?\n/);
    return lines.map(line => `${baseIndent}${line.trimEnd()}`).join('\n') + '\n';
}

/**
 * Finds matching closing parenthesis `)` for an open parenthesis at `openIndex`.
 */
function findMatchingParen(code, openIndex) {
    let depth = 0;
    let i = openIndex;

    while (i < code.length) {
        const ch = code[i];
        if (ch === '\'' || ch === '"' || ch === '`') {
            i = skipString(code, i);
            continue;
        }
        if (ch === '/' && code[i + 1] === '/') {
            i = skipLineComment(code, i);
            continue;
        }
        if (ch === '/' && code[i + 1] === '*') {
            i = skipBlockComment(code, i);
            continue;
        }
        if (ch === '(') {
            depth++;
        } else if (ch === ')') {
            depth--;
            if (depth === 0) return i;
        }
        i++;
    }
    return -1;
}

/**
 * Finds matching closing brace `}` for an open brace at `openIndex`.
 */
function findMatchingBrace(code, openIndex) {
    let depth = 0;
    let i = openIndex;

    while (i < code.length) {
        const ch = code[i];
        if (ch === '\'' || ch === '"' || ch === '`') {
            i = skipString(code, i);
            continue;
        }
        if (ch === '/' && code[i + 1] === '/') {
            i = skipLineComment(code, i);
            continue;
        }
        if (ch === '/' && code[i + 1] === '*') {
            i = skipBlockComment(code, i);
            continue;
        }
        if (ch === '{') {
            depth++;
        } else if (ch === '}') {
            depth--;
            if (depth === 0) return i;
        }
        i++;
    }
    return -1;
}

function skipString(code, startPos) {
    const quote = code[startPos];
    let i = startPos + 1;

    while (i < code.length) {
        if (code[i] === '\\') {
            i += 2;
            continue;
        }
        if (quote === '`' && code[i] === '$' && code[i + 1] === '{') {
            // Template interpolation
            i = findMatchingBrace(code, i + 1) + 1;
            continue;
        }
        if (code[i] === quote) {
            return i + 1;
        }
        i++;
    }
    return i;
}

function skipLineComment(code, startPos) {
    let i = startPos + 2;
    while (i < code.length && code[i] !== '\n' && code[i] !== '\r') i++;
    return i;
}

function skipBlockComment(code, startPos) {
    let i = startPos + 2;
    while (i < code.length - 1) {
        if (code[i] === '*' && code[i + 1] === '/') return i + 2;
        i++;
    }
    return code.length;
}

/**
 * Removes `<script ... src="...component.js"></script>` from HTML content.
 * Also unwraps inline scripts that reference component.js or components-ready.
 */
function removeComponentScriptEntries(htmlContent) {
    if (!htmlContent || typeof htmlContent !== 'string') return htmlContent;

    // 1. Remove external script tags pointing to component.js
    const scriptSrcRegex = /^[ \t]*<script\s+[^>]*src=["'][^"']*(?:layx[\\/])?others[\\/]component[\\/]component(?:\.js)?["'][^>]*>(?:<\/script\s*>)?\r?\n?/gim;
    const scriptSrcInlineRegex = /<script\s+[^>]*src=["'][^"']*(?:layx[\\/])?others[\\/]component[\\/]component(?:\.js)?["'][^>]*>(?:<\/script\s*>)?/gi;

    let result = htmlContent.replace(scriptSrcRegex, '').replace(scriptSrcInlineRegex, '');

    // 2. Process inline <script> tags: unwrap any component code
    result = result.replace(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi, (match, attrs, body) => {
        if (
            body.includes('component') ||
            body.includes('components-ready') ||
            body.includes('component-ready')
        ) {
            const unwrappedBody = unwrapComponentCode(body);
            if (!unwrappedBody.trim()) {
                return ''; // Drop empty script tag
            }
            return `<script${attrs}>${unwrappedBody}</script>`;
        }
        return match;
    });

    return result;
}

/**
 * DOM – UI Rendering, Escaping, and Clipboard Interactions
 */

const ESCAPE_MAP = {
    '&': '&#38;',
    '<': '&lt;',
    '>': '&gt;',
};

/**
 * Escape HTML special characters
 * @param {string} str
 * @returns {string}
 */
function sanitize(str = '') {
    return String(str).replace(/[&<>]/g, s => ESCAPE_MAP[s]);
}

/**
 * Generate empty div elements for line numbers
 * @param {number} count
 * @returns {string}
 */
function renderLineNumbers(count = 0) {
    return '<div></div>'.repeat(Math.max(0, count));
}

/**
 * Generate full HTML structure for a code block
 * @param {string} codeHtml - Tokenized HTML
 * @param {string} lang - Language identifier
 * @param {boolean} isMultiline - Whether to render as multiline block
 * @param {Object} [options]
 * @param {boolean} [options.lineNumbers=true]
 * @param {boolean} [options.header=true]
 * @param {boolean} [options.copyButton=true]
 * @returns {string}
 */
function buildUI(codeHtml, lang, isMultiline, options = {}) {
    const showLineNumbers = options.lineNumbers !== false;
    const showHeader = options.header !== false;
    const showCopy = options.copyButton !== false;

    const lineCount = (codeHtml.match(/\n/g) || []).length + 1;
    const lineNumbersHtml = isMultiline && showLineNumbers
        ? `<div class="numbers">${renderLineNumbers(lineCount)}</div>`
        : '';

    const copyBtnHtml = showCopy
        ? `<button type="button" class="copy" title="Copy code" aria-label="Copy code"></button>`
        : '';

    const headerHtml = isMultiline && showHeader
        ? `<div class="header"><span class="lang">${sanitize(lang)}</span>${copyBtnHtml}</div>`
        : '';

    if (isMultiline) {
        return `${headerHtml}<div class="wrapper">${lineNumbersHtml}<code class="code">${codeHtml}</code></div>`;
    }

    return `<div class="wrapper"><code class="code">${codeHtml}</code></div>${copyBtnHtml}`;
}

/**
 * Copy text to clipboard with fallback for non-secure contexts
 * @param {string} text
 * @returns {Promise<boolean>}
 */
async function copyToClipboard(text) {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch {
            // Fall back to execCommand below
        }
    }

    if (typeof document !== 'undefined') {
        try {
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.style.position = 'fixed';
            ta.style.top = '-9999px';
            ta.style.left = '-9999px';
            ta.style.opacity = '0';
            ta.setAttribute('readonly', '');
            document.body.appendChild(ta);
            ta.select();
            const success = document.execCommand('copy');
            document.body.removeChild(ta);
            return success;
        } catch {
            return false;
        }
    }

    return false;
}

/**
 * Bind click listener to copy button with feedback animation
 * @param {HTMLElement} btn
 * @param {HTMLElement} codeEl
 */
function bindCopyButton(btn, codeEl) {
    if (!btn || !codeEl) return;

    btn.addEventListener('click', async (e) => {
        e.preventDefault();
        const text = codeEl.textContent || '';
        const success = await copyToClipboard(text);

        if (success) {
            btn.classList.add('copied');
            btn.setAttribute('aria-label', 'Copied!');
            setTimeout(() => {
                btn.classList.remove('copied');
                btn.setAttribute('aria-label', 'Copy code');
            }, 2000);
        } else {
            btn.classList.add('failed');
            setTimeout(() => btn.classList.remove('failed'), 2000);
        }
    });
}

export { sanitize, renderLineNumbers, buildUI, copyToClipboard, bindCopyButton };

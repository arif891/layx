/**
 * SplitText 
 *  – Minimal API
 *  – survives XSS (textContent instead of innerHTML)
 *  – survives mutation (MutationObserver)
 */
class SplitText {
    constructor(selector = '[data-split-text]', options = {}) {
        this.selector = selector;
        this.opts = { autoRefresh: true, ...options };
        this.elMap = new WeakMap();          // element → meta
        this.validTypes = new Set(['word', 'letter', 'both']);

        this._observer = null;
        if (this.opts.autoRefresh && window.MutationObserver) {
            this._observer = new MutationObserver(() => this.refresh());
            this._observer.observe(document.body, { childList: true, subtree: true });
        }
        this.init();
    }

    /* ---------- public ---------- */
    init() {
        const nodeList = document.querySelectorAll(this.selector);
        if (!nodeList.length) {
            console.warn('SplitText: nothing matches', this.selector);
            return;
        }
        nodeList.forEach(el => this._splitIfNeeded(el));
    }

    refresh(customSelector) {
        const sel = customSelector || this.selector;
        document.querySelectorAll(sel).forEach(el => this._splitIfNeeded(el));
    }


    /* ---------- private ---------- */
    _splitIfNeeded(el) {
        if (this.elMap.has(el)) return;               // already done
        const raw = el.firstChild?.nodeType === 3 ? el.firstChild.textContent : '';
        if (!raw.trim()) return;                      // empty text node

        const type = (el.dataset.splitText || 'both').toLowerCase();
        const safeType = this.validTypes.has(type) ? type : 'both';

        const meta = this._buildFragments(el, raw, safeType);
        this.elMap.set(el, meta);
    }

    _buildFragments(host, text, type) {
        const words = text.trim().split(/\s+/);
        const letters = [];                 // flat list of <span class=letter>
        const wordWraps = [];               // <span class=word-wrap>

        let letterIdx = 0;
        const docFrag = document.createDocumentFragment();

        words.forEach((word, wordIdx) => {
            const wordWrap = document.createElement('span');
            wordWrap.className = 'word-wrap';

            const wordSpan = document.createElement('span');
            wordSpan.className = 'word';
            wordSpan.style.setProperty('--word-index', wordIdx);

            if (type === 'word') {                       // words only
                wordSpan.textContent = word;
            } else {                                     // letter or both
                for (const ch of word) {
                    const l = document.createElement('span');
                    l.className = 'letter';
                    l.style.setProperty('--letter-index', letterIdx++);
                    l.textContent = ch;
                    wordSpan.appendChild(l);
                    letters.push(l);
                }
            }

            wordWrap.appendChild(wordSpan);
            docFrag.appendChild(wordWrap);
            if (wordIdx !== words.length - 1) {          // preserve single space
                docFrag.appendChild(document.createTextNode(' '));
            }
            wordWraps.push(wordWrap);
        });

        host.innerHTML = '';            // wipe old text node
        host.appendChild(docFrag);

        /* expose CSS counters */
        if (type !== 'letter') host.style.setProperty('--words', words.length);
        if (type !== 'word') host.style.setProperty('--letters', letters.length);

        return { words, wordWraps, letters, type };
    }
}

new SplitText();
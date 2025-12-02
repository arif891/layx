/**
 * SplitText
 * 
 * A utility class to split text content into words and/or letters for animation purposes.
 * It wraps text in spans and assigns CSS variables for staggered animations.
 * 
 * Features:
 * - Splits text into words, letters, or both.
 * - Supports custom selectors (default: [data-split-text]).
 * - Auto-refreshes on DOM changes (optional).
 * - Assigns CSS variables: --word-index, --letter-index, --global-index.
 * - Supports split direction: start, center, end (via data-split-from).
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

    destroy() {
        this._observer?.disconnect();
        this._observer = null;
        this.elMap = new WeakMap();
    }

    /* ---------- private ---------- */
    _splitIfNeeded(el) {
        if (this.elMap.has(el)) return;
        const raw = el.firstChild?.nodeType === 3 ? el.firstChild.textContent : '';
        if (!raw.trim()) return;

        const type = (el.dataset.splitText || 'both').toLowerCase();
        const safeType = this.validTypes.has(type) ? type : 'both';

        const meta = this._buildFragments(el, raw, safeType);
        this.elMap.set(el, meta);
    }

    _getSplitFrom(el) {
        const v = (el.dataset.splitFrom || 'start').toLowerCase();
        return ['start', 'center', 'end'].includes(v) ? v : 'start';
    }

    _assignIndices(list, mode, cssPrefix) {
        const n = list.length;
        const isCenter = mode === 'center';
        const mid = n / 2 - 0.5;

        list.forEach((item, i) => {
            const idx = isCenter
                ? Math.floor(Math.abs(i - mid) + (n % 2 === 0 ? 1 : 0))
                : mode === 'end' ? n - 1 - i : i;

            item.style.setProperty(`--${cssPrefix}-index`, idx);
            item.style.setProperty('--global-index', item.dataset.globalIdx);
        });
    }

    _buildFragments(host, text, type) {
        const words = text.trim().split(/\s+/);
        const letters = [];           // flat <span class=letter>
        const wordWraps = [];         // <span class=word-wrap>

        const docFrag = document.createDocumentFragment();
        const mode = this._getSplitFrom(host);

        /* 1.  build spans ----------------------------------------------------- */
        let globalIdx = 0;
        words.forEach((word, wIdx) => {
            const wordWrap = document.createElement('span');
            wordWrap.className = 'word-wrap';

            const wordSpan = document.createElement('span');
            wordSpan.className = 'word';
            wordSpan.dataset.globalIdx = wIdx;

            for (const ch of word) {
                const l = document.createElement('span');
                l.className = 'letter';
                l.textContent = ch;
                l.dataset.globalIdx = globalIdx++;
                letters.push(l);
                wordSpan.appendChild(l);
            }
            wordWrap.appendChild(wordSpan);
            wordWraps.push(wordWrap);
        });

        /* 2.  index assignment ----------------------------------------------- */
        this._assignIndices(letters, mode, 'letter');
        this._assignIndices(
            wordWraps.map(w => w.querySelector('.word')),
            mode,
            'word'
        );

        /* 3.  inject --------------------------------------------------------- */
        wordWraps.forEach((wrap, i) => {
            docFrag.appendChild(wrap);
            if (i !== wordWraps.length - 1) docFrag.appendChild(document.createTextNode(' '));
        });

        host.innerHTML = '';
        host.appendChild(docFrag);

        if (type !== 'letter') host.style.setProperty('--words', words.length);
        if (type !== 'word') host.style.setProperty('--letters', letters.length);

        return { words, wordWraps, letters, type };
    }
}

export default new SplitText();
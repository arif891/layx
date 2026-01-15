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
        this.opts = { autoRefresh: false, ...options };
        this.elMap = new WeakMap();
        this.validTypes = new Set(['word', 'letter', 'both']);
        
        this._globalLetterIdx = 0;
        this._globalWordIdx = 0;
        this._letters = [];
        this._wordWraps = [];

        this._observer = null;
        if (this.opts.autoRefresh && window.MutationObserver) {
            this._observer = new MutationObserver(() => this.refresh());
            this._observer.observe(document.body, { childList: true, subtree: true });
        }
        this.init();
    }

    init() {
        document.querySelectorAll(this.selector).forEach(el => this._splitIfNeeded(el));
    }

    _splitIfNeeded(el) {
        if (this.elMap.has(el)) return;
        if (!el.textContent.trim()) return;

        this._globalLetterIdx = 0;
        this._globalWordIdx = 0;
        this._letters = [];
        this._wordWraps = [];

        const type = (el.dataset.splitText || 'both').toLowerCase();
        const mode = this._getSplitFrom(el);

        const fragment = this._processNodes(Array.from(el.childNodes));

        el.innerHTML = '';
        el.appendChild(fragment);

        this._assignIndices(this._letters, mode, 'letter');
        this._assignIndices(this._wordWraps.map(w => w.querySelector('.word')), mode, 'word');

        if (type !== 'letter') el.style.setProperty('--words', this._globalWordIdx);
        if (type !== 'word') el.style.setProperty('--letters', this._globalLetterIdx);

        this.elMap.set(el, { type });
    }

    _processNodes(nodes) {
        const fragment = document.createDocumentFragment();

        nodes.forEach(node => {
            if (node.nodeType === 3) { 
                const words = node.textContent.split(/(\s+)/);
                words.forEach(word => {
                    if (!word.trim()) {
                        fragment.appendChild(document.createTextNode(word));
                        return;
                    }
                    const wrap = this._createWordSpan(word);
                    this._wordWraps.push(wrap);
                    fragment.appendChild(wrap);
                });
            } else if (node.nodeType === 1) {
                const clone = node.cloneNode(false); 
                const children = Array.from(node.childNodes);
                
                clone.appendChild(this._processNodes(children));
                fragment.appendChild(clone);
            }
        });

        return fragment;
    }

    _createWordSpan(word) {
        const wrap = document.createElement('span');
        wrap.className = 'word-wrap';
        
        const wordSpan = document.createElement('span');
        wordSpan.className = 'word';
        wordSpan.dataset.globalIdx = this._globalWordIdx++;

        for (const ch of word) {
            const l = document.createElement('span');
            l.className = 'letter';
            l.textContent = ch;
            l.dataset.globalIdx = this._globalLetterIdx++;
            wordSpan.appendChild(l);
            this._letters.push(l);
        }

        wrap.appendChild(wordSpan);
        return wrap;
    }

    _getSplitFrom(el) {
        const v = (el.dataset.splitFrom || 'start').toLowerCase();
        return ['start', 'center', 'end'].includes(v) ? v : 'start';
    }

    _assignIndices(list, mode, cssPrefix) {
        const n = list.length;
        const mid = n / 2 - 0.5;
        list.forEach((item, i) => {
            const idx = mode === 'center'
                ? Math.floor(Math.abs(i - mid) + (n % 2 === 0 ? 1 : 0))
                : mode === 'end' ? n - 1 - i : i;
            item.style.setProperty(`--${cssPrefix}-index`, idx);
            item.style.setProperty('--global-index', item.dataset.globalIdx);
        });
    }
}

export default new SplitText();
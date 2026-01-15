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
        
        this._globalCharIdx = 0;
        this._globalWordIdx = 0;
        this._chars = [];
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

    refresh() {
        this.init();
    }

    _splitIfNeeded(el) {
        if (this.elMap.has(el)) return;
        
        const rawContent = el.textContent.trim();
        if (!rawContent) return;

        el.setAttribute('aria-label', rawContent);
        el.setAttribute('role', 'text');

        this._globalCharIdx = 0;
        this._globalWordIdx = 0;
        this._chars = [];
        this._wordWraps = [];

        const type = (el.dataset.splitText || 'both').toLowerCase();
        const mode = this._getSplitFrom(el);

        const fragment = this._processNodes(Array.from(el.childNodes), type);

        el.innerHTML = '';
        el.appendChild(fragment);

        this._assignIndices(this._chars, mode, 'char');
        this._assignIndices(this._wordWraps.map(w => w.querySelector('.word')), mode, 'word');

        if (type !== 'char') el.style.setProperty('--words', this._globalWordIdx);
        if (type !== 'word') el.style.setProperty('--chars', this._globalCharIdx);

        this.elMap.set(el, { type });
    }

    _processNodes(nodes, type) {
        const fragment = document.createDocumentFragment();

        nodes.forEach(node => {
            if (node.nodeType === 3) { 
                const words = node.textContent.split(/(\s+)/);
                words.forEach(word => {
                    if (!word.trim()) {
                        fragment.appendChild(document.createTextNode(word));
                        return;
                    }
                    const wrap = this._createWordSpan(word, type);
                    this._wordWraps.push(wrap);
                    fragment.appendChild(wrap);
                });
            } else if (node.nodeType === 1) { 
                const clone = node.cloneNode(false); 
                const children = Array.from(node.childNodes);
                clone.appendChild(this._processNodes(children, type));
                fragment.appendChild(clone);
            }
        });

        return fragment;
    }

    _createWordSpan(word, type) {
        const wrap = document.createElement('span');
        wrap.className = 'word-wrap';
        wrap.setAttribute('aria-hidden', 'true');
        
        const wordSpan = document.createElement('span');
        wordSpan.className = 'word';
        wordSpan.dataset.globalIdx = this._globalWordIdx++;

        if (type === 'char' || type === 'both') {
            for (const ch of word) {
                const c = document.createElement('span');
                c.className = 'char';
                c.textContent = ch;
                c.dataset.globalIdx = this._globalCharIdx++;
                wordSpan.appendChild(c);
                this._chars.push(c);
            }
        } else {
            wordSpan.textContent = word;
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
        if (n === 0) return;

        const mid = n / 2 - 0.5;
        list.forEach((item, i) => {
            if (!item) return;
            const idx = mode === 'center'
                ? Math.floor(Math.abs(i - mid) + (n % 2 === 0 ? 1 : 0))
                : mode === 'end' ? n - 1 - i : i;
            
            item.style.setProperty(`--${cssPrefix}-index`, idx);
            item.style.setProperty('--global-index', item.dataset.globalIdx);
        });
    }
}

export default new SplitText();
/**
 * Token types
 * @typedef {('deleted'|'err'|'var'|'section'|'kwd'|'class'|'cmnt'|'insert'|'type'|'func'|'bool'|'num'|'oper'|'str'|'esc')} Token
 */

class SyntaxHighlighter {
  /* ---------- private fields ---------- */
  _langs    = new Map();
  _expand   = Object.freeze({
    num:  { type: 'num',  match: /(?:\.|\b)\d(?:[eoxa-fA-F_\d.-]*\d|\b)/g },
    str:  { type: 'str',  match: /(["'])((?!\1)[^\\\r\n]|\\.)*(\1)?/g },
    strDQ:{ type: 'str',  match: /"([^"\\\r\n]|\\.)*(")?/g }
  });
  _htmlEscapes = Object.freeze({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' });
  _escapeRx   = /[&<>"']/g;
  _lineNumsCache = new Map();

  /* ---------- ctor ---------- */
  constructor() {
    this.highlightAll = this.highlightAll.bind(this);
    this.init();
  }

  init() { this.highlightAll(); }

  /* ---------- helpers ---------- */
  _escaper = m => this._htmlEscapes[m];
  _getLineNumbers(n) {
    if (!this._lineNumsCache.has(n)) {
      this._lineNumsCache.set(n, '<div></div>'.repeat(n));
    }
    return this._lineNumsCache.get(n);
  }

  /* ---------- language management ---------- */
  async loadLanguage(name, mod) {
    if (!mod?.default?.length) throw new TypeError(`Invalid language “${name}”`);
    this._langs.set(name, mod);
  }
  clearLanguageCache() { this._langs.clear(); }

  /* ---------- core tokenizer ---------- */
  async tokenize(src, lang, emit) {
    let data;
    if (typeof lang === 'string') {
      data = this._langs.get(lang);
      if (!data) {
        try {
          data = await import(`./languages/${lang}.js`);
          if (!data?.default) throw new Error(`Module “${lang}” lacks default export`);
          this._langs.set(lang, data);
        } catch (e) {
          console.error(`[SyntaxHighlighter] cannot load language “${lang}”`, e);
          return emit(src);
        }
      }
    } else {
      data = lang;
    }

    const rules = Array.isArray(data.sub) ? data.sub
                : Array.isArray(data.default) ? data.default : [];
    if (!rules.length) return emit(src);

    const compiled = rules.map(r => ({
      ...r,
      rule: r.expand ? this._expand[r.expand] : r,
      lastIndex: 0,
      done: false
    }));

    let pos = 0;
    const { length } = src;

    while (pos < length) {
      let bestRule = null, bestIdx = Infinity, bestText = '', bestEnd = 0;

      for (const c of compiled) {
        if (c.done) continue;
        const rx = c.rule.match;
        if (c.lastIndex < pos) rx.lastIndex = pos;
        const m = rx.exec(src);
        if (!m) { c.done = true; continue; }
        if (m.index < bestIdx) {
          bestRule = c; bestIdx = m.index; bestText = m[0]; bestEnd = rx.lastIndex;
        }
      }
      if (!bestRule) break;

      if (bestIdx > pos) emit(src.slice(pos, bestIdx), data.type);

      if (bestRule.sub) {
        const subLang = typeof bestRule.sub === 'function' ? bestRule.sub(bestText) : bestRule.sub;
        await this.tokenize(bestText, subLang, emit);
      } else {
        emit(bestText, bestRule.rule.type);
      }
      pos = bestEnd;
      bestRule.lastIndex = bestEnd;
    }
    if (pos < length) emit(src.slice(pos), data.type);
  }

  /* ---------- html generator ---------- */
  async highlightText(src, lang, multiline = true, opt = {}) {
    let html = '';
    await this.tokenize(src, lang, (text, type) =>
      html += type
        ? `<span class="${type}">${text.replace(this._escapeRx, this._escaper)}</span>`
        : text.replace(this._escapeRx, this._escaper)
    );

    const lineNums = multiline && opt.lineNumbers
      ? `<div class="numbers">${this._getLineNumbers(src.split('\n').length)}</div>`
      : '';
    const header = multiline
      ? `<div class="header"><span class="lang">${lang}</span>`
      + `<button class="copy" title="Copy Code" aria-label="Copy"></button></div>`
      : '';

    return multiline
      ? `${header}<div class="wrapper">${lineNums}<code class="code">${html}</code></div>`
      : `<div class="wrapper"><code class="code">${html}</code></div>`
      + `<button class="copy" title="Copy Code" aria-label="Copy"></button>`;
  }

  /* ---------- dom injector ---------- */
  async highlightElement(el, lang = el.dataset.codeLang, mode, opt) {
    const txt = el.textContent.trim();
    mode ??= txt.includes('\n') ? 'multiline' : 'oneline';
    el.classList.add('code-block', lang, mode, 'highlighted');
    el.innerHTML = await this.highlightText(txt, lang, mode === 'multiline', opt);
    const btn = el.querySelector('.copy');
    if (btn) btn.addEventListener('click', () => this._copy(btn, el.querySelector('.code')));
  }

  /* ---------- batch ---------- */
  async highlightAll(opt = {lineNumbers: true}) {
    return Promise.all(
      [...document.querySelectorAll('[data-code-lang]:not(.highlighted)')]
        .map(el => this.highlightElement(el, undefined, undefined, opt))
    );
  }

  /* ---------- clipboard ---------- */
  _copy(btn, codeEl) {
    navigator.clipboard.writeText(codeEl.textContent)
      .then(() => { btn.classList.add('copied'); setTimeout(()=>btn.classList.remove('copied'),2000); })
      .catch(() => btn.classList.add('failed'));
  }
}

export default new SyntaxHighlighter();
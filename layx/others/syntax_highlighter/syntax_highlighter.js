export class SyntaxHighlighter {
  constructor() {
    this._langs = {};
    this._escapeRx = /[&<>]/g;
    this._data = {
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
    };
    this._escaper = (m) => ({ '&': '&#38;', '<': '&lt;', '>': '&gt;' }[m]);

    this.highlightAll();
  }

  /* ---------- core tokenizer ---------- */
  async tokenize(src, lang, token) {
    try {
      let m, part, first = {}, match, cache = [], i = 0;
      const data = typeof lang === 'string'
        ? (await (this._langs[lang] ??= import(`./languages/${lang}.js`)))
        : lang;
      const arr = [...(typeof lang === 'string' ? data.default : lang.sub)];

      while (i < src.length) {
        first.index = null;
        for (m = arr.length; m-- > 0;) {
          part = arr[m].expand ? this._data[arr[m].expand] : arr[m];

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

          if (cache[m].match[0] && (cache[m].match.index <= first.index || first.index === null)) {
            first = {
              part: part,
              index: cache[m].match.index,
              match: cache[m].match[0],
              end: cache[m].lastIndex
            };
          }
        }

        if (first.index === null) break;

        token(src.slice(i, first.index), data.type);
        i = first.end;

        if (first.part.sub) {
          await this.tokenize(
            first.match,
            typeof first.part.sub === 'string'
              ? first.part.sub
              : (typeof first.part.sub === 'function' ? first.part.sub(first.match) : first.part),
            token
          );
        } else {
          token(first.match, first.part.type);
        }
      }
      token(src.slice(i, src.length), data.type);
    } catch {
      token(src);
    }
  }

  /* ---------- HTML generator ---------- */
  _getLineNumbers(count) {
    return '<div></div>'.repeat(count);
  }

  async highlightText(src, lang, multiline = true, opt = {}) {
    let html = '';
    await this.tokenize(src, lang, (text, type) =>
      html += type
        ? `<span class="${type}">${text.replace(this._escapeRx, this._escaper)}</span>`
        : text.replace(this._escapeRx, this._escaper)
    );

    const lineNums = multiline && opt.lineNumbers
      ? `<div class="numbers">${this._getLineNumbers((src.match(/\n/g) || []).length + 1)}</div>`
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

  /* ---------- DOM injector ---------- */
  async highlightElement(el, lang = el.dataset.codeLang, mode, opt) {
    const txt = el.textContent.trim();
    mode ??= txt.includes('\n') ? 'multiline' : 'oneline';
    el.classList.add('code-block', lang, mode, 'highlighted');
    el.innerHTML = await this.highlightText(txt, lang, mode === 'multiline', opt);

    const btn = el.querySelector('.copy');
    if (btn) {
      btn.addEventListener('click', () => this._copy(btn, el.querySelector('.code')));
    }
  }

  /* ---------- batch processing ---------- */
  async highlightAll(opt = { lineNumbers: true }) {
    return Promise.all(
      [...document.querySelectorAll('[data-code-lang]:not(.highlighted)')]
        .map(el => this.highlightElement(el, undefined, undefined, opt))
    );
  }

  /* ---------- clipboard ---------- */
  _copy(btn, codeEl) {
    navigator.clipboard.writeText(codeEl.textContent)
      .then(() => {
        btn.classList.add('copied');
        setTimeout(() => btn.classList.remove('copied'), 2000);
      })
      .catch(() => btn.classList.add('failed'));
  }

  /* ---------- language loader ---------- */
  loadLanguage(languageName, language) {
    this._langs[languageName] = language;
  }

  /* ---------- language pre-loader ---------- */
  async preLoadLanguages(...langNames) {
    await Promise.all(
      langNames.map(async (name) => {
        if (this._langs[name]) return;

        try {
          this._langs[name] = await import(`./languages/${name}.js`);
        } catch (err) {
          console.error(`Failed to load language: ${name}`, err);
        }
      })
    );
    return this;
  }
}

new SyntaxHighlighter();
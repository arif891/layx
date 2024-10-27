class CodeHighlighter {
  constructor() {
    this.languages = {

      js: this.compileLanguage([
        { type: 'control-flow', regex: /\b(if|else|for|while|do|switch|case|break|continue|default|return|yield)\b(?![-\w])/g },
        { type: 'declaration', regex: /\b(const|let|var|function|class|import|export|extends|implements|interface)\b(?![-\w])/g },
        { type: 'error-handling', regex: /\b(try|catch|finally|throw)\b(?![-\w])/g },
        { type: 'async', regex: /\b(async|await)\b(?![-\w])/g },
        { type: 'type', regex: /\b(typeof|instanceof|in|of|as)\b(?![-\w])/g },
        { type: 'object-oriented', regex: /\b(new|this|super|constructor|get|set|static)\b(?![-\w])/g },
        { type: 'boolean', regex: /\b(true|false)\b(?![-\w])/g },
        { type: 'null-undefined', regex: /\b(null|undefined|void)\b(?![-\w])/g },
        { type: 'string', regex: /(["'`])(?:\\(?:\r\n|[\s\S])|(?!\1)[^\\\r\n])*\1/g },
        { type: 'template-expression', regex: /\$\{(?:[^{}]|\{[^}]*\})*\}/g },
        { type: 'comment', regex: /\/\/.*|\/\*[\s\S]*?\*\//g },
        { type: 'number', regex: /\b(?:0[xX][0-9a-fA-F]+|0[bB][01]+|0[oO][0-7]+|\d*\.?\d+(?:[eE][+-]?\d+)?)\b/g },
        { type: 'regex', regex: /\/(?![*+?])(?:[^\r\n\[/\\]|\\.|\[(?:[^\r\n\]\\]|\\.)*\])+\/[gimyus]*/g },
        { type: 'function', regex: /\b[a-zA-Z_]\w*(?=\s*\()/g },
        { type: 'builtin', regex: /\b(console|Math|JSON|Date|Promise|Array|Object|String|Number|Boolean|Set|Map|Symbol|Error|RegExp|Int(?:8|16|32)Array|Uint(?:8|16|32|8Clamped)Array|Float(?:32|64)Array|BigInt|BigInt64Array|BigUint64Array)\b(?![-\w])/g },
        { type: 'identifier', regex: /\b[a-zA-Z_]\w*\b/g },
        { type: 'operator', regex: /(?:[-+*/%&|^!~=<>?:]=?|>>>=?|<<<?|\+\+?|--?|\?\??|\.\.\.|=>)/g },
        { type: 'punctuation', regex: /[{}[\](),.;:]/g },
      ]),

      html: this.compileLanguage([
        { type: 'doctype', regex: /<!(?:DOCTYPE|doctype)\s+html>/ },
        { type: 'comment', regex: /<!--[\s\S]*?-->/ },
        { type: 'punctuation', regex: /[</>]/ },
        { type: 'tag', regex: /\/?\w+(?=[>\s])/ },
        { type: 'attribute', regex: /\s([\w-]+)(?=\s*=)/ },
        { type: 'equals', regex: /=/ },
        { type: 'string', regex: /"[^"]*"|'[^']*'/ },
        { type: 'text', regex: /[^<>]+/ },
      ]),
      css: this.compileLanguage([
        { type: 'comment', regex: /\/\*[\s\S]*?\*\// },
        { type: 'atrule', regex: /\s*@[\w-]+/ },
        { type: 'selector', regex: /\b[a-zA-Z]+\b(?=\s*{)/ }, 
        { type: 'class', regex: /\.[\w-]+/ },
        { type: 'id', regex: /#[\w-]+/ },
        { type: 'property', regex: /[\w-]+(?=\s*:)/ },
        { type: 'value', regex: /:\s*[^;]+/ },
        { type: 'punctuation', regex: /[{()};]/ },
        { type: 'unit', regex: /\b\d+(px|em|rem|%|vh|vw|s|ms)\b/ },
        { type: 'color', regex: /#(?:[0-9a-fA-F]{3}){1,2}\b/ },
        { type: 'media-feature', regex: /\([\w-]+\s*:\s*[^)]+\)/ },
        { type: 'function', regex: /\burl(?=\()/ },
        { type: 'url', regex: /url\(([^)]+)\)/ },  
        { type: 'unknown', regex: /\S+/ },
    ]),
    batch: this.compileLanguage([
      { type: 'comment', regex: /^(\s*)(::|\s*REM\s|\/\/).*$/im }, 
      { type: 'program-name', regex: /\b(layx)\b/i }, 
      { type: 'program-command', regex: /\b(build|unbuild|create|optimage|install|uninstall)\b/i },
      { type: 'label', regex: /^\s*:\w+/m },
      { type: 'variable', regex: /%[^%\s]+%|\%\w+\%/g },
      { type: 'operator', regex: /\b(EQU|NEQ|LSS|LEQ|GTR|GEQ|NOT|AND|OR)\b/i },
      { type: 'keyword', regex: /\b(IF|ELSE|FOR|IN|DO|GOTO|CALL|EXIT|ECHO|SET|SETLOCAL|ENDLOCAL|PAUSE|SHIFT)\b/i },
      { type: 'string', regex: /"[^"]*"/g },
      { type: 'number', regex: /\b\d+\b/g },
      { type: 'path', regex: /\b([a-zA-Z]:\\(?:[^\\\/:*?"<>|\r\n]+\\)*[^\\\/:*?"<>|\r\n]*)/g },
      { type: 'parameter', regex: /%[0-9*]/ },
      { type: 'special-character', regex: /[&|<>^]/ },
      { type: 'punctuation', regex: /[()[\]{}]/g },
    ]),
    };

    this.defaultRules = [
      { type: 'whitespace', regex: /\s+/ },
      { type: 'unknown', regex: /\S+/ },
    ];

    this.init();
    this.addCopyButtons();
  }

  init() {
    this.highlightCodeElements();
  }

  addCopyButtons() {
    const codeElements = document.querySelectorAll('[data-code-lang][copy]');
    codeElements.forEach(element => {
      const button = document.createElement('button');
      button.className = 'copy-btn';
      button.addEventListener('click', () => this.copyToClipboard(element));
      
      element.appendChild(button);
    });
  }

  copyToClipboard(element) {
    const text = element.textContent;
    navigator.clipboard.writeText(text).then(() => {
      const button = element.querySelector('.copy-btn');
      button.classList.add('copied');
      setTimeout(() => {
        button.classList.remove('copied');
      }, 2000);
    }).catch(err => {
      console.error('Failed to copy text: ', err);
    });
  }

  compileLanguage(rules) {
    return rules.map(rule => ({
      type: rule.type,
      regex: new RegExp(rule.regex.source, 'g'),
    }));
  }

  escapeHtml(unsafe) {
    return unsafe.replace(/[&<>"']/g, char => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    }[char]));
  }

  unescapeHtml(escaped) {
    return escaped.replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'")
      .replace(/&amp;/g, '&');
  }

  tokenize(code, language) {
    const rules = [...(this.languages[language] || []), ...this.defaultRules];
    const tokens = [];
    let remaining = code;

    while (remaining) {
      let match = null;

      for (const rule of rules) {
        rule.regex.lastIndex = 0;
        const result = rule.regex.exec(remaining);
        if (result && result.index === 0) {
          match = { type: rule.type, value: result[0] };
          break;
        }
      }

      if (match) {
        tokens.push(match);
        remaining = remaining.slice(match.value.length);
      } else {
        tokens.push({ type: 'unknown', value: remaining[0] });
        remaining = remaining.slice(1);
      }
    }

    return tokens;
  }

  highlightSyntax(code, language) {
    const lines = code.split('\n');
    return lines
      .map(line => {
        const tokens = this.tokenize(line, language);
        return tokens
          .map(token => {
            const escapedValue = this.escapeHtml(token.value);
            if (token.type === 'whitespace') {
              return escapedValue;
            }
            return `<span class="${language}-${token.type}">${escapedValue}</span>`;
          })
          .join('');
      })
      .map(line => `<span class="line">${line}</span>`)
      .join('\n');
  }

  highlightNestedLanguages(html) {
    const styleRegex = /(&lt;style[^&gt;]*&gt;)([\s\S]*?)(&lt;\/style&gt;)/gi;
    const scriptRegex = /(&lt;script[^&gt;]*&gt;)([\s\S]*?)(&lt;\/script&gt;)/gi;

    html = html.replace(styleRegex, (match, openTag, content, closeTag) => {
      const highlightedCSS = this.highlightSyntax(this.unescapeHtml(content), 'css');
      return `${openTag}${highlightedCSS}${closeTag}`;
    });

    html = html.replace(scriptRegex, (match, openTag, content, closeTag) => {
      const highlightedJS = this.highlightSyntax(this.unescapeHtml(content), 'js');
      return `${openTag}${highlightedJS}${closeTag}`;
    });

    return html;
  }

  highlightHTML(code) {
    let highlighted = this.highlightSyntax(code, 'html');
    return this.highlightNestedLanguages(highlighted);
  }

  highlightCodeElements() {
    const codeElements = document.querySelectorAll('[data-code-lang]');
    codeElements.forEach(element => {
      const code = element.textContent;
      const language = element.getAttribute('data-code-lang');
      if (this.languages[language]) {
        if (language === 'html') {
          element.innerHTML = this.highlightHTML(code);
        } else {
          element.innerHTML = this.highlightSyntax(code, language);
        }
      }
    });
  }
}

export default new CodeHighlighter();
export {CodeHighlighter};
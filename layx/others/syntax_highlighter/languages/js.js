export default [
  {
    // JSDoc
    match: /\/\*\*((?!\*\/)[^])*(\*\/)?/g,
    sub: 'jsdoc'
  },
  {
    // Comments
    match: /\/\/.*\n?|\/\*((?!\*\/)[^])*(\*\/)?/g,
    sub: 'todo'
  },
  {
    expand: 'str'
  },
  {
    match: /((?<=([=:,(![?]|return|yield)\s*))\/((?!\/)[^\r\n\\]|\\.)+\/[dgimsuy]*/g,
    sub: 'regex'
  },
  {
    match: new class {
      exec(str) {
        let i = this.lastIndex;
        for (; i < str.length - 2; ++i) {
          if (str[i] === '$' && str[i + 1] === '{' && str[i - 1] !== '\\') {
            let start = i, depth = 1, j = i + 2;
            while (j < str.length && depth > 0) {
              if (str[j] === '\\') { j += 2; continue; }
              if (str[j] === '{') depth++;
              if (str[j] === '}') depth--;
              if (depth > 0) j++;
            }
            this.lastIndex = j + 1;
            return { index: start, 0: str.slice(start, j + 1) };
          }
        }
        return null;
      }
    }(),
    sub: [
      { type: 'kwd', match: /^\${|}$/g },
      { match: /(?!^\$|{)[^]+(?=}$)/g, sub: 'js' },
    ],
  },
  {
    match: /`([^\\`]|\\.)*`?/g,
    sub: 'js_template_literals'
  },
  {
    type: 'kwd',
    match: /=>|\b(this|set|get|as|async|await|break|case|catch|class|const|constructor|continue|debugger|default|delete|do|else|enum|export|extends|finally|for|from|function|if|implements|import|in|instanceof|interface|let|var|of|new|package|private|protected|public|return|static|super|switch|throw|throws|try|typeof|void|while|with|yield)\b/g
  },
  {
    type: 'var',
    match: /#[\w$_]+\b/g
  },
  {
    expand: 'num'
  },
  {
    type: 'num',
    match: /\b(0x[\da-fA-F]+|0b[01]+|\d+n?|[A-Z][A-Z_]*)\b/g
  },
  {
    type: 'bool',
    match: /\b(true|false|NaN|null|undefined)\b/g
  },
  {
    type: 'oper',
    match: /[/*+:?&|%^~=!,<>.^-]+/g
  },
  {
    type: 'class',
    match: /\b[A-Z][\w_]*\b/g
  },
  {
    type: 'func',
    match: /\b(constructor|[a-zA-Z$_][\w$_]*)(?=\s*((\?\.)?\s*\(|=\s*(\(?[\w,{}\[\])]+\)? =>|function\b)))/g
  }
];
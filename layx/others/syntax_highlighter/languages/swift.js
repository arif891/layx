export default [
  {
    type: 'kwd',
    match: /\b(import|class|struct|enum|func|let|var|if|else|for|while|return|switch|case|break|default|in|where|guard)\b/g
  },
  {
    type: 'type',
    match: /\b(Int|String|Double|Float|Bool|Array|Dictionary|Set|Optional|Void|Any)\b/g
  },
  {
    type: 'bool',
    match: /\b(true|false)\b/g
  },
  {
    type: 'num',
    match: /\b\d+(\.\d+)?\b/g
  },
  {
    type: 'str',
    match: /"(.*?)"/g
  },
  {
    type: 'cmnt',
    match: /\/\/(.*)/g
  },
  {
    type: 'cmnt',
    match: /\/\*[\s\S]*?\*\//g
  },
  {
    type: 'oper',
    match: /(\+|-|\*|\/|=|==|!=|<|>|<=|>=|&&|\|\||!|\+=|-=|\*=|\/=)/g
  },
  {
    type: 'func',
    match: /\b([a-zA-Z_][a-zA-Z0-9_]*)\(/g,
  }
];

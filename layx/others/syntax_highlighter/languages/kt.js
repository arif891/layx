export default [
  {
    type: 'kwd',
    match: /\b(package|import|class|interface|fun|val|var|if|else|for|while|return|when|break|continue|try|catch|finally|throw|object|companion|init|constructor|this|super)\b/g
  },
  {
    type: 'type',
    match: /\b(Int|String|Double|Float|Boolean|Long|Short|Byte|Char|Unit|Any)\b/g
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

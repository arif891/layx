export default [
  {
    type: 'kwd',
    match: /\b(package|import|class|interface|object|fun|val|var|constructor|init|this|super|typeof|as|is|in|out|by|get|set|where|if|else|when|try|catch|finally|for|do|while|throw|return|continue|break|null|true|false)\b/g
  },
  {
    type: 'type',
    match: /\b(Byte|Short|Int|Long|Float|Double|Boolean|Char|String|Array|List|Map|Set|Any|Unit|Nothing)\b/g
  },
  {
    expand: 'str'
  },
  {
    expand: 'num'
  },
  {
    type: 'cmnt',
    match: /\/\/.*|\/\*[\s\S]*?\*\//g
  },
  {
    type: 'oper',
    match: /(\+|-|\*|\/|=|==|!=|<|>|<=|>=|&&|\|\||!|\+=|-=|\*=|\/=|\?:|\?)/g
  },
  {
    type: 'func',
    match: /[a-zA-Z_]\w*(?=\s*\()/g
  }
];

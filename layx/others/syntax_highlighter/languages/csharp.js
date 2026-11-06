export default [
  {
    type: 'kwd',
    match: /\b(abstract|as|base|break|case|catch|checked|class|const|continue|default|delegate|do|else|enum|event|explicit|extern|finally|fixed|for|foreach|goto|if|implicit|in|interface|internal|is|lock|namespace|new|operator|out|override|params|private|protected|public|readonly|ref|return|sealed|sizeof|stackalloc|static|struct|switch|this|throw|try|typeof|unchecked|unsafe|using|virtual|void|volatile|while|add|alias|ascending|async|await|by|descending|dynamic|equals|from|get|global|group|into|join|let|nameof|not|notnull|on|orderby|partial|record|remove|select|set|unmanaged|value|var|when|where|with|yield)\b/g
  },
  {
    type: 'type',
    match: /\b(bool|byte|sbyte|char|decimal|double|float|int|uint|nint|nuint|long|ulong|short|ushort|object|string)\b/g
  },
  {
    type: 'bool',
    match: /\b(true|false|null)\b/g
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
    match: /(\+|-|\*|\/|=|==|!=|<|>|<=|>=|&&|\|\||!|\+=|-=|\*=|\/=|\?\?|\?)/g
  },
  {
    type: 'func',
    match: /[a-zA-Z_]\w*(?=\s*\()/g
  }
];

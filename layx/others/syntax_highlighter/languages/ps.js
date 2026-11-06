export default [
  {
    type: 'kwd',
    match: /\b(param|if|else|elseif|for|foreach|in|while|do|until|switch|default|break|continue|return|try|catch|finally|throw|trap|function|filter|workflow|class|enum|using)\b/gi
  },
  {
    type: 'var',
    match: /\$[a-zA-Z0-9_:]+/g
  },
  {
    expand: 'str'
  },
  {
    expand: 'num'
  },
  {
    type: 'cmnt',
    match: /#.*|<#[\s\S]*?#>/g
  },
  {
    type: 'oper',
    match: /(-eq|-ne|-gt|-ge|-lt|-le|-like|-notlike|-match|-notmatch|-replace|-contains|-notcontains|-in|-notin|-band|-bor|-bxor|-bnot|-and|-or|-xor|-not|!|=|\+|-|\*|\/)/gi
  },
  {
    type: 'func',
    match: /\b[A-Z][a-zA-Z0-9]*-[A-Z][a-zA-Z0-9]*\b/g
  }
];

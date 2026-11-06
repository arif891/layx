export default [
  {
    type: 'kwd',
    match: /\b(import|export|library|part of|part|class|extends|with|implements|mixin|enum|typedef|abstract|static|final|const|factory|operator|get|set|return|if|else|for|while|do|switch|case|default|break|continue|assert|try|catch|finally|throw|rethrow|async|await|yield|late|required)\b/g
  },
  {
    type: 'type',
    match: /\b(int|double|num|String|bool|List|Map|Set|dynamic|void|Object)\b/g
  },
  {
    type: 'bool',
    match: /\b(true|false)\b/g
  },
  {
    expand: 'num'
  },
  {
    expand: 'str'
  },
  {
    type: 'cmnt',
    match: /\/\/.*|\/\*[\s\S]*?\*\//g
  },
  {
    type: 'oper',
    match: /(\+|-|\*|\/|=|==|!=|<|>|<=|>=|&&|\|\||!|\+=|-=|\*=|\/=|\?\?)/g
  },
  {
    type: 'func',
    match: /[a-zA-Z_]\w*(?=\s*\()/g
  }
];

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
    type: 'num',
    match: /\b\d+(\.\d+)?\b/g
  },
  {
    type: 'str',
    match: /'(.*?)'|"(.*?)"/g
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
    match: /(\+|-|\*|\/|=|==|!=|<|>|<=|>=|&&|\|\||!|\+=|-=|\*=|\/=|\?\?)/g
  },
  {
    type: 'func',
    match: /\b([a-zA-Z_][a-zA-Z0-9_]*)\(/g,
  }
];

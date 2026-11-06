export default [
  {
    type: 'kwd',
    match: /\b(echo|print|function|return|if|else|elseif|for|foreach|while|switch|case|break|default|class|public|private|protected|static|new|extends|implements|use|namespace|include|require|include_once|require_once|global|isset|empty|unset|die|exit)\b/g
  },
  {
    type: 'type',
    match: /\b(string|int|float|bool|array|object|resource|null|void|mixed|callable|iterable)\b/g
  },
  {
    type: 'var',
    match: /\$\w+\b/g
  },
  {
    expand: 'str'
  },
  {
    expand: 'num'
  },
  {
    type: 'cmnt',
    match: /\/\/.*|\/\*[\s\S]*?\*\/|#.*/g
  },
  {
    type: 'oper',
    match: /(\+|-|\*|\/|=|==|!=|<|>|<=|>=|&&|\|\||\?|:|\.|\->)/g
  },
  {
    type: 'func',
    match: /[a-zA-Z_]\w*(?=\s*\()/g
  }
];

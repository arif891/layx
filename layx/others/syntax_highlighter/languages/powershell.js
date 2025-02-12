export default [
  {
    type: 'cmnt',
    match: /#.*$/gm
  },
  {
    type: 'str',
    match: /"(?:[^"\\]|\\.)*"/g
  },
  {
    type: 'kwd',
    match: /\b(if|else|elseif|foreach|while|function|return|param)\b/g
  },
  {
    type: 'var',
    match: /\$\w+\b/g
  },
  {
    type: 'func',
    match: /\b\w+(?=\s*\()/g
  },
  {
    type: 'num',
    match: /\b\d+\b/g
  },
  {
    type: 'oper',
    match: /[-+*/%<>=!&|]/g
  }
];

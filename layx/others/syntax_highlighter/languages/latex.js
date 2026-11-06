export default [
  {
    type: 'kwd',
    match: /\b(documentclass|usepackage|begin|end)\b/g
  },
  {
    type: 'func',
    match: /\b([a-zA-Z]+)\{/g
  },
  {
    type: 'cmnt',
    match: /%.*/g
  },
  {
    type: 'oper',
    match: /[+\-*\/=<>]/g
  },
  {
    type: 'str',
    match: /\{[^}]*\}/g
  },
  {
    type: 'num',
    match: /\b\d+(\.\d+)?\b/g
  }
];

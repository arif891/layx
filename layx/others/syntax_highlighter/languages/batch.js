export default [
  {
    type: 'kwd',
    match: /\b(echo|set|if|else|for|goto|call|exit|pause)\b/gi
  },
  {
    type: 'var',
    match: /%[a-zA-Z0-9_]+%/g
  },
  {
    type: 'str',
    match: /"(?:\\.|[^"])*"/g
  },
  {
    type: 'cmnt',
    match: /::.*/g
  },
  {
    type: 'cmnt',
    match: /rem .*/gi
  },
  {
    type: 'oper',
    match: /(=|==|!=|<|>|<=|>=)/g
  },
  {
    type: 'num',
    match: /\b\d+\b/g
  }
];

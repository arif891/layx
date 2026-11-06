export default [
  {
    type: 'kwd',
    match: /\b(echo|set|if|else|for|in|do|goto|call|exit|rem|cls|pause|shift|start|title|color|type|copy|del|move|ren|mkdir|rmdir|cd|dir)\b/gi
  },
  {
    type: 'var',
    match: /%[a-zA-Z0-9_]+%|%~?[a-zA-Z0-9_]+/g
  },
  {
    expand: 'str'
  },
  {
    type: 'cmnt',
    match: /::.*|rem\b.*/gi
  },
  {
    type: 'oper',
    match: /(@|==|!=|>|<|\||&|\^)/g
  }
];

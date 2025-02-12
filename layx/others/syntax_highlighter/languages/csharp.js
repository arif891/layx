export default [
  {
    type: 'kwd',
    match: /\b(using|namespace|class|public|static|void|string|int|bool|if|else|for|foreach|while|return|new|try|catch|finally|throw)\b/g
  },
  {
    type: 'type',
    match: /\b(Console|WriteLine|List|Dictionary|Exception|Task|Thread)\b/g
  },
  {
    type: 'str',
    match: /"(?:\\.|[^"])*"/g
  },
  {
    type: 'num',
    match: /\b\d+(\.\d+)?\b/g
  },
  {
    type: 'cmnt',
    match: /\/\/.*/g
  },
  {
    type: 'cmnt',
    match: /\/\*[\s\S]*?\*\//g
  },
  {
    type: 'oper',
    match: /(\+|-|\*|\/|=|==|!=|<|>|<=|>=|&&|\|\||\?|:)/g
  }
];

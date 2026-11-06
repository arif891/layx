export default [
  {
    type: 'kwd',
    match: /\b(associatedtype|class|deinit|enum|extension|fileprivate|func|import|init|inout|internal|let|open|operator|private|precedencegroup|protocol|public|rethrows|static|struct|subscript|typealias|var|break|case|catch|continue|default|defer|do|else|fallthrough|for|guard|if|in|repeat|return|throw|switch|where|while|as|Any|catch|false|is|nil|rethrows|super|self|Self|throws|true|try|async|await|actor)\b/g
  },
  {
    type: 'type',
    match: /\b(Int|Double|Float|String|Bool|Character|Optional|Array|Dictionary|Set|Void)\b/g
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

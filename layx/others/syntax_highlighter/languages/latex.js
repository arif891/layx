export default [
  {
    type: 'kwd',
    match: /\\(documentclass|usepackage|begin|end|section|subsection|subsubsection|paragraph|subparagraph|chapter|part|title|author|date|maketitle|tableofcontents|appendix|bibliography|bibliographystyle|cite|ref|label|pageref|include|input|newcommand|renewcommand|def)\b/g
  },
  {
    type: 'func',
    match: /\\[a-zA-Z]+/g
  },
  {
    type: 'cmnt',
    match: /%.*/g
  },
  {
    type: 'str',
    match: /\$[^$]+\$|\$\$[^$]+\$\$/g
  },
  {
    type: 'oper',
    match: /[{}\[\]]/g
  }
];

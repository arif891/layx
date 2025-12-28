export default [
	{
		// JSDoc
		match: /\/\*\*((?!\*\/)[^])*(\*\/)?/g,
		sub: 'jsdoc'
	},
	{
		// Comments
		match: /\/\/.*\n?|\/\*((?!\*\/)[^])*(\*\/)?/g,
		sub: 'todo'
	},
	{ expand: 'str' },
	{
		match: /((?<=([({[=:,!%&*+?|^~/<>\-]|return|yield|typeof|instanceof|in|void|case|delete|throw|do)\s*)|(?<=^\s*))\/((?:\\.|\[(?:\\.|[^\]\\\r\n])*\]|[^\/\\\r\n])+)\/[dgimsuy]*/gm,
		sub: 'regex'
	},
	{
		match: /`((?!`)[^]|\\[^])*`?/g,
		sub: 'js_template_literals'
	},
	{
		type: 'kwd',
		match: /=>|\b(this|set|get|as|async|await|break|case|catch|class|const|constructor|continue|debugger|default|delete|do|else|enum|export|extends|finally|for|from|function|if|implements|import|in|instanceof|interface|let|var|of|new|package|private|protected|public|return|static|super|switch|throw|throws|try|typeof|void|while|with|yield)\b(?!\s*:)/g
	},
	{
		type: 'var',
		match: /#[\w$_]+\b/g
	},
	{ expand: 'num' },
	{
		type: 'num',
		match: /\b(0x[\da-fA-F_]+|0b[01_]+|0o[0-7_]+|\d[\d_]*\.?\d*([eE][+-]?\d+)?n?|[A-Z][A-Z_]*)\b/g
	},
	{
		type: 'bool',
		match: /\b(true|false|NaN|null|undefined)\b/g
	},
	{
		type: 'oper',
		match: /[/*+:?&|%^~=!,<>.^-]+/g
	},
	{
		type: 'class',
		match: /\b[A-Z][\w_]*\b/g
	},
	{
		type: 'func',
		match: /\b([#*]*[a-zA-Z$_][\w$_]*)(?=\s*((\?\.)?\s*\(|=\s*(\(?[\w,{}\[\])]+\)? =>|function\b)))/g
	}
];
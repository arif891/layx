export default [
	{
		match: /\/\*((?!\*\/)[^])*(\*\/)?/g,
		sub: 'todo'
	},
	{
		expand: 'str'
	},
	{
		type: 'kwd',
		match: /@\w+\b|\b(and|not|only|or)\b/g
	},
	{
		type: 'var',
		match: /--[\w-]+/g
	},
	{
		type: 'var',
		match: /[\w-]+(?=\s*:(?!:))/g
	},
	{
		type: 'var',
		match: /&/g
	},
	{
		type: 'num',
		match: /#[\da-f]{3,8}\b/g
	},
	{
		type: 'num',
		match: /-?(?:\d+\.?\d*|\.\d+)(cm|mm|in|px|pt|pc|em|ex|ch|rem|vw|vh|vmin|vmax|%)?/g
	},
	{
		type: 'kwd',
		match: /(?<=^|[{};,\s&])(?:[a-z][\w-]*|#[\w-]+|\.[\w-]+|::?[\w-]+)(?=\s*(?:[{,>+~[\s]|$))/gm
	},
	{
		match: /url\([^)]*\)/g,
		sub: [
			{
				type: 'func',
				match: /url(?=\()/g
			},
			{
				type: 'str',
				match: /[^()]+/g
			}
		]
	},
	{
		type: 'func',
		match: /\b[a-zA-Z][\w-]*(?=\s*\()/g
	},
	{
		type: 'bool',
		match: /\b(auto|inherit|initial|unset|revert|none|normal|true|false|all|both|left|right|top|bottom|center|middle|start|end|flex-start|flex-end|space-between|space-around|space-evenly|baseline|stretch|block|inline|inline-block|flex|inline-flex|grid|inline-grid|table|inline-table|absolute|relative|fixed|sticky|static|visible|hidden|collapse|scroll|clip|ellipsis|wrap|nowrap|break-word|pre|pre-wrap|pre-line|bold|bolder|lighter|italic|oblique|underline|overline|line-through|uppercase|lowercase|capitalize|solid|dashed|dotted|double|groove|ridge|inset|outset|transparent|currentColor|white|black|red|green|blue|yellow|orange|purple|pink|gray|grey|brown|cyan|magenta|silver|gold)\b/g
	}
]

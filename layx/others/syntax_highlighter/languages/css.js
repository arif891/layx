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
		match: /@[\w-]+\b|\b(and|not|only|or|from|to)\b/g
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
		match: /#[\da-fA-F]{3,8}\b/gi
	},
	{
		type: 'num',
		match: /-?(?:\d+\.?\d*|\.\d+)(cm|mm|in|px|pt|pc|em|ex|ch|rem|vw|vh|vmin|vmax|%|deg|rad|grad|turn|s|ms|fr|dpi|dpcm|dppx|q|lh|rlh|vi|vb|cqw|cqh|cqi|cqb|cqmin|cqmax|dvw|dvh|lvw|lvh|svw|svh)\b/gi
	},
	{
		type: 'num',
		match: /-?(?:\d+\.?\d*|\.\d+)(?!\w)/g
	},
	{
		type: 'kwd',
		match: /(?<=^|[{};,\s&])(?:[a-z][\w-]*|#[\w-]+|\.[\w-]+|::?[\w-]+|\[[\w-]+[~|^$*]?=?[^\]]*\]|\*|>|\+|~)(?=\s*(?:[{,>+~[\s]|$))/gm
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
		match: /\b(auto|inherit|initial|unset|revert|revert-layer|none|normal|all|both|transparent|currentColor)\b/g
	},
	{
		type: 'bool',
		match: /\b(true|false)\b/g
	},
	{
		type: 'bool',
		match: /\b(block|inline|inline-block|flex|inline-flex|grid|inline-grid|subgrid|contents|table|inline-table|list-item|run-in|ruby|ruby-base|ruby-text|ruby-base-container|ruby-text-container|flexbox|inline-flexbox)\b/g
	},
	{
		type: 'bool',
		match: /\b(absolute|relative|fixed|sticky|static|fixed)\b/g
	},
	{
		type: 'bool',
		match: /\b(left|right|top|bottom|center|middle|start|end|flex-start|flex-end|space-between|space-around|space-evenly|baseline|stretch)\b/g
	},
	{
		type: 'bool',
		match: /\b(bold|bolder|lighter|italic|oblique|underline|overline|line-through|uppercase|lowercase|capitalize|pre|pre-wrap|pre-line|nowrap|wrap|break-word|clip|ellipsis)\b/g
	},
	{
		type: 'bool',
		match: /\b(white|black|red|green|blue|yellow|orange|purple|pink|gray|grey|brown|cyan|magenta|silver|gold)\b/g
	},
	{
		type: 'bool',
		match: /\b(solid|dashed|dotted|double|groove|ridge|inset|outset|hidden)\b/g
	}
]

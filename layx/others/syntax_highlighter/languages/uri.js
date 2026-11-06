/**
 * @name URI
 */
export default /** @satisfies {import('../index.js').ShjGrammar} */ ([
	{
		match: /^#.*/gm,
		type: 'cmnt',
		sub: 'todo'
	},
	{
		type: 'class',
		match: /^\w+(?=:)/gm
	},
	{
		type: 'num',
		match: /:\d+/g
	},
	{
		type: 'oper',
		match: /[:/&?]|\w+=/g
	},
	{
		type: 'func',
		match: /[.\w]+@|#[\w]+$/gm
	},
	{
		type: 'var',
		match: /\w+\.\w+(\.\w+)*/g
	}
]);

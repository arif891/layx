/**
 * @name Brainfuck
 * @support increment, operator, print, comment
 */
export default /** @satisfies {import('../index.js').ShjGrammar} */ ([
	{
		match: /[^,\[\->+.<\]\s].*/g,
		type: 'cmnt',
		sub: 'todo'
	},
	{
		type: 'func',
		match: /\.+/g
	},
	{
		type: 'kwd',
		match: /[<>]+/g
	},
	{
		type: 'oper',
		match: /[+-]+/g
	}
]);

/**
 * @name CSV
 * @support punctuation, ...
 */
export default /** @satisfies {import('../index.js').ShjGrammar} */ ([
	{
		expand: 'strDouble'
	},
	{
		type: 'oper',
		match: /,/g
	}
]);

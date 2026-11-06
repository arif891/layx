/**
 * @name Git
 * @support comment, insert, deleted, string, ...
 */

import diff from './diff.js';

export default /** @satisfies {import('../index.js').ShjGrammar} */ ([
	{
		match: /^#.*/gm,
		type: 'cmnt',
		sub: 'todo'
	},
	{
		expand: 'str'
	},
	...diff,
	{
		type: 'func',
		match: /^(\$ )?git(\s.*)?$/gm
	},
	{
		type: 'kwd',
		match: /^commit \w+$/gm
	}
]);

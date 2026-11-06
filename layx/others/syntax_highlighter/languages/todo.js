/**
 * @name TODO
 */
export default /** @satisfies {import('../index.js').ShjLanguageData} */ ({
	type: 'cmnt',
	sub: [
	{
		type: 'err',
		match: /\b(TODO|FIXME|DEBUG|OPTIMIZE|WARNING|XXX|BUG)\b/g
	},
	{
		type: 'class',
		match: /\bIDEA\b/g
	},
	{
		type: 'insert',
		match: /\b(CHANGED|FIX|CHANGE)\b/g
	},
	{
		type: 'oper',
		match: /\bQUESTION\b/g
	}
]});

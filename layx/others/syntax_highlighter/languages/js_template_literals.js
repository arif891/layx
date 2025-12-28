export default [
	{
		match: new class {
			exec(str) {
				let i = this.lastIndex;
				for (; i < str.length - 2; ++i) {
					if (str[i] === '$' && str[i + 1] === '{' && str[i - 1] !== '\\') {
						let start = i, depth = 1, j = i + 2;
						while (j < str.length && depth > 0) {
							if (str[j] === '\\') { j += 2; continue; }
							if (str[j] === '{') depth++;
							if (str[j] === '}') depth--;
							if (depth > 0) j++;
						}
						this.lastIndex = j + 1;
						return { index: start, 0: str.slice(start, j + 1) };
					}
				}
				return null;
			}
		}(),
		sub: [
			{ type: 'kwd', match: /^\${|}$/g },
			{ match: /(?!^\$|{)[^]+(?=}$)/g, sub: 'js' },
		],
	},
];
export let type = 'str';

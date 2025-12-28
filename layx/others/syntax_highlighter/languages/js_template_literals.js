export default [
	{
		match: new class {
			exec(str) {
				let i = this.lastIndex;
				for (; i < str.length - 2; ++i) {
					if (str[i] === '$' && str[i + 1] === '{' && str[i - 1] !== '\\') {
						let start = i, depth = 1, j = i + 2;
						let inString = null;

						while (j < str.length && depth > 0) {
							const char = str[j];
							if (char === '\\') { j += 2; continue; }

							if (!inString && (char === "'" || char === '"' || char === '`' || char === '/')) {
								inString = char;
							} else if (inString === char) {
								inString = null;
							}

							if (!inString) {
								if (char === '{') depth++;
								if (char === '}') depth--;
							}

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

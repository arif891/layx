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
							const char = str[j], next = str[j + 1];
							if (char === '\\') { j += 2; continue; }
							if (!inString) {
								if (char === '/' && next === '/') { inString = '//'; j++; }
								else if (char === '/' && next === '*') { inString = '/*'; j++; }
								else if (char === "'" || char === '"' || char === '`') inString = char;
								else if (char === '{') depth++;
								else if (char === '}') depth--;
							} else {
								if (inString === '//' && char === '\n') inString = null;
								else if (inString === '/*' && char === '*' && next === '/') { inString = null; j++; }
								else if (inString === char) inString = null;
							}
							if (depth > 0) j++;
						}
						if (depth === 0) j++;
						this.lastIndex = j;
						return { index: start, 0: str.slice(start, j) };
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

export default [
	{
		match: new class {
			exec(str) {
				const skipComment = (s, pos) => {
					if (s[pos + 1] === '/') return s.indexOf('\n', pos + 2) + 1 || s.length;
					let end = s.indexOf('*/', pos + 2);
					return end === -1 ? s.length : end + 2;
				};
				const skipString = (s, pos, quote) => {
					for (let i = pos + 1; i < s.length; i++) {
						if (s[i] === '\\') i++;
						else if (s[i] === quote) return i + 1;
					}
					return s.length;
				};
				const skipRegex = (s, pos) => {
					let rx = /^\/(?:\\.|\[(?:\\.|[^\]\\\r\n])*\]|[^\/\\\r\n])+\/[dgimsuy]*/.exec(s.slice(pos));
					return rx ? pos + rx[0].length : pos + 1;
				};
				const skipTemplate = (s, pos) => {
					let j = pos + 1, depth = 0;
					while (j < s.length) {
						if (s[j] === '\\') { j += 2; continue; }
						if (depth === 0) {
							if (s[j] === '`') return j + 1;
							if (s[j] === '$' && s[j + 1] === '{') { depth = 1; j++; }
						} else {
							if (s[j] === '/' && (s[j + 1] === '/' || s[j + 1] === '*')) j = skipComment(s, j) - 1;
							else if (s[j] === '/') {
								let k = j - 1;
								while (k >= 0 && /\s/.test(s[k])) k--;
								let context = s.slice(Math.max(0, k - 10), k + 1);
								if (k < 0 || "({[=:,!%&*+?|^~/<>".includes(s[k]) || /\b(return|yield|typeof|instanceof|in|void|case|delete|throw|do)$/.test(context)) j = skipRegex(s, j) - 1;
							}
							else if ("'\"".includes(s[j])) j = skipString(s, j, s[j]) - 1;
							else if (s[j] === '`') j = skipTemplate(s, j) - 1;
							else if (s[j] === '{') depth++;
							else if (s[j] === '}') depth--;
						}
						j++;
					}
					return j;
				};
				let i = this.lastIndex;
				for (; i < str.length - 2; ++i) {
					if (str[i] === '$' && str[i + 1] === '{' && str[i - 1] !== '\\') {
						let start = i, depth = 1, j = i + 2;
						while (j < str.length && depth > 0) {
							const char = str[j];
							if (char === '\\') { j += 2; continue; }
							if (char === '/' && (str[j + 1] === '/' || str[j + 1] === '*')) j = skipComment(str, j) - 1;
							else if (char === '/') {
								let k = j - 1;
								while (k >= 0 && /\s/.test(str[k])) k--;
								let context = str.slice(Math.max(0, k - 10), k + 1);
								if (k < 0 || "({[=:,!%&*+?|^~/<>".includes(str[k]) || /\b(return|yield|typeof|instanceof|in|void|case|delete|throw|do)$/.test(context)) j = skipRegex(str, j) - 1;
							}
							else if ("'\"".includes(char)) j = skipString(str, j, char) - 1;
							else if (char === '`') j = skipTemplate(str, j) - 1;
							else if (char === '{') depth++;
							else if (char === '}') depth--;
							j++;
						}
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

export default [
	{
		match: new class {
    exec(str) {
        let i = this.lastIndex;
        if (i >= str.length) return null;

        // Look for the start of an interpolation: ${
        for (; i < str.length - 2; ++i) {
            // Check for ${ but ensure it's not escaped by a backslash
            if (str[i] === '$' && str[i + 1] === '{' && str[i - 1] !== '\\') {
                let start = i;
                let depth = 1;
                let j = i + 2;

                // Move forward until we find the matching closing brace }
                while (j < str.length && depth > 0) {
                    if (str[j] === '\\') {
                        j += 2; // Skip escaped characters
                        continue;
                    }
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
			{
				type: 'kwd',
				match: /^\${|}$/g
			},
			{
				match: /(?!^\$|{)[^]+(?=}$)/g,
				sub: 'js'
			},
		],
	},
];
export let type = 'str';

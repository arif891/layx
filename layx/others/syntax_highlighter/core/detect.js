/**
 * Detect – Language Auto-Detection & Alias Normalization
 */

const ALIASES = {
    javascript: 'js',
    ecmascript: 'js',
    jsx: 'js',
    mjs: 'js',
    cjs: 'js',
    typescript: 'ts',
    tsx: 'ts',
    python: 'py',
    py3: 'py',
    markdown: 'md',
    rust: 'rs',
    'c++': 'cpp',
    'c#': 'csharp',
    cs: 'csharp',
    sh: 'bash',
    shell: 'bash',
    zsh: 'bash',
    yml: 'yaml',
    dockerfile: 'docker',
    makefile: 'make',
    golang: 'go',
    text: 'plain',
    txt: 'plain',
};

/**
 * Normalize language alias to standard identifier
 * @param {string} lang
 * @returns {string}
 */
function normalizeLang(lang) {
    if (!lang || typeof lang !== 'string') return 'plain';
    const clean = lang.trim().toLowerCase();
    return ALIASES[clean] || clean;
}

/**
 * Feature scoring table for language detection
 */
const DETECT_FEATURES = {
    bash: [
        [/#!(\/usr)?\/bin\/bash/g, 500],
        [/\b(if|elif|then|fi|echo)\b|\$/g, 10],
    ],
    html: [
        [/<\/?[a-z-]+[^\n>]*>/g, 10],
        [/^\s*<!DOCTYPE\s+html/gi, 500],
    ],
    http: [
        [/^(GET|HEAD|POST|PUT|DELETE|PATCH|HTTP)\b/g, 500],
    ],
    js: [
        [/\b(console|await|async|function|export|import|this|class|for|let|const|require|document|window)\b/g, 10],
        [/=>\s*[{'"`\w]/g, 15],
    ],
    ts: [
        [/\b(interface|namespace|type|implements|declare|readonly|enum)\b/g, 20],
        [/:\s*(string|number|boolean|any|void|unknown|never)\b/g, 25],
    ],
    py: [
        [/\b(def|return|print|class|import|from|self|asyncio|pass|True|False|None|elif|else|__init__)\b/g, 15],
        [/def\s+\w+\s*\(/g, 50],
        [/:\s*$/gm, 10],
    ],
    sql: [
        [/\b(SELECT|INSERT|FROM|WHERE|JOIN|GROUP BY|ORDER BY|UPDATE|DELETE)\b/gi, 30],
    ],
    css: [
        [/^(@import|@page|@media|@keyframes|(\.|#)[a-z_][a-z0-9_-]*\s*\{)/gim, 20],
        [/:\s*[^;\n]+;/g, 10],
    ],
    json: [
        [/^\s*[\{\[]/g, 20],
        [/"[a-zA-Z0-9_-]+"\s*:\s*(".*?"|\d+|true|false|null|[\{\[])/g, 30],
    ],
    yaml: [
        [/^([a-zA-Z0-9_-]+):\s*(.*)$/gm, 15],
    ],
    diff: [
        [/^[+><-]/gm, 10],
        [/^@@\s*[-+,0-9 ]+\s*@@/gm, 50],
    ],
    md: [
        [/^(>|\t\*|\t\d+\.)/gm, 10],
        [/\[.*?\]\(.*?\)/g, 20],
        [/^#{1,6}\s+/gm, 25],
    ],
    c: [
        [/#include\b|\bprintf\s*\(/g, 100],
    ],
    cpp: [
        [/#include\b|\bstd::\w+|\bcout\b/g, 100],
    ],
    rs: [
        [/^\s*(use|fn|mut|match|impl)\b/gm, 100],
    ],
    go: [
        [/\b(func|fmt|package)\b/g, 100],
    ],
    java: [
        [/^import\s+java/gm, 500],
        [/\bpublic\s+(static\s+)?(class|void)\b/g, 100],
    ],
    docker: [
        [/^(FROM|ENTRYPOINT|RUN|CMD|WORKDIR|COPY|EXPOSE)\b/gm, 500],
    ],
    xml: [
        [/^<\?xml/gi, 500],
        [/<\/?[a-z-]+[^\n>]*>/g, 10],
    ],
};

/**
 * Automatically detect code language by heuristic scoring
 * @param {string} code
 * @returns {string} Detected language code (defaults to 'plain')
 */
function detectLanguage(code) {
    if (!code || typeof code !== 'string') return 'plain';

    const scores = Object.entries(DETECT_FEATURES).map(([lang, features]) => {
        let total = 0;
        for (const [regex, weight] of features) {
            regex.lastIndex = 0;
            const matches = code.match(regex);
            if (matches) total += matches.length * weight;
        }
        return [lang, total];
    });

    scores.sort((a, b) => b[1] - a[1]);
    const [bestLang, bestScore] = scores[0] || [];

    return bestScore > 20 ? bestLang : 'plain';
}

export { normalizeLang, detectLanguage, ALIASES };

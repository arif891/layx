import path from 'node:path';
import fs from 'node:fs/promises';

export { processHtmlFiles };

const DEFAULT_EXCLUDES = ['node_modules', '.git', '.vscode', 'template', 'scratch', 'dist'];

async function processHtmlFiles(startPath = './', mode = 'comment', exclude = DEFAULT_EXCLUDES) {
    async function* findHtmlFiles(dir) {
        let entries;
        try {
            entries = await fs.readdir(dir, { withFileTypes: true });
        } catch {
            return;
        }

        for (const entry of entries) {
            if (exclude.includes(entry.name)) continue;

            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                yield* findHtmlFiles(fullPath);
            } else if (entry.isFile() && path.extname(entry.name) === '.html') {
                yield fullPath;
            }
        }
    }

    // Flexible regex supporting single/double quotes, optional whitespace, and self-closing tags
    const patterns = {
        comment: [
            {
                from: /<link\s+[^>]*href=["']\/layx\/layx\.css["'][^>]*>/gi,
                to: '<!--<link rel="stylesheet" href="/layx/layx.css">-->'
            },
            {
                from: /<script\s+[^>]*src=["']\/layx\/layx\.js["'][^>]*><\/script>/gi,
                to: '<!--<script src="/layx/layx.js" type="module"></script>-->'
            }
        ],
        uncomment: [
            {
                from: /<!--\s*<link\s+[^>]*href=["']\/layx\/layx\.css["'][^>]*>\s*-->/gi,
                to: '<link rel="stylesheet" href="/layx/layx.css">'
            },
            {
                from: /<!--\s*<script\s+[^>]*src=["']\/layx\/layx\.js["'][^>]*><\/script>\s*-->/gi,
                to: '<script src="/layx/layx.js" type="module"></script>'
            }
        ]
    };

    async function processFile(filePath) {
        let content = await fs.readFile(filePath, 'utf8');
        let modified = false;

        for (const { from, to } of patterns[mode]) {
            const newContent = content.replace(from, to);
            if (newContent !== content) {
                content = newContent;
                modified = true;
            }
        }

        if (modified) {
            await fs.writeFile(filePath, content, 'utf8');
            console.log(`${mode === 'comment' ? 'Commented' : 'Uncommented'} LayX entries in ${filePath}`);
        }
    }

    for await (const filePath of findHtmlFiles(startPath)) {
        await processFile(filePath);
    }
}

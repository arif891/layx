import path from 'node:path';
import fs from 'node:fs/promises';
import { extractUrls } from './image-optimizer.js';

export { processHtmlFiles, removeLayxEntries, updateImageUrlsInHtml };

const DEFAULT_EXCLUDES = ['node_modules', '.git', '.vscode', 'template', 'scratch', 'dist', 'layx'];

function removeLayxEntries(content) {
    const linkLineRegex = /^[ \t]*<link\s+[^>]*href=["'](?:\.?\/)?layx\/layx\.css(?:\?[^"']*)?["'][^>]*\/?>\r?\n?/gim;
    const linkInlineRegex = /<link\s+[^>]*href=["'](?:\.?\/)?layx\/layx\.css(?:\?[^"']*)?["'][^>]*\/?>/gi;
    const scriptLineRegex = /^[ \t]*<script\s+[^>]*src=["'](?:\.?\/)?layx\/layx\.js(?:\?[^"']*)?["'][^>]*>(?:<\/script\s*>)?\r?\n?/gim;
    const scriptInlineRegex = /<script\s+[^>]*src=["'](?:\.?\/)?layx\/layx\.js(?:\?[^"']*)?["'][^>]*>(?:<\/script\s*>)?/gi;

    return content
        .replace(linkLineRegex, '')
        .replace(linkInlineRegex, '')
        .replace(scriptLineRegex, '')
        .replace(scriptInlineRegex, '');
}

function updateImageUrlsInHtml(content, optimizer) {
    if (!optimizer) return content;
    const urls = extractUrls(content, 'html');
    for (const url of urls) {
        const optimizedUrl = url.replace(/\.(png|jpg|jpeg)$/i, `.${optimizer}`);
        content = content.replaceAll(url, optimizedUrl);
    }
    return content;
}

async function processHtmlFiles(startPath = './', outDir = null, options = {}) {
    const optimizer = options.optimizer || null;
    const exclude = [...DEFAULT_EXCLUDES, ...(options.exclude || [])];
    if (outDir) {
        exclude.push(path.basename(outDir));
    }

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

    for await (const filePath of findHtmlFiles(startPath)) {
        let content = await fs.readFile(filePath, 'utf8');

        // 1. Remove layx.css and layx.js completely
        content = removeLayxEntries(content);

        // 2. Update image URLs if raster optimizer active
        if (optimizer) {
            content = updateImageUrlsInHtml(content, optimizer);
        }

        if (outDir) {
            // Write directly to destination directory, keeping source file untouched!
            const relPath = path.relative(startPath, filePath);
            const destPath = path.join(outDir, relPath);
            await fs.mkdir(path.dirname(destPath), { recursive: true });
            await fs.writeFile(destPath, content, 'utf8');
            console.log(`Transformed HTML: ${relPath} -> ${path.join(path.basename(outDir), relPath)}`);
        }
    }
}

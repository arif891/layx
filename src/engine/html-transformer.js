import path from 'node:path';
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extractUrls } from './image-optimizer.js';

export {
    processHtmlFiles,
    removeLayxEntries,
    updateImageUrlsInHtml,
    removePagesFromLinks,
    checkPagesCollision,
    copyPagesNonHtmlFiles
};

const DEFAULT_EXCLUDES = ['node_modules', '.git', '.vscode', 'template', 'scratch', 'dist', 'layx'];

/**
 * Checks if any files or folders inside pages/ collide with existing files or folders at project root.
 * Fails the build if a collision is detected.
 */
async function checkPagesCollision(rootDir, pagesDir) {
    if (!existsSync(pagesDir)) return;

    async function* getEntries(dir, base = '') {
        const items = await fs.readdir(dir, { withFileTypes: true });
        for (const item of items) {
            if (item.name === '.gitkeep') continue;
            const rel = base ? path.join(base, item.name) : item.name;
            yield { name: item.name, rel, isDir: item.isDirectory() };
            if (item.isDirectory()) {
                yield* getEntries(path.join(dir, item.name), rel);
            }
        }
    }

    for await (const { rel, isDir } of getEntries(pagesDir)) {
        const rootPath = path.join(rootDir, rel);
        if (existsSync(rootPath)) {
            const type = isDir ? 'folder' : 'file';
            const rootStat = await fs.stat(rootPath);
            const rootType = rootStat.isDirectory() ? 'folder' : 'file';
            throw new Error(`Build failed: Collision detected. "pages/${rel.replace(/\\/g, '/')}" (${type}) conflicts with existing ${rootType} at root ("${rel.replace(/\\/g, '/')}").`);
        }
    }
}

/**
 * Copies non-HTML files and folders from pages/ directly to the root of outDir.
 */
async function copyPagesNonHtmlFiles(pagesDir, outDir) {
    if (!existsSync(pagesDir)) return;

    async function* getNonHtmlFiles(dir) {
        let items;
        try {
            items = await fs.readdir(dir, { withFileTypes: true });
        } catch {
            return;
        }

        for (const item of items) {
            if (item.name === '.gitkeep') continue;
            const fullPath = path.join(dir, item.name);
            if (item.isDirectory()) {
                yield* getNonHtmlFiles(fullPath);
            } else if (item.isFile() && path.extname(item.name) !== '.html') {
                yield fullPath;
            }
        }
    }

    for await (const file of getNonHtmlFiles(pagesDir)) {
        const relPath = path.relative(pagesDir, file);
        const dest = path.join(outDir, relPath);
        await fs.mkdir(path.dirname(dest), { recursive: true });
        await fs.copyFile(file, dest);
    }
}

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

function removePagesFromLinks(content) {
    // 1. In HTML attributes: href, src, action
    content = content.replace(
        /\b(href|src|action)=([`"'])(?:\.\.\/|\.\/|\/)?pages(?:\/([^`"']*))?\2/gi,
        (match, attr, quote, rest = '') => {
            if (match.includes('="./pages')) {
                return `${attr}=${quote}./${rest}${quote}`;
            } else if (match.includes('="pages') || match.includes("='pages")) {
                return `${attr}=${quote}${rest}${quote}`;
            } else {
                return `${attr}=${quote}/${rest}${quote}`;
            }
        }
    );

    // 2. In quoted strings (JS / CSS):
    content = content.replace(
        /(['"`])(?:\/|\.\/|\.\.\/)pages(?:\/([^'"`]*))?\1/g,
        (match, quote, rest = '') => {
            if (match.startsWith(`${quote}./`)) {
                return `${quote}./${rest}${quote}`;
            } else {
                return `${quote}/${rest}${quote}`;
            }
        }
    );

    return content;
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

    const pagesDir = path.resolve(startPath, 'pages');

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

        // 2. Remove /pages/ from links (since pages/ is moved to root)
        content = removePagesFromLinks(content);

        // 3. Update image URLs if raster optimizer active
        if (optimizer) {
            content = updateImageUrlsInHtml(content, optimizer);
        }

        if (outDir) {
            const resolvedFile = path.resolve(filePath);
            const isInsidePages = resolvedFile.startsWith(pagesDir + path.sep);

            let relPath;
            if (isInsidePages) {
                // Flatten pages/ into the root of outDir (e.g. pages/other.html -> dist/other.html)
                relPath = path.relative(pagesDir, filePath);
            } else {
                relPath = path.relative(startPath, filePath);
            }

            const destPath = path.join(outDir, relPath);
            await fs.mkdir(path.dirname(destPath), { recursive: true });
            await fs.writeFile(destPath, content, 'utf8');
            console.log(`Transformed HTML: ${path.relative(startPath, filePath)} -> ${path.join(path.basename(outDir), relPath)}`);
        }
    }
}

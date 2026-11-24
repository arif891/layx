import path from 'node:path';
import { getFilesWithExtension, readFile, writeFile } from '../utils/fs.js';
import { minify } from '../utils/helpers.js';
import { projectPaths } from '../core/paths.js';
import pc from 'picocolors';

export { purgeUnusedSvgSymbols, isSymbolUsed, parseSvgSymbols, stripComments };

/**
 * Parses all `<symbol>` tags from SVG content.
 * @param {string} svgContent
 * @returns {Array<{ id: string, raw: string, attrs: string, innerContent: string, isEmpty: boolean }>}
 */
function parseSvgSymbols(svgContent) {
    const symbolRegex = /<symbol\b([^>]*?)(?:>([\s\S]*?)<\/symbol>|\/>)/gi;
    const symbols = [];
    let match;

    while ((match = symbolRegex.exec(svgContent)) !== null) {
        const fullMatch = match[0];
        const attrs = match[1];
        const innerContent = match[2] || '';

        const idMatch = attrs.match(/\bid=["']([^"']+)["']/i);
        if (idMatch) {
            symbols.push({
                id: idMatch[1],
                raw: fullMatch,
                attrs,
                innerContent,
                isEmpty: !innerContent.trim()
            });
        }
    }

    return symbols;
}

/**
 * Strips HTML and JavaScript comments so commented-out references do not preserve dead symbols.
 * @param {string} content
 * @returns {string}
 */
function stripComments(content) {
    return content
        .replace(/<!--[\s\S]*?-->/g, '')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/(?<!:)\/\/[^\r\n]*/g, '');
}

/**
 * Checks whether an SVG symbol ID is referenced in the codebase.
 * @param {string} symbolId
 * @param {string} content
 * @returns {boolean}
 */
function isSymbolUsed(symbolId, content) {
    if (!symbolId) return false;
    const escaped = symbolId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // 1. Fragment reference: #symbolId followed by non-identifier character or end of string
    const fragmentRegex = new RegExp(`#${escaped}(?![a-zA-Z0-9_-])`, 'i');
    if (fragmentRegex.test(content)) return true;

    // 2. Exact match inside quotes
    const quotedRegex = new RegExp(`['"\`]${escaped}['"\`]`);
    if (quotedRegex.test(content)) return true;

    return false;
}

/**
 * Scans all HTML and JS files in the project and purges unused `<symbol>` definitions from SVG sprites.
 * When outDir / outImage is provided, directly outputs to the target directory without touching source files.
 * @param {object} [options]
 * @returns {Promise<void>}
 */
async function purgeUnusedSvgSymbols(options = {}) {
    const root = options.root || projectPaths.root;
    const imagesDir = options.image || projectPaths.image;
    const outImageDir = options.outImage || (options.outDir ? path.join(options.outDir, 'assets/image') : null);

    let svgFiles = [];
    try {
        svgFiles = await getFilesWithExtension(imagesDir, 'svg', true);
    } catch {
        return;
    }

    if (svgFiles.length === 0) return;

    // Scan all user HTML and JS files in root
    const excludeDirs = ['layx', 'node_modules', '.git', 'scratch', 'original_images_dir', 'dist'];
    if (options.outDir) {
        excludeDirs.push(path.basename(options.outDir));
    }

    const htmlFiles = await getFilesWithExtension(root, 'html', true, excludeDirs);
    const jsFiles = await getFilesWithExtension(root, 'js', true, excludeDirs);

    const [htmlContents, jsContents] = await Promise.all([
        Promise.all(htmlFiles.map(f => readFile(f).catch(() => ''))),
        Promise.all(jsFiles.map(f => readFile(f).catch(() => '')))
    ]);

    const combinedContent = stripComments([...htmlContents, ...jsContents].join('\n'));

    for (const svgFile of svgFiles) {
        const svgContent = await readFile(svgFile);
        const symbols = parseSvgSymbols(svgContent);

        if (symbols.length === 0) {
            if (outImageDir) {
                const relPath = path.relative(imagesDir, svgFile);
                const destPath = path.join(outImageDir, relPath);
                await writeFile(destPath, minify(svgContent, 'html'));
            }
            continue;
        }

        let purgedContent = svgContent;
        let purgedCount = 0;

        for (const symbol of symbols) {
            const isUsed = isSymbolUsed(symbol.id, combinedContent);
            if (!isUsed || symbol.isEmpty) {
                purgedContent = purgedContent.replace(symbol.raw, '');
                purgedCount++;
            }
        }

        const optimizedSvg = minify(purgedContent, 'html');

        if (outImageDir) {
            const relPath = path.relative(imagesDir, svgFile);
            const destPath = path.join(outImageDir, relPath);
            await writeFile(destPath, optimizedSvg);
        } else {
            await writeFile(svgFile, optimizedSvg);
        }

        console.log(pc.green(`Purged ${purgedCount} unused symbol(s) from ${path.basename(svgFile)} (${symbols.length - purgedCount} kept)`));
    }
}

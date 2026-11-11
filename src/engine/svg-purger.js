import path from 'node:path';
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import pc from 'picocolors';
import { getFilesWithExtension, readFile, writeFile } from '../utils/fs.js';
import { minify } from '../utils/helpers.js';
import { projectPaths } from '../core/paths.js';

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
 * Checks for:
 * 1. Fragment identifier: #symbolId followed by a non-identifier delimiter (href="#sun-fill", url(#sun-fill), icons.svg#sun-fill)
 * 2. Exact match in quotes (JS variables, attribute strings, e.g. 'sun-fill', "sun-fill", `sun-fill`)
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
 * Keeps a backup in layx/ so `layx unbuild` can restore the original SVG sprites.
 * @param {object} [options]
 * @returns {Promise<void>}
 */
async function purgeUnusedSvgSymbols(options = {}) {
    const root = options.root || projectPaths.root;
    const imagesDir = options.image || projectPaths.image;
    const layxDir = options.layx || projectPaths.layx;

    let svgFiles = [];
    try {
        svgFiles = await getFilesWithExtension(imagesDir, 'svg', true);
    } catch {
        return;
    }

    if (svgFiles.length === 0) return;

    // Scan all user HTML and JS files (exclude framework internals and node_modules)
    const excludeDirs = ['layx', 'node_modules', '.git', 'scratch', 'original_images_dir'];
    const htmlFiles = await getFilesWithExtension(root, 'html', true, excludeDirs);
    const jsFiles = await getFilesWithExtension(root, 'js', true, excludeDirs);

    let combinedCode = '';
    for (const file of [...htmlFiles, ...jsFiles]) {
        try {
            const fileContent = await readFile(file);
            combinedCode += '\n' + stripComments(fileContent);
        } catch {
            // ignore unreadable files
        }
    }

    const symbolRegex = /<symbol\b([^>]*?)(?:>([\s\S]*?)<\/symbol>|\/>)/gi;

    for (const svgFile of svgFiles) {
        try {
            const content = await readFile(svgFile);
            const hasSymbols = content.includes('<symbol');

            // Ensure original backup exists in layx/ before any modification
            const relPath = path.relative(root, svgFile).replace(/\\/g, '/');
            const backupPath = path.join(layxDir, relPath);
            if (!existsSync(backupPath)) {
                await writeFile(backupPath, content);
            }

            let updatedSvg = content;
            let removedCount = 0;
            let keptCount = 0;

            if (hasSymbols) {
                const symbols = parseSvgSymbols(content);
                if (symbols.length > 0) {
                    updatedSvg = content.replace(symbolRegex, (fullMatch, attrs) => {
                        const idMatch = attrs.match(/\bid=["']([^"']+)["']/i);
                        const id = idMatch ? idMatch[1] : null;
                        if (id && isSymbolUsed(id, combinedCode)) {
                            keptCount++;
                            return fullMatch;
                        }
                        removedCount++;
                        return '';
                    });
                }
            }

            const minified = minify(updatedSvg, 'xml');
            await writeFile(svgFile, minified);

            if (hasSymbols && removedCount > 0) {
                console.log(pc.green(`Purged ${removedCount} unused symbol(s) from ${path.basename(svgFile)} (${keptCount} kept)`));
            } else {
                console.log(pc.green(`Optimized SVG: ${path.basename(svgFile)}`));
            }
        } catch (err) {
            console.error(pc.red(`Failed to optimize SVG ${svgFile}: ${err.message}`));
        }
    }
}


import path from 'node:path';
import { readFile, writeFile, getFilesWithExtension, getFilesContent } from '../utils/fs.js';
import { minify, getCssContentBlock, extractClasses, extractImportUrls } from '../utils/helpers.js';
import { breakPoints, layout, optimizableFiles } from '../core/constants.js';
import { projectPaths } from '../core/paths.js';

export { bundleCss, processPageCss };

async function bundleCss(optimize = true) {
    try {
        const [sourceContent, baseContent] = await Promise.all([
            readFile(projectPaths.layxCss),
            readFile(projectPaths.baseCss).catch(() => '')
        ]);

        const finalContent = await processCssContent(sourceContent, projectPaths.layxCss, optimize);
        const finalBaseContent = await processCssContent(baseContent, projectPaths.baseCss, optimize);

        await Promise.all([
            writeFile(projectPaths.layxBaseCssOut, finalContent),
            writeFile(projectPaths.userBaseCss, baseContent),
            writeFile(projectPaths.baseCss, minify(finalContent + finalBaseContent, 'css'))
        ]);

        console.log('Processed LayX base CSS');
        await processPageCss(optimize);
    } catch (error) {
        console.error('Error processing CSS files:', error);
        throw error;
    }
}

async function processPageCss(optimize = true) {
    const pageFiles = await getFilesWithExtension(projectPaths.pagesCss, 'css', true);

    for (const file of pageFiles) {
        const relPath = path.relative(projectPaths.root, file).replace(/\\/g, '/');
        const outPath = path.join(projectPaths.layx, relPath);
        const content = await readFile(file);

        // Backup original page CSS
        await writeFile(outPath, content);

        // Minify and optimize page CSS
        const finalContent = await processCssContent(content, file, optimize, true);
        await writeFile(file, minify(finalContent, 'css'));

        console.log(`Processed ${path.basename(file)}`);
    }
}

async function processCssContent(content, filePath, optimize, isPageFile = false) {
    const processed = await processImports(content, filePath, optimize, isPageFile);
    return removeImportStatements(processed);
}

async function processImports(content, filePath, optimize, isPageFile) {
    const importUrls = extractImportUrls(content, 'css');

    let baseImportPaths = new Set();
    if (isPageFile) {
        try {
            const baseContent = await readFile(projectPaths.layxCss);
            const baseImports = extractImportUrls(baseContent, 'css');
            baseImportPaths = new Set(baseImports.map(url =>
                path.resolve(path.dirname(projectPaths.layxCss), url)
            ));
        } catch (error) {
            console.warn(`Warning: Could not read base CSS file: ${error.message}`);
        }
    }

    const importedContents = await Promise.all(importUrls.map(async (url) => {
        const importedFilePath = path.resolve(path.dirname(filePath), url);

        if (isPageFile && baseImportPaths.has(importedFilePath)) {
            return '';
        }

        try {
            if (optimize) {
                const optimizable = optimizableFiles.find(file =>
                    path.resolve(path.dirname(filePath), file.url) === importedFilePath
                );
                if (optimizable) {
                    return await processOptimizableFile(url, importedFilePath);
                }
            }
            return await readFile(importedFilePath);
        } catch (error) {
            console.error(`Cannot read file ${importedFilePath}: ${error.message}`);
            return '';
        }
    }));

    const topRegex = /\/\*<top>\*\/([\s\S]*?)\/\*<\/top>\*\//;
    const topMatch = content.match(topRegex);
    let topContent = '';
    if (topMatch) {
        topContent = topMatch[0].trim();
        content = content.replace(topRegex, '').trim();
    }

    return [topContent, ...importedContents, content].join('\n');
}

async function processOptimizableFile(url, importedFilePath) {
    const info = optimizableFiles.find(file => file.url === url)?.optimize;
    if (!info) return '';

    const content = await readFile(importedFilePath);
    const htmlContent = await getFilesContent(projectPaths.root, 'html', true);
    const finalContent = [];

    // Handle includes
    if (info.include?.length) {
        info.include.forEach(tag => {
            const includedContent = getCssContentBlock(content, tag);
            if (includedContent) finalContent.push(includedContent);
        });
    }

    // Handle regular classes
    if (info.class?.length) {
        info.class.forEach(selector => {
            const classNums = extractClasses(htmlContent, selector, 'number');
            const template = info.templates[selector.replace('-', '_')];

            if (template && classNums.length) {
                const styles = classNums.map(num =>
                    genStyle(template, num)
                ).join('\n');
                info.wrapper ? finalContent.push(wrap(info.wrapper, styles)) : finalContent.push(styles);
            }
        });
    }

    // Handle media queries
    if (info.media && info.class?.length) {
        info.class.forEach(selector => {
            const classMedias = extractClasses(htmlContent, selector, 'media');

            classMedias.forEach(mediaKey => {
                const mediaQuery = breakPoints[mediaKey]?.media;
                if (!mediaQuery) return;

                const classNums = extractClasses(htmlContent, `${selector}-${mediaKey}`, 'number');
                const template = info.templates.media?.[selector.replace('-', '_')];

                if (template && classNums.length) {
                    const styles = classNums.map(num =>
                        genStyle(template, num, mediaKey)
                    ).join('\n');

                    const wrappedStyles = wrap(`@media ${mediaQuery}`, styles);
                    info.wrapper ? finalContent.push(wrap(info.wrapper, wrappedStyles)) : finalContent.push(wrappedStyles);
                }
            });
        });
    }

    return finalContent.join('\n');
}

function wrap(wrapper, content) {
    return `${wrapper} {${content}}`;
}

function genStyle(template, num, media = '') {
    try {
        return template.replace(/\${num}/g, num).replace(/\${media}/g, media);
    } catch (error) {
        return '';
    }
}

function removeImportStatements(content) {
    return content.split('\n').filter(line => !line.trim().startsWith('@import')).join('\n');
}

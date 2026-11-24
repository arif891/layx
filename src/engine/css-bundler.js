import path from 'node:path';
import { existsSync } from 'node:fs';
import { readFile, writeFile, getFilesWithExtension, getFilesContent } from '../utils/fs.js';
import { minify, getCssContentBlock, extractClasses, extractImportUrls } from '../utils/helpers.js';
import { breakPoints, optimizableFiles } from '../core/constants.js';
import { projectPaths, packagePaths } from '../core/paths.js';
import { updateUrlsInContent } from './image-optimizer.js';
import { removePagesFromLinks } from './html-transformer.js';

export { bundleCss, processPageCss, resolveImportPath };

async function bundleCss(outDir, optimize = true, optimizer = null, projectConfig = {}) {
    try {
        const [sourceContent, baseContent] = await Promise.all([
            readFile(projectPaths.layxCss).catch(() => ''),
            readFile(projectPaths.baseCss).catch(() => '')
        ]);

        const finalContent = await processCssContent(sourceContent, projectPaths.layxCss, optimize, false, projectConfig);
        const finalBaseContent = await processCssContent(baseContent, projectPaths.baseCss, optimize, false, projectConfig);

        let bundledBaseCss = minify(finalContent + finalBaseContent, 'css');
        bundledBaseCss = removePagesFromLinks(bundledBaseCss);
        if (optimizer) {
            bundledBaseCss = updateUrlsInContent(bundledBaseCss, 'css', optimizer);
        }

        const outBaseCss = path.join(outDir, 'assets/css/base.css');
        await writeFile(outBaseCss, bundledBaseCss);

        console.log('Processed LayX base CSS ->', outBaseCss);
        await processPageCss(outDir, optimize, optimizer, projectConfig);
    } catch (error) {
        console.error('Error processing CSS files:', error);
        throw error;
    }
}

async function processPageCss(outDir, optimize = true, optimizer = null, projectConfig = {}) {
    let pageFiles = [];
    try {
        pageFiles = await getFilesWithExtension(projectPaths.pagesCss, 'css', true);
    } catch {
        pageFiles = [];
    }

    for (const file of pageFiles) {
        const relPath = path.relative(projectPaths.pagesCss, file).replace(/\\/g, '/');
        const outPath = path.join(outDir, 'assets/css/pages', relPath);
        const content = await readFile(file);

        let finalContent = await processCssContent(content, file, optimize, true, projectConfig);
        finalContent = minify(finalContent, 'css');
        finalContent = removePagesFromLinks(finalContent);
        if (optimizer) {
            finalContent = updateUrlsInContent(finalContent, 'css', optimizer);
        }

        await writeFile(outPath, finalContent);
        console.log(`Processed ${path.basename(file)} ->`, outPath);
    }

    // Process any other custom CSS in assets/css/ (excluding base.css and pages/)
    let allCssFiles = [];
    try {
        allCssFiles = await getFilesWithExtension(projectPaths.css, 'css', true);
    } catch {
        allCssFiles = [];
    }

    for (const file of allCssFiles) {
        if (path.resolve(file) === path.resolve(projectPaths.baseCss)) continue;
        if (path.resolve(file).startsWith(path.resolve(projectPaths.pagesCss))) continue;

        const relPath = path.relative(projectPaths.css, file).replace(/\\/g, '/');
        const outPath = path.join(outDir, 'assets/css', relPath);
        let content = await readFile(file);
        content = minify(content, 'css');
        content = removePagesFromLinks(content);
        if (optimizer) {
            content = updateUrlsInContent(content, 'css', optimizer);
        }
        await writeFile(outPath, content);
    }
}

function resolveImportPath(currentFilePath, importUrl) {
    const cleaned = importUrl.trim();
    if (cleaned.startsWith('/')) {
        // 1. Root-relative in project root (e.g. /layx/... or /assets/...)
        const fromRoot = path.join(projectPaths.root, cleaned.slice(1));
        if (existsSync(fromRoot)) return fromRoot;

        // 2. Fallback for /layx/... to package framework directory
        if (cleaned.startsWith('/layx/')) {
            const rel = cleaned.replace(/^\/layx\//, '');
            const fromFramework = path.join(packagePaths.framework, rel);
            if (existsSync(fromFramework)) return fromFramework;
        }

        return fromRoot;
    }

    return path.resolve(path.dirname(currentFilePath), cleaned);
}

async function isBaseCssLoadedForPage(cssFilePath) {
    try {
        const htmlFiles = await getFilesWithExtension(projectPaths.root, 'html', true);
        const cssBaseName = path.basename(cssFilePath);
        const cssRelRoot = path.relative(projectPaths.root, cssFilePath).replace(/\\/g, '/');
        const cssRelCss = path.relative(projectPaths.css, cssFilePath).replace(/\\/g, '/');

        for (const htmlFile of htmlFiles) {
            const relHtml = path.relative(projectPaths.root, htmlFile);
            if (relHtml.startsWith('dist') || relHtml.startsWith('node_modules')) continue;

            const htmlContent = await readFile(htmlFile);
            const linksToThisCss = htmlContent.includes(cssBaseName) ||
                                   htmlContent.includes(cssRelRoot) ||
                                   htmlContent.includes(cssRelCss);

            if (linksToThisCss) {
                const hasBase = htmlContent.includes('/assets/css/base.css') ||
                                htmlContent.includes('assets/css/base.css') ||
                                htmlContent.includes('/layx/layx.css') ||
                                htmlContent.includes('layx/layx.css');
                return hasBase;
            }
        }
        return false;
    } catch {
        return false;
    }
}

async function processCssContent(content, filePath, optimize, isPageFile = false, projectConfig = {}, visited = new Set()) {
    const processed = await processImports(content, filePath, optimize, isPageFile, projectConfig, visited);
    return removeImportStatements(processed);
}

async function processImports(content, filePath, optimize, isPageFile, projectConfig, visited) {
    const resolvedCurrent = path.resolve(filePath);
    if (visited.has(resolvedCurrent)) {
        return '';
    }
    visited.add(resolvedCurrent);

    const importUrls = extractImportUrls(content, 'css');

    let baseImportPaths = new Set();
    const dropDuplicates = projectConfig.build?.dropDuplicates ?? true;

    // Only collect and drop base imports if:
    // 1) It's a page CSS file
    // 2) optimize is enabled
    // 3) dropDuplicates is not disabled
    // 4) The page's HTML file actually loads base.css!
    let shouldCheckBaseDuplicates = false;
    if (isPageFile && optimize && dropDuplicates) {
        const pageLoadsBase = await isBaseCssLoadedForPage(filePath);
        if (pageLoadsBase) {
            shouldCheckBaseDuplicates = true;
            try {
                const baseContent = await readFile(projectPaths.layxCss);
                const baseImports = extractImportUrls(baseContent, 'css');
                baseImportPaths = new Set(baseImports.map(url =>
                    resolveImportPath(projectPaths.layxCss, url)
                ));
            } catch (error) {
                console.warn(`Warning: Could not read base CSS file: ${error.message}`);
            }
        }
    }

    const importedContents = await Promise.all(importUrls.map(async (url) => {
        const importedFilePath = resolveImportPath(filePath, url);

        if (shouldCheckBaseDuplicates && baseImportPaths.has(importedFilePath)) {
            return '';
        }

        try {
            if (optimize) {
                const optimizable = optimizableFiles.find(file => {
                    const resolvedOpt = resolveImportPath(projectPaths.layxCss, file.url);
                    return resolvedOpt === importedFilePath;
                });
                if (optimizable) {
                    return await processOptimizableFile(url, importedFilePath);
                }
            }
            const fileContent = await readFile(importedFilePath);
            return await processImports(fileContent, importedFilePath, optimize, false, projectConfig, visited);
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
    return content.replace(/@import\s+(?:url\([^)]+\)|['"][^'"]+['"])\s*;?/g, '');
}

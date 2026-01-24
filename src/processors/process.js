import path from 'node:path';
import { pathToFileURL } from 'node:url';
import * as esbuild from 'esbuild';
import { readFile, writeFile, getFilesWithExtension, getFilesContent } from '../utils/fs.js';
import { minify, getCssContentBlock, extractClasses, extractImportUrls } from '../utils/helpers.js';
import { layx, breakPoints, layout } from '../core/config.js';

export { processFiles };

const dirConfig = {
    css: {
        source: layx.files.layxCss,
        base: layx.files.baseCss,
        output: layx.files.layxCssOut,
        baseOutput: layx.files.baseCssOut,
        pageFilesDir: layx.directories.pagesCss,
        pageFilesOutDir: layx.directories.pagesCssOut
    },
    js: {
        source: layx.files.layxJs,
        base: layx.files.baseJs,
        output: layx.files.layxJsOut,
        baseOutput: layx.files.baseJsOut,
        pageFilesDir: layx.directories.pagesJs,
        pageFilesOutDir: layx.directories.pagesJsOut,
        mainDir: layx.directories.js
    }
}

const optimizableFiles = [
    {
        url: 'main/layout/layout.css',
        optimize: {
            include: ['base', 'gap'],
            class: ['x', 'xs', 'y', 'ys'],
            media: true,
            templates: layout.templates,
            wrapper: '@layer layout.helper'
        }
    },
    {
        url: 'helpers/layout/layout_helper.css',
        optimize: {
            class: ['num-x', 'num-y'],
            media: true,
            templates: layout.helper.templates,
            wrapper: '@layer layout.helper'
        }
    }
];

async function processFiles(scriptDir, optimize) {
    const types = ['css', 'js'];

    for (const type of types) {
        const config = dirConfig[type];

        try {
            const [sourceContent, baseContent] = await Promise.all([
                readFile(config.source),
                readFile(config.base).catch(() => '')
            ]);

            const finalContent = await processContent(sourceContent, config.source, type, optimize);

            await Promise.all([
                writeFile(config.output, finalContent),
                writeFile(config.baseOutput, baseContent),
                type === 'js'
                    ? writeFile(config.base, `import '../../${dirConfig.js.source}';` + baseContent)
                    : writeFile(config.base, minify(finalContent + baseContent, type))
            ]);
            console.log(`Processed LayX base ${type}`);

            await processPageFiles(type, config.pageFilesDir, config.pageFilesOutDir, optimize, scriptDir);

        } catch (error) {
            console.error(`Error processing ${type} files:`, error);
            throw error;
        }
    }

    await runJsBundler();
}

async function processPageFiles(type, pageFilesDir, pageFilesOutDir, optimize, scriptDir) {
    const pageFiles = await getFilesWithExtension(pageFilesDir, type, true);

    for (const file of pageFiles) {
        const outPath = path.join(layx.directories.layx, file);
        const content = await readFile(file);

        await writeFile(outPath, content);

        if (type !== 'js') {
            const finalContent = await processContent(content, file, type, optimize, true);
            await writeFile(file, minify(finalContent, type));
        }
        console.log(`Processed ${path.basename(file)}`);
    }
}

async function runJsBundler() {
    try {
        // Check if buildConfig is exists and then import it
        let buildConfig = {};
        try {
            const configPath = path.resolve(process.cwd(), 'config.mjs');
            const configUrl = pathToFileURL(configPath).href;
            const configModule = await import(configUrl);
            buildConfig = configModule.config.build.layx || {};
        } catch (err) {
            console.warn('buildConfig not found, proceeding with default settings.', err);
        }


        // Bundle with esbuild
        await esbuild.build({
            entryPoints: [dirConfig.js.base, `${dirConfig.js.pageFilesDir}/**/*.js`],
            outbase: dirConfig.js.mainDir,
            outdir: dirConfig.js.mainDir,
            allowOverwrite: true,
            bundle: true,
            splitting: true,
            treeShaking: true,
            minify: true,
            format: 'esm',
            assetNames: '[path]/[name]',
            chunkNames: 'chunks/[name]-[hash]',
            ...buildConfig,
        });


        console.log(`ESBuild processed`);
    } catch (error) {
        console.error(`ESBuild error`, error);
        throw error;
    }
}

async function processContent(content, filePath, type, optimize, isPageFile = false) {
    const processed = await processImports(content, filePath, type, optimize, isPageFile);
    const filtered = removeImportStatements(processed);
    return type === 'js' ? removeExportAndDefault(filtered) : filtered;
}

async function processImports(content, filePath, type, optimize, isPageFile) {
    const importUrls = extractImportUrls(content, type);

    // Check base file imports for page files
    let baseImportPaths = new Set();
    if (isPageFile) {
        const baseFilePath = dirConfig[type].source;
        try {
            const baseContent = await readFile(baseFilePath);
            const baseImports = extractImportUrls(baseContent, type);

            // Resolve base imports to absolute paths
            baseImportPaths = new Set(baseImports.map(url =>
                path.resolve(path.dirname(baseFilePath), url)
            ));
        } catch (error) {
            console.warn(`Warning: Could not read base file for duplicate import checking: ${error.message}`);
        }
    }

    const importedContents = await Promise.all(importUrls.map(async (url) => {
        const importedFilePath = path.resolve(path.dirname(filePath), url);

        // Skip if resolved path is already imported in base file
        if (isPageFile && baseImportPaths.has(importedFilePath)) {
            console.log(`Skipping duplicate import of ${url} - already in base file`);
            return '';
        }

        try {
            if (type === 'css' && optimize) {
                const optimizableFile = optimizableFiles.find(file =>
                    path.resolve(path.dirname(filePath), file.url) === importedFilePath
                );
                if (optimizableFile) {
                    return await processOptimizableFile(url, importedFilePath);
                }
            }
            return await readFile(importedFilePath);
        } catch (error) {
            console.error(`Cannot read file ${importedFilePath}. Error: ${error.message}`);
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
    const htmlContent = await getFilesContent(layx.directories.base, 'html', true);
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
    return `${wrapper} {${content}}`
}

function genStyle(template, num, media = '') {
    try {
        return template.replace(/\${num}/g, num).replace(/\${media}/g, media);
    } catch (error) {
        console.error(`Error generating style: ${error.message}`);
        return '';
    }
}

function removeExportAndDefault(content) {
    content = content.replace(/export\s+default\s+/g, '');
    content = content.replace(/^export\s+/gm, '');
    return content;
}


function removeImportStatements(content) {
    return content.split('\n').filter(line => !line.trim().startsWith('@import') && !line.trim().startsWith('import')).join('\n');
}

import path from 'node:path';
import * as esbuild from 'esbuild';
import { readFile, writeFile, minify, getFilesWithExtension, getFilesContent, getCssContentBlock, extractClasses, extractImportUrls } from '../util/functions.mjs'
import { layx, breakPoints, layout } from '../core/vars.mjs'
import { esbuildConfig } from '../../config.mjs'


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
        pageFilesOutDir: layx.directories.pagesJsOut
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
        }
    },
    {
        url: 'helpers/layout/layout_helper.css',
        optimize: {
            class: ['num-x', 'num-y'],
            media: true,
            templates: layout.helper.templates
        }
    }
];

async function processFiles(optimize) {
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
                writeFile(config.output, `/* layx ${type} code */\n${finalContent}`),
                writeFile(config.baseOutput, `/* User base ${type} code */\n${baseContent}`),
                type === 'js' 
                    ? bundleAndWriteJs(config.base, finalContent + baseContent)
                    : writeFile(config.base, minify(finalContent + baseContent, type))
            ]);
            console.log(`Processed LayX base ${type}`);

            await processPageFiles(type, config.pageFilesDir, config.pageFilesOutDir, optimize);

        } catch (error) {
            console.error(`Error processing ${type} files:`, error);
            throw error;
        }
    }

}

async function processPageFiles(type, pageFilesDir, pageFilesOutDir, optimize) {
    const pageFiles = await getFilesWithExtension(pageFilesDir, type);

    for (const file of pageFiles) {
        const outPath = path.join(pageFilesOutDir, path.basename(file));
        const content = await readFile(file);

        const finalContent = await processContent(content, file, type, optimize, true);

        await writeFile(outPath, content);
        
        if (type === 'js') {
            await bundleAndWriteJs(file, finalContent);
        } else {
            await writeFile(file, minify(finalContent, type));
        }
        console.log(`Processed ${path.basename(file)}`);
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

    return [...importedContents, content].join('\n');
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
                finalContent.push(styles);
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

                    finalContent.push(wrapMedia(mediaQuery, styles));
                }
            });
        });
    }

    return finalContent.join('\n');
}

function wrapMedia(media, content) {
    return `@media ${media} {${content}}`
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

async function bundleAndWriteJs(filePath, content) {
    try {
        // Create a temporary entry point file with the processed content
        const tempFile = filePath + '.tmp.js';
        await writeFile(tempFile, content);
        
        // Bundle with esbuild
        await esbuild.build({
            entryPoints: [tempFile],
            outfile: filePath,
            ...esbuildConfig.base,
            bundle: false,
        });
        
        // Clean up temp file
        import('node:fs/promises').then(fs => fs.unlink(tempFile).catch(() => {}));
        
        console.log(`ESBuild processed: ${filePath}`);
    } catch (error) {
        console.error(`ESBuild error for ${filePath}:`, error);
        // Fallback to minify if esbuild fails
        await writeFile(filePath, minify(content, 'js'));
    }
}

function removeImportStatements(content) {
    return content.split('\n').filter(line => !line.trim().startsWith('@import') && !line.trim().startsWith('import')).join('\n');
}
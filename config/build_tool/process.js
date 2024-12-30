import path from 'node:path';
import { readFile, writeFile, minify, getFilesWithExtension } from '../util/functions.js'
import { layx } from '../core/vars.js'


export { processFiles };

async function processFiles() {
    const types = ['css', 'js'];

    for (const type of types) {
        const config = {
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
        }[type];
        
        try {
            const [sourceContent, baseContent] = await Promise.all([
                readFile(config.source),
                readFile(config.base).catch(() => '')
            ]);

            const processed = await processImports(sourceContent, config.source, type);
            const filtered = removeImportStatements(processed);
            const final = type === 'js' ? removeExportAndDefault(filtered) : filtered;

            await Promise.all([
                writeFile(config.output, `/* layx ${type} code */\n${final}`),
                writeFile(config.baseOutput, `/* User base ${type} code */\n${baseContent}`),
                writeFile(config.base, minify(final + baseContent, type))
            ]);
            console.log(`Processed LayX base ${type}`);

            await processPageFiles(type, config.pageFilesDir, config.pageFilesOutDir);

        } catch (error) {
            console.error(`Error processing ${type} files:`, error);
            throw error;
        }
    }

}

async function processPageFiles(type, pageFilesDir, pageFilesOutDir) {
    const pageFiles = await getFilesWithExtension(pageFilesDir, type);

    for (const file of pageFiles) {
        const filePath = path.join(pageFilesDir, file);
        const outPath = path.join(pageFilesOutDir, file);
        const content = await readFile(filePath);

        await writeFile(outPath, content);
        await writeFile(filePath, minify(content, type));
        console.log(`Processed ${file}`);
    }
}

async function processImports(content, filePath, type) {
    const importUrls = extractImportUrls(content, type);
    const importedContents = await Promise.all(importUrls.map(async (url) => {
        const importedFilePath = path.resolve(path.dirname(filePath), url);

        try {
            return await readFile(importedFilePath);
        } catch (error) {
            console.error(`Cannot read file ${importedFilePath}. Error: ${error.message}`);
            return '';
        }
    }));

    return [content, ...importedContents].join('\n');
}

function extractImportUrls(content, type) {
    const regex = type === 'css'
        ? /@import\s+url\(([^)]+)\);/g
        : /import\s+(?:\w+|\{[^}]+\})\s+from\s+['"]([^'"]+)['"]/g;

    return [...content.matchAll(regex)].map(match => match[1].replace(/['"]/g, ''));
}

function removeExportAndDefault(content) {
    content = content.replace(/export\s+default\s+/g, '');
    content = content.replace(/^export\s+/gm, '');
    return content;
}

function removeImportStatements(content) {
    return content.split('\n').filter(line => !line.trim().startsWith('@import') && !line.trim().startsWith('import')).join('\n');
}
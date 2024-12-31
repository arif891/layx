import path from 'node:path';
import { readFile, writeFile, minify, getFilesWithExtension, getFilesContent, getContentByTag, extractClasses } from '../util/functions.js'
import { layx, breakPoints, layout } from '../core/vars.js'


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
            class: {
                x: {
                    selector: 'x'
                },
                xs: {
                    selector: 'xs'
                },
                y: {
                    selector: 'y'
                },
                ys: {
                    selector: 'x'
                },
            },
            media: true,
            templates: layout.templates,
        }
    },
    {
        url: 'helpers/layout/layout_helper.css',
        optimize: {
            class: ['num-x'],
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

            const processed = await processImports(sourceContent, config.source, type, optimize);
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

async function processImports(content, filePath, type, optimize) {

    const importUrls = extractImportUrls(content, type);

    const importedContents = await Promise.all(importUrls.map(async (url) => {
        const importedFilePath = path.resolve(path.dirname(filePath), url);

        try {
            if (type === 'css' && optimize) {
                const optimizableFile = optimizableFiles.find(file => file.url === url);
                if (optimizableFile) {
                    console.log(`Optimizing file: ${url}`);
                    return await processOptimizableFile(url, importedFilePath);
                }
            }
            return await readFile(importedFilePath);
        } catch (error) {
            console.error(`Cannot read file ${importedFilePath}. Error: ${error.message}`);
            return '';
        }
    }));

    return [content, ...importedContents].join('\n');
}


async function processOptimizableFile(url, importedFilePath) {
    const info = optimizableFiles.find(file => file.url === url)?.optimize;

    const content = await readFile(importedFilePath);
    const htmlContent = await getFilesContent(layx.directories.base, 'html', true);

    let includeContent = [];
    let classContent = [];

    const tem = `
    <!DOCTYPE html>
<html lang="en">

  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>LayX Document</title>

    <link rel="stylesheet" href="/layx/layx.css">

    <link rel="stylesheet" href="/assets/css/base.css">
    <link rel="stylesheet" href="/assets/css/pages/home.css">

    <!--Font file should be preloaded-->
    <link rel="preload" href="/assets/font/Red_Hat_Display_variable.woff2" as="font" crossorigin>

  </head>

  <body>

    <div class= "x-1 x-5 x-10 x-lg-2 x-lg-6 x-lg-11"></div>
    <div class= ""></div>

    <script src="/layx/layx.js" type="module"></script>

    <script src="/assets/js/base.js"></script>
    <script src="/assets/js/pages/home.js"></script>
  </body>

</html>
    `

    console.log(extractClasses(tem, 'x'));

    // info.include?.forEach(tag => {
    //     const inc = getContentByTag(content, tag);
    //     includeContent.push(inc);
    // });

    // info.class.forEach(selector => {
    //     let content;


    // })

    // if (info.media) {
    //     info.class.forEach(selector => {

    //     })
    // }

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
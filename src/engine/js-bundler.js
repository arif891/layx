import path from 'node:path';
import { pathToFileURL } from 'node:url';
import * as esbuild from 'esbuild';
import { readFile, writeFile, getFilesWithExtension } from '../utils/fs.js';
import { projectPaths } from '../core/paths.js';

export { bundleJs };

async function bundleJs() {
    try {
        const [sourceContent, baseContent] = await Promise.all([
            readFile(projectPaths.layxJs),
            readFile(projectPaths.baseJs).catch(() => '')
        ]);

        // Backup original base JS and layx JS output
        await Promise.all([
            writeFile(projectPaths.layxBaseJsOut, sourceContent),
            writeFile(projectPaths.userBaseJs, baseContent),
            writeFile(projectPaths.baseJs, `import '../../layx/layx.js';\n` + baseContent)
        ]);

        console.log('Processed LayX base JS');

        // Backup page JS files
        await backupPageJs();

        // Bundle with esbuild
        await runEsbuild();
    } catch (error) {
        console.error('Error processing JS files:', error);
        throw error;
    }
}

async function backupPageJs() {
    const pageFiles = await getFilesWithExtension(projectPaths.pagesJs, 'js', true);

    for (const file of pageFiles) {
        const relPath = path.relative(projectPaths.root, file).replace(/\\/g, '/');
        const outPath = path.join(projectPaths.layx, relPath);
        const content = await readFile(file);
        await writeFile(outPath, content);
        console.log(`Processed ${path.basename(file)}`);
    }
}

async function runEsbuild() {
    let buildConfig = {};

    try {
        if (projectPaths.config) {
            const configUrl = pathToFileURL(projectPaths.config).href;
            const configModule = await import(configUrl);
            buildConfig = configModule.config?.build?.layx || {};
        }
    } catch {
        // proceed with default esbuild settings
    }

    await esbuild.build({
        entryPoints: [projectPaths.baseJs, `${projectPaths.pagesJs}/**/*.js`],
        outbase: projectPaths.js,
        outdir: projectPaths.js,
        allowOverwrite: true,
        bundle: true,
        splitting: true,
        treeShaking: true,
        minify: true,
        format: 'esm',
        assetNames: '[path]/[name]',
        chunkNames: 'chunks/[name]-[hash]',
        ...buildConfig
    });

    console.log('ESBuild processed');
}

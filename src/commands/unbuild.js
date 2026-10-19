import path from 'node:path';
import pc from 'picocolors';
import { readFile, writeFile, getFilesWithExtension } from '../utils/fs.js';
import { processHtmlFiles } from '../engine/html-transformer.js';
import { restoreOptimizedImages } from '../engine/image-optimizer.js';
import { setBuildState, getBuildState } from '../utils/build-state.js';
import { projectPaths } from '../core/paths.js';

export { unbuild };

async function unbuild(options = {}) {
    const isRebuild = options.isRebuild === true;
    console.log(pc.cyan('Starting unbuild process...'));

    try {
        if (!isRebuild) {
            const state = await getBuildState();
            if (!state?.build && !state?.optimized) {
                console.log(pc.yellow('Project has not been built or optimized yet. Nothing to unbuild.'));
                return;
            }
        }

        // 1. Restore Base CSS and Base JS
        await restoreBaseFiles();

        // 2. Restore Page CSS and Page JS
        await restorePageFiles();

        // 3. Restore SVGs and raster images (runs once)
        await restoreOptimizedImages();

        // 4. Uncomment HTML entry points
        if (!isRebuild) {
            await processHtmlFiles(projectPaths.root, 'uncomment');
        }

        await setBuildState({ build: false, optimized: false, lastUnbuilt: new Date().toISOString() });
        console.log(pc.green('Unbuild process completed successfully.'));
    } catch (error) {
        console.error(pc.red(`Unbuild process failed: ${error.message}`));
        throw error;
    }
}

async function restoreBaseFiles() {
    // Restore base CSS
    try {
        const cssContent = await readFile(projectPaths.userBaseCss);
        await writeFile(projectPaths.baseCss, cssContent);
        console.log('Restored user base CSS file.');
    } catch (err) {
        if (err.code !== 'ENOENT') {
            console.error('Failed to restore base CSS:', err.message);
        }
    }

    // Restore base JS
    try {
        const jsContent = await readFile(projectPaths.userBaseJs);
        await writeFile(projectPaths.baseJs, jsContent);
        console.log('Restored user base JS file.');
    } catch (err) {
        if (err.code !== 'ENOENT') {
            console.error('Failed to restore base JS:', err.message);
        }
    }
}

async function restorePageFiles() {
    // Restore page CSS files
    const cssBackups = await getFilesWithExtension(projectPaths.layxPagesCssOut, 'css', true);
    for (const file of cssBackups) {
        const content = await readFile(file);
        const relPath = path.relative(projectPaths.layx, file).replace(/\\/g, '/');
        const destPath = path.join(projectPaths.root, relPath);
        await writeFile(destPath, content);
        console.log(`Restored ${path.basename(file)} file.`);
    }

    // Restore page JS files
    const jsBackups = await getFilesWithExtension(projectPaths.layxPagesJsOut, 'js', true);
    for (const file of jsBackups) {
        const content = await readFile(file);
        const relPath = path.relative(projectPaths.layx, file).replace(/\\/g, '/');
        const destPath = path.join(projectPaths.root, relPath);
        await writeFile(destPath, content);
        console.log(`Restored ${path.basename(file)} file.`);
    }
}

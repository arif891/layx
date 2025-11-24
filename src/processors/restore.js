import path from 'node:path';
import { readFile, writeFile, getFilesWithExtension } from '../utils/fs.js';
import { layx } from '../core/config.js';

export { restoreFiles };

const dirConfig = {
    css: {
        from: layx.files.baseCssOut,
        to: layx.files.baseCss,
        fromPageFilesDir: layx.directories.pagesCssOut,
        toPageFilesDir: layx.directories.pagesCss
    },
    js: {
        from: layx.files.baseJsOut,
        to: layx.files.baseJs,
        fromPageFilesDir: layx.directories.pagesJsOut,
        toPageFilesDir: layx.directories.pagesJs
    }
}

async function restoreFiles() {
    const types = ['css', 'js'];

    for (const type of types) {
        const config = dirConfig[type];

        try {
            const content = await readFile(config.from);
            await writeFile(config.to, content);
            console.log(`Restored user base ${type} file.`);

            await restorePageFiles(type, config.fromPageFilesDir, config.toPageFilesDir);

            await restoreSVGimages();
        } catch (error) {
            console.error(`Error restoring ${type} file:`, error.message);
        }
    }
}

async function restorePageFiles(type, fromDir, toDir) {

    const Files = await getFilesWithExtension(fromDir, type, true);

    for (const file of Files) {
        const content = await readFile(file);
        await writeFile(path.join(layx.directories.base, file.replace('\\', '/').replace(layx.directories.layx, '')), content);
        console.log(`Restored ${path.basename(file)} file.`);
    }
}

async function restoreSVGimages() {
    const Files = await getFilesWithExtension(layx.directories.layxImages, 'svg', true);
    for (const file of Files) {
        const content = await readFile(file);
        console.log(path.join(layx.directories.base, file));
        await writeFile(path.join(layx.directories.base, file.replace('\\', '/').replace(layx.directories.layx, '')), content);
        console.log(`Restored ${path.basename(file)} file.`);

    }
}

import path from 'node:path';
import { readFile, writeFile, getFilesWithExtension } from '../util/functions.js'
import { layx } from '../core/vars.js'

export {restoreFiles};

async function restoreFiles() {
  const types = ['css', 'js'];

  for (const type of types) {
    const config = {
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
    }[type];


    try {
      const content = await readFile(config.from);
      await writeFile(config.to, content);
      console.log(`Restored user base ${type} file.`);

      await restorePages(type, config.fromPageFilesDir, config.toPageFilesDir);
    } catch (error) {
      console.error(`Error restoring ${type} file:`, error.message);
    }
  }
}

async function restorePages(type, fromDir, toDir) {

  const Files = await getFilesWithExtension(fromDir, type);

  for (const file of Files) {
    const sourcePath = path.join(pagesDir, file);
    const destPath = path.join(destDir, file);
    await this.restoreFile(sourcePath, destPath, type);

    const content = await readFile(file);
    await writeFile(path.join(toDir, file), content);
    console.log(`Restored ${file} file.`);
  }
}
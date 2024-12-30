async function restoreFile(sourcePath, destinationPath, fileType) {
    try {
      const content = await readFile(sourcePath);
      await writeFile(destinationPath, content);
      console.log(`Restored ${fileType.toUpperCase()} file: ${path.basename(destinationPath)}`);
    } catch (error) {
      console.error(`Error restoring ${fileType.toUpperCase()} file:`, error.message);
    }
  }

  async function restorePages(fileType) {
    const pagesDir = fileType === 'css' ? this.directories.pagesCssOut : this.directories.pagesJsOut;
    const destDir = fileType === 'css' ? this.directories.pagesCss : this.directories.pagesJs;

    const pageFiles = await this.getFilesWithExtension(pagesDir, fileType);

    for (const file of pageFiles) {
      const sourcePath = path.join(pagesDir, file);
      const destPath = path.join(destDir, file);
      await this.restoreFile(sourcePath, destPath, fileType);
    }
  }
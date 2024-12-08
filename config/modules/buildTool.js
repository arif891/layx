import path from 'path';
import { promises as fs } from 'fs';

import {colors, currentDir } from './vars.js';
import { readFile, writeFile } from './functions.js';


class BuildTool {
    static CONFIG = {
      fileTypes: ['css', 'js'],
      mediaBreakpoints: ['sm', 'md', 'lg', 'xl', 'xxl', 'wd', 'swd', 'suwd']
    };
  
    constructor(options = {}) {
      // this.validateDirectories();
      this.directories = {
        current: currentDir,
        config: path.join(currentDir, 'config'),
        assets: path.join(currentDir, 'assets'),
        layx: path.join(currentDir, 'layx'),
        pages: path.join(currentDir, 'pages'),
        images: path.join(currentDir, 'assets/image'),
        css: path.join(currentDir, 'assets/css'),
        js: path.join(currentDir, 'assets/js'),
        layxAssets: path.join(currentDir, 'layx/assets'),
        layxCss: path.join(currentDir, 'layx/assets/css'),
        layxJs: path.join(currentDir, 'layx/assets/js'),
        pagesCss: path.join(currentDir, 'assets/css/pages'),
        pagesJs: path.join(currentDir, 'assets/js/pages'),
        pagesCssOut: path.join(currentDir, 'layx/assets/css/pages'),
        pagesJsOut: path.join(currentDir, 'layx/assets/js/pages')
      };
  
      this.files = {
        baseCss: path.join(this.directories.css, 'base.css'),
        baseJs: path.join(this.directories.js, 'base.js'),
        layxCss: path.join(this.directories.layx, 'layx.css'),
        layxJs: path.join(this.directories.layx, 'layx.js'),
        layxCssOut: path.join(this.directories.layxCss, 'base.css'),
        layxJsOut: path.join(this.directories.layxJs, 'base.js'),
        baseCssOut: path.join(this.directories.layxCss, 'user_base.css'),
        baseJsOut: path.join(this.directories.layxJs, 'user_base.js'),
        buildInfo: path.join(this.directories.layxAssets, 'build_info.json')
      };
    }
  
    async validateDirectories() {
      try {
        await Promise.all(
          Object.values(this.directories).map(dir =>
            fs.mkdir(dir, { recursive: true })
          )
        );
      } catch (error) {
        throw new Error(`Failed to create directories: ${error.message}`);
      }
    }
  
    async build(isRebuild = false) {
      console.log(colors.style('Starting build process...', colors.fg.cyan));
      try {
        if (!isRebuild) {
          const buildInfo = await this.getBuildInfo();
          if (buildInfo?.build) {
            console.log(colors.style('Existing build detected. Initiating rebuild...', colors.fg.yellow));
            await this.unbuild(true);
            return this.build(true);
          }
        }
  
        await Promise.all([
          ...BuildTool.CONFIG.fileTypes.map(type => this.processFiles(type)),
          ...BuildTool.CONFIG.fileTypes.map(type => this.processPages(type))
        ]);
  
        if (!isRebuild) {
          await this.processHtmlFiles(this.directories.pages);
        }
  
        await this.genBuildInfo(true);
        console.log(colors.style('Build process completed successfully.', colors.fg.green));
      } catch (error) {
        console.error('Build process failed:', error);
        await this.handleBuildFailure();
        throw error;
      }
    }
  
    async unbuild(isRebuild = false) {
      console.log(colors.style('Starting unbuild process...', colors.fg.cyan));
      try {
        await Promise.all([
          ...BuildTool.CONFIG.fileTypes.map(type =>
            this.restoreFile(
              type === 'css' ? this.files.baseCssOut : this.files.baseJsOut,
              type === 'css' ? this.files.baseCss : this.files.baseJs,
              type
            )
          ),
          ...BuildTool.CONFIG.fileTypes.map(type => this.restorePages(type))
        ]);
  
        if (!isRebuild) {
          await this.processHtmlFiles(this.directories.pages, 'uncomment');
        }
  
        await this.genBuildInfo(false);
        console.log(colors.style('Unbuild process completed successfully.', colors.fg.green));
      } catch (error) {
        console.error('Unbuild process failed:', error);
        throw error;
      }
    }
  
    async processHtmlFiles(startPath, mode = 'comment') {
      async function* findHtmlFiles(dir) {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            yield* findHtmlFiles(fullPath);
          } else if (entry.isFile() && path.extname(entry.name) === '.html') {
            yield fullPath;
          }
        }
      }
  
      const patterns = {
        comment: [
          {
            from: /<link rel="stylesheet" href="\/layx\/layx\.css">/g,
            to: '<!--<link rel="stylesheet" href="/layx/layx.css">-->'
          },
          {
            from: /<script src="\/layx\/layx\.js" type="module"><\/script>/g,
            to: '<!--<script src="/layx/layx.js" type="module"></script>-->'
          }
        ],
        uncomment: [
          {
            from: /<!--<link rel="stylesheet" href="\/layx\/layx\.css">-->/g,
            to: '<link rel="stylesheet" href="/layx/layx.css">'
          },
          {
            from: /<!--<script src="\/layx\/layx\.js" type="module"><\/script>-->/g,
            to: '<script src="/layx/layx.js" type="module"></script>'
          }
        ]
      };
  
      async function processFile(filePath) {
        let content = await fs.readFile(filePath, 'utf8');
        let modified = false;
  
        patterns[mode].forEach(({ from, to }) => {
          const newContent = content.replace(from, to);
          if (newContent !== content) {
            content = newContent;
            modified = true;
          }
        });
  
        if (modified) {
          await fs.writeFile(filePath, content, 'utf8');
          console.log(`${mode}ed LayX files in ${filePath}`);
        }
      }
  
      try {
  
        const indexPath = path.join(this.directories.current, 'index.html');
        if (await fs.stat(indexPath).catch(() => false)) {
          await processFile(indexPath);
        }
  
        for await (const filePath of findHtmlFiles(startPath)) {
          await processFile(filePath);
        }
      } catch (error) {
        console.error('Error processing HTML files:', error);
        throw error;
      }
    }
  
    async processFiles(fileType) {
      const layxPath = fileType === 'css' ? this.files.layxCss : this.files.layxJs;
      const basePath = fileType === 'css' ? this.files.baseCss : this.files.baseJs;
      const layxOutPath = fileType === 'css' ? this.files.layxCssOut : this.files.layxJsOut;
      const baseOutPath = fileType === 'css' ? this.files.baseCssOut : this.files.baseJsOut;
  
      const layxContent = await readFile(layxPath);
      let baseContent = await readFile(basePath).catch(() => {
        console.warn(`Warning: Could not read ${basePath}. Continuing without it.`);
        return '';
      });
  
      const processedContent = await this.processImports(layxContent, layxPath, fileType);
      const filteredContent = this.removeImportStatements(processedContent);
      const finalContent = fileType === 'js' ? this.removeExportAndDefault(filteredContent) : filteredContent;
  
      await writeFile(layxOutPath, `/* layx ${fileType} code */\n${finalContent}`);
      await writeFile(baseOutPath, `/* User base ${fileType} code */\n${this.removeComments(baseContent)}`);
      await writeFile(basePath, this.minify(finalContent + baseContent, fileType));
  
      console.log(`Processed ${fileType.toUpperCase()} files successfully.`);
    }
  
    async processPages(fileType) {
      const pagesDir = fileType === 'css' ? this.directories.pagesCss : this.directories.pagesJs;
      const pagesOutDir = fileType === 'css' ? this.directories.pagesCssOut : this.directories.pagesJsOut;
  
      const pageFiles = await this.getFilesWithExtension(pagesDir, fileType);
  
      for (const file of pageFiles) {
        const filePath = path.join(pagesDir, file);
        const outPath = path.join(pagesOutDir, file);
        const content = await readFile(filePath);
  
        await writeFile(outPath, content);
        await writeFile(filePath, this.minify(content, fileType));
        console.log(`Processed ${file}`);
      }
    }
  
    async restoreFile(sourcePath, destinationPath, fileType) {
      try {
        const content = await readFile(sourcePath);
        await writeFile(destinationPath, content);
        console.log(`Restored ${fileType.toUpperCase()} file: ${path.basename(destinationPath)}`);
      } catch (error) {
        console.error(`Error restoring ${fileType.toUpperCase()} file:`, error.message);
      }
    }
  
    async restorePages(fileType) {
      const pagesDir = fileType === 'css' ? this.directories.pagesCssOut : this.directories.pagesJsOut;
      const destDir = fileType === 'css' ? this.directories.pagesCss : this.directories.pagesJs;
  
      const pageFiles = await this.getFilesWithExtension(pagesDir, fileType);
  
      for (const file of pageFiles) {
        const sourcePath = path.join(pagesDir, file);
        const destPath = path.join(destDir, file);
        await this.restoreFile(sourcePath, destPath, fileType);
      }
    }
  
    async processFiles(fileType) {
      const { source, base, output, baseOutput } = this.getFilePaths(fileType);
  
      try {
        const [sourceContent, baseContent] = await Promise.all([
          readFile(source),
          readFile(base).catch(() => '')
        ]);
  
        const processed = await this.processImports(sourceContent, source, fileType);
        const filtered = this.removeImportStatements(processed);
        const final = fileType === 'js' ? this.removeExportAndDefault(filtered) : filtered;
  
        await Promise.all([
          writeFile(output, `/* layx ${fileType} code */\n${final}`),
          writeFile(baseOutput, `/* User base ${fileType} code */\n${this.removeComments(baseContent)}`),
          writeFile(base, this.minify(final + baseContent, fileType))
        ]);
      } catch (error) {
        throw new Error(`Failed to process ${fileType} files: ${error.message}`);
      }
    }
  
    async processPages(fileType) {
      const pagesDir = fileType === 'css' ? this.directories.pagesCss : this.directories.pagesJs;
      const pagesOutDir = fileType === 'css' ? this.directories.pagesCssOut : this.directories.pagesJsOut;
  
      const pageFiles = await this.getFilesWithExtension(pagesDir, fileType);
  
      for (const file of pageFiles) {
        const filePath = path.join(pagesDir, file);
        const outPath = path.join(pagesOutDir, file);
        const content = await readFile(filePath);
  
        await writeFile(outPath, content);
        await writeFile(filePath, this.minify(content, fileType));
        console.log(`Processed ${file}`);
      }
    }
  
    async restoreFile(sourcePath, destinationPath, fileType) {
      try {
        const content = await readFile(sourcePath);
        await writeFile(destinationPath, content);
        console.log(`Restored ${fileType.toUpperCase()} file: ${path.basename(destinationPath)}`);
      } catch (error) {
        console.error(`Error restoring ${fileType.toUpperCase()} file:`, error.message);
      }
    }
  
    async restorePages(fileType) {
      const pagesDir = fileType === 'css' ? this.directories.pagesCssOut : this.directories.pagesJsOut;
      const destDir = fileType === 'css' ? this.directories.pagesCss : this.directories.pagesJs;
  
      const pageFiles = await this.getFilesWithExtension(pagesDir, fileType);
  
      for (const file of pageFiles) {
        const sourcePath = path.join(pagesDir, file);
        const destPath = path.join(destDir, file);
        await this.restoreFile(sourcePath, destPath, fileType);
      }
    }
  
    getFilePaths(fileType) {
      const paths = {
        css: {
          source: this.files.layxCss,
          base: this.files.baseCss,
          output: this.files.layxCssOut,
          baseOutput: this.files.baseCssOut
        },
        js: {
          source: this.files.layxJs,
          base: this.files.baseJs,
          output: this.files.layxJsOut,
          baseOutput: this.files.baseJsOut
        }
      };
      return paths[fileType];
    }
  
    async genBuildInfo(buildState) {
      try {
        const buildInfo = JSON.stringify({ build: buildState }, null, 2);
        await writeFile(this.files.buildInfo, buildInfo);
      } catch (error) {
        console.error('Failed to generate build info:', error);
        throw error;
      }
    }
  
    async getBuildInfo() {
      try {
        const content = await readFile(this.files.buildInfo);
        return JSON.parse(content);
      } catch (error) {
        if (error.code === 'ENOENT') return null;
        throw error;
      }
    }
  
    async handleBuildFailure() {
      try {
        await this.genBuildInfo(false);
        console.log('Build state reset due to failure');
      } catch (error) {
        console.error('Failed to reset build state:', error);
      }
    }
  
    // Utility methods 
    async processImports(content, filePath, fileType) {
      const importUrls = this.extractImportUrls(content, fileType);
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
  
    minify(content, fileType) {
      if (fileType === 'css') {
        return content
          .replace(/\/\*[\s\S]*?\*\//g, '')
          .replace(/([^{}])\s+/g, '$1 ')
          .replace(/\s*\n\s*/g, '')
          .replace(/\s*{\s*/g, '{')
          .replace(/\s*}\s*/g, '}')
          .replace(/\s*;\s*/g, ';')
          .trim();
      } else if (fileType === 'js') {
        return content
          .replace(/\/\/.*|\/\*[\s\S]*?\*\//g, '')
          .replace(/\s+/g, ' ')
          .trim();
      }
      return content;
    }
  
    extractImportUrls(content, fileType) {
      const regex = fileType === 'css'
        ? /@import\s+url\(([^)]+)\);/g
        : /import\s+(?:\w+|\{[^}]+\})\s+from\s+['"]([^'"]+)['"]/g;
  
      return [...content.matchAll(regex)].map(match => match[1].replace(/['"]/g, ''));
    }
  
    removeExportAndDefault(content) {
      content = content.replace(/export\s+default\s+/g, '');
      content = content.replace(/^export\s+/gm, '');
      return content;
    }
  
    removeImportStatements(content) {
      return content.split('\n').filter(line => !line.trim().startsWith('@import') && !line.trim().startsWith('import')).join('\n');
    }
  
    removeComments(content) {
      return content.replace(/\/\*[\s\S]*?\*\//g, '');
    }
  
    async getFilesWithExtension(directory, extension) {
      const files = await fs.readdir(directory);
      return files.filter(file => path.extname(file) === `.${extension}`);
    }
  }

  export default BuildTool;
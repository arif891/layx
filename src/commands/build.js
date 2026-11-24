import path from 'node:path';
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import pc from 'picocolors';
import { bundleCss } from '../engine/css-bundler.js';
import { bundleJs } from '../engine/js-bundler.js';
import { processHtmlFiles, checkPagesCollision, copyPagesNonHtmlFiles } from '../engine/html-transformer.js';
import { optimizeImagesForBuild } from '../engine/image-optimizer.js';
import { purgeUnusedSvgSymbols } from '../engine/svg-purger.js';
import { loadProjectConfig } from '../core/config.js';
import { projectPaths } from '../core/paths.js';

export { build };

async function build(options = {}) {
    console.log(pc.cyan('Starting build process...'));

    const projectConfig = await loadProjectConfig();
    const outDirName = options.outDir || projectConfig.build.outDir || 'dist';
    const outDir = path.resolve(projectPaths.root, outDirName);

    // Defensive check: prevent wiping project root or source dirs
    if (
        outDir === projectPaths.root ||
        outDir === path.dirname(projectPaths.root) ||
        outDir.startsWith(projectPaths.layx) ||
        outDir.startsWith(projectPaths.assets)
    ) {
        throw new Error(`Output directory cannot be project root, parent directory, or inside layx/assets (${outDir})`);
    }

    // Collision check: verify no files or folders in pages/ conflict with root files or folders
    await checkPagesCollision(projectPaths.root, projectPaths.pages);

    const optimize = options.optimize !== false;
    const optimizer = optimize ? (options.optimizer || projectConfig.images?.formats?.[0] || 'avif') : null;

    try {
        // Clean and prepare output directory
        await fs.rm(outDir, { recursive: true, force: true });
        await fs.mkdir(outDir, { recursive: true });

        // 1. Copy assets subdirectories (font, brand, media, static, etc.)
        await copyOtherAssets(projectPaths.assets, path.join(outDir, 'assets'));

        // 2. Copy all files and folders from root (except layx and dev/build exclusions)
        await copyRootFilesAndFolders(projectPaths.root, outDir);

        // 3. Copy non-HTML files from pages/ directly to outDir root
        await copyPagesNonHtmlFiles(projectPaths.pages, outDir);

        // 4. Images: optimize raster images and purge SVG symbols directly into outDir
        if (existsSync(projectPaths.image)) {
            if (optimize) {
                await optimizeImagesForBuild(outDir, optimizer);
            } else {
                await copyDirectory(projectPaths.image, path.join(outDir, 'assets/image'));
            }

            await purgeUnusedSvgSymbols({
                root: projectPaths.root,
                image: projectPaths.image,
                outDir
            });
        }

        // 5. Bundle CSS into outDir/assets/css
        await bundleCss(outDir, optimize, optimizer);

        // 6. Bundle JS into outDir/assets/js
        await bundleJs(outDir, projectConfig);

        // 7. Transform HTML entry points (flatten pages/ to root, remove layx entries, update links)
        await processHtmlFiles(projectPaths.root, outDir, { optimizer });

        console.log(pc.green(`Build process completed successfully! Output generated in: ${outDir}`));
    } catch (error) {
        console.error(pc.red(`Build process failed: ${error.message}`));
        throw error;
    }
}

async function copyOtherAssets(srcAssetsDir, destAssetsDir) {
    if (!existsSync(srcAssetsDir)) return;
    const entries = await fs.readdir(srcAssetsDir, { withFileTypes: true });

    for (const entry of entries) {
        if (entry.name === 'css' || entry.name === 'js' || entry.name === 'image') {
            continue;
        }
        if (entry.name === '.gitkeep') continue;

        const srcPath = path.join(srcAssetsDir, entry.name);
        const destPath = path.join(destAssetsDir, entry.name);

        if (entry.isDirectory()) {
            await copyDirectory(srcPath, destPath);
        } else if (entry.isFile()) {
            await fs.mkdir(destAssetsDir, { recursive: true });
            await fs.copyFile(srcPath, destPath);
        }
    }
}

async function copyDirectory(src, dest) {
    if (!existsSync(src)) return;
    await fs.mkdir(dest, { recursive: true });
    const entries = await fs.readdir(src, { withFileTypes: true });

    for (const entry of entries) {
        if (entry.name === '.gitkeep') continue;
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);

        if (entry.isDirectory()) {
            await copyDirectory(srcPath, destPath);
        } else if (entry.isFile()) {
            await fs.copyFile(srcPath, destPath);
        }
    }
}

async function copyRootFilesAndFolders(srcRoot, destDir) {
    if (!existsSync(srcRoot)) return;

    const excludeDirs = new Set([
        'layx',          // Framework core - explicitly excluded
        'node_modules',  // Node dependencies
        '.git',
        '.github',
        '.vscode',
        '.agent',
        'scratch',
        'template',
        'assets',        // Handled by asset bundlers & copyOtherAssets
        'pages',         // Handled by pages flattening
        path.basename(destDir) // Output directory itself
    ]);

    const excludeFiles = new Set([
        'package.json',
        'package-lock.json',
        'layx.config.mjs',
        'layx.config.js',
        'config.mjs',
        '.gitignore',
        '.npmignore',
        '.gitkeep'
    ]);

    const entries = await fs.readdir(srcRoot, { withFileTypes: true });

    for (const entry of entries) {
        if (entry.isDirectory()) {
            if (excludeDirs.has(entry.name)) continue;
            if (path.resolve(srcRoot, entry.name) === path.resolve(destDir)) continue;

            const srcPath = path.join(srcRoot, entry.name);
            if (entry.name === 'public') {
                // Contents of public/ are copied directly to root of destDir
                await copyDirectory(srcPath, destDir);
            } else {
                // Any other folder in root (e.g. static/, downloads/, data/, etc.) is copied into destDir
                await copyDirectory(srcPath, path.join(destDir, entry.name));
            }
        } else if (entry.isFile()) {
            // HTML files are transformed and copied by processHtmlFiles
            if (path.extname(entry.name) === '.html') continue;
            if (excludeFiles.has(entry.name)) continue;
            if (entry.name.endsWith('.tgz')) continue;

            // Copy all other root files (favicon, robots, sitemap, _headers, _redirects, webmanifest, etc.)
            const srcFile = path.join(srcRoot, entry.name);
            const destFile = path.join(destDir, entry.name);
            await fs.copyFile(srcFile, destFile);
        }
    }
}

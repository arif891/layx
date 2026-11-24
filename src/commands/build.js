import path from 'node:path';
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import pc from 'picocolors';
import { bundleCss } from '../engine/css-bundler.js';
import { bundleJs } from '../engine/js-bundler.js';
import { processHtmlFiles, checkPagesCollision, copyPagesNonHtmlFiles } from '../engine/html-transformer.js';
import { optimizeImagesForBuild, updateUrlsInContent } from '../engine/image-optimizer.js';
import { purgeUnusedSvgSymbols } from '../engine/svg-purger.js';
import { unwrapComponentCode } from '../engine/component-unwrapper.js';
import { isPathExcluded } from '../utils/fs.js';
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

    const normalizeList = (val) => {
        if (!val) return [];
        if (Array.isArray(val)) return val;
        if (typeof val === 'string') return val.split(',').map(s => s.trim()).filter(Boolean);
        return [val];
    };

    const userCopy = [
        ...normalizeList(projectConfig.build?.copy),
        ...normalizeList(options.copy)
    ];

    const userExclude = [
        ...normalizeList(projectConfig.build?.exclude),
        ...normalizeList(options.exclude)
    ];

    // Collision check: verify no non-excluded files or folders in pages/ conflict with root files or folders
    await checkPagesCollision(projectPaths.root, projectPaths.pages, userExclude);

    const optimize = options.optimize !== false;
    const optimizer = optimize ? (options.optimizer || projectConfig.images?.formats?.[0] || 'avif') : null;

    try {
        // Clean and prepare output directory
        await fs.rm(outDir, { recursive: true, force: true });
        await fs.mkdir(outDir, { recursive: true });

        // 1. Copy assets subdirectories (font, brand, media, static, etc.)
        await copyOtherAssets(projectPaths.assets, path.join(outDir, 'assets'), userExclude);

        // 2. Copy all files and folders from root (except layx and dev/build exclusions)
        await copyRootFilesAndFolders(projectPaths.root, outDir, { copy: userCopy, exclude: userExclude });

        // 3. Copy custom configured targets (files, folders, or { from, to } mappings)
        await executeCustomCopy(projectPaths.root, outDir, userCopy);

        // 4. Copy non-HTML files from pages/ directly to outDir root
        await copyPagesNonHtmlFiles(projectPaths.pages, outDir, userExclude);

        // 5. Images: optimize raster images and purge SVG symbols directly into outDir
        if (existsSync(projectPaths.image) && !isPathExcluded('assets/image', userExclude) && !isPathExcluded('image', userExclude)) {
            if (optimize) {
                await optimizeImagesForBuild(outDir, optimizer);
            } else {
                await copyDirectory(projectPaths.image, path.join(outDir, 'assets/image'), userExclude);
            }

            await purgeUnusedSvgSymbols({
                root: projectPaths.root,
                image: projectPaths.image,
                outDir
            });
        }

        // 6. Bundle CSS into outDir/assets/css
        await bundleCss(outDir, optimize, optimizer);

        // 7. Bundle JS into outDir/assets/js
        await bundleJs(outDir, projectConfig, optimizer);

        // 8. Unwrap any copied non-bundled JS files in outDir
        await unwrapOutDirJs(outDir, optimizer);

        // 9. Transform HTML entry points (flatten pages/ to root, remove layx entries, bake components, update links)
        await processHtmlFiles(projectPaths.root, outDir, { optimizer, projectConfig, exclude: userExclude });

        console.log(pc.green(`Build process completed successfully! Output generated in: ${outDir}`));
    } catch (error) {
        console.error(pc.red(`Build process failed: ${error.message}`));
        throw error;
    }
}

async function copyOtherAssets(srcAssetsDir, destAssetsDir, exclude = []) {
    if (!existsSync(srcAssetsDir)) return;
    const entries = await fs.readdir(srcAssetsDir, { withFileTypes: true });

    for (const entry of entries) {
        if (entry.name === 'css' || entry.name === 'js' || entry.name === 'image') {
            continue;
        }
        if (entry.name === '.gitkeep') continue;
        if (isPathExcluded(entry.name, exclude) || isPathExcluded(`assets/${entry.name}`, exclude)) continue;

        const srcPath = path.join(srcAssetsDir, entry.name);
        const destPath = path.join(destAssetsDir, entry.name);

        if (entry.isDirectory()) {
            await copyDirectory(srcPath, destPath, exclude);
        } else if (entry.isFile()) {
            await fs.mkdir(destAssetsDir, { recursive: true });
            await fs.copyFile(srcPath, destPath);
        }
    }
}

async function copyDirectory(src, dest, exclude = []) {
    if (!existsSync(src)) return;
    await fs.mkdir(dest, { recursive: true });
    const entries = await fs.readdir(src, { withFileTypes: true });

    for (const entry of entries) {
        if (entry.name === '.gitkeep') continue;
        if (isPathExcluded(entry.name, exclude)) continue;

        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);

        if (entry.isDirectory()) {
            await copyDirectory(srcPath, destPath, exclude);
        } else if (entry.isFile()) {
            await fs.copyFile(srcPath, destPath);
        }
    }
}

async function copyRootFilesAndFolders(srcRoot, destDir, { copy = [], exclude = [] } = {}) {
    if (!existsSync(srcRoot)) return;

    const explicitCopies = new Set(
        copy.map(item => (typeof item === 'string' ? item : item?.from)).filter(Boolean)
    );

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
        const relPath = entry.name;
        if (isPathExcluded(relPath, exclude)) continue;

        if (entry.isDirectory()) {
            if (excludeDirs.has(entry.name) && !explicitCopies.has(entry.name)) continue;
            if (path.resolve(srcRoot, entry.name) === path.resolve(destDir)) continue;

            const srcPath = path.join(srcRoot, entry.name);
            if (entry.name === 'public') {
                // Contents of public/ are copied directly to root of destDir
                await copyDirectory(srcPath, destDir, exclude);
            } else {
                // Any other folder in root (e.g. static/, downloads/, data/, etc.) is copied into destDir
                await copyDirectory(srcPath, path.join(destDir, entry.name), exclude);
            }
        } else if (entry.isFile()) {
            // HTML files are transformed and copied by processHtmlFiles
            if (path.extname(entry.name) === '.html') continue;
            if (excludeFiles.has(entry.name) && !explicitCopies.has(entry.name)) continue;
            if (entry.name.endsWith('.tgz')) continue;

            // Copy all other root files (favicon, robots, sitemap, _headers, _redirects, webmanifest, etc.)
            const srcFile = path.join(srcRoot, entry.name);
            const destFile = path.join(destDir, entry.name);
            await fs.copyFile(srcFile, destFile);
        }
    }
}

async function executeCustomCopy(srcRoot, destDir, copyConfig) {
    if (!Array.isArray(copyConfig) || copyConfig.length === 0) return;

    for (const item of copyConfig) {
        if (!item) continue;
        let fromRel;
        let toRel;

        if (typeof item === 'string') {
            fromRel = item;
            toRel = item;
        } else if (typeof item === 'object' && item.from) {
            fromRel = item.from;
            toRel = item.to || item.from;
        } else {
            continue;
        }

        const fromPath = path.resolve(srcRoot, fromRel);
        const toPath = path.resolve(destDir, toRel);

        if (!existsSync(fromPath)) {
            console.warn(pc.yellow(`[LayX Build] Configured copy target not found: ${fromRel} (${fromPath})`));
            continue;
        }

        const stat = await fs.stat(fromPath);
        if (stat.isDirectory()) {
            await copyDirectory(fromPath, toPath);
        } else if (stat.isFile()) {
            await fs.mkdir(path.dirname(toPath), { recursive: true });
            await fs.copyFile(fromPath, toPath);
        }
    }
}

async function unwrapOutDirJs(outDir, optimizer = null) {
    if (!existsSync(outDir)) return;

    async function* getJsFiles(dir) {
        let entries;
        try {
            entries = await fs.readdir(dir, { withFileTypes: true });
        } catch {
            return;
        }
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                yield* getJsFiles(fullPath);
            } else if (entry.isFile() && path.extname(entry.name) === '.js') {
                yield fullPath;
            }
        }
    }

    for await (const file of getJsFiles(outDir)) {
        try {
            const content = await fs.readFile(file, 'utf8');
            let unwrapped = unwrapComponentCode(content);
            if (optimizer) {
                unwrapped = updateUrlsInContent(unwrapped, 'js', optimizer);
            }
            if (unwrapped !== content) {
                await fs.writeFile(file, unwrapped, 'utf8');
            }
        } catch {}
    }
}

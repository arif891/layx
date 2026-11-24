import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { existsSync } from 'node:fs';
import * as esbuild from 'esbuild';
import { getFilesWithExtension, readFile, writeFile } from '../utils/fs.js';
import { projectPaths } from '../core/paths.js';
import { loadProjectConfig } from '../core/config.js';
import { removePagesFromLinks } from './html-transformer.js';
import { unwrapComponentCode } from './component-unwrapper.js';
import { updateUrlsInContent } from './image-optimizer.js';

export { bundleJs, getPageEntryPoints };

const INTERNAL_DIR_NAMES = new Set([
    'modules',
    'components',
    'utils',
    'helpers',
    'services',
    'lib',
    'core',
    'shared',
    'common',
    'vendor',
    'ai',
    'store',
    'stores',
    'hooks',
    'context'
]);

async function getPageEntryPoints(pagesJsDir, rootDir) {
    let allFiles = [];
    try {
        allFiles = await getFilesWithExtension(pagesJsDir, 'js', true);
    } catch {
        return [];
    }

    // Collect all script src paths referenced in project HTML files
    const htmlLinkedScripts = new Set();
    try {
        const htmlFiles = await getFilesWithExtension(rootDir, 'html', true);
        for (const htmlFile of htmlFiles) {
            const relHtml = path.relative(rootDir, htmlFile).replace(/\\/g, '/');
            if (relHtml.startsWith('dist/') || relHtml.startsWith('node_modules/')) continue;
            const content = await readFile(htmlFile);
            const scriptMatches = content.matchAll(/<script\b[^>]*\bsrc=['"]([^'"]+)['"]/gi);
            for (const match of scriptMatches) {
                const src = match[1].replace(/^\//, '').replace(/\\/g, '/');
                htmlLinkedScripts.add(src);
                if (src.startsWith('assets/js/pages/')) {
                    htmlLinkedScripts.add(src.replace(/^assets\/js\/pages\//, ''));
                }
            }
        }
    } catch {}

    const entryPoints = [];

    for (const file of allFiles) {
        const relFromPages = path.relative(pagesJsDir, file).replace(/\\/g, '/');
        const relFromRoot = path.relative(rootDir, file).replace(/\\/g, '/');
        const segments = relFromPages.split('/');

        // 1. If explicitly referenced in HTML, it is an entry point!
        if (htmlLinkedScripts.has(relFromRoot) || htmlLinkedScripts.has(relFromPages)) {
            entryPoints.push(file);
            continue;
        }

        // 2. Ignore private/internal directories (modules, components, etc.)
        const hasInternalDir = segments.some((seg, idx) =>
            idx < segments.length - 1 && (INTERNAL_DIR_NAMES.has(seg.toLowerCase()) || seg.startsWith('_'))
        );
        if (hasInternalDir) {
            continue;
        }

        // 3. Ignore files starting with underscore
        if (path.basename(file).startsWith('_')) {
            continue;
        }

        // 4. Top-level files directly under pages/ (e.g. pages/home.js, pages/other.js)
        if (segments.length === 1) {
            entryPoints.push(file);
            continue;
        }

        // 5. Entry point files under pages/<page>/ (e.g. pages/app/index.js, pages/app/main.js, pages/app/app.js)
        const baseNameWithoutExt = path.basename(file, '.js');
        const parentDirName = segments[segments.length - 2];
        if (
            baseNameWithoutExt === 'index' ||
            baseNameWithoutExt === 'main' ||
            baseNameWithoutExt === parentDirName
        ) {
            entryPoints.push(file);
        }
    }

    return entryPoints;
}

async function bundleJs(outDir, projectConfig = null, optimizer = null) {
    try {
        if (!projectConfig) {
            projectConfig = await loadProjectConfig();
        }

        const outJsDir = path.join(outDir, 'assets/js');
        const hasLayxJs = existsSync(projectPaths.layxJs);
        const hasBaseJs = existsSync(projectPaths.baseJs);

        const entryPoints = {};

        // Base bundle: bundles layx.js + user base.js without modifying source files
        if (hasLayxJs || hasBaseJs) {
            entryPoints['base'] = 'virtual:layx-base';
        }

        // Page JS files: only actual page entry points get bundled to outDir/assets/js/pages/*.js
        const pageFiles = await getPageEntryPoints(projectPaths.pagesJs, projectPaths.root);

        for (const file of pageFiles) {
            const relPath = path.relative(projectPaths.pagesJs, file).replace(/\\/g, '/');
            const entryKey = `pages/${relPath.replace(/\.js$/, '')}`;
            entryPoints[entryKey] = file;
        }

        if (projectConfig.build?.entryPoints && typeof projectConfig.build.entryPoints === 'object') {
            Object.assign(entryPoints, projectConfig.build.entryPoints);
        }

        if (Object.keys(entryPoints).length === 0) {
            console.log('No JS files found to bundle.');
            return;
        }

        const virtualPlugin = {
            name: 'layx-virtual-entry',
            setup(build) {
                build.onResolve({ filter: /^virtual:layx-base$/ }, args => ({
                    path: args.path,
                    namespace: 'layx-virtual'
                }));

                build.onLoad({ filter: /.*/, namespace: 'layx-virtual' }, () => {
                    let contents = '';
                    if (hasLayxJs) {
                        const rel = './' + path.relative(projectPaths.root, projectPaths.layxJs).replace(/\\/g, '/');
                        contents += `import ${JSON.stringify(rel)};\n`;
                    }
                    if (hasBaseJs) {
                        const rel = './' + path.relative(projectPaths.root, projectPaths.baseJs).replace(/\\/g, '/');
                        contents += `import ${JSON.stringify(rel)};\n`;
                    }
                    return {
                        contents,
                        resolveDir: projectPaths.root,
                        loader: 'js'
                    };
                });
            }
        };

        const componentUnwrapPlugin = {
            name: 'layx-component-unwrap',
            setup(build) {
                build.onLoad({ filter: /\.js$/ }, async (args) => {
                    if (args.path.includes('node_modules')) return;

                    let contents;
                    try {
                        contents = await readFile(args.path);
                    } catch {
                        return;
                    }

                    const transformed = unwrapComponentCode(contents);
                    return {
                        contents: transformed,
                        loader: 'js',
                        resolveDir: path.dirname(args.path)
                    };
                });
            }
        };

        const userBuildOptions = { ...projectConfig.build };
        delete userBuildOptions.outDir;
        delete userBuildOptions.dist;
        delete userBuildOptions.copy;
        delete userBuildOptions.exclude;

        const esbuildConfig = {
            entryPoints,
            outdir: outJsDir,
            allowOverwrite: true,
            bundle: true,
            splitting: true,
            treeShaking: true,
            plugins: [virtualPlugin, componentUnwrapPlugin],
            assetNames: '[path]/[name]',
            chunkNames: 'chunks/[name]-[hash]',
            ...userBuildOptions
        };

        // Guarantee output directory is outJsDir
        esbuildConfig.outdir = outJsDir;

        await esbuild.build(esbuildConfig);

        // Update /pages/ links in bundled JS output
        let jsOutputFiles = [];
        try {
            jsOutputFiles = await getFilesWithExtension(outJsDir, 'js', true);
        } catch {
            jsOutputFiles = [];
        }
        for (const file of jsOutputFiles) {
            const content = await readFile(file);
            let updated = removePagesFromLinks(content);
            updated = unwrapComponentCode(updated);
            if (optimizer) {
                updated = updateUrlsInContent(updated, 'js', optimizer);
            }
            if (updated !== content) {
                await writeFile(file, updated);
            }
        }

        console.log('ESBuild processed JS ->', outJsDir);
    } catch (error) {
        console.error('Error processing JS files:', error);
        throw error;
    }
}

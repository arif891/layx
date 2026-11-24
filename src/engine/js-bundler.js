import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { existsSync } from 'node:fs';
import * as esbuild from 'esbuild';
import { getFilesWithExtension, readFile, writeFile } from '../utils/fs.js';
import { projectPaths } from '../core/paths.js';
import { loadProjectConfig } from '../core/config.js';
import { removePagesFromLinks } from './html-transformer.js';
import { unwrapComponentCode } from './component-unwrapper.js';

export { bundleJs };

async function bundleJs(outDir, projectConfig = null) {
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

        // Page JS files: each page gets bundled to outDir/assets/js/pages/*.js
        let pageFiles = [];
        try {
            pageFiles = await getFilesWithExtension(projectPaths.pagesJs, 'js', true);
        } catch {
            pageFiles = [];
        }

        for (const file of pageFiles) {
            const relPath = path.relative(projectPaths.pagesJs, file).replace(/\\/g, '/');
            const entryKey = `pages/${relPath.replace(/\.js$/, '')}`;
            entryPoints[entryKey] = file;
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

import path from 'node:path';
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import pc from 'picocolors';
import { packagePaths, projectPaths } from '../../core/paths.js';
import { registryConfig } from '../../config/registry.js';
import { registerCssImport, registerJsImport } from './wire.js';
import { readFile } from '../../utils/fs.js';

export { otherAdd, addSingleOther };

async function otherAdd(modules) {
    if (!modules || modules.length === 0) {
        console.log(pc.yellow('No other module name specified. E.g.: layx add -o smooth_scroll'));
        return;
    }

    const moduleNames = modules.map(m => m.toLowerCase());
    console.log(pc.cyan(`\nAdding module(s): ${moduleNames.join(', ')}...\n`));

    for (const name of moduleNames) {
        try {
            await addSingleOther(name);
        } catch (error) {
            console.error(pc.red(`Failed to add module "${name}": ${error.message}`));
        }
    }
}

async function addSingleOther(name) {
    const localOtherDir = path.join(packagePaths.framework, 'others', name);
    const targetOtherDir = path.join(projectPaths.layx, 'others', name);

    // 1. Check Local Package
    if (existsSync(localOtherDir)) {
        console.log(pc.green(`✔ Found "${name}" in local package others.`));

        // Copy other module folder to project layx/others/<name>
        await fs.cp(localOtherDir, targetOtherDir, { recursive: true });

        // Load manifest.json if present
        let manifest = null;
        const manifestPath = path.join(localOtherDir, 'manifest.json');
        if (existsSync(manifestPath)) {
            try {
                manifest = JSON.parse(await readFile(manifestPath));
            } catch (err) {
                console.warn(pc.yellow(`Warning: Invalid manifest.json in "${name}": ${err.message}`));
            }
        }

        if (manifest) {
            // Process CSS (supports string or array)
            const cssList = normalizeArray(manifest.css || manifest.entry?.css);
            for (const cssRel of cssList) {
                const fullRel = path.join('others', name, cssRel).replace(/\\/g, '/');
                const added = await registerCssImport(fullRel);
                if (added) console.log(pc.green(`✔ Registered CSS: @import url(${fullRel}); in layx.css under /* Other */`));
            }

            // Process JS (supports string or array)
            const jsList = normalizeArray(manifest.js || manifest.entry?.js);
            for (const jsRel of jsList) {
                const fullRel = path.join('others', name, jsRel).replace(/\\/g, '/');
                const added = await registerJsImport(fullRel);
                if (added) console.log(pc.green(`✔ Registered JS: import './${fullRel}'; in layx.js under /* Other */`));
            }

            // Process Assets
            if (Array.isArray(manifest.assets)) {
                for (const asset of manifest.assets) {
                    if (asset.from && asset.to) {
                        const srcAsset = path.join(localOtherDir, asset.from);
                        const destAsset = path.join(projectPaths.root, asset.to);
                        if (existsSync(srcAsset)) {
                            await fs.mkdir(path.dirname(destAsset), { recursive: true });
                            await fs.copyFile(srcAsset, destAsset);
                            console.log(pc.green(`✔ Copied asset: ${asset.to}`));
                        }
                    }
                }
            }

            // Process Dependencies
            if (manifest.dependencies) {
                if (Array.isArray(manifest.dependencies.others)) {
                    for (const dep of manifest.dependencies.others) {
                        const targetDep = path.join(projectPaths.layx, 'others', dep);
                        if (!existsSync(targetDep)) {
                            console.log(pc.cyan(`Installing required module dependency: "${dep}"...`));
                            await addSingleOther(dep);
                        }
                    }
                }
            }

            // Display HTML snippets (supports string or array)
            const htmlList = normalizeArray(manifest.html || manifest.entry?.html);
            await displaySnippets(name, htmlList, targetOtherDir);

        } else {
            // Fallback for modules without manifest.json
            const mapping = registryConfig.others?.[name];
            let cssPath = mapping?.css || `others/${name}/${name}.css`;
            let jsPath = mapping?.js || `others/${name}/${name}.js`;

            const targetCss = path.join(projectPaths.layx, cssPath);
            if (existsSync(targetCss)) {
                const added = await registerCssImport(cssPath);
                if (added) console.log(pc.green(`✔ Registered CSS: @import url(${cssPath}); in layx.css under /* Other */`));
            } else {
                const foundCss = await findFirstFileWithExtension(targetOtherDir, '.css');
                if (foundCss) {
                    const relCss = path.relative(projectPaths.layx, foundCss).replace(/\\/g, '/');
                    const added = await registerCssImport(relCss);
                    if (added) console.log(pc.green(`✔ Registered CSS: @import url(${relCss}); in layx.css under /* Other */`));
                }
            }

            const targetJs = path.join(projectPaths.layx, jsPath);
            if (existsSync(targetJs)) {
                const added = await registerJsImport(jsPath);
                if (added) console.log(pc.green(`✔ Registered JS: import './${jsPath}'; in layx.js under /* Other */`));
            } else {
                const foundJs = await findFirstFileWithExtension(targetOtherDir, '.js');
                if (foundJs) {
                    const relJs = path.relative(projectPaths.layx, foundJs).replace(/\\/g, '/');
                    const added = await registerJsImport(relJs);
                    if (added) console.log(pc.green(`✔ Registered JS: import './${relJs}'; in layx.js under /* Other */`));
                }
            }

            await displaySnippets(name, mapping?.html ? [mapping.html] : [], targetOtherDir);
        }

        console.log(pc.green(`\nModule "${name}" added successfully!\n`));
        return;
    }

    console.warn(pc.yellow(`Module "${name}" not found in local package layx/others.`));
}

function normalizeArray(val) {
    if (!val) return [];
    if (Array.isArray(val)) return val.filter(Boolean);
    return [val].filter(Boolean);
}

async function displaySnippets(name, htmlFiles, targetDir) {
    try {
        const filesToDisplay = [];
        for (const rel of htmlFiles) {
            const fullPath = path.isAbsolute(rel) ? rel : path.join(targetDir, rel);
            if (existsSync(fullPath)) filesToDisplay.push({ name: rel, path: fullPath });
        }

        if (filesToDisplay.length === 0) {
            const fallback = await findFirstFileWithExtension(targetDir, '.html');
            if (fallback) filesToDisplay.push({ name: path.basename(fallback), path: fallback });
        }

        for (const file of filesToDisplay) {
            const snippet = await readFile(file.path);
            console.log(pc.yellow(`\nHTML Usage (${file.name}):`));
            console.log(pc.dim('----------------------------------------'));
            console.log(snippet.trim());
            console.log(pc.dim('----------------------------------------'));
        }
    } catch {
        // Snippet preview is optional
    }
}

async function findFirstFileWithExtension(dir, ext) {
    try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isFile() && entry.name.endsWith(ext)) {
                return fullPath;
            } else if (entry.isDirectory()) {
                const nested = await findFirstFileWithExtension(fullPath, ext);
                if (nested) return nested;
            }
        }
    } catch {
        return null;
    }
    return null;
}

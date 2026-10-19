import path from 'node:path';
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import pc from 'picocolors';
import { packagePaths, projectPaths } from '../../core/paths.js';
import { registryConfig } from '../../config/registry.js';
import { registerCssImport, registerJsImport } from './wire.js';
import { downloadFile } from '../../utils/download.js';
import { processDependencies } from './utils.js';
import { readFile } from '../../utils/fs.js';
import { addSingleOther } from './other.js';

export { componentAdd, addSingleComponent };

async function componentAdd(components) {
    if (!components || components.length === 0) {
        console.log(pc.yellow('No component name specified. E.g.: layx add -c accordion'));
        return;
    }

    const componentNames = components.map(c => c.toLowerCase());
    console.log(pc.cyan(`\nAdding component(s): ${componentNames.join(', ')}...\n`));

    for (const name of componentNames) {
        try {
            await addSingleComponent(name);
        } catch (error) {
            console.error(pc.red(`Failed to add component "${name}": ${error.message}`));
        }
    }
}

async function addSingleComponent(name) {
    const localComponentDir = path.join(packagePaths.framework, 'components', name);
    const localOtherDir = path.join(packagePaths.framework, 'others', name);
    const targetComponentDir = path.join(projectPaths.layx, 'components', name);

    // 0. Check if it is an others module
    if (!existsSync(localComponentDir) && existsSync(localOtherDir)) {
        await addSingleOther(name);
        return;
    }

    // 1. Check Local Package (Approach 3 - Hybrid, Fast Offline Path)
    if (existsSync(localComponentDir)) {
        console.log(pc.green(`✔ Found "${name}" in local package.`));

        // Copy component folder to project layx/components/<name>
        await fs.cp(localComponentDir, targetComponentDir, { recursive: true });

        // Load manifest.json if present
        let manifest = null;
        const manifestPath = path.join(localComponentDir, 'manifest.json');
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
                const fullRel = path.join('components', name, cssRel).replace(/\\/g, '/');
                const added = await registerCssImport(fullRel);
                if (added) console.log(pc.green(`✔ Registered CSS: @import url(${fullRel}); in layx.css`));
            }

            // Process JS (supports string or array)
            const jsList = normalizeArray(manifest.js || manifest.entry?.js);
            for (const jsRel of jsList) {
                const fullRel = path.join('components', name, jsRel).replace(/\\/g, '/');
                const added = await registerJsImport(fullRel);
                if (added) console.log(pc.green(`✔ Registered JS: import './${fullRel}'; in layx.js`));
            }

            // Process Assets
            if (Array.isArray(manifest.assets)) {
                for (const asset of manifest.assets) {
                    if (asset.from && asset.to) {
                        const srcAsset = path.join(localComponentDir, asset.from);
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
                if (Array.isArray(manifest.dependencies.components)) {
                    for (const dep of manifest.dependencies.components) {
                        const targetDep = path.join(projectPaths.layx, 'components', dep);
                        if (!existsSync(targetDep)) {
                            console.log(pc.cyan(`Installing required component dependency: "${dep}"...`));
                            await addSingleComponent(dep);
                        }
                    }
                }
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
            await displaySnippets(name, htmlList, targetComponentDir);

        } else {
            // Fallback for components without manifest.json
            const mapping = registryConfig.components[name];
            let cssPath = mapping?.css || `components/${name}/${name}.css`;
            let jsPath = mapping?.js;

            if (!existsSync(path.join(projectPaths.layx, cssPath))) {
                const foundCss = await findFirstFileWithExtension(targetComponentDir, '.css');
                if (foundCss) {
                    cssPath = path.relative(projectPaths.layx, foundCss).replace(/\\/g, '/');
                }
            }

            if (!jsPath) {
                const foundJs = await findFirstFileWithExtension(targetComponentDir, '.js');
                if (foundJs) {
                    jsPath = path.relative(projectPaths.layx, foundJs).replace(/\\/g, '/');
                }
            }

            if (existsSync(path.join(projectPaths.layx, cssPath))) {
                const added = await registerCssImport(cssPath);
                if (added) console.log(pc.green(`✔ Registered CSS: @import url(${cssPath}); in layx.css`));
            }

            if (jsPath && existsSync(path.join(projectPaths.layx, jsPath))) {
                const added = await registerJsImport(jsPath);
                if (added) console.log(pc.green(`✔ Registered JS: import './${jsPath}'; in layx.js`));
            }

            await displaySnippets(name, mapping?.html ? [mapping.html] : [], targetComponentDir);
        }

        console.log(pc.green(`\nComponent "${name}" added successfully!\n`));
        return;
    }

    // 2. Fallback to Remote Registry
    console.log(pc.yellow(`"${name}" not found in local package. Checking remote registry...`));
    await addRemoteComponent(name);
}

async function addRemoteComponent(name) {
    const registryUrl = registryConfig.remoteRegistryUrl;
    const infoRes = await fetch(registryUrl + 'info.json').catch(() => {
        throw new Error('Failed to connect to remote component registry');
    });

    if (!infoRes.ok) {
        throw new Error(`Remote registry returned ${infoRes.status}`);
    }

    const infoObj = await infoRes.json();
    const componentInfo = infoObj[name];

    if (!componentInfo?.path) {
        throw new Error(`Component "${name}" does not exist in local package or remote registry.`);
    }

    console.log(pc.cyan(`Downloading "${componentInfo.name}" v${componentInfo.version} from remote registry...`));

    // Download component files
    if (componentInfo.files?.length) {
        await Promise.all(
            componentInfo.files.map(async file => {
                const downloadUrl = registryUrl + componentInfo.path + '/' + file.name;
                const destPath = path.join(projectPaths.layx, componentInfo.localpath || 'components/' + name, file.path);
                await downloadFile(downloadUrl, destPath);
                console.log(pc.dim(`  downloaded: ${file.path}`));
            })
        );
    }

    // Process dependencies
    await processDependencies(componentInfo, 'css', projectPaths.layxCss);
    await processDependencies(componentInfo, 'js', projectPaths.layxJs);

    console.log(pc.green(`✔ Component "${name}" downloaded and registered successfully!\n`));
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

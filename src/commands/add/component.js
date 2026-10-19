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

export { componentAdd };

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
    const targetComponentDir = path.join(projectPaths.layx, 'components', name);

    // 1. Check Local Package (Approach 3 - Hybrid, Fast Offline Path)
    if (existsSync(localComponentDir)) {
        console.log(pc.green(`✔ Found "${name}" in local package.`));

        // Copy component folder to project layx/components/<name>
        await fs.cp(localComponentDir, targetComponentDir, { recursive: true });

        // Auto-wire imports based on registry mapping or folder contents
        const mapping = registryConfig.components[name];
        let cssPath = mapping?.css || `components/${name}/${name}.css`;
        let jsPath = mapping?.js;

        // Auto-detect CSS if default doesn't exist
        if (!existsSync(path.join(projectPaths.layx, cssPath))) {
            const foundCss = await findFirstFileWithExtension(targetComponentDir, '.css');
            if (foundCss) {
                cssPath = path.relative(projectPaths.layx, foundCss).replace(/\\/g, '/');
            }
        }

        // Auto-detect JS if not specified in mapping
        if (!jsPath) {
            const foundJs = await findFirstFileWithExtension(targetComponentDir, '.js');
            if (foundJs) {
                jsPath = path.relative(projectPaths.layx, foundJs).replace(/\\/g, '/');
            }
        }

        // Register CSS import
        if (existsSync(path.join(projectPaths.layx, cssPath))) {
            const added = await registerCssImport(cssPath);
            if (added) console.log(pc.green(`✔ Registered CSS: @import url(${cssPath}); in layx.css`));
        }

        // Register JS import if present
        if (jsPath && existsSync(path.join(projectPaths.layx, jsPath))) {
            const added = await registerJsImport(jsPath);
            if (added) console.log(pc.green(`✔ Registered JS: import './${jsPath}'; in layx.js`));
        }

        // Display HTML snippet if available
        await displaySnippet(name, mapping, targetComponentDir);

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

async function displaySnippet(name, mapping, targetDir) {
    try {
        let htmlFile = mapping?.html ? path.join(projectPaths.layx, mapping.html) : null;
        if (!htmlFile || !existsSync(htmlFile)) {
            htmlFile = await findFirstFileWithExtension(targetDir, '.html');
        }

        if (htmlFile && existsSync(htmlFile)) {
            const snippet = await readFile(htmlFile);
            console.log(pc.yellow('\nHTML Usage Example:'));
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

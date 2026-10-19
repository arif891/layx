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

        // Auto-wire imports based on registry mapping or folder contents
        const mapping = registryConfig.others?.[name];
        let cssPath = mapping?.css || `others/${name}/${name}.css`;
        let jsPath = mapping?.js || `others/${name}/${name}.js`;

        // Check CSS
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

        // Check JS
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

        // Display HTML snippet if available
        await displaySnippet(name, mapping, targetOtherDir);

        console.log(pc.green(`\nModule "${name}" added successfully!\n`));
        return;
    }

    console.warn(pc.yellow(`Module "${name}" not found in local package layx/others.`));
}

async function displaySnippet(name, mapping, targetDir) {
    try {
        let htmlFile = mapping?.html ? path.join(projectPaths.layx, mapping.html) : null;
        if (!htmlFile || !existsSync(htmlFile)) {
            htmlFile = await findFirstFileWithExtension(targetDir, '.html');
        }

        if (htmlFile && existsSync(htmlFile)) {
            const snippet = await readFile(htmlFile);
            console.log(pc.yellow('\nHTML Usage / Example:'));
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

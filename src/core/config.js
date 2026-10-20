import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { existsSync } from 'node:fs';
import { projectRoot } from './paths.js';

export { loadProjectConfig, getProjectConfigFile };

function getProjectConfigFile() {
    const candidates = [
        path.join(projectRoot, 'layx.config.mjs'),
        path.join(projectRoot, 'layx.config.js'),
        path.join(projectRoot, 'config.mjs')
    ];

    for (const file of candidates) {
        if (existsSync(file)) return file;
    }
    return null;
}

async function loadProjectConfig() {
    const configFile = getProjectConfigFile();
    let userConfig = {};

    if (configFile) {
        try {
            const configUrl = pathToFileURL(configFile).href;
            const configModule = await import(configUrl);
            userConfig = configModule.default || configModule.config || {};
        } catch (error) {
            console.warn(`Warning: Could not parse config at ${configFile}: ${error.message}`);
        }
    }

    const buildLayx = userConfig.build?.layx || userConfig.build || {};

    return {
        build: {
            minify: buildLayx.minify ?? true,
            sourcemap: buildLayx.sourcemap ?? false,
            format: buildLayx.format ?? 'esm',
            target: buildLayx.target ?? 'esnext',
            charset: buildLayx.charset ?? 'utf8',
            ...buildLayx
        },
        images: {
            formats: userConfig.images?.formats || ['avif', 'webp'],
            quality: userConfig.images?.quality || 80,
            ...(userConfig.images || {})
        }
    };
}

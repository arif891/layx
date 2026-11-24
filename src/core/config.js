import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { existsSync } from 'node:fs';
import { projectRoot } from './paths.js';

export { loadProjectConfig, getProjectConfigFile };

function getProjectConfigFile(customRoot = projectRoot) {
    const candidates = [
        path.join(customRoot, 'layx.config.mjs'),
        path.join(customRoot, 'layx.config.js'),
        path.join(customRoot, 'config.mjs')
    ];

    for (const file of candidates) {
        if (existsSync(file)) return file;
    }
    return null;
}

async function loadProjectConfig(customRoot = projectRoot) {
    const configFile = getProjectConfigFile(customRoot);
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
    const outDir = userConfig.build?.outDir || userConfig.outDir || userConfig.build?.dist || userConfig.dist || 'dist';

    const userCopy = buildLayx.copy || userConfig.copy || [];
    const userExclude = buildLayx.exclude || userConfig.exclude || [];

    return {
        build: {
            outDir,
            minify: buildLayx.minify ?? true,
            sourcemap: buildLayx.sourcemap ?? false,
            format: buildLayx.format ?? 'esm',
            target: buildLayx.target ?? 'esnext',
            charset: buildLayx.charset ?? 'utf8',
            copy: Array.isArray(userCopy) ? userCopy : [userCopy].filter(Boolean),
            exclude: Array.isArray(userExclude) ? userExclude : [userExclude].filter(Boolean),
            ...buildLayx
        },
        images: {
            formats: userConfig.images?.formats || ['avif', 'webp'],
            quality: userConfig.images?.quality || 80,
            ...(userConfig.images || {})
        },
        components: userConfig.components || {}
    };
}

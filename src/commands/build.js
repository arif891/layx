import pc from 'picocolors';
import { bundleCss } from '../engine/css-bundler.js';
import { bundleJs } from '../engine/js-bundler.js';
import { processHtmlFiles } from '../engine/html-transformer.js';
import { optimizeImages } from '../engine/image-optimizer.js';
import { setBuildState, getBuildState } from '../utils/build-state.js';
import { unbuild } from './unbuild.js';
import { projectPaths } from '../core/paths.js';

export { build };

async function build(options = {}) {
    const isRebuild = options.isRebuild === true;
    const optimize = options.optimize !== false;

    console.log(pc.cyan('Starting build process...'));

    try {
        if (!isRebuild) {
            const state = await getBuildState();
            if (state?.build) {
                console.log(pc.yellow('Existing build detected. Initiating rebuild...'));
                await unbuild({ isRebuild: true });
                return build({ isRebuild: true, optimize });
            }

            if (optimize) {
                await optimizeImages();
            }
        }

        // Bundle CSS and JS
        await bundleCss(optimize);
        await bundleJs();

        // Transform HTML entry points to comment out dev layx references
        if (!isRebuild) {
            await processHtmlFiles(projectPaths.root, 'comment');
        }

        await setBuildState({ build: true, lastBuilt: new Date().toISOString() });
        console.log(pc.green('Build process completed successfully.'));
    } catch (error) {
        console.error(pc.red(`Build process failed: ${error.message}`));
        await handleBuildFailure();
        throw error;
    }
}

async function handleBuildFailure() {
    try {
        await setBuildState({ build: false });
        console.log(pc.yellow('Build state reset due to failure.'));
    } catch (error) {
        console.error('Failed to reset build state:', error.message);
    }
}

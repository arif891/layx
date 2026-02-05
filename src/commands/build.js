import CommandLineInterface from '../utils/cli-helper.js';
import { processFiles } from '../processors/process.js';
import { processHtmlFiles } from '../processors/html.js';
import { genBuildInfo, getBuildInfo } from '../utils/build-info.js';
import { unbuild } from './unbuild.js';
import { optimizeImages } from './optimize.js';

const cli = new CommandLineInterface();
const { fg, bg } = cli;

export { build };

async function build(scriptDir, isRebuild = false, optimize = true) {
    console.log(cli.style('Starting build process...', fg.cyan));
    try {
        if (!isRebuild) {
            const buildInfo = await getBuildInfo();
            if (buildInfo?.build) {
                console.log(cli.style('Existing build detected. Initiating rebuild...', fg.yellow));
                await unbuild(true);
                return build(scriptDir, true);
            }

            if (optimize) {
                await optimizeImages(scriptDir);
            }
        }

        await processFiles(scriptDir, optimize);

        if (!isRebuild) {
            await processHtmlFiles('./');
        }

        await genBuildInfo({ build: true });
        console.log(cli.style('Build process completed successfully.', fg.green));
    } catch (error) {
        console.error('Build process failed:', error);
        await handleBuildFailure();
        throw error;
    }
}

async function handleBuildFailure() {
    try {
        await genBuildInfo({ build: false });
        console.log('Build state reset due to failure');
    } catch (error) {
        console.error('Failed to reset build state:', error);
    }
}

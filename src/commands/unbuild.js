import CommandLineInterface from '../utils/cli-helper.js';
import { processHtmlFiles } from '../processors/html.js';
import { genBuildInfo, getBuildInfo } from '../utils/build-info.js';
import { restoreFiles } from '../processors/restore.js';

const cli = new CommandLineInterface();
const { fg, bg } = cli;

export { unbuild };

async function unbuild(isRebuild = false) {
    console.log(cli.style('Starting unbuild process...', fg.cyan));

    try {
        if (!isRebuild) {
            const buildInfo = await getBuildInfo();
            if (!buildInfo?.build) {
                console.log(cli.style('This project does not build yet!', fg.yellow));
                return;
            }
        }

        await restoreFiles();

        if (!isRebuild) {
            await processHtmlFiles('./', 'uncomment');
        }

        await genBuildInfo({ build: false });
        console.log(cli.style('Unbuild process completed successfully.', fg.green));
    } catch (error) {
        console.error('Unbuild process failed:', error);
        throw error;
    }
}

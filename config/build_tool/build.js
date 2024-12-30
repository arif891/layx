import CommandLineInterface from '../cli/cli.js';
import { processFiles } from './process.js';
import { processHtmlFiles } from './process_html.js';
import { genBuildInfo, getBuildInfo } from './functions.js'


const cli = new CommandLineInterface;
const { fg, bg } = cli;

export {build};

async function build(isRebuild = false) {
  console.log(cli.style('Starting build process...', fg.cyan));
  try {
    if (!isRebuild) {
      const buildInfo = await getBuildInfo();
      if (buildInfo?.build) {
        console.log(cli.style('Existing build detected. Initiating rebuild...', fg.yellow));
        await unbuild(true);
        return build(true);
      }
    }

    await processFiles();

    if (!isRebuild) {
      await processHtmlFiles(directories.pages);
    }

    await genBuildInfo(true);
    console.log(cli.style('Build process completed successfully.', fg.green));
  } catch (error) {
    console.error('Build process failed:', error);
    await handleBuildFailure();
    throw error;
  }
}

async function handleBuildFailure() {
  try {
    await genBuildInfo(false);
    console.log('Build state reset due to failure');
  } catch (error) {
    console.error('Failed to reset build state:', error);
  }
}


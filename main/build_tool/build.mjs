import CommandLineInterface from '../cli/cli.mjs';
import { processFiles } from './process.mjs';
import { processHtmlFiles } from './process_html.mjs';
import { genBuildInfo, getBuildInfo } from './functions.mjs';
import { unbuild } from './un_build.mjs';
import { optimizeImages } from '../helper/optimize/image.mjs';

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

      if (!buildInfo?.imageOptimized && optimize) {
        await optimizeImages(scriptDir);
        await genBuildInfo({ imageOptimized: true });
      }
    }

    await processFiles(scriptDir,optimize);

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
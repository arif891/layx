import CommandLineInterface from '../cli/cli.js';
import { processHtmlFiles } from './process_html.js';
import { genBuildInfo, getBuildInfo } from './functions.js'
import { restoreFiles } from './restore.js';

const cli = new CommandLineInterface;
const { fg, bg } = cli;

export { unbuild };

async function unbuild(isRebuild = false) {
  console.log(cli.style('Starting unbuild process...', fg.cyan));

  try {
    if (!isRebuild) {
      const buildInfo = await getBuildInfo();
      if (!buildInfo?.build) {
        console.log(cli.style('This project does not build yet!', fg.yellow));
        return
      }
    }

    await restoreFiles();

    if (!isRebuild) {
      await processHtmlFiles('./', 'uncomment');
    }

    await genBuildInfo(false);
    console.log(cli.style('Unbuild process completed successfully.', fg.green));
  } catch (error) {
    console.error('Unbuild process failed:', error);
    throw error;
  }
}
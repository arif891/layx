import CommandLineInterface from '../cli/cli.js';
import { processHtmlFiles } from './process_html.js';
import { genBuildInfo, getBuildInfo } from './functions.js'


const cli = new CommandLineInterface;
const { fg, bg } = cli;

export {unbuild};

async function unbuild(isRebuild = false) {
      console.log(cli.style('Starting unbuild process...', fg.cyan));
      try {
        await Promise.all([
          ...BuildTool.CONFIG.fileTypes.map(type =>
            restoreFile(
              type === 'css' ? files.baseCssOut : files.baseJsOut,
              type === 'css' ? files.baseCss : files.baseJs,
              type
            )
          ),
          ...BuildTool.CONFIG.fileTypes.map(type => restorePages(type))
        ]);
  
        if (!isRebuild) {
          await processHtmlFiles(directories.pages, 'uncomment');
        }
  
        await genBuildInfo(false);
        console.log(cli.style('Unbuild process completed successfully.', fg.green));
      } catch (error) {
        console.error('Unbuild process failed:', error);
        throw error;
      }
    }
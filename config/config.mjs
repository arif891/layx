// js code
import { colors } from './modules/vars.js';
import { downloadFile, handleAdd } from './modules/functions.js'

import BuildTool from './modules/buildTool.js'

const scriptDir = import.meta.dirname;

// CLI interface
const [, , command] = process.argv;
const buildTool = new BuildTool();

switch (command) {
  case 'build':
    await buildTool.build();
    break;
  case 'unbuild':
    await buildTool.unbuild();
    break;
  case 'add':
    await downloadFile('https://github.com/arif891/layx/releases/download/v0.1.0-alpha/layx-setup-v0.1.0-alpha_windows_x64.zip', './tem.zip');
    await handleAdd(scriptDir);
    break;
  default:
    console.log(`${colors.style('config.mjs:', colors.fg.cyan)} Can not handle "${command}", supported command are ${colors.style('[build|unbuild|add]', colors.fg.yellow)}.`);
    process.exit(1);
}
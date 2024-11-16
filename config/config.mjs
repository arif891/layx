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
    await handleAdd(scriptDir);
    break;
  default:
    console.log(`${colors.style('config.mjs:', colors.fg.cyan)} Can not handle "${command}", supported command are ${colors.style('[build|unbuild|add]', colors.fg.yellow)}.`);
    process.exit(1);
}
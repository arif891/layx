// js code
import { colors } from './core/vars.js';
import { downloadFile, handleAdd } from './core/functions.js'

import BuildTool from './build_tool/build_tool.js'

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
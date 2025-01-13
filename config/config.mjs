// js code
import { build, unbuild } from './build_tool/build_tool.js';
import { handleAdd } from './helper/add/handle_add.js';

const scriptDir = import.meta.dirname;

// CLI interface
const [, , command] = process.argv;

switch (command) {
  case 'build':
    await build(scriptDir);
    break;
  case 'unbuild':
    await unbuild();
    break;
  case 'add':
    await handleAdd(scriptDir);
    break;
  default:
    process.exit(1);
}
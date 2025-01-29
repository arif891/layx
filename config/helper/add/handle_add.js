import { parseArgs } from 'util';
import { componentAdd } from './component.js';
import { templateAdd } from './template.js';
import { blockAdd } from './block.js';
import { fontAdd } from './font.js';

export { handleAdd, argsObj };

const options = {
  component: {
      type: "string",
      short: "c",
      multiple: true
  },
  template: {
      type: "string",
      short: "t",
      multiple: true
  },
  block: {
      type: "string",
      short: "b",
      multiple: true
  },
  font: {
      type: "string",
      short: "f",
      multiple: true
  },
};

const argsObj = parseArgs({ options, strict: false });

async function handleAdd(scriptDir) {
    if (argsObj.values.component) {
      await componentAdd(scriptDir);
    } else if (argsObj.values.template) {
      await templateAdd(scriptDir);
    } else if (argsObj.values.block) {
      await blockAdd(scriptDir);
    } else if (argsObj.values.font) {
      await fontAdd(scriptDir);
    } else {
      console.warn("Please specify a argument after add, like -c, -t, -b, -f"); 
    }
  }
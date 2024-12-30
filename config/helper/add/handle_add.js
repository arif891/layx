import { parseArgs } from 'util';

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
    if (!argsObj.values.component && !argsObj.values.font) {
      console.warn("Please specify a component using '--component' or '-c', or a font using '--font' or '-f'.");
      return;
    }
  
    if (argsObj.values.component) {
      await handleComponentAdd(scriptDir);
    }
  
    if (argsObj.values.template) {
      await handleTemplateAdd(scriptDir);
    }
  
    if (argsObj.values.block) {
      await handleBlockAdd(scriptDir);
    }
  
    if (argsObj.values.font) {
      await handleFontAdd(scriptDir);
    }
  }

  export { handleAdd };
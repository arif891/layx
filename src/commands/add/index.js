import { parseArgs } from 'node:util';
import { componentAdd } from './component.js';
import { templateAdd } from './template.js';
import { blockAdd } from './block.js';
import { fontAdd } from './font.js';

export { handleAdd };

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

async function handleAdd(scriptDir, args) {
    // We need to parse args again or pass them.
    // Since parseArgs takes process.argv by default or 'args' option.
    // We'll pass 'args' to it.

    const { values } = parseArgs({
        args,
        options,
        strict: false,
        allowPositionals: true
    });

    if (values.component) {
        await componentAdd(values.component);
    } else if (values.template) {
        await templateAdd(values.template);
    } else if (values.block) {
        await blockAdd(values.block);
    } else if (values.font) {
        await fontAdd(values.font, scriptDir);
    } else {
        console.warn("Please specify a argument after add, like -c, -t, -b, -f");
    }
}

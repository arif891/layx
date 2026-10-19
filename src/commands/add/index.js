import { parseArgs } from 'node:util';
import pc from 'picocolors';
import { componentAdd } from './component.js';
import { otherAdd } from './other.js';
import { templateAdd } from './template.js';
import { fontAdd } from './font.js';

export { handleAdd };

const options = {
    component: {
        type: 'string',
        short: 'c',
        multiple: true
    },
    other: {
        type: 'string',
        short: 'o',
        multiple: true
    },
    template: {
        type: 'string',
        short: 't',
        multiple: true
    },
    font: {
        type: 'string',
        short: 'f',
        multiple: true
    }
};

async function handleAdd(args = []) {
    const { values } = parseArgs({
        args,
        options,
        strict: false,
        allowPositionals: true
    });

    if (values.component) {
        await componentAdd(values.component);
    } else if (values.other) {
        await otherAdd(values.other);
    } else if (values.template) {
        await templateAdd(values.template);
    } else if (values.font) {
        await fontAdd(values.font);
    } else {
        console.warn(pc.yellow('Please specify an argument after add, e.g.: layx add -c <component> or layx add -o <module> or layx add -f <font>'));
    }
}

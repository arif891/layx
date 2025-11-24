#!/usr/bin/env node

import { build } from './commands/build.js';
import { unbuild } from './commands/unbuild.js';
import { handleAdd } from './commands/add/index.js';
import { optimizeImages } from './commands/optimize.js';
import path from 'node:path';

const scriptDir = import.meta.dirname;

// CLI interface
const [, , command, ...args] = process.argv;

switch (command) {
    case 'build':
        await build(scriptDir);
        break;
    case 'unbuild':
        await unbuild();
        break;
    case 'add':
        await handleAdd(scriptDir, args);
        break;
    case 'optimizeImages':
        await optimizeImages(scriptDir);
        break;
    default:
        console.log("Usage: layx <command> [options]");
        console.log("Commands:");
        console.log("  build           Build the project");
        console.log("  unbuild         Unbuild the project");
        console.log("  add             Add components, templates, blocks, or fonts");
        console.log("  optimizeImages  Optimize images");
        process.exit(1);
}

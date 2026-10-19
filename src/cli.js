#!/usr/bin/env node

import path from 'node:path';
import fs from 'node:fs';
import * as p from '@clack/prompts';
import pc from 'picocolors';

import { build } from './commands/build.js';
import { unbuild } from './commands/unbuild.js';
import { handleAdd } from './commands/add/index.js';
import { optimizeImages } from './commands/optimize.js';
import { createProject } from './commands/create.js';
import { installSnippets } from './commands/snippets.js';
import { packageRoot } from './core/paths.js';

// Read version from package.json
let version = '0.1.0';
try {
    const pkg = JSON.parse(fs.readFileSync(path.join(packageRoot, 'package.json'), 'utf8'));
    version = pkg.version || version;
} catch {
    // fallback
}

const [, , command, ...args] = process.argv;

async function runInteractiveMenu() {
    p.intro(pc.bgCyan(pc.black(` layx v${version} `)));

    const action = await p.select({
        message: 'What would you like to do?',
        options: [
            { label: 'Create a new landing page', value: 'create', hint: 'scaffold from template' },
            { label: 'Build project for production', value: 'build', hint: 'bundle & minify CSS/JS' },
            { label: 'Unbuild project', value: 'unbuild', hint: 'restore unbundled source files' },
            { label: 'Optimize images', value: 'optimize', hint: 'convert to AVIF/WebP with sharp' },
            { label: 'Add components or fonts', value: 'add', hint: 'fetch components from registry' },
            { label: 'Install VS Code snippets', value: 'snippets', hint: 'setup .vscode/layx.code-snippets' },
            { label: 'Exit', value: 'exit' }
        ]
    });

    if (p.isCancel(action) || action === 'exit') {
        p.outro('Goodbye!');
        process.exit(0);
    }

    switch (action) {
        case 'create':
            await createProject(undefined, true);
            break;
        case 'build':
            await build();
            p.outro(pc.green('Build completed!'));
            break;
        case 'unbuild':
            await unbuild();
            p.outro(pc.green('Unbuild completed!'));
            break;
        case 'optimize':
            await optimizeImages();
            p.outro(pc.green('Images optimized!'));
            break;
        case 'add': {
            const addType = await p.select({
                message: 'What would you like to add?',
                options: [
                    { label: 'Component', value: '-c' },
                    { label: 'Other module', value: '-o' },
                    { label: 'Font', value: '-f' },
                    { label: 'Template', value: '-t' }
                ]
            });
            if (p.isCancel(addType)) {
                p.cancel('Cancelled.');
                break;
            }
            const target = await p.text({
                message: 'Enter name(s) (space separated):',
                validate(val) {
                    if (!val || !val.trim()) return 'Please enter at least one name';
                }
            });
            if (p.isCancel(target)) {
                p.cancel('Cancelled.');
                break;
            }
            await handleAdd([addType, ...target.trim().split(/\s+/)]);
            p.outro(pc.green('Addition completed!'));
            break;
        }
        case 'snippets':
            await installSnippets();
            p.outro(pc.green('Snippets ready!'));
            break;
    }
}

function showHelp() {
    console.log(`
${pc.cyan(pc.bold(`LayX CLI v${version}`))}
A CSS-first framework and build tool for modern high-performance landing pages.

${pc.yellow(pc.bold('USAGE:'))}
  ${pc.green('layx')} <command> [options]
  ${pc.green('npx layx')} <command> [options]

${pc.yellow(pc.bold('COMMANDS:'))}
  ${pc.green('create')} [name]          Create a new LayX landing page project
  ${pc.green('build')}                  Build and optimize project for production
  ${pc.green('unbuild')}                Restore original development source files
  ${pc.green('optimize')}               Optimize images (AVIF/WebP) in assets/image/
  ${pc.green('add')} [options]          Add components (-c), other modules (-o), fonts (-f), templates (-t)
  ${pc.green('snippets')} [--global]    Install LayX VS Code snippets (locally or globally)

${pc.yellow(pc.bold('OPTIONS:'))}
  -v, --version          Show version number
  -h, --help             Show help documentation

${pc.yellow(pc.bold('EXAMPLES:'))}
  layx create my-landing-page
  layx add -c navbar -f "Red Hat Display"
  layx build
  layx snippets
`);
}

// Router
if (!command) {
    if (process.stdin.isTTY) {
        await runInteractiveMenu();
    } else {
        showHelp();
    }
} else {
    switch (command) {
        case 'build':
            await build();
            break;
        case 'unbuild':
            await unbuild();
            break;
        case 'create':
        case 'init':
            await createProject(args[0], false);
            break;
        case 'optimize':
        case 'optimizeImages':
            await optimizeImages();
            break;
        case 'add':
            await handleAdd(args);
            break;
        case 'snippets':
            await installSnippets({ global: args.includes('--global') });
            break;
        case '-v':
        case '--version':
        case 'version':
            console.log(`LayX v${version}`);
            break;
        case '-h':
        case '--help':
        case 'help':
            showHelp();
            break;
        default:
            console.error(pc.red(`Unknown command: "${command}"\n`));
            showHelp();
            process.exit(1);
    }
}

import path from 'node:path';
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import os from 'node:os';
import pc from 'picocolors';
import { packagePaths } from '../core/paths.js';

export { installSnippets };

async function installSnippets(options = {}) {
    const isGlobal = options.global === true;
    const snippetSource = packagePaths.snippets;

    if (!existsSync(snippetSource)) {
        console.error(pc.red(`Snippets source not found at: ${snippetSource}`));
        return;
    }

    try {
        if (isGlobal) {
            let targetDir;
            const platform = os.platform();
            const home = os.homedir();

            if (platform === 'win32') {
                targetDir = path.join(home, 'AppData/Roaming/Code/User/snippets');
            } else if (platform === 'darwin') {
                targetDir = path.join(home, 'Library/Application Support/Code/User/snippets');
            } else {
                targetDir = path.join(home, '.config/Code/User/snippets');
            }

            await fs.mkdir(targetDir, { recursive: true });
            const destPath = path.join(targetDir, 'layx.code-snippets');
            await fs.copyFile(snippetSource, destPath);
            console.log(pc.green(`Global VS Code snippets installed to: ${destPath}`));
        } else {
            const projectDir = process.cwd();
            const vscodeDir = path.join(projectDir, '.vscode');
            await fs.mkdir(vscodeDir, { recursive: true });
            const destPath = path.join(vscodeDir, 'layx.code-snippets');
            await fs.copyFile(snippetSource, destPath);
            console.log(pc.green(`Project VS Code snippets installed to: ${destPath}`));
        }
    } catch (error) {
        console.error(pc.red(`Failed to install snippets: ${error.message}`));
    }
}

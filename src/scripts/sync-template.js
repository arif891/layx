import path from 'node:path';
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import pc from 'picocolors';

const rootDir = process.cwd();
const templateDir = path.join(rootDir, 'template');

async function syncTemplate() {
    console.log(pc.cyan('Synchronizing template/ from root starter files...'));

    const itemsToSync = [
        { src: 'assets', dest: 'assets', isDir: true },
        { src: 'pages', dest: 'pages', isDir: true },
        { src: 'index.html', dest: 'index.html', isDir: false },
        { src: '.vscode/layx.code-snippets', dest: '.vscode/layx.code-snippets', isDir: false }
    ];

    for (const item of itemsToSync) {
        const srcPath = path.join(rootDir, item.src);
        const destPath = path.join(templateDir, item.dest);

        if (!existsSync(srcPath)) continue;

        if (item.isDir) {
            await fs.mkdir(destPath, { recursive: true });
            await fs.cp(srcPath, destPath, {
                recursive: true,
                filter: (src) => {
                    const base = path.basename(src);
                    return base !== 'node_modules' && base !== '.git';
                }
            });
            console.log(pc.green(`✔ Synced directory: ${item.src} -> template/${item.dest}`));
        } else {
            await fs.mkdir(path.dirname(destPath), { recursive: true });
            await fs.copyFile(srcPath, destPath);
            console.log(pc.green(`✔ Synced file: ${item.src} -> template/${item.dest}`));
        }
    }

    console.log(pc.green('\nTemplate synchronization complete!\n'));
}

syncTemplate().catch((err) => {
    console.error(pc.red('Failed to sync template:'), err.message);
    process.exit(1);
});

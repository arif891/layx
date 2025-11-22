import path from 'node:path';
import fs from "node:fs/promises";
import { existsSync } from 'node:fs';

const version = '0.1.0 alpha';
const exclude = [
    'LICENSE', 'README.md', 'create-setup.mjs', 'setup', 'package-lock.json', 'node_modules'

    // 'accordion', 'alert', 'breadcrumb', 'card', 'carousel', 'chart', 'dialog', 'draggable', 'media',
    // 'pagination', 'popover', 'section', 'sheet', 'tab', 'tooltip', 'window',

    // 'ai', 'background', 'dynamic_render', 'partial_render', 'pwa', 'scroll_driven_animation', 'smooth_scroll',
    // 'syntax_highlighter', 'view_transition',

    // 'utilities'
];
const setupDir = 'setup/';

const platforms = [
    {
        name: 'windows',
        extensions: ['.exe', '.bat'],
        arch: 'x64'
    },
    {
        name: 'linux',
        extensions: ['(linux)'],
        arch: 'x64'
    },
    {
        name: 'macOS',
        extensions: ['(macOS)'],
        arch: 'arm64',
    }
];

async function createSetup() {
    console.log('Creating setup...');
    try {
        if (existsSync(setupDir)) {
            await fs.rm(setupDir, { recursive: true });
        }

        for (const platform of platforms) {
            const platformDir = path.join(setupDir, platform.name, `/layx-setup-v${version}_${platform.name}_${platform.arch}/`).replaceAll(' ', '_');
            await copyDir('./', platformDir, platform.name);
        }
    } catch (error) {
        console.error('Error creating setup:', error);
        process.exit(1);
    }
    console.log('Setup created successfully!');
}

async function copyDir(src, dest, platformName) {
    try {
        await fs.mkdir(dest, { recursive: true });
        const entries = await fs.readdir(src, { withFileTypes: true });

        for (const entry of entries) {
            if (entry.name.startsWith('.') || exclude.includes(entry.name)) continue;

            const srcPath = path.join(src, entry.name);
            const destPath = path.join(dest, entry.name);

            if (entry.isDirectory()) {
                await copyDir(srcPath, destPath, platformName);
            } else {
                // Check if file should be copied for this platform
                let shouldCopy = true;
                let finalName = entry.name;

                // Check if file has any platform-specific extension
                for (const platform of platforms) {
                    for (const extension of platform.extensions) {
                        if (entry.name.includes(extension)) {
                            // Only copy if it matches current platform
                            shouldCopy = platform.name === platformName;
                            // Remove platform suffix for non-windows files
                            if (shouldCopy && platform.name !== 'windows') {
                                finalName = entry.name.replace(extension, '');
                            }
                            break;
                        }
                    }
                }

                if (shouldCopy) {
                    await fs.copyFile(srcPath, path.join(dest, finalName));
                }
            }
        }
    } catch (error) {
        console.error('Error copying directory:', error);
        throw error;
    }
}

// Execute the setup creation
createSetup().catch(console.error);
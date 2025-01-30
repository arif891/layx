import path from 'node:path';
import fs from "node:fs/promises";
import { existsSync } from 'node:fs';

const exclude = ['LICENSE', 'README.md', 'create-setup.mjs'];

const platforms = [
    {
        name: 'windows',
        extensions: ['.exe', '.bat']
    },
    {
        name: 'linux',
        extensions: ['(linux)']
    },
    {
        name: 'mac',
        extensions: ['(mac)']
    }
];
const setupDir = 'setup/';

async function createSetup() {
    try {
        if(existsSync(setupDir)) {  
            await fs.rm(setupDir, { recursive: true });
        }

        for (const platform of platforms) {
            const platformDir = path.join(setupDir, platform.name, '/');
            await copyDir('./', platformDir, platform.name);
        }
    } catch (error) {
        console.error('Error creating setup:', error);
        process.exit(1);
    }
}

async function copyDir(src, dest, platformName) {
    try {
        await fs.mkdir(dest, { recursive: true });
        const entries = await fs.readdir(src, { withFileTypes: true });

        for (const entry of entries) {
            if (entry.name.startsWith('.') || entry.name === 'setup') continue;

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
import path from 'node:path';
import fs from "node:fs/promises";
import { existsSync } from 'node:fs';

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
            await copyDir('./', platformDir);
            await clearSetup(platformDir, platform.name);
        }
    } catch (error) {
        console.error('Error creating setup:', error);
        process.exit(1);
    }
}

async function copyDir(src, dest) {
    try {
        await fs.mkdir(dest, { recursive: true });
        const entries = await fs.readdir(src, { withFileTypes: true });

        for (const entry of entries) {
            if (entry.name.startsWith('.') || entry.name === 'setup') continue;

            const srcPath = path.join(src, entry.name);
            const destPath = path.join(dest, entry.name);

            if (entry.isDirectory()) {
                await copyDir(srcPath, destPath);
            } else {
                await fs.copyFile(srcPath, destPath);
            }
        }
    } catch (error) {
        console.error('Error copying directory:', error);
        throw error;
    }
}

async function clearSetup(dir, platformName) {
    try {
        const entries = await fs.readdir(dir, { withFileTypes: true });

        for (const entry of entries) {
            if (entry.isFile()) {
                let shouldDelete = true;
                const filePath = path.join(dir, entry.name);

                for (const platform of platforms) {
                    if (platform.name === platformName) {
                        for (const extension of platform.extensions) {
                            if (entry.name.includes(extension)) {
                                shouldDelete = false;
                                if (platform.name !== 'windows') {
                                    const newPath = path.join(dir, entry.name.replace(extension, ''));
                                    await fs.rename(filePath, newPath);
                                }
                                break;
                            }
                        }
                    } else {
                        for (const extension of platform.extensions) {
                            if (entry.name.includes(extension)) {
                                shouldDelete = true;
                                break;
                            }
                        }
                    }
                }

                if (shouldDelete) {
                    await fs.unlink(filePath);
                }
            }
        }
    } catch (error) {
        console.error('Error clearing setup:', error);
        throw error;
    }
}

// Execute the setup creation
createSetup().catch(console.error);
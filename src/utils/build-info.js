import { readFile, writeFile } from './fs.js';
import { layx } from "../core/config.js";
import fs from "node:fs/promises";

export { genBuildInfo, getBuildInfo, validateDirectories };

async function genBuildInfo(newBuildInfo = {}) {
    let previousBuildInfo = {};

    try {
        const content = await readFile(layx.files.buildInfo);
        previousBuildInfo = JSON.parse(content);
    } catch (error) {
        if (error.code !== 'ENOENT') {
            console.error('Failed to read previous build info:', error);
            throw error;
        }
    }

    try {
        const mergedBuildInfo = { ...previousBuildInfo, ...newBuildInfo };
        await writeFile(layx.files.buildInfo, JSON.stringify(mergedBuildInfo, null, 2));
    } catch (error) {
        console.error('Failed to generate build info:', error);
        throw error;
    }
}

async function getBuildInfo() {
    try {
        const content = await readFile(layx.files.buildInfo);
        return JSON.parse(content);
    } catch (error) {
        if (error.code === 'ENOENT') return null;
        throw error;
    }
}

async function validateDirectories() {
    try {
        await Promise.all(
            Object.values(layx.directories).map(dir =>
                fs.mkdir(dir, { recursive: true })
            )
        );
    } catch (error) {
        throw new Error(`Failed to create directories: ${error.message}`);
    }
}

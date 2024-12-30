import { readFile, writeFile } from '../util/functions.js'
import { layx } from "../core/vars.js";

async function genBuildInfo(buildState) {
    try {
        const buildInfo = JSON.stringify({ build: buildState }, null, 2);
        await writeFile(layx.files.buildInfo, buildInfo);
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

export { genBuildInfo, getBuildInfo, validateDirectories };
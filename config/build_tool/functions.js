import { readFile, writeFile } from '../util/functions.js'
import { layx } from "../core/vars.js";

async function genBuildInfo(buildInfo = {}) {

    let previousBuildInfo = {};

    try {
        const content = await readFile(layx.files.buildInfo);
        previousBuildInfo = JSON.parse(content);
    } catch (error) {
       
    }

    try {
        const  newBuildInfo = { ...previousBuildInfo, ...newBuildInfo };
        await writeFile(layx.files.buildInfo, JSON.stringify(newBuildInfo, null, 2));
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
import { readFile, writeFile } from './fs.js';
import { projectPaths } from '../core/paths.js';

export { setBuildState, getBuildState };

async function setBuildState(newState = {}) {
    let previousState = {};

    try {
        const content = await readFile(projectPaths.buildState);
        previousState = JSON.parse(content);
    } catch (error) {
        if (error.code !== 'ENOENT') {
            console.error('Failed to read previous build state:', error.message);
        }
    }

    try {
        const mergedState = { ...previousState, ...newState };
        await writeFile(projectPaths.buildState, JSON.stringify(mergedState, null, 2));
    } catch (error) {
        console.error('Failed to write build state:', error.message);
        throw error;
    }
}

async function getBuildState() {
    try {
        const content = await readFile(projectPaths.buildState);
        return JSON.parse(content);
    } catch (error) {
        if (error.code === 'ENOENT') return null;
        return null;
    }
}

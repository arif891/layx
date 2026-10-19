import path from 'node:path';
import fs from 'node:fs/promises';

export { getFilesContent, ensureDirectoryExists, getFilesWithExtension, readFile, writeFile, copyFile, moveFile, deleteFile };

async function getFilesWithExtension(directory, extension, subDir = false, exclude = ['layx', 'setup', 'node_modules', '.git']) {
    let entries;
    try {
        entries = await fs.readdir(directory, { withFileTypes: true });
    } catch (err) {
        if (err.code === 'ENOENT') return [];
        throw err;
    }

    let files = [];

    for (const entry of entries) {
        const fullPath = path.join(directory, entry.name);

        if (entry.isDirectory() && subDir && !exclude.includes(entry.name)) {
            files = files.concat(await getFilesWithExtension(fullPath, extension, subDir, exclude));
        } else if (entry.isFile() && path.extname(entry.name) === `.${extension}` && !exclude.includes(entry.name)) {
            files.push(fullPath);
        }
    }

    return files;
}

async function getFilesContent(directory, extension, subDir = false, exclude = ['layx', 'setup', 'node_modules', '.git']) {
    let entries;
    try {
        entries = await fs.readdir(directory, { withFileTypes: true });
    } catch (err) {
        if (err.code === 'ENOENT') return '';
        throw err;
    }

    let content = '';

    for (const entry of entries) {
        const fullPath = path.join(directory, entry.name);

        if (entry.isDirectory() && subDir && !exclude.includes(entry.name)) {
            content += await getFilesContent(fullPath, extension, subDir, exclude);
        } else if (entry.isFile() && path.extname(entry.name) === `.${extension}` && !exclude.includes(entry.name)) {
            content += await readFile(fullPath) + '\n';
        }
    }

    return content;
}

async function ensureDirectoryExists(dirPath) {
    try {
        await fs.mkdir(dirPath, { recursive: true });
    } catch (error) {
        if (error.code !== 'EEXIST') {
            throw error;
        }
    }
}

async function readFile(filePath, encoding = 'utf8') {
    return await fs.readFile(filePath, { encoding });
}

async function writeFile(filePath, content, flag = 'w') {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    return await fs.writeFile(filePath, content, { flag });
}

async function copyFile(source, destination) {
    await fs.mkdir(path.dirname(destination), { recursive: true });
    return await fs.copyFile(source, destination);
}

async function moveFile(source, destination) {
    await fs.mkdir(path.dirname(destination), { recursive: true });
    try {
        return await fs.rename(source, destination);
    } catch (err) {
        if (err.code === 'EXDEV') {
            await fs.copyFile(source, destination);
            await fs.unlink(source);
        } else {
            throw err;
        }
    }
}

async function deleteFile(filePath) {
    try {
        await fs.unlink(filePath);
    } catch (err) {
        if (err.code !== 'ENOENT') throw err;
    }
}

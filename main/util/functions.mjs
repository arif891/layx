import path from 'node:path';
import fs from "node:fs/promises";
import { breakPoints } from "../core/vars.mjs";


export { getFilesContent, ensureDirectoryExists,  getCssContentBlock, getFilesWithExtension, minify, extractClasses, extractImportUrls, readFile, writeFile, copyFile, moveFile, deleteFile };

async function getFilesWithExtension(directory, extension, subDir = false, exclude = ['layx','setup']) {
    const entries = await fs.readdir(directory, { withFileTypes: true });
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

async function getFilesContent(directory, extension, subDir = false, exclude = ['layx','setup']) {
    const entries = await fs.readdir(directory, { withFileTypes: true });
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

function getCssContentBlock(content, tag) {
    const regex = new RegExp(`/\\*<${tag}>\\*/(.*?)\\/\\*<\\/${tag}>\\*/`, 'gs');
    return [...content.matchAll(regex)]
        .map(match => match[1])
        .join('');
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

function minify(content, Type = 'css') {
    if (Type === 'css') {
        return content
            .replace(/\/\*[\s\S]*?\*\//g, '')
            .replace(/([^{}])\s+/g, '$1 ')
            .replace(/\s*\n\s*/g, '')
            .replace(/\s*{\s*/g, '{')
            .replace(/\s*}\s*/g, '}')
            .replace(/\s*;\s*/g, ';')
            .replace(/\/\*[\s\S]*?\*\//g, '')
            .trim();
    } else if (Type === 'js') {
        return content
            .replace(/\/\/.*|\/\*[\s\S]*?\*\//g, '')
            .replace(/\s+/g, ' ')
            .trim();
    }
    return content;
}

function extractClasses(html, startClass, type = 'class') {
    if (!html || typeof html !== 'string') {
        throw new Error('Invalid HTML input');
    }

    const breakPointKeys = Object.keys(breakPoints);
    const escapedStartClass = startClass.replace(/[-_]/g, '\\$&');
    const patterns = {
        class: {
            regex: new RegExp(`\\b${escapedStartClass}-(\\d+)\\b(?!-${breakPointKeys.join('|')})`, 'g'),
            process: match => [match[0]]
        },
        media: {
            regex: new RegExp(`\\b${escapedStartClass}-(${breakPointKeys.join('|')})-(\\d+)\\b`, 'g'),
            process: match => [match[1]]
        },
        number: {
            regex: new RegExp(`\\b${escapedStartClass}-(\\d+)\\b(?!-${breakPointKeys.join('|')})`, 'g'),
            process: match => [parseInt(match[0].split('-').pop())]
        }
    };

    if (!patterns[type]) {
        throw new Error(`Invalid type: ${type}`);
    }

    const { regex, process } = patterns[type];
    const resultSet = new Set();
    let match;

    while ((match = regex.exec(html)) !== null) {
        process(match).forEach(item => resultSet.add(item));
    }

    const sortFunctions = {
        class: (a, b) => parseInt(a.split('-')[1]) - parseInt(b.split('-')[1]),
        media: (a, b) => breakPointKeys.indexOf(a) - breakPointKeys.indexOf(b),
        number: (a, b) => a - b
    };

    return Array.from(resultSet).sort(sortFunctions[type]);
}

function extractImportUrls(content, type) {
    const regex = type === 'css'
        ? /@import\s+url\(([^)]+)\);/g
        : /import\s+(?:\w+|\{[^}]+\})\s+from\s+['"]([^'"]+)['"]/g;

    return [...content.matchAll(regex)].map(match => match[1].replace(/['"]/g, ''));
}


//node
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
    return await fs.rename(source, destination);
}

async function deleteFile(filePath) {
    return await fs.unlink(filePath);
} 
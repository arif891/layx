import path from 'node:path';
import fs from "node:fs/promises";
import { breakPoints } from "../core/vars.js";


export { wrapMedia, getFilesContent, getContentByTag, getFilesWithExtension, minify, extractClasses, readFile, writeFile };

function wrapMedia(media, content) {
    return `@media ${media} {${content}}`
}

async function getFilesWithExtension(directory, extension) {
    const files = await fs.readdir(directory);
    return files.filter(file => path.extname(file) === `.${extension}`);
}

async function getFilesContent(directory, extension, subDir = false) {
    const entries = await fs.readdir(directory, { withFileTypes: true });
    let content = '';

    for (const entry of entries) {
        const fullPath = path.join(directory, entry.name);
        
        if (entry.isDirectory() && subDir) {
            content += await getFilesContent(fullPath, extension, subDir);
        } else if (entry.isFile() && path.extname(entry.name) === `.${extension}`) {
            content += await readFile(fullPath) + '\n';
        }
    }

    return content;
}

function getContentByTag(content, tag) {
    const regex = new RegExp(`<${tag}[^>]*>(.*?)<\\/${tag}>`, 'gs');
    let matches = [];
    
    let match;
    while ((match = regex.exec(content)) !== null) {
        matches.push(match[1]);
    }
    
    return matches.join('');
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

    const escapedStartClass = startClass.replace(/[-_]/g, '\\$&');
    const patterns = {
        class: {
            // Match only startClass followed by numbers, not including breakpoint classes
            regex: new RegExp(`\\b${escapedStartClass}-(\\d+)\\b(?!-${breakPoints.join('|')})`, 'g'),
            process: match => [match[0]]
        },
        media: {
            // Match classes with breakpoints like x-lg-12
            regex: new RegExp(`\\b${escapedStartClass}-(${breakPoints.join('|')})-(\\d+)\\b`, 'g'),
            process: match => [match[1]]
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
        media: (a, b) => breakPoints.indexOf(a) - breakPoints.indexOf(b)
    };

    return Array.from(resultSet).sort(sortFunctions[type]);
}


//node
async function readFile(filePath, encoding = 'utf8') {
    return await fs.readFile(filePath, { encoding });
}

async function writeFile(filePath, content, flag = 'w') {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    return await fs.writeFile(filePath, content, { flag });
}
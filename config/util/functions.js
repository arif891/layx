import path from 'node:path';
import fs from "node:fs/promises";
import { breakPoints } from "../core/vars.js";


export { wrapMedia, getFilesWithExtension, minify, extractClasses, readFile, writeFile };

function wrapMedia(media, content) {
    return `@media ${media} {${content}}`
}

async function getFilesWithExtension(directory, extension) {
    const files = await fs.readdir(directory);
    return files.filter(file => path.extname(file) === `.${extension}`);
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
            regex: new RegExp(`class="([^"]*?\\b${escapedStartClass}\\d+\\b[^"]*?)"`, 'g'),
            process: match => match[1].split(/\s+/).filter(className => className.startsWith(startClass))
        },
        media: {
            regex: new RegExp(`\\b${escapedStartClass}(\\w+)-\\d+\\b`, 'g'),
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
        class: (a, b) => parseInt(a.split(/[-_]/).pop()) - parseInt(b.split(/[-_]/).pop()),
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


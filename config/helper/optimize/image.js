import path from 'node:path';
import fs from 'node:fs/promises';
import { exec } from 'node:child_process';

import { layx } from '../../core/vars.js';
import { getFilesWithExtension, readFile, writeFile } from '../../util/functions.js';

export { optimizeImages };

async function optimizeImages(scriptDir, optimizer = 'avif') {
    const imagesDir = layx.directories.images;
    const optimizerExe = path.join(scriptDir, optimizer);
    const imageExtensions = ['jpg', 'jpeg', 'png'];
    let images = [];

    for (const ext of imageExtensions) {
        const foundImages = await getFilesWithExtension(imagesDir, ext);
        images = [...images, ...foundImages];
    }

    console.log(images);

    if (images.length === 0) {
        return;
    }

    for (const image of images) {
        await optimizeImage(image, optimizerExe, optimizer);
    }

    await updateUrls(optimizer);

    console.log(`Optimized images with ${optimizer}`);
}

async function optimizeImage(image, optimizerExe, optimizer) {
    const optimizedImage = image.replace(path.extname(image), `.${optimizer}`);
    exec(`"${optimizerExe}" "${image}" -o "${optimizedImage}"`, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error optimizing image: ${image}`, error);
            return;
        }
    });
}

async function updateUrls(optimizer) {
    await updateHtmlFiles(layx.directories.base, optimizer);
    await updateCssFiles(layx.directories.css, optimizer);
}

async function updateHtmlFiles(directory, optimizer) {
    const htmlFiles = await getFilesWithExtension(directory, 'html', true);

    for (const file of htmlFiles) {
        const content = await readFile(file);
        const updatedContent = updateUrlsInContent(content, 'html', optimizer);
        await writeFile(file, updatedContent);
    }
}

async function updateCssFiles(directory, optimizer) {
    const cssFiles = await getFilesWithExtension(directory, 'css', true);

    for (const file of cssFiles) {
        const content = await readFile(file);
        const updatedContent = updateUrlsInContent(content, 'css', optimizer);
        await writeFile(file, updatedContent);
    }
}

async function updateUrlsInContent(content, type, optimizer) {
  const urls = extractUrls(content, type);

    for (const url of urls) {
        const optimizedUrl = url.replace(/\.(png|jpg|jpeg)$/, `.${optimizer}`);
        content = content.replace(url, optimizedUrl);
    }

    return content;
}

function extractUrls(content, type = 'html') {
    const srcRegex = /<(img|source)\b[^>]*\s+src=["'](\/assets\/image\/[^"']+\.(?:png|jpg|jpeg))["']/gi;
    const urlRegex = /url\(["']?(\/assets\/image\/[^"')]+\.(?:png|jpg|jpeg))["']?\)/gi;
    const srcValues = [];
    let match;

    switch (type) {
        case 'html':
            while ((match = srcRegex.exec(content)) !== null) {
                srcValues.push(match[2]); 
            }
            return srcValues;

        case 'css':
            while ((match = urlRegex.exec(content)) !== null) {
                srcValues.push(match[1]);
            }
            return srcValues;

        default:
            throw new Error("Invalid type. Use 'html' or 'css'.");
    }
}
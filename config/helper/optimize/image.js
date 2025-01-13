import path from 'node:path';
import fs from 'node:fs/promises';
import { exec } from 'node:child_process';

import { layx } from '../../core/vars.js';
import { getFilesWithExtension } from '../../util/functions.js';

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

async function updateUrls() {
    await updateHtmlFiles(layx.directories.base);
    await updateCssFiles(layx.directories.css);
}

async function updateHtmlFiles(directory) {
    const htmlFiles = await getFilesWithExtension(directory, 'html', true);

    for (const file of htmlFiles) {
        const content = await readFile(file);
        const updatedContent = updateUrlsInContent(content, 'html');
        await writeFile(file, updatedContent);
    }
}

async function updateCssFiles(directory) {
    const cssFiles = await getFilesWithExtension(directory, 'css', true);

    for (const file of cssFiles) {
        const content = await readFile(file);
        const updatedContent = updateUrlsInContent(content, 'css');
        await writeFile(file, updatedContent);
    }
}

function updateUrlsInContent(content, type) {
    switch (type) {
        case 'html':
            return updateHtmlUrls(content);
        case 'css':
            return updateCssUrls(content);
        default:
            return content;
    }
}
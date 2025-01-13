import path from 'node:path';
import { exec } from 'node:child_process';

import { layx } from '../../core/vars.js';
import { getFilesWithExtension, readFile, writeFile, moveFile } from '../../util/functions.js';

export { optimizeImages };

async function optimizeImages(scriptDir, optimizer = 'avif') {
    const imagesDir = layx.directories.images;
    const optimizerExe = path.join(scriptDir, optimizer);
    const imageExtensions = ['jpg', 'jpeg', 'png'];
    let images = [];

    console.log(`Optimizing images with ${optimizer}...`);

    for (const ext of imageExtensions) {
        const foundImages = await getFilesWithExtension(imagesDir, ext);
        images = [...images, ...foundImages];
    }

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

       moveFile(image, `${path.dirname(image)}/orginal_images_dir/${path.basename(image)}`);
    });
}

async function updateUrls(optimizer) {
    await updateFiles(layx.directories.base, 'html', optimizer);
    await updateFiles(layx.directories.css, 'css', optimizer);
}

async function updateFiles(directory, type, optimizer) {
    const files = await getFilesWithExtension(directory, type, true);

    for (const file of files) {
        const content = await readFile(file);
        const updatedContent = await updateUrlsInContent(content, type, optimizer);
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
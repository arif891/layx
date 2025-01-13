import path from 'node:path';
import fs from 'node:fs/promises';
import { exec } from 'node:child_process';

import { layx } from '../../core/vars.js';
import { getFilesWithExtension, getFilesContent } from '../../util/functions.js';

export { optimizeImages };

async function optimizeImages(scriptDir, optimizer = 'avif') {
    const imagesDir = layx.directories.images;
    const optimizerExe = path.join(scriptDir, optimizer);
    const imageExtensions = ['jpg', 'jpeg', 'png'];
    let images = [];

    imageExtensions.forEach((ext) => {
        const foundImages = getFilesWithExtension(imagesDir, ext);
        console.log(foundImages);
    });

    if (images.length === 0) {
        return;
    }

    images.forEach(async (image) => {
        optimizeImage(image, optimizerExe, optimizer);
    });
}

async function optimizeImage(image, optimizerExe, optimizer) {
    const optimizedImage = image.replace(path.extname(image), `.${optimizer}`);
    exec(`${optimizerExe} ${image} -o ${optimizedImage}`, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error optimizing image: ${image}`, error);
            return;
        }

        console.log(`Optimized image: ${optimizedImage}`);
    });
}
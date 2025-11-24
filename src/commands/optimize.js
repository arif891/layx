import path from 'node:path';
import sharp from 'sharp';

import { layx } from '../core/config.js';
import { getFilesWithExtension, readFile, writeFile, moveFile } from '../utils/fs.js';
import { minify } from '../utils/helpers.js';

export { optimizeImages };

async function optimizeImages(scriptDir, optimizer = 'avif') {
    const imagesDir = layx.directories.images;
    const imageExtensions = ['jpg', 'jpeg', 'png'];
    let images = [];

    console.log(`Optimizing images with ${optimizer}...`);

    for (const ext of imageExtensions) {
        const foundImages = await getFilesWithExtension(imagesDir, ext, true);
        images = [...images, ...foundImages];
    }

    optimizeSVG(imagesDir);

    if (images.length === 0) {
        console.log('No images found to optimize.');
        return;
    }

    for (const image of images) {
        await optimizeImage(image, optimizer);
    }

    await updateUrls(optimizer);

    console.log(`Optimized images with ${optimizer}`);
}

async function optimizeImage(image, optimizer) {
    try {
        const optimizedImage = image.replace(path.extname(image), `.${optimizer}`);

        if (optimizer === 'avif') {
            await sharp(image)
                .avif()
                .toFile(optimizedImage);
        } else if (optimizer === 'webp') {
            await sharp(image)
                .webp()
                .toFile(optimizedImage);
        } else {
            console.warn(`Unsupported optimizer: ${optimizer}`);
            return;
        }

        moveFile(image, `${path.dirname(image)}/original_images_dir/${path.basename(image)}`);
        console.log(`Optimized: ${image} -> ${optimizedImage}`);
    } catch (error) {
        console.error(`Error optimizing image: ${image}`, error);
    }
}

async function optimizeSVG(imagesDir) {
    console.log(`Optimizing SVG images.`);
    const foundSVGImages = await getFilesWithExtension(imagesDir, 'svg', true);
    if (foundSVGImages.length > 0) {
        try {
            foundSVGImages.forEach(async (image) => {
                const content = await readFile(image);
                await writeFile(path.join(layx.directories.layx, image), content);
                const optimizedImage = await minify(content, 'xml');
                await writeFile(image, optimizedImage);

                console.log(`Optimized svg: ${image}.`);
            });
        } catch (error) {

        }
    }
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
        content = content.replaceAll(url, optimizedUrl);
    }

    return content;
}

function extractUrls(content, type = 'html') {
    const srcRegex = /<(img|source)\b[^>]*\s+src=["'](\/assets\/image\/[^"']+\.(?:png|jpg|jpeg))["']/gi;
    const urlRegex = /url\(["']?(\/assets\/image\/[^"')]+\.(?:png|jpg|jpeg))["']?\)/gi;
    const srcValues = new Set();
    let match;

    switch (type) {
        case 'html':
            while ((match = srcRegex.exec(content)) !== null) {
                srcValues.add(match[2]);
            }
            return Array.from(srcValues);

        case 'css':
            while ((match = urlRegex.exec(content)) !== null) {
                srcValues.add(match[1]);
            }
            return Array.from(srcValues);

        default:
            throw new Error("Invalid type. Use 'html' or 'css'.");
    }
}

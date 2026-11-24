import path from 'node:path';
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import sharp from 'sharp';
import { getFilesWithExtension, readFile, writeFile } from '../utils/fs.js';
import { projectPaths } from '../core/paths.js';

export {
    optimizeImages,
    optimizeImagesForBuild,
    updateUrlsInContent,
    extractUrls
};

/**
 * Optimizes raster images during production build directly into outDir.
 * Dev source files remain completely untouched.
 */
async function optimizeImagesForBuild(outDir, optimizer = 'avif') {
    const imagesDir = projectPaths.image;
    if (!existsSync(imagesDir)) return;

    const outImagesDir = path.join(outDir, 'assets/image');
    const imageExtensions = ['jpg', 'jpeg', 'png'];

    let rasterImages = [];
    for (const ext of imageExtensions) {
        const found = await getFilesWithExtension(imagesDir, ext, true, ['original_images_dir']);
        rasterImages = [...rasterImages, ...found];
    }

    for (const image of rasterImages) {
        try {
            const relPath = path.relative(imagesDir, image);
            const relDir = path.dirname(relPath);
            const baseName = path.basename(image, path.extname(image));
            const destDir = path.join(outImagesDir, relDir);
            const destFile = path.join(destDir, `${baseName}.${optimizer}`);

            await fs.mkdir(destDir, { recursive: true });

            if (optimizer === 'avif') {
                await sharp(image).avif().toFile(destFile);
            } else if (optimizer === 'webp') {
                await sharp(image).webp().toFile(destFile);
            }

            console.log(`Optimized image: ${path.basename(image)} -> ${baseName}.${optimizer}`);
        } catch (error) {
            console.error(`Error optimizing image ${image}: ${error.message}`);
        }
    }

    // Copy any static non-raster, non-svg images (e.g. .gif, .ico, already .webp, .avif)
    const otherExtensions = ['gif', 'ico', 'webp', 'avif'];
    for (const ext of otherExtensions) {
        const found = await getFilesWithExtension(imagesDir, ext, true);
        for (const file of found) {
            const relPath = path.relative(imagesDir, file);
            const destPath = path.join(outImagesDir, relPath);
            await fs.mkdir(path.dirname(destPath), { recursive: true });
            await fs.copyFile(file, destPath);
        }
    }
}

/**
 * Standalone optimizer command (layx optimize)
 */
async function optimizeImages(optimizer = 'avif') {
    const imagesDir = projectPaths.image;
    if (!existsSync(imagesDir)) {
        console.log('No assets/image directory found.');
        return;
    }

    const imageExtensions = ['jpg', 'jpeg', 'png'];
    let images = [];

    console.log(`Optimizing images with ${optimizer}...`);

    for (const ext of imageExtensions) {
        const found = await getFilesWithExtension(imagesDir, ext, true, ['original_images_dir']);
        images = [...images, ...found];
    }

    if (images.length === 0) {
        console.log('No raster images found to optimize.');
        return;
    }

    for (const image of images) {
        try {
            const ext = path.extname(image);
            const optimizedImage = image.slice(0, -ext.length) + `.${optimizer}`;

            if (optimizer === 'avif') {
                await sharp(image).avif().toFile(optimizedImage);
            } else if (optimizer === 'webp') {
                await sharp(image).webp().toFile(optimizedImage);
            } else {
                console.warn(`Unsupported image optimizer: ${optimizer}`);
                return;
            }

            console.log(`Optimized: ${path.basename(image)} -> ${path.basename(optimizedImage)}`);
        } catch (error) {
            console.error(`Error optimizing image ${image}: ${error.message}`);
        }
    }

    console.log(`Optimized images with ${optimizer}`);
}

function updateUrlsInContent(content, type, optimizer) {
    if (!optimizer) return content;
    const urls = extractUrls(content, type);

    for (const url of urls) {
        const optimizedUrl = url.replace(/\.(png|jpg|jpeg)$/i, `.${optimizer}`);
        content = content.replaceAll(url, optimizedUrl);
    }

    return content;
}

function extractUrls(content, type = 'html') {
    const srcRegex = /<(?:img|source)\b[^>]*\s+src=["'](\/assets\/image\/[^"']+\.(?:png|jpg|jpeg))["']/gi;
    const urlRegex = /url\(["']?(\/assets\/image\/[^"')]+\.(?:png|jpg|jpeg))["']?\)/gi;
    const values = new Set();
    let match;

    if (type === 'html') {
        while ((match = srcRegex.exec(content)) !== null) {
            values.add(match[1]);
        }
    } else if (type === 'css') {
        while ((match = urlRegex.exec(content)) !== null) {
            values.add(match[1]);
        }
    }

    return Array.from(values);
}

import path from 'node:path';
import sharp from 'sharp';
import { getFilesWithExtension, readFile, writeFile, moveFile } from '../utils/fs.js';
import { minify } from '../utils/helpers.js';
import { projectPaths } from '../core/paths.js';
import { setBuildState } from '../utils/build-state.js';

export { optimizeImages, restoreOptimizedImages };

async function optimizeImages(optimizer = 'avif') {
    const imagesDir = projectPaths.image;
    const imageExtensions = ['jpg', 'jpeg', 'png'];
    let images = [];

    console.log(`Optimizing images with ${optimizer}...`);

    for (const ext of imageExtensions) {
        const found = await getFilesWithExtension(imagesDir, ext, true, ['original_images_dir']);
        images = [...images, ...found];
    }

    // Await SVG optimization
    await optimizeSvgFiles(imagesDir);

    if (images.length === 0) {
        console.log('No raster images found to optimize.');
        await setBuildState({ optimized: true });
        return;
    }

    for (const image of images) {
        await optimizeSingleImage(image, optimizer);
    }

    await updateUrls(optimizer);
    await setBuildState({ optimized: true });
    console.log(`Optimized images with ${optimizer}`);
}

async function optimizeSingleImage(image, optimizer) {
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

        // Properly await file move to backup location
        const backupDir = path.join(path.dirname(image), 'original_images_dir');
        const backupPath = path.join(backupDir, path.basename(image));
        await moveFile(image, backupPath);

        console.log(`Optimized: ${path.basename(image)} -> ${path.basename(optimizedImage)}`);
    } catch (error) {
        console.error(`Error optimizing image ${image}: ${error.message}`);
    }
}

async function optimizeSvgFiles(imagesDir) {
    console.log('Optimizing SVG images...');
    const svgFiles = await getFilesWithExtension(imagesDir, 'svg', true);

    if (svgFiles.length === 0) return;

    await Promise.all(
        svgFiles.map(async (image) => {
            try {
                const content = await readFile(image);
                const relPath = path.relative(projectPaths.root, image).replace(/\\/g, '/');
                const backupPath = path.join(projectPaths.layx, relPath);

                // Backup original SVG into layx/
                await writeFile(backupPath, content);

                // Minify SVG and overwrite
                const optimized = minify(content, 'xml');
                await writeFile(image, optimized);

                console.log(`Optimized SVG: ${path.basename(image)}`);
            } catch (err) {
                console.error(`Failed to optimize SVG ${image}: ${err.message}`);
            }
        })
    );
}

async function restoreOptimizedImages() {
    // 1. Restore SVGs from layx/assets/image
    const svgFiles = await getFilesWithExtension(projectPaths.layxImagesOut, 'svg', true);
    for (const file of svgFiles) {
        try {
            const content = await readFile(file);
            const relPath = path.relative(projectPaths.layx, file).replace(/\\/g, '/');
            const destPath = path.join(projectPaths.root, relPath);
            await writeFile(destPath, content);
            console.log(`Restored ${path.basename(file)}`);
        } catch (error) {
            console.error(`Failed to restore SVG ${file}: ${error.message}`);
        }
    }

    // 2. Restore raster images from original_images_dir
    const originalDirs = await getFilesWithExtension(projectPaths.image, 'original_images_dir', true);
    // Any backed up files in original_images_dir
    const rasterExtensions = ['jpg', 'jpeg', 'png'];
    for (const ext of rasterExtensions) {
        const files = await getFilesWithExtension(projectPaths.image, ext, true);
        for (const file of files) {
            if (file.includes('original_images_dir')) {
                const destPath = file.replace(/original_images_dir[/\\]/, '');
                await moveFile(file, destPath);
            }
        }
    }
}

async function updateUrls(optimizer) {
    await updateFiles(projectPaths.root, 'html', optimizer);
    await updateFiles(projectPaths.css, 'css', optimizer);
}

async function updateFiles(directory, type, optimizer) {
    const files = await getFilesWithExtension(directory, type, true);

    for (const file of files) {
        const content = await readFile(file);
        const updatedContent = updateUrlsInContent(content, type, optimizer);
        if (updatedContent !== content) {
            await writeFile(file, updatedContent);
        }
    }
}

function updateUrlsInContent(content, type, optimizer) {
    const urls = extractUrls(content, type);

    for (const url of urls) {
        const optimizedUrl = url.replace(/\.(png|jpg|jpeg)$/i, `.${optimizer}`);
        content = content.replaceAll(url, optimizedUrl);
    }

    return content;
}

function extractUrls(content, type = 'html') {
    const srcRegex = /<(img|source)\b[^>]*\s+src=["'](\/assets\/image\/[^"']+\.(?:png|jpg|jpeg))["']/gi;
    const urlRegex = /url\(["']?(\/assets\/image\/[^"')]+\.(?:png|jpg|jpeg))["']?\)/gi;
    const values = new Set();
    let match;

    if (type === 'html') {
        while ((match = srcRegex.exec(content)) !== null) {
            values.add(match[2]);
        }
    } else if (type === 'css') {
        while ((match = urlRegex.exec(content)) !== null) {
            values.add(match[1]);
        }
    }

    return Array.from(values);
}

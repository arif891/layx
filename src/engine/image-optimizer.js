import path from 'node:path';
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import sharp from 'sharp';
import { getFilesWithExtension, readFile, writeFile } from '../utils/fs.js';
import { projectPaths } from '../core/paths.js';

export {
    optimizeImages,
    optimizeImagesForBuild,
    restoreOptimizedImages,
    updateUrls,
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

    // Copy any static non-raster, non-svg images (e.g. .gif, .ico, existing .webp, .avif)
    const otherExtensions = ['gif', 'ico', 'webp', 'avif'];
    for (const ext of otherExtensions) {
        const found = await getFilesWithExtension(imagesDir, ext, true, ['original_images_dir']);
        for (const file of found) {
            const relPath = path.relative(imagesDir, file);
            const destPath = path.join(outImagesDir, relPath);
            if (!existsSync(destPath)) {
                await fs.mkdir(path.dirname(destPath), { recursive: true });
                await fs.copyFile(file, destPath);
            }
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

            // Move original image to original_images_dir backup folder
            const backupDir = path.join(path.dirname(image), 'original_images_dir');
            const backupPath = path.join(backupDir, path.basename(image));
            await fs.mkdir(backupDir, { recursive: true });
            await fs.rename(image, backupPath);
        } catch (error) {
            console.error(`Error optimizing image ${image}: ${error.message}`);
        }
    }

    await updateUrls(optimizer);
    console.log(`Optimized images with ${optimizer} and updated links in project files.`);
}

/**
 * Restores original raster images from original_images_dir back to their parent folders.
 */
async function restoreOptimizedImages() {
    const imagesDir = projectPaths.image;
    if (!existsSync(imagesDir)) return;

    const rasterExtensions = ['jpg', 'jpeg', 'png'];
    for (const ext of rasterExtensions) {
        const files = await getFilesWithExtension(imagesDir, ext, true);
        for (const file of files) {
            if (file.includes('original_images_dir')) {
                const destPath = file.replace(/[/\\]original_images_dir[/\\]/, path.sep);
                await fs.rename(file, destPath);
                console.log(`Restored: ${path.basename(file)} -> ${path.relative(imagesDir, destPath)}`);
            }
        }
    }
}

async function updateUrls(optimizer) {
    await updateFiles(projectPaths.root, 'html', optimizer);
    await updateFiles(projectPaths.pages, 'html', optimizer);
    await updateFiles(projectPaths.css, 'css', optimizer);
    await updateFiles(projectPaths.js, 'js', optimizer);
}

async function updateFiles(directory, type, optimizer) {
    if (!existsSync(directory)) return;
    const exclude = ['dist', 'node_modules', '.git', 'original_images_dir', 'template', 'scratch'];
    const files = await getFilesWithExtension(directory, type, true, exclude);

    for (const file of files) {
        try {
            const content = await readFile(file);
            const updatedContent = updateUrlsInContent(content, type, optimizer);
            if (updatedContent !== content) {
                await writeFile(file, updatedContent);
                console.log(`Updated image links in: ${path.relative(projectPaths.root, file)}`);
            }
        } catch (error) {
            console.error(`Failed to update image links in ${file}: ${error.message}`);
        }
    }
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
    // 1. Quoted paths in HTML attributes, JS strings, CSS, or component props:
    //    e.g. "/assets/image/foo.png", 'assets/image/foo.jpg', `./assets/image/foo.png`
    const quotedRegex = /(['"`])((?:\.\/|\.\.\/|\/)?assets\/image\/[^"'`\s?#]+\.(?:png|jpg|jpeg))\1/gi;

    // 2. CSS url(...) syntax (quoted or unquoted):
    //    e.g. url(/assets/image/foo.png), url('/assets/image/foo.png')
    const urlRegex = /url\(["']?((?:\.\/|\.\.\/|\/)?assets\/image\/[^"')\s?#]+\.(?:png|jpg|jpeg))["']?\)/gi;

    // 3. Fallback for unquoted src/href attributes:
    const unquotedAttrRegex = /\b(?:src|href)=((?:\.\/|\.\.\/|\/)?assets\/image\/[^\s>]+?\.(?:png|jpg|jpeg))/gi;

    const values = new Set();
    let match;

    while ((match = quotedRegex.exec(content)) !== null) {
        values.add(match[2]);
    }
    while ((match = urlRegex.exec(content)) !== null) {
        values.add(match[1]);
    }
    while ((match = unquotedAttrRegex.exec(content)) !== null) {
        values.add(match[1]);
    }

    return Array.from(values);
}

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import sharp from 'sharp';

const execFileAsync = promisify(execFile);
const cliPath = path.resolve('src/cli.js');
const testBaseDir = path.resolve('scratch/test-optimize-suite');
const testProjectName = 'optimize-target';
const testProjectPath = path.join(testBaseDir, testProjectName);

describe('Image Optimization Engine', () => {
    before(async () => {
        if (existsSync(testBaseDir)) {
            await fs.rm(testBaseDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
        }
        await fs.mkdir(testBaseDir, { recursive: true });

        // Create test project
        await execFileAsync('node', [cliPath, 'create', testProjectName], { cwd: testBaseDir });
    });

    after(async () => {
        if (existsSync(testBaseDir)) {
            await fs.rm(testBaseDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
        }
    });

    test('optimizes raster images and leaves SVGs completely untouched', async () => {
        const svgPath = path.join(testProjectPath, 'assets/image/svg/icons.svg');
        const initialSvgContent = await fs.readFile(svgPath, 'utf8');

        // Create a test raster PNG
        const testPngPath = path.join(testProjectPath, 'assets/image/test-raster.png');
        await sharp({
            create: { width: 10, height: 10, channels: 4, background: { r: 255, g: 0, b: 0, alpha: 1 } }
        }).png().toFile(testPngPath);

        const { stdout } = await execFileAsync('node', [cliPath, 'optimize'], { cwd: testProjectPath });
        assert.match(stdout, /Optimized images with avif/);
        assert.doesNotMatch(stdout, /Optimizing SVG images/, 'optimize must not report optimizing SVGs');

        // Verify raster image was converted to avif
        const avifPath = path.join(testProjectPath, 'assets/image/test-raster.avif');
        assert.ok(existsSync(avifPath), 'Optimized AVIF file should exist');

        // Verify SVG was NOT minified, purged, or modified in any way
        const currentSvgContent = await fs.readFile(svgPath, 'utf8');
        assert.equal(currentSvgContent, initialSvgContent, 'SVG content must remain byte-for-byte identical');

        // Verify no SVG backup was created in layx/ by optimize
        const backupSvgPath = path.join(testProjectPath, 'layx/assets/image/svg/icons.svg');
        assert.ok(!existsSync(backupSvgPath), 'SVG backup in layx/ should NOT be created by optimize');
    });

    test('unbuild restores raster images cleanly', async () => {
        const { stdout } = await execFileAsync('node', [cliPath, 'unbuild'], { cwd: testProjectPath });
        assert.match(stdout, /Unbuild process completed successfully/);

        const testPngPath = path.join(testProjectPath, 'assets/image/test-raster.png');
        assert.ok(existsSync(testPngPath), 'Restored PNG should exist in assets/image');
    });
});

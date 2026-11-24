import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';

const execFileAsync = promisify(execFile);
const cliPath = path.resolve('src/cli.js');
const testBaseDir = path.resolve('scratch/test-build-suite');
const testProjectName = 'build-target';
const testProjectPath = path.join(testBaseDir, testProjectName);

describe('Production Build Engine', () => {
    before(async () => {
        if (existsSync(testBaseDir)) {
            await fs.rm(testBaseDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
        }
        await fs.mkdir(testBaseDir, { recursive: true });

        // Create the test project first
        await execFileAsync('node', [cliPath, 'create', testProjectName], { cwd: testBaseDir });
    });

    after(async () => {
        if (existsSync(testBaseDir)) {
            await fs.rm(testBaseDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
        }
    });

    test('build outputs to /dist, removes layx CSS & JS completely from HTML, and leaves dev files untouched', async () => {
        const initialIndexHtml = await fs.readFile(path.join(testProjectPath, 'index.html'), 'utf8');
        const initialBaseCss = await fs.readFile(path.join(testProjectPath, 'assets/css/base.css'), 'utf8');
        const initialBaseJs = await fs.readFile(path.join(testProjectPath, 'assets/js/base.js'), 'utf8');

        const { stdout } = await execFileAsync('node', [cliPath, 'build'], { cwd: testProjectPath });
        assert.match(stdout, /Build process completed successfully/);

        // 1. Verify dist directory exists and layx/ folder is NOT copied to dist/
        const distDir = path.join(testProjectPath, 'dist');
        assert.ok(existsSync(distDir), 'dist/ directory should exist');
        assert.ok(!existsSync(path.join(distDir, 'layx')), 'layx folder should NOT be copied to dist/');

        // 2. Verify HTML transformation in dist: layx entries are completely removed (not commented!)
        const distHtml = await fs.readFile(path.join(distDir, 'index.html'), 'utf8');
        assert.ok(!distHtml.includes('layx.css'), 'dist/index.html must not contain layx.css');
        assert.ok(!distHtml.includes('layx.js'), 'dist/index.html must not contain layx.js');
        assert.ok(!distHtml.includes('<!--<link rel="stylesheet" href="/layx/layx.css">-->'), 'layx.css must not be commented out');
        assert.ok(!distHtml.includes('<!--<script src="/layx/layx.js"'), 'layx.js must not be commented out');
        assert.ok(distHtml.includes('/assets/css/base.css'), 'dist/index.html must link to /assets/css/base.css');
        assert.ok(distHtml.includes('/assets/js/base.js'), 'dist/index.html must link to /assets/js/base.js');

        // 3. Verify development source files remain completely untouched
        const currentDevHtml = await fs.readFile(path.join(testProjectPath, 'index.html'), 'utf8');
        const currentDevCss = await fs.readFile(path.join(testProjectPath, 'assets/css/base.css'), 'utf8');
        const currentDevJs = await fs.readFile(path.join(testProjectPath, 'assets/js/base.js'), 'utf8');

        assert.equal(currentDevHtml, initialIndexHtml, 'Development index.html must remain identical');
        assert.equal(currentDevCss, initialBaseCss, 'Development base.css must remain identical');
        assert.equal(currentDevJs, initialBaseJs, 'Development base.js must remain identical');

        // 4. Verify no backups created inside layx/assets
        assert.ok(!existsSync(path.join(testProjectPath, 'layx/assets/css/user_base.css')), 'No backup user_base.css in layx/');
        assert.ok(!existsSync(path.join(testProjectPath, 'layx/assets/js/user_base.js')), 'No backup user_base.js in layx/');
    });

    test('optimizes CSS by generating only used grid classes in dist/assets/css/base.css', async () => {
        // Add specific layout classes to development index.html
        const indexPath = path.join(testProjectPath, 'index.html');
        let html = await fs.readFile(indexPath, 'utf8');
        html = html.replace('<body>', '<body>\n<div class="x-6 x-md-4 num-x-3">Test</div>');
        await fs.writeFile(indexPath, html, 'utf8');

        // Run build
        await execFileAsync('node', [cliPath, 'build'], { cwd: testProjectPath });

        // Check bundled CSS in dist/assets/css/base.css
        const bundledCss = await fs.readFile(path.join(testProjectPath, 'dist/assets/css/base.css'), 'utf8');

        // Verify used classes exist in bundled CSS
        assert.match(bundledCss, /\.x-6/);
        assert.match(bundledCss, /\.x-md-4/);
        assert.match(bundledCss, /\.num-x-3/);

        // Verify unused grid numbers do NOT exist
        assert.doesNotMatch(bundledCss, /\.x-7\{/);
        assert.doesNotMatch(bundledCss, /\.x-11\{/);
        assert.doesNotMatch(bundledCss, /\.x-lg-9\{/);

        // Verify dev base.css is still untouched
        const devBaseCss = await fs.readFile(path.join(testProjectPath, 'assets/css/base.css'), 'utf8');
        assert.doesNotMatch(devBaseCss, /\.x-6/, 'Dev base.css must not be modified');
    });

    test('build purges unused symbols from icons.svg into dist while leaving source SVG untouched', async () => {
        // Add sun-fill icon usage to index.html
        const indexPath = path.join(testProjectPath, 'index.html');
        let html = await fs.readFile(indexPath, 'utf8');
        html = html.replace('<body>', '<body>\n<svg class="icon"><use href="/assets/image/svg/icons.svg#sun-fill" /></svg>');
        await fs.writeFile(indexPath, html, 'utf8');

        const devSvgPath = path.join(testProjectPath, 'assets/image/svg/icons.svg');
        const initialDevSvg = await fs.readFile(devSvgPath, 'utf8');

        // Run build
        const { stdout: buildOut } = await execFileAsync('node', [cliPath, 'build'], { cwd: testProjectPath });
        assert.match(buildOut, /Purged \d+ unused symbol/);

        // Read built icons.svg in dist
        const builtSvgPath = path.join(testProjectPath, 'dist/assets/image/svg/icons.svg');
        const builtSvg = await fs.readFile(builtSvgPath, 'utf8');
        assert.match(builtSvg, /id="sun-fill"/, 'Used sun-fill symbol must be retained in dist');
        assert.doesNotMatch(builtSvg, /id="id"/, 'Unused id placeholder symbols must be purged in dist');

        // Verify dev SVG is completely unchanged
        const currentDevSvg = await fs.readFile(devSvgPath, 'utf8');
        assert.equal(currentDevSvg, initialDevSvg, 'Dev icons.svg must remain completely unchanged');
    });

    test('supports configurable output directory via CLI flag and config', async () => {
        // Run build with custom output directory via CLI flag
        const customDirName = 'custom-output';
        const { stdout } = await execFileAsync('node', [cliPath, 'build', '--outDir', customDirName], { cwd: testProjectPath });
        assert.match(stdout, /Build process completed successfully/);

        const customPath = path.join(testProjectPath, customDirName);
        assert.ok(existsSync(customPath), 'Custom output directory should exist');
        assert.ok(existsSync(path.join(customPath, 'index.html')), 'HTML should exist in custom directory');
        assert.ok(existsSync(path.join(customPath, 'assets/css/base.css')), 'CSS should exist in custom directory');
        assert.ok(existsSync(path.join(customPath, 'assets/js/base.js')), 'JS should exist in custom directory');
    });
});

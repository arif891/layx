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

describe('Build and Unbuild Lifecycle', () => {
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

    test('build bundles and comments framework entry points in HTML', async () => {
        const { stdout } = await execFileAsync('node', [cliPath, 'build'], { cwd: testProjectPath });
        assert.match(stdout, /Build process completed successfully/);

        // Verify HTML transformation
        const html = await fs.readFile(path.join(testProjectPath, 'index.html'), 'utf8');
        assert.match(html, /<!--<link rel="stylesheet" href="\/layx\/layx\.css">-->/);
        assert.match(html, /<!--<script src="\/layx\/layx\.js" type="module"><\/script>-->/);
    });

    test('unbuild restores original source references in HTML', async () => {
        const { stdout } = await execFileAsync('node', [cliPath, 'unbuild'], { cwd: testProjectPath });
        assert.match(stdout, /Unbuild process completed successfully/);

        // Verify HTML restoration
        const html = await fs.readFile(path.join(testProjectPath, 'index.html'), 'utf8');
        assert.match(html, /<link rel="stylesheet" href="\/layx\/layx\.css">/);
        assert.match(html, /<script src="\/layx\/layx\.js" type="module"><\/script>/);
    });

    test('optimizes CSS by generating only used grid classes and stripping unused ones', async () => {
        // Add specific layout classes to index.html
        const indexPath = path.join(testProjectPath, 'index.html');
        let html = await fs.readFile(indexPath, 'utf8');
        html = html.replace('<body>', '<body>\n<div class="x-6 x-md-4 num-x-3">Test</div>');
        await fs.writeFile(indexPath, html, 'utf8');

        // Run build
        await execFileAsync('node', [cliPath, 'build'], { cwd: testProjectPath });

        // Check bundled CSS in assets/css/base.css
        const bundledCss = await fs.readFile(path.join(testProjectPath, 'assets/css/base.css'), 'utf8');

        // Verify used classes exist in bundled CSS
        assert.match(bundledCss, /\.x-6/);
        assert.match(bundledCss, /\.x-md-4/);
        assert.match(bundledCss, /\.num-x-3/);

        // Verify unused grid numbers do NOT exist
        assert.doesNotMatch(bundledCss, /\.x-7\{/);
        assert.doesNotMatch(bundledCss, /\.x-11\{/);
        assert.doesNotMatch(bundledCss, /\.x-lg-9\{/);
    });

    test('build purges unused symbols from icons.svg and unbuild restores them', async () => {
        // Reset back to unbuilt state first
        await execFileAsync('node', [cliPath, 'unbuild'], { cwd: testProjectPath });

        // Add sun-fill icon usage to index.html
        const indexPath = path.join(testProjectPath, 'index.html');
        let html = await fs.readFile(indexPath, 'utf8');
        html = html.replace('<body>', '<body>\n<svg class="icon"><use href="/assets/image/svg/icons.svg#sun-fill" /></svg>');
        await fs.writeFile(indexPath, html, 'utf8');

        // Run build
        const { stdout: buildOut } = await execFileAsync('node', [cliPath, 'build'], { cwd: testProjectPath });
        assert.match(buildOut, /Purged \d+ unused symbol/);

        // Read built icons.svg
        const svgPath = path.join(testProjectPath, 'assets/image/svg/icons.svg');
        const builtSvg = await fs.readFile(svgPath, 'utf8');
        assert.match(builtSvg, /id="sun-fill"/, 'Used sun-fill symbol must be retained');
        assert.doesNotMatch(builtSvg, /id="id"/, 'Unused id placeholder symbols must be purged');

        // Run unbuild
        await execFileAsync('node', [cliPath, 'unbuild'], { cwd: testProjectPath });

        // Read restored icons.svg
        const restoredSvg = await fs.readFile(svgPath, 'utf8');
        assert.match(restoredSvg, /id="sun-fill"/, 'Restored SVG should have sun-fill');
        assert.match(restoredSvg, /id="id"/, 'Restored SVG should have original id placeholders');
    });
});

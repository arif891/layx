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
});

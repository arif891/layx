import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';

const execFileAsync = promisify(execFile);
const cliPath = path.resolve('src/cli.js');
const testBaseDir = path.resolve('scratch/test-optimize-suite');
const testProjectName = 'optimize-target';
const testProjectPath = path.join(testBaseDir, testProjectName);

describe('Image and SVG Optimization Engine', () => {
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

    test('optimizes SVGs and backs up originals into layx directory', async () => {
        const { stdout } = await execFileAsync('node', [cliPath, 'optimize'], { cwd: testProjectPath });
        assert.match(stdout, /Optimizing SVG images/);

        // Verify SVG exists in project assets
        const svgPath = path.join(testProjectPath, 'assets/image/svg/icons.svg');
        assert.ok(existsSync(svgPath), 'Optimized SVG should exist');

        // Verify original backup was created in layx/
        const backupPath = path.join(testProjectPath, 'layx/assets/image/svg/icons.svg');
        assert.ok(existsSync(backupPath), 'SVG backup in layx/ should exist');
    });

    test('unbuild restores original SVGs cleanly', async () => {
        const { stdout } = await execFileAsync('node', [cliPath, 'unbuild'], { cwd: testProjectPath });
        assert.match(stdout, /Unbuild process completed successfully/);

        const svgPath = path.join(testProjectPath, 'assets/image/svg/icons.svg');
        assert.ok(existsSync(svgPath), 'Restored SVG should exist');
    });
});

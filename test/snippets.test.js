import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';

const execFileAsync = promisify(execFile);
const cliPath = path.resolve('src/cli.js');
const testDir = path.resolve('scratch/test-snippets-suite');

describe('Snippets Command (layx snippets)', () => {
    before(async () => {
        if (existsSync(testDir)) {
            await fs.rm(testDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
        }
        await fs.mkdir(testDir, { recursive: true });
    });

    after(async () => {
        if (existsSync(testDir)) {
            await fs.rm(testDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
        }
    });

    test('installs snippets into .vscode folder of current working directory', async () => {
        const { stdout } = await execFileAsync('node', [cliPath, 'snippets'], { cwd: testDir });
        assert.match(stdout, /snippets installed to/);

        const targetFile = path.join(testDir, '.vscode/layx.code-snippets');
        assert.ok(existsSync(targetFile), '.vscode/layx.code-snippets should exist');

        const content = await fs.readFile(targetFile, 'utf8');
        const parsed = JSON.parse(content);
        assert.ok(parsed['Navbar Component'], 'Expected "Navbar Component" snippet to exist');
    });
});

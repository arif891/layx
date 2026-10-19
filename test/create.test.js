import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';

const execFileAsync = promisify(execFile);
const cliPath = path.resolve('src/cli.js');
const testBaseDir = path.resolve('scratch/test-create-suite');
const testProjectName = 'sample-landing';
const testProjectPath = path.join(testBaseDir, testProjectName);

describe('Project Scaffolding (layx create)', () => {
    before(async () => {
        if (existsSync(testBaseDir)) {
            await fs.rm(testBaseDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
        }
        await fs.mkdir(testBaseDir, { recursive: true });
    });

    after(async () => {
        if (existsSync(testBaseDir)) {
            await fs.rm(testBaseDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
        }
    });

    test('creates a project with all starter files', async () => {
        const { stdout } = await execFileAsync(
            'node',
            [cliPath, 'create', testProjectName],
            { cwd: testBaseDir }
        );

        assert.match(stdout, /Project created successfully/);

        // Verify directory and files exist
        assert.ok(existsSync(testProjectPath), 'Project directory should exist');
        assert.ok(existsSync(path.join(testProjectPath, 'index.html')), 'index.html should exist');
        assert.ok(existsSync(path.join(testProjectPath, 'config.mjs')), 'config.mjs should exist');
        assert.ok(existsSync(path.join(testProjectPath, 'layx/layx.css')), 'layx/layx.css should exist');
        assert.ok(existsSync(path.join(testProjectPath, 'layx/layx.js')), 'layx/layx.js should exist');
        assert.ok(existsSync(path.join(testProjectPath, 'assets/css/base.css')), 'assets/css/base.css should exist');
        assert.ok(existsSync(path.join(testProjectPath, 'pages')), 'pages directory should exist');
        assert.ok(existsSync(path.join(testProjectPath, '.vscode/layx.code-snippets')), 'VS Code snippets should exist');

        // Verify package.json content
        const pkgRaw = await fs.readFile(path.join(testProjectPath, 'package.json'), 'utf8');
        const pkg = JSON.parse(pkgRaw);

        assert.equal(pkg.name, testProjectName);
        assert.equal(pkg.type, 'module');
        assert.ok(pkg.scripts.build, 'build script should exist');
        assert.ok(pkg.scripts.unbuild, 'unbuild script should exist');
        assert.ok(pkg.scripts.optimize, 'optimize script should exist');
    });

    test('verifies code snippets are valid JSON', async () => {
        const snippetsPath = path.join(testProjectPath, '.vscode/layx.code-snippets');
        const raw = await fs.readFile(snippetsPath, 'utf8');
        const snippets = JSON.parse(raw);
        assert.ok(snippets['layX Document'], 'Snippet "layX Document" should exist');
        assert.ok(snippets['Container Component'], 'Snippet "Container Component" should exist');
    });
});

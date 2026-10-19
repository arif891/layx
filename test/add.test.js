import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';

const execFileAsync = promisify(execFile);
const cliPath = path.resolve('src/cli.js');
const testBaseDir = path.resolve('scratch/test-add-suite');
const testProjectName = 'add-target';
const testProjectPath = path.join(testBaseDir, testProjectName);

describe('Component Addition Engine (layx add -c)', () => {
    before(async () => {
        if (existsSync(testBaseDir)) {
            await fs.rm(testBaseDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
        }
        await fs.mkdir(testBaseDir, { recursive: true });

        // Create initial project
        await execFileAsync('node', [cliPath, 'create', testProjectName], { cwd: testBaseDir });
    });

    after(async () => {
        if (existsSync(testBaseDir)) {
            await fs.rm(testBaseDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
        }
    });

    test('verifies initial project only contains default components', async () => {
        const componentsDir = path.join(testProjectPath, 'layx/components');
        assert.ok(existsSync(path.join(componentsDir, 'button')), 'Default button should exist');
        assert.ok(existsSync(path.join(componentsDir, 'navbar')), 'Default navbar should exist');
        assert.ok(existsSync(path.join(componentsDir, 'footer')), 'Default footer should exist');
        assert.ok(!existsSync(path.join(componentsDir, 'accordion')), 'Accordion should NOT exist yet');

        const layxCss = await fs.readFile(path.join(testProjectPath, 'layx/layx.css'), 'utf8');
        assert.match(layxCss, /components\/button\/button\.css/);
        assert.match(layxCss, /components\/navbar/);
    });

    test('adds accordion component from local package and auto-wires CSS', async () => {
        const { stdout } = await execFileAsync(
            'node',
            [cliPath, 'add', '-c', 'accordion'],
            { cwd: testProjectPath }
        );

        assert.match(stdout, /Found "accordion" in local package/);
        assert.match(stdout, /Registered CSS/);
        assert.match(stdout, /HTML Usage Example/);

        // Verify files copied
        const accordionCssPath = path.join(testProjectPath, 'layx/components/accordion/accordion.css');
        assert.ok(existsSync(accordionCssPath), 'accordion.css should exist in project');

        // Verify auto-wiring in layx.css
        const layxCss = await fs.readFile(path.join(testProjectPath, 'layx/layx.css'), 'utf8');
        assert.match(layxCss, /@import url\(components\/accordion\/accordion\.css\);/);
    });
});

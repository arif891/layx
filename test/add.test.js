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

describe('Component Addition Engine (layx add -c / -o)', () => {
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

    test('verifies initial project only contains default others (icon and theme)', async () => {
        const othersDir = path.join(testProjectPath, 'layx/others');
        assert.ok(existsSync(path.join(othersDir, 'icon')), 'Default icon should exist');
        assert.ok(existsSync(path.join(othersDir, 'theme')), 'Default theme should exist');
        assert.ok(!existsSync(path.join(othersDir, 'smooth_scroll')), 'smooth_scroll should NOT exist by default');
        assert.ok(!existsSync(path.join(othersDir, 'syntax_highlighter')), 'syntax_highlighter should NOT exist by default');

        const layxCss = await fs.readFile(path.join(testProjectPath, 'layx/layx.css'), 'utf8');
        assert.match(layxCss, /others\/icon\/icon\.css/);
        assert.match(layxCss, /others\/theme\/theme\.css/);

        const layxJs = await fs.readFile(path.join(testProjectPath, 'layx/layx.js'), 'utf8');
        assert.match(layxJs, /others\/theme\/theme\.js/);
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

    test('adds other module via -o and auto-wires JS under /* Other */', async () => {
        const { stdout } = await execFileAsync(
            'node',
            [cliPath, 'add', '-o', 'smooth_scroll'],
            { cwd: testProjectPath }
        );

        assert.match(stdout, /Found "smooth_scroll" in local package others/);
        assert.match(stdout, /Registered JS/);

        // Verify files copied
        const smoothScrollJs = path.join(testProjectPath, 'layx/others/smooth_scroll/smooth_scroll.js');
        assert.ok(existsSync(smoothScrollJs), 'smooth_scroll.js should exist in project');

        // Verify auto-wiring in layx.js under /* Other */
        const layxJs = await fs.readFile(path.join(testProjectPath, 'layx/layx.js'), 'utf8');
        assert.match(layxJs, /import '\.\/others\/smooth_scroll\/smooth_scroll\.js';/);
    });

    test('intelligently adds other module when requested via -c', async () => {
        const { stdout } = await execFileAsync(
            'node',
            [cliPath, 'add', '-c', 'mouse_tracker'],
            { cwd: testProjectPath }
        );

        assert.match(stdout, /Found "mouse_tracker" in local package others/);
        const trackerJs = path.join(testProjectPath, 'layx/others/mouse_tracker/mouse_tracker.js');
        assert.ok(existsSync(trackerJs), 'mouse_tracker.js should exist in project');
    });
});

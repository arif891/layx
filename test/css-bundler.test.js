import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { bundleCss, processPageCss, resolveImportPath } from '../src/engine/css-bundler.js';
import { projectPaths } from '../src/core/paths.js';

describe('CSS Bundler Engine', () => {
    test('resolveImportPath resolves root-relative and relative URLs correctly', () => {
        // Root relative
        const rootResolved = resolveImportPath('/some/file.css', '/layx/main/base/variable.css');
        assert.ok(rootResolved.endsWith(path.normalize('layx/main/base/variable.css')));

        // Relative
        const relResolved = resolveImportPath('C:/test/assets/css/pages/app/index.css', 'core/tokens.css');
        assert.ok(relResolved.endsWith(path.normalize('assets/css/pages/app/core/tokens.css')));
    });

    test('retains LayX imports in page CSS when base.css is not linked by HTML', async () => {
        const scratchDir = path.resolve('scratch/test-css-suite');
        await fs.rm(scratchDir, { recursive: true, force: true });
        await fs.mkdir(scratchDir, { recursive: true });

        // Setup mock project layout
        const outDir = path.join(scratchDir, 'dist');
        const pagesCssDir = path.join(scratchDir, 'assets/css/pages/app');
        await fs.mkdir(pagesCssDir, { recursive: true });

        const layxBaseDir = path.join(scratchDir, 'layx/main/base');
        await fs.mkdir(layxBaseDir, { recursive: true });
        await fs.writeFile(path.join(layxBaseDir, 'variable.css'), ':root { --layx-var: #123; }', 'utf8');

        // Page CSS importing root-relative layx CSS
        const pageCssContent = '@import url(/layx/main/base/variable.css);\n.app { color: red; }';
        const pageCssPath = path.join(pagesCssDir, 'index.css');
        await fs.writeFile(pageCssPath, pageCssContent, 'utf8');

        // HTML that only links index.css, not base.css
        const htmlDir = path.join(scratchDir, 'pages/app');
        await fs.mkdir(htmlDir, { recursive: true });
        await fs.writeFile(
            path.join(htmlDir, 'index.html'),
            '<html><head><link rel="stylesheet" href="/assets/css/pages/app/index.css"></head><body>App</body></html>',
            'utf8'
        );

        // Temporarily point projectPaths to scratchDir
        const origRoot = projectPaths.root;
        const origPagesCss = projectPaths.pagesCss;
        const origCss = projectPaths.css;
        const origLayxCss = projectPaths.layxCss;
        const origBaseCss = projectPaths.baseCss;

        projectPaths.root = scratchDir;
        projectPaths.pagesCss = path.join(scratchDir, 'assets/css/pages');
        projectPaths.css = path.join(scratchDir, 'assets/css');
        projectPaths.layxCss = path.join(scratchDir, 'layx/layx.css');
        projectPaths.baseCss = path.join(scratchDir, 'assets/css/base.css');

        try {
            await processPageCss(outDir, true, null);

            const outPath = path.join(outDir, 'assets/css/pages/app/index.css');
            assert.ok(existsSync(outPath), 'Bundled page CSS must exist');

            const content = await fs.readFile(outPath, 'utf8');
            assert.ok(content.includes('--layx-var'), 'Must contain inlined variable.css declarations');
            assert.ok(content.includes('.app'), 'Must contain page-specific CSS rules');
            assert.ok(!content.includes('@import'), 'All @import statements must be removed');
        } finally {
            projectPaths.root = origRoot;
            projectPaths.pagesCss = origPagesCss;
            projectPaths.css = origCss;
            projectPaths.layxCss = origLayxCss;
            projectPaths.baseCss = origBaseCss;
            await fs.rm(scratchDir, { recursive: true, force: true });
        }
    });
});

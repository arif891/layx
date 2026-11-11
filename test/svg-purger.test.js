import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { parseSvgSymbols, isSymbolUsed, stripComments, purgeUnusedSvgSymbols } from '../src/engine/svg-purger.js';

describe('SVG Symbol Purger Engine', () => {
    describe('parseSvgSymbols', () => {
        test('extracts symbols with attributes and identifies empty symbols', () => {
            const svg = `
                <svg xmlns="http://www.w3.org/2000/svg">
                    <symbol id="sun-fill" viewBox="0 0 16 16">
                        <path d="M8 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8" />
                    </symbol>
                    <symbol viewBox="0 0 24 24" id="moon">
                        <path d="M12 2a10 10 0 1 0 10 10" />
                    </symbol>
                    <symbol id="id">
                    </symbol>
                    <symbol id="self-closing" />
                </svg>
            `;

            const symbols = parseSvgSymbols(svg);
            assert.equal(symbols.length, 4);

            assert.equal(symbols[0].id, 'sun-fill');
            assert.equal(symbols[0].isEmpty, false);

            assert.equal(symbols[1].id, 'moon');
            assert.equal(symbols[1].isEmpty, false);

            assert.equal(symbols[2].id, 'id');
            assert.equal(symbols[2].isEmpty, true);

            assert.equal(symbols[3].id, 'self-closing');
            assert.equal(symbols[3].isEmpty, true);
        });
    });

    describe('stripComments', () => {
        test('strips HTML, multi-line JS/CSS, and single-line JS comments while preserving URLs', () => {
            const input = `
                <!-- <use href="#html-commented-icon" /> -->
                /* <use href="#block-commented-icon" /> */
                // <use href="#line-commented-icon" />
                const url = 'https://example.com/icons.svg#real-icon';
                const href = '#active-icon';
            `;

            const result = stripComments(input);
            assert.ok(!result.includes('#html-commented-icon'));
            assert.ok(!result.includes('#block-commented-icon'));
            assert.ok(!result.includes('#line-commented-icon'));
            assert.ok(result.includes('https://example.com/icons.svg#real-icon'));
            assert.ok(result.includes('#active-icon'));
        });
    });

    describe('isSymbolUsed', () => {
        test('detects fragment references and exact quoted strings with boundaries', () => {
            const html = `<svg class="icon"><use href="/assets/image/svg/icons.svg#sun-fill" /></svg>`;
            const js = `const icon = 'moon'; const obj = { id: 123 };`;

            // Fragment matches
            assert.equal(isSymbolUsed('sun-fill', html), true);
            assert.equal(isSymbolUsed('sun', html), false, 'Should not match prefix substring of sun-fill');

            // Quoted string matches in JS
            assert.equal(isSymbolUsed('moon', js), true);
            assert.equal(isSymbolUsed('id', js), false, 'Raw property names like id: should not match');
            assert.equal(isSymbolUsed('unused', html + js), false);
        });
    });

    describe('purgeUnusedSvgSymbols file operation', () => {
        const testDir = path.resolve('scratch/test-svg-purger');
        const imgDir = path.join(testDir, 'assets/image/svg');
        const layxImgDir = path.join(testDir, 'layx/assets/image/svg');

        before(async () => {
            if (existsSync(testDir)) {
                await fs.rm(testDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
            }
            await fs.mkdir(imgDir, { recursive: true });
        });

        after(async () => {
            if (existsSync(testDir)) {
                await fs.rm(testDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
            }
        });

        test('purges unused symbols from SVG and backs up original', async () => {
            const initialSvg = `<svg xmlns="http://www.w3.org/2000/svg">
                <symbol id="sun-fill"><path d="1" /></symbol>
                <symbol id="moon"><path d="2" /></symbol>
                <symbol id="id"></symbol>
            </svg>`;

            const svgFilePath = path.join(imgDir, 'icons.svg');
            await fs.writeFile(svgFilePath, initialSvg, 'utf8');

            // Only sun-fill is used in index.html
            const indexHtml = `<!DOCTYPE html><html><body><svg><use href="/assets/image/svg/icons.svg#sun-fill" /></svg></body></html>`;
            await fs.writeFile(path.join(testDir, 'index.html'), indexHtml, 'utf8');

            await purgeUnusedSvgSymbols({
                root: testDir,
                image: path.join(testDir, 'assets/image'),
                layx: path.join(testDir, 'layx')
            });

            // 1. Verify backup was created with original content
            const backupFilePath = path.join(layxImgDir, 'icons.svg');
            assert.ok(existsSync(backupFilePath), 'Backup in layx/ should exist');
            const backupContent = await fs.readFile(backupFilePath, 'utf8');
            assert.ok(backupContent.includes('id="sun-fill"'));
            assert.ok(backupContent.includes('id="moon"'));
            assert.ok(backupContent.includes('id="id"'));

            // 2. Verify optimized SVG only contains used symbol
            const purgedContent = await fs.readFile(svgFilePath, 'utf8');
            assert.ok(purgedContent.includes('id="sun-fill"'), 'Used symbol should be preserved');
            assert.ok(!purgedContent.includes('id="moon"'), 'Unused moon symbol should be purged');
            assert.ok(!purgedContent.includes('id="id"'), 'Empty id placeholder should be purged');
        });
    });
});


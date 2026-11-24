import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { unwrapComponentCode, removeComponentScriptEntries } from '../src/engine/component-unwrapper.js';

describe('Component Unwrapper', () => {
    test('removes component imports (ESM & CJS)', () => {
        const input = `
import Component from '../layx/others/component/component.js';
import { Component } from './others/component/component.js';
import Component from './component.js';
const Component = require('../layx/others/component/component.js');
import otherModule from './other.js';

console.log('Keep this');
`;
        const output = unwrapComponentCode(input);
        assert.ok(!output.includes('layx/others/component/component.js'));
        assert.ok(!output.includes('require('));
        assert.ok(output.includes("import otherModule from './other.js';"));
        assert.ok(output.includes("console.log('Keep this');"));
    });

    test('removes new Component calls and static calls', () => {
        const input = `
const data = { app: "Test" };
new Component(data, { debug: true });
const comp = new Component();
Component.render(document);
Component.register('my-comp', '<div></div>');
window.__componentInstance = null;

initApp();
`;
        const output = unwrapComponentCode(input);
        assert.ok(!output.includes('new Component'));
        assert.ok(!output.includes('Component.render'));
        assert.ok(!output.includes('Component.register'));
        assert.ok(!output.includes('window.__componentInstance'));
        assert.ok(output.includes('const data = { app: "Test" };'));
        assert.ok(output.includes('initApp();'));
    });

    test('unwraps document.addEventListener("components-ready", ...)', () => {
        const input = `
import Component from '../component.js';

new Component();

document.addEventListener('components-ready', () => {
    initSliders();
    console.log("Ready!");
});
`;
        const output = unwrapComponentCode(input);
        assert.ok(!output.includes('addEventListener'));
        assert.ok(!output.includes('components-ready'));
        assert.ok(output.includes('initSliders();'));
        assert.ok(output.includes('console.log("Ready!");'));
    });

    test('unwraps function expression and component-ready (singular)', () => {
        const input = `
window.addEventListener('component-ready', function () {
    startEverything();
});
`;
        const output = unwrapComponentCode(input);
        assert.ok(!output.includes('addEventListener'));
        assert.ok(!output.includes('component-ready'));
        assert.ok(output.includes('startEverything();'));
    });

    test('unwraps concise arrow and identifier callbacks', () => {
        const input = `
document.addEventListener('components-ready', () => initApp());
document.addEventListener('components-ready', startApp);
`;
        const output = unwrapComponentCode(input);
        assert.ok(!output.includes('addEventListener'));
        assert.ok(output.includes('initApp();'));
        assert.ok(output.includes('startApp();'));
    });

    test('removes component-loaded and component-error listeners', () => {
        const input = `
document.addEventListener('component-loaded', (e) => {
    console.log(e.detail.name);
});
document.addEventListener('component-error', (e) => {
    console.error(e);
});
`;
        const output = unwrapComponentCode(input);
        assert.strictEqual(output.trim(), '');
    });

    test('unwraps component-ready guards with nested parentheses and conditions', () => {
        const input = `
if (window.__componentsReady || document.documentElement.hasAttribute('data-components-ready') || !document.querySelector('script[src*="component.js"]')) {
    init();
} else {
    document.addEventListener('components-ready', init, { once: true });
}
`;
        const output = unwrapComponentCode(input);
        assert.ok(!output.includes('__componentsReady'));
        assert.ok(!output.includes('data-components-ready'));
        assert.ok(!output.includes('component.js'));
        assert.ok(!output.includes('addEventListener'));
        assert.strictEqual(output.trim(), 'init();');
    });

    test('removes component.js script tags from HTML and unwraps inline scripts', () => {
        const html = `
<!DOCTYPE html>
<html>
<head>
    <script type="module" src="./layx/others/component/component.js"></script>
    <script src="/layx/others/component/component.js"></script>
</head>
<body>
    <script>
        import Component from './layx/others/component/component.js';
        new Component();
        document.addEventListener('components-ready', () => {
            console.log('Page ready');
        });
    </script>
</body>
</html>
`;
        const cleaned = removeComponentScriptEntries(html);
        assert.ok(!cleaned.includes('src="./layx/others/component/component.js"'));
        assert.ok(!cleaned.includes('src="/layx/others/component/component.js"'));
        assert.ok(!cleaned.includes('addEventListener'));
        assert.ok(cleaned.includes("console.log('Page ready');"));
    });
});

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { bakeComponentsInHtml } from '../src/engine/component-baker.js';

describe('Component Baker', () => {
    test('bakes static components', async () => {
        const html = `
<template component="simple-alert">
    <div class="alert alert-info">
        <strong>Info:</strong> Static alert.
    </div>
</template>

<component name="simple-alert"></component>
`;
        const output = await bakeComponentsInHtml(html);
        assert.ok(!output.includes('<template component="simple-alert">'));
        assert.ok(!output.includes('<component'));
        assert.ok(output.includes('<div class="alert alert-info">'));
        assert.ok(output.includes('<strong>Info:</strong> Static alert.'));
    });

    test('bakes dynamic component with positional props and merges attributes', async () => {
        const html = `
<div component="profile-card" dynamic prop="name, role" class="card" style="padding: 10px">
    <h3>\${name}</h3>
    <p>\${role}</p>
</div>

<component name="profile-card" prop="'John Doe', 'Engineer'" class="shadow" style="margin: 5px"></component>
`;
        const output = await bakeComponentsInHtml(html);
        assert.ok(!output.includes('<component'));
        assert.ok(output.includes('<h3>John Doe</h3>'));
        assert.ok(output.includes('<p>Engineer</p>'));
        // Class merged
        assert.ok(output.includes('class="card shadow"'));
        // Style merged with semicolon
        assert.ok(output.includes('style="padding: 10px; margin: 5px"'));
        // Dynamic and prop attributes stripped
        assert.ok(!output.includes('dynamic'));
        assert.ok(!output.includes('prop='));
    });

    test('bakes nested components and supports context inheritance', async () => {
        const html = `
<div component="child-view" dynamic>
    <span>Theme: \${theme}</span>
</div>

<div component="parent-view" dynamic prop="theme">
    <h2>Parent Header</h2>
    <component name="child-view"></component>
</div>

<component name="parent-view" prop="'dark'"></component>
`;
        const output = await bakeComponentsInHtml(html);
        assert.ok(!output.includes('<component'));
        assert.ok(output.includes('<h2>Parent Header</h2>'));
        assert.ok(output.includes('<span>Theme: dark</span>'));
    });

    test('detects circular component references and throws descriptive error', async () => {
        const html = `
<div component="comp-a">
    <component name="comp-b"></component>
</div>
<div component="comp-b">
    <component name="comp-a"></component>
</div>

<component name="comp-a"></component>
`;
        await assert.rejects(async () => {
            await bakeComponentsInHtml(html);
        }, /Circular component reference detected/);
    });

    test('resolves named slots and default slots with fallback support', async () => {
        const html = `
<div component="modal-dialog">
    <div class="modal-header">
        <slot name="title">Default Title</slot>
    </div>
    <div class="modal-body">
        <slot>Default Body Fallback</slot>
    </div>
</div>

<!-- Instance 1: with custom slot content -->
<component name="modal-dialog">
    <h4 slot="title">Custom Title</h4>
    <p>Custom Body Content</p>
</component>

<!-- Instance 2: with fallbacks -->
<component name="modal-dialog"></component>
`;
        const output = await bakeComponentsInHtml(html);
        assert.ok(!output.includes('<component'));
        assert.ok(!output.includes('<slot'));
        // Instance 1
        assert.ok(output.includes('<h4>Custom Title</h4>'));
        assert.ok(!output.includes('slot="title"'));
        assert.ok(output.includes('<p>Custom Body Content</p>'));
        // Instance 2 fallbacks
        assert.ok(output.includes('Default Title'));
        assert.ok(output.includes('Default Body Fallback'));
    });

    test('renders list using renderList helper', async () => {
        const html = `
<ul component="item-list" dynamic prop="items">
    \${ renderList(items, item => \`<li>\${item}</li>\`) }
</ul>

<component name="item-list" prop="['Apple', 'Banana', 'Orange']"></component>
`;
        const output = await bakeComponentsInHtml(html);
        assert.ok(!output.includes('<component'));
        assert.ok(output.includes('<li>Apple</li><li>Banana</li><li>Orange</li>'));
    });

    test('evaluates $content in dynamic wrapper', async () => {
        const html = `
<div component="card-wrapper" dynamic prop="show">
    \${ when(show, raw($content), '<p>Hidden</p>') }
</div>

<component name="card-wrapper" prop="true">
    <span>Visible inside wrapper</span>
</component>
`;
        const output = await bakeComponentsInHtml(html);
        assert.ok(output.includes('<span>Visible inside wrapper</span>'));
        assert.ok(!output.includes('Hidden'));
    });

    test('loads external component library referenced by src', async () => {
        const componentsFilePath = path.resolve('layx/others/component/examples/components.html');
        const html = `
<component src="${componentsFilePath.replace(/\\/g, '/')}" name="simple-alert"></component>
`;
        const output = await bakeComponentsInHtml(html, '', {}, process.cwd());
        assert.ok(!output.includes('<component'));
        assert.ok(output.includes('This is a static alert component.'));
    });

    test('bakes standalone component file referenced by src without explicit name', async () => {
        const buttonPath = path.resolve('layx/components/button/button.html');
        const html = `
<component src="${buttonPath.replace(/\\/g, '/')}"></component>
`;
        const output = await bakeComponentsInHtml(html, '', {}, process.cwd());
        assert.ok(!output.includes('<component'));
        assert.ok(output.includes('<button'));
    });

    test('strips component.js script tags from baked HTML', async () => {
        const html = `
<template component="box"><div>Box</div></template>
<script type="module" src="./layx/others/component/component.js"></script>
<component name="box"></component>
`;
        const output = await bakeComponentsInHtml(html);
        assert.ok(!output.includes('component.js'));
        assert.ok(!output.includes('<script'));
        assert.ok(output.includes('<div>Box</div>'));
    });

    test('evaluates dynamic expressions on component root element attributes', async () => {
        const html = `
<button component="action-btn" dynamic prop="name, active, value" class="btn"
    data-name="\${name}" data-active="\${active ? 'true' : 'false'}" data-value="\${value || ''}">
    <span>\${name}</span>
</button>

<component name="action-btn" prop="'Submit', true, 'send'"></component>
<component name="action-btn" prop="'Cancel', false, ''"></component>
`;
        const output = await bakeComponentsInHtml(html);
        assert.ok(!output.includes('${'));
        assert.ok(output.includes('data-name="Submit"'));
        assert.ok(output.includes('data-active="true"'));
        assert.ok(output.includes('data-value="send"'));
        assert.ok(output.includes('data-name="Cancel"'));
        assert.ok(output.includes('data-active="false"'));
        assert.ok(output.includes('data-value=""'));
    });

    test('unwraps template tags in standalone component files', async () => {
        const html = `
<template component="wrapped-card" dynamic prop="title">
    <div class="card">
        <h4>\${title}</h4>
    </div>
</template>

<component name="wrapped-card" prop="'Hello'"></component>
`;
        const output = await bakeComponentsInHtml(html);
        assert.ok(!output.includes('<template'));
        assert.ok(!output.includes('</template>'));
        assert.ok(output.includes('<div class="card">'));
        assert.ok(output.includes('<h4>Hello</h4>'));
    });
});

import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { Component } from '../layx/others/component/component.js';

describe('Component Engine', () => {
  beforeEach(() => {
    Component._instance = null;
  });

  afterEach(() => {
    if (Component._instance) Component._instance.destroy();
    Component._instance = null;
  });

  test('exports Component class with helpers and singleton methods', () => {
    assert.strictEqual(typeof Component, 'function');
    assert.strictEqual(typeof Component.render, 'function');
    assert.strictEqual(typeof Component.register, 'function');
    assert.strictEqual(typeof Component.getInstance, 'function');

    const cm = new Component();
    assert.strictEqual(Component.getInstance(), cm);
    assert.strictEqual(typeof cm._helpers.renderList, 'function');
    assert.strictEqual(typeof cm._helpers.when, 'function');
    assert.strictEqual(typeof cm._helpers.esc, 'function');
    assert.strictEqual(typeof cm._helpers.cls, 'function');
    assert.strictEqual(typeof cm._helpers.raw, 'function');
  });

  describe('Built-in Template Helpers', () => {
    let cm;
    beforeEach(() => {
      cm = new Component();
    });

    test('renderList maps array and joins cleanly', () => {
      const items = ['apple', 'banana', 'cherry'];
      const html = cm._helpers.renderList(items, item => `<li>${item}</li>`);
      assert.strictEqual(html, '<li>apple</li><li>banana</li><li>cherry</li>');
      assert.strictEqual(cm._helpers.renderList(null, x => x), '');
    });

    test('when handles conditional rendering with fallback', () => {
      assert.strictEqual(cm._helpers.when(true, 'Yes', 'No'), 'Yes');
      assert.strictEqual(cm._helpers.when(false, 'Yes', 'No'), 'No');
      assert.strictEqual(cm._helpers.when(false, 'Yes'), '');
    });

    test('esc escapes dangerous HTML characters', () => {
      const raw = `<script>alert("xss" & 'test')</script>`;
      const safe = cm._helpers.esc(raw);
      assert.strictEqual(safe, '&lt;script&gt;alert(&quot;xss&quot; &amp; &#39;test&#39;)&lt;/script&gt;');
    });

    test('cls formats conditional classes cleanly', () => {
      const active = true;
      const disabled = false;
      const result = cm._helpers.cls('btn', active && 'active', disabled && 'disabled', {
        'btn--primary': true,
        'btn--large': false,
      });
      assert.strictEqual(result, 'btn active btn--primary');
    });
  });

  describe('SSR Safety', () => {
    let originalWindow;
    let originalDocument;

    beforeEach(() => {
      originalWindow = globalThis.window;
      originalDocument = globalThis.document;
      delete globalThis.window;
      delete globalThis.document;
      Component._instance = null;
    });

    afterEach(() => {
      globalThis.window = originalWindow;
      globalThis.document = originalDocument;
      Component._instance = null;
    });

    test('constructs safely on the server without throwing when window/document are undefined', () => {
      assert.doesNotThrow(() => {
        const cm = new Component();
        cm.destroy();
      });
    });
  });

  describe('Template Compilation and Deterministic Rendering', () => {
    let cm;
    beforeEach(() => {
      cm = new Component();
    });

    test('_render deterministically binds parameters regardless of context key order', () => {
      const rawTemplate = 'User: ${name}, Role: ${role}';

      // Context 1: name first, role second
      const ctx1 = { name: 'Alice', role: 'Admin' };
      const out1 = cm._render(rawTemplate, ctx1);
      assert.strictEqual(out1, 'User: Alice, Role: Admin');

      // Context 2: role first, name second (previously triggered parameter swap bug)
      const ctx2 = { role: 'Editor', name: 'Bob' };
      const out2 = cm._render(rawTemplate, ctx2);
      assert.strictEqual(out2, 'User: Bob, Role: Editor');
    });

    test('_preprocess unescapes HTML entities inside interpolations', () => {
      const raw = '<div>${ a &lt; 5 &amp;&amp; b &gt; 10 ? &quot;valid&quot; : &#39;fallback&#39; }</div>';
      const processed = cm._preprocess(raw);
      assert.strictEqual(processed, '<div>${ a < 5 && b > 10 ? "valid" : \'fallback\' }</div>');
    });

    test('_preprocess properly escapes backslashes in template literals', () => {
      const raw = '<div>Path: C:\\Program Files\\App</div>';
      const processed = cm._preprocess(raw);
      assert.ok(processed.includes('C:\\\\Program Files\\\\App'));
    });
  });

  describe('Attribute and Style Merging (_copyAttrs)', () => {
    let cm;
    beforeEach(() => {
      cm = new Component();
    });

    test('merges classes without erasing template classes or creating duplicates', () => {
      const attrs = {
        class: 'p-4 shadow mt-2',
      };
      const src = {
        attributes: [{ name: 'class', value: 'p-4 shadow mt-2' }],
      };
      const dstAttrs = { class: 'card p-4 rounded' };
      const dst = {
        getAttribute: (k) => dstAttrs[k],
        setAttribute: (k, v) => { dstAttrs[k] = v; },
      };

      cm._copyAttrs(src, dst);
      // 'p-4' was in both, should be merged without duplicate
      assert.strictEqual(dstAttrs.class, 'card p-4 rounded shadow mt-2');
    });

    test('merges inline styles cleanly with semicolon separator', () => {
      const src = {
        attributes: [{ name: 'style', value: 'color: red' }],
      };
      const dstAttrs = { style: 'background: white;' };
      const dst = {
        getAttribute: (k) => dstAttrs[k],
        setAttribute: (k, v) => { dstAttrs[k] = v; },
      };

      cm._copyAttrs(src, dst);
      assert.strictEqual(dstAttrs.style, 'background: white; color: red');
    });
  });

  describe('Context Building & Prop Parsing (_buildCtx)', () => {
    let cm;
    beforeEach(() => {
      cm = new Component({ globalApp: 'LayX' });
    });

    test('extracts positional props', () => {
      const tpl = {
        getAttribute: (k) => (k === 'prop' ? 'title, role' : null),
      };
      const ph = {
        innerHTML: 'Content here',
        getAttribute: (k) => (k === 'prop' ? "'My Title', 'Lead Developer'" : null),
      };

      const ctx = cm._buildCtx(tpl, ph, cm._ctx);
      assert.strictEqual(ctx.title, 'My Title');
      assert.strictEqual(ctx.role, 'Lead Developer');
      assert.strictEqual(ctx.$content, 'Content here');
      assert.strictEqual(ctx.globalApp, 'LayX');
    });

    test('extracts object props without spreading array indices', () => {
      const tpl = {
        getAttribute: () => null,
      };
      const phObj = {
        innerHTML: '',
        getAttribute: (k) => (k === 'prop' ? "{ count: 42, active: true }" : null),
      };
      const ctxObj = cm._buildCtx(tpl, phObj, cm._ctx);
      assert.strictEqual(ctxObj.count, 42);
      assert.strictEqual(ctxObj.active, true);

      // Arrays must NOT spread numeric indices into context
      const phArr = {
        innerHTML: '',
        getAttribute: (k) => (k === 'prop' ? "['a', 'b', 'c']" : null),
      };
      const ctxArr = cm._buildCtx(tpl, phArr, cm._ctx);
      assert.strictEqual(ctxArr['0'], undefined);
    });
  });
});


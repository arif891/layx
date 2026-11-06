import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  SyntaxHighlighter,
  tokenize,
  tokenizeSync,
  detectLanguage,
  normalizeLang,
} from '../layx/others/syntax_highlighter/syntax_highlighter.js';

describe('Syntax Highlighter Engine & Core Modules', () => {
  test('exports SyntaxHighlighter and helper functions', () => {
    assert.strictEqual(typeof SyntaxHighlighter, 'function');
    assert.strictEqual(typeof tokenize, 'function');
    assert.strictEqual(typeof tokenizeSync, 'function');
    assert.strictEqual(typeof detectLanguage, 'function');
    assert.strictEqual(typeof normalizeLang, 'function');
    assert.strictEqual(typeof SyntaxHighlighter.highlight, 'function');
    assert.strictEqual(typeof SyntaxHighlighter.highlightElement, 'function');
  });

  describe('Language Normalization & Detection (core/detect.js)', () => {
    test('normalizes language aliases', () => {
      assert.strictEqual(normalizeLang('javascript'), 'js');
      assert.strictEqual(normalizeLang('JSX'), 'js');
      assert.strictEqual(normalizeLang('typescript'), 'ts');
      assert.strictEqual(normalizeLang('python'), 'py');
      assert.strictEqual(normalizeLang('c++'), 'cpp');
      assert.strictEqual(normalizeLang('c#'), 'csharp');
      assert.strictEqual(normalizeLang('shell'), 'bash');
      assert.strictEqual(normalizeLang('markdown'), 'md');
      assert.strictEqual(normalizeLang('unknown-lang'), 'unknown-lang');
    });

    test('auto-detects code language using heuristic scoring', () => {
      const pythonCode = 'def calculate_total(price, tax):\n    return price * (1 + tax)';
      assert.strictEqual(detectLanguage(pythonCode), 'py');

      const sqlCode = 'SELECT id, username, email FROM users WHERE active = 1 ORDER BY id DESC;';
      assert.strictEqual(detectLanguage(sqlCode), 'sql');

      const htmlCode = '<!DOCTYPE html>\n<html lang="en">\n<head><title>Test</title></head>\n<body></body></html>';
      assert.strictEqual(detectLanguage(htmlCode), 'html');

      const bashCode = '#!/bin/bash\necho "Deploying application..."\nif [ $? -eq 0 ]; then\n  echo "Success"\nfi';
      assert.strictEqual(detectLanguage(bashCode), 'bash');
    });
  });

  describe('Core Tokenizer (core/tokenize.js)', () => {
    const sampleGrammar = [
      { match: /\b(function|return|const|let)\b/g, type: 'kwd' },
      { expand: 'str' },
      { expand: 'num' },
    ];

    test('tokenizes synchronous code with tokenizeSync', () => {
      const src = 'const count = 42; return "success";';
      const tokens = [];

      tokenizeSync(src, sampleGrammar, (text, type) => {
        if (text) tokens.push({ text, type });
      });

      assert.deepStrictEqual(tokens, [
        { text: 'const', type: 'kwd' },
        { text: ' count = ', type: undefined },
        { text: '42', type: 'num' },
        { text: '; ', type: undefined },
        { text: 'return', type: 'kwd' },
        { text: ' ', type: undefined },
        { text: '"success"', type: 'str' },
        { text: ';', type: undefined },
      ]);
    });

    test('handles fallback safely on unmatched grammar without skipping source', () => {
      const src = 'hello world';
      const tokens = [];

      tokenizeSync(src, null, (text, type) => {
        if (text) tokens.push({ text, type });
      });

      assert.deepStrictEqual(tokens, [
        { text: 'hello world', type: undefined },
      ]);
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
      SyntaxHighlighter._instance = null;
    });

    afterEach(() => {
      globalThis.window = originalWindow;
      globalThis.document = originalDocument;
      SyntaxHighlighter._instance = null;
    });

    test('constructs safely on the server without throwing when window/document are undefined', () => {
      assert.doesNotThrow(() => {
        const sh = new SyntaxHighlighter();
        assert.ok(sh);
      });
    });

    test('SyntaxHighlighter.highlight() works safely on the server', async () => {
      const sampleGrammar = [
        { match: /\bconst\b/g, type: 'kwd' },
        { expand: 'num' },
      ];

      const sh = new SyntaxHighlighter();
      sh.loadLanguage('mini-js', sampleGrammar);

      const html = await sh.highlight('const x = 100;', 'mini-js', { multiline: false });
      assert.ok(html.includes('<span class="kwd">const</span>'));
      assert.ok(html.includes('<span class="num">100</span>'));
    });
  });

  describe('In simulated browser environment', () => {
    let originalWindow;
    let originalDocument;
    let originalNavigatorDesc;
    let copiedText;

    beforeEach(() => {
      originalWindow = globalThis.window;
      originalDocument = globalThis.document;
      originalNavigatorDesc = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
      copiedText = null;
      SyntaxHighlighter._instance = null;

      globalThis.window = {
        addEventListener: () => {},
      };

      Object.defineProperty(globalThis, 'navigator', {
        value: {
          clipboard: {
            writeText: async (t) => { copiedText = t; },
          },
        },
        configurable: true,
        writable: true,
      });

      globalThis.document = {
        readyState: 'complete',
        querySelectorAll: () => [],
      };
    });

    afterEach(() => {
      globalThis.window = originalWindow;
      globalThis.document = originalDocument;
      if (originalNavigatorDesc) {
        Object.defineProperty(globalThis, 'navigator', originalNavigatorDesc);
      } else {
        delete globalThis.navigator;
      }
      SyntaxHighlighter._instance = null;
    });

    test('highlights DOM element, generates structure, and attaches copy listener', async () => {
      const sampleGrammar = [
        { match: /\bdef\b/g, type: 'kwd' },
        { expand: 'str' },
      ];

      const sh = new SyntaxHighlighter();
      sh.loadLanguage('py', sampleGrammar);

      const classListSet = new Set();
      const mockElement = {
        textContent: 'def hello():\n    return "world"',
        dataset: { codeLang: 'py' },
        classList: {
          add: (...cls) => cls.forEach(c => classListSet.add(c)),
          contains: (c) => classListSet.has(c),
          remove: (c) => classListSet.delete(c),
        },
        getAttribute: (k) => mockElement[k],
        querySelector: (sel) => {
          if (sel === '.copy') return copyBtn;
          if (sel === '.code') return codeEl;
          return null;
        },
        innerHTML: '',
      };

      const copyBtn = {
        setAttribute: (k, v) => { copyBtn[k] = v; },
        classList: {
          add: () => {},
          remove: () => {},
        },
        addEventListener: (evt, fn) => { copyBtn._listener = fn; },
      };

      const codeEl = {
        textContent: 'def hello():\n    return "world"',
      };

      await sh.highlightElement(mockElement);

      assert.ok(classListSet.has('code-block'));
      assert.ok(classListSet.has('highlighted'));
      assert.ok(classListSet.has('multiline'));
      assert.ok(mockElement.innerHTML.includes('<span class="kwd">def</span>'));
      assert.ok(mockElement.innerHTML.includes('<span class="str">"world"</span>'));
      assert.ok(mockElement.innerHTML.includes('class="numbers"'));

      // Test copy button trigger
      assert.ok(typeof copyBtn._listener === 'function');
      await copyBtn._listener({ preventDefault: () => {} });
      assert.strictEqual(copiedText, 'def hello():\n    return "world"');
    });
  });
});

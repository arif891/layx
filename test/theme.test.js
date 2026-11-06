import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { Theme } from '../layx/others/theme/theme.js';

describe('Theme Engine', () => {
  test('exports Theme class with constants and anti-FOUC headScript', () => {
    assert.strictEqual(typeof Theme, 'function');
    assert.strictEqual(Theme.STORAGE_KEY, 'theme');
    assert.deepStrictEqual(Array.from(Theme.THEMES), ['light', 'dark', 'auto']);
    assert.strictEqual(typeof Theme.headScript, 'string');
    assert.ok(Theme.headScript.includes('localStorage.getItem'));
    assert.ok(Theme.headScript.includes('prefers-color-scheme'));
  });

  describe('SSR Safety', () => {
    let originalWindow;
    let originalDocument;

    beforeEach(() => {
      originalWindow = globalThis.window;
      originalDocument = globalThis.document;
      delete globalThis.window;
      delete globalThis.document;
      Theme._i = null;
    });

    afterEach(() => {
      globalThis.window = originalWindow;
      globalThis.document = originalDocument;
      Theme._i = null;
    });

    test('constructs safely on the server without throwing when window/document are undefined', () => {
      assert.doesNotThrow(() => {
        const theme = new Theme();
        assert.strictEqual(Theme.get(), 'auto');
        assert.strictEqual(Theme.system, 'light');
        assert.strictEqual(Theme.resolved, 'light');
        theme.destroy();
      });
    });
  });

  describe('In simulated browser environment', () => {
    let originalWindow;
    let originalDocument;
    let originalCustomEvent;
    let mockStorage;
    let rootAttributes;
    let listeners;
    let metaElement;
    let setButtonLight;
    let setButtonDark;
    let toggleButton;
    let updateSpan;

    beforeEach(() => {
      originalWindow = globalThis.window;
      originalDocument = globalThis.document;
      originalCustomEvent = globalThis.CustomEvent;

      Theme._i = null;
      mockStorage = {};
      rootAttributes = {};
      listeners = { window: {}, document: {}, media: {} };

      globalThis.CustomEvent = class CustomEvent {
        constructor(type, options) {
          this.type = type;
          this.detail = options?.detail;
        }
      };

      metaElement = {
        name: 'theme-color',
        content: '',
        dataset: {},
        setAttribute(k, v) { this[k] = v; },
      };

      setButtonLight = {
        dataset: { themeSet: 'light' },
        classList: {
          toggle: (cls, on) => { setButtonLight._active = on; },
        },
        setAttribute: (k, v) => { setButtonLight[k] = v; },
        hasAttribute: () => false,
      };

      setButtonDark = {
        dataset: { themeSet: 'dark' },
        classList: {
          toggle: (cls, on) => { setButtonDark._active = on; },
        },
        setAttribute: (k, v) => { setButtonDark[k] = v; },
        hasAttribute: () => false,
      };

      toggleButton = {
        dataset: { themeToggle: '' },
        setAttribute: (k, v) => { toggleButton[k] = v; },
      };

      updateSpan = {
        dataset: { themeUpdate: '' },
        textContent: '',
        setAttribute: (k, v) => { updateSpan[k] = v; },
        hasAttribute: (k) => k === 'data-theme-text',
      };

      globalThis.window = {
        matchMedia: (query) => ({
          matches: query.includes('dark') ? false : false,
          addEventListener: (evt, fn) => { listeners.media[evt] = fn; },
          removeEventListener: (evt) => { delete listeners.media[evt]; },
        }),
        addEventListener: (evt, fn) => { listeners.window[evt] = fn; },
        removeEventListener: (evt) => { delete listeners.window[evt]; },
      };

      globalThis.localStorage = {
        getItem: (k) => mockStorage[k] ?? null,
        setItem: (k, v) => { mockStorage[k] = String(v); },
        removeItem: (k) => { delete mockStorage[k]; },
      };

      globalThis.document = {
        documentElement: {
          setAttribute: (k, v) => { rootAttributes[k] = v; },
          getAttribute: (k) => rootAttributes[k],
          dispatchEvent: () => true,
        },
        head: {
          appendChild: (el) => el,
        },
        body: {
          style: {},
        },
        createElement: (tag) => {
          if (tag === 'meta') return metaElement;
          return {};
        },
        querySelector: (sel) => {
          if (sel === 'meta[name="theme-color"]') return metaElement;
          return null;
        },
        querySelectorAll: (sel) => {
          if (sel === '[data-theme-update]') return [updateSpan];
          if (sel === '[data-theme-set]') return [setButtonLight, setButtonDark];
          if (sel === '[data-theme-toggle]') return [toggleButton];
          return [];
        },
        addEventListener: (evt, fn) => { listeners.document[evt] = fn; },
        removeEventListener: (evt) => { delete listeners.document[evt]; },
      };

      globalThis.getComputedStyle = () => ({
        backgroundColor: '#ffffff',
        transitionProperty: 'none',
        transitionDuration: '0s',
      });
    });

    afterEach(() => {
      if (Theme._i) Theme._i.destroy();
      globalThis.window = originalWindow;
      globalThis.document = originalDocument;
      globalThis.CustomEvent = originalCustomEvent;
      Theme._i = null;
    });

    test('initializes with default auto theme and resolves to system', () => {
      const theme = new Theme();
      assert.strictEqual(Theme.get(), 'auto');
      assert.strictEqual(Theme.system, 'light');
      assert.strictEqual(Theme.resolved, 'light');
      assert.strictEqual(rootAttributes['theme'], 'light');
      assert.strictEqual(updateSpan['data-theme-update'], 'auto');
      assert.strictEqual(updateSpan.textContent, 'Auto');
      theme.destroy();
    });

    test('initializes with stored theme from localStorage', () => {
      mockStorage['theme'] = 'dark';
      const theme = new Theme();
      assert.strictEqual(Theme.get(), 'dark');
      assert.strictEqual(Theme.resolved, 'dark');
      assert.strictEqual(rootAttributes['theme'], 'dark');
      assert.strictEqual(setButtonDark['aria-pressed'], 'true');
      assert.strictEqual(setButtonLight['aria-pressed'], 'false');
      theme.destroy();
    });

    test('Theme.set() updates theme, persists to storage, and notifies UI', () => {
      const theme = new Theme();
      Theme.set('dark');
      assert.strictEqual(Theme.get(), 'dark');
      assert.strictEqual(Theme.resolved, 'dark');
      assert.strictEqual(mockStorage['theme'], 'dark');
      assert.strictEqual(rootAttributes['theme'], 'dark');
      assert.strictEqual(setButtonDark._active, true);
      assert.strictEqual(setButtonDark['aria-pressed'], 'true');
      assert.strictEqual(setButtonLight._active, false);
      assert.strictEqual(setButtonLight['aria-pressed'], 'false');
      assert.strictEqual(toggleButton['data-theme-current'], 'dark');
      assert.strictEqual(toggleButton['aria-label'], 'Switch to light theme');

      Theme.set('light');
      assert.strictEqual(Theme.get(), 'light');
      assert.strictEqual(Theme.resolved, 'light');
      assert.strictEqual(mockStorage['theme'], 'light');
      assert.strictEqual(rootAttributes['theme'], 'light');
      assert.strictEqual(setButtonLight._active, true);
      assert.strictEqual(setButtonLight['aria-pressed'], 'true');

      // Invalid value ignored
      Theme.set('neon-glow');
      assert.strictEqual(Theme.get(), 'light');

      theme.destroy();
    });

    test('Theme.toggle() switches between light and dark', () => {
      const theme = new Theme();
      Theme.set('light');
      Theme.toggle();
      assert.strictEqual(Theme.get(), 'dark');
      assert.strictEqual(Theme.resolved, 'dark');

      Theme.toggle();
      assert.strictEqual(Theme.get(), 'light');
      assert.strictEqual(Theme.resolved, 'light');

      theme.destroy();
    });

    test('storage event syncs theme without writing back to localStorage', () => {
      const theme = new Theme();
      let writeCount = 0;
      const originalSetItem = globalThis.localStorage.setItem;
      globalThis.localStorage.setItem = (k, v) => {
        writeCount++;
        originalSetItem(k, v);
      };

      // Simulate storage event from another tab
      listeners.window.storage({
        key: 'theme',
        newValue: 'dark',
      });

      assert.strictEqual(Theme.get(), 'dark');
      assert.strictEqual(rootAttributes['theme'], 'dark');
      // Storage write count must remain 0 (no recursive write-back loop)
      assert.strictEqual(writeCount, 0);

      theme.destroy();
    });
  });
});


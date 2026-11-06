import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { Sheet } from '../layx/components/sheet/sheet.js';

describe('Sheet Component Engine', () => {
  beforeEach(() => {
    Sheet._instance = null;
  });

  afterEach(() => {
    if (Sheet._instance) Sheet._instance.destroy();
    Sheet._instance = null;
  });

  test('exports Sheet class with constants, positions, and static helpers', () => {
    assert.strictEqual(typeof Sheet, 'function');
    assert.strictEqual(typeof Sheet.open, 'function');
    assert.strictEqual(typeof Sheet.close, 'function');
    assert.strictEqual(typeof Sheet.toggle, 'function');
    assert.strictEqual(typeof Sheet.getInstance, 'function');

    assert.strictEqual(Sheet.POSITION.TOP, 'top');
    assert.strictEqual(Sheet.POSITION.BOTTOM, 'bottom');
    assert.strictEqual(Sheet.POSITION.LEFT, 'left');
    assert.strictEqual(Sheet.POSITION.RIGHT, 'right');

    assert.strictEqual(Sheet.ATTR.TRIGGER, 'data-target-sheet');
    assert.strictEqual(Sheet.ATTR.OPEN, 'open');
    assert.strictEqual(Sheet.ATTR.MODAL, 'modal');
    assert.strictEqual(Sheet.ATTR.CLOSE, 'close');
  });

  describe('SSR Safety', () => {
    let originalWindow;
    let originalDocument;

    beforeEach(() => {
      originalWindow = globalThis.window;
      originalDocument = globalThis.document;
      delete globalThis.window;
      delete globalThis.document;
      Sheet._instance = null;
    });

    afterEach(() => {
      globalThis.window = originalWindow;
      globalThis.document = originalDocument;
      Sheet._instance = null;
    });

    test('constructs safely on server without throwing when window/document are undefined', () => {
      assert.doesNotThrow(() => {
        const sheet = new Sheet();
        assert.strictEqual(Sheet.getInstance(), sheet);
        sheet.open(null);
        sheet.close(null);
        sheet.destroy();
      });
    });
  });

  describe('In simulated browser environment', () => {
    let originalWindow;
    let originalDocument;
    let originalCustomEvent;
    let docListeners;
    let winListeners;
    let mockSheet;
    let mockWrapper;
    let mockTrigger;
    let dispatchedEvents;

    beforeEach(() => {
      originalWindow = globalThis.window;
      originalDocument = globalThis.document;
      originalCustomEvent = globalThis.CustomEvent;

      Sheet._instance = null;
      docListeners = {};
      winListeners = {};
      dispatchedEvents = [];

      globalThis.CustomEvent = class CustomEvent {
        constructor(type, options) {
          this.type = type;
          this.detail = options?.detail;
        }
      };

      const sheetAttrs = { id: 'test-sheet' };
      mockWrapper = {
        offsetWidth: 400,
        offsetHeight: 300,
        scrollIntoView: () => { mockWrapper._scrolledIntoView = true; },
      };

      mockSheet = {
        id: 'test-sheet',
        attributes: sheetAttrs,
        hasAttribute: (k) => k in sheetAttrs,
        getAttribute: (k) => sheetAttrs[k] ?? null,
        setAttribute: (k, v) => { sheetAttrs[k] = String(v); },
        removeAttribute: (k) => { delete sheetAttrs[k]; },
        style: {
          setProperty: (k, v) => { mockSheet.style[k] = v; },
        },
        querySelector: (sel) => {
          if (sel === '.wrapper') return mockWrapper;
          return null;
        },
        querySelectorAll: () => [],
        scrollTo: (opts) => { mockSheet._lastScrollTo = opts; },
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: (evt) => { dispatchedEvents.push(evt.type); },
      };

      const trigAttrs = { 'data-target-sheet': 'test-sheet' };
      mockTrigger = {
        hasAttribute: (k) => k in trigAttrs,
        getAttribute: (k) => trigAttrs[k],
        setAttribute: (k, v) => { trigAttrs[k] = String(v); },
        focus: () => { mockTrigger._focused = true; },
      };

      globalThis.document = {
        documentElement: {
          style: { overflow: '' },
        },
        getElementById: (id) => (id === 'test-sheet' ? mockSheet : null),
        querySelector: (sel) => {
          if (sel === '#test-sheet' || sel === 'sheet' || sel === '.sheet') return mockSheet;
          return null;
        },
        querySelectorAll: (sel) => {
          if (sel.includes('data-target-sheet')) return [mockTrigger];
          if (sel.includes('sheet') || sel.includes('.sheet')) return [mockSheet];
          return [];
        },
        addEventListener: (evt, fn) => { docListeners[evt] = fn; },
        removeEventListener: (evt) => { delete docListeners[evt]; },
      };

      globalThis.window = {
        addEventListener: (evt, fn) => { winListeners[evt] = fn; },
        removeEventListener: (evt) => { delete winListeners[evt]; },
      };
    });

    afterEach(() => {
      if (Sheet._instance) Sheet._instance.destroy();
      globalThis.window = originalWindow;
      globalThis.document = originalDocument;
      globalThis.CustomEvent = originalCustomEvent;
      Sheet._instance = null;
    });

    test('initializes and configures accessibility attributes', () => {
      const sheetInstance = new Sheet();
      assert.strictEqual(mockSheet.getAttribute('role'), 'dialog');
      assert.strictEqual(mockSheet.getAttribute('aria-hidden'), 'true');
      assert.strictEqual(mockTrigger.getAttribute('aria-expanded'), 'false');
      assert.strictEqual(mockTrigger.getAttribute('aria-controls'), 'test-sheet');
      sheetInstance.destroy();
    });

    test('open() measures wrapper, scrolls target, sets open attribute, and emits events', () => {
      const sheetInstance = new Sheet();
      sheetInstance.open(mockSheet);

      assert.strictEqual(mockSheet.style['--_w'], '400px');
      assert.strictEqual(mockSheet.style['--_h'], '300px');
      assert.strictEqual(mockSheet.getAttribute('active'), '');
      assert.strictEqual(mockSheet.hasAttribute('open'), true);
      assert.strictEqual(mockSheet.getAttribute('aria-hidden'), 'false');
      assert.strictEqual(mockTrigger.getAttribute('aria-expanded'), 'true');
      assert.strictEqual(mockWrapper._scrolledIntoView, true);

      assert.ok(dispatchedEvents.includes('sheet:open'));
      assert.ok(dispatchedEvents.includes('sheet:opened'));

      sheetInstance.destroy();
    });

    test('close() resets position, removes open attribute, emits events, and restores focus', () => {
      const sheetInstance = new Sheet();
      mockSheet._lastTrigger = mockTrigger;

      sheetInstance.open(mockSheet);
      sheetInstance.close(mockSheet);

      assert.strictEqual(mockSheet.hasAttribute('open'), false);
      assert.strictEqual(mockSheet.getAttribute('aria-hidden'), 'true');
      assert.strictEqual(mockTrigger.getAttribute('aria-expanded'), 'false');
      assert.strictEqual(mockTrigger._focused, true);

      assert.ok(dispatchedEvents.includes('sheet:close'));
      assert.ok(dispatchedEvents.includes('sheet:closed'));

      sheetInstance.destroy();
    });

    test('toggle() toggles between open and closed states', () => {
      const sheetInstance = new Sheet();
      assert.strictEqual(sheetInstance.isOpen(mockSheet), false);

      sheetInstance.toggle(mockSheet);
      assert.strictEqual(sheetInstance.isOpen(mockSheet), true);

      sheetInstance.toggle(mockSheet);
      assert.strictEqual(sheetInstance.isOpen(mockSheet), false);

      sheetInstance.destroy();
    });

    test('modal sheet locks document overflow when open and unlocks when closed', () => {
      mockSheet.setAttribute('modal', '');
      const sheetInstance = new Sheet();

      sheetInstance.open(mockSheet);
      assert.strictEqual(globalThis.document.documentElement.style.overflow, 'hidden');

      sheetInstance.close(mockSheet);
      assert.strictEqual(globalThis.document.documentElement.style.overflow, '');

      sheetInstance.destroy();
    });

    test('delegated click on trigger button opens target sheet', () => {
      const sheetInstance = new Sheet();
      assert.strictEqual(sheetInstance.isOpen(mockSheet), false);

      // Simulate click event on trigger
      docListeners.click({
        target: {
          closest: (sel) => (sel.includes('data-target-sheet') ? mockTrigger : null),
        },
      });

      assert.strictEqual(sheetInstance.isOpen(mockSheet), true);
      sheetInstance.destroy();
    });

    test('Escape key closes open sheets', () => {
      const sheetInstance = new Sheet();
      sheetInstance.open(mockSheet);
      assert.strictEqual(sheetInstance.isOpen(mockSheet), true);

      winListeners.keydown({ key: 'Escape' });
      assert.strictEqual(sheetInstance.isOpen(mockSheet), false);

      sheetInstance.destroy();
    });
  });
});

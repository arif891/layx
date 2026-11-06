import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { DragScroll } from '../layx/others/drag_scroll/drag_scroll.js';

describe('DragScroll Engine', () => {
  test('exports DragScroll class with constants and complete easing suite', () => {
    assert.strictEqual(typeof DragScroll, 'function');
    assert.strictEqual(DragScroll.MOVE_THRESHOLD_PX, 3);
    assert.ok(DragScroll.EASINGS);
    assert.ok(DragScroll.EASINGS.expo);
    assert.ok(DragScroll.EASINGS.cubic);
    assert.ok(DragScroll.EASINGS.sine);

    for (const [name, ease] of Object.entries(DragScroll.EASINGS)) {
      assert.strictEqual(typeof ease.fn, 'function', `${name}.fn must be a function`);
      assert.strictEqual(ease.fn(0), 0, `${name}(0) must be 0`);
      assert.strictEqual(ease.fn(1), 1, `${name}(1) must be 1`);
    }
  });

  describe('SSR Safety', () => {
    let originalWindow;
    let originalDocument;

    beforeEach(() => {
      originalWindow = globalThis.window;
      originalDocument = globalThis.document;
      delete globalThis.window;
      delete globalThis.document;
    });

    afterEach(() => {
      globalThis.window = originalWindow;
      globalThis.document = originalDocument;
    });

    test('constructs safely on the server without throwing when document is undefined', () => {
      assert.doesNotThrow(() => {
        const scroller = new DragScroll();
        scroller.destroy();
      });
    });
  });

  describe('In simulated browser environment', () => {
    let originalWindow;
    let originalDocument;

    beforeEach(() => {
      originalWindow = globalThis.window;
      originalDocument = globalThis.document;

      globalThis.window = {
        addEventListener: () => {},
        removeEventListener: () => {},
      };

      globalThis.document = {
        querySelectorAll: () => [],
      };
    });

    afterEach(() => {
      globalThis.window = originalWindow;
      globalThis.document = originalDocument;
    });

    test('_parseConfig reads dataset attributes with elastic default false', () => {
      const mockEl = {
        dataset: {
          dragScroll: 'x',
          dragScrollMultiplier: '1.5',
          dragScrollEasing: 'cubic',
        },
        getAttribute: (attr) => {
          if (attr === 'data-drag-scroll-momentum') return '0.8';
          if (attr === 'data-drag-scroll-elastic') return null; // Default
          return null;
        },
      };

      const config = DragScroll._parseConfig(mockEl);
      assert.strictEqual(config.direction, 'x');
      assert.strictEqual(config.multiplier, 1.5);
      assert.strictEqual(config.momentum, true);
      assert.strictEqual(config.strength, 0.8);
      assert.strictEqual(config.elastic, false); // default false
      assert.strictEqual(config.easing, DragScroll.EASINGS.cubic);
      assert.strictEqual(config.cursor, 'grab');
      assert.strictEqual(config.cursorActive, 'grabbing');
    });

    test('_parseConfig honors data-drag-scroll-elastic="true"', () => {
      const mockEl = {
        dataset: { dragScroll: 'both', dragScrollItem: '.my-item' },
        getAttribute: (attr) => (attr === 'data-drag-scroll-elastic' ? 'true' : null),
      };

      const config = DragScroll._parseConfig(mockEl);
      assert.strictEqual(config.direction, 'both');
      assert.strictEqual(config.elastic, true);
      assert.strictEqual(config.itemSelector, '.my-item');
    });

    test('elastic overscroll applies transform to child items, not the container', () => {
      let mouseMoveHandler;
      let mouseUpHandler;

      globalThis.window.addEventListener = (evt, fn) => {
        if (evt === 'mousemove') mouseMoveHandler = fn;
        if (evt === 'mouseup') mouseUpHandler = fn;
      };

      const child1 = { style: {} };
      const child2 = { style: {} };

      const listeners = {};
      const mockContainer = {
        dataset: { dragScroll: 'x' },
        getAttribute: (attr) => (attr === 'data-drag-scroll-elastic' ? 'true' : null),
        scrollLeft: 0,
        scrollTop: 0,
        scrollWidth: 600,
        clientWidth: 300,
        scrollHeight: 300,
        clientHeight: 300,
        style: {},
        classList: {
          add: () => {},
          remove: () => {},
        },
        children: [child1, child2],
        addEventListener: (evt, fn) => {
          listeners[evt] = fn;
        },
        removeEventListener: () => {},
      };

      const scroller = new DragScroll();
      const cleanup = scroller._bind(mockContainer, DragScroll._parseConfig(mockContainer));

      // Trigger mousedown at (100, 100)
      listeners.mousedown({ button: 0, clientX: 100, clientY: 100 });

      // Move rightwards past left boundary (dx = +50px, targetL = -50px < 0)
      mouseMoveHandler({ clientX: 150, clientY: 100 });

      // The container element itself must NEVER be transformed
      assert.strictEqual(mockContainer.style.transform, undefined, 'Container must not have inline transform');

      // The child items must receive the elastic transform
      assert.ok(child1.style.transform, 'Child 1 must receive transform');
      assert.ok(child2.style.transform, 'Child 2 must receive transform');
      assert.match(child1.style.transform, /^translate3d\(/);
      assert.strictEqual(child1.style.transform, child2.style.transform);

      // Release mouse -> triggers snap-back
      mouseUpHandler();
      assert.strictEqual(child1.style.transform, 'translate3d(0, 0, 0)');
      assert.ok(child1.style.transition.includes('cubic-bezier'));

      cleanup();
    });
  });
});


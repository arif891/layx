import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import SmoothScroll from '../layx/others/smooth_scroll/smooth_scroll.js';
import { EASING, getEasing } from '../layx/others/smooth_scroll/core/easing.js';
import { clamp, damp, normalizeWheel, isTouchpad } from '../layx/others/smooth_scroll/core/math.js';
import { EventEmitter } from '../layx/others/smooth_scroll/core/emitter.js';

describe('SmoothScroll Engine & Core Modules', () => {
  describe('core/math.js', () => {
    test('clamp() correctly constrains values', () => {
      assert.strictEqual(clamp(5, 0, 10), 5);
      assert.strictEqual(clamp(-5, 0, 10), 0);
      assert.strictEqual(clamp(15, 0, 10), 10);
    });

    test('damp() is safe against negative dt, 0 dt, and large dt', () => {
      // Negative dt should be clamped to 0 and not step backwards
      const negResult = damp(100, 200, 0.1, -15);
      assert.strictEqual(negResult, 100);

      // 0 dt returns current value
      const zeroResult = damp(100, 200, 0.1, 0);
      assert.strictEqual(zeroResult, 100);

      // Standard dt steps smoothly towards target
      const normalResult = damp(100, 200, 0.1, 16.6667);
      assert.ok(normalResult > 100 && normalResult < 200);
      assert.ok(Math.abs(normalResult - 110) < 0.1); // ~10% step

      // Very large dt is capped at 100ms to prevent overshoot
      const largeResult = damp(100, 200, 0.1, 500);
      assert.ok(largeResult > 100 && largeResult <= 200);
    });

    test('normalizeWheel() normalizes line and page deltas', () => {
      const lineDelta = normalizeWheel({ deltaY: 3, deltaMode: 1 });
      assert.strictEqual(lineDelta, 48); // 3 * 16

      const pageDelta = normalizeWheel({ deltaY: 2, deltaMode: 2 });
      assert.strictEqual(pageDelta, 1600); // 2 * 800
    });

    test('isTouchpad() accurately identifies precision touchpad heuristics', () => {
      // macOS standard discrete mouse wheel has wheelDeltaY multiples of 120 and wheelDeltaX == 0
      assert.strictEqual(isTouchpad({ deltaY: 100, wheelDeltaY: -120, wheelDeltaX: 0 }), false);
      assert.strictEqual(isTouchpad({ deltaY: 200, wheelDeltaY: -240, wheelDeltaX: 0 }), false);

      // Fractional deltas indicate trackpad
      assert.strictEqual(isTouchpad({ deltaY: 1.25 }), true);
      assert.strictEqual(isTouchpad({ deltaY: -0.5 }), true);

      // Non-120 wheelDelta indicates trackpad
      assert.strictEqual(isTouchpad({ deltaY: 14, wheelDeltaY: -14, wheelDeltaX: 0 }), true);
    });
  });

  describe('core/easing.js', () => {
    test('provides complete easing presets with exact boundaries', () => {
      for (const [name, fn] of Object.entries(EASING)) {
        assert.strictEqual(typeof fn, 'function');
        assert.strictEqual(fn(0), 0, `${name}(0) must be 0`);
        assert.strictEqual(fn(1), 1, `${name}(1) must be 1`);
      }
    });

    test('getEasing() resolves valid names and falls back safely', () => {
      assert.strictEqual(getEasing('easeOutExpo'), EASING.easeOutExpo);
      assert.strictEqual(getEasing('unknown-curve'), EASING.easeOutCubic);
      const customFn = t => t * t;
      assert.strictEqual(getEasing(customFn), customFn);
    });
  });

  describe('core/emitter.js', () => {
    test('supports on, off, emit, and hasListeners', () => {
      const emitter = new EventEmitter();
      assert.strictEqual(emitter.hasListeners('test'), false);

      let count = 0;
      const fn = () => { count++; };
      emitter.on('test', fn);
      assert.strictEqual(emitter.hasListeners('test'), true);

      emitter.emit('test');
      assert.strictEqual(count, 1);

      emitter.off('test', fn);
      assert.strictEqual(emitter.hasListeners('test'), false);
      emitter.emit('test');
      assert.strictEqual(count, 1);
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
    });

    afterEach(() => {
      globalThis.window = originalWindow;
      globalThis.document = originalDocument;
    });

    test('constructs fully with initialized fields and getters without throwing on server', () => {
      const scroller = new SmoothScroll();
      assert.strictEqual(scroller.scroll, 0);
      assert.strictEqual(scroller.target, 0);
      assert.strictEqual(scroller.maxScroll, 0);
      assert.strictEqual(scroller.progress, 0);
      assert.strictEqual(scroller.isLocked, false);
      assert.strictEqual(scroller.isScrolling, false);
      assert.doesNotThrow(() => scroller.destroy());
    });
  });

  describe('In simulated browser environment', () => {
    let originalWindow;
    let originalDocument;

    beforeEach(() => {
      originalWindow = globalThis.window;
      originalDocument = globalThis.document;

      globalThis.window = {
        scrollY: 0,
        innerHeight: 800,
        scrollTo: ({ top }) => { globalThis.window.scrollY = top; },
        addEventListener: () => {},
        removeEventListener: () => {},
        __smoothScrollInstance: undefined,
      };

      globalThis.document = {
        documentElement: {
          scrollHeight: 3000,
          dataset: {},
          style: {},
        },
        body: {},
        addEventListener: () => {},
        removeEventListener: () => {},
        querySelector: () => null,
      };

      SmoothScroll._instance = null;
    });

    afterEach(() => {
      if (SmoothScroll.getInstance()) {
        SmoothScroll.getInstance().destroy();
      }
      globalThis.window = originalWindow;
      globalThis.document = originalDocument;
    });

    test('initializes with default options and exposes getters', () => {
      const scroller = new SmoothScroll();
      assert.strictEqual(scroller.scroll, 0);
      assert.strictEqual(scroller.target, 0);
      assert.strictEqual(scroller.maxScroll, 2200); // 3000 - 800
      assert.strictEqual(scroller.progress, 0);
      assert.strictEqual(scroller.damping, 0.5);
      assert.ok(scroller.lerp > 0.1 && scroller.lerp < 0.15);
      assert.strictEqual(scroller.isLocked, false);
      assert.strictEqual(scroller.isScrolling, false);
      scroller.destroy();
    });

    test('accepts normalized damping and strength on a 0.1 to 1.0 scale', () => {
      const floaty = new SmoothScroll({ damping: 0.1 });
      assert.strictEqual(floaty.damping, 0.1);
      assert.ok(floaty.lerp < 0.05); // floaty glide
      floaty.destroy();

      const snappy = new SmoothScroll({ strength: 1.0 });
      assert.strictEqual(snappy.damping, 1.0);
      assert.ok(snappy.lerp >= 0.28); // snappy response
      snappy.destroy();

      const direct = new SmoothScroll({ lerp: 0.2 });
      assert.strictEqual(direct.lerp, 0.2);
      direct.destroy();
    });

    test('lock() and unlock() use reference counting and set overflow: hidden', () => {
      const scroller = new SmoothScroll();
      let lockedEvent = 0;
      let unlockedEvent = 0;

      scroller.on('lock', () => { lockedEvent++; });
      scroller.on('unlock', () => { unlockedEvent++; });

      // First modal opens
      scroller.lock();
      assert.strictEqual(scroller.isLocked, true);
      assert.strictEqual(globalThis.document.documentElement.style.overflow, 'hidden');
      assert.strictEqual(globalThis.document.documentElement.style.scrollbarGutter, 'stable');
      assert.strictEqual(lockedEvent, 1);

      // Second nested modal opens
      scroller.lock();
      assert.strictEqual(scroller.isLocked, true);
      assert.strictEqual(lockedEvent, 1); // Only emits on first lock

      // Second modal closes (still locked by first modal)
      scroller.unlock();
      assert.strictEqual(scroller.isLocked, true);
      assert.strictEqual(unlockedEvent, 0);

      // First modal closes (fully unlocked)
      scroller.unlock();
      assert.strictEqual(scroller.isLocked, false);
      assert.strictEqual(globalThis.document.documentElement.style.overflow, '');
      assert.strictEqual(unlockedEvent, 1);

      scroller.destroy();
    });

    test('handles immediate scrollTo jumps for numbers, "top", and "bottom"', () => {
      const scroller = new SmoothScroll();

      scroller.scrollTo(500, { immediate: true });
      assert.strictEqual(scroller.scroll, 500);
      assert.strictEqual(scroller.target, 500);
      assert.strictEqual(globalThis.window.scrollY, 500);

      scroller.scrollTo('bottom', { immediate: true });
      assert.strictEqual(scroller.scroll, 2200);
      assert.strictEqual(scroller.target, 2200);

      scroller.scrollTo('top', { immediate: true });
      assert.strictEqual(scroller.scroll, 0);
      assert.strictEqual(scroller.target, 0);
      scroller.destroy();
    });

    test('clears stale onComplete and notifies with { interrupted: true } on interruption', () => {
      const scroller = new SmoothScroll();
      let completeResult = null;

      scroller.scrollTo(1000, {
        duration: 800,
        onComplete: (res) => { completeResult = res; },
      });

      assert.ok(scroller._anim);
      assert.ok(scroller._onComplete);

      // User interrupts via wheel scroll
      let prevented = false;
      scroller._onWheel({
        deltaX: 0,
        deltaY: 50,
        deltaMode: 0,
        target: globalThis.document.documentElement,
        preventDefault: () => { prevented = true; },
      });

      assert.strictEqual(prevented, true);
      assert.strictEqual(scroller._anim, null);
      assert.strictEqual(scroller._onComplete, null);
      assert.ok(completeResult);
      assert.strictEqual(completeResult.interrupted, true);

      scroller.destroy();
    });

    test('does not block horizontal trackpad gestures (deltaX > deltaY)', () => {
      const scroller = new SmoothScroll();
      let defaultPrevented = false;

      scroller._onWheel({
        deltaX: 80,
        deltaY: 10,
        deltaMode: 0,
        target: globalThis.document.documentElement,
        preventDefault: () => { defaultPrevented = true; },
      });

      // Horizontal gesture must NOT call preventDefault
      assert.strictEqual(defaultPrevented, false);
      scroller.destroy();
    });

    test('keyboard handler ignores modifier keys and form inputs', () => {
      const scroller = new SmoothScroll();
      let defaultPrevented = false;

      // Cmd+Up / Ctrl+Home should pass through
      scroller._onKeyDown({
        key: 'ArrowUp',
        metaKey: true,
        target: globalThis.document.documentElement,
        preventDefault: () => { defaultPrevented = true; },
      });
      assert.strictEqual(defaultPrevented, false);

      // Input element should pass through
      scroller._onKeyDown({
        key: 'ArrowDown',
        target: { tagName: 'INPUT' },
        preventDefault: () => { defaultPrevented = true; },
      });
      assert.strictEqual(defaultPrevented, false);

      // Select element should pass through
      scroller._onKeyDown({
        key: 'ArrowDown',
        target: { tagName: 'SELECT' },
        preventDefault: () => { defaultPrevented = true; },
      });
      assert.strictEqual(defaultPrevented, false);

      // Space on link should pass through natively
      scroller._onKeyDown({
        key: ' ',
        target: { tagName: 'A' },
        preventDefault: () => { defaultPrevented = true; },
      });
      assert.strictEqual(defaultPrevented, false);

      scroller.destroy();
    });

    test('supports manual external raf() loop when autoRaf is false', () => {
      const scroller = new SmoothScroll({ autoRaf: false });
      scroller.scrollTo(1000);

      assert.strictEqual(scroller.isScrolling, true);
      assert.strictEqual(scroller.scroll, 0);

      // Simulate external animation frames (e.g. from GSAP or Three.js)
      scroller.raf(16.67);
      assert.ok(scroller.scroll > 0);

      scroller.destroy();
    });
  });
});

import { clamp, damp } from './math.js';
import { getEasing } from './easing.js';

/**
 * AnimationEngine orchestrates the physics simulation loop and duration-based transitions.
 */
export class AnimationEngine {
  /**
   * @param {Object} options
   * @param {() => void} [onTick]
   * @param {() => void} [onStart]
   * @param {() => void} [onStop]
   */
  constructor(options, onTick, onStart, onStop) {
    this.options = options;
    this.onTick = onTick;
    this.onStart = onStart;
    this.onStop = onStop;

    this.current = (typeof window !== 'undefined') ? window.scrollY : 0;
    this.target = this.current;
    this.velocity = 0;
    this.isRunning = false;
    this.lastWrittenScroll = this.current;

    this._lastTime = 0;
    this._rafId = 0;
    this._anim = null;
    this._activeOnComplete = null;
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this._lastTime = this.options.autoRaf
      ? ((typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now())
      : 0;

    if (this.onStart) this.onStart();

    if (this.options.autoRaf) {
      this._rafId = (typeof requestAnimationFrame !== 'undefined')
        ? requestAnimationFrame(this.tick)
        : setTimeout(() => this.tick(performance.now()), 16);
    }
  }

  stop(cancelled = true) {
    const wasRunning = this.isRunning;
    this.isRunning = false;
    this.cancelAnim({ interrupted: cancelled });

    if (typeof cancelAnimationFrame !== 'undefined') {
      cancelAnimationFrame(this._rafId);
    } else {
      clearTimeout(this._rafId);
    }

    if (wasRunning && this.onStop) {
      this.onStop();
    }
  }

  cancelAnim(reason = { interrupted: true }) {
    if (this._activeOnComplete) {
      try {
        this._activeOnComplete({ scroll: this.current, ...reason });
      } catch (err) {
        console.error('[SmoothScroll] Error in onComplete callback:', err);
      }
      this._activeOnComplete = null;
    }
    this._anim = null;
  }

  startDurationAnim(startY, targetY, durationMs, easing, onComplete) {
    this.cancelAnim({ interrupted: true });
    this.target = targetY;
    this._activeOnComplete = onComplete || null;
    this._anim = {
      startY,
      targetY,
      startTime: (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now(),
      durationMs,
      easing: getEasing(easing),
    };
    this.start();
  }

  tick = (currentTime) => {
    if (!this.isRunning) return;

    // 1. Duration-based easing animation (when duration was specified in scrollTo)
    if (this._anim) {
      const { startY, targetY, startTime, durationMs, easing } = this._anim;
      const elapsed = currentTime - startTime;
      const progress = clamp(elapsed / durationMs, 0, 1);
      const easedProgress = easing(progress);

      const nextY = startY + (targetY - startY) * easedProgress;
      const dt = Math.max(1, currentTime - this._lastTime);
      this.velocity = ((nextY - this.current) / dt) * 1000;
      this.current = nextY;
      this._lastTime = currentTime;

      this.writeScroll();

      if (progress >= 1) {
        this.current = this.target = targetY;
        this.velocity = 0;
        this._anim = null;
        this.writeScroll();
        this.stop(false);

        if (this._activeOnComplete) {
          try {
            this._activeOnComplete({ scroll: this.current, interrupted: false });
          } catch (err) {
            console.error('[SmoothScroll] Error in onComplete callback:', err);
          }
          this._activeOnComplete = null;
        }
        return;
      }

      this._scheduleNext();
      return;
    }

    // 2. Framerate-independent exponential damping physics (wheel, keyboard, standard scrollTo)
    const rawDt = this._lastTime ? (currentTime - this._lastTime) : 16.6667;
    const dt = Math.max(0, Math.min(rawDt > 0 ? rawDt : 16.6667, 100));
    this._lastTime = currentTime;

    const diff = this.target - this.current;

    // Settle condition
    if (Math.abs(diff) < this.options.threshold) {
      this.current = this.target;
      this.velocity = 0;
      this.writeScroll();
      this.stop(false);

      if (this._activeOnComplete) {
        try {
          this._activeOnComplete({ scroll: this.current, interrupted: false });
        } catch (err) {
          console.error('[SmoothScroll] Error in onComplete callback:', err);
        }
        this._activeOnComplete = null;
      }
      return;
    }

    const nextCurrent = damp(this.current, this.target, this.options.lerp, dt);
    const step = nextCurrent - this.current;
    this.current = nextCurrent;
    this.velocity = dt > 0 ? (step / dt) * 1000 : 0;

    this.writeScroll();
    this._scheduleNext();
  };

  _scheduleNext() {
    if (this.options.autoRaf) {
      this._rafId = (typeof requestAnimationFrame !== 'undefined')
        ? requestAnimationFrame(this.tick)
        : setTimeout(() => this.tick(performance.now()), 16);
    }
  }

  writeScroll() {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: this.current, left: 0, behavior: 'instant' });
      this.lastWrittenScroll = this.current;
    }
    if (this.onTick) this.onTick();
  }

  destroy() {
    this.stop(true);
  }
}


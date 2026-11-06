export type EasingName =
  | 'linear'
  | 'easeOutQuad'
  | 'easeOutCubic'
  | 'easeOutQuart'
  | 'easeOutQuint'
  | 'easeOutExpo'
  | 'easeInOutCubic';

export type EasingFunction = (t: number) => number;

export interface ScrollPayload {
  scroll: number;
  target: number;
  progress: number;
  velocity: number;
  direction: 1 | -1 | 0;
}

export interface ScrollToOptions {
  offset?: number;
  immediate?: boolean;
  duration?: number; // duration in milliseconds
  easing?: EasingName | EasingFunction;
  onComplete?: (result: { scroll: number; interrupted?: boolean }) => void;
}

export interface SmoothScrollOptions {
  damping?: number;          // 0.1 to 1.0 (default 0.5)
  strength?: number;         // Alias for damping
  lerp?: number;             // Direct lerp override (0.01 to 1.0)
  wheelMultiplier?: number;  // Multiplier for mouse wheel (default 1.0)
  keyboard?: boolean;        // Intercept navigation keys (default true)
  interceptAnchors?: boolean;// Intercept in-page a[href^="#"] (default true)
  syncScrollbar?: boolean;   // Sync native scrollbar drag (default true)
  threshold?: number;        // Settle distance in px (default 0.25)
  easing?: EasingName | EasingFunction; // Default easing (default 'easeOutCubic')
  autoRaf?: boolean;         // Internal RAF loop; set false to drive with .raf()
}

export default class SmoothScroll {
  static EASING: Record<EasingName, EasingFunction>;
  static defaults: Required<Omit<SmoothScrollOptions, 'strength' | 'lerp'>>;

  static getInstance(): SmoothScroll | null;

  constructor(options?: SmoothScrollOptions);

  readonly scroll: number;
  readonly target: number;
  readonly maxScroll: number;
  readonly progress: number;
  readonly velocity: number;
  readonly direction: 1 | -1 | 0;
  readonly isScrolling: boolean;
  readonly isLocked: boolean;
  readonly damping: number;
  readonly lerp: number;
  readonly easing: EasingFunction;

  on(event: 'scroll' | 'scroll-start' | 'scroll-end' | 'lock' | 'unlock', callback: (payload: ScrollPayload) => void): this;
  off(event: string, callback: (payload: any) => void): this;
  emit(event: string, detail?: any): void;

  scrollTo(destination: number | 'top' | 'bottom' | string | HTMLElement, options?: ScrollToOptions): void;
  lock(): this;
  unlock(force?: boolean): this;
  stop(): this;
  start(): this;
  raf(time: number): void;
  destroy(): void;
}


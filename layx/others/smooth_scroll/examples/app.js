import SmoothScroll from '../smooth_scroll.js';

// Initialize with modern options (normalized damping 0.1 to 1.0)
const scroller = new SmoothScroll({
  damping: 0.25, // 0.1 = floaty, 0.5 = balanced default, 1.0 = snappy
  wheelMultiplier: 1.0,
  keyboard: true,
  interceptAnchors: true,
  syncScrollbar: true,
});

// Expose globally for interactive button demos in HTML
window.scroller = scroller;

// Telemetry DOM elements
const progressBar = document.getElementById('progress-bar');
const hudStatus = document.getElementById('hud-status');
const hudStatusDot = document.getElementById('hud-status-dot');
const hudScroll = document.getElementById('hud-scroll');
const hudProgress = document.getElementById('hud-progress');
const hudVelocity = document.getElementById('hud-velocity');
const lockBtn = document.getElementById('lock-btn');

// Live Telemetry via event bus
scroller.on('scroll', ({ scroll, progress, velocity }) => {
  hudScroll.textContent = `${Math.round(scroll)} px`;
  hudProgress.textContent = `${Math.round(progress * 100)}%`;
  hudVelocity.textContent = `${Math.round(velocity)} px/s`;
  if (progressBar) {
    progressBar.style.width = `${progress * 100}%`;
  }
});

scroller.on('scroll-start', () => {
  hudStatus.textContent = 'SCROLLING';
  hudStatusDot.classList.add('active');
});

scroller.on('scroll-end', () => {
  hudStatus.textContent = 'IDLE';
  hudStatusDot.classList.remove('active');
  hudVelocity.textContent = '0 px/s';
});

// Lock / Unlock toggle demonstration
lockBtn?.addEventListener('click', () => {
  if (scroller.isLocked) {
    scroller.unlock();
    lockBtn.classList.remove('locked');
    lockBtn.innerHTML = '<span>🔓</span> Lock';
  } else {
    scroller.lock();
    lockBtn.classList.add('locked');
    lockBtn.innerHTML = '<span>🔒</span> Unlock';
  }
});

console.log('[SmoothScroll] Initialized successfully with modern API:', scroller);

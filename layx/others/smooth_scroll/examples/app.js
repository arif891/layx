import scroller from '../smooth_scroll.js';

// Expose scroller to window for the button onclick handlers in HTML (for demo purposes)
window.scroller = scroller;

const statusEl = document.getElementById('status');

// Subscribe to events
scroller.on('update', (detail) => {
    // detail.currentScroll, detail.diff
    statusEl.textContent = `Scrolled: ${Math.round(detail.currentScroll)}px`;
});

scroller.on('start', () => {
    statusEl.style.borderColor = '#0f0'; // Turn border green when moving
});

scroller.on('complete', () => {
    statusEl.style.borderColor = '#444'; // Revert when stopped
});

// Defining global helper functions for the buttons
window.scrollToTop = () => {
    scroller.scrollTo(0);
};

window.scrollToBottom = () => {
    // document.body.scrollHeight usually works, but document.documentElement.scrollHeight is safer
    scroller.scrollTo(document.documentElement.scrollHeight);
};

window.scrollToSection = (num) => {
    const el = document.getElementById(`s${num}`);
    if (el) {
        scroller.scrollTo(el.offsetTop);
    }
};

console.log("SmoothScroll initialized via default export.");

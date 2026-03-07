---
name: add_other_module
description: Add a new optional JavaScript module to layx/others/ (e.g., scroll effects, trackers, utilities)
---

# Adding a New "Others" Module to Layx

Optional feature modules live in `layx/others/<module-name>/`. These are JavaScript-heavy or CSS+JS features that are not core to the layout system but enhance interactivity and UX.

## Overview

The `others/` directory contains:
- Single-purpose JS utilities (e.g., scroll tracking, mouse tracker, theme toggler)
- Hybrid CSS+JS features (e.g., smooth scroll, split text, viewport triggers)
- Heavy optional features not needed on every page (e.g., syntax highlighter, IndexedDB, PWA)

Modules are used by importing them from user JS files:
```js
import '/layx/others/<module-name>/<module-name>.js';
```
Or by the CLI `add` command.

---

## Step 1: Create the Module Directory

```
layx/others/<module-name>/
├── <module-name>.js     (required — main module)
└── <module-name>.css    (optional — if CSS needed)
```

---

## Step 2: Write the JS Module

Use ES module syntax. Export a default class or function. Follow the single-responsibility principle.

**Template — class-based module:**
```js
/**
 * <ModuleName> - Brief description of what this does
 */

class <ModuleName> {
    constructor(options = {}) {
        this.options = {
            // Default options
            selector: '<module-name>',
            ...options
        };
        this.init();
    }

    init() {
        const elements = document.querySelectorAll(this.options.selector);
        elements.forEach(el => this._setup(el));
    }

    _setup(el) {
        // Initialize individual element
    }

    destroy() {
        // Cleanup listeners and state if needed
    }
}

export default <ModuleName>;
```

**Template — observer-based module (viewport triggers pattern):**
```js
/**
 * <ModuleName> - Triggers class/event when element enters viewport
 */

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.setAttribute('visible', '');
            entry.target.dispatchEvent(new CustomEvent('<module-name>-visible'));
        }
    });
}, {
    threshold: 0.1
});

document.querySelectorAll('[data-<module-name>]').forEach(el => observer.observe(el));

export {};
```

**Template — auto-initializing module (theme, scroll, etc.):**
```js
/**
 * <ModuleName> - Auto-initializes on import
 */

(function() {
    // Module logic runs immediately on import
    
    function init() {
        // Setup
    }
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();

export {};
```

---

## Step 3: Write the CSS File (if applicable)

If the module needs CSS, always wrap in `@layer others`:

```css
@layer others {
    [data-<module-name>] {
        /* Default state */
        opacity: 0;
        transition: opacity var(--duration, .6s);

        &[visible] {
            /* Active state */
            opacity: 1;
        }
    }
}
```

---

## Step 4: Usage in Project

The module should be imported from user JS files (not auto-loaded by `layx.js` unless it's a core feature). Document the import pattern:

```js
// In assets/js/base.js or assets/js/pages/home.js:
import '/layx/others/<module-name>/<module-name>.js';

// Or with options:
import <ModuleName> from '/layx/others/<module-name>/<module-name>.js';
const instance = new <ModuleName>({ /* options */ });
```

---

## Reference: Existing Module Patterns

| Module              | Pattern                                           | CSS? |
| ------------------- | ------------------------------------------------- | ---- |
| `theme/`            | Auto-init, listens to toggle clicks               | Yes  |
| `scroll_state/`     | Auto-init, IntersectionObserver / scroll listener | No   |
| `viewport_trigger/` | IntersectionObserver, adds `visible` attribute    | Yes  |
| `smooth_scroll/`    | Event delegation on `[data-smooth-scroll]` links  | Yes  |
| `split_text/`       | Transforms text nodes into span elements          | No   |
| `mouse_tracker/`    | Adds CSS variables for mouse coordinates on root  | No   |
| `idb/`              | Class-based async IndexedDB wrapper, exported     | No   |
| `component/`        | Class-based, fetches and renders HTML components  | No   |

---

## Checklist

- [ ] Directory created: `layx/others/<module-name>/`
- [ ] JS uses ES module syntax (`export default` or `export {}`)
- [ ] CSS wrapped in `@layer others` (if CSS needed)
- [ ] Module is self-contained with no hard external dependencies
- [ ] Usage via `import` is documented in the file header comment
- [ ] Tested in browser at `localhost:81`

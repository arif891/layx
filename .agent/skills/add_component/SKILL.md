---
name: add_component
description: Add a new UI component to the Layx framework following established CSS/JS patterns
---

# Adding a New Component to Layx

This skill guides you through the process of creating a new UI component in the Layx CSS-first framework.

## Overview

Components live in `layx/components/<name>/` and consist of:
- A required CSS file wrapped in `@layer components { ... }`
- An optional JS file using ES modules for interactive behavior
- The component must be registered in `layx/layx.css` (and `layx/layx.js` if JS exists)

---

## Step 1: Create the Component Directory

```
layx/components/<component-name>/
├── <component-name>.css   (required)
└── <component-name>.js    (optional, for interactivity)
```

Example for a `badge` component:
```
layx/components/badge/
├── badge.css
└── (no JS needed — purely CSS)
```

---

## Step 2: Write the CSS File

Always wrap all styles in `@layer components { ... }`. Use CSS custom properties for theming. Support `light-dark()` for automatic dark mode.

**Template:**
```css
@layer components {
    <component-name>, .<component-name> {
        /* CSS custom properties (local variables) */
        --<component-name>-bg: light-dark(#f0f0f0, #2a2a2a);
        --<component-name>-color: light-dark(#111, #eee);
        --<component-name>-radius: var(--radius, .5rem);
        --<component-name>-padding: var(--space, .5rem);

        /* Base styles */
        display: block;
        background: var(--<component-name>-bg);
        color: var(--<component-name>-color);
        border-radius: var(--<component-name>-radius);
        padding: var(--<component-name>-padding);
        transition: var(--duration, .6s);

        /* Variants */
        &.primary {
            --<component-name>-bg: var(--accent-color);
        }
    }
}
```

**Key Conventions:**
- Use `var(--base-space)` / `var(--space)` for spacing
- Use `var(--base-radius)` / `var(--radius)` for border radius
- Use `var(--base-duration)` / `var(--duration)` for transitions
- Use `light-dark(lightVal, darkVal)` for color-scheme-aware colors
- Use CSS nesting with `&` for variants and states
- Breakpoints: `@media (width >= 576px)` (sm), `@media (width >= 768px)` (md), `@media (width >= 992px)` (lg)

---

## Step 3: Write the JS File (if interactive)

Use ES modules only. Keep JS minimal — CSS-first approach. The JS file should handle only behavior that CSS cannot handle alone (e.g., toggle state, events).

**Template:**
```js
// <ComponentName> - handles interactive behavior
const componentName = document.querySelectorAll('<component-name>, .<component-name>');

componentName.forEach(el => {
    // Initialize component
    el.addEventListener('click', (e) => {
        // Handle interaction
        el.toggleAttribute('open');
    });
});
```

**Key Conventions:**
- Use `document.querySelectorAll()` to target both custom element and class selector
- Use `toggleAttribute('open')` for open/close states (see navbar, dialog, sheet)
- Dispatch custom events when needed for component communication
- Use `data-*` attributes for configuration

---

## Step 4: Register the Component in layx.css

Open `layx/layx.css` and add the import under `/* Components */`:

```css
/* Components */
@import url(components/<component-name>/<component-name>.css);
```

---

## Step 5: Register JS in layx.js (if applicable)

Open `layx/layx.js` and add the import:

```js
import './components/<component-name>/<component-name>.js';
```

---

## Reference: Existing Component Patterns

### Pure CSS Component (button)
```
layx/components/button/button.css  — no JS needed
```

### CSS + JS Component (navbar)
```
layx/components/navbar/navbar.css  — styles
layx/components/navbar/navbar.js   — toggler, scroll state
```

### Open/Close Pattern (dialog, sheet, accordion)
- Use the `[open]` attribute to signal open state
- CSS uses `[open] &` or `&[open]` selectors to show/hide content
- JS toggles via `el.toggleAttribute('open')`

---

## Complete Example: Adding a `badge` Component

### 1. Create `layx/components/badge/badge.css`:
```css
@layer components {
    badge, .badge {
        --badge-bg: light-dark(#e0e0e0, #333);
        --badge-color: inherit;
        --badge-radius: 999px;
        --badge-padding-x: calc(var(--space, .5rem) * 1.2);
        --badge-padding-y: calc(var(--space, .5rem) * .4);
        --badge-font-size: .75em;

        display: inline-flex;
        align-items: center;
        background: var(--badge-bg);
        color: var(--badge-color);
        border-radius: var(--badge-radius);
        padding: var(--badge-padding-y) var(--badge-padding-x);
        font-size: var(--badge-font-size);
        font-weight: 600;
        line-height: 1;

        &.primary   { --badge-bg: var(--accent-color); }
        &.success   { --badge-bg: light-dark(#d4edda, #1c4a27); }
        &.warning   { --badge-bg: light-dark(#fff3cd, #4a3800); }
        &.danger    { --badge-bg: light-dark(#f8d7da, #4a0010); }
    }
}
```

### 2. Register in `layx/layx.css`:
```css
/* Components */
@import url(components/badge/badge.css);
```

### 3. Use in HTML:
```html
<badge>New</badge>
<span class="badge primary">Featured</span>
```

---

## Checklist

- [ ] Directory created: `layx/components/<name>/`
- [ ] CSS wrapped in `@layer components { ... }`
- [ ] CSS uses `var(--space)`, `var(--radius)`, `var(--duration)` tokens
- [ ] CSS uses `light-dark()` for color-scheme-aware coloring
- [ ] JS is ES module (if needed)
- [ ] Imported in `layx/layx.css`
- [ ] Imported in `layx/layx.js` (if JS exists)
- [ ] Tested in browser at `localhost:81`

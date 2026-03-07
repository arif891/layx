---
name: layx
description: Master reference skill for the Layx CSS-first framework — architecture, file structure, conventions, CSS patterns, JS patterns, CLI, and build system
---

# Layx Framework — Master Reference

Layx is a **CSS-first framework** for building modern, high-performance landing pages. It emphasizes **zero JavaScript runtime overhead** for core styling while providing optional JavaScript enhancements for interactive components.

**Repository**: [arif891/Layx](https://github.com/arif891/Layx)

---

## Core Philosophy

- **Performance First**: Minimal CSS, no runtime JS dependencies for layouts
- **Landing Page Focused**: Pre-built conversion-optimized components
- **CSS Layers Architecture**: Uses `@layer` for predictable specificity
- **Modern CSS Features**: Leverages `light-dark()`, CSS variables, nesting, and native functions
- **CSS-first**: CSS handles everything it can; JS is only added when CSS alone cannot achieve the behavior

---

## Project Structure

```
root/
├── layx/                    # Core framework (THE MAIN CODEBASE)
│   ├── layx.css             # Main CSS entry point — edit to add imports
│   ├── layx.js              # Main JS entry point — edit to add imports
│   ├── main/                # Core styles (always loaded)
│   │   ├── base/            # variable.css, base.css, breakpoints.css, scrollbar.css
│   │   ├── container/       # container.css
│   │   ├── layout/          # layout.css (12-column grid)
│   │   └── typography/      # typography.css
│   ├── components/          # UI components — each in own subfolder
│   ├── utilities/           # Utility classes — each category in own subfolder
│   ├── others/              # Optional modules — each in own subfolder
│   └── helpers/             # Layout helpers
│
├── src/                     # CLI tool (Node.js, ES modules)
│   ├── cli.js               # CLI entry point & command router
│   ├── commands/            # build.js, unbuild.js, optimize.js, add/
│   ├── processors/          # process.js, html.js
│   └── utils/               # cli-helper.js, build-info.js, etc.
│
├── assets/                  # User project assets (not framework)
│   ├── css/base.css         # User-wide CSS
│   ├── css/pages/           # Per-page CSS files
│   ├── js/base.js           # User-wide JS
│   └── js/pages/            # Per-page JS files
│
├── pages/                   # Additional HTML pages
├── index.html               # Main HTML entry point
├── config.mjs               # Build configuration (esbuild options)
├── layx.bat                 # Windows CLI installer
├── layx(linux).sh           # Linux CLI installer
└── layx(macOS).sh           # macOS CLI installer
```

---

## CSS Architecture

### Layer Order
```css
@layer base, layout, components, others, utilities;
```

| Layer        | Purpose                       | Wins over                |
| ------------ | ----------------------------- | ------------------------ |
| `base`       | Variables, resets, typography | —                        |
| `layout`     | Container, 12-column grid     | base                     |
| `components` | UI components                 | base, layout             |
| `others`     | Optional feature CSS          | base, layout, components |
| `utilities`  | Utility class overrides       | everything               |

> **Key rule**: Never use `!important`. The layer cascade handles specificity. Utilities always win.

### Key CSS Files

| File                             | Purpose                                            |
| -------------------------------- | -------------------------------------------------- |
| `layx/layx.css`                  | Main entry — all `@import` statements go here      |
| `main/base/variable.css`         | All CSS custom properties (tokens)                 |
| `main/base/base.css`             | CSS reset and base element styles                  |
| `main/base/scrollbar.css`        | Custom scrollbar styles                            |
| `main/typography/typography.css` | Heading and text styles                            |
| `main/container/container.css`   | `<container>` element styles                       |
| `main/layout/layout.css`         | `<layout>` 12-column grid + all responsive classes |

### CSS Design Tokens (from `variable.css`)

```css
:root {
    /* Typography */
    --ff-sans: 'Red Hat Display', sans-serif;
    --font-family: var(--ff-sans);
    --font-weight: 500;

    /* Spacing & Sizing */
    --base-space: .5rem;
    --base-radius: .5rem;
    --base-vpu: calc(.1vh + .1vw);  /* viewport-proportional unit */

    /* Animation */
    --base-duration: .6s;

    /* Aliases (use these in new code) */
    --space:    var(--base-space);
    --radius:   var(--base-radius);
    --vpu:      var(--base-vpu);
    --duration: var(--base-duration);

    /* Colors — automatic light/dark mode */
    --color:          light-dark(#000, #fff);
    --bg-color:       light-dark(#fff, #000);
    --heading-color:  inherit;
    --paragraph-color: inherit;
    --link-color:     light-dark(#2da5e6, #70cdff);
    --accent-color:   light-dark(#bae7ff, #2da5e6);

    /* Surface — dynamic elevation via --si (surface index) */
    --surface-color:  hsl(from var(--bg-color) h s calc(l - ...));

    color-scheme: light dark;
}

[theme=light] { color-scheme: light; }
[theme=dark]  { color-scheme: dark; }
```

> **Always use alias tokens** (`--space`, `--radius`, `--duration`) in new code, not the `--base-*` originals.

### CSS Conventions

```css
/* ✅ Correct — wrapped in layer, uses tokens, light-dark() */
@layer components {
    my-element {
        padding: var(--space);
        border-radius: var(--radius);
        background: light-dark(#f5f5f5, #1a1a1a);
        transition: var(--duration);

        &.active {
            background: var(--accent-color);
        }
    }
}

/* ❌ Wrong — no layer, hardcoded values, no dark mode */
my-element {
    padding: 8px;
    background: #f5f5f5;
}
```

### Breakpoints

```css
/* Small (sm):  landscape phones */
@media (width >= 576px)  { }

/* Medium (md): tablets */
@media (width >= 768px)  { }

/* Large (lg):  desktops */
@media (width >= 992px)  { }

/* Ultra-wide */
@media (aspect-ratio >= 21/9) and (width >= 2000px) { }
@media (aspect-ratio >= 32/9) and (width >= 3000px) { }
```

### Custom HTML Elements

Layx uses custom elements for semantic structure:

```html
<container>          <!-- responsive content wrapper with padding -->
<layout>             <!-- 12-column CSS grid -->
<navbar>             <!-- navigation bar -->
<section>            <!-- page section -->
```

Each also works as a CSS class: `<div class="layout">`, `<div class="navbar">`, etc.

---

## Layout System

12-column grid using `<layout>`:

```html
<layout>
    <div class="x-6">Half width (6/12 cols)</div>
    <div class="x-6">Half width (6/12 cols)</div>
</layout>

<!-- Column span classes: x-1 through x-14 -->
<!-- Column start classes: xs-1 through xs-14 -->
<!-- Row span classes: y-1 through y-6 -->
<!-- Row start classes: ys-1 through ys-6 -->

<!-- Responsive variants: x-sm-6, x-md-4, x-lg-3 -->

<!-- Sub-grids -->
<layout>
    <div class="x-8 sub-x">   <!-- inherits parent columns -->
        <div class="x-4">...</div>
    </div>
</layout>

<!-- Gap classes: gap, gap-2 … gap-5, gap-x, gap-y -->
<!-- Edge layout (adds gutters): <layout class="edge"> -->
<!-- Masonry: <layout class="masonry"> -->
```

---

## Components

Located in `layx/components/<name>/`:

| Component    | Has JS | Description            |
| ------------ | ------ | ---------------------- |
| `accordion`  | ✅      | Collapsible panels     |
| `alert`      | ✅      | Notification messages  |
| `breadcrumb` | —      | Breadcrumb navigation  |
| `button`     | —      | Button styles          |
| `card`       | —      | Card containers        |
| `carousel`   | ✅      | Image/content sliders  |
| `chart`      | ✅      | Data visualizations    |
| `dialog`     | ✅      | Modal dialogs          |
| `draggable`  | ✅      | Drag-and-drop          |
| `footer`     | —      | Footer layouts         |
| `form`       | ✅      | Form elements          |
| `media`      | ✅      | Video/audio players    |
| `navbar`     | ✅      | Navigation bars        |
| `pagination` | —      | Page navigation        |
| `popover`    | —      | Popup content          |
| `section`    | —      | Section layouts        |
| `sheet`      | ✅      | Bottom/side sheets     |
| `tab`        | ✅      | Tab interfaces         |
| `tooltip`    | —      | Hover tooltips         |
| `window`     | ✅      | Window-like containers |

### Adding a Component

> See the `add_component` skill for full details.

1. Create `layx/components/<name>/<name>.css` — wrapped in `@layer components`
2. (Optional) Create `layx/components/<name>/<name>.js` — ES module
3. Add `@import url(components/<name>/<name>.css);` to `layx/layx.css`
4. Add `import './components/<name>/<name>.js';` to `layx/layx.js` (if JS)

---

## Utilities

Located in `layx/utilities/<category>/`, wrapped in `@layer utilities`.

Categories: `border`, `color`, `display`, `flex`, `grid`, `height`, `margin`, `opacity`, `padding`, `position`, `shadow`, `width`, `z_index`

> See the `add_utility` skill for full details.

---

## Others (Optional Modules)

Located in `layx/others/<module>/`. Imported manually from user JS files.

| Module                | Purpose                                                  |
| --------------------- | -------------------------------------------------------- |
| `component/`          | Dynamic HTML component loader (dev-only, not production) |
| `theme/`              | Light/dark theme toggle                                  |
| `scroll_state/`       | Scroll position tracking                                 |
| `viewport_trigger/`   | Trigger classes when elements enter viewport             |
| `smooth_scroll/`      | CSS smooth scrolling enhancement                         |
| `split_text/`         | Split text into spans for animation                      |
| `mouse_tracker/`      | CSS variable mouse position tracking                     |
| `partial_render/`     | Partial/SPA-style page rendering                         |
| `icon/`               | Icon system                                              |
| `idb/`                | IndexedDB wrapper                                        |
| `pwa/`                | Progressive Web App support                              |
| `drag_scroll/`        | Drag-to-scroll for containers                            |
| `syntax_highlighter/` | Code syntax highlighting                                 |

> See the `add_other_module` skill for adding new modules.

---

## JavaScript Conventions

```js
// ✅ Always ES modules
import SomeModule from '/layx/others/some/some.js';

// ✅ Target both custom element and class
const elements = document.querySelectorAll('my-element, .my-element');

// ✅ Use toggleAttribute for open/close state
element.toggleAttribute('open');

// ✅ Dispatch custom events for component communication
element.dispatchEvent(new CustomEvent('my-event', { detail: { ... } }));

// ✅ Use data-* attributes for configuration
// <div data-duration="300" data-easing="ease-out">

// ❌ Never use inline styles for theming — use CSS custom properties instead
// ❌ Never use var() in JS to set theme values — use CSS variables via el.style.setProperty()
```

---

## CLI Commands

```bash
layx build           # Bundle & minify CSS/JS for production with esbuild
layx unbuild         # Restore to development state (reverse of build)
layx add -c <name>   # Add a component
layx add -t <name>   # Add a template
layx add -f <name>   # Add a font
layx optimizeImages  # Compress images with sharp
```

### Build Process

1. Detects if already built → runs `unbuild` first (rebuild mode)
2. Optimizes images with `sharp`
3. Bundles CSS (`assets/css/base.css` + `layx/layx.css`) into single file
4. Bundles JS (`assets/js/base.js` + `layx/layx.js`) into single file
5. Minifies all `assets/css/pages/*.css` and `assets/js/pages/*.js` in-place
6. Processes HTML files
7. Generates `build-info.json`

**Build config** (`config.mjs`):
```js
export const config = {
  build: {
    layx: {
      minify: true,
      sourcemap: false,
      format: 'esm',
      target: 'esnext',
      charset: 'utf8',
    }
  }
};
```

---

## HTML Page Template

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Page Title</title>

    <link rel="stylesheet" href="/layx/layx.css">
    <link rel="stylesheet" href="/assets/css/base.css">
    <link rel="stylesheet" href="/assets/css/pages/page-name.css">

    <!-- Preload fonts -->
    <link rel="preload" href="/assets/font/Red_Hat_Display_variable.woff2" as="font" crossorigin>
  </head>
  <body>
    <!-- Content here -->

    <script src="/layx/layx.js" type="module"></script>
    <script src="/assets/js/base.js" type="module"></script>
    <script src="/assets/js/pages/page-name.js" type="module"></script>
  </body>
</html>
```

---

## Testing & Development

- **Local dev server**: `localhost`
- Test dark mode by adding `[theme="dark"]` attribute to `<html>` or `<body>`
- Test light mode with `[theme="light"]` attribute
- Browser support target: modern browsers with CSS `@layer` support (Chrome 99+, Firefox 97+, Safari 15.4+)
- `light-dark()` requires Chrome 123+, Firefox 120+

---

## Important Rules Summary

1. **Always use `@layer`** — never write bare CSS in framework files
2. **CSS-first** — add JS only when CSS cannot achieve the behavior alone
3. **Use design tokens** — `var(--space)`, `var(--radius)`, `var(--duration)`, `var(--color)`, etc.
4. **Dark mode via `light-dark()`** — never handle dark mode with media queries in components
5. **ES modules only** — no CommonJS, no global scripts
6. **No `!important`** — rely on the layer cascade for specificity
7. **Register imports** — always add CSS to `layx.css` and JS to `layx.js`
8. **Custom elements + class parity** — always style both `my-element` AND `.my-element` selectors

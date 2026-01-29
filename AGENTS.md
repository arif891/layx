# Layx Framework - AI Agent Guide

## Project Overview

Layx is a **CSS-first framework** for building modern, high-performance landing pages. It emphasizes **zero JavaScript runtime overhead** for core styling while providing optional JavaScript enhancements for interactive components.

**Repository**: [arif891/Layx](https://github.com/arif891/Layx)  

### Core Philosophy
- **Performance First**: Minimal CSS, no runtime JS dependencies for layouts
- **Landing Page Focused**: Pre-built conversion-optimized components
- **CSS Layers Architecture**: Uses `@layer` for predictable specificity
- **Modern CSS Features**: Leverages `light-dark()`, CSS variables, and native functions

---

## Project Structure

```
root/
├── layx/                    # Core framework (THE MAIN CODEBASE)
│   ├── layx.css             # Main CSS entry point
│   ├── layx.js              # Main JS entry point
│   ├── main/                # Core styles
│   │   ├── base/            # Variables, resets, breakpoints
│   │   ├── container/       # Container component
│   │   ├── layout/          # Grid layout system
│   │   └── typography/      # Typography styles
│   ├── components/          # UI components (20+)
│   ├── utilities/           # Utility classes
│   ├── others/              # Optional modules
│   └── helpers/             # Layout helpers
│
├── src/                     # CLI tool (Node.js)
│   ├── cli.js               # CLI entry point
│   ├── commands/            # Build, unbuild, add, optimize
│   └── utils/               # Helper utilities
│
├── assets/                  # User project assets
│   ├── css/                 # User CSS (base.css, pages/)
│   └── js/                  # User JS (base.js, pages/)
│
├── pages/                   # Additional HTML pages
├── index.html               # Main entry point
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

Styles are organized in strict layer order for predictable cascade:
1. **base** - Variables, resets, typography
2. **layout** - Container, grid layout
3. **components** - UI components
4. **others** - Optional features
5. **utilities** - Utility overrides

### Key CSS Files

| File                           | Purpose                                             |
| ------------------------------ | --------------------------------------------------- |
| `main/base/variable.css`       | CSS custom properties (spacing, colors, typography) |
| `main/base/breakpoints.css`    | Responsive breakpoint definitions                   |
| `main/base/base.css`           | CSS reset and base styles                           |
| `main/container/container.css` | Container component                                 |
| `main/layout/layout.css`       | 12-column grid system                               |

### CSS Variables Pattern
```css
:root {
    --base-space: .5rem;      /* Base spacing unit */
    --base-radius: .5rem;     /* Border radius */
    --base-duration: .6s;     /* Animation duration */
    --color: light-dark(#000, #fff);        /* Auto dark mode */
    --bg-color: light-dark(#fff, #000);
}
```

### Custom Elements
Layx uses custom HTML elements for semantic structure:
- `<container>` - Content wrapper with responsive padding
- `<layout>` - 12-column grid container
- `<navbar>` - Navigation component
- `<section>` - Page sections

---

## Components

Located in `layx/components/`, each with its own directory:

| Component  | Files   | Description            |
| ---------- | ------- | ---------------------- |
| accordion  | CSS, JS | Collapsible panels     |
| alert      | CSS, JS | Notification messages  |
| button     | CSS     | Button styles          |
| card       | CSS     | Card containers        |
| carousel   | CSS, JS | Image/content sliders  |
| chart      | CSS, JS | Data visualizations    |
| dialog     | CSS, JS | Modal dialogs          |
| draggable  | CSS, JS | Drag-and-drop          |
| footer     | CSS     | Footer layouts         |
| form       | CSS, JS | Form elements          |
| media      | CSS     | Video/audio players    |
| navbar     | CSS, JS | Navigation bars        |
| pagination | CSS     | Page navigation        |
| popover    | CSS     | Popup content          |
| section    | CSS     | Section layouts        |
| sheet      | CSS, JS | Bottom/side sheets     |
| tab        | CSS, JS | Tab interfaces         |
| tooltip    | CSS     | Hover tooltips         |
| window     | CSS, JS | Window-like containers |

---

## Utilities

Located in `layx/utilities/`, organized by category:

- **border/** - Border utilities
- **color/** - Text/background colors
- **display/** - Display properties
- **flex/** - Flexbox utilities
- **grid/** - Grid utilities
- **height/** - Height classes
- **margin/** - Margin spacing
- **opacity/** - Opacity levels
- **padding/** - Padding spacing
- **position/** - Position utilities
- **shadow/** - Box shadows
- **width/** - Width classes
- **z_index/** - Z-index layers

---

## Others (Optional Modules)

Located in `layx/others/`:

| Module              | Purpose                     |
| ------------------- | --------------------------- |
| component/          | Dynamic component loader    |
| icon/               | Icon system                 |
| idb/                | IndexedDB wrapper           |
| mouse_tracker/      | Mouse position tracking     |
| partial_render/     | Partial page rendering      |
| pwa/                | Progressive Web App support |
| scroll_state/       | Scroll position state       |
| smooth_scroll/      | Smooth scrolling            |
| split_text/         | Text animation splitting    |
| syntax_highlighter/ | Code highlighting           |
| theme/              | Light/dark theme toggle     |
| viewport_trigger/   | Viewport-based triggers     |

---

## CLI Commands

The CLI is built with Node.js (ES modules) and uses esbuild + sharp:

```bash
layx build           # Bundle and minify for production
layx unbuild         # Restore to development state
layx add -c <name>   # Add a component
layx add -t <name>   # Add a template
layx add -f <name>   # Add a font
layx optimizeImages  # Compress images with sharp
```

### CLI Architecture
- **cli.js** - Entry point with command router
- **commands/build.js** - Production bundling
- **commands/unbuild.js** - Development restoration
- **commands/add/** - Component/template/font addition
- **commands/optimize.js** - Image optimization

---

## Development Guidelines

### Adding Components
1. Create directory in `layx/components/<name>/`
2. Add `<name>.css` with `@layer components` wrapper
3. (Optional) Add `<name>.js` for interactivity
4. Update `layx/layx.css` imports

### CSS Conventions
- Always wrap in appropriate `@layer`
- Use CSS custom properties for theming
- Support `light-dark()` for color schemes
- Use `@import url()` for module loading

### JavaScript Conventions
- Use ES modules (`import`/`export`)
- Keep JS minimal - CSS-first approach
- Place in same directory as related CSS

### Layout System
```html
<layout>
  <div class="x-6">Half width</div>
  <div class="x-6">Half width</div>
</layout>
```
- 12-column grid system
- Classes: `x-1` through `x-12`
- Responsive variants available

---

## Build Process

The build system:
1. Bundles CSS/JS into single files
2. Minifies with esbuild
3. Moves source files to `layx/assets/`
4. Optimizes images with sharp

### File Organization (Build)
- `assets/css/base.css` → merged into bundle
- `assets/css/pages/*.css` → minified in place
- `assets/js/base.js` → merged into bundle
- `assets/js/pages/*.js` → minified in place

---

## Key Technical Details

### Browser Support
- Modern browsers with CSS layers support
- Uses `light-dark()` (Chrome 123+, Firefox 120+)
- Graceful degradation for older browsers

### Dependencies
- **esbuild** - Fast bundling/minification
- **sharp** - Image optimization

### Testing
- Local dev server runs on `localhost:81`
- Test in multiple browsers for CSS compatibility
- Verify dark mode with `[theme="dark"]` attribute

---

## Important Files Reference

| File                          | Purpose                              |
| ----------------------------- | ------------------------------------ |
| `layx/layx.css`               | Main CSS entry - edit to add imports |
| `layx/layx.js`                | Main JS entry - edit to add imports  |
| `layx/main/base/variable.css` | Core CSS variables                   |
| `src/cli.js`                  | CLI entry point                      |
| `config.mjs`                  | Build configuration                  |
| `index.html`                  | Template structure                   |

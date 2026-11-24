# LayX Build & Bundling Engine

The LayX build engine is engineered specifically for modern, high-performance landing pages. It provides automated production optimization directly to `/dist` (or a configurable output directory) without modifying development source files.

---

## ⚡ Key Highlights

1. **Non-Destructive CSS Minification**:
   - Preserves cutting-edge CSS features (`@layer`, `@starting-style`, dynamic viewport units `dvh/svh`, color-mix, relative colors).
   - Removes unused responsive 12-column grid layout classes by scanning your HTML.
2. **Static Component Baking & Event Unwrapping**:
   - Statically pre-renders `<component>` tags into standard semantic HTML at build time.
   - Strips `component.js` imports and instantiations (`new Component(...)`).
   - Automatically unwraps `document.addEventListener('components-ready', ...)` listeners to top-level code before the JS bundler runs for zero runtime overhead.
3. **Pages Flattening & Collision Safety**:
   - Flattens sub-pages in `pages/` directly to the output root (e.g. `pages/other.html` becomes `dist/other.html`).
   - Updates links across HTML and JS automatically (`/pages/other.html` -> `/other.html`).
   - Detects and fails the build if any file or folder in `pages/` collides with an existing root file or directory.
4. **Complete Root Asset Copying**:
   - Automatically copies all custom root files (`favicon.ico`, `robots.txt`, `sitemap.xml`, `_headers`, `_redirects`) and custom directories (`public/`, `downloads/`, `static/`).
   - Framework source in `layx/` is bundled and strictly excluded from the output directory.
5. **ESBuild JavaScript Bundling**:
   - Bundles framework JS (`layx/layx.js`) and user JS (`assets/js/base.js`, `assets/js/pages/*.js`) into optimized production chunks with tree-shaking and in-memory pre-processing.
6. **HTML Transformation**:
   - Automatically removes development framework entries (`/layx/layx.css` and `/layx/layx.js`) completely in output HTML.
   - Preserves references to bundled production assets (`/assets/css/base.css` and `/assets/js/base.js`).
7. **Sharp Image Optimization**:
   - Automatically converts PNG and JPEG assets in `assets/image/` to AVIF (and WebP) directly into the output directory.
   - Purges unused SVG `<symbol>` tags from icon sprites.
8. **Clean Output Separation**:
   - Compiles everything directly into `/dist` (or your configured `outDir`).
   - Your development source files in `assets/`, `pages/`, and `index.html` are never modified.

---

## 🚀 Running a Production Build

```bash
layx build
# or with custom output directory
layx build --outDir my-dist
# or via npm
npm run build
```

### Detailed Build Pipeline

```
layx build
  ├── 1. Collision Check      Verify no pages/ files or folders conflict with root
  ├── 2. Clean & Prepare      Clean dist/ directory and recreate empty structure
  ├── 3. Copy Static Assets   Copy assets/ subdirectories (font, brand, media, static)
  ├── 4. Copy Root Files      Copy root files (favicon, robots, etc.) and folders (public/)
  ├── 5. Copy Pages Non-HTML  Copy non-HTML assets in pages/ to dist root
  ├── 6. Optimize Images      Convert PNG/JPG to AVIF/WebP & purge unused SVG symbols
  ├── 7. Bundle CSS           Strip unused grid classes & minify modern CSS into dist/assets/css/
  ├── 8. Bundle JS            Unwrap component code, strip component.js, & bundle with esbuild
  └── 9. Transform HTML       Bake <component> tags, remove layx entries, flatten pages links
```

---

## 🧱 Static Component Baking

LayX includes a lightweight prototype component loader (`layx/others/component`) that allows developers to write modular, reusable `<component>` tags during development. During production build (`layx build`), these components are **statically baked into standard HTML**:

### 1. Prototype Component Usage (Dev)

In your HTML:
```html
<!-- Load component from external template library -->
<component src="./components.html" name="profile-card" prop="'John Doe', 'Engineer'" class="shadow">
    <span slot="badge">Verified</span>
</component>
```

In your `assets/js/base.js`:
```javascript
import Component from '../../layx/others/component/component.js';

new Component();

// Page initialization wrapped in components-ready
document.addEventListener('components-ready', () => {
    initSliders();
    initAnalytics();
});
```

### 2. Baked Production Output (`dist/`)

In `dist/index.html`:
- The `<component>` element is replaced with the instantiated template markup.
- Named slots (`<slot name="...">`) and default slots (`<slot>`) are resolved; fallbacks are preserved if empty.
- Classes are intelligently merged (`class="card shadow"`) and styles are merged with semicolons.
- Template helpers (`renderList`, `when`, `esc`, `cls`, `raw`, `$content`) and props are evaluated.
- Template definitions (`<template component="...">` and `[component="..."]`) are removed.
- Prototype `<script src=".../component.js">` tags are removed.

In `dist/assets/js/base.js`:
- `import Component from '...'` is stripped.
- `new Component(...)` is removed.
- `document.addEventListener('components-ready', ...)` is **unwrapped** to top-level code:
```javascript
// Unwrapped production output:
initSliders();
initAnalytics();
```
This ensures your initialization code runs immediately upon page load with **zero runtime overhead**.

---

## 📄 Pages Flattening & Routing

LayX supports an intuitive `pages/` directory during development for multi-page landing sites. During `layx build`:

1. **Root Placement**: Every page in `pages/` (e.g. `pages/other.html` or `pages/about.html`) is flattened directly to the root of `dist/` (e.g. `dist/other.html`, `dist/about.html`).
2. **Link Rewriting**: References to `/pages/other.html`, `./pages/other.html`, or `pages/other.html` in HTML and JS are automatically rewritten to `/other.html` or `./other.html`.
3. **Collision Detection**: If a file or directory in `pages/` has the same name as a file or folder at project root (e.g. `pages/index.html` or `pages/assets/`), the build safely aborts with a descriptive collision error before making any changes.

---

## 📁 Root Assets & Folder Copying

Custom root files and directories are copied directly to `dist/` without any manual build configuration:
- **`public/` directory**: Any files and subdirectories inside `public/` are copied directly to the root of `dist/`.
- **Root static files**: Files like `favicon.ico`, `robots.txt`, `sitemap.xml`, `_headers`, `_redirects`, `site.webmanifest` are copied to `dist/`.
- **Exclusions**: `layx/` (framework source), `node_modules`, `pages/`, `.git`, `.vscode`, `package.json`, and config files are never copied to `dist/`.

---

## ⚙️ Configuration (Zero-Config by Default, Opt-In `layx.config.mjs`)

LayX projects are **100% zero-config by default**. No configuration file is required.

To customize build options, create a `layx.config.mjs` (or `config.mjs`) in your project root:

```javascript
// layx.config.mjs (optional)
export default {
  build: {
    outDir: 'dist',     // customize build output folder
    minify: true,
    sourcemap: true,    // enable sourcemaps for debugging
    target: 'es2022',   // customize JS target
  },
  images: {
    formats: ['avif', 'webp'],
    quality: 80
  },
  components: {
    data: {             // global data context for static component baking
      appName: 'My SaaS Landing',
      currentYear: 2026
    }
  }
};
```

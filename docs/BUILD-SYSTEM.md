# LayX Build & Bundling Engine

The LayX build engine is engineered specifically for modern, high-performance landing pages. It provides automated production optimization directly to `/dist` (or a configurable output directory) without modifying development source files.

---

## ⚡ Key Highlights

1. **Non-Destructive CSS Minification**:
   - Preserves cutting-edge CSS features (`@layer`, `@starting-style`, dynamic viewport units `dvh/svh`, color-mix, relative colors).
   - Removes unused responsive 12-column grid layout classes by scanning your HTML.
2. **ESBuild JavaScript Bundling**:
   - Bundles all modules imported by `layx/layx.js` and `assets/js/base.js` into optimized production chunks with tree-shaking.
3. **HTML Transformation**:
   - Automatically removes development framework entries (`/layx/layx.css` and `/layx/layx.js`) completely in output HTML.
   - Preserves references to bundled production assets (`/assets/css/base.css` and `/assets/js/base.js`).
4. **Sharp Image Optimization**:
   - Automatically converts PNG and JPEG assets in `assets/image/` to AVIF (and WebP) directly into the output directory.
   - Purges unused SVG `<symbol>` tags from icon sprites.
5. **Clean Output Separation**:
   - Compiles everything directly into `/dist` (or your configured `outDir`).
   - Your development source files in `assets/` and `index.html` are never modified.
   - Framework source in `layx/` is bundled and not copied into `dist/`.

---

## 🚀 Running a Production Build

```bash
layx build
# or with custom output directory
layx build --outDir my-dist
# or via npm
npm run build
```

**What happens during `layx build`:**
1. **Clean Destination**: Cleans existing files in `/dist` to prevent stale artifacts.
2. **Asset Copying**: Copies static assets (`assets/font/`, `assets/brand/`, `assets/media/`, static files) into `dist/assets/`.
3. **Image & SVG Optimization**:
   - Converts raster images directly into `dist/assets/image/` as modern AVIF/WebP formats.
   - Purges unused SVG symbols from sprites directly into `dist/assets/image/`.
4. **CSS Bundling**:
   - Resolves `@import` rules from `layx/layx.css` and combines them with `assets/css/base.css`.
   - Strips unused grid column classes by scanning your HTML.
   - Outputs minified bundled CSS into `dist/assets/css/base.css`.
   - Minifies per-page CSS files into `dist/assets/css/pages/`.
5. **JavaScript Bundling**:
   - Bundles framework JS (`layx/layx.js`) and user base JS (`assets/js/base.js`) into `dist/assets/js/base.js` using `esbuild`.
   - Bundles per-page scripts into `dist/assets/js/pages/`.
6. **HTML Transformation**:
   - Strips development `<link href="/layx/layx.css">` and `<script src="/layx/layx.js">` tags completely.
   - Updates image URLs in HTML and CSS if next-gen formats are used.
   - Writes production-ready HTML directly into `dist/`.

---

## ⚙️ Configuration (Zero-Config by Default, Opt-In `layx.config.mjs`)

LayX projects are **100% zero-config by default**. No configuration file is required to build, bundle, or optimize.

If you wish to customize build options (such as configuring the output directory, enabling sourcemaps for debugging, altering browser targets, or tuning image formats), you can optionally create a `layx.config.mjs` (or `config.mjs`) in your project root:

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
  }
};
```

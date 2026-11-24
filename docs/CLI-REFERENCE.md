# LayX CLI Reference

The LayX CLI provides an intuitive command-line and interactive terminal interface for managing the complete lifecycle of your landing page projects.

---

## 💻 General Syntax

```bash
layx <command> [options]
# or via npx
npx layx-css <command> [options]
```

Running `layx` without any command will launch the **Interactive Prompts Menu**:
```bash
layx
```

---

## 📌 Commands

### `create`
Scaffolds a new LayX landing page project.

```bash
layx create [project-name]
```

**What it does:**
1. Copies the starter template files (`assets/`, `pages/`, `config.mjs`, `index.html`, `.vscode/`).
2. Copies framework assets from `layx/` with only default components (`button`, `navbar`, `footer`) and default others (`icon`, `theme`).
3. Auto-wires default CSS and JS imports into `layx/layx.css` and `layx/layx.js`.
4. Generates a customized `package.json` with build scripts.

---

### `add`
Adds components, optional feature modules (`others`), Google Fonts, wireframe sections, or landing page templates to the current project.

```bash
layx add [options]
```

#### Flags:
- **`-c, --component <names...>`**:
  Adds components (e.g. `accordion`, `carousel`, `sheet`). Checks local package first, then falls back to remote registry.
  ```bash
  layx add -c accordion carousel
  ```
- **`-o, --other <names...>`**:
  Adds optional feature modules from `layx/others/` (e.g. `smooth_scroll`, `syntax_highlighter`, `mouse_tracker`).
  ```bash
  layx add -o smooth_scroll syntax_highlighter
  ```
- **`-f, --font <names...>`**:
  Downloads Google Fonts locally as optimized WOFF2 files into `assets/font/` and provides the `@font-face` CSS snippet.
  ```bash
  layx add -f "Red Hat Display" "Inter"
  ```
- **`-t, --template <name>`**:
  Adds a complete landing page template layout.
  ```bash
  layx add -t saas-landing
  ```
- **`-w, --wire <presets...>`**:
  Adds pre-designed wireframe layout blocks (e.g. `hero`, `features`, `pricing`).
  ```bash
  layx add -w hero features
  ```

---

### `build`
Compiles, bundles, and prepares your landing page project for high-performance production hosting in `/dist` (or a configurable `outDir`).

```bash
layx build
# or with custom output directory
layx build --outDir custom-output
# or with custom copy targets and exclusions
layx build --exclude "drafts,*.log" --copy "docs,README.md"
```

**Optimization steps:**
- **Configurable Copy & Exclude**: Supports custom copy targets via `--copy <patterns>` (or config `copy`) and custom exclusions via `--exclude <patterns>` (or config `exclude`).
- **Static Component Baking**: Pre-renders `<component>` tags into standard HTML, merges classes & styles, evaluates props and slots, and strips prototype component definitions.
- **JS Event Unwrapping & Bundling**: Removes `component.js` imports and instantiations (`new Component`), unwraps `components-ready` listeners to top-level code, and bundles JS with `esbuild` for code-splitting and tree-shaking into `dist/assets/js/`.
- **Pages Flattening**: Moves files from `pages/` (e.g. `pages/other.html`) to the root of `dist/` (e.g. `dist/other.html`) and updates all links (`/pages/other.html` -> `/other.html`).
- **Root Asset Copying**: Copies all root files (`favicon.ico`, `robots.txt`, `sitemap.xml`, `_headers`, `_redirects`) and directories (`public/`, `downloads/`) to `dist/`, while strictly excluding the `layx/` framework directory.
- **CSS Bundling**: Resolves `@import` rules, strips unused responsive grid classes, and minifies modern CSS into `dist/assets/css/base.css`.
- **HTML Transformation**: Removes development `/layx/layx.css` and `/layx/layx.js` tags completely from HTML entry points.
- **Image Optimization**: Converts images in `assets/image/` to AVIF/WebP formats and purges unused SVG symbols directly into the output folder.
- **Source Protection**: Leaves development files in `assets/`, `pages/`, and `index.html` completely untouched.

---

### `optimize`
Runs the asset optimizer independently for raster images.

```bash
layx optimize
```

**What it does:**
- Converts PNG/JPEG images in `assets/image/` to AVIF (and WebP fallback) using `sharp`.

---

### `snippets`
Installs LayX code snippets for Visual Studio Code.

```bash
# Install into the current project's .vscode folder
layx snippets

# Install globally into your personal VS Code profile
layx snippets --global
```

---

## 🚩 Global Options

- **`-v, --version`**: Output the installed CLI version.
- **`-h, --help`**: Display CLI usage help documentation.

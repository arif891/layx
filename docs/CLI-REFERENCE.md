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
Compiles, bundles, and prepares your landing page project for high-performance production hosting.

```bash
layx build
```

**Optimization steps:**
- **CSS Bundling**: Resolves `@import` rules, strips unused responsive grid classes, and minifies modern CSS without breaking `@layer` or `@starting-style`.
- **JS Bundling**: Uses `esbuild` for code-splitting, tree-shaking, and ES module bundling.
- **HTML Transformation**: Rewires development `<link>` and `<script>` tags to point to single production bundles.
- **Image Optimization**: Converts images in `assets/image/` to AVIF/WebP formats and minifies SVGs.

---

### `unbuild`
Restores production-bundled HTML files back to their original development state.

```bash
layx unbuild
```

**What it does:**
- Restores original development source references in `index.html` and `pages/*.html`.
- Restores unbundled development CSS/JS files and original SVGs.

---

### `optimize`
Runs the asset optimizer independently without triggering a full HTML/JS build.

```bash
layx optimize
```

**What it does:**
- Converts PNG/JPEG images in `assets/image/` to AVIF (and WebP fallback) using `sharp`.
- Minifies SVG vector graphics.
- Backs up original unoptimized images into `layx/assets/image/` for lossless `unbuild` restoration.

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

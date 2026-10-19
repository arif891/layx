# LayX

[![npm version](https://img.shields.io/npm/v/layx-css.svg)](https://www.npmjs.com/package/layx-css)
[![npm license](https://img.shields.io/npm/l/layx-css.svg)](LICENSE)
[![node version](https://img.shields.io/node/v/layx-css.svg)](package.json)

![Layx Social Preview](.github/layx_social_preview.png)

**LayX** is a modern, CSS-first framework and build tool purpose-built for creating blazing-fast, high-converting landing pages. It combines semantic HTML layouts with a zero-runtime CSS core, an interactive CLI, and automated production bundling.

> **Core Philosophy:** "Build stunning landing pages faster. No framework bloat, no runtime overhead — just pure performance and developer ergonomics."

---

> [!WARNING]
> ### 🚧 Active Development Stage (Alpha)
> LayX (`layx-css`) is currently in active early development (**alpha stage**).
> - APIs, directory structures, and CLI commands may change before the `1.0.0` stable release.
> - Breaking changes can occur between minor/alpha updates.
> - We actively welcome early testers, bug reports, and design discussions! Please submit feedback via [GitHub Issues](https://github.com/arif891/Layx/issues).

---

## ✨ Highlights

- 🚫 **Zero Runtime** — Pure modern CSS architecture. No bulky client-side JavaScript runtime or Virtual DOM overhead.
- 📦 **Landing-Page Focused** — Optimized for conversion with hero sections, pricing tables, testimonials, CTAs, and responsive navbars.
- 🧩 **Hybrid Component System** — Starter projects ship lean with essential defaults (`button`, `navbar`, `footer`). Add components on-demand (`layx add -c accordion`) with automatic CSS imports.
- ⚡ **Non-Destructive Bundler** — Preserves modern CSS features (`@layer`, `@starting-style`, dynamic viewport units, relative colors) while stripping unused grid classes.
- 🔄 **Two-Way Lifecycle (`build` & `unbuild`)** — Bundle for production deployment, then revert back to source files at any time with `layx unbuild`.
- 🖼️ **Integrated Image Optimizer** — Automatically converts images to next-gen AVIF/WebP formats and minifies SVG sprites.
- 💻 **Interactive CLI** — Beautiful, modern interactive terminal interface built with `@clack/prompts`.

---

## 🚀 Quick Start

### Option 1: Run with `npx` (No Global Install Required)

Scaffold a brand new landing page in seconds:

```bash
npx layx-css create my-landing-page
# or
npm create layx my-landing-page
```

### Option 2: Install Globally via `npm`

Install the CLI globally to have the `layx` command directly available anywhere on your machine:

```bash
npm install -g layx-css
```

Once installed globally, you can launch the interactive menu by running:

```bash
layx
```

---

## 🛠️ CLI Commands Guide

### 1. `layx create [name]`
Scaffolds a new LayX landing page project with all necessary configurations, pre-configured fonts, essential components, and build scripts.
```bash
layx create my-landing-page
```

### 2. `layx add`
Extend your project on-demand with components, optional feature modules (`others`), Google Fonts, wireframes, or landing page templates:

```bash
# Add components (offline-first from local package, with remote fallback)
layx add -c accordion modal tabs

# Add optional feature modules (smooth scroll, syntax highlighter, mouse tracker, etc.)
layx add -o smooth_scroll split_text syntax_highlighter

# Download & bundle Google Fonts locally into assets/font/
layx add -f "Red Hat Display" "Inter"

# Add wireframe presets
layx add -w hero features pricing

# Add starter landing page templates
layx add -t saas-landing
```

*Note: New projects ship lean with default components (`button`, `navbar`, `footer`) and default others (`icon`, `theme`). Adding components or other modules automatically copies assets into `layx/` and auto-wires `@import` statements into `layx/layx.css` and imports into `layx/layx.js`.*

### 3. `layx build`
Compiles and prepares your landing page for high-performance production deployment:
- Strips unused grid layout classes.
- Bundles and minifies JavaScript using `esbuild`.
- Minifies modern CSS without altering cutting-edge CSS syntax.
- Rewires HTML references to point to production bundles.
- Converts images in `assets/image/` to AVIF/WebP and optimizes SVGs.

```bash
layx build
```

### 4. `layx unbuild`
Need to make edits after a build? Restore your project back to its original development state:
```bash
layx unbuild
```

### 5. `layx optimize`
Manually compress and optimize images in `assets/image/` without performing a full build:
```bash
layx optimize
```

### 6. `layx snippets [--global]`
Install LayX HTML, CSS, and JS code snippets for VS Code:
```bash
# Install into the current project workspace (.vscode/)
layx snippets

# Install globally into your user VS Code profile
layx snippets --global
```

---

## 🎨 Syntax & Design Patterns

LayX uses clean, semantic syntax for common landing page layout needs:

### Responsive Container
```html
<container>
  <div class="content">
    <h1>Welcome to LayX</h1>
  </div>
</container>
```

### 12-Column Responsive Layout Grid
```html
<layout>
  <div class="x-8">Main content column</div>
  <div class="x-4">Sidebar column</div>
</layout>
```

### Semantic Components
```html
<navbar>
  <div class="brand">MyLogo</div>
  <nav class="link-wrapper">
    <a class="link" href="#features">Features</a>
    <a class="link" href="#pricing">Pricing</a>
  </nav>
  <button class="btn btn-primary">Get Started</button>
</navbar>
```

---

## 📁 Project Directory Structure

```
my-landing-page/
├── assets/
│   ├── brand/               # Logos and branding assets
│   ├── css/
│   │   ├── base.css         # Project-wide custom CSS
│   │   └── pages/home.css   # Page-specific styles
│   ├── font/                # Local web fonts (WOFF2)
│   ├── image/               # Project images and SVG sprites
│   └── js/
│       ├── base.js          # Project-wide custom JS
│       └── pages/home.js    # Page-specific JS
├── layx/                    # LayX framework core
│   ├── layx.css             # Framework CSS entry point
│   ├── layx.js              # Framework JS entry point
│   ├── components/          # Active components (button, navbar, etc.)
│   ├── main/                # Base reset, layout grid, variables
│   └── utilities/           # Utility classes (spacing, flex, grid)
├── pages/                   # Additional landing sub-pages
├── config.mjs               # LayX bundler configuration
├── index.html               # Main landing page entry point
└── package.json             # Project dependencies and build scripts
## 📚 Documentation

For complete guides and architectural references, check out our markdown docs in the [`/docs`](docs/README.md) folder:

- 🚀 **[Getting Started](docs/getting-started.md)** — Installation, scaffolding, and project structure tour.
- 🛠️ **[CLI Reference](docs/cli-reference.md)** — Comprehensive guide to all commands, flags, and interactive menus.
- 🧩 **[Components System](docs/components.md)** — Core components, manifest schema, and auto-wiring.
- ⚡ **[Others Modules](docs/others-modules.md)** — Interactive modules (`theme`, `icon`, `smooth_scroll`, etc.).
- 🏗️ **[Build & Bundling Engine](docs/build-system.md)** — Non-destructive CSS minification and two-way build lifecycle.

---

## 🤝 Contributing & Feedback

LayX is open-source and welcoming contributions, bug reports, and ideas!

- **Found a bug or have a suggestion?** Open an issue on [GitHub Issues](https://github.com/arif891/Layx/issues).
- **Want to contribute code or components?** Fork the repository and open a Pull Request.

---

## 📄 License

LayX is open-source software licensed under the [MIT License](LICENSE).
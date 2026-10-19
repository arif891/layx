# LayX Landing Page

This is a starter landing page built with [LayX](https://github.com/arif891/Layx) (`layx-css`).

> [!WARNING]
> **Active Development Preview (Alpha)**
> LayX is currently in active early development (`alpha`). Architecture, components, and APIs may change. We welcome early feedback, bug reports, and contributions!

---

## 🚀 Quick Commands

Inside this project directory, you can run:

```bash
# Build & bundle for production (minifies CSS, tree-shakes JS, transforms HTML)
npm run build

# Restore development source files after build
npm run unbuild

# Optimize images (converts to modern AVIF/WebP) and minifies SVGs
npm run optimize

# Add more components (interactive or by name)
npx layx add -c <component-name>

# Add Google Fonts locally into assets/font/
npx layx add -f "<font-name>"

# Install LayX VS Code snippets into this workspace
npx layx snippets
```

---

## 📁 Project Structure

```
├── assets/
│   ├── brand/               # Brand logos and icons
│   ├── css/
│   │   ├── base.css         # Your shared custom styles
│   │   └── pages/home.css   # Page-specific CSS styles
│   ├── font/                # Local web fonts (Red Hat Display preloaded)
│   ├── image/               # Project images and SVG sprites
│   └── js/
│       ├── base.js          # Shared custom JavaScript logic
│       └── pages/home.js    # Page-specific JavaScript
├── layx/                    # LayX framework core (styles, components, utilities)
├── pages/                   # Additional landing sub-pages
├── config.mjs               # LayX build and bundler configuration
└── index.html               # Main landing page entry point
```

---

## 🧩 Adding Components

By default, new projects include core components (`button`, `navbar`, `footer`). To add other components:

```bash
npx layx add -c accordion modal tabs
```

LayX will copy the component files into `layx/components/` and automatically wire them into `layx/layx.css`.

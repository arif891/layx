# Getting Started with LayX

This guide will walk you through setting up your first high-performance landing page with LayX.

---

## 📦 Prerequisites

LayX requires **Node.js v18.0.0 or higher**. You can check your Node version by running:

```bash
node -v
```

---

## 🚀 1. Creating Your First Project

### Option A: Using `npx` (No Global Install)
The fastest way to start is with `npx layx-css`:

```bash
npx layx-css create my-landing-page
```

*(You can also use `npm create layx my-landing-page`)*

### Option B: Installing Globally
If you plan to build multiple landing pages or prefer having the `layx` command in your terminal everywhere:

```bash
npm install -g layx-css
```

Then simply run:
```bash
layx create my-landing-page
```

---

## 📁 2. Project Directory Structure

Once scaffolded, your new project has the following layout:

```
my-landing-page/
├── assets/
│   ├── brand/               # Brand logos and icons
│   ├── css/
│   │   ├── base.css         # Project-wide custom CSS (loaded after layx)
│   │   └── pages/home.css   # Home page specific CSS
│   ├── font/                # Local web fonts (Red Hat Display preloaded)
│   ├── image/               # Project images and SVG sprites
│   └── js/
│       ├── base.js          # Project-wide custom JS (loaded after layx)
│       └── pages/home.js    # Home page specific JS
├── layx/                    # LayX framework core
│   ├── layx.css             # Framework CSS entry point
│   ├── layx.js              # Framework JS entry point
│   ├── components/          # Active components (button, navbar, footer)
│   ├── main/                # CSS Reset, Typography, Grid, Variables
│   ├── others/              # Active modules (icon, theme)
│   └── utilities/           # CSS utility classes
├── pages/                   # Additional landing sub-pages (e.g., other.html)
├── .vscode/                 # Code snippet definitions for VS Code
├── index.html               # Main landing page entry point
├── package.json             # NPM build and optimization scripts
└── layx.config.mjs          # (Optional) Custom build & optimizer configuration
```

---

## 💻 3. Development Workflow

### Step 1: Navigate and install dependencies
```bash
cd my-landing-page
npm install
```

### Step 2: Open with your local dev server
Open `index.html` with your favorite local server (Live Server, Vite, or local server on port 81):
```bash
# E.g. with npx serve
npx serve .
```

### Step 3: Add components as needed
Your initial project starts lean with essential components (`button`, `navbar`, `footer`) and core modules (`icon`, `theme`).

To add more components or modules:
```bash
# Add components
npx layx add -c accordion carousel

# Add optional modules
npx layx add -o smooth_scroll syntax_highlighter
```

### Step 4: Build for Production
When your landing page is ready to deploy:
```bash
npm run build
```
This produces optimized production bundles, minifies CSS while preserving modern features, converts images to AVIF/WebP, and transforms `index.html` to load production assets.

### Step 5: Restore for Further Development
Need to make changes after a build?
```bash
npm run unbuild
```
Your HTML and assets will be instantly restored to their development source files!

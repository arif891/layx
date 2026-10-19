# LayX Components System

LayX provides a hybrid, modular component architecture designed specifically for high-converting landing pages.

---

## 🧩 Architectural Highlights

- **CSS-First, Zero Runtime**: Most components require zero JavaScript runtime and rely entirely on modern CSS features (`:has()`, `@starting-style`, dynamic viewport units, CSS Grid).
- **Hybrid Registry (Approach 3)**:
  - **Local Package First**: Components are bundled directly in the `layx-css` npm package. Adding them is instantaneous and works 100% offline.
  - **Remote Registry Fallback**: If a component isn't found locally, the CLI transparently checks the remote community registry.
- **Auto-Wiring**: Adding a component automatically updates `@import` in `layx/layx.css` and imports in `layx/layx.js`.

---

## 📄 Component Manifest (`manifest.json`)

Every component folder in `layx/components/<name>/` includes a `manifest.json` describing its entry points, assets, and dependencies.

### Schema:
```json
{
  "name": "Component Name",
  "version": "1.0.0",
  "description": "Short explanation of the component",
  "category": "component",
  "css": [
    "main.css",
    "theme.css"
  ],
  "js": [
    "script.js"
  ],
  "html": [
    "example.html",
    "variant.html"
  ],
  "assets": [
    {
      "from": "assets/sample.webp",
      "to": "assets/image/sample.webp"
    }
  ],
  "dependencies": {
    "components": ["button"],
    "others": ["icon"]
  }
}
```

### Key Properties:
- **`css`** *(array)*: One or more CSS files to be automatically imported into `layx/layx.css` under `/* Components */`.
- **`js`** *(array)*: One or more JS files to be imported into `layx/layx.js`.
- **`html`** *(array)*: One or more HTML example usage files displayed in the terminal upon addition.
- **`assets`** *(array)*: Sample images, videos, or icons copied into the user's `assets/` directory.
- **`dependencies`** *(object)*: Other components or `others` modules automatically installed if not already present.

---

## 📦 Default Components

When a new project is created via `layx create`, it includes three core components:

1. **`button`**: Modern action buttons with primary, secondary, outline, and glow variants.
2. **`navbar`**: Responsive header navigation with center/split layouts, mobile drawer, and theme integration.
3. **`footer`**: Multi-column landing page footer with links, copyright notice, and social icon rows.

*Note: You can customize default components at any time in `src/config/registry.js`.*

---

## 📚 Available Components Directory

| Component | Description | JS Required? | Dependencies |
| :--- | :--- | :---: | :--- |
| **`button`** | Buttons with hover transitions and states | No | None |
| **`navbar`** | Header bar with mobile toggle and variants | Yes | `button`, `icon`, `theme` |
| **`footer`** | Conversion-focused page footer | No | `icon` |
| **`accordion`** | Animated FAQ expand/collapse sections | No | None |
| **`carousel`** | CSS scroll-driven slider/carousel | Yes (`polyfill.js`) | None |
| **`chart`** | Lightweight CSS and canvas charts | Yes | None |
| **`draggable`** | Drag-and-drop container | Yes | None |
| **`form`** | Styled inputs, floating labels, selects | Yes | `button` |
| **`media`** | Video players and image aspect frames | No | None |
| **`sheet`** | Modal bottom-sheet and slide-over panel | Yes | None |

---

## 🛠️ Adding Components

To add components to your project:

```bash
# Add a single component
layx add -c accordion

# Add multiple components simultaneously
layx add -c carousel sheet chart
```

When added, the CLI will:
1. Copy the component folder to `layx/components/<name>/`.
2. Register `@import url(components/<name>/...);` in `layx/layx.css`.
3. Register `import './components/<name>/...';` in `layx/layx.js` (if JS present).
4. Auto-install any listed dependencies.
5. Copy any sample assets.
6. Print the HTML usage snippet directly to your terminal.

# LayX Documentation

Welcome to the official documentation for **LayX** (`layx-css`) — a modern, CSS-first framework and build tool purpose-built for creating blazing-fast, high-converting landing pages.

> [!WARNING]
> **Active Development Preview (Alpha)**
> LayX is currently in its early development stage (`alpha`). APIs, CLI flags, and file conventions may evolve before the stable `1.0.0` release.

---

## 📚 Documentation Index

| Guide | Description |
| :--- | :--- |
| 🚀 **[Getting Started](getting-started.md)** | Installation, scaffolding your first landing page, and project tour. |
| 🛠️ **[CLI Reference](cli-reference.md)** | Detailed guide to all `layx` commands, flags, and interactive menus. |
| 🧩 **[Components System](components.md)** | Core components, `manifest.json` schema, auto-wiring, and usage examples. |
| ⚡ **[Others Modules](others-modules.md)** | Optional UX enhancements (`theme`, `icon`, `smooth_scroll`, `syntax_highlighter`, `pwa`, etc.). |
| 🏗️ **[Build & Bundling Engine](build-system.md)** | Modern CSS preservation, esbuild JS bundling, HTML rewiring, and image optimization. |

---

## 💡 Quick Reference

```bash
# Scaffold a new project
npx layx-css create my-landing-page

# Install CLI globally
npm install -g layx-css

# Launch interactive CLI
layx

# Add components & modules
layx add -c accordion modal
layx add -o smooth_scroll syntax_highlighter

# Production build and unbuild lifecycle
layx build
layx unbuild
```

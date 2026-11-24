# LayX "Others" Modules

The `layx/others/` directory houses optional JavaScript and CSS+JS feature modules that enhance interactivity, user experience, and performance without bloating your core layout CSS.

---

## 🎯 What Are "Others" Modules?

Unlike core layout components (like buttons or grids), `others` are single-purpose interactive features:
- **Zero bloat**: Only modules you need are added to your project.
- **Default essentials**: Projects start with only `icon` and `theme` by default.
- **Auto-wired**: Adding a module wires its CSS into `layx/layx.css` under `/* Other */` and its JS into `layx/layx.js` under `/* Other */`.
- **CSS Layers**: All CSS in `others` is cleanly scoped inside `@layer others;`.

---

## 📦 Default Modules in Starter Projects

1. **`theme`**:
   - Light, dark, and auto/system color scheme switching.
   - Saves user preference to `localStorage`.
   - Toggle buttons using `data-theme-update` or `data-theme-set`.
2. **`icon`**:
   - Inline SVG icon sizing, color inheritance (`fill: currentColor`), and alignment utilities.

---

## 📚 Complete Modules Directory

| Module | Purpose | CSS? | JS? |
| :--- | :--- | :---: | :---: |
| **`theme`** | Light/dark theme toggling and persistence | Yes | Yes |
| **`icon`** | SVG icon sizing and styling utilities | Yes | No |
| **`smooth_scroll`** | Easing momentum smooth scrolling | No | Yes |
| **`syntax_highlighter`** | Client-side code syntax highlighter | Yes | Yes |
| **`split_text`** | Splits text into span tokens for typography animations | No | Yes |
| **`drag_scroll`** | Click-and-drag horizontal/vertical mouse scrolling | No | Yes |
| **`mouse_tracker`** | Exposes CSS mouse coordinates (`--mouse-x`, `--mouse-y`) | No | Yes |
| **`viewport_trigger`** | Adds `visible` attribute when elements enter the screen | No | Yes |
| **`partial_render`** | Dynamic client-side HTML partial fetcher & swapper | No | Yes |
| **`scroll_state`** | Tracks scroll direction and emits state events | No | Yes |
| **`idb`** | Promise-based IndexedDB storage wrapper | No | Yes |
| **`pwa`** | Progressive Web App service worker and offline caching | Yes | Yes |
| **`component`** | Client-side custom component loader | No | Yes |
| **`ai`** | AI streaming and SDK integration helper | No | Yes |

---

## 🛠️ Adding "Others" Modules

### Using the `-o` Flag:
```bash
# Add smooth scrolling
layx add -o smooth_scroll

# Add syntax highlighter and split text
layx add -o syntax_highlighter split_text
```

### Or using `-c` (Intelligent Detection):
The CLI automatically detects if the name is an `others` module:
```bash
layx add -c mouse_tracker
```

---

## 💡 Usage Examples

### 1. Theme Switcher (`theme`)
```html
<!-- Toggle theme button -->
<button data-theme-update="auto">Toggle Theme</button>

<!-- Explicit theme switchers -->
<button data-theme-set="light">Light</button>
<button data-theme-set="dark">Dark</button>
```

### 2. Viewport Trigger (`viewport_trigger`)
```html
<!-- Trigger fade-in when element enters viewport -->
<div data-trigger class="fade-in">
  Content appears on scroll
</div>
```

### 3. Smooth Scroll (`smooth_scroll`)
```html
<a href="#features" data-smooth-scroll>Smooth Scroll to Features</a>
```

### 4. Prototype Component Loader (`component`)
The `component` module is designed for rapid prototype development. It lets you compose reusable HTML components with slots, props, and helpers. When you run `layx build`, all components are **statically baked into standard HTML** and `components-ready` listeners are unwrapped for production!

#### Defining Components (`components.html`):
```html
<!-- Static component -->
<template component="simple-alert">
  <div class="alert alert-info">
    <slot>Default alert message</slot>
  </div>
</template>

<!-- Dynamic component with props & named slot -->
<div component="profile-card" dynamic prop="name, role" class="card">
  <h3 class="card-title">${name}</h3>
  <p class="card-subtitle">${role}</p>
  <div class="card-badge">
    <slot name="badge">Standard User</slot>
  </div>
</div>
```

#### Using Components (`index.html`):
```html
<!-- Static component with custom slot -->
<component src="./components.html" name="simple-alert">
  <strong>Notice:</strong> Prototype preview active!
</component>

<!-- Dynamic component with props and named slot -->
<component src="./components.html" name="profile-card" prop="'Alice', 'Lead Developer'" class="shadow">
  <span slot="badge" class="tag tag-vip">VIP</span>
</component>
```

#### Initializing in Development (`assets/js/base.js`):
```javascript
import Component from '../../layx/others/component/component.js';

new Component({ appName: "Landing Demo" });

// Code wrapped in components-ready is automatically unwrapped at build time!
document.addEventListener('components-ready', () => {
    console.log("Components loaded!");
    initInteractiveWidgets();
});
```

#### Production Build Transformation:
When running `layx build`:
1. `<component>` tags are statically pre-rendered directly into the HTML with attributes merged (`class`, `style`) and slots resolved.
2. `import Component from '...'` and `new Component(...)` are stripped.
3. `document.addEventListener('components-ready', () => { ... })` is unwrapped to top-level code: `initInteractiveWidgets();` runs immediately with **zero runtime overhead**.

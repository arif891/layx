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

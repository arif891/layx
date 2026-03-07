---
name: add_utility
description: Add a new utility class group to the Layx framework (layx/utilities/) following established CSS layer patterns
---

# Adding a New Utility to Layx

Utilities are single-purpose CSS helper classes that live in `layx/utilities/<category>/` and are wrapped in `@layer utilities`.

## Overview

Utilities are the highest-specificity layer in Layx (`@layer utilities` wins over all other layers), making them perfect for one-off overrides without needing `!important`.

**Layer order (low → high):** `base → layout → components → others → utilities`

---

## Step 1: Identify the Right Category

Check if a relevant category folder already exists in `layx/utilities/`:

| Existing Category | Purpose                       |
| ----------------- | ----------------------------- |
| `border/`         | Border styles, widths, radius |
| `color/`          | Text and background colors    |
| `display/`        | display property overrides    |
| `flex/`           | Flexbox helper classes        |
| `grid/`           | Grid helper classes           |
| `height/`         | Height sizing classes         |
| `margin/`         | Margin spacing helpers        |
| `opacity/`        | Opacity level classes         |
| `padding/`        | Padding spacing helpers       |
| `position/`       | position property helpers     |
| `shadow/`         | Box shadow classes            |
| `width/`          | Width sizing classes          |
| `z_index/`        | z-index stacking classes      |

If no relevant category exists → create a new one.

---

## Step 2: Create the Utility CSS File

### Adding to an existing category:
Edit the existing `.css` file in `layx/utilities/<category>/`.

### Creating a new category:
```
layx/utilities/<category>/
└── <category>.css
```

**Template — single-property utilities:**
```css
@layer utilities {
    /* <category> utilities */
    .<prefix>-auto   { <property>: auto; }
    .<prefix>-full   { <property>: 100%; }
    .<prefix>-half   { <property>: 50%; }
    .<prefix>-fit    { <property>: fit-content; }
    .<prefix>-min    { <property>: min-content; }
    .<prefix>-max    { <property>: max-content; }
}
```

**Template — spacing scale utilities (use with margin/padding pattern):**
```css
@layer utilities {
    /* Spacing scale: multiples of --base-space (.5rem) */
    .<prefix>-0  { <property>: 0; }
    .<prefix>-1  { <property>: calc(var(--base-space) * 1);  }   /* .5rem */
    .<prefix>-2  { <property>: calc(var(--base-space) * 2);  }   /* 1rem  */
    .<prefix>-3  { <property>: calc(var(--base-space) * 3);  }   /* 1.5rem */
    .<prefix>-4  { <property>: calc(var(--base-space) * 4);  }   /* 2rem  */
    .<prefix>-6  { <property>: calc(var(--base-space) * 6);  }   /* 3rem  */
    .<prefix>-8  { <property>: calc(var(--base-space) * 8);  }   /* 4rem  */
    .<prefix>-10 { <property>: calc(var(--base-space) * 10); }   /* 5rem  */
    .<prefix>-12 { <property>: calc(var(--base-space) * 12); }   /* 6rem  */
}
```

---

## Step 3: Naming Conventions

Follow these prefix patterns (derived from existing util names):

| Category | Prefix                                  | Example                        |
| -------- | --------------------------------------- | ------------------------------ |
| margin   | `m`, `mt`, `mb`, `ml`, `mr`, `mx`, `my` | `.m-4`, `.mx-2`                |
| padding  | `p`, `pt`, `pb`, `pl`, `pr`, `px`, `py` | `.p-4`, `.py-2`                |
| width    | `w`                                     | `.w-full`, `.w-half`           |
| height   | `h`                                     | `.h-full`, `.h-auto`           |
| opacity  | `opacity`                               | `.opacity-50`                  |
| z-index  | `z`                                     | `.z-10`, `.z-100`              |
| display  | `d`                                     | `.d-flex`, `.d-none`           |
| color    | `color`, `bg`                           | `.color-accent`, `.bg-surface` |

---

## Step 4: Register in layx.css

Open `layx/layx.css` and add the import under `/* Utilities */`:

```css
/* Utilities */
@import url(utilities/<category>/<category>.css);
```

---

## Complete Example: Adding a `cursor` utility

### 1. Create `layx/utilities/cursor/cursor.css`:
```css
@layer utilities {
    .cursor-auto     { cursor: auto; }
    .cursor-default  { cursor: default; }
    .cursor-pointer  { cursor: pointer; }
    .cursor-wait     { cursor: wait; }
    .cursor-text     { cursor: text; }
    .cursor-move     { cursor: move; }
    .cursor-not-allowed { cursor: not-allowed; }
    .cursor-grab     { cursor: grab; }
    .cursor-grabbing { cursor: grabbing; }
    .cursor-none     { cursor: none; }
}
```

### 2. Register in `layx/layx.css`:
```css
/* Utilities */
@import url(utilities/cursor/cursor.css);
```

### 3. Use in HTML:
```html
<button class="cursor-pointer">Click me</button>
<div class="cursor-grab">Drag me</div>
```

---

## Key Rules

1. **Always wrap in `@layer utilities`** — never bare CSS
2. **Use CSS custom properties** where they add value (e.g., `calc(var(--base-space) * N)`)
3. **No `!important`** — the `utilities` layer already wins via cascade
4. **Keep each class single-purpose** — one class, one property (or related group)
5. **Follow existing naming conventions** for consistency

---

## Checklist

- [ ] Category directory exists or was created: `layx/utilities/<category>/`
- [ ] CSS file wrapped in `@layer utilities { ... }`
- [ ] Class names follow existing prefix conventions
- [ ] Uses `var(--base-space)` or other tokens where applicable
- [ ] Imported in `layx/layx.css` under `/* Utilities */`
- [ ] Tested in browser at `localhost:81`

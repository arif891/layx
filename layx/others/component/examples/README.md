# Component System Examples

This folder contains examples demonstrating the usage of the `Component` class defined in `../component.js`.

## Files

- **index.html**: The main entry point loading the examples which covers Static, Dynamic, Nested, Object Props, and Data Table usage.
- **components.html**: A library of HTML templates used by the examples.
- **app.js**: The JavaScript initialization script.

## Key Concepts

### Table & List Rendering (Important)

When rendering loops inside strict HTML elements like `<tbody>`, `<ul>`, or `<select>`, you **must** wrap your `${...}` expression in a `<template>` tag.

**Why?**
Browsers strictly enforce valid HTML structure. If you place text (like `${ list.map(...) }`) directly inside a `<tbody>`, the browser will "hoist" that text out of the table before your component script even runs to process it.

**Correct Pattern:**
```html
<tbody>
    <template>
        ${ list.map(item => `<tr><td>${item}</td></tr>`).join('') }
    </template>
</tbody>
```

The component system automatically removes the `<template>` tags during processing, leaving only the generated rows in the correct position.

## How to Run

Because `component.js` uses `fetch()` to load external templates, you cannot open `index.html` directly from the file system (file:// protocol) due to browser CORS security policies. You must use a local web server.

### Using Node.js (npx)

1. Open your terminal.
2. Navigate to the parent directory: `../` (the directory containing `component.js` and `examples/`).
   ```bash
   cd c:/Project/layx/layx/others/component/
   ```
3. Run a simple http server:
   ```bash
   npx http-server .
   ```
4. Open your browser to:
   [http://localhost:8080/examples/index.html](http://localhost:8080/examples/index.html)

### Using Python

1. Open your terminal.
2. Navigate to the parent directory.
3. Run:
   ```bash
   python -m http.server
   ```
4. Open your browser to:
   [http://localhost:8000/examples/index.html](http://localhost:8000/examples/index.html)

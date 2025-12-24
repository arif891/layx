# SmoothScroll Examples

This folder contains an example demonstrating the usage of `smooth_scroll.js`.

## Files

- **index.html**: A long page demonstrating smooth scrolling behavior, section navigation, and nested native scrolling.
- **app.js**: Initializes the listeners and exposes `scrollTo` methods.

## How to Run

1. Open your terminal.
2. Navigate to the parent directory: `../` (the directory containing `smooth_scroll.js` and `examples/`).
   ```bash
   cd c:/Project/layx/layx/others/smooth_scroll/
   ```
3. Run a simple http server:
   ```bash
   npx http-server .
   ```
4. Open your browser to:
   [http://localhost:8080/examples/index.html](http://localhost:8080/examples/index.html)
   
*(Note: Since SmoothScroll doesn't strictly depend on fetch/XHR, you might be able to run it directly from the file system, but modules usually require a server).*

# LayX Syntax Highlighter (`syntax_highlighter`)

A high-performance, client-side and SSR syntax highlighter for multi-language code blocks, based on the lightweight architecture of [speed-highlight/core](https://github.com/speed-highlight/core).

---

## ✨ Features

- **Fast Registry-Free Tokenizer**: Uses generator-based token streaming (`tokenize`, `tokenizer`) for minimal memory footprint and instant rendering.
- **Up-to-Date Grammars**: Bundles 35+ clean, modern language definitions with full support for template literals, comments, docstrings, and nested grammars.
- **Dual API**: Use functional `speed-highlight/core`-style functions (`highlightHTML`, `highlightElement`, `highlightAll`, `highlightANSI`) or the object/class facade (`SyntaxHighlighter`).
- **Language Auto-Detection**: Automatically identifies languages (`python`, `js`, `html`, `css`, `sql`, `bash`, `json`, etc.) using heuristic scoring.
- **Alias Normalization**: Normalizes aliases out of the box (`javascript` → `js`, `python` → `py`, `c++` → `cpp`, `shell` → `bash`).
- **Accessible UI**: Built-in line numbers, language header badge, and copy-to-clipboard button with screen-reader accessible attributes and feedback.
- **CSS `light-dark()` Theming**: Automatically adapts syntax tokens to the active LayX theme without duplicating stylesheet rules.
- **SSR & Node.js Safe**: Gracefully handles server-side environments without throwing.

---

## 🚀 Quick Start

### 1. HTML Markup

Add `data-code-lang`, `data-lang`, or standard `class="language-*"` / `class="shj-lang-*"`:

```html
<!-- Explicit language via data attribute -->
<div data-code-lang="js">
const greeting = "Hello, LayX!";
console.log(greeting);
</div>

<!-- Markdown-style pre > code -->
<pre><code class="language-python">
def greet(name):
    print(f"Hello, {name}!")
</code></pre>

<!-- Auto-detection -->
<pre data-code-lang="auto">
SELECT id, name, email FROM users WHERE active = 1;
</pre>
```

Include CSS and script:

```html
<link rel="stylesheet" href="syntax_highlighter.css">
<script type="module" src="syntax_highlighter.js"></script>
```

---

## 💻 Programmatic API

### Functional (speed-highlight compatible)

```javascript
import {
  highlightHTML,
  highlightElement,
  highlightAll,
  highlightANSI,
  tokenize,
  detectLanguage,
  setLoader
} from './layx/others/syntax_highlighter/syntax_highlighter.js';

// 1. Highlight code string to HTML
const html = await highlightHTML('const x = 42;', 'js');

// 2. Highlight a specific DOM element
await highlightElement(document.querySelector('#my-code'), 'py');

// 3. Highlight all matching blocks on the page
await highlightAll();

// 4. Highlight for terminal output (ANSI)
const ansi = await highlightANSI('console.log("hi")', 'js', { kwd: '\x1b[35m' });

// 5. Detect code language
const lang = detectLanguage('SELECT * FROM users'); // -> "sql"
```

### Class / Facade API

```javascript
import SyntaxHighlighter from './layx/others/syntax_highlighter/syntax_highlighter.js';

// Static methods
const html = await SyntaxHighlighter.highlight(`const count = 42;`, 'js');
await SyntaxHighlighter.highlightAll();

// Custom grammar registration
SyntaxHighlighter.register('my-dsl', [
  { match: /\b(rule|when|then)\b/g, type: 'kwd' },
  { expand: 'str' },
  { expand: 'num' },
]);
```

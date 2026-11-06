# LayX Syntax Highlighter (`syntax_highlighter`)

A high-performance, client-side syntax highlighter for multi-language code blocks, based on the lightweight architecture of [speed-highlight/core](https://github.com/speed-highlight/core).

---

## ✨ Features

- **Fast Registry-Free Tokenizer**: Uses generator-based token streaming for minimal memory footprint and fast rendering.
- **Language Auto-Detection**: Automatically identifies languages (`python`, `js`, `html`, `css`, `sql`, etc.) using heuristic scoring.
- **Alias Normalization**: Supports common aliases out of the box (`javascript` $\rightarrow$ `js`, `python` $\rightarrow$ `py`, `c++` $\rightarrow$ `cpp`, `shell` $\rightarrow$ `bash`).
- **Accessible Copy Button**: Copy-to-clipboard with visual feedback and screen-reader `aria-label` announcements.
- **Line Numbers**: Counter-based gutter lines that adapt dynamically to line wraps.
- **CSS `light-dark()` Theming**: Automatically adapts syntax tokens to the active LayX theme without duplicating stylesheet rules.
- **SSR & Node.js Safe**: Gracefully handles server-side environments.

---

## 🚀 Quick Start

### 1. HTML Markup

Add `data-code-lang` or standard markdown `class="language-*"` to your code blocks:

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

Include the CSS and script:

```html
<link rel="stylesheet" href="syntax_highlighter.css">
<script type="module" src="syntax_highlighter.js"></script>
```

---

## 💻 Programmatic API

```javascript
import { SyntaxHighlighter } from './layx/others/syntax_highlighter/syntax_highlighter.js';

// 1. Highlight a code string directly
const html = await SyntaxHighlighter.highlight(`const count = 42;`, 'js');

// 2. Highlight a specific DOM element
const codeElement = document.querySelector('#my-snippet');
await SyntaxHighlighter.highlightElement(codeElement);

// 3. Highlight all matching elements
await SyntaxHighlighter.highlightAll('.code-snippet');

// 4. Auto-detect code language
const lang = SyntaxHighlighter.detect(`def add(a, b): return a + b`); // 'py'

// 5. Register custom language grammar
SyntaxHighlighter.register('my-lang', [
    { match: /\b(foo|bar|baz)\b/g, type: 'kwd' },
    { expand: 'str' },
    { expand: 'num' }
]);
```

---

## ⚙️ Options

```javascript
await SyntaxHighlighter.highlightAll(null, {
    lineNumbers: true,   // Display line numbering gutter (default: true)
    copyButton: true,    // Include copy to clipboard button (default: true)
    header: true,        // Show language badge header (default: true)
    autoDetect: true,    // Auto-detect language if unspecified (default: true)
    multiline: true      // Force multiline layout (auto-determined if omitted)
});
```

---

## 🎨 Token Styling Classes

| Class | Highlighted Token |
| :--- | :--- |
| `.kwd` | Keywords (`const`, `function`, `if`, `class`, `import`) |
| `.num` | Numbers (`42`, `3.14`, `0xff`) |
| `.str` | Strings (`"hello"`, `'world'`) |
| `.bool` | Booleans and nulls (`true`, `false`, `null`, `undefined`) |
| `.type` | Types and interfaces (`string`, `number`, `Promise`) |
| `.func` | Function names and calls |
| `.cmnt` | Comments (`//`, `/* */`, `#`) |
| `.oper` | Operators (`+`, `-`, `=`, `=>`) |
| `.var` | Variables and identifiers |
| `.class` | Class names |

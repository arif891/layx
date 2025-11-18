# Layx

![Layx Social Preview](.github/layx_social_preview.png)

Layx is a powerful and extensible CSS framework designed specifically for creating modern landing pages. It combines advanced layout capabilities with high customizability, making it ideal for building high-converting, responsive landing pages with minimal effort. With its modular architecture and landing-page-focused components, Layx helps you create stunning, fast-loading pages that deliver results.

> **Main Point:** "Build stunning landing pages faster. No bloat, no runtime overhead—just pure performance."

## ✨ Highlights

- 🚫 **Zero Runtime** - No JavaScript dependencies required
- 📦 **Landing Page Ready** - Pre-built components optimized for conversions
- 🎨 **Highly Customizable** - Easy theming with CSS variables
- ⚡ **Lightning Fast** - Optimized for performance and SEO
- 📱 **Mobile-First** - Fully responsive designs that look perfect on all devices

> **Note:** Layx is currently in the development stage and available for testing. We welcome your feedback and contributions!

## Table of Contents

- [Layx](#layx)
  - [✨ Highlights](#-highlights)
  - [Table of Contents](#table-of-contents)
  - [🚀 Key Features](#-key-features)
  - [🧠 Approach](#-approach)
  - [💡 Why Start from Scratch?](#-why-start-from-scratch)
  - [🎨 Syntax](#-syntax)
    - [Container](#container)
    - [Main Layout System](#main-layout-system)
    - [Components (e.g., Navbar)](#components-eg-navbar)
  - [📁 Project Structure](#-project-structure)
  - [Installation](#installation)
  - [🚀 Quick Start Guide](#-quick-start-guide)
  - [📚 Documentation](#-documentation)
  - [🤝 Contributing](#-contributing)
  - [📄 License](#-license)

## 🚀 Key Features

- 📦 **Landing Page Components:** Pre-designed, conversion-focused components like hero sections, CTAs, testimonials, and pricing tables.
- 🎨 **Rapid Development:** Build complete landing pages in minutes, not days.
- 📱 **Fully Responsive:** Mobile-optimized layouts that adapt perfectly to any screen size.
- ⚡ **Performance Optimized:** Lightweight CSS and zero runtime overhead for blazing-fast load times.
- 🔧 **Built-in Sections:** Hero, features, pricing, testimonials, FAQ, footer—everything you need.
- 🛠️ **Build Tool:** Bundle your project and remove unused code for optimal file size.
- 🖼️ **Image Optimization:** Boost performance with the integrated image optimizer.
- 💻 **Command-Line Interface (CLI):** Efficiently manage your landing page projects with our intuitive CLI.
- 🚀 **SEO Ready:** Semantic HTML and optimized structure for search engines.
- 🌐 **File-Based Routing:** File-based routing supported in Apache and similar servers like LightSpeed (common in Cpanel hosting).

## 🧠 Approach

Layx is purpose-built for landing pages with a focus on conversion and performance:

- **Landing Page Optimized:** Purpose-built components designed for high-conversion landing pages, not general web apps.
- **Performance First:** Leverages modern CSS without JavaScript runtime, ensuring lightning-fast load times.
- **Conversion Focused:** Pre-designed sections and patterns that follow landing page best practices.
- **Full-Width Designs:** Layout and container elements that extend to screen edges for modern aesthetics.
- **Zero Bloat:** Only what you need—no unnecessary features or code.
- **SEO Friendly:** Built with semantic HTML and structured data in mind.

## 💡 Why Start from Scratch?

With Layx, you don't build from zero:

- **Pre-Built Starting Point:** Every project comes with a ready-to-use structure, components, and best practices already in place.
- **Automated Optimizations:** The built-in build tool automatically minifies CSS/JS, optimizes images, and removes unused code—no manual setup needed.
- **Repetitive Tasks Handled:** Stop writing boilerplate code. Layx handles responsive design, cross-browser compatibility, and SEO optimization out of the box.
- **Convention Over Configuration:** Follow proven patterns and conventions, allowing you to focus on your unique content and design tweaks, not infrastructure.
- **Ready for Production:** Deploy with confidence—your landing page is already optimized for performance, accessibility, and conversions.

## 🎨 Syntax

Layx introduces intuitive syntax for common landing page elements:

### Container

```html
<container>
   <div class='content'></div>
</container>
```

### Main Layout System

```html
<layout>
  <div class='x-6'></div>
  <div class='x-6'></div>
</layout>
```

### Components (e.g., Navbar)

```html
<navbar>
  <nav class='link-wrapper'>
    <a class='link' href='#'>link</a>
    <a class='link' href='#'>link</a>
  </nav>
</navbar>
```

## 📁 Project Structure

Layx is organized into a well-structured directory hierarchy:

<details>
<summary>Click to expand project structure</summary>

```
root
    │   index.html
    │   layx.bat
    │
    ├───assets
    │   ├───brand
    │   ├───css
    │   │   │   base.css
    │   │   └───pages
    │   │
    │   ├───font
    │   ├───images
    │   │   ├───home
    │   │   └───svg
    │   │
    │   ├───js
    │   │   │   base.js
    │   │   └───pages
    │   │
    │   └───media
    │       ├───audio
    │       └───video
    │
    ├───config
    │   │   config.mjs
    │   │   node
    │   │   webp
    │   └───preference
    │           snippets.json
    │
    ├───layx
    │   │   layx.css
    │   │   layx.js
    │   │ 
    │   ├───assets
    │   │   ├───css
    │   │   │   └───pages
    │   │   └───js
    │   │  
    │   ├───components
    │   ├───main
    │   │   main.css
    │   ├───others
    │   └───utilities
    │
    └───pages
```

</details>

Key directories:

- `layx/`: The core of the framework, including components, main styles, and utilities.
- `config/`: Holds configuration files, tools and preferences.
- `assets/`: Here you can put your all assets like CSS, JS, images, and media files.
- `assets/[css|js]/base.[css|js]`: Here you can write your base CSS and JS which are common, it will be added after `layx`
   CSS or JS in build time. This original CSS or JS file will be moved inside `layx/assets/[css|js]/user_base.[css|js]`.
- `assets/[css|js]/pages/`: For page-specific content. Inside this dir all CSS and JS file will be minified and original one
  moved to `layx/assets/[css|js]/pages/`.

## Installation

To install Layx on your system:

1. Download the Layx setup file from our [download](https://layx.xyz/download) page.
2. Extract the contents of the ZIP file.
3. Open a terminal or command prompt and navigate to the extracted directory.
4. Run the following command or click `layx.bat`:

    ```bash
    layx install
    ```

    <strong>Note:</strong> On Linux and macOS, before installation, you need to run <code>chmod +x ./layx.sh</code> to
            make it executable. Once installed, all commands remain the same.

## 🚀 Quick Start Guide

1. **Create a New Landing Page:**
   Open your terminal, navigate to your desired folder, and run:

   ```bash
   layx create
   ```

2. **Start Building:**
   Dive into your new project and begin designing your landing page!

3. **Build Your Project:**
   When you're ready to deploy, run:

   ```bash
   layx build
   ```

4. **Modify Your Project After Build:**
   Need to make changes? Use the `unbuild` command:

   ```bash
   layx unbuild
   ```

## 📚 Documentation

For comprehensive guides and API references, visit our [official documentation](https://layx.xyz/pages/docs/getting_started/introduction.html).

## 🤝 Contributing

We welcome contributions of all kinds! To get started, please read our [Contributing Guide](https://layx.xyz/docs/about/contributing).

## 📄 License

Layx is open source software [licensed as MIT](LICENSE).

---

⭐ If you find Layx helpful, consider giving it a star on GitHub!

[Report Bug](https://github.com/arif891/Layx/issues) · [Request Feature](https://github.com/arif891/Layx/issues) · [Join our Community](https://discord.gg/layx)

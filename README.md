# Layx

![Layx Social Preview](.github/layx_social_preview.png)

Layx is a powerful and extensible CSS framework designed for modern web development. It combines advanced layout capabilities with high customizability, making it ideal for both small and large-scale projects. With its modular architecture, Layx offers the flexibility you need to create responsive, scalable, and maintainable web applications.

 **Main Point:** "Don't write common code ever and ever, write unique code, build unique things."

> **Note:** Layx is currently in the development stage and available for testing. We welcome your feedback and contributions!

## Table of Contents

- [Layx](#layx)
  - [Table of Contents](#table-of-contents)
  - [🚀 Key Features](#-key-features)
  - [🧠 Approach](#-approach)
  - [🎨 Syntax](#-syntax)
    - [Container](#container)
    - [Main Layout System](#main-layout-system)
    - [Components (e.g., Navbar)](#components-eg-navbar)
  - [📁 Project Structure](#-project-structure)
  - [🛠️ Installation](#️-installation)
  - [🚀 Quick Start Guide](#-quick-start-guide)
  - [📚 Documentation](#-documentation)
  - [🤝 Contributing](#-contributing)
  - [📄 License](#-license)

## 🚀 Key Features

- 📦 **Modular CSS Architecture:** Organize your styles into reusable modules for better maintainability.
- 🎨 **Customizable Components:** Tailor components to fit your project's unique design and functionality needs.
- 📱 **Responsive Grid System:** Build fluid layouts that adapt seamlessly to any screen size.
- ⚡ **Utility-First Classes:** Speed up your development workflow with a comprehensive set of utility classes.
- 🔧 **Built-in JavaScript Components:** Enhance your layouts with interactive features using pre-built JS components.
- 🖼️ **Image Optimization:** Boost performance with the integrated image optimizer.
- 💻 **Command-Line Interface (CLI):** Efficiently manage your projects with our intuitive CLI.
- 🚀 **No Runtime Needed:** Enjoy optimal performance without any runtime dependencies.
- 🌐 **File-Based Routing:** File-based routing supported in Apache and similar servers like LightSpeed (common in Cpanel hosting).

## 🧠 Approach

Layx takes inspiration from Bootstrap but adopts a more modern and modular approach:

- **Advanced Layout System:** Utilizes CSS Grid instead of hard-coded numbers, offering greater flexibility and customization.
- **Highly Customizable:** Easily modify layouts using CSS classes and variables.
- **Full-Width Designs:** Layout and container elements can effortlessly extend to screen edges.
- **Modern Web Standards:** Built with the latest CSS features for optimal performance and design capabilities.
- **Zero Runtime Overhead:** Unlike some frameworks, Layx doesn't require any JavaScript runtime, ensuring faster load times and better performance.

## 🎨 Syntax

Layx introduces intuitive syntax for common layout elements:

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

## 🛠️ Installation

To install Layx on your Windows system:

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

1. **Create a New Project:**
   Open your terminal, navigate to your desired folder, and run:

   ```bash
   layx create
   ```

2. **Start Coding:**
   Dive into your new project directory and begin building!

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

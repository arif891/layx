import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Root of the installed layx-css npm package
export const packageRoot = path.resolve(__dirname, '../../');

// Working directory where user executes layx commands
export const projectRoot = process.cwd();

// Standard project directory layout
export const projectPaths = {
    root: projectRoot,
    layx: path.join(projectRoot, 'layx'),
    assets: path.join(projectRoot, 'assets'),
    pages: path.join(projectRoot, 'pages'),
    config: path.join(projectRoot, 'layx.config.mjs'),
    indexHtml: path.join(projectRoot, 'index.html'),

    // Assets subdirectories
    css: path.join(projectRoot, 'assets/css'),
    js: path.join(projectRoot, 'assets/js'),
    image: path.join(projectRoot, 'assets/image'),
    font: path.join(projectRoot, 'assets/font'),

    // Page-specific assets
    pagesCss: path.join(projectRoot, 'assets/css/pages'),
    pagesJs: path.join(projectRoot, 'assets/js/pages'),

    // Core entry files
    layxCss: path.join(projectRoot, 'layx/layx.css'),
    layxJs: path.join(projectRoot, 'layx/layx.js'),
    baseCss: path.join(projectRoot, 'assets/css/base.css'),
    baseJs: path.join(projectRoot, 'assets/js/base.js')
};

// Package internal assets
export const packagePaths = {
    template: path.join(packageRoot, 'template'),
    framework: path.join(packageRoot, 'layx'),
    snippets: path.join(packageRoot, 'src/config/syntax/layx.code-snippets'),
    fontInfo: path.join(packageRoot, 'src/info/font_info_GF.json')
};

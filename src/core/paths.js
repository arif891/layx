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
    config: path.join(projectRoot, 'config.mjs'),
    indexHtml: path.join(projectRoot, 'index.html'),
    buildState: path.join(projectRoot, 'layx/assets/build_info.json'),

    // Assets subdirectories
    css: path.join(projectRoot, 'assets/css'),
    js: path.join(projectRoot, 'assets/js'),
    image: path.join(projectRoot, 'assets/image'),
    font: path.join(projectRoot, 'assets/font'),

    // Page-specific assets
    pagesCss: path.join(projectRoot, 'assets/css/pages'),
    pagesJs: path.join(projectRoot, 'assets/js/pages'),

    // Layx backup output locations (used during build & unbuild)
    layxAssets: path.join(projectRoot, 'layx/assets'),
    userBaseCss: path.join(projectRoot, 'layx/assets/css/user_base.css'),
    userBaseJs: path.join(projectRoot, 'layx/assets/js/user_base.js'),
    layxBaseCssOut: path.join(projectRoot, 'layx/assets/css/base.css'),
    layxBaseJsOut: path.join(projectRoot, 'layx/assets/js/base.js'),
    layxPagesCssOut: path.join(projectRoot, 'layx/assets/css/pages'),
    layxPagesJsOut: path.join(projectRoot, 'layx/assets/js/pages'),
    layxImagesOut: path.join(projectRoot, 'layx/assets/image'),

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

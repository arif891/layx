export const registryConfig = {
    /**
     * Components included by default when scaffolding a new project via `layx create`.
     * You can edit this list anytime to add or remove default components.
     */
    defaultComponents: ['button', 'navbar', 'footer'],

    /**
     * Optional 'others' feature modules included by default when scaffolding a new project.
     * Only 'icon' and 'theme' are included by default.
     * You can edit this list anytime to configure default modules.
     */
    defaultOthers: ['icon', 'theme'],

    /**
     * Remote registry fallback for community or newly published components
     */
    remoteRegistryUrl: 'https://raw.githubusercontent.com/arif891/layx_components/main/',

    /**
     * Component registry mappings (CSS entry, JS entry, and HTML usage example)
     */
    components: {
        button: {
            name: 'Button',
            css: 'components/button/button.css',
            html: 'components/button/button.html'
        },
        navbar: {
            name: 'Navbar',
            css: 'components/navbar/normal/center/navbar.css',
            js: 'components/navbar/navbar.js',
            html: 'components/navbar/normal/center/navbar.html'
        },
        footer: {
            name: 'Footer',
            css: 'components/footer/footer.css',
            html: 'components/footer/footer.html'
        },
        accordion: {
            name: 'Accordion',
            css: 'components/accordion/accordion.css',
            html: 'components/accordion/accordion.html'
        },
        carousel: {
            name: 'Carousel',
            css: 'components/carousel/carousel.css',
            js: 'components/carousel/polyfill.js',
            html: 'components/carousel/carousel.html'
        },
        chart: {
            name: 'Chart',
            css: 'components/chart/chart.css',
            js: 'components/chart/chart.js',
            html: 'components/chart/chart.html'
        },
        draggable: {
            name: 'Draggable',
            css: 'components/draggable/draggable.css',
            js: 'components/draggable/draggable.js',
            html: 'components/draggable/draggable.html'
        },
        form: {
            name: 'Form',
            css: 'components/form/form.css',
            html: 'components/form/form.html'
        },
        media: {
            name: 'Media',
            css: 'components/media/media.css',
            html: 'components/media/media.html'
        },
        sheet: {
            name: 'Sheet',
            css: 'components/sheet/sheet.css',
            js: 'components/sheet/sheet.js',
            html: 'components/sheet/sheet.html'
        }
    },

    /**
     * Others modules registry mappings
     */
    others: {
        icon: {
            name: 'Icon',
            css: 'others/icon/icon.css',
            html: 'others/icon/icon.html'
        },
        theme: {
            name: 'Theme',
            css: 'others/theme/theme.css',
            js: 'others/theme/theme.js',
            html: 'others/theme/theme.html'
        },
        drag_scroll: {
            name: 'Drag Scroll',
            js: 'others/drag_scroll/drag_scroll.js',
            html: 'others/drag_scroll/drag_scroll.html'
        },
        mouse_tracker: {
            name: 'Mouse Tracker',
            js: 'others/mouse_tracker/mouse_tracker.js',
            html: 'others/mouse_tracker/examples/mouse_tracker.html'
        },
        partial_render: {
            name: 'Partial Render',
            js: 'others/partial_render/partial_render.js',
            html: 'others/partial_render/partial_render.html'
        },
        scroll_state: {
            name: 'Scroll State',
            js: 'others/scroll_state/scroll_state.js'
        },
        smooth_scroll: {
            name: 'Smooth Scroll',
            js: 'others/smooth_scroll/smooth_scroll.js',
            html: 'others/smooth_scroll/examples/index.html'
        },
        split_text: {
            name: 'Split Text',
            js: 'others/split_text/split_text.js'
        },
        syntax_highlighter: {
            name: 'Syntax Highlighter',
            css: 'others/syntax_highlighter/syntax_highlighter.css',
            js: 'others/syntax_highlighter/syntax_highlighter.js',
            html: 'others/syntax_highlighter/examples/index.html'
        },
        viewport_trigger: {
            name: 'Viewport Trigger',
            js: 'others/viewport_trigger/viewport_trigger.js',
            html: 'others/viewport_trigger/viewport_trigger.html'
        },
        idb: {
            name: 'IndexedDB',
            js: 'others/idb/idb.js'
        },
        pwa: {
            name: 'PWA',
            css: 'others/pwa/assets/pwa.css',
            js: 'others/pwa/assets/pwa.js'
        },
        ai: {
            name: 'AI SDK',
            js: 'others/ai/sdk'
        },
        component: {
            name: 'Component Loader',
            js: 'others/component/component.js',
            html: 'others/component/examples/components.html'
        }
    }
};

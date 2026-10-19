export const registryConfig = {
    /**
     * Components included by default when scaffolding a new project via `layx create`.
     * You can edit this list anytime to add or remove default components.
     */
    defaultComponents: ['button', 'navbar', 'footer'],

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
    }
};

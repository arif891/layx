// Local 
const layx = {
    directories: {
        base: './',
        config: 'config/',
        info: 'info/',
        syntax: 'config/syntax/',
        assets: 'assets/',
        css: 'assets/css/',
        js: 'assets/js/',
        images: 'assets/image/',
        layx: 'layx/',
        layxAssets: 'layx/assets/',
        layxCss: 'layx/assets/css/',
        layxJs: 'layx/assets/js/',
        pages: 'pages/',
        pagesCss: 'assets/css/pages/',
        pagesJs: 'assets/js/pages/',
        pagesCssOut: 'layx/assets/css/pages/',
        pagesJsOut: 'layx/assets/js/pages/'
    },
    files: {
        baseCss:  'assets/css/base.css',
        baseJs: 'assets/js/base.js',
        baseCssOut: 'layx/assets/css/user_base.css',
        baseJsOut:  'layx/assets/js/user_base.js',
        layxCss:  'layx/layx.css',
        layxJs: 'layx/layx.js',
        layxCssOut: 'layx/assets/css/base.css',
        layxJsOut:  'layx/assets/js/base.js',
        buildInfo: 'layx/assets/build_info.json',
        fontInfo: 'config/info/font_info_GF.js'
    },
    main: {

    },
    components: {

    },
    utilities: {

    },
    others: {

    },
    helpers: {
        layout: {

        }
    }
};

const breakPoints = {
    sm: { media: '(width >= 576px)', value: '576px' },
    md: { media: '(width >= 768px)', value: '768px' },
    lg: { media: '(width >= 992px)', value: '992px' },
    xl: { media: '(width >= 1200px)', value: '1200px' },
    xxl: { media: '(width >= 1400px)', value: '1400px' },
    xxxl: { media: '(width >= 1800px)', value: '1800px' },
    wd: { media: '(aspect-ratio >= 16 / 9) and (width >= 1800px)', value: '16 / 9' },
    uwd: { media: '(aspect-ratio >= 21 / 9) and (width >= 2000px)', value: '21 / 9' },
    suwd: { media: '(aspect-ratio >= 32 / 9) and (width >= 3000px)', value: '32 / 9' },
};

const layout = {
    templates: {
        x: '.x-${num}{grid-column-end: span ${num};}',
        xs: '.xs-${num}{grid-column-start: ${num};}',
        y: '.y-${num}{grid-row-end:span ${num}}',
        ys: '.ys-${num}{grid-row-start: ${num}}',
        media: {
            x: '.x-${media}-${num}{grid-column-end: span ${num};}',
            xs: '.xs-${media}-${num}{grid-column-start: ${num};}',
            y: '.y-${media}-${num}{grid-row-end:span ${num}}',
            ys: '.ys-${media}-${num}{grid-row-start: ${num}}',
        },
        static: '\\/\\*<${class}>\\*\\/(.*?)\\/\\*<\\/${class}>\\*\\/'
    },
    helper: {
        templates: {
            numx: '.num-x-${num}{--num-x: ${num}}',
            numy: '.num-y-${num}{--num-y: ${num}}',
            media: {
                numx: '.num-x-${media}-${num}{--num-x: ${num}}',
                numy: '.num-y-${media}-${num}{--num-y: ${num}}'
            }
        }
    }
};

export {layx, breakPoints, layout}
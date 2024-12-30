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
    base: 'layout,.layout{display:grid;grid-template-columns:repeat(var(--num-x,12),1fr);grid-template-rows:repeat(var(--num-y,none),1fr);gap:var(--gap-y,0) var(--gap-x,0);&:not([class*="num-x-"]):not(:has([class*="x-"])){grid-template-columns:repeat(auto-fit,minmax(300px,1fr))}&.edge{--edge-offset-x:.75rem;grid-template-columns:calc(var(--edge-offset-x) - var(--gap-x,0)) repeat(var(--num-x,12),1fr) calc(var(--edge-offset-x) - var(--gap-x,0));@media (width>=576px){--edge-offset-x:2.5%!important}@media (width>=992px){--edge-offset-x:5%!important}@media (aspect-ratio>=21/9) and (width>=2000px){--edge-offset-x:15%!important}@media (aspect-ratio>=32/9) and (width>=3000px){--edge-offset-x:25%!important}}.sub,.sub-x,.sub-y{display:grid}.sub{grid-template-columns:subgrid;grid-template-rows:subgrid}.sub-x{grid-template-columns:subgrid}.sub-y{grid-template-rows:subgrid}}',
    gap: 'layout,.layout{&.gap-x,&.gap{--gap-x:clamp(.2rem,1vw,1rem)}&.gap-x-2,&.gap-2{--gap-x:clamp(.4rem,2vw,2rem)}&.gap-x-3,&.gap-3{--gap-x:clamp(.6rem,3vw,3rem)}&.gap-x-4,&.gap-4{--gap-x:clamp(.8rem,4vw,4rem)}&.gap-x-5,&.gap-5{--gap-x:clamp(1rem,5vw,5rem)}&.gap-y,&.gap{--gap-y:clamp(.2rem,1vh,1rem)}&.gap-y-2,&.gap-2{--gap-y:clamp(.4rem,2vh,2rem)}&.gap-y-3,&.gap-3{--gap-y:clamp(.6rem,3vh,3rem)}&.gap-y-4,&.gap-4{--gap-y:clamp(.8rem,4vh,4rem)}&.gap-y-5,&.gap-5{--gap-y:clamp(1rem,5vh,5rem)}}',
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
// Local 
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
    base: 'layout,.layout{display:grid;grid-template-columns:repeat(var(--num-x,12),1fr);grid-template-rows:repeat(var(--num-y,none),1fr);gap:var(--gap-y) var(--gap-x);&.edge{--edge-offset-x:.75rem;grid-template-columns:calc(var(--edge-offset-x) - var(--gap-x,0)) repeat(var(--num-x,12),1fr) calc(var(--edge-offset-x) - var(--gap-x,0));@media (width>=576px){--edge-offset-x:2.5%}@media (width>=992px){--edge-offset-x:5%}@media (aspect-ratio>=21/9) and (width>=2000px){--edge-offset-x:15%}@media (aspect-ratio>=32/9) and (width>=3000px){--edge-offset-x:25%}}.sub,.sub-x,.sub-y{display:grid}.sub{grid-template-columns:subgrid;grid-template-rows:subgrid}.sub-x{grid-template-columns:subgrid}.sub-y{grid-template-rows:subgrid}}.x-1{grid-column-end:span 1}.x-2{grid-column-end:span 2}.x-3{grid-column-end:span 3}.x-4{grid-column-end:span 4}.x-5{grid-column-end:span 5}.x-6{grid-column-end:span 6}.x-7{grid-column-end:span 7}.x-8{grid-column-end:span 8}.x-9{grid-column-end:span 9}.x-10{grid-column-end:span 10}.x-11{grid-column-end:span 11}.x-12{grid-column-end:span 12}.x-13{grid-column-end:span 13}.x-14{grid-column-end:span 14}.xs-1{grid-column-start:1}.xs-2{grid-column-start:2}.xs-3{grid-column-start:3}.xs-4{grid-column-start:4}.xs-5{grid-column-start:5}.xs-6{grid-column-start:6}.xs-7{grid-column-start:7}.xs-8{grid-column-start:8}.xs-9{grid-column-start:9}.xs-10{grid-column-start:10}.xs-11{grid-column-start:11}.xs-12{grid-column-start:12}.xs-13{grid-column-start:13}.xs-14{grid-column-start:14}.y-1{grid-row-end:span 1}.y-2{grid-row-end:span 2}.y-3{grid-row-end:span 3}.y-4{grid-row-end:span 4}.y-5{grid-row-end:span 5}.y-6{grid-row-end:span 6}.ys-1{grid-row-start:1}.ys-2{grid-row-start:2}.ys-3{grid-row-start:3}.ys-4{grid-row-start:4}.ys-5{grid-row-start:5}.ys-6{grid-row-start:6}',
    media: {
        sm: {
            x: '@media (width>=576px){.x-sm-1{grid-column-end:span 1}.x-sm-2{grid-column-end:span 2}.x-sm-3{grid-column-end:span 3}.x-sm-4{grid-column-end:span 4}.x-sm-5{grid-column-end:span 5}.x-sm-6{grid-column-end:span 6}.x-sm-7{grid-column-end:span 7}.x-sm-8{grid-column-end:span 8}.x-sm-9{grid-column-end:span 9}.x-sm-10{grid-column-end:span 10}.x-sm-11{grid-column-end:span 11}.x-sm-12{grid-column-end:span 12}.x-sm-13{grid-column-end:span 13}.x-sm-14{grid-column-end:span 14}}',
            xs: '@media (width>=576px){.xs-sm-1{grid-column-start:1}.xs-sm-2{grid-column-start:2}.xs-sm-3{grid-column-start:3}.xs-sm-4{grid-column-start:4}.xs-sm-5{grid-column-start:5}.xs-sm-6{grid-column-start:6}.xs-sm-7{grid-column-start:7}.xs-sm-8{grid-column-start:8}.xs-sm-9{grid-column-start:9}.xs-sm-10{grid-column-start:10}.xs-sm-11{grid-column-start:11}.xs-sm-12{grid-column-start:12}.xs-sm-13{grid-column-start:13}.xs-sm-14{grid-column-start:14}}'
        },
        md: {
            x: '@media (width>=768px){.x-md-1{grid-column-end:span 1}.x-md-2{grid-column-end:span 2}.x-md-3{grid-column-end:span 3}.x-md-4{grid-column-end:span 4}.x-md-5{grid-column-end:span 5}.x-md-6{grid-column-end:span 6}.x-md-7{grid-column-end:span 7}.x-md-8{grid-column-end:span 8}.x-md-9{grid-column-end:span 9}.x-md-10{grid-column-end:span 10}.x-md-11{grid-column-end:span 11}.x-md-12{grid-column-end:span 12}.x-md-13{grid-column-end:span 13}.x-md-14{grid-column-end:span 14}}',
            xs: '@media (width>=768px){.xs-md-1{grid-column-start:1}.xs-md-2{grid-column-start:2}.xs-md-3{grid-column-start:3}.xs-md-4{grid-column-start:4}.xs-md-5{grid-column-start:5}.xs-md-6{grid-column-start:6}.xs-md-7{grid-column-start:7}.xs-md-8{grid-column-start:8}.xs-md-9{grid-column-start:9}.xs-md-10{grid-column-start:10}.xs-md-11{grid-column-start:11}.xs-md-12{grid-column-start:12}.xs-md-13{grid-column-start:13}.xs-md-14{grid-column-start:14}}'
        },
        lg: {
            x: '@media (width>=992px){.x-lg-1{grid-column-end:span 1}.x-lg-2{grid-column-end:span 2}.x-lg-3{grid-column-end:span 3}.x-lg-4{grid-column-end:span 4}.x-lg-5{grid-column-end:span 5}.x-lg-6{grid-column-end:span 6}.x-lg-7{grid-column-end:span 7}.x-lg-8{grid-column-end:span 8}.x-lg-9{grid-column-end:span 9}.x-lg-10{grid-column-end:span 10}.x-lg-11{grid-column-end:span 11}.x-lg-12{grid-column-end:span 12}.x-lg-13{grid-column-end:span 13}.x-lg-14{grid-column-end:span 14}}',
            xs: '@media (width>=992px){.xs-lg-1{grid-column-start:1}.xs-lg-2{grid-column-start:2}.xs-lg-3{grid-column-start:3}.xs-lg-4{grid-column-start:4}.xs-lg-5{grid-column-start:5}.xs-lg-6{grid-column-start:6}.xs-lg-7{grid-column-start:7}.xs-lg-8{grid-column-start:8}.xs-lg-9{grid-column-start:9}.xs-lg-10{grid-column-start:10}.xs-lg-11{grid-column-start:11}.xs-lg-12{grid-column-start:12}.xs-lg-13{grid-column-start:13}.xs-lg-14{grid-column-start:14}}'
        },
        xl: {
            x: '@media (width>=1200px){.x-xl-1{grid-column-end:span 1}.x-xl-2{grid-column-end:span 2}.x-xl-3{grid-column-end:span 3}.x-xl-4{grid-column-end:span 4}.x-xl-5{grid-column-end:span 5}.x-xl-6{grid-column-end:span 6}.x-xl-7{grid-column-end:span 7}.x-xl-8{grid-column-end:span 8}.x-xl-9{grid-column-end:span 9}.x-xl-10{grid-column-end:span 10}.x-xl-11{grid-column-end:span 11}.x-xl-12{grid-column-end:span 12}.x-xl-13{grid-column-end:span 13}.x-xl-14{grid-column-end:span 14}}',
            xs: '@media (width>=1200px){.xs-xl-1{grid-column-start:1}.xs-xl-2{grid-column-start:2}.xs-xl-3{grid-column-start:3}.xs-xl-4{grid-column-start:4}.xs-xl-5{grid-column-start:5}.xs-xl-6{grid-column-start:6}.xs-xl-7{grid-column-start:7}.xs-xl-8{grid-column-start:8}.xs-xl-9{grid-column-start:9}.xs-xl-10{grid-column-start:10}.xs-xl-11{grid-column-start:11}.xs-xl-12{grid-column-start:12}.xs-xl-13{grid-column-start:13}.xs-xl-14{grid-column-start:14}}'
        },
        xxl: {
            x: '@media (width>=1400px){.x-xxl-1{grid-column-end:span 1}.x-xxl-2{grid-column-end:span 2}.x-xxl-3{grid-column-end:span 3}.x-xxl-4{grid-column-end:span 4}.x-xxl-5{grid-column-end:span 5}.x-xxl-6{grid-column-end:span 6}.x-xxl-7{grid-column-end:span 7}.x-xxl-8{grid-column-end:span 8}.x-xxl-9{grid-column-end:span 9}.x-xxl-10{grid-column-end:span 10}.x-xxl-11{grid-column-end:span 11}.x-xxl-12{grid-column-end:span 12}.x-xxl-13{grid-column-end:span 13}.x-xxl-14{grid-column-end:span 14}}',
            xs: '@media (width>=1400px){.xs-xxl-1{grid-column-start:1}.xs-xxl-2{grid-column-start:2}.xs-xxl-3{grid-column-start:3}.xs-xxl-4{grid-column-start:4}.xs-xxl-5{grid-column-start:5}.xs-xxl-6{grid-column-start:6}.xs-xxl-7{grid-column-start:7}.xs-xxl-8{grid-column-start:8}.xs-xxl-9{grid-column-start:9}.xs-xxl-10{grid-column-start:10}.xs-xxl-11{grid-column-start:11}.xs-xxl-12{grid-column-start:12}.xs-xxl-13{grid-column-start:13}.xs-xxl-14{grid-column-start:14}}'
        },
        xxxl: {
            x: '@media (width>=1800px){.x-xxxl-1{grid-column-end:span 1}.x-xxxl-2{grid-column-end:span 2}.x-xxxl-3{grid-column-end:span 3}.x-xxxl-4{grid-column-end:span 4}.x-xxxl-5{grid-column-end:span 5}.x-xxxl-6{grid-column-end:span 6}.x-xxxl-7{grid-column-end:span 7}.x-xxxl-8{grid-column-end:span 8}.x-xxxl-9{grid-column-end:span 9}.x-xxxl-10{grid-column-end:span 10}.x-xxxl-11{grid-column-end:span 11}.x-xxxl-12{grid-column-end:span 12}.x-xxxl-13{grid-column-end:span 13}.x-xxl-14{grid-column-end:span 14}}',
            xs: '@media (width>=1800px){.xs-xxxl-1{grid-column-start:1}.xs-xxxl-2{grid-column-start:2}.xs-xxxl-3{grid-column-start:3}.xs-xxxl-4{grid-column-start:4}.xs-xxxl-5{grid-column-start:5}.xs-xxxl-6{grid-column-start:6}.xs-xxxl-7{grid-column-start:7}.xs-xxxl-8{grid-column-start:8}.xs-xxxl-9{grid-column-start:9}.xs-xxxl-10{grid-column-start:10}.xs-xxxl-11{grid-column-start:11}.xs-xxxl-12{grid-column-start:12}.xs-xxxl-13{grid-column-start:13}.xs-xxxl-14{grid-column-start:14}}'
        },
        wd: {
            x: '@media (aspect-ratio>=16 / 9) and (width>=1800px){.x-wd-1{grid-column-end:span 1}.x-wd-2{grid-column-end:span 2}.x-wd-3{grid-column-end:span 3}.x-wd-4{grid-column-end:span 4}.x-wd-5{grid-column-end:span 5}.x-wd-6{grid-column-end:span 6}.x-wd-7{grid-column-end:span 7}.x-wd-8{grid-column-end:span 8}.x-wd-9{grid-column-end:span 9}.x-wd-10{grid-column-end:span 10}.x-wd-11{grid-column-end:span 11}.x-wd-12{grid-column-end:span 12}.x-wd-13{grid-column-end:span 13}.x-wd-14{grid-column-end:span 14}}',
            xs: '@media (aspect-ratio>=16 / 9) and (width>=1800px){.xs-wd-1{grid-column-start:1}.xs-wd-2{grid-column-start:2}.xs-wd-3{grid-column-start:3}.xs-wd-4{grid-column-start:4}.xs-wd-5{grid-column-start:5}.xs-wd-6{grid-column-start:6}.xs-wd-7{grid-column-start:7}.xs-wd-8{grid-column-start:8}.xs-wd-9{grid-column-start:9}.xs-wd-10{grid-column-start:10}.xs-wd-11{grid-column-start:11}.xs-wd-12{grid-column-start:12}.xs-wd-13{grid-column-start:13}.xs-wd-14{grid-column-start:14}}'
        },
        uwd: {
            x: '@media (aspect-ratio>=21 / 9) and (width>=2000px){.x-uwd-1{grid-column-end:span 1}.x-uwd-2{grid-column-end:span 2}.x-uwd-3{grid-column-end:span 3}.x-uwd-4{grid-column-end:span 4}.x-uwd-5{grid-column-end:span 5}.x-uwd-6{grid-column-end:span 6}.x-uwd-7{grid-column-end:span 7}.x-uwd-8{grid-column-end:span 8}.x-uwd-9{grid-column-end:span 9}.x-uwd-10{grid-column-end:span 10}.x-uwd-11{grid-column-end:span 11}.x-uwd-12{grid-column-end:span 12}.x-uwd-13{grid-column-end:span 13}.x-uwd-14{grid-column-end:span 14}}',
            xs: '@media (aspect-ratio>=21 / 9) and (width>=2000px){.xs-uwd-1{grid-column-start:1}.xs-uwd-2{grid-column-start:2}.xs-uwd-3{grid-column-start:3}.xs-uwd-4{grid-column-start:4}.xs-uwd-5{grid-column-start:5}.xs-uwd-6{grid-column-start:6}.xs-uwd-7{grid-column-start:7}.xs-uwd-8{grid-column-start:8}.xs-uwd-9{grid-column-start:9}.xs-uwd-10{grid-column-start:10}.xs-uwd-11{grid-column-start:11}.xs-uwd-12{grid-column-start:12}.xs-uwd-13{grid-column-start:13}.xs-uwd-14{grid-column-start:14}}'
        },
        suwd: {
            x: '@media (aspect-ratio>=32 / 9) and (width>=3000px){.x-suwd-1{grid-column-end:span 1}.x-suwd-2{grid-column-end:span 2}.x-suwd-3{grid-column-end:span 3}.x-suwd-4{grid-column-end:span 4}.x-suwd-5{grid-column-end:span 5}.x-suwd-6{grid-column-end:span 6}.x-suwd-7{grid-column-end:span 7}.x-suwd-8{grid-column-end:span 8}.x-suwd-9{grid-column-end:span 9}.x-suwd-10{grid-column-end:span 10}.x-suwd-11{grid-column-end:span 11}.x-suwd-12{grid-column-end:span 12}.x-suwd-13{grid-column-end:span 13}.x-suwd-14{grid-column-end:span 14}}',
            xs: '@media (aspect-ratio>=32 / 9) and (width>=3000px){.xs-suwd-1{grid-column-start:1}.xs-suwd-2{grid-column-start:2}.xs-suwd-3{grid-column-start:3}.xs-suwd-4{grid-column-start:4}.xs-suwd-5{grid-column-start:5}.xs-suwd-6{grid-column-start:6}.xs-suwd-7{grid-column-start:7}.xs-suwd-8{grid-column-start:8}.xs-suwd-9{grid-column-start:9}.xs-suwd-10{grid-column-start:10}.xs-suwd-11{grid-column-start:11}.xs-suwd-12{grid-column-start:12}.xs-suwd-13{grid-column-start:13}.xs-suwd-14{grid-column-start:14}}'
        }
    },
    helper: {
        base: '.num-x-1{--num-x:1}.num-x-2{--num-x:2}.num-x-3{--num-x:3}.num-x-4{--num-x:4}.num-x-5{--num-x:5}.num-x-6{--num-x:6}.num-x-7{--num-x:7}.num-x-8{--num-x:8}.num-x-9{--num-x:9}.num-x-10{--num-x:10}.num-x-11{--num-x:11}.num-x-12{--num-x:12}.num-y-1{--num-y:1}.num-y-2{--num-y:2}.num-y-3{--num-y:3}.num-y-4{--num-y:4}.num-y-5{--num-y:5}.num-y-6{--num-y:6}.gap{--gap-x:clamp(.2rem,1vw,1rem);--gap-y:clamp(.2rem,1vh,1rem)}.gap-x{--gap-x:clamp(.2rem,1vw,1rem)}.gap-y{--gap-y:clamp(.2rem,1vh,1rem)}',
        media: {
            sm: {
                x: '@media (width>=576px){.num-x-sm-1{--num-x:1}.num-x-sm-2{--num-x:2}.num-x-sm-3{--num-x:3}.num-x-sm-4{--num-x:4}.num-x-sm-5{--num-x:5}.num-x-sm-6{--num-x:6}.num-x-sm-7{--num-x:7}.num-x-sm-8{--num-x:8}.num-x-sm-9{--num-x:9}.num-x-sm-10{--num-x:10}.num-x-sm-11{--num-x:11}.num-x-sm-12{--num-x:12}}',
                y: '@media (width>=576px){.num-y-sm-1{--num-y:1}.num-y-sm-2{--num-y:2}.num-y-sm-3{--num-y:3}.num-y-sm-4{--num-y:4}.num-y-sm-5{--num-y:5}.num-y-sm-6{--num-y:6}}'
            },
            md: {
                x: '@media (width>=768px){.num-x-md-1{--num-x:1}.num-x-md-2{--num-x:2}.num-x-md-3{--num-x:3}.num-x-md-4{--num-x:4}.num-x-md-5{--num-x:5}.num-x-md-6{--num-x:6}.num-x-md-7{--num-x:7}.num-x-md-8{--num-x:8}.num-x-md-9{--num-x:9}.num-x-md-10{--num-x:10}.num-x-md-11{--num-x:11}.num-x-md-12{--num-x:12}}',
                y: '@media (width>=768px){.num-y-md-1{--num-y:1}.num-y-md-2{--num-y:2}.num-y-md-3{--num-y:3}.num-y-md-4{--num-y:4}.num-y-md-5{--num-y:5}.num-y-md-6{--num-y:6}}'
            },
            lg: {
                x: '@media (width>=992px){.num-x-lg-1{--num-x:1}.num-x-lg-2{--num-x:2}.num-x-lg-3{--num-x:3}.num-x-lg-4{--num-x:4}.num-x-lg-5{--num-x:5}.num-x-lg-6{--num-x:6}.num-x-lg-7{--num-x:7}.num-x-lg-8{--num-x:8}.num-x-lg-9{--num-x:9}.num-x-lg-10{--num-x:10}.num-x-lg-11{--num-x:11}.num-x-lg-12{--num-x:12}}',
                y: '@media (width>=992px){.num-y-lg-1{--num-y:1}.num-y-lg-2{--num-y:2}.num-y-lg-3{--num-y:3}.num-y-lg-4{--num-y:4}.num-y-lg-5{--num-y:5}.num-y-lg-6{--num-y:6}}'
            },
            xl: {
                x: '@media (width>=1200px){.num-x-xl-1{--num-x:1}.num-x-xl-2{--num-x:2}.num-x-xl-3{--num-x:3}.num-x-xl-4{--num-x:4}.num-x-xl-5{--num-x:5}.num-x-xl-6{--num-x:6}.num-x-xl-7{--num-x:7}.num-x-xl-8{--num-x:8}.num-x-xl-9{--num-x:9}.num-x-xl-10{--num-x:10}.num-x-xl-11{--num-x:11}.num-x-xl-12{--num-x:12}}',
                y: '@media (width>=1200px){.num-y-xl-1{--num-y:1}.num-y-xl-2{--num-y:2}.num-y-xl-3{--num-y:3}.num-y-xl-4{--num-y:4}.num-y-xl-5{--num-y:5}.num-y-xl-6{--num-y:6}}'
            },
            xxl: {
                x: '@media (width>=1400px){.num-x-xxl-1{--num-x:1}.num-x-xxl-2{--num-x:2}.num-x-xxl-3{--num-x:3}.num-x-xxl-4{--num-x:4}.num-x-xxl-5{--num-x:5}.num-x-xxl-6{--num-x:6}.num-x-xxl-7{--num-x:7}.num-x-xxl-8{--num-x:8}.num-x-xxl-9{--num-x:9}.num-x-xxl-10{--num-x:10}.num-x-xxl-11{--num-x:11}.num-x-xxl-12{--num-x:12}}',
                y: '@media (width>=1400px){.num-y-xxl-1{--num-y:1}.num-y-xxl-2{--num-y:2}.num-y-xxl-3{--num-y:3}.num-y-xxl-4{--num-y:4}.num-y-xxl-5{--num-y:5}.num-y-xxl-6{--num-y:6}}'
            },
            xxxl: {
                x: '@media (width>=1800px){.num-x-xxxl-1{--num-x:1}.num-x-xxxl-2{--num-x:2}.num-x-xxxl-3{--num-x:3}.num-x-xxxl-4{--num-x:4}.num-x-xxxl-5{--num-x:5}.num-x-xxxl-6{--num-x:6}.num-x-xxxl-7{--num-x:7}.num-x-xxxl-8{--num-x:8}.num-x-xxxl-9{--num-x:9}.num-x-xxxl-10{--num-x:10}.num-x-xxxl-11{--num-x:11}.num-x-xxxl-12{--num-x:12}}',
                y: '@media (width>=1800px){.num-y-xxxl-1{--num-y:1}.num-y-xxxl-2{--num-y:2}.num-y-xxxl-3{--num-y:3}.num-y-xxxl-4{--num-y:4}.num-y-xxxl-5{--num-y:5}.num-y-xxxl-6{--num-y:6}}'
            },
            wd: {
                x: '@media (aspect-ratio>=16 / 9) and (width>=1800px){.num-x-wd-1{--num-x:1}.num-x-wd-2{--num-x:2}.num-x-wd-3{--num-x:3}.num-x-wd-4{--num-x:4}.num-x-wd-5{--num-x:5}.num-x-wd-6{--num-x:6}.num-x-wd-7{--num-x:7}.num-x-wd-8{--num-x:8}.num-x-wd-9{--num-x:9}.num-x-wd-10{--num-x:10}.num-x-wd-11{--num-x:11}.num-x-wd-12{--num-x:12}}',
                y: '@media (aspect-ratio>=16 / 9) and (width>=1800px){.num-y-wd-1{--num-y:1}.num-y-wd-2{--num-y:2}.num-y-wd-3{--num-y:3}.num-y-wd-4{--num-y:4}.num-y-wd-5{--num-y:5}.num-y-wd-6{--num-y:6}}'
            },
            uwd: {
                x: '@media (aspect-ratio>=21 / 9) and (width>=2000px){.num-x-uwd-1{--num-x:1}.num-x-uwd-2{--num-x:2}.num-x-uwd-3{--num-x:3}.num-x-uwd-4{--num-x:4}.num-x-uwd-5{--num-x:5}.num-x-uwd-6{--num-x:6}.num-x-uwd-7{--num-x:7}.num-x-uwd-8{--num-x:8}.num-x-uwd-9{--num-x:9}.num-x-uwd-10{--num-x:10}.num-x-uwd-11{--num-x:11}.num-x-uwd-12{--num-x:12}}',
                y: '@media (aspect-ratio>=21 / 9) and (width>=2000px){.num-y-uwd-1{--num-y:1}.num-y-uwd-2{--num-y:2}.num-y-uwd-3{--num-y:3}.num-y-uwd-4{--num-y:4}.num-y-uwd-5{--num-y:5}.num-y-uwd-6{--num-y:6}}'
            },
            suwd: {
                x: '@media (aspect-ratio>=32 / 9) and (width>=3000px){.num-x-suwd-1{--num-x:1}.num-x-suwd-2{--num-x:2}.num-x-suwd-3{--num-x:3}.num-x-suwd-4{--num-x:4}.num-x-suwd-5{--num-x:5}.num-x-suwd-6{--num-x:6}.num-x-suwd-7{--num-x:7}.num-x-suwd-8{--num-x:8}.num-x-suwd-9{--num-x:9}.num-x-suwd-10{--num-x:10}.num-x-suwd-11{--num-x:11}.num-x-suwd-12{--num-x:12}}',
                y: '@media (aspect-ratio>=32 / 9) and (width>=3000px){.num-y-suwd-1{--num-y:1}.num-y-suwd-2{--num-y:2}.num-y-suwd-3{--num-y:3}.num-y-suwd-4{--num-y:4}.num-y-suwd-5{--num-y:5}.num-y-suwd-6{--num-y:6}}'
            }
        }
    },
    templates: {
        x: '.x-${num}{grid-column-end: span ${num};}',
        xs: '.xs-${num}{grid-column-start: ${num};}',
        media: {
            sm: {
                x: '.x-sm-${num}{grid-column-end: span ${num};}',
                xs: '.xs-sm-${num}{grid-column-start: ${num};}'
            },
            md: {
                x: '.x-md-${num}{grid-column-end: span ${num};}',
                xs: '.xs-md-${num}{grid-column-start: ${num};}'
            },
            lg: {
                x: '.x-lg-${num}{grid-column-end: span ${num};}',
                xs: '.xs-lg-${num}{grid-column-start: ${num};}'
            },
            xl: {
                x: '.x-xl-${num}{grid-column-end: span ${num};}',
                xs: '.xs-xl-${num}{grid-column-start: ${num};}'
            },
            xxl: {
                x: '.x-xxl-${num}{grid-column-end: span ${num};}',
                xs: '.xs-xxl-${num}{grid-column-start: ${num};}'
            },
            xxxl: {
                x: '.x-xxxl-${num}{grid-column-end: span ${num};}',
                xs: '.xs-xxxl-${num}{grid-column-start: ${num};}'
            },
            wd: {
                x: '.x-wd-${num}{grid-column-end: span ${num};}',
                xs: '.xs-wd-${num}{grid-column-start: ${num};}'
            },
            uwd: {
                x: '.x-uwd-${num}{grid-column-end: span ${num};}',
                xs: '.xs-uwd-${num}{grid-column-start: ${num};}'
            },
            suwd: {
                x: '.x-suwd-${num}{grid-column-end: span ${num};}',
                xs: '.xs-suwd-${num}{grid-column-start: ${num};}'
            }
        },
        helper: {
            x: '.num-x-${num}{ --num-x: ${num};}',
            y: '.num-y-${num}{ --num-y: ${num};}',
            media: {
                sm: {
                    x: '.num-x-sm-${num}{ --num-x: ${num};}',
                    y: '.num-y-sm-${num}{ --num-y: ${num};}'
                },
                md: {
                    x: '.num-x-md-${num}{ --num-x: ${num};}',
                    y: '.num-y-md-${num}{ --num-y: ${num};}'
                },
                lg: {
                    x: '.num-x-lg-${num}{ --num-x: ${num};}',
                    y: '.num-y-lg-${num}{ --num-y: ${num};}'
                },
                xl: {
                    x: '.num-x-xl-${num}{ --num-x: ${num};}',
                    y: '.num-y-xl-${num}{ --num-y: ${num};}'
                },
                xxl: {
                    x: '.num-x-xxl-${num}{ --num-x: ${num};}',
                    y: '.num-y-xxl-${num}{ --num-y: ${num};}'
                },
                xxxl: {
                    x: '.num-x-xxxl-${num}{ --num-x: ${num};}',
                    y: '.num-y-xxxl-${num}{ --num-y: ${num};}'
                },
                wd: {
                    x: '.num-x-wd-${num}{ --num-x: ${num};}',
                    y: '.num-y-wd-${num}{ --num-y: ${num};}'
                },
                uwd: {
                    x: '.num-x-uwd-${num}{ --num-x: ${num};}',
                    y: '.num-y-uwd-${num}{ --num-y: ${num};}'
                },
                suwd: {
                    x: '.num-x-suwd-${num}{ --num-x: ${num};}',
                    y: '.num-y-suwd-${num}{ --num-y: ${num};}'
                }
            }
        }
    }
};

const colors = {
    // Basic formatting
    format: {
        reset: "\x1b[0m",
        bold: "\x1b[1m",
        dim: "\x1b[2m",
        italic: "\x1b[3m",
        underscore: "\x1b[4m",
        blink: "\x1b[5m",
        reverse: "\x1b[7m",
        hidden: "\x1b[8m",
        strikethrough: "\x1b[9m"
    },

    // Foreground colors (standard)
    fg: {
        black: "\x1b[30m",
        red: "\x1b[31m",
        green: "\x1b[32m",
        yellow: "\x1b[33m",
        blue: "\x1b[34m",
        magenta: "\x1b[35m",
        cyan: "\x1b[36m",
        white: "\x1b[37m",
        // Bright variants
        brightBlack: "\x1b[90m",
        brightRed: "\x1b[91m",
        brightGreen: "\x1b[92m",
        brightYellow: "\x1b[93m",
        brightBlue: "\x1b[94m",
        brightMagenta: "\x1b[95m",
        brightCyan: "\x1b[96m",
        brightWhite: "\x1b[97m",
    },

    // Background colors (standard)
    bg: {
        black: "\x1b[40m",
        red: "\x1b[41m",
        green: "\x1b[42m",
        yellow: "\x1b[43m",
        blue: "\x1b[44m",
        magenta: "\x1b[45m",
        cyan: "\x1b[46m",
        white: "\x1b[47m",
        // Bright variants
        brightBlack: "\x1b[100m",
        brightRed: "\x1b[101m",
        brightGreen: "\x1b[102m",
        brightYellow: "\x1b[103m",
        brightBlue: "\x1b[104m",
        brightMagenta: "\x1b[105m",
        brightCyan: "\x1b[106m",
        brightWhite: "\x1b[107m",
    },

    // Utility functions
    style: (text, ...styles) => {
        const combined = styles.join('');
        return `${combined}${text}${colors.format.reset}`;
    },

    // RGB support (0-255 for each channel)
    rgb: {
        fg: (r, g, b) => `\x1b[38;2;${r};${g};${b}m`,
        bg: (r, g, b) => `\x1b[48;2;${r};${g};${b}m`
    }
};

// Example usage:
// console.log(colors.style('Hello', colors.fg.red, colors.bg.white));
// console.log(colors.style('RGB Text', colors.rgb.fg(255, 128, 0)));

import { parseArgs } from 'util';


const currentDir = process.cwd();

const options = {
    component: {
      type: "string",
      short: "c",
      multiple: true
    },
    template: {
        type: "string",
        short: "t",
        multiple: true
    },
    block: {
        type: "string",
        short: "b",
        multiple: true
    },
    font: {
      type: "string",
      short: "f",
      multiple: true
    },
  };
  
  const argsObj = parseArgs({ options, strict: false });

export {breakPoints, layout, colors, currentDir, argsObj}
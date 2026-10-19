export const breakPoints = {
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

export const layout = {
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
            num_x: '.num-x-${num}{--num-x: ${num}}',
            num_y: '.num-y-${num}{--num-y: ${num}}',
            media: {
                num_x: '.num-x-${media}-${num}{--num-x: ${num}}',
                num_y: '.num-y-${media}-${num}{--num-y: ${num}}'
            }
        }
    }
};

export const optimizableFiles = [
    {
        url: 'main/layout/layout.css',
        optimize: {
            include: ['base', 'gap'],
            class: ['x', 'xs', 'y', 'ys'],
            media: true,
            templates: layout.templates,
            wrapper: '@layer layout.helper'
        }
    },
    {
        url: 'helpers/layout/layout_helper.css',
        optimize: {
            class: ['num-x', 'num-y'],
            media: true,
            templates: layout.helper.templates,
            wrapper: '@layer layout.helper'
        }
    }
];

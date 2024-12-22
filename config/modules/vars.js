// Local 
const layx = {
    directories: {
     base: '/',
     
    },
    files: {
  
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

export { breakPoints, layout, colors, currentDir, argsObj }
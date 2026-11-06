export interface HighlightOptions {
    lineNumbers?: boolean;
    copyButton?: boolean;
    header?: boolean;
    autoDetect?: boolean;
    multiline?: boolean;
    block?: boolean;
}

export declare function normalizeLang(lang: string): string;
export declare function detectLanguage(code: string): string;
export declare function setLoader(loaderFn: (name: string) => Promise<any>): void;
export declare const defaultLoader: (name: string) => Promise<any>;

export declare function tokenize(
    src: string,
    lang: string | object,
    onToken: (text: string, type?: string) => void
): Promise<void>;

export declare function tokenizeSync(
    src: string,
    lang: string | object,
    onToken: (text: string, type?: string) => void,
    registry?: Record<string, any>
): void;

export declare function highlightHTML(
    src: string,
    lang?: string | object,
    options?: HighlightOptions
): Promise<string>;

export declare const highlightText: typeof highlightHTML;

export declare function highlightElement(
    el: HTMLElement,
    lang?: string,
    options?: HighlightOptions
): Promise<void>;

export declare function highlightAll(
    options?: HighlightOptions | string
): Promise<void[]>;

export declare function highlightANSI(
    src: string,
    lang: string | object,
    theme?: Record<string, string>
): Promise<string>;

export declare class SyntaxHighlighter {
    static readonly detect: typeof detectLanguage;
    static readonly normalize: typeof normalizeLang;
    static readonly highlight: typeof highlightHTML;
    static readonly highlightText: typeof highlightHTML;
    static readonly highlightElement: typeof highlightElement;
    static readonly highlightAll: typeof highlightAll;
    static readonly highlightANSI: typeof highlightANSI;
    static readonly tokenize: typeof tokenize;
    static readonly setLoader: typeof setLoader;
    static readonly defaultLoader: typeof defaultLoader;

    static getInstance(): SyntaxHighlighter;
    static register(name: string, grammar: object): typeof SyntaxHighlighter;

    constructor(options?: HighlightOptions);

    tokenize(src: string, lang: string | object, onToken: (text: string, type?: string) => void): Promise<void>;
    highlight(src: string, lang?: string | object, options?: HighlightOptions): Promise<string>;
    highlightText(src: string, lang?: string | object, multiline?: boolean, opt?: HighlightOptions): Promise<string>;
    highlightElement(el: HTMLElement, lang?: string, mode?: string, opt?: HighlightOptions): Promise<void>;
    highlightAll(opt?: HighlightOptions | string): Promise<void[]>;
    loadLanguage(name: string, grammar: object): this;
    preLoadLanguages(...langNames: string[]): Promise<this>;
}

export default SyntaxHighlighter;

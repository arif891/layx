export interface HighlightOptions {
    lineNumbers?: boolean;
    copyButton?: boolean;
    header?: boolean;
    autoDetect?: boolean;
    multiline?: boolean;
}

export declare function normalizeLang(lang: string): string;
export declare function detectLanguage(code: string): string;
export declare function tokenize(src: string, lang: string | object, onToken: (text: string, type?: string) => void, loadLang?: (name: string) => Promise<any>): Promise<void>;
export declare function tokenizeSync(src: string, lang: string | object, onToken: (text: string, type?: string) => void, registry?: Record<string, any>): void;

export declare class SyntaxHighlighter {
    static readonly detect: typeof detectLanguage;
    static readonly normalize: typeof normalizeLang;
    static getInstance(): SyntaxHighlighter;

    static highlight(src: string, lang?: string | object, options?: HighlightOptions): Promise<string>;
    static highlightElement(el: HTMLElement, options?: HighlightOptions): Promise<void>;
    static highlightAll(selector?: string, options?: HighlightOptions): Promise<void[]>;
    static register(name: string, grammar: object): SyntaxHighlighter;

    constructor(options?: HighlightOptions);

    tokenize(src: string, lang: string | object, onToken: (text: string, type?: string) => void): Promise<void>;
    highlight(src: string, lang?: string | object, options?: HighlightOptions): Promise<string>;
    highlightElement(el: HTMLElement, options?: HighlightOptions): Promise<void>;
    highlightAll(selector?: string, options?: HighlightOptions): Promise<void[]>;
    loadLanguage(name: string, grammar: object): this;
    preLoadLanguages(...langNames: string[]): Promise<this>;
}

declare const defaultHighlighter: SyntaxHighlighter | null;
export default defaultHighlighter;

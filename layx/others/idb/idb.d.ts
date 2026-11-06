export interface StoreConfig {
    keyPath?: string | string[];
    autoIncrement?: boolean;
    indexes?: (string | { name: string; keyPath?: string; unique?: boolean; multiEntry?: boolean })[];
}

export interface IDBOptions {
    version?: number;
    stores?: Record<string, StoreConfig>;
    upgrade?: (db: IDBDatabase, oldVersion: number, newVersion: number, tx: IDBTransaction) => void;
    onBlocked?: (event: IDBVersionChangeEvent) => void;
    onVersionChange?: (db: IDB) => void;
}

export interface GetAllOptions {
    query?: any;
    count?: number;
    offset?: number;
    reverse?: boolean;
}

export declare class Range {
    static readonly isSupported: boolean;
    static only(value: any): IDBKeyRange | null;
    static between(lower: any, upper: any, options?: { lowerOpen?: boolean; upperOpen?: boolean }): IDBKeyRange | null;
    static greaterThan(value: any): IDBKeyRange | null;
    static greaterThanOrEqual(value: any): IDBKeyRange | null;
    static lessThan(value: any): IDBKeyRange | null;
    static lessThanOrEqual(value: any): IDBKeyRange | null;
    static prefix(prefix: string): IDBKeyRange | null;
}

export declare class IndexHandle {
    get(key: any): Promise<any>;
    getKey(key: any): Promise<any>;
    getAll(query?: any, count?: number): Promise<any[]>;
    getAllKeys(query?: any, count?: number): Promise<any[]>;
    count(query?: any): Promise<number>;
}

export declare class StoreHandle {
    readonly name: string;
    get(key: any): Promise<any>;
    has(key: any): Promise<boolean>;
    set(key: any, value?: any): Promise<any>;
    put(value: any, key?: any): Promise<any>;
    add(value: any, key?: any): Promise<any>;
    delete(key: any): Promise<boolean>;
    clear(): Promise<boolean>;
    count(query?: any): Promise<number>;
    getAll(options?: GetAllOptions | any): Promise<any[]>;
    getAllKeys(options?: GetAllOptions): Promise<any[]>;
    bulkPut(items: any[], keys?: any[]): Promise<any[]>;
    bulkAdd(items: any[], keys?: any[]): Promise<any[]>;
    bulkDelete(keys: any[]): Promise<void>;
    index(name: string): IndexHandle;
    iterate(query?: any, callback?: (value: any, key: any, cursor: IDBCursorWithValue) => boolean | void | Promise<boolean | void>, options?: { direction?: 'next' | 'prev' | 'nextunique' | 'prevunique' }): Promise<void>;
    [Symbol.asyncIterator](): AsyncGenerator<[any, any], void, unknown>;
    entries(): AsyncGenerator<[any, any], void, unknown>;
    values(): AsyncGenerator<any, void, unknown>;
    keys(): AsyncGenerator<any, void, unknown>;
}

export interface KeyValueStore {
    get(key: any): Promise<any>;
    set(key: any, value: any): Promise<any>;
    delete(key: any): Promise<boolean>;
    clear(): Promise<boolean>;
    has(key: any): Promise<boolean>;
    count(): Promise<number>;
    keys(): Promise<any[]>;
    values(): Promise<any[]>;
    entries(): Promise<[any, any][]>;
}

export declare class IDB {
    static readonly range: typeof Range;
    static readonly kv: KeyValueStore;
    static open(name: string, options?: IDBOptions): Promise<IDB>;

    readonly name: string;
    readonly version: number;
    db: IDBDatabase | null;

    constructor(name?: string, optionsOrVersion?: IDBOptions | number, legacyUpgradeCallback?: Function);

    open(): Promise<IDBDatabase>;
    store(name: string): StoreHandle;
    tx<T = any>(storeNames: string | string[], mode?: 'readonly' | 'readwrite', callback?: (stores: Record<string, StoreHandle> | StoreHandle, tx: IDBTransaction) => Promise<T>): Promise<T>;

    get(storeName: string, key: any): Promise<any>;
    set(storeName: string, keyOrValue: any, value?: any): Promise<any>;
    put(storeName: string, value: any, key?: any): Promise<any>;
    add(storeName: string, value: any, key?: any): Promise<any>;
    delete(storeName: string, key: any): Promise<boolean>;
    clear(storeName: string): Promise<boolean>;
    count(storeName: string, query?: any): Promise<number>;
    getAll(storeName: string, options?: GetAllOptions | any): Promise<any[]>;
    bulkPut(storeName: string, items: any[], keys?: any[]): Promise<any[]>;
    bulkAdd(storeName: string, items: any[], keys?: any[]): Promise<any[]>;
    bulkDelete(storeName: string, keys: any[]): Promise<void>;
    forEach(storeName: string, queryOrCallback: any, callback?: Function): Promise<void>;

    close(): void;
    deleteDatabase(): Promise<void>;
}

export default IDB;


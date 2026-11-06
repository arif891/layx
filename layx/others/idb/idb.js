/*********************************************************************
 * IDB – Modern, Promise-based IndexedDB Engine for LayX
 * - Declarative schema & seamless version migrations
 * - Atomic transaction runner with auto-commit/rollback
 * - Bound store handles with clean get/set/delete/count/getAll
 * - Built-in Range helpers and async iterator support
 * - Plug-and-play IDB.kv default key-value store
 * - SSR safe with zero runtime dependencies
 *********************************************************************/

import { Range } from './core/range.js';
import { runTransaction, promisifyRequest } from './core/transaction.js';
import { StoreHandle, IndexHandle } from './core/store.js';

class IDB {
    static range = Range;

    /**
     * Built-in default key-value store for instant plug-and-play persistence
     */
    static get kv() {
        if (!IDB._defaultKv) {
            const db = new IDB('_layx_kv', {
                version: 1,
                stores: {
                    keyval: {},
                },
            });
            const store = db.store('keyval');
            IDB._defaultKv = {
                get: (key) => store.get(key),
                set: (key, val) => store.set(key, val),
                delete: (key) => store.delete(key),
                clear: () => store.clear(),
                has: (key) => store.has(key),
                count: () => store.count(),
                keys: () => store.getAllKeys(),
                values: () => store.getAll(),
                entries: async () => {
                    const keys = await store.getAllKeys();
                    const values = await store.getAll();
                    return keys.map((k, i) => [k, values[i]]);
                },
            };
        }
        return IDB._defaultKv;
    }

    /**
     * Quick static helper to open a database
     * @param {string} name
     * @param {Object} [options]
     */
    static async open(name, options) {
        const db = new IDB(name, options);
        await db.open();
        return db;
    }

    /**
     * @param {string} [name='app-db']
     * @param {Object|number} [optionsOrVersion=1]
     * @param {Function} [legacyUpgradeCallback]
     */
    constructor(name = 'app-db', optionsOrVersion = 1, legacyUpgradeCallback) {
        this.name = name;
        this.db = null;
        this._openPromise = null;
        this._storeCache = new Map();

        if (typeof optionsOrVersion === 'object' && optionsOrVersion !== null) {
            this.version = optionsOrVersion.version || 1;
            this.stores = optionsOrVersion.stores || null;
            this.upgradeCallback = optionsOrVersion.upgrade || null;
            this.onBlocked = optionsOrVersion.onBlocked || null;
            this.onVersionChange = optionsOrVersion.onVersionChange || null;
        } else {
            this.version = Number(optionsOrVersion) || 1;
            this.stores = null;
            this.upgradeCallback = legacyUpgradeCallback || null;
            this.onBlocked = null;
            this.onVersionChange = null;
        }
    }

    /**
     * Open the database connection
     * @returns {Promise<IDBDatabase>}
     */
    async open() {
        if (this.db) return this.db;
        if (this._openPromise) return this._openPromise;

        if (typeof indexedDB === 'undefined') {
            return Promise.reject(new Error('[IDB] IndexedDB is not supported in this environment'));
        }

        this._openPromise = new Promise((resolve, reject) => {
            const request = indexedDB.open(this.name, this.version);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                const tx = event.target.transaction;
                this.db = db;

                // 1. Declarative schema creation
                if (this.stores && typeof this.stores === 'object') {
                    for (const [storeName, config] of Object.entries(this.stores)) {
                        let store;
                        if (!db.objectStoreNames.contains(storeName)) {
                            const params = {};
                            if (config.keyPath) params.keyPath = config.keyPath;
                            if (config.autoIncrement !== undefined) params.autoIncrement = config.autoIncrement;
                            store = db.createObjectStore(storeName, params);
                        } else {
                            store = tx.objectStore(storeName);
                        }

                        // Create indexes if specified
                        if (Array.isArray(config.indexes)) {
                            config.indexes.forEach((idx) => {
                                const idxName = typeof idx === 'string' ? idx : idx.name;
                                const keyPath = typeof idx === 'string' ? idx : idx.keyPath || idx.name;
                                const unique = typeof idx === 'object' ? Boolean(idx.unique) : false;
                                const multiEntry = typeof idx === 'object' ? Boolean(idx.multiEntry) : false;

                                if (!store.indexNames.contains(idxName)) {
                                    store.createIndex(idxName, keyPath, { unique, multiEntry });
                                }
                            });
                        }
                    }
                }

                // 2. Custom upgrade callback
                if (typeof this.upgradeCallback === 'function') {
                    this.upgradeCallback(db, event.oldVersion, event.newVersion, tx);
                }
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                this._openPromise = null;

                // Handle multi-tab version changes to prevent lockups
                this.db.onversionchange = () => {
                    if (typeof this.onVersionChange === 'function') {
                        this.onVersionChange(this);
                    } else {
                        this.close();
                    }
                };

                resolve(this.db);
            };

            request.onerror = (event) => {
                this._openPromise = null;
                const err = event.target.error || new Error('Failed to open database');
                reject(err);
            };

            request.onblocked = (event) => {
                if (typeof this.onBlocked === 'function') {
                    this.onBlocked(event);
                } else {
                    console.warn(`[IDB] Database "${this.name}" open blocked by open tabs.`);
                }
            };
        });

        return this._openPromise;
    }

    /**
     * Get a bound Store handle
     * @param {string} storeName
     * @returns {StoreHandle}
     */
    store(storeName) {
        if (!this._storeCache.has(storeName)) {
            this._storeCache.set(storeName, new StoreHandle(storeName, { db: this }));
        }
        return this._storeCache.get(storeName);
    }

    /**
     * Run an atomic multi-store transaction with automatic commit / rollback
     * @param {string|string[]} storeNames
     * @param {'readonly'|'readwrite'} [mode='readwrite']
     * @param {Function} callback
     * @returns {Promise<any>}
     */
    async tx(storeNames, mode = 'readwrite', callback) {
        const db = await this.open();
        return runTransaction(db, storeNames, mode, callback, (rawStore, tx) => {
            return new StoreHandle(rawStore.name, { rawStore, tx });
        });
    }

    // ── Direct Store Shortcuts ────────────────────────────────────────────────

    async get(storeName, key) {
        return this.store(storeName).get(key);
    }

    async set(storeName, keyOrValue, value) {
        return this.store(storeName).set(keyOrValue, value);
    }

    async put(storeName, value, key) {
        return this.store(storeName).put(value, key);
    }

    async add(storeName, value, key) {
        return this.store(storeName).add(value, key);
    }

    async delete(storeName, key) {
        return this.store(storeName).delete(key);
    }

    async clear(storeName) {
        return this.store(storeName).clear();
    }

    async count(storeName, query) {
        return this.store(storeName).count(query);
    }

    async getAll(storeName, options) {
        return this.store(storeName).getAll(options);
    }

    async bulkPut(storeName, items, keys) {
        return this.store(storeName).bulkPut(items, keys);
    }

    async bulkAdd(storeName, items, keys) {
        return this.store(storeName).bulkAdd(items, keys);
    }

    async bulkDelete(storeName, keys) {
        return this.store(storeName).bulkDelete(keys);
    }

    async forEach(storeName, query, callback) {
        const cb = typeof query === 'function' ? query : callback;
        const q = typeof query === 'function' ? undefined : query;
        return this.store(storeName).iterate(q, cb);
    }

    // ── Management ────────────────────────────────────────────────────────────

    /**
     * Close the database connection
     */
    close() {
        if (this.db) {
            this.db.close();
            this.db = null;
        }
        this._openPromise = null;
        this._storeCache.clear();
    }

    /**
     * Delete the entire database
     * @returns {Promise<void>}
     */
    async deleteDatabase() {
        this.close();
        if (typeof indexedDB === 'undefined') {
            return Promise.reject(new Error('[IDB] IndexedDB is not supported in this environment'));
        }

        return new Promise((resolve, reject) => {
            const request = indexedDB.deleteDatabase(this.name);
            request.onsuccess = () => resolve();
            request.onerror = (e) => reject(e.target.error || new Error('Failed to delete database'));
            request.onblocked = () => console.warn(`[IDB] Database "${this.name}" deletion blocked.`);
        });
    }
}

export { IDB, Range, StoreHandle, IndexHandle };
export default IDB;

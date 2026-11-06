import { promisifyRequest } from './transaction.js';

/**
 * Handle for querying a secondary index
 */
class IndexHandle {
    constructor(indexSource) {
        this._source = indexSource; // Function returning raw IDBIndex or raw IDBIndex directly
    }

    _getRaw() {
        return typeof this._source === 'function' ? this._source() : this._source;
    }

    async get(key) {
        const idx = this._getRaw();
        return promisifyRequest(idx.get(key));
    }

    async getKey(key) {
        const idx = this._getRaw();
        return promisifyRequest(idx.getKey(key));
    }

    async getAll(query, count) {
        const idx = this._getRaw();
        return promisifyRequest(idx.getAll(query, count));
    }

    async getAllKeys(query, count) {
        const idx = this._getRaw();
        return promisifyRequest(idx.getAllKeys(query, count));
    }

    async count(query) {
        const idx = this._getRaw();
        return promisifyRequest(idx.count(query));
    }
}

/**
 * StoreHandle – Ergonomic interface for an IndexedDB Object Store
 */
class StoreHandle {
    /**
     * @param {string} name - Store name
     * @param {Object} context - Either { db } for standalone calls or { rawStore, tx } inside transaction
     */
    constructor(name, context) {
        this.name = name;
        this._db = context.db || null;
        this._raw = context.rawStore || null;
        this._tx = context.tx || null;
    }

    async _getStore(mode = 'readonly') {
        if (this._raw) return this._raw;
        const db = await this._db.open();
        const tx = db.transaction(this.name, mode);
        return tx.objectStore(this.name);
    }

    /**
     * Retrieve an item by key
     * @param {*} key
     */
    async get(key) {
        const store = await this._getStore('readonly');
        return promisifyRequest(store.get(key));
    }

    /**
     * Check if key exists in store
     * @param {*} key
     */
    async has(key) {
        const count = await this.count(key);
        return count > 0;
    }

    /**
     * Store an item (key-value or object with keyPath)
     * If 2 args: set(key, value)
     * If 1 arg: set(value) (when keyPath is configured)
     * @param {*} keyOrValue
     * @param {*} [value]
     */
    async set(keyOrValue, value) {
        const store = await this._getStore('readwrite');
        const req = value !== undefined ? store.put(value, keyOrValue) : store.put(keyOrValue);
        return promisifyRequest(req);
    }

    /**
     * Alias for put(value, key) standard IDB signature
     * @param {*} value
     * @param {*} [key]
     */
    async put(value, key) {
        const store = await this._getStore('readwrite');
        const req = key !== undefined ? store.put(value, key) : store.put(value);
        return promisifyRequest(req);
    }

    /**
     * Add an item (fails if key already exists)
     * @param {*} value
     * @param {*} [key]
     */
    async add(value, key) {
        const store = await this._getStore('readwrite');
        const req = key !== undefined ? store.add(value, key) : store.add(value);
        return promisifyRequest(req);
    }

    /**
     * Delete an item by key
     * @param {*} key
     */
    async delete(key) {
        const store = await this._getStore('readwrite');
        await promisifyRequest(store.delete(key));
        return true;
    }

    /**
     * Clear all items in store
     */
    async clear() {
        const store = await this._getStore('readwrite');
        await promisifyRequest(store.clear());
        return true;
    }

    /**
     * Count items in store matching query
     * @param {*} [query]
     */
    async count(query) {
        const store = await this._getStore('readonly');
        const req = query !== undefined ? store.count(query) : store.count();
        return promisifyRequest(req);
    }

    /**
     * Retrieve all items matching query with optional pagination
     * @param {Object} [options]
     * @param {*} [options.query]
     * @param {number} [options.count]
     * @param {number} [options.offset=0]
     * @param {boolean} [options.reverse=false]
     */
    async getAll(options = {}) {
        const isKeyRange = typeof IDBKeyRange !== 'undefined' && options instanceof IDBKeyRange;
        const query = options?.query !== undefined ? options.query : (isKeyRange || (typeof options !== 'object' && options !== null) ? options : undefined);
        const count = options?.count;
        const offset = options?.offset || 0;
        const reverse = Boolean(options?.reverse);

        const store = await this._getStore('readonly');

        // Fast native path when no cursor positioning required
        if (!offset && !reverse && typeof store.getAll === 'function') {
            const req = query !== undefined ? store.getAll(query, count) : (count ? store.getAll(null, count) : store.getAll());
            return promisifyRequest(req);
        }

        // Cursor fallback for offset or reverse
        const results = [];
        const direction = reverse ? 'prev' : 'next';
        await new Promise((resolve, reject) => {
            let skipped = false;
            const req = store.openCursor(query, direction);
            req.onsuccess = (e) => {
                const cursor = e.target.result;
                if (!cursor) return resolve();
                if (offset > 0 && !skipped) {
                    skipped = true;
                    cursor.advance(offset);
                    return;
                }
                results.push(cursor.value);
                if (count && results.length >= count) return resolve();
                cursor.continue();
            };
            req.onerror = () => reject(req.error || new Error('getAll cursor failed'));
        });

        return results;
    }

    /**
     * Retrieve all keys matching query
     * @param {Object} [options]
     */
    async getAllKeys(options = {}) {
        const query = options?.query !== undefined ? options.query : undefined;
        const count = options?.count;
        const store = await this._getStore('readonly');

        if (typeof store.getAllKeys === 'function') {
            const req = query !== undefined ? store.getAllKeys(query, count) : (count ? store.getAllKeys(null, count) : store.getAllKeys());
            return promisifyRequest(req);
        }

        const keys = [];
        await new Promise((resolve, reject) => {
            const req = store.openKeyCursor(query);
            req.onsuccess = (e) => {
                const cursor = e.target.result;
                if (!cursor) return resolve();
                keys.push(cursor.primaryKey);
                if (count && keys.length >= count) return resolve();
                cursor.continue();
            };
            req.onerror = () => reject(req.error || new Error('getAllKeys failed'));
        });

        return keys;
    }

    /**
     * Bulk insert / update items in a single readwrite transaction
     * @param {Array<*>} items
     * @param {Array<*>} [keys]
     */
    async bulkPut(items, keys = []) {
        if (!Array.isArray(items) || items.length === 0) return [];
        const store = await this._getStore('readwrite');
        const results = [];

        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const key = keys[i];
            const req = key !== undefined ? store.put(item, key) : store.put(item);
            results.push(await promisifyRequest(req));
        }

        return results;
    }

    /**
     * Bulk add items in a single readwrite transaction
     * @param {Array<*>} items
     * @param {Array<*>} [keys]
     */
    async bulkAdd(items, keys = []) {
        if (!Array.isArray(items) || items.length === 0) return [];
        const store = await this._getStore('readwrite');
        const results = [];

        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const key = keys[i];
            const req = key !== undefined ? store.add(item, key) : store.add(item);
            results.push(await promisifyRequest(req));
        }

        return results;
    }

    /**
     * Bulk delete items by keys in a single readwrite transaction
     * @param {Array<*>} keys
     */
    async bulkDelete(keys) {
        if (!Array.isArray(keys) || keys.length === 0) return;
        const store = await this._getStore('readwrite');

        for (const key of keys) {
            await promisifyRequest(store.delete(key));
        }
    }

    /**
     * Query via a secondary index
     * @param {string} indexName
     * @returns {IndexHandle}
     */
    index(indexName) {
        return new IndexHandle(async () => {
            const store = await this._getStore('readonly');
            return store.index(indexName);
        });
    }

    /**
     * Cursor iteration with early exit
     * @param {*} [query]
     * @param {Function} callback - Return false to stop early
     * @param {Object} [options]
     * @param {'next'|'prev'|'nextunique'|'prevunique'} [options.direction='next']
     */
    async iterate(query, callback, { direction = 'next' } = {}) {
        const store = await this._getStore('readonly');

        return new Promise((resolve, reject) => {
            const req = store.openCursor(query, direction);
            req.onsuccess = async (e) => {
                const cursor = e.target.result;
                if (!cursor) return resolve();
                try {
                    const shouldContinue = await callback(cursor.value, cursor.key, cursor);
                    if (shouldContinue === false) {
                        resolve();
                    } else {
                        cursor.continue();
                    }
                } catch (err) {
                    reject(err);
                }
            };
            req.onerror = () => reject(req.error || new Error('iterate failed'));
        });
    }

    /**
     * Async iterator yielding [key, value] pairs
     */
    async *[Symbol.asyncIterator]() {
        const store = await this._getStore('readonly');
        let currentResolve = null;
        let currentReject = null;
        let nextPromise = new Promise((res, rej) => { currentResolve = res; currentReject = rej; });
        let isDone = false;

        const req = store.openCursor();
        req.onsuccess = (e) => {
            const cursor = e.target.result;
            if (!cursor) {
                isDone = true;
                currentResolve(null);
                return;
            }
            const pair = [cursor.key, cursor.value];
            currentResolve({ pair, cursor });
        };
        req.onerror = () => {
            isDone = true;
            currentReject(req.error || new Error('Cursor failed'));
        };

        while (!isDone) {
            const step = await nextPromise;
            if (!step) break;

            yield step.pair;

            nextPromise = new Promise((res, rej) => { currentResolve = res; currentReject = rej; });
            step.cursor.continue();
        }
    }

    async *entries() {
        for await (const entry of this) {
            yield entry;
        }
    }

    async *values() {
        for await (const [, value] of this) {
            yield value;
        }
    }

    async *keys() {
        for await (const [key] of this) {
            yield key;
        }
    }
}

export { StoreHandle, IndexHandle };

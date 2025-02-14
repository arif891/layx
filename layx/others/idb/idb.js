class IDB {
    constructor(dbName, version = 1, upgradeCallback) {
        this.dbName = dbName;
        this.version = version;
        this.upgradeCallback = upgradeCallback;
        this.db = null;
        this.openPromise = null;
    }

    async open() {
        if (this.db) return this.db;
        if (this.openPromise) return this.openPromise;

        this.openPromise = new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onupgradeneeded = (event) => {
                this.db = event.target.result;
                if (this.upgradeCallback) {
                    this.upgradeCallback(this.db, event.oldVersion, event.newVersion);
                }
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                resolve(this.db);
                this.openPromise = null;
            };

            request.onerror = (event) => {
                reject(new Error(`Error opening database: ${event.target.error.message}`));
                this.openPromise = null;
            };
        });

        return this.openPromise;
    }

    async transaction(storeNames, mode = "readonly") {
        const db = await this.open();
        return db.transaction(storeNames, mode);
    }

    async store(storeName, mode = "readonly") {
        const tx = await this.transaction(storeName, mode);
        return tx.objectStore(storeName);
    }

    async add(storeName, value, key) {
        try {
            const store = await this.store(storeName, "readwrite");
            return await this.request(store.add(value, key));
        } catch (error) {
            throw new Error(`Add operation failed: ${error.message}`);
        }
    }

    async get(storeName, keyOrIndex, key) {
        this.validateStoreName(storeName);
        this.validateKey(keyOrIndex);
        try {
            const store = await this.store(storeName);
            const request = key !== undefined ? store.index(keyOrIndex).get(key) : store.get(keyOrIndex);
            return await this.request(request);
        } catch (error) {
            throw new Error(`Get operation failed: ${error.message}`);
        }
    }

    async getAll(storeName, query) {
        try {
            const store = await this.store(storeName);
            const results = [];
            return new Promise((resolve, reject) => {
                const request = query ? store.openCursor(query) : store.openCursor();

                request.onsuccess = (event) => {
                    const cursor = event.target.result;
                    if (cursor) {
                        results.push(cursor.value);
                        cursor.continue();
                    } else {
                        resolve(results);
                    }
                };

                request.onerror = (event) => reject(new Error(`GetAll operation failed: ${event.target.error.message}`));
            });
        } catch (error) {
            throw new Error(`GetAll operation failed: ${error.message}`);
        }
    }

    async forEach(storeName, query, callback) {
        try {
            const store = await this.store(storeName);
            return new Promise((resolve, reject) => {
                const request = query ? store.openCursor(query) : store.openCursor();

                request.onsuccess = async (event) => {
                    const cursor = event.target.result;
                    if (cursor) {
                        await callback(cursor.value, cursor);
                        cursor.continue();
                    } else {
                        resolve();
                    }
                };

                request.onerror = (event) => reject(new Error(`ForEach operation failed: ${event.target.error.message}`));
            });
        } catch (error) {
            throw new Error(`ForEach operation failed: ${error.message}`);
        }
    }

    async put(storeName, value, key) {
        this.validateStoreName(storeName);
        if (!value) {
            throw new Error('No value provided for put operation');
        }
        try {
            const store = await this.store(storeName, "readwrite");
            return await this.request(store.put(value, key));
        } catch (error) {
            throw new Error(`Put operation failed: ${error.message}`);
        }
    }

    async delete(storeName, key) {
        try {
            const store = await this.store(storeName, "readwrite");
            return await this.request(store.delete(key));
        } catch (error) {
            throw new Error(`Delete operation failed: ${error.message}`);
        }
    }

    async clear(storeName) {
        try {
            const store = await this.store(storeName, "readwrite");
            return await this.request(store.clear());
        } catch (error) {
            throw new Error(`Clear operation failed: ${error.message}`);
        }
    }

    async count(storeName, query) {
        try {
            const store = await this.store(storeName);
            return await this.request(store.count(query));
        } catch (error) {
            throw new Error(`Count operation failed: ${error.message}`);
        }
    }

    async getByIndex(storeName, indexName, value) {
        try {
            const store = await this.store(storeName);
            const index = store.index(indexName);
            return await this.request(index.get(value));
        } catch (error) {
            throw new Error(`GetByIndex operation failed: ${error.message}`);
        }
    }

    async getAllByIndex(storeName, indexName, value) {
        try {
            const store = await this.store(storeName);
            const index = store.index(indexName);
            return await this.request(index.getAll(value));
        } catch (error) {
            throw new Error(`GetAllByIndex operation failed: ${error.message}`);
        }
    }

    async bulkAdd(storeName, items) {
        try {
            const store = await this.store(storeName, "readwrite");
            const promises = items.map(item => this.request(store.add(item)));
            return await Promise.all(promises);
        } catch (error) {
            throw new Error(`BulkAdd operation failed: ${error.message}`);
        }
    }

    async bulkPut(storeName, items) {
        try {
            const store = await this.store(storeName, "readwrite");
            const promises = items.map(item => this.request(store.put(item)));
            return await Promise.all(promises);
        } catch (error) {
            throw new Error(`BulkPut operation failed: ${error.message}`);
        }
    }

    validateKey(key) {
        if (!key && key !== 0) {
            throw new Error('Invalid key provided');
        }
    }

    validateStoreName(storeName) {
        if (!storeName || typeof storeName !== 'string') {
            throw new Error('Invalid store name provided');
        }
    }

    close() {
        if (this.db) {
            this.db.close();
            this.db = null;
            this.openPromise = null;
        }
    }

    async deleteDatabase() {
        this.close();
        return new Promise((resolve, reject) => {
            const request = indexedDB.deleteDatabase(this.dbName);
            request.onsuccess = resolve;
            request.onerror = (event) => reject(new Error(`DeleteDatabase operation failed: ${event.target.error.message}`));
        });
    }

    // Utility function for handling indexedDB requests
    request(request) {
        return new Promise((resolve, reject) => {
            request.onsuccess = () => resolve(request.result);
            request.onerror = (event) => reject(new Error(event.target.error.message));
        });
    }
}

export { IDB };
export class IndexedDBUtil {
    constructor(dbName, version = 1) {
        this.dbName = dbName;
        this.version = version;
        this.db = null;
        this.stores = new Map();
    }

    async connect() {
        if (this.db) return this.db;

        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onerror = () => {
                reject(new Error(`Failed to open database: ${request.error}`));
            };

            request.onsuccess = () => {
                this.db = request.result;
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                this.db = event.target.result;
                this.stores.forEach((config, storeName) => {
                    if (!this.db.objectStoreNames.contains(storeName)) {
                        this.db.createObjectStore(storeName, config);
                    }
                });
            };
        });
    }

    addStore(name, config = { keyPath: 'id' }) {
        this.stores.set(name, config);
        return this;
    }

    async transaction(storeName, mode = 'readonly') {
        if (!this.db) await this.connect();

        return new Promise((resolve, reject) => {
            try {
                const transaction = this.db.transaction(storeName, mode);
                const store = transaction.objectStore(storeName);

                transaction.onerror = () => {
                    reject(new Error(`Transaction failed: ${transaction.error}`));
                };

                resolve(store);
            } catch (error) {
                reject(new Error(`Failed to start transaction: ${error.message}`));
            }
        });
    }

    async add(storeName, data) {
        const store = await this.transaction(storeName, 'readwrite');
        return new Promise((resolve, reject) => {
            const request = store.add(data);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async put(storeName, data) {
        const store = await this.transaction(storeName, 'readwrite');
        return new Promise((resolve, reject) => {
            const request = store.put(data);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async putBulk(storeName, items) {
        const store = await this.transaction(storeName, 'readwrite');
        return Promise.all(items.map(item => {
            return new Promise((resolve, reject) => {
                const request = store.put(item);
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
        }));
    }

    async get(storeName, key) {
        const store = await this.transaction(storeName);
        return new Promise((resolve, reject) => {
            const request = store.get(key);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getAll(storeName, query = null, count = 0) {
        const store = await this.transaction(storeName);
        return new Promise((resolve, reject) => {
            const request = store.getAll(query, count);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async deleteRecord(storeName, key) {
        const store = await this.transaction(storeName, 'readwrite');
        return new Promise((resolve, reject) => {
            const request = store.delete(key);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async clear(storeName) {
        const store = await this.transaction(storeName, 'readwrite');
        return new Promise((resolve, reject) => {
            const request = store.clear();
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async count(storeName, query = null) {
        const store = await this.transaction(storeName);
        return new Promise((resolve, reject) => {
            const request = store.count(query);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async iterate(storeName, callback, query = null) {
        const store = await this.transaction(storeName);
        return new Promise((resolve, reject) => {
            const request = store.openCursor(query);
            request.onsuccess = () => {
                const cursor = request.result;
                if (cursor) {
                    callback(cursor.value, cursor.key);
                    cursor.continue();
                } else {
                    resolve();
                }
            };
            request.onerror = () => reject(request.error);
        });
    }

    async close() {
        if (this.db) {
            this.db.close();
            this.db = null;
        }
    }

    async deleteDatabase() {
        await this.close();
        return new Promise((resolve, reject) => {
            const request = indexedDB.deleteDatabase(this.dbName);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }
}
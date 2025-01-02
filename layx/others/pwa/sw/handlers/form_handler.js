export class FormHandler {
    constructor(logger) {
        this.logger = logger;
        this.dbName = 'form-store';
        this.storeName = 'pending-forms';
        this.dbVersion = 1;
        this.db = null;
        this.initDb();
    }

    async initDb() {
        try {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = () => {
                this.logger.error('Failed to open IndexedDB:', request.error);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(this.storeName)) {
                    db.createObjectStore(this.storeName, { keyPath: 'id' });
                }
            };

            this.db = await new Promise((resolve, reject) => {
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });

        } catch (error) {
            this.logger.error('IndexedDB initialization failed:', error);
        }
    }

    async handle(event) {
        const request = event.request;
        
        try {
            const response = await fetch(request.clone());
            if (response.ok) return response;
            throw new Error(`HTTP Error: ${response.status}`);
        } catch (error) {
            this.logger.warn('Form submission failed, queuing for later:', error);
            await this.queueForm(request);
            return new Response(JSON.stringify({
                status: 'queued',
                message: 'Form queued for submission when online'
            }), {
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }

    async queueForm(request) {
        if (!this.db) await this.initDb();

        const formData = await request.formData();
        const data = {};
        for (const [key, value] of formData.entries()) {
            data[key] = value instanceof File ? 
                { name: value.name, type: value.type, size: value.size } : 
                value;
        }

        const form = {
            id: Date.now().toString(),
            url: request.url,
            method: request.method,
            headers: Array.from(request.headers.entries()),
            data,
            timestamp: Date.now(),
            retryCount: 0
        };

        await this.addToStore(form);

        if ('sync' in self.registration) {
            await self.registration.sync.register('form-sync');
        }
    }

    async syncPendingForms() {
        if (!this.db) await this.initDb();

        const forms = await this.getAllFromStore();
        
        for (const form of forms) {
            try {
                const response = await fetch(form.url, {
                    method: form.method,
                    headers: new Headers(form.headers),
                    body: JSON.stringify(form.data)
                });

                if (response.ok) {
                    await this.deleteFromStore(form.id);
                    this.logger.log('Synced form:', form.id);
                } else {
                    form.retryCount++;
                    if (form.retryCount < 3) {
                        await this.addToStore(form);
                    } else {
                        await this.deleteFromStore(form.id);
                        this.logger.error('Max retries reached for form:', form.id);
                    }
                }
            } catch (error) {
                this.logger.error('Failed to sync form:', error);
            }
        }
    }

    async addToStore(form) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            const request = store.put(form);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getAllFromStore() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async deleteFromStore(id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            const request = store.delete(id);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }
}

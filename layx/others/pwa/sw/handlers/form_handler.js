import { openDB } from 'idb';

export class FormHandler {
    constructor(logger) {
        this.logger = logger;
        this.dbName = 'form-store';
        this.storeName = 'pending-forms';
        this.initDb();
    }

    async initDb() {
        this.db = await openDB(this.dbName, 1, {
            upgrade(db) {
                db.createObjectStore('pending-forms', { keyPath: 'id' });
            }
        });
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
        const formData = await request.formData();
        const data = {};
        for (const [key, value] of formData.entries()) {
            data[key] = value;
        }

        await this.db.add('pending-forms', {
            id: Date.now().toString(),
            url: request.url,
            method: request.method,
            headers: Array.from(request.headers.entries()),
            data
        });

        // Register for background sync if available
        if ('sync' in self.registration) {
            await self.registration.sync.register('form-sync');
        }
    }

    async syncPendingForms() {
        const forms = await this.db.getAll('pending-forms');
        
        for (const form of forms) {
            try {
                const response = await fetch(form.url, {
                    method: form.method,
                    headers: new Headers(form.headers),
                    body: JSON.stringify(form.data)
                });

                if (response.ok) {
                    await this.db.delete('pending-forms', form.id);
                    this.logger.log('Synced form:', form.id);
                }
            } catch (error) {
                this.logger.error('Failed to sync form:', error);
            }
        }
    }
}

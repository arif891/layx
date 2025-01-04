import { IndexedDBUtil } from '../utils/indexedDB.js';

export class FormHandler {
    constructor(logger) {
        this.logger = logger;
        this.db = new IndexedDBUtil('form-store', 1)
            .addStore('pending-forms', { 
                keyPath: 'id',
                indexes: [
                    { name: 'timestamp', keyPath: 'timestamp' }
                ]
            });
        this.init();
    }

    async init() {
        try {
            await this.db.connect();
        } catch (error) {
            this.logger.error('Failed to initialize form store:', error);
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

        await this.db.add('pending-forms', form);

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
                    await this.db.deleteRecord('pending-forms', form.id);
                    this.logger.log('Synced form:', form.id);
                } else {
                    form.retryCount++;
                    if (form.retryCount < 3) {
                        await this.db.add('pending-forms', form);
                    } else {
                        await this.db.deleteRecord('pending-forms', form.id);
                        this.logger.error('Max retries reached for form:', form.id);
                    }
                }
            } catch (error) {
                this.logger.error('Failed to sync form:', error);
            }
        }
    }
}

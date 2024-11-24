class Form {
    constructor(selector = 'form', options = {}) {
        this.forms = document.querySelectorAll(selector);
        this.options = {
            onSuccess: options.onSuccess || this.defaultOnSuccess,
            onError: options.onError || this.defaultOnError,
            beforeSubmit: options.beforeSubmit || this.defaultBeforeSubmit
        };
        this.init();
    }

    init() {
        this.forms.forEach(form => this.handleFormSubmission(form));
    }

    handleFormSubmission(form) {
        if (!form.classList.contains('default')) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();

                const formData = new FormData(form);
                const formUrl = form.action;
               
                try {
                    // Call beforeSubmit and allow it to modify formData
                    const modifiedFormData = await this.options.beforeSubmit(formData, form);

                    const response = await this.submitFormData(modifiedFormData, formUrl);
                    this.options.onSuccess(response, form);
                } catch (error) {
                    this.options.onError(error, form);
                }
            });
        } 
    }

    async submitFormData(formData, formUrl) {
        const response = await fetch(formUrl, {
            method: 'POST',
            body: formData,
            // Header for sevice worker and server
            headers: {
                'X-Requested-With': 'FormSubmission'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return response;
    }

    defaultOnSuccess(response, form) {
        console.log('Form submission successful', response);
        // You could add default success behavior here, like showing a message
    }

    defaultOnError(error, form) {
        console.error('Form submission unsuccessful', error);
        // You could add default error behavior here, like showing an error message
    }

    defaultBeforeSubmit(formData, form) {
        // Log form data, including files
        for (let [key, value] of formData.entries()) {
            if (value instanceof File) {
                console.log(`${key}: File - ${value.name} (${value.type}, ${value.size} bytes)`);
            } else {
                console.log(`${key}: ${value}`);
            }
        }
        return formData; // Return unmodified formData by default
    }
}

// Usage
new Form();

const modernRangeInputs = document.querySelectorAll('input[type="range"].modern');

modernRangeInputs.forEach(input => {
    // Set initial CSS custom properties
    input.style.setProperty('--value', input.value);
    input.style.setProperty('--min', input.min || '0');
    input.style.setProperty('--max', input.max || '100');

    // Update CSS custom property on input change
    input.addEventListener('input', () => {
        input.style.setProperty('--value', input.value);
    });
});
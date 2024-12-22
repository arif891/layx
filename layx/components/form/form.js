class Form {
    constructor(selector = 'form', options = {}) {
        this.forms = document.querySelectorAll(selector);
        this.customRangeInputs = document.querySelectorAll('input[type="range"]:not(.default)');
        this.options = {
            feedbackWrapperSelector: '.feedback-wrapper',
            onSuccess: options.onSuccess || this.defaultOnSuccess,
            onError: options.onError || this.defaultOnError,
            beforeSubmit: options.beforeSubmit || this.defaultBeforeSubmit,
            headers: options.headers || { 'X-Requested-With': 'FormSubmission' },
            ...options
        };
        this.init();
    }

    init() {
        this.forms.forEach(form => this.handleFormSubmission(form));

        this.customRangeInputs.forEach(input => {
            // Set initial CSS custom properties
            input.style.setProperty('--value', input.value);
            input.style.setProperty('--min', input.min || '0');
            input.style.setProperty('--max', input.max || '100');

            // Update CSS custom property on input change
            input.addEventListener('input', () => {
                input.style.setProperty('--value', input.value);
            });
        });
    }

    handleFormSubmission(form) {
        if (!form.classList.contains('no-handle')) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                form.classList.add('submitting');
                form.classList.remove('error', 'success');

                const formData = new FormData(form);
                let formUrl = form.action;
                let formName = form.name;

                try {
                    // Call beforeSubmit and allow it to modify formData
                    const modifiedFormData = await this.options.beforeSubmit(formData, formUrl, formName, form);

                    const response = await this.submitFormData(modifiedFormData, formUrl, formName);
                    this.options.onSuccess(response, form);
                    form.classList.remove('submitting');
                    form.classList.add('success');
                } catch (error) {
                    this.options.onError(error, form);
                    form.classList.remove('submitting');
                    form.classList.add('error');
                }
            });
        }
    }

    async submitFormData(formData, formUrl, formName) {
        const url = new URL(formUrl);
        const formParam = formName && formName.trim() ? formName : 'default';
        url.searchParams.set('form', formParam);

        const response = await fetch(url.toString(), {
            method: 'POST',
            body: formData,
            headers: this.options.headers,
        });

        if (!response.ok) {
            throw new Error(`HTTP error status: ${response.status}`);
        }

        return response;
    }

    async defaultOnSuccess(response, form) {
        form.reset();
        const responseText = await response.text();
        console.log('Form submission successful!', responseText);
        // You could add default success behavior here, like showing a message
    }

    async defaultOnError(error, form) {
        console.error('Form submission unsuccessful!', error);
        // You could add default error behavior here, like showing an error message
    }

    async defaultBeforeSubmit(formData, formUrl, formName, form) {
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


export default new Form;
export { Form };
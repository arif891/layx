class Dialog {
  constructor(selector = 'dialog', options = {}) {
    this.options = {
      globalWrapperSelector: '.global-dialog-wrapper',
      closeBtnSelector: '.close',
      animationDuration: 600,
      autoClose: false,
      autoCloseDelay: 5000,
      position: 'top',
      alignment: 'center',
      modern: false,
      closeOnEscape: true,
      focusTrap: true,
      onOpen: null,
      onClose: null,
      ...options
    };

    this.dialogs = document.querySelectorAll(selector);
    this.togglers = document.querySelectorAll('[data-dialog-target]');
    this.activeDialog = null;
    this.previousActiveElement = null;
    this.backdropMap = new WeakMap();
    this.initialize();
  }

  initialize() {
    if (this.dialogs.length) {
      this.setupExistingDialogs();
    }
    this.addTriggerListeners();
    this.addCloseButtonListeners();
    this.addBackdropListeners();
    this.addKeyboardListeners();
  }

  setupExistingDialogs() {
    this.dialogs.forEach(dialog => {
      if (dialog.classList.contains('modal') && !this.backdropMap.has(dialog)) {
        const backdrop = this.createBackdrop();
        this.backdropMap.set(dialog, backdrop);
        dialog.insertAdjacentElement('afterend', backdrop);
      }
    });
  }

  create(content, options = {}) {
    const dialog = document.createElement('dialog');
    dialog.className = `dialog ${options.modern ? 'modern' : ''} ${options.position || this.options.position} ${options.alignment || this.options.alignment}`;

    const contentWrapper = document.createElement('div');
    contentWrapper.className = 'content';

    if (typeof content === 'string') {
      contentWrapper.innerHTML = content;
    } else if (content instanceof HTMLElement) {
      contentWrapper.appendChild(content);
    }

    dialog.appendChild(contentWrapper);
    document.body.appendChild(dialog);

    if (options.modal !== false) {
      dialog.classList.add('modal');
      const backdrop = this.createBackdrop();
      this.backdropMap.set(dialog, backdrop);
      dialog.insertAdjacentElement('afterend', backdrop);
    }

    return dialog;
  }

  async open(dialog) {
    if (dialog.hasAttribute('open')) return;

    this.previousActiveElement = document.activeElement;

    // Close other open dialogs if modal
    if (dialog.classList.contains('modal')) {
      this.dialogs.forEach(d => {
        if (d !== dialog && d.hasAttribute('open')) {
          this.close(d);
        }
      });
    }

    dialog.setAttribute('open', '');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('role', 'dialog');
    this.activeDialog = dialog;

    if (dialog.classList.contains('modal')) {
      const backdrop = this.backdropMap.get(dialog);
      if (backdrop) {
        backdrop.setAttribute('open', '');
        document.body.style.overflow = 'hidden';
      }
    }

    if (this.options.focusTrap) {
      this.setFocusTrap(dialog);
    }

    if (this.options.autoClose) {
      setTimeout(() => this.close(dialog), this.options.autoCloseDelay);
    }

    dialog.dispatchEvent(new CustomEvent('dialog:open', { detail: { dialog } }));
    if (typeof this.options.onOpen === 'function') {
      this.options.onOpen(dialog);
    }

    return new Promise(resolve => {
      dialog.addEventListener('transitionend', () => resolve(dialog), { once: true });
    });
  }

  async close(dialog) {
    if (!dialog.hasAttribute('open')) return;

    dialog.removeAttribute('open');
    dialog.removeAttribute('aria-modal');
    dialog.removeAttribute('role');
    
    const backdrop = this.backdropMap.get(dialog);
    if (backdrop) {
      backdrop.removeAttribute('open');
    }

    if (this.activeDialog === dialog) {
      document.body.style.overflow = '';
      this.activeDialog = null;
    }

    if (this.previousActiveElement) {
      this.previousActiveElement.focus();
      this.previousActiveElement = null;
    }

    dialog.dispatchEvent(new CustomEvent('dialog:close', { detail: { dialog } }));
    if (typeof this.options.onClose === 'function') {
      this.options.onClose(dialog);
    }

    return new Promise(resolve => {
      dialog.addEventListener('transitionend', () => resolve(dialog), { once: true });
    });
  }

  toggle(dialog) {
    return dialog.hasAttribute('open') ? this.close(dialog) : this.open(dialog);
  }

  createBackdrop() {
    const backdrop = document.createElement('backdrop');
    backdrop.className = 'dialog-backdrop';
    backdrop.style.setProperty('--backdrop-transition', `${this.options.animationDuration}ms`);
    return backdrop;
  }

  setFocusTrap(dialog) {
    const focusableElements = dialog.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    if (focusableElements.length) {
      const firstFocusable = focusableElements[0];
      const lastFocusable = focusableElements[focusableElements.length - 1];

      firstFocusable.focus();

      dialog.addEventListener('keydown', (e) => {
        if (e.key === 'Tab') {
          if (e.shiftKey && document.activeElement === firstFocusable) {
            e.preventDefault();
            lastFocusable.focus();
          } else if (!e.shiftKey && document.activeElement === lastFocusable) {
            e.preventDefault();
            firstFocusable.focus();
          }
        }
      });
    }
  }

  addTriggerListeners() {
    this.togglers.forEach(trigger => {
      trigger.addEventListener('click', (e) => {
        e.preventDefault();
        const targetId = trigger.getAttribute('data-dialog-target');
        const targetDialog = document.querySelector(targetId);
        if (targetDialog) {
          this.toggle(targetDialog);
        }
      });
    });
  }

  addCloseButtonListeners() {
    this.dialogs.forEach(dialog => {
      const closeButtons = dialog.querySelectorAll(this.options.closeBtnSelector);
      closeButtons.forEach(closeButton => {
        closeButton.addEventListener('click', (e) => {
          e.preventDefault();
          this.close(dialog);
        });
      });
    });
  }

  addBackdropListeners() {
    document.addEventListener('click', (e) => {
      if (e.target.tagName.toLowerCase() === 'backdrop') {
        const dialog = e.target.previousElementSibling;
        if (dialog?.matches('dialog, .dialog')) {
          this.close(dialog);
        }
      }
    });
  }

  addKeyboardListeners() {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.options.closeOnEscape && this.activeDialog) {
        this.close(this.activeDialog);
      }
    });
  }

  destroy() {
    // Clean up backdrops
    this.dialogs.forEach(dialog => {
      const backdrop = this.backdropMap.get(dialog);
      if (backdrop && backdrop.parentNode) {
        backdrop.parentNode.removeChild(backdrop);
      }
    });
    
    // Reset maps and references
    this.backdropMap = new WeakMap();
    this.activeDialog = null;
    this.previousActiveElement = null;
    
    // Remove event listeners (if needed)
    this.togglers.forEach(trigger => {
      trigger.removeEventListener('click');
    });
  }
}

export default new Dialog();
export { Dialog };
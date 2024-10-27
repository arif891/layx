class Dialog {
  constructor(slector = 'dialog') {
    this.dialogs = document.querySelectorAll('dialog');
    this.togglers = document.querySelectorAll('[data-dialog-target]');
    this.initialize();
  }

  initialize() {
    this.addTriggerListeners();
    this.addCloseButtonListeners();
    this.addBackdropListeners();
  }

  addTriggerListeners() {
    this.togglers.forEach(trigger => {
      trigger.addEventListener('click', (e) => {
        e.preventDefault();
        const targetId = trigger.getAttribute('data-dialog-target');
        const targetDialog = document.querySelector(targetId);
        if (targetDialog) {
          this.toggledialog(targetDialog);
        }
      });
    });
  }

  addCloseButtonListeners() {
    document.querySelectorAll('.close').forEach(closeButton => {
      closeButton.addEventListener('click', (e) => {
        e.preventDefault();
        const dialog = closeButton.closest('dialog');
        if (dialog) {
          this.closeDialog(dialog);
        }
      });
    });
  }

  addBackdropListeners() {
    document.addEventListener('click', (e) => {
      if (e.target.tagName.toLowerCase() === 'backdrop') {
        const dialog = e.target.previousElementSibling;
        if (dialog && (dialog.tagName.toLowerCase() === 'dialog' || dialog.classList.contains('dialog'))) {
          this.closeDialog(dialog);
        }
      }
    });
  }

  openDialog(dialog) {
    dialog.setAttribute('open', '');
    if (dialog.classList.contains('modal')) {
      let dialogBackdrop = dialog.parentElement.querySelector('backdrop');
      if (!dialogBackdrop) {
        dialogBackdrop = document.createElement('backdrop');
        dialogBackdrop.classList.add('dialog-backdrop');
        dialog.insertAdjacentElement('afterend', dialogBackdrop);
      }
      dialogBackdrop.setAttribute('open', '');
    }
  }

  closeDialog(dialog) {
    dialog.removeAttribute('open');
    if (dialog.classList.contains('modal')) {
      let dialogBackdrop = dialog.nextElementSibling;
      if (dialogBackdrop && dialogBackdrop.tagName.toLowerCase() === 'backdrop') {
        dialogBackdrop.removeAttribute('open');
      }
    }
  }

  toggledialog(dialog) {
    if (dialog.hasAttribute('open')) {
      this.closeDialog(dialog);
    } else {
      this.openDialog(dialog);
    }
  }
}


// Export an instance of Dialog to initialize it when imported
export default new Dialog();
export {Dialog};
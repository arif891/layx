class Sheet {
    constructor(selector = 'sheet', dragThreshold = .4) {
        this.sheets = document.querySelectorAll(selector);
        this.dragThreshold = dragThreshold; // % of sheet size
        this.togglers = document.querySelectorAll('[data-sheet-target]');
        this.init();
    }

    init() {
        this.addTriggerListeners();
        this.addDragListeners();

        this.sheets.forEach(sheet => {
            this.addCloseButtonListeners(sheet);
        });
    }

    addTriggerListeners() {
        this.togglers.forEach(trigger => {
            trigger.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = trigger.getAttribute('data-sheet-target');
                const targetSheet = document.querySelector(targetId);
                if (targetSheet) {
                    this.toggleSheet(targetSheet);
                }
            });
        });
    }

    addCloseButtonListeners(sheet) {
        sheet.querySelectorAll('.close').forEach(closeButton => {
            closeButton.addEventListener('click', (e) => {
                e.preventDefault();
                this.closeSheet(sheet);
            });
        });
    }

    addDragListeners() {
        this.sheets.forEach(sheet => {
            let startY, startX;
            let currentY, currentX;
            let isDragging = false;
            const draggableArea = document.querySelector('.draggable-area') || sheet;

            const onStart = (e) => {
                if (e.type === 'touchstart') {
                    startY = e.touches[0].clientY;
                    startX = e.touches[0].clientX;
                } else {
                    startY = e.clientY;
                    startX = e.clientX;
                }
                isDragging = true;
                sheet.style.transition = 'none';
            };

            const onMove = (e) => {
                if (!isDragging) return;

                if (e.type === 'touchmove') {
                    currentY = e.touches[0].clientY;
                    currentX = e.touches[0].clientX;
                } else {
                    currentY = e.clientY;
                    currentX = e.clientX;
                }

                const deltaY = currentY - startY;
                const deltaX = currentX - startX;

                if (sheet.classList.contains('top')) {
                    sheet.style.transform = `translateY(${Math.min(0, deltaY)}px)`;
                } else if (sheet.classList.contains('bottom')) {
                    sheet.style.transform = `translateY(${Math.max(0, deltaY)}px)`;
                } else if (sheet.classList.contains('left')) {
                    sheet.style.transform = `translateX(${Math.min(0, deltaX)}px)`;
                } else if (sheet.classList.contains('right')) {
                    sheet.style.transform = `translateX(${Math.max(0, deltaX)}px)`;
                }
            };

            const onEnd = () => {
                if (!isDragging) return;

                isDragging = false;
                sheet.style.transition = '';

                const sheetRect = sheet.getBoundingClientRect();
                const threshold = this.dragThreshold * (
                    sheet.classList.contains('top') || sheet.classList.contains('bottom')
                        ? sheetRect.height
                        : sheetRect.width
                );

                const deltaY = currentY - startY;
                const deltaX = currentX - startX;

                let shouldClose = false;

                if (sheet.classList.contains('top')) {
                    shouldClose = deltaY < -threshold;
                } else if (sheet.classList.contains('bottom')) {
                    shouldClose = deltaY > threshold;
                } else if (sheet.classList.contains('left')) {
                    shouldClose = deltaX < -threshold;
                } else if (sheet.classList.contains('right')) {
                    shouldClose = deltaX > threshold;
                }

                if (shouldClose) {
                    this.closeSheet(sheet);
                } else {
                    sheet.style.transform = '';
                }
            };


            const addTouchListeners = () => {
                draggableArea.addEventListener('touchstart', onStart);
                draggableArea.addEventListener('touchmove', onMove);
                draggableArea.addEventListener('touchend', onEnd);
            };

            const addMouseListeners = () => {
                draggableArea.addEventListener('mousedown', onStart);
                window.addEventListener('mousemove', onMove);
                window.addEventListener('mouseup', onEnd);
            };


            if ('ontouchstart' in window) {
                addTouchListeners();
            } else {
                addMouseListeners();
            }
        });
    }


    openSheet(sheet) {
        sheet.setAttribute('open', '');
        sheet.style.transform = '';
        if (!sheet.classList.contains('none-modal')) {
            let sheetBackdrop = sheet.parentElement.querySelector('.sheet-backdrop');
            if (!sheetBackdrop) {
                sheetBackdrop = document.createElement('backdrop');
                sheetBackdrop.classList.add('sheet-backdrop');
                sheet.insertAdjacentElement('afterend', sheetBackdrop);
            }
            sheetBackdrop.setAttribute('open', '');

            sheetBackdrop.addEventListener('click',() => {
              this.closeSheet(sheet);
            })
        }
    }

    closeSheet(sheet) {
        sheet.removeAttribute('open');
        sheet.style.transform = '';
        if (!sheet.classList.contains('none-modal')) {
            let sheetBackdrop = sheet.parentElement.querySelector('.sheet-backdrop');
            if (sheetBackdrop) {
                sheetBackdrop.removeAttribute('open');
            }
        }
    }

    toggleSheet(sheet) {
        if (sheet.hasAttribute('open')) {
            this.closeSheet(sheet);
        } else {
            this.openSheet(sheet);
        }
    }

}

export { Sheet };
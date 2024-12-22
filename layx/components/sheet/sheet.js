class Sheet {
    constructor(selector = 'sheet', options = {}) {
        this.options = {
            dragThreshold: 0.4,
            oppositeDirectionAllowed: 0,
            togglerSelector: '[data-sheet-target]',
            draggableAreaSelector: '.draggable-area',
            closeButtonSelector: '.close',
            backdropClass: 'sheet-backdrop',
            snapElementSelector: '.snap',
            dragClose: true,
            keyboardClose: true,
            ...options
        };
        this.sheets = document.querySelectorAll(selector);
        // Only get togglers that target the sheets in this instance
        this.togglers = Array.from(document.querySelectorAll(this.options.togglerSelector))
            .filter(toggler => {
                const targetId = toggler.getAttribute('data-sheet-target');
                return Array.from(this.sheets).some(sheet => 
                    sheet.id && `#${sheet.id}` === targetId
                );
            });
        this.handleKeyPress = this.handleKeyPress.bind(this);
        
        this.sheetStates = new WeakMap();
        this.init();
    }

    init() {
        this.addTriggerListeners();
        this.sheets.forEach(sheet => {
            this.sheetStates.set(sheet, {
                currentSnap: 0,
                dragStartSnap: 0,
                currentDelta: 0
            });
            
            this.addCloseButtonListeners(sheet);
            this.addBackdropListeners(sheet);
            if (this.options.dragClose) {
                this.addDragListeners(sheet);
            }
        });
    }

    addTriggerListeners() {
        this.togglers.forEach(trigger => {
            // Remove any existing click listeners
            const newTrigger = trigger.cloneNode(true);
            trigger.parentNode.replaceChild(newTrigger, trigger);
            
            newTrigger.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = newTrigger.getAttribute('data-sheet-target');
                const targetSheet = document.querySelector(targetId);
                if (targetSheet) this.toggle(targetSheet);
            });
        });
    }

    addCloseButtonListeners(sheet) {
        const closeButtons = sheet.querySelectorAll(this.options.closeButtonSelector);
        closeButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                this.close(sheet);
            });
        });
    }

    addBackdropListeners(sheet) {
        if (sheet.classList.contains('none-modal')) return;

        let backdrop = sheet.parentElement.querySelector(`.${this.options.backdropClass}`);
        if (!backdrop) {
            backdrop = document.createElement('backdrop');
            backdrop.classList.add(this.options.backdropClass);
            backdrop.addEventListener('click', () => this.close(sheet));
            sheet.insertAdjacentElement('afterend', backdrop);
        }
    }

    addDragListeners(sheet) {
        const draggableArea = sheet.querySelector(this.options.draggableAreaSelector) || sheet;
        let startY, startX, currentY, currentX, isDragging = false;

        const onStart = (e) => {
            const { clientY, clientX } = e.type === 'touchstart' ? e.touches[0] : e;
            startY = clientY;
            startX = clientX;
            isDragging = true;
            sheet.style.transition = 'none';
            
            // Store the starting snap position
            const state = this.sheetStates.get(sheet);
            state.dragStartSnap = state.currentSnap;
            this.sheetStates.set(sheet, state);
        };

        const onMove = (e) => {
            if (!isDragging) return;
            const { clientY, clientX } = e.type === 'touchmove' ? e.touches[0] : e;
            currentY = clientY;
            currentX = clientX;
            this.updateSheetTransform(sheet, startY, startX, currentY, currentX);
        };

        const onEnd = () => {
            if (!isDragging) return;
            isDragging = false;
            sheet.style.transition = '';
            this.handleDragEnd(sheet, startY, startX, currentY, currentX);
        };

        this.addEventListeners(draggableArea, onStart, onMove, onEnd);
    }

    updateSheetTransform(sheet, startY, startX, currentY, currentX) {
        const deltaY = currentY - startY;
        const deltaX = currentX - startX;
        
        const state = this.sheetStates.get(sheet);
        const startSnap = state.dragStartSnap;
        
        // Calculate total translation from the starting snap position
        const totalDeltaY = this.limitOppositeDirection(sheet, startSnap + deltaY);
        const totalDeltaX = this.limitOppositeDirection(sheet, startSnap + deltaX);
        
        // Update current delta in state
        state.currentDelta = sheet.classList.contains('top') || sheet.classList.contains('bottom')
            ? totalDeltaY
            : totalDeltaX;
        this.sheetStates.set(sheet, state);
            
        const transform = this.getTransformByPosition(sheet, totalDeltaX, totalDeltaY);
        sheet.style.transform = transform;
    }

    limitOppositeDirection(sheet, delta) {
        const limit = this.options.oppositeDirectionAllowed;
        
        if (sheet.classList.contains('bottom')) {
            return Math.max(-limit, delta);
        } else if (sheet.classList.contains('top')) {
            return Math.min(limit, delta);
        } else if (sheet.classList.contains('right')) {
            return Math.max(-limit, delta);
        } else if (sheet.classList.contains('left')) {
            return Math.min(limit, delta);
        }
        
        return delta;
    }

    getTransformByPosition(sheet, deltaX, deltaY) {
        if (sheet.classList.contains('top') || sheet.classList.contains('bottom')) {
            return `translateY(${deltaY}px)`;
        } else {
            return `translateX(${deltaX}px)`;
        }
        return '';
    }

    handleDragEnd(sheet, startY, startX, currentY, currentX) {
        const snapElements = sheet.querySelectorAll(this.options.snapElementSelector);
        
        if (!snapElements.length) {
            const sheetRect = sheet.getBoundingClientRect();
            const threshold = this.options.dragThreshold * (
                sheet.classList.contains('top') || sheet.classList.contains('bottom')
                    ? sheetRect.height
                    : sheetRect.width
            );
            
            const deltaY = currentY - startY;
            const deltaX = currentX - startX;
            const shouldClose = this.shouldCloseOnDrag(sheet, deltaX, deltaY, threshold);
            
            if (shouldClose) {
                this.close(sheet);
            } else {
                sheet.style.transform = '';
            }
            return;
        }

        const state = this.sheetStates.get(sheet);
        const currentDelta = state.currentDelta;
        const isVertical = sheet.classList.contains('top') || sheet.classList.contains('bottom');

        // Get cumulative snap positions
        const sortedPositions = this.getSnapPositions(sheet);

        // Find nearest snap position
        const nearestSnap = sortedPositions.reduce((prev, curr) => {
            return Math.abs(curr - currentDelta) < Math.abs(prev - currentDelta) ? curr : prev;
        });

        // Check if should close (dragged beyond last snap)
        const shouldClose = sheet.classList.contains('bottom') || sheet.classList.contains('right')
            ? currentDelta > Math.max(...sortedPositions)
            : currentDelta < Math.min(...sortedPositions);

        if (shouldClose) {
            this.close(sheet);
        } else {
            // Update the snap position in state
            state.currentSnap = nearestSnap;
            this.sheetStates.set(sheet, state);
            
            sheet.style.transform = isVertical
                ? `translateY(${nearestSnap}px)`
                : `translateX(${nearestSnap}px)`;

        }
    }

    getSnapPositions(sheet) {
        const snapElements = Array.from(sheet.querySelectorAll(this.options.snapElementSelector));
        let totalSize = 0;
        
        snapElements.forEach(snap => {
            const snapRect = snap.getBoundingClientRect();
            totalSize += sheet.classList.contains('top') || sheet.classList.contains('bottom')
                ? snapRect.height
                : snapRect.width;
        });

        let remainingSize = totalSize;
        const positions = snapElements.map(snap => {
            const snapRect = snap.getBoundingClientRect();
            const size = sheet.classList.contains('top') || sheet.classList.contains('bottom')
                ? snapRect.height
                : snapRect.width;
                
            remainingSize -= size;
            
          
            if (sheet.classList.contains('bottom') || sheet.classList.contains('right')) {
                return remainingSize;
            } else if (sheet.classList.contains('top') || sheet.classList.contains('left')) {
                return -totalSize + remainingSize;
            }
            return 0;
        });

        positions.unshift(0);
        
        return positions;
    }

    findNearestSnap(currentPosition, snapPositions) {
        return snapPositions.reduce((prev, curr) => {
            return Math.abs(curr - currentPosition) < Math.abs(prev - currentPosition) ? curr : prev;
        });
    }

    shouldCloseOnDrag(sheet, deltaX, deltaY, threshold) {
        if (sheet.classList.contains('top')) return deltaY < -threshold;
        if (sheet.classList.contains('bottom')) return deltaY > threshold;
        if (sheet.classList.contains('left')) return deltaX < -threshold;
        if (sheet.classList.contains('right')) return deltaX > threshold;
        return false;
    }

    addEventListeners(element, onStart, onMove, onEnd) {
        if ('ontouchstart' in window) {
            element.addEventListener('touchstart', onStart);
            element.addEventListener('touchmove', onMove);
            element.addEventListener('touchend', onEnd);
        } else {
            element.addEventListener('mousedown', onStart);
            window.addEventListener('mousemove', onMove);
            window.addEventListener('mouseup', onEnd);
        }
    }

    open(sheet) {
        sheet.setAttribute('open', '');
        sheet.style.transform = '';
        const backdrop = sheet.parentElement.querySelector(`.${this.options.backdropClass}`);
        if (backdrop && !sheet.classList.contains('none-modal')) {
            backdrop.setAttribute('open', '');
        }
        if (this.options.keyboardClose) {
        document.addEventListener('keydown', this.handleKeyPress);
        }
    }

    close(sheet) {
        sheet.removeAttribute('open');
        sheet.style.transform = '';
        const backdrop = sheet.parentElement.querySelector(`.${this.options.backdropClass}`);
        if (backdrop) {
            backdrop.removeAttribute('open');
        }
        if (this.options.keyboardClose) {
            document.removeEventListener('keydown', this.handleKeyPress);
        }
        
        // Reset sheet state
        this.sheetStates.set(sheet, {
            currentSnap: 0,
            dragStartSnap: 0,
            currentDelta: 0
        });
    }

    handleKeyPress(event) {
        if (event.key === 'Escape') {
            this.sheets.forEach(sheet => {
                if (sheet.hasAttribute('open')) {
                    this.close(sheet);
                }
            });
        }
    }

    toggle(sheet) {
        if (sheet.hasAttribute('open')) {
            this.close(sheet);
        } else {
            this.open(sheet);
        }
    }
}


export default new Sheet();
export { Sheet };
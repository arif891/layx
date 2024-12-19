class Draggable {
    constructor(selector = 'draggable', options = {}) {
        this.options = {
            draggableAreaSelector: '.draggable-area',
            edgeOffset: 5,
            constrainToWindow: true,
            onDragStart: null,
            onDrag: null,
            onDragEnd: null,
            ...options
        };
        this.draggables = document.querySelectorAll(selector);
        this.eventHandlers = new WeakMap();
        this.init();
    }

    init() {
        this.draggables.forEach(draggable => {
            this.addDragListeners(draggable);
        });
    }

    addDragListeners(draggable) {
        let startX, startY;
        let initialX, initialY;
        let isDragging = false;
        const draggableArea = draggable.querySelector(this.options.draggableAreaSelector) || draggable;

        const onStart = (e) => {
            if (e.target !== draggableArea && !draggableArea.contains(e.target)) return;
            e.preventDefault();
            e.stopPropagation();
            
            draggable.style.transition = 'none';
            isDragging = true;

            const rect = draggable.getBoundingClientRect();
            initialX = rect.left;
            initialY = rect.top;

            startX = (e.touches ? e.touches[0].clientX : e.clientX) - initialX;
            startY = (e.touches ? e.touches[0].clientY : e.clientY) - initialY;

            // Call onDragStart callback
            if (typeof this.options.onDragStart === 'function') {
                this.options.onDragStart({
                    element: draggable,
                    x: initialX,
                    y: initialY,
                    event: e
                });
            }
        };

        const onMove = (e) => {
            if (!isDragging) return;
            e.preventDefault();

            const currentX = e.touches ? e.touches[0].clientX : e.clientX;
            const currentY = e.touches ? e.touches[0].clientY : e.clientY;

            // Allow dragging outside window during movement
            const newX = currentX - startX;
            const newY = currentY - startY;

            draggable.style.translate = `${newX}px ${newY}px`;

            // Call onDrag callback
            if (typeof this.options.onDrag === 'function') {
                this.options.onDrag({
                    element: draggable,
                    x: newX,
                    y: newY,
                    event: e
                });
            }
        };

        const onEnd = (e) => {
            if (!isDragging) return;
            isDragging = false;

            draggable.style.transition = '';

            const rect = draggable.getBoundingClientRect();
            const finalX = rect.left;
            const finalY = rect.top;

            if (this.options.constrainToWindow) {
                this.correctPosition(draggable);
            }

            // Call onDragEnd callback
            if (typeof this.options.onDragEnd === 'function') {
                this.options.onDragEnd({
                    element: draggable,
                    x: finalX,
                    y: finalY,
                    event: e
                });
            }
        };

        // Handle cases where mouseup occurs outside the window
        const onLeave = (e) => {
            if (isDragging) {
                onEnd(e);
            }
        };

        const addListeners = (startEvent, moveEvent, endEvent) => {
            draggableArea.addEventListener(startEvent, onStart, { passive: false });
            window.addEventListener(moveEvent, onMove, { passive: false });
            window.addEventListener(endEvent, onEnd);
        };

        // Store handlers for cleanup
        this.eventHandlers.set(draggable, {
            onStart,
            onMove,
            onEnd,
            onLeave
        });

        // Add listeners for both mouse and touch events
        addListeners('mousedown', 'mousemove', 'mouseup');
        addListeners('touchstart', 'touchmove', 'touchend');
    }

    correctPosition(element) {
        const rect = element.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        let newX = rect.left;
        let newY = rect.top;

        if (rect.left < this.options.edgeOffset) {
            newX = this.options.edgeOffset;
        } else if (rect.right > viewportWidth - this.options.edgeOffset) {
            newX = viewportWidth - rect.width - this.options.edgeOffset;
        }

        if (rect.top < this.options.edgeOffset) {
            newY = this.options.edgeOffset;
        } else if (rect.bottom > viewportHeight - this.options.edgeOffset) {
            newY = viewportHeight - rect.height - this.options.edgeOffset;
        }

        element.style.translate = `${newX}px ${newY}px`;
    }

    destroy() {
        this.draggables.forEach(draggable => {
            const handlers = this.eventHandlers.get(draggable);
            if (!handlers) return;

            const draggableArea = draggable.querySelector(this.options.draggableAreaSelector) || draggable;

            // Remove mouse events
            draggableArea.removeEventListener('mousedown', handlers.onStart);
            window.removeEventListener('mousemove', handlers.onMove);
            window.removeEventListener('mouseup', handlers.onEnd);

            // Remove touch events
            draggableArea.removeEventListener('touchstart', handlers.onStart);
            window.removeEventListener('touchmove', handlers.onMove);
            window.removeEventListener('touchend', handlers.onEnd);

            // Reset styles
            draggable.style.transition = '';
            draggable.style.translate = '';
        });

        this.eventHandlers = new WeakMap();
    }
}

export default new Draggable();
export { Draggable };
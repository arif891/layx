class Draggable {
    constructor(selector = 'draggable', edgeOffset = 5) {
        this.draggables = document.querySelectorAll(selector);
        this.edgeOffset = edgeOffset;
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
        const draggableArea = draggable.querySelector('.draggable-area') || draggable;

        const onStart = (e) => {
            e.preventDefault();
            draggable.style.transition = 'none';
            isDragging = true;

            const rect = draggable.getBoundingClientRect();
            initialX = rect.left;
            initialY = rect.top;

            startX = (e.touches ? e.touches[0].clientX : e.clientX) - initialX;
            startY = (e.touches ? e.touches[0].clientY : e.clientY) - initialY;
        };

        const onMove = (e) => {
            if (!isDragging) return;
            e.preventDefault();

            const currentX = e.touches ? e.touches[0].clientX : e.clientX;
            const currentY = e.touches ? e.touches[0].clientY : e.clientY;

            const newX = currentX - startX;
            const newY = currentY - startY;

            draggable.style.translate = `${newX}px ${newY}px`;
        };

        const onEnd = () => {
            if (!isDragging) return;
            isDragging = false;
            draggable.style.transition = '';

            this.correctPosition(draggable);
        };

        const addListeners = (startEvent, moveEvent, endEvent) => {
            draggableArea.addEventListener(startEvent, onStart);
            window.addEventListener(moveEvent, onMove);
            window.addEventListener(endEvent, onEnd);
        };

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

        if (rect.left < this.edgeOffset) {
            newX = this.edgeOffset;
        } else if (rect.right > viewportWidth) {
            newX = viewportWidth - rect.width - this.edgeOffset;
        }

        if (rect.top < this.edgeOffset) {
            newY = this.edgeOffset;
        } else if (rect.bottom > viewportHeight) {
            newY = viewportHeight - rect.height - this.edgeOffset;
        }

        element.style.translate = `${newX}px ${newY}px`;
    }
}

export default new Draggable();
export {Draggable};
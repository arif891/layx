/**
 * Accordion component that handles expandable/collapsible content sections
 */
class Accordion {
  /**
   * @param {string} selector - CSS selector for accordion container
   * @param {Object} options - Configuration options
   */
  constructor(selector = 'accordion', options = {}) {
    this.options = {
      itemSelector: '.item',
      titleSelector: '.title',
      contentSelector: '.content',
      multipleOpen: false,
      ...options
    };
  
    this.accordions = document.querySelectorAll(selector);
    
    if (!this.accordions.length) {
      console.warn(`No accordion elements found with selector: ${selector}`);
      return;
    }

    this.init();
  }

  /**
   * Initialize accordion functionality
   * @private
   */
  init() {
    this.accordions.forEach(accordion => {
      // Set initial ARIA attributes
      accordion.setAttribute('role', 'tablist');

      // Initialize items
      const items = accordion.querySelectorAll(this.options.itemSelector);
      Array.from(items).forEach((item, index) => {
        this.setupAccordionItem(item, index);
      });

      // Attach event listeners
      accordion.addEventListener('click', this.handleClick.bind(this));
      accordion.addEventListener('keydown', this.handleKeydown.bind(this));
    });
  }

  /**
   * Set up individual accordion item with proper attributes
   * @private
   * @param {HTMLElement} item - Accordion item element
   * @param {number} index - Item index
   */
  setupAccordionItem(item, index) {
    const title = item.querySelector(this.options.titleSelector);
    const content = item.querySelector(this.options.contentSelector);
    
    if (!title || !content) return;

    const id = `accordion-${index}`;
    
    // Set up title
    title.setAttribute('role', 'tab');
    title.setAttribute('id', `${id}-title`);
    title.setAttribute('aria-controls', `${id}-content`);
    title.setAttribute('aria-expanded', 'false');
    
    // Set up content
    content.setAttribute('role', 'tabpanel');
    content.setAttribute('id', `${id}-content`);
    content.setAttribute('aria-labelledby', `${id}-title`);
  }

  /**
   * Handle click events
   * @private
   * @param {Event} event - Click event
   */
  handleClick(event) {
    const title = event.target.closest(this.options.titleSelector);
    if (!title) return;

    const item = title.closest(this.options.itemSelector);
    if (!item) return;

    this.toggleItem(item);
  }

  /**
   * Handle keyboard navigation
   * @private
   * @param {KeyboardEvent} event - Keyboard event
   */
  handleKeydown(event) {
    const title = event.target.closest(this.options.titleSelector);
    if (!title) return;

    const item = title.closest(this.options.itemSelector);
    if (!item) return;

    const items = Array.from(item.parentElement.querySelectorAll(this.options.itemSelector));
    const index = items.indexOf(item);

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.focusItem(items, index + 1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.focusItem(items, index - 1);
        break;
      case 'Home':
        event.preventDefault();
        this.focusItem(items, 0);
        break;
      case 'End':
        event.preventDefault();
        this.focusItem(items, items.length - 1);
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        this.toggleItem(item);
        break;
    }
  }

  /**
   * Focus an accordion item by index
   * @private
   * @param {HTMLElement[]} items - Array of accordion items
   * @param {number} index - Target index
   */
  focusItem(items, index) {
    const targetIndex = (index + items.length) % items.length;
    const targetTitle = items[targetIndex].querySelector(this.options.titleSelector);
    targetTitle?.focus();
  }

  /**
   * Toggle accordion item state
   * @public
   * @param {HTMLElement} item - Accordion item to toggle
   */
  toggleItem(item) {
    const isOpen = item.hasAttribute('open');
    const accordion = item.closest('accordion') || item.closest('.accordion');

    if (!this.options.multipleOpen && !isOpen) {
      // Close other items if multiple open is not allowed
      const openItems = accordion.querySelectorAll(`${this.options.itemSelector}[open]`);
      Array.from(openItems).forEach(openItem => {
        if (openItem !== item) {
          this.updateItemState(openItem, false);
        }
      });
    }

    this.updateItemState(item, !isOpen);
  }

  /**
   * Update accordion item state
   * @private
   * @param {HTMLElement} item - Accordion item
   * @param {boolean} isOpen - Target state
   */
  updateItemState(item, isOpen) {
    const title = item.querySelector(this.options.titleSelector);
    const content = item.querySelector(this.options.contentSelector);

    if (!content || !title) return;

    title.setAttribute('aria-expanded', isOpen);
    
    if (isOpen) {
      item.setAttribute('open', '');
    } else {
      item.removeAttribute('open');
    }
  }

  /**
   * Open specific accordion item
   * @public
   * @param {number} index - Index of item to open
   */
  open(index) {
    const items = this.accordions[0]?.querySelectorAll(this.options.itemSelector);
    const item = Array.from(items)?.[index];
    if (item && !item.hasAttribute('open')) {
      this.toggleItem(item);
    }
  }

  /**
   * Close specific accordion item
   * @public
   * @param {number} index - Index of item to close
   */
  close(index) {
    const items = this.accordions[0]?.querySelectorAll(this.options.itemSelector);
    const item = Array.from(items)?.[index];
    if (item && item.hasAttribute('open')) {
      this.toggleItem(item);
    }
  }
}

// Export class and create a default instance
export { Accordion };
export default new Accordion();
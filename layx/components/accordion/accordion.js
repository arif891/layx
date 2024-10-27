class Accordion {
    constructor(selector = 'accordion') {
      this.selector = selector;
      this.accordions = document.querySelectorAll(selector);
      this.init();
    }
  
    init() {
      this.accordions.forEach(accordion => {
        accordion.addEventListener('click', this.toggleAccordion.bind(this));
      });
    }
  
    toggleAccordion(event) {
      const title = event.target.closest('.title');
      if (!title) return;
  
      const currentItem = title.closest('.item');
      const allItems = currentItem.closest(this.selector).querySelectorAll('.item');
  
      currentItem.classList.toggle('active');
  
      allItems.forEach(item => {
        if (item !== currentItem) {
          item.classList.remove('active');
        }
      });
    }
  }

  // Export an instance of Accordion to initialize it when imported
  export default new Accordion();
  export {Accordion};
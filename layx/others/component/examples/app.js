import Component from '../component.js';

// Define the global data context available to all components
const dataContext = {
    appName: "Example App v1.0",
    globalAdmin: "SuperUser",
    currentTime: new Date().toLocaleTimeString(),
    userList: [
        { id: 1, name: "Alice Johnson", role: "Manager", status: "Active" },
        { id: 2, name: "Bob Smith", role: "Developer", status: "Offline" },
        { id: 3, name: "Charlie Brown", role: "Designer", status: "Active" },
        { id: 4, name: "Dana White", role: "Developer", status: "Active" }
    ]
};

// Initialize the Component Manager
// Options can handle debug mode
const options = {
    debug: true
};

console.log("Initializing Component System...");
new Component(dataContext, options);

// Listen for events
document.addEventListener('components-ready', () => {
    console.log("All components have been loaded and rendered.");
});

document.addEventListener('component-loaded', (e) => {
    console.log(`Component loaded: ${e.detail.name}`);
});

document.addEventListener('component-error', (e) => {
    console.error(`Error loading component ${e.detail.name}:`, e.detail.error);
});

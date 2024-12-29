class Theme {
    constructor() {
        this.themeToggleButton = document.querySelector('.theme-toggler');
        this.themeUpdateElements = document.querySelectorAll('.theme-update');
        this.themeButtons = document.querySelectorAll('[data-theme-value]');
        this.metaThemeColor = this.ensureMetaThemeColorTag();
        this.init();
    }

    // Ensure meta[name="theme-color"] tag exists, create it if missing
    ensureMetaThemeColorTag() {
        let metaThemeColor = document.querySelector('meta[name="theme-color"]');
        if (!metaThemeColor) {
            metaThemeColor = document.createElement('meta');
            metaThemeColor.setAttribute('name', 'theme-color');
            document.head.appendChild(metaThemeColor);
            return metaThemeColor;
        }
    }

    // Function to initialize theme and event listeners
    init() {
        this.setTheme(this.getStoredTheme());

        if (this.themeToggleButton) {
            this.themeToggleButton.addEventListener('click', this.toggleTheme.bind(this));
        }

        this.themeButtons.forEach(button => {
            button.addEventListener('click', () => {
                this.setTheme(button.getAttribute('data-theme-value'));
            });
        });

        this.listenToSystemThemeChange();
    }

    // Function to get stored theme or default to 'auto'
    getStoredTheme() {
        return localStorage.getItem('theme') || 'auto';
    }

    // Function to set the theme
    setTheme(theme) {
        const appliedTheme = (theme === 'auto') ? this.getSystemTheme() : theme;
        document.documentElement.setAttribute('theme', appliedTheme);
        localStorage.setItem('theme', theme);
        this.updateThemeAttributes(theme);
        this.updateMetaThemeColor();
        this.updateActiveThemeButton(theme);
    }

    //method to update active state of theme buttons
    updateActiveThemeButton(theme) {
        this.themeButtons.forEach(button => {
            if (button.getAttribute('data-theme-value') === theme) {
                button.classList.add('active');
            } else {
                button.classList.remove('active');
            }
        });
    }

    // Function to get the system theme based on media query
    getSystemTheme() {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    // Function to toggle between light and dark themes
    toggleTheme() {
        const storedTheme = this.getStoredTheme();
        const currentTheme = storedTheme === 'auto' 
            ? this.getSystemTheme() 
            : storedTheme;
            
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        this.setTheme(newTheme);
    }

    // Function to update attributes on the buttons/elements
    updateThemeAttributes(theme) {
        this.themeUpdateElements.forEach(element => {
            element.setAttribute('data-theme-update', theme);
        });

        if (this.themeToggleButton) {
            this.themeToggleButton.setAttribute('data-theme-update', theme);
        }
    }

    // Function to update the meta theme color based on the current --bg value
    updateMetaThemeColor() {
        const bgColor = getComputedStyle(document.documentElement).getPropertyValue('--bg-color').trim();
        const fallbackColor = bgColor || (document.documentElement.getAttribute('theme') === 'dark' ? '#000' : '#fff');
        this.metaThemeColor?.setAttribute('content', fallbackColor);
    }

    // Function to listen for system theme changes
    listenToSystemThemeChange() {
        if (window.matchMedia) {
            window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
                if (this.getStoredTheme() === 'auto') {
                    this.setTheme('auto');
                }
            });
        }
    }
}

// Initialize Theme
export default new Theme();
export {Theme};
/**
 * Theme Management
 * Handles light/dark theme switching with system preference detection
 */

class ThemeManager {
    constructor() {
        this.storageKey = 'theme';
        this.legacyStorageKey = 'book-theme';
        this.mediaQuery = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
        this.init();
    }

    static normalizeTheme(theme) {
        return theme === 'dark' ? 'dark' : 'light';
    }

    init() {
        this.setupThemeToggle();
        this.setupSystemThemeListener();
        this.applyInitialTheme();
    }

    setupThemeToggle() {
        const themeToggle = document.querySelector('.theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                this.toggleTheme();
            });
        }
    }

    getStoredTheme() {
        try {
            const storedTheme = localStorage.getItem(this.storageKey) || localStorage.getItem(this.legacyStorageKey);
            if (storedTheme === 'dark' || storedTheme === 'light') {
                if (storedTheme !== localStorage.getItem(this.storageKey)) {
                    localStorage.setItem(this.storageKey, storedTheme);
                }
                return storedTheme;
            }
        } catch (error) {
            console.warn('Theme preference is unavailable:', error);
        }
        return null;
    }

    persistTheme(theme) {
        try {
            localStorage.setItem(this.storageKey, ThemeManager.normalizeTheme(theme));
        } catch (error) {
            console.warn('Theme preference could not be persisted:', error);
        }
    }

    systemPrefersDark() {
        return Boolean(this.mediaQuery && this.mediaQuery.matches);
    }

    setupSystemThemeListener() {
        if (!this.mediaQuery) {
            return;
        }

        const handleChange = (event) => {
            if (!this.getStoredTheme()) {
                this.setTheme(event.matches ? 'dark' : 'light');
            }
        };

        if (typeof this.mediaQuery.addEventListener === 'function') {
            this.mediaQuery.addEventListener('change', handleChange);
        } else if (typeof this.mediaQuery.addListener === 'function') {
            this.mediaQuery.addListener(handleChange);
        }
    }

    applyInitialTheme() {
        const theme = this.getStoredTheme() || (this.systemPrefersDark() ? 'dark' : 'light');
        this.setTheme(theme);
    }

    toggleTheme() {
        const currentTheme = ThemeManager.normalizeTheme(document.documentElement.getAttribute('data-theme'));
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        this.setTheme(newTheme);
        this.persistTheme(newTheme);
    }

    setTheme(theme) {
        const normalizedTheme = ThemeManager.normalizeTheme(theme);
        document.documentElement.setAttribute('data-theme', normalizedTheme);
        this.updateThemeToggleIcon(normalizedTheme);

        window.dispatchEvent(new CustomEvent('themechange', {
            detail: { theme: normalizedTheme }
        }));
    }

    updateThemeToggleIcon(theme) {
        const lightIcon = document.querySelector('.theme-icon-light');
        const darkIcon = document.querySelector('.theme-icon-dark');

        if (lightIcon && darkIcon) {
            if (theme === 'light') {
                lightIcon.style.display = 'block';
                darkIcon.style.display = 'none';
            } else {
                lightIcon.style.display = 'none';
                darkIcon.style.display = 'block';
            }
        }
    }

    getCurrentTheme() {
        return ThemeManager.normalizeTheme(document.documentElement.getAttribute('data-theme'));
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.themeManager = new ThemeManager();
    });
} else {
    window.themeManager = new ThemeManager();
}

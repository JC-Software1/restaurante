/* ============================================================
   JC-RT Theme Manager - Cambio de tema claro/oscuro
   Persistencia en localStorage + prefers-color-scheme
   ============================================================ */
(function () {
    'use strict';

    const STORAGE_KEY = 'jcrt-theme';

    function getPreferredTheme() {
        try {
            if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                return 'dark';
            }
        } catch (e) { /* ignore */ }
        return 'light';
    }

    function getStoredTheme() {
        try {
            return localStorage.getItem(STORAGE_KEY);
        } catch (e) { return null; }
    }

    function applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        try {
            localStorage.setItem(STORAGE_KEY, theme);
        } catch (e) { /* ignore */ }
        updateMetaThemeColor(theme);
        document.dispatchEvent(new CustomEvent('theme-changed', { detail: theme }));
    }

    function updateMetaThemeColor(theme) {
        const meta = document.querySelector('meta[name="theme-color"]');
        if (meta) {
            meta.setAttribute('content', theme === 'dark' ? '#111111' : '#183A37');
        }
    }

    function init() {
        const theme = getStoredTheme() || getPreferredTheme();
        document.documentElement.setAttribute('data-theme', theme);
        updateMetaThemeColor(theme);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    window.jcTheme = {
        get: function () { return document.documentElement.getAttribute('data-theme') || 'light'; },
        set: applyTheme
    };
})();
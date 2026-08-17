/* ============================================================
   JC-RT Theme Manager - Solo modo claro (fijo)
   ============================================================ */
(function () {
    'use strict';

    function init() {
        document.documentElement.setAttribute('data-theme', 'light');
        const meta = document.querySelector('meta[name="theme-color"]');
        if (meta) {
            meta.setAttribute('content', '#183A37');
        }
        document.dispatchEvent(new CustomEvent('theme-changed', { detail: 'light' }));
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    window.jcTheme = {
        get: function () { return 'light'; },
        set: function () { /* solo modo claro */ }
    };
})();
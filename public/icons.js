/* ============================================================
   JC-RT Icon System - Iconos SVG dibujados (reemplaza emojis)
   Inyecta iconos en el menú, títulos de página y botones clave.
   ============================================================ */
(function () {
    'use strict';

    var ICONS = {
        platos: '<svg class="jc-icon" viewBox="0 0 24 24"><circle cx="12" cy="13" r="8"></circle><path d="M12 5V2"></path><path d="M9 2h6"></path><path d="M5 13c0-3 3-5 7-5s7 2 7 5"></path></svg>',
        pedidos: '<svg class="jc-icon" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="17" rx="3"></rect><path d="M8 9h8M8 13h5M8 17h8"></path><path d="M3 8V7a2 2 0 0 1 2-2h1"></path></svg>',
        gastos: '<svg class="jc-icon" viewBox="0 0 24 24"><path d="M6 3h12v18l-2-1-2 1-2-1-2 1-2-1-2 1z"></path><path d="M9 8h6M9 12h6M9 16h4"></path></svg>',
        qr: '<svg class="jc-icon" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"></rect><rect x="14" y="3" width="7" height="7" rx="1"></rect><rect x="3" y="14" width="7" height="7" rx="1"></rect><path d="M14 14h3v3h-3zM20 14h1M14 20h1M20 20h1M20 17h-3M17 21h4"></path></svg>',
        reportes: '<svg class="jc-icon" viewBox="0 0 24 24"><path d="M4 20h16"></path><rect x="6" y="11" width="3" height="6" rx="1"></rect><rect x="11" y="6" width="3" height="11" rx="1"></rect><rect x="16" y="14" width="3" height="3" rx="1"></rect></svg>',
        cocina: '<svg class="jc-icon" viewBox="0 0 24 24"><path d="M3 13h18"></path><path d="M5 13v4a3 3 0 0 0 3 3h8a3 3 0 0 0 3-3v-4"></path><path d="M5 13V8a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"></path><path d="M13 8h2a2 2 0 0 1 2 2v3"></path></svg>',
        catalogo: '<svg class="jc-icon" viewBox="0 0 24 24"><path d="M4 5h6a3 3 0 0 1 3 3v11a2 2 0 0 0-2-2H4z"></path><path d="M20 5h-6a3 3 0 0 0-3 3v11a2 2 0 0 1 2-2h7z"></path></svg>',
        alimentos: '<svg class="jc-icon" viewBox="0 0 24 24"><path d="M5 3v18"></path><path d="M5 9h9a3 3 0 0 0 0-6H5"></path><path d="M17 21c1.5 0 2.5-1 2.5-2.5S18.5 15 17 15s-2.5 2-2.5 3.5S15.5 21 17 21z"></path></svg>',
        usuarios: '<svg class="jc-icon" viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.5"></circle><path d="M2.5 20a6.5 6.5 0 0 1 13 0"></path><circle cx="17.5" cy="9" r="2.5"></circle><path d="M16 14.5a5.5 5.5 0 0 1 5.5 5.5"></path></svg>',
        liquidacion: '<svg class="jc-icon" viewBox="0 0 24 24"><rect x="2" y="6" width="20" height="12" rx="2"></rect><circle cx="12" cy="12" r="2.5"></circle><path d="M6 10h.01M18 14h.01"></path></svg>',
        historial: '<svg class="jc-icon" viewBox="0 0 24 24"><path d="M3 3v5h5"></path><path d="M3.05 13a9 9 0 1 0 2.64-7.31L3 8"></path><path d="M12 7v5l3 2"></path></svg>',
        solicitudes: '<svg class="jc-icon" viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.5"></circle><path d="M2.5 20a6.5 6.5 0 0 1 13 0"></path><path d="M16 11l2 2 4-4"></path></svg>',
        ajustes: '<svg class="jc-icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.01a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h.01a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.01a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>',
        logout: '<svg class="jc-icon" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><path d="M16 17l5-5-5-5"></path><path d="M21 12H9"></path></svg>',
        menu: '<svg class="jc-icon" viewBox="0 0 24 24"><line x1="4" y1="7" x2="20" y2="7"></line><line x1="4" y1="12" x2="20" y2="12"></line><line x1="4" y1="17" x2="20" y2="17"></line></svg>',
        restaurante: '<svg class="jc-icon" viewBox="0 0 24 24"><path d="M6 2v6a2 2 0 0 0 4 0V2"></path><path d="M8 2v20"></path><path d="M16 2a4 4 0 0 0-4 4v2h4a2 2 0 0 0 2-2z"></path><path d="M16 8v14"></path></svg>',
        usuarios2: '<svg class="jc-icon" viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.5"></circle><path d="M2.5 20a6.5 6.5 0 0 1 13 0"></path></svg>',
        cerrar: '<svg class="jc-icon" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>',
        buscar: '<svg class="jc-icon" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"></circle><line x1="21" y1="21" x2="16.5" y2="16.5"></line></svg>',
        organizar: '<svg class="jc-icon" viewBox="0 0 24 24"><path d="M17 8l4-4M17 8h3M17 8v3"></path><path d="M7 8L3 4M7 8H4M7 8v3"></path><path d="M17 16l4 4M17 16h3M17 16v-3"></path><path d="M7 16l-4 4M7 16H4M7 16v-3"></path></svg>',
        notas: '<svg class="jc-icon" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="3"></rect><path d="M9 9h6M9 13h6M9 17h3"></path></svg>',
        mesas: '<svg class="jc-icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"></circle><path d="M12 2v4M12 18v4M2 12h4M18 12h4"></path></svg>',
        caja: '<svg class="jc-icon" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"></rect><path d="M3 9h18"></path><path d="M7 13h4M7 16h4"></path></svg>',
        base: '<svg class="jc-icon" viewBox="0 0 24 24"><path d="M3 3v18h18"></path><path d="M7 14l4-4 3 3 5-6"></path></svg>',
        nuevo: '<svg class="jc-icon" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>',
        imprimir: '<svg class="jc-icon" viewBox="0 0 24 24"><path d="M6 9V2h12v7"></path><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>',
        atras: '<svg class="jc-icon" viewBox="0 0 24 24"><path d="M19 12H5"></path><path d="M12 19l-7-7 7-7"></path></svg>',
        carrito: '<svg class="jc-icon" viewBox="0 0 24 24"><circle cx="9" cy="21" r="1.5"></circle><circle cx="19" cy="21" r="1.5"></circle><path d="M2 3h2l2.4 12.4a2 2 0 0 0 2 1.6h8.7a2 2 0 0 0 2-1.6L21 7H6"></path></svg>',
        visto: '<svg class="jc-icon" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"></path></svg>',
        error: '<svg class="jc-icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>',
        reloj: '<svg class="jc-icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><path d="M12 6v6l4 2"></path></svg>',
        cheque: '<svg class="jc-icon" viewBox="0 0 24 24"><path d="M4 6h16v12H4z"></path><path d="M8 10h8M8 14h5"></path></svg>',
        config: '<svg class="jc-icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.01a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h.01a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.01a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>'
    };

    // Mapa: href → nombre de icono para el menú de navegación
    var NAV_ICONS = {
        'productos.html': 'platos',
        'pedidos.html': 'pedidos',
        'gastos.html': 'gastos',
        'qr-generator.html': 'qr',
        'reportes.html': 'reportes',
        'cocina.html': 'cocina',
        'catalogo-productos.html': 'catalogo',
        'alimentos.html': 'alimentos',
        'administrador.html': 'usuarios',
        'liquidacion.html': 'liquidacion',
        'historial-liquidaciones.html': 'historial',
        'solicitudes.html': 'solicitudes',
        'ajustes.html': 'ajustes',
        'index.html': 'restaurante',
        'superadmin.html': 'usuarios2'
    };

    function getIcon(name) {
        return ICONS[name] || '';
    }

    function iconEl(name) {
        var span = document.createElement('span');
        span.className = 'nav-icon';
        span.innerHTML = getIcon(name);
        return span;
    }

    function replaceNavIcons() {
        var items = document.querySelectorAll('.nav-item');
        items.forEach(function (item) {
            var href = (item.getAttribute('href') || '').split('?')[0];
            var name = NAV_ICONS[href];
            if (!name) return;
            var existing = item.querySelector('svg.jc-icon');
            if (existing) return;
            var emoji = item.querySelector('span');
            if (emoji) {
                var icon = iconEl(name);
                emoji.parentNode.replaceChild(icon, emoji);
            } else {
                item.insertBefore(iconEl(name), item.firstChild);
            }
        });
    }

    function replaceBrandIcons() {
        var brands = document.querySelectorAll('.brand-icon');
        brands.forEach(function (el) {
            if (el.querySelector('svg')) return;
            var original = el.innerHTML;
            el.innerHTML = getIcon('restaurante');
            el.style.display = 'flex';
            el.style.alignItems = 'center';
            el.style.justifyContent = 'center';
        });
    }

    function replacePageTitles() {
        var titles = document.querySelectorAll('.page-title');
        titles.forEach(function (el) {
            if (el.querySelector('svg')) return;
            var href = window.location.pathname.split('/').pop();
            var name = NAV_ICONS[href];
            if (!name) return;
            var text = el.textContent.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]/gu, '').trim();
            if (text === el.textContent) return;
            el.innerHTML = '';
            el.appendChild(iconEl(name));
            el.appendChild(document.createTextNode(' ' + text));
        });
    }

    function replaceMenuToggle() {
        var toggles = document.querySelectorAll('.menu-toggle');
        toggles.forEach(function (el) {
            if (el.querySelector('.hamburger') || el.querySelector('svg')) return;
            el.innerHTML = getIcon('menu');
            el.style.display = 'flex';
            el.style.alignItems = 'center';
            el.style.justifyContent = 'center';
        });
    }

    function replaceLogoutButtons() {
        var buttons = document.querySelectorAll('.btn-logout-header, .btn-logout-sidebar');
        buttons.forEach(function (btn) {
            if (btn.querySelector('svg')) return;
            btn.innerHTML = getIcon('logout');
            btn.style.display = 'flex';
            btn.style.alignItems = 'center';
            btn.style.justifyContent = 'center';
        });
    }

    // Reemplaza emojis en botones de acción comunes usando coincidencia de texto
    var ACTION_EMOJI_MAP = {
        '✨': 'nuevo',
        '➕': 'nuevo',
        '＋': 'nuevo',
        '📋': 'notas',
        '🔄': 'organizar',
        '🔍': 'buscar',
        '📝': 'notas',
        '🪑': 'mesas',
        '💰': 'caja',
        '📊': 'base',
        '🖨️': 'imprimir',
        '🖨': 'imprimir',
        '🗑️': 'cerrar',
        '🗑': 'cerrar',
        '✕': 'cerrar',
        '×': 'cerrar',
        '✅': 'visto',
        '✔️': 'visto',
        '✓': 'visto',
        '⏳': 'reloj',
        '📱': 'qr',
        '🥘': 'alimentos',
        '👨‍🍳': 'cocina',
        '🍽️': 'restaurante',
        '🏪': 'restaurante',
        '🛒': 'carrito',
        '🎨': 'nuevo'
    };

    function replaceActionEmojis() {
        var targets = document.querySelectorAll('.btn-add-main, .btn-action, .btn-change-view, .btn-filter, .btn-export, .btn-toggle-action, .btn-cambiar-estado-global, .btn-ver-alimentos, .btn-clear-filters, .btn-send-order, .btn-primary, .btn-submit, .btn-edit, .btn-delete');
        targets.forEach(function (el) {
            if (el.querySelector('svg.jc-icon')) return;
            var original = el.textContent || '';
            var text = original.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]/gu, '').trim();
            if (text === original.trim()) return; // no emoji present
            el.innerHTML = '';
            // Buscar el emoji que estaba al inicio
            var m = original.match(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]{1,4}/u);
            var iconName = m ? ACTION_EMOJI_MAP[m[0]] : null;
            if (iconName) {
                var iconSpan = document.createElement('span');
                iconSpan.innerHTML = getIcon(iconName);
                el.appendChild(iconSpan);
            }
            el.appendChild(document.createTextNode(text));
        });
    }

    function init() {
        replaceNavIcons();
        replaceBrandIcons();
        replacePageTitles();
        replaceMenuToggle();
        replaceLogoutButtons();
        replaceActionEmojis();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Exponer utilidad para reemplazar iconos de forma dinámica (títulos, botones)
    window.jcIcon = {
        get: getIcon,
        nav: NAV_ICONS
    };
})();
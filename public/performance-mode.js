// ✅ Performance Mode - Detección de capacidad del dispositivo
// Optimiza automáticamente la experiencia según el hardware disponible

(function() {
  'use strict';

  const PERF_KEY = 'jc_perf_mode';
  
  // Detección de capacidades del dispositivo
  function detectDeviceCapability() {
    const caps = {
      lowEnd: false,
      cores: navigator.hardwareConcurrency || 2,
      memory: navigator.deviceMemory || 2,
      connection: getConnectionInfo(),
      gpu: detectGPU(),
      timestamp: Date.now()
    };

    // Criterios para dispositivo de baja capacidad
    const lowCores = caps.cores <= 2;
    const lowMemory = caps.memory <= 2;
    const slowNetwork = caps.connection.effectiveType === '2g' || 
                        caps.connection.effectiveType === 'slow-2g' ||
                        caps.connection.saveData;
    const oldDevice = /Android (5|6|7|8\.[012])|iPhone.*(?:A[0-9]+X|A1[0-7])/i.test(navigator.userAgent);
    const lowGPU = caps.gpu.tier === 'low';

    caps.lowEnd = (lowCores && lowMemory) || slowNetwork || oldDevice || lowGPU;
    caps.tier = caps.lowEnd ? 'low' : (caps.cores >= 4 && caps.memory >= 4 ? 'high' : 'medium');
    
    return caps;
  }

  function getConnectionInfo() {
    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (!conn) return { effectiveType: 'unknown', saveData: false, downlink: 10 };
    return {
      effectiveType: conn.effectiveType || 'unknown',
      saveData: conn.saveData || false,
      downlink: conn.downlink || 10,
      rtt: conn.rtt || 50
    };
  }

  function detectGPU() {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) return { tier: 'low', renderer: 'none' };
      
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      const renderer = debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : 'unknown';
      
      const lowGPUs = ['swiftshader', 'llvmpipe', 'softpipe', 'mesa', 'android', 'adreno 3', 'adreno 4', 'mali-4', 'mali-t'];
      const tier = lowGPUs.some(g => renderer.toLowerCase().includes(g)) ? 'low' : 'high';
      
      return { tier, renderer };
    } catch (e) {
      return { tier: 'medium', renderer: 'unknown' };
    }
  }

  // Aplicar optimizaciones según el tier
  function applyOptimizations(caps) {
    const root = document.documentElement;
    
    // Marcar el tier en el HTML para CSS
    root.setAttribute('data-perf-tier', caps.tier);
    
    if (caps.tier === 'low') {
      root.classList.add('perf-low');
      
      // Desactivar animaciones CSS complejas
      const style = document.createElement('style');
      style.id = 'perf-low-styles';
      style.textContent = `
        /* ✅ Optimizaciones para dispositivos de baja capacidad */
        .perf-low * {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
        }
        .perf-low body::before,
        .perf-low body::after {
          display: none !important;
        }
        .perf-low .login-container,
        .perf-low .sidebar,
        .perf-low .card,
        .perf-low .modal {
          box-shadow: none !important;
        }
        .perf-low .brand-icon {
          box-shadow: none !important;
        }
        .perf-low [style*="background: linear-gradient"],
        .perf-low [style*="background-image: linear-gradient"] {
          background: none !important;
          background-color: var(--primary) !important;
        }
        .perf-low .sidebar {
          background: #1a202c !important;
        }
        .perf-low .sidebar-nav::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.3) !important;
          border-radius: 0 !important;
        }
      `;
      document.head.appendChild(style);
      
      // Reducir calidad de imágenes
      document.querySelectorAll('img').forEach(img => {
        if (img.loading !== 'lazy') img.loading = 'lazy';
        img.decoding = 'async';
      });
      
      // Desactivar prefetch de páginas
      document.querySelectorAll('link[rel="prefetch"]').forEach(l => l.remove());
      
    } else if (caps.tier === 'medium') {
      root.classList.add('perf-medium');
      
      // Mantener animaciones simples pero reducir sombras
      const style = document.createElement('style');
      style.id = 'perf-medium-styles';
      style.textContent = `
        .perf-medium .login-container {
          box-shadow: 0 10px 30px rgba(0,0,0,0.2) !important;
        }
        .perf-medium .sidebar {
          box-shadow: 2px 0 10px rgba(0,0,0,0.1) !important;
        }
      `;
      document.head.appendChild(style);
    } else {
      root.classList.add('perf-high');
    }
  }

  // Función para limitar fetches en bajo rendimiento
  window.getPerformanceLimit = function() {
    const caps = window.__deviceCaps;
    if (!caps) return { maxItems: 50000, staggerDelay: 100 };
    
    switch(caps.tier) {
      case 'low': return { maxItems: 500, staggerDelay: 500 };
      case 'medium': return { maxItems: 2000, staggerDelay: 200 };
      default: return { maxItems: 50000, staggerDelay: 100 };
    }
  };

  // Función para limitar items renderizados en DOM
  window.getRenderLimit = function() {
    const caps = window.__deviceCaps;
    if (!caps) return 100;
    
    switch(caps.tier) {
      case 'low': return 30;
      case 'medium': return 60;
      default: return 100;
    }
  };

  // Lazy render - solo renderiza lo visible + buffer
  window.lazyRender = function(container, items, renderItem, batchSize) {
    const caps = window.__deviceCaps;
    const limit = batchSize || (caps && caps.tier === 'low' ? 10 : 20);
    let rendered = 0;
    
    function renderBatch() {
      const fragment = document.createDocumentFragment();
      const end = Math.min(rendered + limit, items.length);
      
      for (let i = rendered; i < end; i++) {
        fragment.appendChild(renderItem(items[i], i));
      }
      
      container.appendChild(fragment);
      rendered = end;
      
      if (rendered < items.length && container.offsetHeight < window.innerHeight * 2) {
        requestAnimationFrame(renderBatch);
      }
    }
    
    renderBatch();
  };

  // Intersection Observer para lazy loading
  window.setupLazyImages = function() {
    if (!('IntersectionObserver' in window)) {
      document.querySelectorAll('img[data-src]').forEach(img => {
        img.src = img.dataset.src;
      });
      return;
    }
    
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          if (img.dataset.src) {
            img.src = img.dataset.src;
            img.removeAttribute('data-src');
          }
          observer.unobserve(img);
        }
      });
    }, { rootMargin: '100px' });
    
    document.querySelectorAll('img[data-src]').forEach(img => observer.observe(img));
  };

  // Throttle para eventos frecuentes
  window.perfThrottle = function(fn, delay) {
    let last = 0;
    let timer = null;
    return function(...args) {
      const now = Date.now();
      if (now - last >= delay) {
        last = now;
        fn.apply(this, args);
      } else {
        clearTimeout(timer);
        timer = setTimeout(() => {
          last = Date.now();
          fn.apply(this, args);
        }, delay - (now - last));
      }
    };
  };

  // Debounce para inputs
  window.perfDebounce = function(fn, delay) {
    let timer = null;
    return function(...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  };

  // Ejecutar detección
  const caps = detectDeviceCapability();
  window.__deviceCaps = caps;
  
  // Cargar CSS de optimización
  const perfCSS = document.createElement('link');
  perfCSS.rel = 'stylesheet';
  perfCSS.href = '/performance.css';
  document.head.appendChild(perfCSS);
  
  // Aplicar cuando el DOM esté listo
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => applyOptimizations(caps));
  } else {
    applyOptimizations(caps);
  }
  
  // Setup lazy images después de carga
  window.addEventListener('load', () => {
    window.setupLazyImages();
  });

  console.log(`🚀 Performance Mode: ${caps.tier.toUpperCase()} (${caps.cores} cores, ${caps.memory}GB RAM, GPU: ${caps.gpu.tier})`);
})();

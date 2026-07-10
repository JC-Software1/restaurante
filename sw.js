// ✅ Service Worker optimizado - Cache strategies por tipo de recurso
// JC Restaurant - PWA Performance

const CACHE_VERSION = 'v2';
const STATIC_CACHE = `jc-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `jc-dynamic-${CACHE_VERSION}`;
const API_CACHE = `jc-api-${CACHE_VERSION}`;
const IMAGE_CACHE = `jc-images-${CACHE_VERSION}`;

// Límites de caché por tier de dispositivo
const CACHE_LIMITS = {
  static: 60,
  dynamic: 30,
  api: 20,
  images: 40
};

// Recursos estáticos para precachear
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/icon-192.png',
  '/icon-512.png',
  '/manifest.json'
];

// Instalación - precachear assets críticos
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then(cache => {
      return cache.addAll(STATIC_ASSETS).catch(err => {
        console.log('⚠️ Precache skip:', err);
      });
    })
  );
  self.skipWaiting();
});

// Activación - limpiar caches viejos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => !key.endsWith(CACHE_VERSION))
            .map(key => caches.delete(key))
      );
    }).then(() => clients.claim())
  );
});

// Estrategia: Cache First para assets estáticos
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, response.clone());
      trimCache(STATIC_CACHE, CACHE_LIMITS.static);
    }
    return response;
  } catch (e) {
    return new Response('Offline', { status: 503 });
  }
}

// Estrategia: Network First para API
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(API_CACHE);
      cache.put(request, response.clone());
      trimCache(API_CACHE, CACHE_LIMITS.api);
    }
    return response;
  } catch (e) {
    const cached = await caches.match(request);
    return cached || new Response(JSON.stringify({ error: 'Offline' }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Estrategia: Cache First para imágenes
async function imageCacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(IMAGE_CACHE);
      cache.put(request, response.clone());
      trimCache(IMAGE_CACHE, CACHE_LIMITS.images);
    }
    return response;
  } catch (e) {
    return new Response('', { status: 404 });
  }
}

// Estrategia: Stale While Revalidate para páginas
async function staleWhileRevalidate(request) {
  const cache = await caches.open(DYNAMIC_CACHE);
  const cached = await cache.match(request);
  
  const fetchPromise = fetch(request).then(response => {
    if (response.ok) {
      cache.put(request, response.clone());
      trimCache(DYNAMIC_CACHE, CACHE_LIMITS.dynamic);
    }
    return response;
  }).catch(() => cached);
  
  return cached || fetchPromise;
}

// Limpiar cache excedente
async function trimCache(cacheName, maxItems) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > maxItems) {
    await cache.delete(keys[0]);
    await trimCache(cacheName, maxItems);
  }
}

// Fetch handler principal
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip chrome-extension and other non-http
  if (!url.protocol.startsWith('http')) return;

  // API requests - Network First
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Images - Cache First
  if (request.destination === 'image' || url.pathname.match(/\.(png|jpg|jpeg|gif|svg|webp|ico)$/)) {
    event.respondWith(imageCacheFirst(request));
    return;
  }

  // Static assets - Cache First
  if (url.pathname.match(/\.(js|css|woff2?|ttf|eot)$/)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // HTML pages - Stale While Revalidate
  if (request.destination === 'document' || url.pathname.endsWith('.html')) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  // Everything else - Network First
  event.respondWith(networkFirst(request));
});

// Notificaciones push
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'Tu pedido ha sido actualizado',
    icon: '/icon-192.png',
    badge: '/icon-badge.png',
    vibrate: [200, 100, 200],
    tag: 'order-update',
    renotify: true,
    requireInteraction: true,
    actions: [
      { action: 'view', title: 'Ver pedido' },
      { action: 'close', title: 'Cerrar' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('JC Restaurant', options)
  );
});

// Click en notificación
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'view' || !event.action) {
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then(clientList => {
        for (const client of clientList) {
          if (client.url.includes('seguimiento.html') && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow('/seguimiento.html');
        }
      })
    );
  }
});

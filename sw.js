/* ═══════════════════════════════════════════════════════════════
   NAVIDAD MÁGICA — sw.js   (Service Worker)
   ───────────────────────────────────────────────────────────────
   Estrategia:
   • Activos estáticos  → Cache First (funciona sin conexión)
   • Audio (MP3)        → Network First con fallback a cache
   • Google Fonts       → Cache First
   ══════════════════════════════════════════════════════════════ */

const CACHE_NAME   = 'navidad-magica-v3';
const STATIC_SHELL = [
    './',
    './index.html',
    './style.css',
    './script.js',
    './manifest.json',
    './icon.svg',
];

/* ── INSTALL: pre-cachear el shell ──────────────────────────── */
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(STATIC_SHELL))
            .then(() => self.skipWaiting())   // Activa el SW nuevo inmediatamente
    );
});

/* ── ACTIVATE: limpiar caches viejos ───────────────────────── */
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys()
            .then(keys => Promise.all(
                keys
                    .filter(k => k !== CACHE_NAME)
                    .map(k  => caches.delete(k))
            ))
            .then(() => self.clients.claim())
    );
});

/* ── FETCH: servir desde cache o red ───────────────────────── */
self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);

    // Ignorar peticiones non-HTTP (chrome-extension, etc.)
    if (!url.protocol.startsWith('http')) return;

    // Google Fonts: cache first
    if (url.hostname.includes('fonts.g')) {
        event.respondWith(
            caches.match(request).then(cached => cached || fetch(request).then(res => {
                const clone = res.clone();
                caches.open(CACHE_NAME).then(c => c.put(request, clone));
                return res;
            }))
        );
        return;
    }

    // Audio (MP3): network first — si falla sirve desde cache
    if (request.destination === 'audio') {
        event.respondWith(
            fetch(request)
                .then(res => {
                    const clone = res.clone();
                    caches.open(CACHE_NAME).then(c => c.put(request, clone));
                    return res;
                })
                .catch(() => caches.match(request))
        );
        return;
    }

    // Todo lo demás: cache first → network
    event.respondWith(
        caches.match(request).then(cached => {
            if (cached) return cached;
            return fetch(request).then(res => {
                if (res.ok) {
                    const clone = res.clone();
                    caches.open(CACHE_NAME).then(c => c.put(request, clone));
                }
                return res;
            }).catch(() => caches.match('./index.html')); // fallback offline
        })
    );
});

/* ── NOTIFICATION CLICK: abrir la app ──────────────────────── */
self.addEventListener('notificationclick', event => {
    event.notification.close();
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then(clientList => {
                // Si ya hay una ventana abierta, enfocarla
                const existing = clientList.find(c => c.url.includes(self.location.origin) && 'focus' in c);
                if (existing) return existing.focus();
                return clients.openWindow('./');
            })
    );
});

/* ── PUSH: manejar notificaciones push ─────────────────────── */
self.addEventListener('push', event => {
    const data = event.data?.json() ?? {};
    event.waitUntil(
        self.registration.showNotification(data.title || '🎄 Navidad Mágica', {
            body:    data.body    || '¡Feliz Navidad! 🎅✨',
            icon:    './icon.svg',
            badge:   './icon.svg',
            vibrate: [200, 100, 200],
            tag:     'navidad-notification',
            renotify: true,
            data:    { url: './' },
        })
    );
});

const CACHE_VERSION = 'nodle-v2';

const STATIC_ASSETS = [
    './',
    './index.html',
    './manifest.json',
    './nodle_icon.png'
];

self.addEventListener('install', e => {
    e.waitUntil(
        caches.open(CACHE_VERSION)
            .then(cache => cache.addAll(STATIC_ASSETS))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', e => {
    e.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys
                    .filter(key => key !== CACHE_VERSION)
                    .map(key => caches.delete(key))
            )
        ).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', e => {
    const url = new URL(e.request.url);

    // Network-first for the page itself and all JSON puzzle data —
    // ensures filtering logic and puzzle lists are always up to date
    if (url.pathname.endsWith('.json') ||
        url.pathname === '/' ||
        url.pathname.endsWith('index.html')) {
        e.respondWith(networkFirst(e.request));
        return;
    }

    // Cache-first for everything else (icons, fonts etc.)
    e.respondWith(cacheFirst(e.request));
});

async function networkFirst(request) {
    const cache = await caches.open(CACHE_VERSION);
    try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch {
        const cached = await cache.match(request);
        return cached || new Response('{}', {
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

async function cacheFirst(request) {
    const cached = await caches.match(request);
    if (cached) return cached;

    try {
        const cache = await caches.open(CACHE_VERSION);
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch {
        return new Response('<h1>You are offline</h1>', {
            headers: { 'Content-Type': 'text/html' }
        });
    }
}
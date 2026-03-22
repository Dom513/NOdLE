const CACHE_VERSION = 'nodle-v1';

// Static assets that rarely/never change — served from cache first
const STATIC_ASSETS = [
    './',
    './index.html',
    './manifest.json',
    './nodle_icon.png'
];

// ── Install: pre-cache static assets ─────────────────────────────────────────
self.addEventListener('install', e => {
    e.waitUntil(
        caches.open(CACHE_VERSION)
            .then(cache => cache.addAll(STATIC_ASSETS))
            .then(() => self.skipWaiting()) // activate immediately, don't wait
    );
});

// ── Activate: delete old caches from previous versions ────────────────────────
self.addEventListener('activate', e => {
    e.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys
                    .filter(key => key !== CACHE_VERSION)
                    .map(key => caches.delete(key))
            )
        ).then(() => self.clients.claim()) // take control of open tabs immediately
    );
});

// ── Fetch: decide strategy based on request type ──────────────────────────────
self.addEventListener('fetch', e => {
    const url = new URL(e.request.url);

    // Network-first for puzzle JSON files (daily + practice + archive)
    // These update regularly so we always try the network first
    if (url.pathname.endsWith('.json')) {
        e.respondWith(networkFirst(e.request));
        return;
    }

    // Cache-first for everything else (HTML, CSS, fonts, icons)
    e.respondWith(cacheFirst(e.request));
});

// ── Strategy: network first, fall back to cache ───────────────────────────────
// Good for: puzzle data, anything that updates regularly
async function networkFirst(request) {
    const cache = await caches.open(CACHE_VERSION);
    try {
        const networkResponse = await fetch(request);
        // Only cache valid responses
        if (networkResponse.ok) {
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch {
        // Network failed — return cached version if we have one
        const cached = await cache.match(request);
        return cached || new Response('{}', {
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// ── Strategy: cache first, fall back to network ───────────────────────────────
// Good for: static assets like index.html, icons, fonts
async function cacheFirst(request) {
    const cached = await caches.match(request);
    if (cached) return cached;

    // Not in cache — fetch from network and cache it
    try {
        const cache = await caches.open(CACHE_VERSION);
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch {
        // Nothing we can do — return a basic offline page
        return new Response('<h1>You are offline</h1>', {
            headers: { 'Content-Type': 'text/html' }
        });
    }
}
// Jarvis hub service worker: keeps the hub's own screen available offline. Network first for the hub's files; it never
// touches the dashboards it shows (they live outside this folder and keep their own service workers) or the live feed.
const CACHE = 'jarvis-v1';
const SHELL = ['./', './index.html', './manifest.webmanifest?v=j1', './apple-touch-icon.png?v=j1', './icon-192.png?v=j1', './icon-512.png?v=j1'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(() => null)); self.skipWaiting(); });
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith('jarvis-') && k !== CACHE).map((k) => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  const scope = new URL(self.registration.scope);
  if (e.request.method !== 'GET' || u.origin !== scope.origin || !u.pathname.startsWith(scope.pathname)) return;
  e.respondWith(fetch(e.request).then((r) => {
    if (r && r.ok) { const c = r.clone(); caches.open(CACHE).then((x) => x.put(e.request, c)).catch(() => null); }
    return r;
  }).catch(() => caches.match(e.request).then((m) => m || caches.match('./index.html'))));
});

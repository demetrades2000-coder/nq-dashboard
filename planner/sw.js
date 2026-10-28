// Planner offline shell: the page and icons come from the network when online and from this cache when not.
// Calendar data never passes through here (it lives in localStorage and syncs with api.github.com, a cross-origin call).
const CACHE = 'planner-v4';
const SHELL = ['./', './index.html', './site.webmanifest', './icon.svg', './icon-192.png', './apple-touch-icon.png'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(() => null)); self.skipWaiting(); });
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith('planner-') && k !== CACHE).map((k) => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch', (e) => {
  const req = e.request, url = new URL(req.url);
  // Only the app's own files; the dashboard's big data.json next door is never stored here.
  if (req.method !== 'GET' || url.origin !== location.origin || !url.pathname.startsWith(new URL('./', location).pathname)) return;
  e.respondWith(fetch(req).then((res) => {
    if (res.ok) { const c = res.clone(); caches.open(CACHE).then((x) => x.put(req, c)); }
    return res;
  }).catch(() => caches.match(req, { ignoreSearch: true }).then((r) => r || caches.match('./index.html'))));
});

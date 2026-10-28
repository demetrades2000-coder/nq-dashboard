// Planner offline shell. The page and icons come from the network when the site answers properly, and from this phone's
// saved copy when it does not: offline, a 404 because the site copy was wiped, or a server error. Calendar data never passes
// through here (it lives in localStorage). v9: an error response never replaces or hides the saved copy.
const CACHE = 'planner-v9';
const SHELL = ['./', './index.html', './site.webmanifest', './icon.svg', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];
self.addEventListener('install', (e) => {
  // Add each file on its own so one missing file cannot stop the rest from being saved.
  e.waitUntil(caches.open(CACHE).then((c) => Promise.all(SHELL.map((u) => c.add(u).catch(() => null)))));
  self.skipWaiting();
});
self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    // Throw away older copies only once the new one actually holds the app page.
    const fresh = await caches.open(CACHE), ok = await fresh.match('./index.html');
    if (ok) for (const k of await caches.keys()) if (k.startsWith('planner-') && k !== CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});
async function saved(req) {
  const exact = await caches.match(req, { ignoreSearch: true });
  if (exact) return exact;
  if (req.mode === 'navigate') return (await caches.match('./index.html')) || (await caches.match('./'));
  return undefined;
}
self.addEventListener('fetch', (e) => {
  const req = e.request, url = new URL(req.url);
  // Only the app's own files; the dashboard's big data.json next door is never stored here.
  if (req.method !== 'GET' || url.origin !== location.origin || !url.pathname.startsWith(new URL('./', location).pathname)) return;
  e.respondWith((async () => {
    try {
      const res = await fetch(req);
      if (res.ok) { const c = res.clone(); caches.open(CACHE).then((x) => x.put(req, c)); return res; }
      const copy = await saved(req);
      if (copy) {
        if (req.mode === 'navigate') {
          // The page isn't listening yet while it loads, so tell it a little later (twice, in case it was slow).
          const tell = () => self.clients.matchAll().then((cs) => cs.forEach((c) => c.postMessage({ planner: 'saved-copy', status: res.status })));
          e.waitUntil(new Promise((done) => setTimeout(() => { tell(); setTimeout(() => { tell(); done(); }, 2500); }, 1200)));
        }
        return copy;
      }
      return res;
    } catch (err) {
      return (await saved(req)) || Response.error();
    }
  })());
});

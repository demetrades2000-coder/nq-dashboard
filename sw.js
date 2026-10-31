// Home Screen app service worker: works offline with the last data it saw.
// Page + data.json + home.json: network-first (fresh when online, cached copy offline). Versioned files (?v=...): cache-first, and a
// new version of a file (fx.js?v=<hash> after a rebuild, runs/<id>.json?v=<hash> and writeups/<slug>.md?v=<hash> after a
// new backtest or write-up) drops the old one from the cache, so a run or write-up opened once stays readable offline.
// Everything else: cached copy at once, refreshed in the background.
// Phone notifications (Web Push from the cloud monitor and the PC bot, engine/push.py): every push shows a notification and
// counts on the app badge; a tap opens the app at the notice (#/activity/<key>). A kind muted in Settings (more.js, stored at
// ./__notify-prefs in the badge cache) is still shown (a phone must show every push) but silently and without the badge.
// A data.json / home.json served from the cache because the network failed carries "x-le-cache: 1" (the app's offline banner).
// v15 (2026-10-21): live.js + the PC's live.json (network-only, see the fetch handler).
// v16 (2026-10-21): intel.js (Trades > Trade intel) + intel.json (versioned by the build time, like runs/<id>.json).
// v18 (2026-10-21): brain.js (Today > Bot Brain + the Home tile), live.pc.brain from live.json.
// v19 (2026-10-21): alerts.js; a push with "silent" (level silent, engine/alerts_plus.py) rings no sound; a critical push
// with "ack" gets a "Got it" action (where the phone shows actions) that posts the ack to the relay; a tap opens #/ack/<id>.
// v20 (2026-10-21): perfcore.js + perf.js (Money > Performance).
// v21 (2026-10-21): Bot Brain is its own bottom tab (brain.js v2).
// v22 (2026-10-22): secondcore.js + second.js (System > Second strategies, PAPER), alerts.js v2 (kind "second").
// v24 (2026-10-22): secondcore.js v3 (Account B card: its own account + eval tracker).
// v25 (2026-10-22): secondcore.js v4 (go / no-go scorecard: paper result vs the expected range, engine/second_scorecard.py).
// v26 (2026-10-22): scalecore.js + scale.js (Money > Scaling plan, engine/scale_plan.py).
// v27 (2026-10-22): ATLAS (strategy 2, the 25K) is its own bottom tab (second.js v3, secondcore.js v5 SecondUI.atlas), the
// Home two-strategy cards (LIT · 50K / ATLAS · 25K), Strategy folds into More, brain.js v4 / alerts.js v3 (ATLAS names), hub.js v5.
// v28 (2026-10-23): secondcore.js v6 (ATLAS page: candidate members (paper), the stop hunts sh_asia / sh_trend with brain + go / no-go).
// v29 (2026-10-23): tradepics.js (trade pictures: engine/trade_chart.py PNGs in charts/, data.json "charts"), secondcore.js v7
// (each ATLAS / candidate brain card shows its latest trade picture, the ATLAS page a "Trade pictures" strip), brain.js v5 and
// second.js v4 (LIT pictures on the Bot Brain and Trades pages). charts/<key>/<id>.png?v=<hash>: cache-first like other ?v= files.
// v30 (2026-10-25): goals.js (Home > Goals card + Today's plan card, #/goals, data.json "goals" from engine/goals.py) and
// features.js (the new More hub, #/features "What's new / All features", week calendar, last 10, health lights, eval
// timeline, ATLAS setup stats, offline badge, haptics, scroll-to-top). New cache name so every iPhone refreshes.
// v33 (2026-10-25): K3 icon (v32) + clean.js (the calm layout: five tabs Home · Trades · ATLAS · Money · More, a short Home, one grouped More
// list with Advanced collapsed, 3D off by default), hub.js v6, more.js v3. New cache name so every iPhone refreshes.
// v34 (2026-10-25 PM): the LIT bot is named "Zlarior" (display name only): tabs Home · Zlarior · ATLAS · Money · More, each bot tab
// holds all of that bot (sections: Zlarior Today · Brain · Trades · Plan · Results · Strategy; ATLAS Today · Brain · Trades · Setups ·
// Results), clean.js v2 and the renamed labels. New cache name so every iPhone refreshes.
// v35 (2026-10-25 PM): hub.js v8: Money > "Funded & payouts" card (data.json "funded_life", engine/funded_life.py: buffer bar,
// cycle profit, 50% consistency gauge, payout-ready date, payouts n/5). New cache name so every iPhone refreshes.
// v35 (2026-10-25 PM): learning.js + learncore.js (Zlarior > Results > Learning, ATLAS > Results > Learning: live vs backtest,
// real-fill costs, weekly reviews, "The bot suggests"; data.json "learning_live", engine/live_learning.py), clean.js v3.
// v36 (2026-10-25 PM): funded & payouts card (v35 funded) + Learning pages (v35 learning) merged.
// v37 (2026-10-26): board.js + boardcore.js (Home "Right now" cut and #/board, the live board: right now per account, today's
// map, bot health strip, week and eval odds, trade log with pictures + CSV; data.json / live.json "board", engine/live_board.py).
// v38 (2026-10-26 PM): ATLAS's funded account on the ATLAS page / Home card (secondcore.js) and the live board
// (boardcore.js): the MFFU payout tracker (engine/account_b.py stage "funded"). New cache name so every iPhone refreshes.
// v39 (2026-10-26 PM): moneycore.js + goals.js v3 (Road to $10K / Stingray 3LT: "My goals" at the bottom of the Home Goals
// card and #/goals, the 9-account stack and the next action; data.json goals.money / live.json money, engine/money_goal.py).
// v40 (2026-10-28): realcore.js + real.js (Home "Today · real accounts" cards + Safety, Money > Real results #/real; data.json /
// live.json board.real, engine/live_board.py), boardcore.js v2 and tradepics.js v2 (PAPER figures carry their REAL twin), clean.js (Home link + Money strip; ?v=3 kept, the new cache name refreshes it).
// v41 (2026-10-28 PM): realcore.js v2 + real.js v2: the 3D / glass look on the Home "Today · real accounts" cards, Safety
// and #/real (neon per account, glowing gauges and health ring, count-ups, the equity curve over a perspective floor).
// v42 (2026-10-28): liveview.js + liveviewchart.js + liveview.css (Live View, #/liveview: the PC's liveview.json from the live
// branch, cross-origin = never cached here), live.js v2, clean.js (Live View in More > Today; ?v=3 kept, the new cache name refreshes it). New cache name so every iPhone refreshes.
// v43 (2026-10-29): deep space (space.css: the static CSS sky + glass; fx.js space.js: Earth, the eclipse, the Sun, stars, the
// bots' satellites, shooting stars on closed trades; 3D on by default), Mission Control (missioncore.js + mission.js +
// mission.css, #/mission and the Home strip), liveviewchart.js / liveview.css (the market-structure layer), clean.js (Mission Control in More > Today; ?v=3 kept, the new cache name refreshes it).
// v44 (2026-10-29): the Holodeck (holo.js + holocore.js + holo.css, #/holo: the day in 3D, every fill at its exact second and
// price, the trades as glass volumes, each setup step by step, what every bot is thinking, replay; holo.json / holo_hist.json
// from the live branch, cross-origin = never cached here; fx.js holo.js: the 3D scene). New cache name so every iPhone refreshes.
// v45 (2026-10-29 night): the BLITZ bottom tab (six tabs: Home · Zlarior · ATLAS · BLITZ · Money · More; blitz.js + blitzcore.js,
// #/blitz/<part>: Today · Brain · Trades · Results · Rules · Go live), the Mind (mindcore.js, #/mind + cards on each bot's Brain and
// Home), Trader's deck (deckcore.js, #/deck: risk meter, next 24 h, eval odds from today's balance, real P&L calendar, trade journal,
// notification center, since you last looked, Holodeck replays), holo.js (#/holo/<day> opens that day), clean.js (the sixth tab;
// ?v=3 kept, the new cache name refreshes it). New cache name so every iPhone refreshes.
// v46 (2026-10-30 night 3, "organized, clean ... shock me"): statuscore.js + polish.js + polish.css (one status bar, the three
// account cards with eval rings + sparklines, what matters now, the Sunday open card, quick tiles, everything else folded;
// one section order on every bot tab: Today · Brain · Trades · Results · Rules; Money = real money only; the search palette;
// the motion system and the once-a-day intro). New cache name so every iPhone refreshes (clean.js?v=3 kept).
const CACHE = 'le-public-v48';
const BADGE = 'le-badge', BADGE_URL = './__badge';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png?v=p111030', './icons/apple-touch-icon.png?v=p111030', './icons/icon-512.png?v=p111030'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(() => null)); self.skipWaiting(); });
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE && k !== BADGE).map((k) => caches.delete(k)))));
  self.clients.claim();
});
const prune = (u) => caches.open(CACHE).then((c) => c.keys().then((ks) => ks.forEach((k) => {
  const ku = new URL(k.url); if (ku.pathname === u.pathname && ku.search !== u.search) c.delete(k);
}))).catch(() => null);
self.addEventListener('fetch', (e) => {
  const req = e.request, url = new URL(req.url);
  // live.json (live.js: the PC's minute-by-minute file on api.github.com / raw.githubusercontent.com) is network-only:
  // never cached, never answered from a cache (an old copy would look live). Cross-origin requests are not touched anyway.
  if (req.method !== 'GET' || url.origin !== location.origin || url.pathname.endsWith('live.json')) return;
  const put = (key, res) => { if (res && res.ok) { const c = res.clone(); caches.open(CACHE).then((x) => x.put(key, c)); } return res; };
  const isData = url.pathname.endsWith('data.json') || url.pathname.endsWith('home.json'), isPage = req.mode === 'navigate' || url.pathname.endsWith('/') || url.pathname.endsWith('index.html');
  if (isData || isPage) {
    const key = isData ? (url.pathname.endsWith('home.json') ? './home.json' : './data.json') : './index.html';
    e.respondWith(fetch(req).then((r) => put(key, r)).catch(() => caches.match(key).then((hit) => {
      if (!hit || !isData) return hit;
      const h = new Headers(hit.headers); h.set('x-le-cache', '1');
      return hit.blob().then((b) => new Response(b, { status: 200, headers: h }));
    })));
    return;
  }
  if (url.search.includes('v=')) { e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((r) => { prune(url); return put(req, r); }))); return; }
  e.respondWith(caches.match(req).then((hit) => { const net = fetch(req).then((r) => put(req, r)).catch(() => hit); return hit || net; }));
});

// ---- notifications
const badgeGet = () => caches.open(BADGE).then((c) => c.match(BADGE_URL)).then((r) => (r ? r.text() : '0')).then((t) => +t || 0).catch(() => 0);
const badgeSet = (n) => caches.open(BADGE).then((c) => c.put(BADGE_URL, new Response(String(n)))).catch(() => null);
const PREFS_URL = './__notify-prefs';
const prefsGet = () => caches.open(BADGE).then((c) => c.match(PREFS_URL)).then((r) => (r ? r.json() : null)).catch(() => null);
const safeHash = (u) => (typeof u === 'string' && /^#\/[\w\-/:.%]*$/.test(u) ? u : '#/activity');
self.addEventListener('push', (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (_) { d = { body: e.data ? e.data.text() : '' }; }
  const title = String(d.title || 'Zenith').slice(0, 120);
  const opts = { body: String(d.body || '').slice(0, 600), icon: 'icons/icon-192.png?v=p111030', badge: 'icons/icon-192.png?v=p111030',
    data: { url: safeHash(d.url), key: d.key || null, t: d.t || null }, timestamp: d.t ? d.t * 1000 : Date.now() };
  if (d.tag) { opts.tag = String(d.tag); opts.renotify = true; }
  if (d.require) { opts.requireInteraction = true; opts.vibrate = [400, 150, 400, 150, 400]; }   // the Surface-offline alert stays until tapped
  if (typeof d.ack === 'string' && d.ack.length < 90) { opts.data.ack = d.ack; opts.actions = [{ action: 'ack', title: 'Got it' }]; }
  if (d.silent) { opts.silent = true; opts.renotify = false; delete opts.vibrate; }
  // recap card / brief image (tools/recap.py): only a PNG on this app's own site; phones without notification images ignore it
  if (typeof d.image === 'string' && d.image.length < 300) { try { const iu = new URL(d.image); if (iu.origin === location.origin && /\.png$/.test(iu.pathname)) opts.image = iu.href; } catch (_) {} }
  e.waitUntil(prefsGet().then((p) => {
    const muted = p && d.kind && p[d.kind] === false && !d.require;
    if (muted) { opts.silent = true; opts.renotify = false; }
    return Promise.all([
    self.registration.showNotification(title, opts),
    muted ? null : badgeGet().then((n) => badgeSet(n + 1).then(() => (self.navigator && self.navigator.setAppBadge ? self.navigator.setAppBadge(n + 1) : null))).catch(() => null),
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((cs) => cs.forEach((c) => c.postMessage({ type: 'push', d }))).catch(() => null),
    ]);
  }));
});
const ackPost = (id) => fetch('./push_relay.json', { cache: 'no-store' }).then((r) => r.json()).then((r) => fetch(
  `${String(r.ntfy || 'https://ntfy.sh').replace(/\/$/, '')}/${encodeURIComponent(r.topic)}`,
  { method: 'POST', body: JSON.stringify({ le: 'ack', id, t: Math.round(Date.now() / 1000) }) })).catch(() => null);
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const ackId = e.notification.data && e.notification.data.ack;
  if (e.action === 'ack' && ackId) { e.waitUntil(ackPost(ackId)); return; }     // "Got it" on the notification itself
  const hash = safeHash(e.notification.data && e.notification.data.url);
  const url = new URL('./' + hash, self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((cs) => {
    const c = cs.find((x) => x.url.startsWith(self.registration.scope));
    if (c) { c.postMessage({ type: 'open', hash }); return c.focus ? c.focus() : null; }
    return self.clients.openWindow(url);
  }));
});
// the push service replaced this phone's subscription: subscribe again with the same key (the app then shows the new code)
self.addEventListener('pushsubscriptionchange', (e) => {
  const key = e.oldSubscription && e.oldSubscription.options && e.oldSubscription.options.applicationServerKey;
  if (!key) return;
  e.waitUntil(self.registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key }).catch(() => null));
});

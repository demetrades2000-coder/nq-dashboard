// More phone features (loaded by index.html with one <script defer> after hub.js; data: data.json / home.json only, read-only):
//   every page   a "last updated" line under the header (pull down or tap to refresh), a stale banner when data.json is older
//                than 45 min, and an "Offline: showing HH:MM data" banner when the service worker served the cached copy
//   Home         + an "Add to Home Screen" guide (iOS / Android steps) until the app runs installed (display-mode standalone),
//                + "Why no trade today" (the live model state, today's rejected setups and shallow sweeps, the day brief),
//                + a small levels radar (nearest LIT levels above / below price, the next killzone)
//   Home > Levels radar   every untaken LIT level above and below price with its distance in points, the next killzone
//   Trades > Trade replay a past trade bar by bar (play / pause / step / speed) with entry, stop, target and breakeven lines
//                         (replays/<id>.json, the same records as the trade charts)
//   Money > Eval curve    the eval's balance per session with the $53,000 target and the trailing floor (accounts eval / days)
//   Money > Share card    a month's result drawn as a PNG (canvas) for the share sheet or a download
//   Settings     + text size (A− / A+), high contrast, which notification kinds sound (stored on this phone; the service worker
//                shows a muted kind silently because a phone must show every push), local + cloud test notification steps
// Classic script that uses the main page's helpers (D, VIEWS, GROUPS, PAGES, icon, esc, usd, store ...). Paper only.
(function () {
  'use strict';
  if (typeof GROUPS === 'undefined' || typeof VIEWS === 'undefined') return;
  window.MORE = true;

  // ============================================================================================ data access
  const MD = () => (typeof D !== 'undefined' && D) || window.HOMEJ || null;
  const ML = () => (MD() && MD().live) || {};
  const nowS = () => Date.now() / 1000;
  const p2 = (n) => String(n).padStart(2, '0');
  const hmLocal = (ms) => { const d = new Date(ms); return `${p2(d.getHours())}:${p2(d.getMinutes())}`; };
  const fmtAge = (s) => s < 90 ? Math.round(s) + ' s' : s < 5400 ? Math.round(s / 60) + ' min' : s < 172800 ? Math.round(s / 3600) + ' h' : Math.round(s / 86400) + ' days';
  const builtMs = () => { const b = MD()?.built; const t = b ? Date.parse(b) : NaN; return Number.isFinite(t) ? t : null; };
  const STALE_S = 45 * 60;
  const isStandaloneM = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const iosM = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const androidM = () => /android/i.test(navigator.userAgent);
  const fpt = (v) => Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // ============================================================================================ offline / stale state
  // the service worker marks a cached data.json / home.json with "x-le-cache: 1" when the network failed
  const NET = { offline: false, at: null };
  const rawFetch = window.fetch.bind(window);
  window.fetch = function (input, init) {
    const url = typeof input === 'string' ? input : (input && input.url) || '';
    const p = rawFetch(input, init);
    if (!/(^|\/)(data|home)\.json(\?|$)/.test(url)) return p;
    return p.then((r) => { const was = NET.offline; NET.offline = r.headers.get('x-le-cache') === '1'; if (!NET.offline) NET.at = Date.now(); if (was !== NET.offline) strip(); return r; },
      (e) => { NET.offline = true; strip(); throw e; });
  };
  addEventListener('online', () => { strip(); if (typeof load === 'function') load(); });
  addEventListener('offline', () => { NET.offline = true; strip(); });

  // the line under the header on every page: updated time + age, the stale and offline banners
  function stripHTML() {
    const b = builtMs();
    if (!b) return '';
    const age = Math.max(0, (Date.now() - b) / 1000), off = NET.offline || navigator.onLine === false;
    const hm = hmLocal(b), day = new Date(b).toDateString() === new Date().toDateString() ? '' : ' ' + new Date(b).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    let ban = '';
    // live.js: the PC's live.json (every minute) keeps Home current between cloud runs; then old cloud data is no alarm
    const la = window.LIVE && window.LIVE.age ? window.LIVE.age() : null, liveOn = la != null && la < 10 * 60;
    if (off) ban = `<div class="mo-ban off" role="status">${icon('sources')}<span><b>Offline — showing ${hm}${day} data</b><em>The last copy this phone saw. It refreshes by itself when you are back online.</em></span></div>`;
    else if (age > STALE_S && !liveOn) {
      const mkt = marketHours();
      ban = `<div class="mo-ban ${mkt ? 'bad' : 'warn'}" role="status">${icon('clock')}<span><b>Data is ${fmtAge(age)} old</b><em>${mkt
        ? 'The cloud monitor should publish every 30 min in the session. Pull down to retry; if it stays old, check GitHub → Actions → cloud-monitor.'
        : 'Normal outside market hours: the cloud monitor runs on market days from 01:30 to 16:30 ET.'}</em></span></div>`;
    }
    return `${ban}<button type="button" class="mo-upd" id="moUpd" aria-label="Refresh data">${icon('refresh')}<span>${liveOn ? `<b class="up">Live</b> · ${fmtAge(la)} ago · cloud data ${hm}${day}` : `Updated <b>${hm}${day}</b> · ${fmtAge(age)} ago`}</span><em>${'ontouchstart' in window ? 'pull down to refresh' : 'tap to refresh'}</em></button>`;
  }
  function marketHours(ts = nowS()) { const e = et(ts), m = e.h * 60 + e.mi; return !['Sat', 'Sun'].includes(e.wd) && m >= 90 && m < 990; }
  function strip() {
    const pg = document.getElementById('page'); if (!pg) return;
    let s = document.getElementById('moStrip');
    const h = stripHTML();
    if (!h) { if (s) s.remove(); return; }
    if (!s) { s = document.createElement('div'); s.id = 'moStrip'; s.className = 'mo-strip'; }
    if (s.parentNode !== pg || pg.firstChild !== s) pg.insertBefore(s, pg.firstChild);
    if (s.innerHTML !== h) s.innerHTML = h;
  }
  document.addEventListener('click', (e) => { if (e.target.closest?.('#moUpd') && typeof load === 'function') load(true); });
  setInterval(strip, 30000);

  // ============================================================================================ settings: text size, contrast, notification kinds
  const ZOOMS = [0.9, 1, 1.1, 1.2, 1.35];
  function lookM() {
    const r = document.documentElement, z = +store.get('more.zoom', 1) || 1;
    r.style.setProperty('--mo-zoom', String(z)); r.dataset.mzoom = z === 1 ? 'off' : 'on';
    r.dataset.contrast = store.get('more.contrast', false) ? 'high' : 'off';
  }
  const KINDS = [['fill', 'Trade entered', 'LONG · MFFU 50K “Entered 4 MNQ”'], ['outcome', 'Trade result', 'the same notice turns into +$1,812 / −$366 / $0 BE'],
    ['pc', 'PC bot silent / back', 'no heartbeat from the PC during the session'], ['ops', 'Daily ops', 'All green for tonight, day summary, week report, roll reminders'],
    ['risk', 'Risk / NinjaTrader', 'NinjaTrader disconnected, kill switch, risk notices'], ['system', 'Updates', 'auto-update / auto-resume results'],
    ['timing', 'Eval timing', 'eval-timing changes (only with LE_PUSH_EXTRA)'], ['test', 'Tests', 'the cloud-monitor “Send a test notification” run']];
  const PREF_URL = './__notify-prefs';
  const prefs = () => ({ ...Object.fromEntries(KINDS.map(([k]) => [k, true])), ...(store.get('more.notify', {}) || {}) });
  async function savePrefs(p) {
    store.set('more.notify', p);
    try { const c = await caches.open('le-badge'); await c.put(PREF_URL, new Response(JSON.stringify(p), { headers: { 'content-type': 'application/json' } })); } catch { }
  }
  const CLOUD_RUN = 'https://github.com/demetrades2000-coder/nq-liquidity-engine/actions/workflows/cloud-monitor.yml';
  function notifyCard() {
    const P = prefs(), perm = 'Notification' in window ? Notification.permission : 'unsupported';
    return `<div class="card" id="moNotify"><div class="card-h"><h3>${icon('alerts')}Notification kinds</h3>${chip(perm === 'granted' ? 'allowed' : perm === 'denied' ? 'blocked' : perm === 'unsupported' ? 'not available' : 'not allowed yet', perm === 'granted' ? 'good' : perm === 'denied' ? 'bad' : '')}</div>
      <div class="note" style="margin-top:0">Choose which notices make a sound. A phone must show every push it gets, so a muted kind still lands in the list, <b>silently and without a badge</b>. Saved on this phone only.</div>
      ${KINDS.map(([k, l, d]) => `<label class="row"><span><b>${l}</b><span class="small mut">${d}</span></span><input type="checkbox" class="switch" data-nk="${k}" ${P[k] ? 'checked' : ''}></label>`).join('')}
      <div class="mo-h4">Send a test notification</div>
      <ol class="list"><li><b>This phone only:</b> tap <b>Show a test here</b> (the app draws it itself; it checks sound and the banner).</li>
        <li><b>The whole path (cloud → phone):</b> GitHub app or site → <b>Actions</b> → <b>cloud-monitor</b> → <b>Run workflow</b> → tick <b>Send a test notification</b> → <b>Run workflow</b>. It arrives in 1–3 minutes as a <b>Tests</b> notice.</li></ol>
      <div class="row-btns"><button class="btn ghost" type="button" id="moTest">${icon('check')}Show a test here</button><a class="btn ghost" href="${CLOUD_RUN}" target="_blank" rel="noopener">${icon('ext')}Open cloud-monitor</a></div></div>`;
  }
  function wireNotify(root) {
    $$('input[data-nk]', root).forEach((i) => { i.onchange = () => { const p = prefs(); p[i.dataset.nk] = i.checked; savePrefs(p); toast(`${KINDS.find((k) => k[0] === i.dataset.nk)[1]}: ${i.checked ? 'sound on' : 'silent'}`); }; });
    const t = $('#moTest', root);
    if (t) t.onclick = async () => {
      try {
        if (!('serviceWorker' in navigator) || !('Notification' in window)) throw new Error('This browser cannot show notifications (open the Home Screen app)');
        if (Notification.permission !== 'granted' && (await Notification.requestPermission()) !== 'granted') throw new Error('Notifications are not allowed for this app');
        const r = await navigator.serviceWorker.ready;
        await r.showNotification('Test · Liquidity', { body: 'Test on this phone: notifications work.', icon: 'icons/icon-192.png?v=drop1', badge: 'icons/icon-192.png?v=drop1', tag: 'le-local-test', data: { url: '#/settings' } });
        toast('Test shown');
      } catch (e) { toast(e.message || String(e), 4200); }
    };
  }
  function lookCard() {
    const z = +store.get('more.zoom', 1) || 1;
    return `<div class="card" id="moLook"><div class="card-h"><h3>${icon('settings')}Text size &amp; contrast</h3></div>
      <div class="row"><span><b>Text size</b><span class="small mut">Bigger or smaller pages; ${Math.round(z * 100)}% now</span></span>
        <span class="mo-az"><button class="btn ghost" type="button" id="moAm" aria-label="Smaller text" ${z <= ZOOMS[0] ? 'disabled' : ''}>A−</button><b id="moAz">${Math.round(z * 100)}%</b><button class="btn ghost" type="button" id="moAp" aria-label="Bigger text" ${z >= ZOOMS[ZOOMS.length - 1] ? 'disabled' : ''}>A+</button></span></div>
      <label class="row"><span><b>High contrast</b><span class="small mut">Brighter text, solid cards, stronger lines, no 3D glow behind the cards</span></span><input type="checkbox" class="switch" id="moHc" ${store.get('more.contrast', false) ? 'checked' : ''}></label></div>`;
  }
  function wireLook(root) {
    const step = (d) => { const z = +store.get('more.zoom', 1) || 1, i = Math.max(0, Math.min(ZOOMS.length - 1, ZOOMS.indexOf(ZOOMS.reduce((a, b) => Math.abs(b - z) < Math.abs(a - z) ? b : a)) + d)); store.set('more.zoom', ZOOMS[i]); lookM(); render(true); };
    const m = $('#moAm', root), p = $('#moAp', root), hc = $('#moHc', root);
    if (m) m.onclick = () => step(-1);
    if (p) p.onclick = () => step(1);
    if (hc) hc.onchange = (e) => { store.set('more.contrast', e.target.checked); lookM(); };
  }

  // ============================================================================================ install guide (Home)
  function installCard() {
    if (isStandaloneM() || store.get('more.instLater', 0) > Date.now()) return '';
    const ios = iosM(), and = androidM(), ip = typeof INSTALL !== 'undefined' && INSTALL;
    const iosSteps = `<ol class="list"><li>Open this page in <b>Safari</b> (other iPhone browsers cannot add apps).</li><li>Tap <b>Share</b> ${icon('share')} at the bottom.</li><li>Scroll down, tap <b>Add to Home Screen</b> → <b>Add</b>.</li><li>Open <b>Liquidity</b> from the Home Screen: full screen, notifications, offline copy.</li></ol>`;
    const andSteps = `<ol class="list"><li>Open this page in <b>Chrome</b>.</li><li>Tap the <b>⋮ menu</b> (top right).</li><li>Tap <b>Install app</b> (or <b>Add to Home screen</b>) → <b>Install</b>.</li><li>Open <b>Liquidity</b> from the home screen.</li></ol>`;
    const both = !ios && !and;
    return `<div class="card mo-inst" id="moInst"><div class="card-h"><h3>${icon('phone')}Add Liquidity to your Home Screen</h3><button class="chipbtn" type="button" id="moInstX" aria-label="Hide for a week">${icon('close')}</button></div>
      <p class="mo-p">One minute, once. The app then opens full screen, can send a notification for every trade and keeps the last data for offline.</p>
      ${both ? `<div class="mo-h4">iPhone</div>${iosSteps}<div class="mo-h4">Android</div>${andSteps}` : ios ? iosSteps : andSteps}
      ${ip ? `<div class="row-btns"><button class="btn primary" type="button" id="moInstGo">${icon('phone')}Install now</button></div>` : ''}</div>`;
  }
  function wireInstall(root) {
    const x = $('#moInstX', root); if (x) x.onclick = () => { store.set('more.instLater', Date.now() + 7 * 864e5); $('#moInst')?.remove(); toast('Hidden for a week'); };
    const g = $('#moInstGo', root); if (g) g.onclick = async () => { try { INSTALL.prompt(); await INSTALL.userChoice; } catch { } INSTALL = null; render(true); };
  }
  addEventListener('appinstalled', () => { $('#moInst')?.remove(); });

  // ============================================================================================ killzones + levels radar
  const KZ = [[120, 300, 'London killzone'], [570, 690, 'NY AM killzone'], [810, 930, 'NY PM killzone']];
  function kzNow(ts = nowS()) {
    const e = et(ts), mod = e.h * 60 + e.mi, wk = !['Sat', 'Sun'].includes(e.wd), base = ts - (mod * 60 + (ts % 60));
    const at = (m, add = 0) => base + m * 60 + add * 86400, nextDay = e.wd === 'Sat' ? 2 : e.wd === 'Sun' ? 1 : e.wd === 'Fri' ? 3 : 1;
    const cur = wk && KZ.find(([a, b]) => mod >= a && mod < b);
    let nx = wk && KZ.find(([a]) => mod < a);
    nx = nx ? { label: nx[2], t: at(nx[0]), end: at(nx[1]) } : { label: KZ[0][2], t: at(KZ[0][0], nextDay), end: at(KZ[0][1], nextDay) };
    return { cur: cur ? { label: cur[2], end: at(cur[1]) } : null, next: nx };
  }
  function radarData() {
    const L = ML(), b = L.brief || {}, m = b.morning || {}, price = +(L.price ?? b.now?.price ?? m.price);
    const today = m.day && L.lit?.today && m.day !== L.lit.today ? [] : (m.levels || []);
    let lv = today.filter((x) => !x.taken && ok(x.price)).map((x) => ({ label: x.label, price: +x.price, side: x.side, kind: x.kind }));
    const seen = new Set(lv.map((x) => x.label + '|' + x.price));
    for (const x of L.levels || []) if (ok(x.price) && !seen.has(x.label + '|' + x.price)) { lv.push({ label: x.label, price: +x.price, side: x.side, kind: x.kind, strength: x.strength }); seen.add(x.label + '|' + x.price); }
    if (!ok(price)) return { price: null, above: [], below: [] };
    // one row per price (EQH / equal highs / Premarket high at the same price become one row), the VIX target band is not a level
    const byPx = new Map();
    for (const x of lv) {
      if (x.kind === 'target' || /band/i.test(x.label || '')) continue;
      const k = x.price.toFixed(2), y = byPx.get(k);
      if (!y) byPx.set(k, { ...x, labels: [x.label] }); else if (!y.labels.includes(x.label)) y.labels.push(x.label);
    }
    const nice = (ls) => { const real = ls.filter((l) => !/^(EQH|EQL|equal (highs|lows))$/i.test(l)); return (real.length ? real : ls).join(' · ') + (real.length && real.length < ls.length ? ' (equal)' : ''); };
    lv = [...byPx.values()].map((x) => ({ ...x, label: nice(x.labels), short: (x.labels.find((l) => !/^(EQH|EQL|equal )/i.test(l)) || x.labels[0]), dist: x.price - price }));
    const above = lv.filter((x) => x.dist > 0).sort((a, c) => a.dist - c.dist), below = lv.filter((x) => x.dist <= 0).sort((a, c) => c.dist - a.dist);
    return { price, above, below, atr: +(L.lit?.vix_move || 0) / 4 || null, bar_t: (L.bars || []).slice(-1)[0]?.[0] || b.now?.bar_t || L.last_run };
  }
  function radarSVG(R, n = 5) {
    const W = 360, H = 340, cx = W / 2, cy = H / 2, rMax = 132;
    const pts = [...R.above.slice(0, n).map((x, i) => ({ ...x, i, up: 1 })), ...R.below.slice(0, n).map((x, i) => ({ ...x, i, up: -1 }))];
    const far = Math.max(1, ...pts.map((x) => Math.abs(x.dist)));
    const rr = (d) => 22 + Math.sqrt(Math.abs(d) / far) * (rMax - 22);
    const ANG = [0, 32, -32, 58, -58];
    const dots = pts.map((x) => {
      const ang = (-90 * x.up + ANG[x.i % ANG.length] * x.up) * Math.PI / 180, r = rr(x.dist), px = cx + Math.cos(ang) * r, py = cy + Math.sin(ang) * r;
      const name = String(x.short || x.label), lab = name.length > 13 ? name.slice(0, 12) + '…' : name, w = lab.length * 5.9 + 10;
      const col = x.up > 0 ? 'var(--bsl)' : 'var(--ssl)', right = px >= cx ? px + w <= W : px - w < 0;
      return `<g><circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="${x.i === 0 ? 6 : 4.5}" fill="${col}"${x.i === 0 ? ' class="mo-ping"' : ''}/><text x="${(px + (right ? 9 : -9)).toFixed(1)}" y="${(py + 4).toFixed(1)}" text-anchor="${right ? 'start' : 'end'}" class="mo-rt">${esc(lab)}</text></g>`;
    }).join('');
    const rings = [0.25, 0.5, 1].map((f) => { const r = 22 + Math.sqrt(f) * (rMax - 22); return `<circle cx="${cx}" cy="${cy}" r="${r.toFixed(1)}" class="mo-ring"/><text x="${(cx + r - 3).toFixed(1)}" y="${cy + 12}" text-anchor="end" class="mo-rl">${Math.round(far * f)}</text>`; }).join('');
    return `<svg class="mo-radar" viewBox="0 0 ${W} ${H}" role="img" aria-label="Levels radar: levels above price at the top, below at the bottom, farther = more points away">
      <defs><radialGradient id="moRg"><stop offset="0" stop-color="var(--accent)" stop-opacity=".22"/><stop offset="1" stop-color="var(--accent)" stop-opacity="0"/></radialGradient></defs>
      <circle cx="${cx}" cy="${cy}" r="${rMax + 6}" fill="url(#moRg)"/>${rings}<line x1="${cx - rMax}" y1="${cy}" x2="${cx + rMax}" y2="${cy}" class="mo-ring"/>
      <g class="mo-sweep"><path d="M${cx},${cy} L${cx},${cy - rMax - 6} A${rMax + 6},${rMax + 6} 0 0,1 ${(cx + Math.sin(0.6) * (rMax + 6)).toFixed(1)},${(cy - Math.cos(0.6) * (rMax + 6)).toFixed(1)} Z" fill="var(--accent)" opacity=".10"/></g>
      <text x="8" y="16" class="mo-rl">ABOVE · buy stops</text><text x="8" y="${H - 8}" class="mo-rl">BELOW · sell stops</text><text x="${W - 8}" y="${H - 8}" text-anchor="end" class="mo-rl">rings: pts away</text>
      ${dots}<circle cx="${cx}" cy="${cy}" r="7" fill="var(--accent)"/><text x="${cx}" y="${cy + 24}" text-anchor="middle" class="mo-rp">${fpt(R.price)}</text></svg>`;
  }
  const lvRow = (x) => `<div class="mo-lv ${x.dist > 0 ? 'h' : 'l'}"><span>${esc(x.label)}</span><b>${fpt(x.price)}</b><em class="${x.dist > 0 ? 'up' : 'dn'}">${x.dist > 0 ? '+' : '−'}${num(Math.abs(x.dist), 2)} pts</em></div>`;
  function kzLine() {
    const K = kzNow();
    return `<div class="mo-kz">${K.cur ? `<span class="mo-on">${esc(K.cur.label)} now · ends in <b data-cd="${K.cur.end}">${cdFmt(K.cur.end - nowS())}</b></span>` : ''}
      <span>Next: <b>${esc(K.next.label)}</b> ${et(K.next.t).wd} ${et(K.next.t).hm} ET · in <b data-cd="${K.next.t}">${cdFmt(K.next.t - nowS())}</b></span></div>`;
  }
  function radarCard() {
    const R = radarData(); if (!ok(R.price)) return '';
    const a = R.above[0], b = R.below[0];
    return `<a class="card mo-rcard" href="#/radar"><div class="card-h"><h3>${icon('radar')}Levels radar</h3><span class="meta">${icon('right')}</span></div>
      <div class="mo-near"><div class="h"><span>Above</span><b>${a ? esc(a.label) : '—'}</b><em>${a ? '+' + num(a.dist, 2) + ' pts' : 'none'}</em></div>
        <div class="px"><span>Price</span><b>${fpt(R.price)}</b></div>
        <div class="l"><span>Below</span><b>${b ? esc(b.label) : '—'}</b><em>${b ? '−' + num(Math.abs(b.dist), 2) + ' pts' : 'none'}</em></div></div>${kzLine()}</a>`;
  }
  VIEWS.radar = (el) => {
    const R = radarData();
    if (!ok(R.price)) { el.innerHTML = head('Home · levels radar', 'Levels radar') + emptyBox('No price yet.', ' The radar fills in after the cloud monitor’s next run.'); return; }
    el.innerHTML = head('Home · levels radar', 'Levels radar', `Every LIT level the bot can trade a sweep of, nearest first. Price ${fpt(R.price)}${R.bar_t ? ` at ${et(R.bar_t).hm} ET` : ''}.`)
      + `<div class="card">${kzLine()}<div class="mo-rwrap">${radarSVG(R)}</div>
        <div class="legend"><span><i style="background:var(--bsl)"></i>above price (buy stops)</span><span><i style="background:var(--ssl)"></i>below price (sell stops)</span><span><i style="background:var(--accent)"></i>price</span></div></div>
      <div class="grid g2 astart"><div class="card"><div class="card-h"><h3>Above · ${R.above.length}</h3></div><div class="mo-lvs">${R.above.slice(0, 12).map(lvRow).join('') || emptyBox('', 'No untaken level above.')}</div></div>
        <div class="card"><div class="card-h"><h3>Below · ${R.below.length}</h3></div><div class="mo-lvs">${R.below.slice(0, 12).map(lvRow).join('') || emptyBox('', 'No untaken level below.')}</div></div></div>
      <p class="small mut">A LIT trade needs a sweep at least 0.5 ATR past one of these, an inducement swing first, a displacement candle and a 5m CISD close, inside 02:00–15:30 ET.</p>`;
  };

  // ============================================================================================ why no trade today (Home)
  function whyData() {
    const L = ML(), b = L.brief || {}, m = b.morning || {}, log = b.log || [];
    const todayET = et(nowS()).date, day = L.lit?.today || m.day || b.day || todayET;
    const traded = (L.ledger || []).filter((t) => t.day === todayET).length + (L.position ? 1 : 0);
    const onDay = (x) => !x.t || et(x.t).date === day;
    const rej = log.filter((x) => x.kind === 'rejected' && onDay(x)).sort((a, c) => (c.t || 0) - (a.t || 0));
    const shallow = log.filter((x) => x.kind === 'sweep' && onDay(x) && /needs/i.test(x.text || '')).sort((a, c) => (c.t || 0) - (a.t || 0));
    const sweeps = log.filter((x) => x.kind === 'sweep' && onDay(x)).length, cisd = log.filter((x) => x.kind === 'cisd' && onDay(x)).length;
    const reasons = [];
    const e = et(nowS()), mod = e.h * 60 + e.mi, wk = !['Sat', 'Sun'].includes(e.wd);
    const win = ((MD()?.strategy?.lit || {}).window || [[120, 930]])[0] || [120, 930];
    if (!wk) reasons.push(['clock', 'Weekend: no session. LIT trades Monday to Friday, 02:00–15:30 ET.']);
    else if (mod < win[0]) reasons.push(['clock', `Before the entry window: LIT starts looking at ${p2(Math.floor(win[0] / 60))}:${p2(win[0] % 60)} ET.`]);
    else if (mod >= win[1]) reasons.push(['clock', `Entry window closed at ${p2(Math.floor(win[1] / 60))}:${p2(win[1] % 60)} ET; one trade a day at most.`]);
    if (day && day !== todayET && wk) reasons.push(['info', `The latest brief is for ${fDate(day)}; today’s starts with the first cloud run of the session.`]);
    const pcb = L.health?.pc_bars || {};
    if (pcb.stale || pcb.missing) reasons.push(['bad', `Waiting for NinjaTrader bars from the PC: ${esc(pcb.text || 'bars missing or stale')}. No paper entries until they arrive.`]);
    const ws = m.weekly_stop;
    if (ws && ws.on && (+ws.mult < 1 || +ws.stops >= +ws.after)) reasons.push(['warn', `Weekly stop: ${esc(ws.text || 'two stop-outs this week, half size for the rest of it')}.`]);
    if (m.monday && m.monday.on && m.monday.today && m.monday.text) reasons.push(['info', `Monday rule: ${esc(m.monday.text)}`]);
    const news = (m.news || []).filter((n) => n && n.blackout).slice(0, 2);
    news.forEach((n) => reasons.push(['warn', `News blackout ${esc(n.blackout)} ET: ${esc(n.title || 'high-impact event')}`]));
    return { day, traded, rej, shallow, sweeps, cisd, reasons, state: (typeof L.model_state === 'string' ? L.model_state : '') || b.now?.model_state || '', waiting: b.waiting };
  }
  const RULE_W = { stop: 'stop size', disp: 'displacement', depth: 'sweep depth', idm: 'inducement', rr: 'reward : risk', time: 'time', window: 'entry window', cisd: 'CISD', news: 'news', monday: 'Monday rule' };
  function whyCard() {
    const W = whyData(), L = ML();
    if (!L.last_run && !L.brief) return '';
    if (W.traded) return `<div class="card mo-why ok"><div class="card-h"><h3>${icon('check')}Traded today</h3></div><p class="mo-p">The bot ${L.position ? 'is in a trade now' : 'took today’s trade'} (one a day at most). Details on <a href="#/accounts">Accounts</a>.</p></div>`;
    const top = W.rej.slice(0, 4);
    return `<div class="card mo-why" id="moWhy"><div class="card-h"><h3>${icon('info')}Why no trade today</h3>${chip(`${W.sweeps} sweeps · ${W.cisd} CISDs · ${W.rej.length} rejected`)}</div>
      ${W.state ? `<p class="mo-state">${esc(W.state)}</p>` : ''}
      ${W.reasons.map(([k, t]) => `<div class="mo-rs ${k}">${icon(k === 'clock' ? 'clock' : k === 'bad' ? 'risk' : k === 'warn' ? 'flag' : 'info')}<span>${t}</span></div>`).join('')}
      ${top.length ? `<div class="mo-h4">Setups seen and rejected${W.day && W.day !== et(nowS()).date ? ' · ' + esc(fDate(W.day)) : ''}</div>${top.map((x) => `<div class="mo-rj"><b>${x.t ? et(x.t).hm : ''}</b><span>${esc(String(x.text || '').replace(/^(LONG|SHORT) setup rejected: /, (s, d) => d + ': '))}</span>${x.rule ? chip(esc(RULE_W[x.rule] || x.rule), 'bad') : ''}</div>`).join('')}` : ''}
      ${!top.length && W.shallow.length ? `<div class="mo-h4">Sweeps that were too shallow${W.day && W.day !== et(nowS()).date ? ' · ' + esc(fDate(W.day)) : ''}</div>${W.shallow.slice(0, 3).map((x) => `<div class="mo-rj"><b>${x.t ? et(x.t).hm : ''}</b><span>${esc(x.text)}</span></div>`).join('')}` : ''}
      ${!top.length && !W.shallow.length && !W.reasons.length ? `<p class="mo-p">No setup has formed yet: LIT waits for a level sweep, an inducement, a displacement and a CISD close. Two to four trades a week is normal.</p>` : ''}
      <div class="row-btns"><button class="chipbtn" type="button" data-go="plan">${icon('target')}<span>LIT plan</span></button><button class="chipbtn" type="button" data-go="radar">${icon('radar')}<span>Levels radar</span></button></div></div>`;
  }

  // ============================================================================================ eval equity curve (Money)
  const PLAN = { start: 50000, target: 3000, mll: 2000, lock: 50100 };
  function evalAccounts() {
    return ((MD()?.accounts) || []).filter((a) => a && a.id && a.eval && !a.error).map((a) => ({ id: a.id, name: a.name || a.id, src: a.source, ev: a.eval, days: (a.days || []).filter((d) => Array.isArray(d) && d[0]) }));
  }
  function curvePoints(A) {
    const st = +A.ev.start_balance || PLAN.start, mll = +A.ev.mll || PLAN.mll, lock = PLAN.lock, tgt = +A.ev.target_balance || st + PLAN.target;
    const days = [...A.days].sort((a, b) => String(a[0]).localeCompare(String(b[0])));
    let bal = st, peak = st, floor = st - mll;
    const pts = [{ day: 'start', bal, floor }];
    for (const [d, p] of days) { bal += +p || 0; peak = Math.max(peak, bal); floor = Math.min(Math.max(floor, peak - mll), lock); pts.push({ day: d, bal, floor, pnl: +p || 0 }); }
    return { pts, tgt, st, lock };
  }
  function curveSVG(C, W = 360, H = 240) {
    const pad = { l: 52, r: 10, t: 14, b: 26 }, n = Math.max(2, C.pts.length);
    const lo = Math.min(C.st - PLAN.mll - 150, ...C.pts.map((p) => Math.min(p.bal, p.floor))), hi = Math.max(C.tgt + 150, ...C.pts.map((p) => p.bal));
    const x = (i) => pad.l + (i / (n - 1)) * (W - pad.l - pad.r), y = (v) => pad.t + (1 - (v - lo) / (hi - lo)) * (H - pad.t - pad.b);
    const path = (k) => C.pts.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p[k]).toFixed(1)}`).join(' ');
    const stepF = C.pts.map((p, i) => (i ? `H${x(i).toFixed(1)}V${y(p.floor).toFixed(1)}` : `M${x(0).toFixed(1)},${y(p.floor).toFixed(1)}`)).join('');
    const last = C.pts[C.pts.length - 1], area = `${path('bal')} L${x(C.pts.length - 1).toFixed(1)},${y(lo).toFixed(1)} L${x(0).toFixed(1)},${y(lo).toFixed(1)} Z`;
    const gl = (v, cls, lab) => `<line x1="${pad.l}" x2="${W - pad.r}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}" class="${cls}"/><text x="${pad.l - 6}" y="${(y(v) + 4).toFixed(1)}" text-anchor="end" class="mo-ax">${lab}</text>`;
    return `<svg class="mo-curve" viewBox="0 0 ${W} ${H}" role="img" aria-label="Eval balance per session with the target and the trailing floor">
      <defs><linearGradient id="moCg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--accent)" stop-opacity=".35"/><stop offset="1" stop-color="var(--accent)" stop-opacity="0"/></linearGradient></defs>
      ${gl(C.tgt, 'mo-tg', '$' + kabs(C.tgt))}${gl(C.st, 'mo-st', '$' + kabs(C.st))}${gl(C.lock, 'mo-lk', '')}
      <path d="${area}" fill="url(#moCg)"/><path d="${stepF}" class="mo-fl"/><path d="${path('bal')}" class="mo-bal"/>
      ${C.pts.map((p, i) => `<circle cx="${x(i).toFixed(1)}" cy="${y(p.bal).toFixed(1)}" r="${i === C.pts.length - 1 ? 4.5 : 3}" class="mo-pt ${p.pnl > 0 ? 'up' : p.pnl < 0 ? 'dn' : ''}"/>`).join('')}
      <text x="${W - pad.r}" y="${(y(C.tgt) - 5).toFixed(1)}" text-anchor="end" class="mo-lab tg">target $${C.tgt.toLocaleString('en-US')}</text>
      <text x="${W - pad.r}" y="${(y(last.floor) + 14).toFixed(1)}" text-anchor="end" class="mo-lab fl">floor $${Math.round(last.floor).toLocaleString('en-US')}</text>
      <text x="${pad.l}" y="${H - 6}" class="mo-ax">start</text><text x="${W - pad.r}" y="${H - 6}" text-anchor="end" class="mo-ax">${C.pts.length > 1 ? 'session ' + (C.pts.length - 1) : ''}</text></svg>`;
  }
  VIEWS.curve = (el) => {
    const A = evalAccounts();
    if (!A.length) { el.innerHTML = head('Money · eval curve', 'Eval curve') + emptyBox('No eval account yet.', ' It shows once the PC bot or the cloud paper ledger reports an eval.'); return; }
    const pick = A.find((a) => a.id === store.get('more.curveAcct')) || A.find((a) => a.days.length) || A[0];
    const C = curvePoints(pick), ev = pick.ev, last = C.pts[C.pts.length - 1];
    el.innerHTML = head('Money · eval curve', 'Eval curve', 'MFFU Builder 50K: balance after each session, the $53,000 target and the trailing floor (end-of-day high − $2,000, locked at $50,100).')
      + `${A.length > 1 ? `<div style="margin-bottom:12px">${segHTML('moAcct', A.map((a) => [a.id, esc(a.name)]), pick.id, 'sm')}</div>` : ''}
      <div class="card"><div class="card-h"><h3>${icon('results')}${esc(pick.name)}</h3>${chip(esc(ev.clock_text || ev.status || ''), ev.status === 'passed' ? 'good' : ev.status === 'failed' ? 'bad' : '')}</div>
        ${curveSVG(C)}
        <div class="legend"><span><i style="background:var(--accent)"></i>balance</span><span><i style="background:var(--good)"></i>target $${C.tgt.toLocaleString('en-US')}</span><span><i style="background:var(--bad)"></i>trailing floor</span><span><i style="background:var(--muted)"></i>start / lock</span></div></div>
      <div class="mo-tiles">${statBox('Balance', usd(ev.balance ?? last.bal))}${statBox('To target', usd(ev.to_target ?? C.tgt - last.bal), 'of $3,000')}${statBox('Room to floor', usd(ev.room ?? last.bal - last.floor), ev.locked ? 'floor locked' : 'floor trails')}${statBox('Sessions', `${ev.session ?? C.pts.length - 1}/${ev.sessions ?? 10}`, 'pass within 10')}</div>
      ${C.pts.length < 3 ? `<p class="small mut">${C.pts.length - 1} session${C.pts.length === 2 ? '' : 's'} so far; the curve grows by one point after every session that trades.</p>` : ''}`;
    onSeg('moAcct', (v) => { store.set('more.curveAcct', v); render(true); });
  };

  // ============================================================================================ trade replay (Trades)
  const RPM = { rec: null, i: 0, timer: null, speed: 1, tf: '5m', id: null, tok: 0 };
  const unpackB = (b) => !b || !b.dt ? [] : b.dt.map((d, i) => ({ t: b.t0 + d * b.s, o: (b.p0 + b.o[i]) / 4, h: (b.p0 + b.h[i]) / 4, l: (b.p0 + b.l[i]) / 4, c: (b.p0 + b.c[i]) / 4 }));
  const RCACHE = new Map();
  function loadRec(id) {
    if (!RCACHE.has(id)) RCACHE.set(id, rawFetch('replays/' + encodeURIComponent(id) + '.json').then((r) => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then((rec) => { rec._b5 = unpackB(rec.b5); rec._b1 = unpackB(rec.b1); return rec; }).catch((e) => { RCACHE.delete(id); throw e; }));
    return RCACHE.get(id);
  }
  function stopPlay() { if (RPM.timer) { clearInterval(RPM.timer); RPM.timer = null; } const b = $('#moPlay'); if (b) b.innerHTML = icon('play') + '<span>Play</span>'; }
  function replayBars() {
    const r = RPM.rec; if (!r) return [];
    const all = RPM.tf === '1m' && r._b1.length ? r._b1 : r._b5, s = RPM.tf === '1m' && r._b1.length ? 60 : 300;
    const t0 = (r.sweep?.t || r.entry.t) - s * (RPM.tf === '1m' ? 20 : 18), t1 = (r.exit?.t_end || r.exit?.t || r.entry.t) + s * 6;
    const out = all.filter((b) => b.t >= t0 && b.t <= t1);
    return out.length > 8 ? out : all;
  }
  function replaySVG(bars, i, W = 360, H = 300) {
    const r = RPM.rec, seen = bars.slice(0, i + 1), cur = bars[i], d = r.d || (r.side === 'LONG' ? 1 : -1);
    const entered = cur.t >= r.entry.t, beOn = r.be && r.be.t && cur.t >= r.be.t, out = r.exit && cur.t >= (r.exit.t_end || r.exit.t);
    const stopNow = beOn ? r.entry.px + d * 1.25 : r.stop;
    const ps = [...bars.map((b) => b.h), ...bars.map((b) => b.l), r.stop, r.target, r.entry.px];
    let lo = Math.min(...ps), hi = Math.max(...ps); const padv = (hi - lo) * 0.06; lo -= padv; hi += padv;
    const pl = 6, pr = 84, pt = 10, pb = 18, n = bars.length, cw = (W - pl - pr) / n;
    const x = (k) => pl + (k + 0.5) * cw, y = (v) => pt + (1 - (v - lo) / (hi - lo)) * (H - pt - pb);
    const ie = bars.findIndex((b) => b.t >= r.entry.t);
    const candles = seen.map((b, k) => { const up = b.c >= b.o, c = up ? 'var(--good)' : 'var(--bad)', yt = y(Math.max(b.o, b.c)), yb = y(Math.min(b.o, b.c));
      return `<line x1="${x(k).toFixed(1)}" x2="${x(k).toFixed(1)}" y1="${y(b.h).toFixed(1)}" y2="${y(b.l).toFixed(1)}" stroke="${c}" stroke-width="1"/><rect x="${(x(k) - cw * 0.35).toFixed(1)}" y="${yt.toFixed(1)}" width="${Math.max(1, cw * 0.7).toFixed(1)}" height="${Math.max(1, yb - yt).toFixed(1)}" fill="${c}"${k === i ? ' class="mo-cur"' : ''}/>`; }).join('');
    const xs = entered && ie >= 0 ? x(ie) : pl, xe = W - pr;
    const ln = (v, cls, lab, show = true) => !show ? '' : `<line x1="${xs.toFixed(1)}" x2="${xe}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}" class="${cls}"/><rect x="${xe + 2}" y="${(y(v) - 8).toFixed(1)}" width="${pr - 4}" height="16" rx="4" class="${cls}-bg"/><text x="${xe + 6}" y="${(y(v) + 4).toFixed(1)}" class="mo-tl">${lab}</text>`;
    const zone = entered ? `<rect x="${xs.toFixed(1)}" width="${(xe - xs).toFixed(1)}" y="${Math.min(y(r.entry.px), y(r.target)).toFixed(1)}" height="${Math.abs(y(r.target) - y(r.entry.px)).toFixed(1)}" fill="var(--good)" opacity=".08"/>
      <rect x="${xs.toFixed(1)}" width="${(xe - xs).toFixed(1)}" y="${Math.min(y(r.entry.px), y(stopNow)).toFixed(1)}" height="${Math.abs(y(stopNow) - y(r.entry.px)).toFixed(1)}" fill="var(--bad)" opacity=".10"/>` : '';
    const sweep = r.sweep?.ext_px != null ? `<line x1="${pl}" x2="${xe}" y1="${y(r.sweep.ext_px).toFixed(1)}" y2="${y(r.sweep.ext_px).toFixed(1)}" class="mo-sw"/>` : '';
    return `<svg class="mo-rsvg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Trade replay chart">${zone}${sweep}${candles}
      ${ln(r.target, 'mo-l-tg', 'TP ' + fpt(r.target))}${ln(r.entry.px, 'mo-l-en', 'IN ' + fpt(r.entry.px), entered)}${ln(stopNow, beOn ? 'mo-l-be' : 'mo-l-sl', (beOn ? 'BE ' : 'SL ') + fpt(stopNow))}
      ${out && r.exit?.px != null ? `<circle cx="${x(Math.max(0, bars.findIndex((b) => b.t >= r.exit.t)) ).toFixed(1)}" cy="${y(r.exit.px).toFixed(1)}" r="5" class="mo-exit"/>` : ''}
      <text x="${pl}" y="${H - 4}" class="mo-ax">${et(bars[0].t).hm} ET</text><text x="${W - pr}" y="${H - 4}" text-anchor="end" class="mo-ax">${et(cur.t).hm} ET</text></svg>`;
  }
  function replayStage(bars, i) {
    const r = RPM.rec, t = bars[i].t, ev = [];
    if (r.sweep?.t && t >= r.sweep.t) ev.push(['Sweep', r.sweep.t]);
    if (r.cisd5?.t && t >= r.cisd5.t) ev.push(['5m CISD', r.cisd5.t]);
    if (t >= r.entry.t) ev.push(['Entry', r.entry.t]);
    if (r.be?.t && t >= r.be.t) ev.push(['Breakeven', r.be.t]);
    if (r.exit?.t && t >= (r.exit.t_end || r.exit.t)) ev.push([r.exit.kind || 'Exit', r.exit.t]);
    const last = ev[ev.length - 1];
    const live = t >= r.entry.t && !(r.exit && t >= (r.exit.t_end || r.exit.t)) ? (bars[i].c - r.entry.px) * (r.d || 1) / Math.max(0.25, r.risk_pts || Math.abs(r.entry.px - r.stop)) : null;
    return `<div class="mo-stage"><span>${last ? `<b>${esc(last[0])}</b> ${et(last[1]).hm} ET` : 'Waiting for the sweep'}</span>${live != null ? `<b class="${live >= 0 ? 'up' : 'dn'}">${fR(live)}</b>` : r.exit && t >= (r.exit.t_end || r.exit.t) ? `<b class="${r.r >= 0 ? 'up' : 'dn'}">${fR(r.r)} · ${susd(r.pnl)}</b>` : ''}</div>`;
  }
  function drawReplay() {
    const box = $('#moRbox'); if (!box || !RPM.rec) return;
    const bars = replayBars(); if (!bars.length) { box.innerHTML = emptyBox('No bars in this record.'); return; }
    RPM.i = Math.max(0, Math.min(RPM.i, bars.length - 1));
    box.innerHTML = replayStage(bars, RPM.i) + replaySVG(bars, RPM.i);
    const s = $('#moRs'); if (s) { s.max = String(bars.length - 1); s.value = String(RPM.i); }
    return bars;
  }
  function setPlayM(on) {
    stopPlay(); if (!on) return;
    const b = $('#moPlay'); if (b) b.innerHTML = icon('close') + '<span>Pause</span>';
    RPM.timer = setInterval(() => {
      if (!$('#moRbox')) return stopPlay();
      const n = replayBars().length; if (RPM.i >= n - 1) return stopPlay(); RPM.i++; drawReplay();
    }, Math.round(420 / RPM.speed));
  }
  VIEWS.tplay = (el) => {
    stopPlay();
    const list = ((D && D.trades) || []).filter((t) => t.chart).sort((a, b) => (b.entry_t || 0) - (a.entry_t || 0));
    if (!D) { el.innerHTML = skel(3); return; }
    if (!list.length) { el.innerHTML = head('Trades · replay', 'Trade replay') + emptyBox('No trade charts in this build.'); return; }
    const id = (ARG && list.find((t) => t.chart === ARG) ? ARG : null) || RPM.id || list[0].chart, t = list.find((x) => x.chart === id) || list[0];
    el.innerHTML = head('Trades · replay', 'Trade replay', 'Watch a past LIT trade unfold bar by bar: the sweep, the entry, breakeven and the exit.')
      + `<div class="card"><div class="mo-rsel"><select class="hb-sel" id="moRpick" aria-label="Trade">${list.map((x) => `<option value="${esc(x.chart)}" ${x.chart === t.chart ? 'selected' : ''}>${esc(fDate(x.day))} · ${esc(x.side)} · ${susd(x.pnl)} (${fR(x.r, 1)})</option>`).join('')}</select>
          ${segHTML('moTf', [['5m', '5m'], ['1m', '1m']], RPM.tf, 'sm')}</div>
        <div id="moRbox">${skLines(6)}</div>
        <input type="range" id="moRs" class="mo-range" min="0" max="1" value="0" aria-label="Bar">
        <div class="mo-ctl"><button class="btn ghost" type="button" id="moBack" aria-label="Back one bar">${icon('left')}</button><button class="btn primary" type="button" id="moPlay">${icon('play')}<span>Play</span></button>
          <button class="btn ghost" type="button" id="moFwd" aria-label="Forward one bar">${icon('right')}</button>${segHTML('moSpd', [['1', '1×'], ['2', '2×'], ['4', '4×']], String(RPM.speed), 'sm')}</div>
        <div class="legend"><span><i style="background:var(--good)"></i>target</span><span><i style="background:var(--accent)"></i>entry</span><span><i style="background:var(--bad)"></i>stop</span><span><i style="background:var(--warn)"></i>breakeven (stop to entry + 1.25)</span><span><i style="background:var(--bsl)"></i>sweep extreme</span></div></div>
      <div class="card" id="moRinfo"></div>`;
    const tok = ++RPM.tok;
    const open = (cid) => {
      stopPlay(); RPM.id = cid; RPM.rec = null; $('#moRbox').innerHTML = skLines(6);
      loadRec(cid).then((rec) => {
        if (tok !== RPM.tok || !$('#moRbox')) return;
        RPM.rec = rec; const bars = replayBars(); RPM.i = Math.max(0, bars.findIndex((b) => b.t >= (rec.sweep?.t || rec.entry.t)) - 2); drawReplay();
        const T = list.find((x) => x.chart === cid) || {};
        $('#moRinfo').innerHTML = `<div class="card-h"><h3>${esc(fDate(rec.day))} · ${esc(rec.side)} · ${rec.qty} MNQ</h3>${chip(esc(rec.exit_kind || ''), rec.r > 0 ? 'good' : rec.r < 0 ? 'bad' : '')}</div>
          <div class="kv"><div><span>Entry</span><b>${fpt(rec.entry.px)}</b></div><div><span>Stop</span><b>${fpt(rec.stop)} · ${num(rec.risk_pts, 2)} pts</b></div><div><span>Target</span><b>${fpt(rec.target)} · ${num(rec.plan_rr, 1)}R</b></div><div><span>Result</span><b class="${cls(rec.r)}">${fR(rec.r)} · ${susd(rec.pnl)}</b></div></div>
          ${T.report?.why?.length ? `<ul class="list mo-why-l">${T.report.why.slice(0, 3).map((w) => `<li>${esc(w)}</li>`).join('')}</ul>` : ''}`;
      }).catch((e) => { if ($('#moRbox')) $('#moRbox').innerHTML = failBox(e); });
    };
    open(t.chart);
    $('#moRpick').onchange = (e) => open(e.target.value);
    onSeg('moTf', (v) => { RPM.tf = v; stopPlay(); if (!RPM.rec) return; const bars = replayBars(); RPM.i = Math.max(0, bars.findIndex((b) => b.t >= (RPM.rec.sweep?.t || RPM.rec.entry.t)) - 2); drawReplay(); });
    onSeg('moSpd', (v) => { RPM.speed = +v; if (RPM.timer) setPlayM(true); });
    $('#moPlay').onclick = () => { if (RPM.timer) return stopPlay(); if (!RPM.rec) return; if (RPM.i >= replayBars().length - 1) RPM.i = 0; setPlayM(true); };
    $('#moBack').onclick = () => { stopPlay(); RPM.i--; drawReplay(); };
    $('#moFwd').onclick = () => { stopPlay(); RPM.i++; drawReplay(); };
    $('#moRs').oninput = (e) => { stopPlay(); RPM.i = +e.target.value; drawReplay(); };
  };
  addEventListener('hashchange', () => { if (!/^#\/tplay/.test(location.hash)) stopPlay(); });

  // ============================================================================================ share card (Money)
  function monthSources() {
    const out = [];
    for (const a of evalAccounts()) {
      const by = {};
      for (const [d, p] of a.days) { const m = String(d).slice(0, 7); (by[m] = by[m] || { net: 0, days: [], trades: 0 }); by[m].net += +p || 0; by[m].days.push([d, +p || 0]); }
      const tr = ((MD()?.accounts) || []).find((x) => x.id === a.id)?.trades || [];
      for (const t of tr) { const m = String(t.day || '').slice(0, 7); if (by[m]) { by[m].trades++; by[m].wins = (by[m].wins || 0) + ((+t.pnl || 0) > 0 ? 1 : 0); } }
      for (const [m, v] of Object.entries(by)) out.push({ key: `${a.id}:${m}`, label: `${fDate(m)} · ${a.name}`, kind: a.src === 'pc' ? 'Live eval (PC bot)' : 'Paper (cloud)', month: m, ...v });
    }
    const R = MD()?.results, months = R?.months || {}, dd = R?.days || [];
    Object.keys(months).sort().reverse().slice(0, 12).forEach((m) => {
      const v = months[m]; out.push({ key: `bt:${m}`, label: `${fDate(m)} · backtest`, kind: 'Backtest (live-settings replay)', month: m, net: +v.net || 0, trades: v.trades || 0, wins: v.wins || 0,
        days: dd.filter((d) => String(d[0]).startsWith(m)).map((d) => [d[0], +d[1] || 0]) });
    });
    return out;
  }
  function drawShare(cv, S) {
    const W = 1080, H = 1350, g = cv.getContext('2d'); cv.width = W; cv.height = H;
    const css = getComputedStyle(document.documentElement), col = (k, d) => (css.getPropertyValue(k) || '').trim() || d;
    const acc = col('--accent', '#6d7cff'), good = '#2ee59d', bad = '#ff5a7a';
    const bg = g.createLinearGradient(0, 0, W, H); bg.addColorStop(0, '#0b0e18'); bg.addColorStop(1, '#151a2b'); g.fillStyle = bg; g.fillRect(0, 0, W, H);
    const glow = g.createRadialGradient(W * 0.8, H * 0.15, 20, W * 0.8, H * 0.15, 700); glow.addColorStop(0, acc + '55'); glow.addColorStop(1, 'transparent'); g.fillStyle = glow; g.fillRect(0, 0, W, H);
    const F = (w, s) => `${w} ${s}px Inter, system-ui, -apple-system, Segoe UI, sans-serif`;
    g.fillStyle = '#a9b1c3'; g.font = F(600, 34); g.fillText('LIQUIDITY · LIT on NQ', 80, 120);
    g.fillStyle = '#eef1f8'; g.font = F(800, 76); g.fillText(fDate(S.month), 80, 220);
    g.fillStyle = '#6f788b'; g.font = F(600, 32); g.fillText(S.kind, 80, 275);
    g.fillStyle = S.net >= 0 ? good : bad; g.font = F(800, 168); g.fillText(susd(S.net), 76, 470);
    const wr = S.trades ? Math.round(100 * (S.wins || 0) / S.trades) : null;
    const stats = [['Trades', S.trades ? String(S.trades) : '—'], ['Win rate', wr != null ? wr + '%' : '—'], ['Days', String(S.days.length)]];
    stats.forEach(([k, v], i) => { const x = 80 + i * 320; g.fillStyle = '#6f788b'; g.font = F(600, 30); g.fillText(k.toUpperCase(), x, 570); g.fillStyle = '#eef1f8'; g.font = F(750, 64); g.fillText(v, x, 645); });
    // daily P&L bars + the running total
    const top = 730, bot = 1130, l = 80, r = W - 80, ds = [...S.days].sort((a, b) => String(a[0]).localeCompare(String(b[0])));
    g.strokeStyle = 'rgba(160,170,220,.18)'; g.lineWidth = 2; g.strokeRect(l - 20, top - 30, r - l + 40, bot - top + 60);
    if (ds.length) {
      let cum = 0; const cums = ds.map((d) => (cum += d[1]));
      const mx = Math.max(1, ...ds.map((d) => Math.abs(d[1])), ...cums.map(Math.abs)), mid = (top + bot) / 2, k = (bot - top) / 2 / mx, bw = Math.min(110, (r - l) / ds.length);
      g.strokeStyle = 'rgba(160,170,220,.25)'; g.beginPath(); g.moveTo(l, mid); g.lineTo(r, mid); g.stroke();
      ds.forEach((d, i) => { g.fillStyle = d[1] >= 0 ? good : bad; const h = d[1] * k; g.fillRect(l + i * bw + bw * 0.18, h >= 0 ? mid - h : mid, Math.max(3, bw * 0.64), Math.max(2, Math.abs(h))); });
      g.strokeStyle = acc; g.lineWidth = 6; g.lineJoin = 'round'; g.beginPath(); cums.forEach((c, i) => { const x = l + (i + 0.5) * bw, y = mid - c * k; i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.stroke();
    } else { g.fillStyle = '#6f788b'; g.font = F(600, 34); g.fillText('No trading days in this month yet', l, (top + bot) / 2); }
    g.fillStyle = '#6f788b'; g.font = F(600, 28); g.fillText('Daily P&L and the running total', l, bot + 70);
    g.fillStyle = '#a9b1c3'; g.font = F(600, 28); g.fillText(S.kind.startsWith('Backtest') ? 'Backtest result, costs included. Not a live track record.' : 'Paper / eval monitor, read-only. MNQ micros.', 80, H - 80);
  }
  VIEWS.share = (el) => {
    const L = monthSources();
    if (!L.length) { el.innerHTML = head('Money · share card', 'Share card') + emptyBox('No month to share yet.'); return; }
    const cur = L.find((x) => x.key === store.get('more.shareKey')) || L.find((x) => x.days.length) || L[0];
    el.innerHTML = head('Money · share card', 'Share card', 'The month as one picture: save it to Photos or send it from the share sheet.')
      + `<div class="card"><div class="mo-rsel"><select class="hb-sel" id="moShPick" aria-label="Month">${L.map((x) => `<option value="${esc(x.key)}" ${x.key === cur.key ? 'selected' : ''}>${esc(x.label)} · ${susd(x.net)}</option>`).join('')}</select></div>
        <canvas id="moShCv" class="mo-shcv" width="1080" height="1350" aria-label="Share card preview"></canvas>
        <div class="row-btns"><button class="btn primary" type="button" id="moShGo">${icon('share')}Share</button><a class="btn ghost" id="moShDl" download="liquidity-${esc(cur.month)}.png" href="#">${icon('down')}Save PNG</a></div>
        <div class="note">iPhone: <b>Share</b> → <b>Save Image</b> puts it in Photos. The card says where the number comes from (live eval, paper or backtest).</div></div>`;
    const cv = $('#moShCv'); drawShare(cv, cur);
    const dl = $('#moShDl'); try { dl.href = cv.toDataURL('image/png'); } catch { }
    $('#moShPick').onchange = (e) => { store.set('more.shareKey', e.target.value); render(true); };
    $('#moShGo').onclick = () => cv.toBlob(async (blob) => {
      if (!blob) return toast('Could not draw the card');
      const file = new File([blob], `liquidity-${cur.month}.png`, { type: 'image/png' });
      try {
        if (navigator.canShare && navigator.canShare({ files: [file] })) await navigator.share({ files: [file], title: `Liquidity · ${fDate(cur.month)}` });
        else { dl.click(); toast('Saved as a PNG'); }
      } catch (e) { if (e && e.name !== 'AbortError') toast(e.message || String(e)); }
    }, 'image/png');
  };

  // ============================================================================================ pages + hooks
  const ADD = { today: [['radar', 'Levels radar', 'radar', 'Nearest LIT levels above / below price, the next killzone', 2]],
    trades: [['tplay', 'Trade replay', 'replay', 'A past trade bar by bar: play, pause, step', 2]],
    money: [['curve', 'Eval curve', 'results', 'Balance per session, the $53,000 target, the trailing floor', 1], ['share', 'Share card', 'share', 'The month as a PNG for the share sheet', 2]] };
  function install() {
    for (const [gid, list] of Object.entries(ADD)) {
      const G = GROUPS.find((g) => g.id === gid) || GROUPS[GROUPS.length - 1]; if (!G) continue;
      for (const [id, label, ic, desc, at] of list) {
        if (G.pages.some((p) => p[0] === id)) continue;
        G.pages.splice(Math.min(at, G.pages.length), 0, [id, label, ic, desc]);
        PAGES[id] = { id, label, icon: ic, desc, group: G.id };
      }
    }
    Object.assign(SCENE, { radar: 'chart', tplay: 'trades', curve: 'eval', share: 'eval' });
    const ali = { nearest: 'radar', distances: 'radar', killzone: 'radar', play: 'tplay', animate: 'tplay', equity: 'curve', evalcurve: 'curve', floor: 'curve', sharecard: 'share', png: 'share' };
    for (const [k, v] of Object.entries(ali)) if (!PAGES[k] && !ALIAS[k]) ALIAS[k] = v;
    // Home: install guide on top, why-no-trade + radar before the quick links
    const home = VIEWS.today;
    VIEWS.today = (el) => {
      home(el);
      const ins = installCard();
      if (ins) { el.insertAdjacentHTML('afterbegin', ins); wireInstall(el); }
      const why = whyCard(), rad = radarCard();
      if (why || rad) {
        const box = document.createElement('div'); box.className = 'grid g2 astart mo-home'; box.innerHTML = why + rad;
        const at = el.querySelector('.hb-links') || el.querySelector('.hb-foot'); at ? el.insertBefore(box, at) : el.appendChild(box);
      }
    };
    const set = VIEWS.settings;
    VIEWS.settings = (el) => {
      set(el);
      const box = document.createElement('div'); box.className = 'grid g2 astart'; box.innerHTML = lookCard() + notifyCard();
      el.insertBefore(box, el.children[1] || null); wireLook(box); wireNotify(box);
    };
    const al = VIEWS.alerts;
    if (al) VIEWS.alerts = (el) => { al(el); const box = document.createElement('div'); box.innerHTML = notifyCard(); el.appendChild(box.firstElementChild); wireNotify(el); };
    // every page: the updated line + stale / offline banners
    const r0 = window.render;
    if (typeof r0 === 'function') window.render = function (soft) { const out = r0.apply(this, arguments); try { strip(); } catch (e) { console.error(e); } return out; };
    const st = document.createElement('style'); st.id = 'more-css'; st.textContent = CSS; document.head.appendChild(st);
    lookM(); savePrefs(prefs());
    nav(); route();
  }

  const CSS = `
#page{zoom:var(--mo-zoom,1)}
.mo-strip{display:flex;flex-direction:column;gap:8px;margin:0 0 12px}
.mo-upd{all:unset;box-sizing:border-box;cursor:pointer;display:flex;align-items:center;gap:8px;font-size:12px;color:var(--muted);padding:2px 2px}
.mo-upd .ico{width:14px;height:14px}.mo-upd b{color:var(--ink-2);font-weight:650}.mo-upd em{margin-left:auto;font-style:normal;font-size:11px;opacity:.8}
.mo-ban{display:flex;gap:10px;align-items:flex-start;padding:11px 14px;border-radius:14px;border:1px solid var(--line);font-size:13px;line-height:1.45}
.mo-ban b{display:block;font-size:14px}.mo-ban em{display:block;font-style:normal;color:var(--ink-2);font-size:12.5px;margin-top:2px}.mo-ban .ico{flex:none;margin-top:2px}
.mo-ban.warn{border-color:color-mix(in srgb,var(--warn) 50%,transparent);background:color-mix(in srgb,var(--warn) 10%,transparent)}.mo-ban.warn .ico,.mo-ban.warn b{color:var(--warn)}
.mo-ban.bad{border-color:color-mix(in srgb,var(--bad) 55%,transparent);background:color-mix(in srgb,var(--bad) 12%,transparent)}.mo-ban.bad .ico,.mo-ban.bad b{color:var(--bad)}
.mo-ban.off{border-color:color-mix(in srgb,var(--accent) 55%,transparent);background:color-mix(in srgb,var(--accent) 12%,transparent)}.mo-ban.off .ico{color:var(--accent)}
.mo-h4{font:650 11px var(--sans);letter-spacing:.08em;text-transform:uppercase;color:var(--muted);margin:14px 0 6px}
.mo-p{margin:0 0 6px;color:var(--ink-2);font-size:13.5px;line-height:1.5}
.mo-inst{border-color:color-mix(in srgb,var(--accent) 45%,transparent)}.mo-inst .chipbtn{width:34px;padding:0}
.mo-az{display:inline-flex;align-items:center;gap:8px}.mo-az b{font:650 13px var(--mono);min-width:44px;text-align:center}.mo-az .btn{min-width:46px;padding:0 10px;font-size:15px}
.mo-near{display:grid;grid-template-columns:1fr auto 1fr;gap:10px;align-items:center;margin-bottom:10px}.mo-near>div{display:flex;flex-direction:column;gap:2px;min-width:0}
.mo-near span{font:600 10.5px var(--sans);letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}.mo-near b{font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.mo-near em{font-style:normal;font:600 12.5px var(--mono)}
.mo-near .h em{color:var(--bsl)}.mo-near .l{text-align:right}.mo-near .l em{color:var(--ssl)}.mo-near .px{text-align:center;padding:6px 10px;border-radius:12px;background:var(--surface-2)}.mo-near .px b{font:700 15px var(--mono)}
.mo-rcard{display:block;color:inherit;text-decoration:none}
.mo-kz{display:flex;flex-direction:column;gap:4px;font-size:13px;color:var(--ink-2)}.mo-kz b{font-family:var(--mono);color:var(--ink)}.mo-kz .mo-on{color:var(--good-ink)}
.mo-rwrap{display:flex;justify-content:center;margin:10px 0 4px}.mo-radar{width:100%;max-width:360px;height:auto}
.mo-ring{fill:none;stroke:var(--line);stroke-width:1.2}.mo-rl{font:600 10px var(--mono);fill:var(--muted)}.mo-rt{font:600 10.5px var(--sans);fill:var(--ink-2)}.mo-rp{font:700 12px var(--mono);fill:var(--ink)}
.mo-sweep{transform-origin:180px 170px;animation:moSpin 6s linear infinite}@keyframes moSpin{to{transform:rotate(360deg)}}
.mo-ping{animation:moPing 1.8s ease-in-out infinite}@keyframes moPing{50%{opacity:.45}}
.mo-lvs{display:flex;flex-direction:column}.mo-lv{display:grid;grid-template-columns:1fr auto 92px;gap:10px;padding:8px 0 8px 10px;border-bottom:1px solid var(--line);border-left:3px solid var(--ssl);font-size:13px}
.mo-lv.h{border-left-color:var(--bsl)}.mo-lv b{font-family:var(--mono)}.mo-lv em{font-style:normal;font:600 12px var(--mono);text-align:right}
.mo-state{margin:0 0 10px;font-size:14px;font-weight:600}
.mo-rs{display:flex;gap:8px;align-items:flex-start;font-size:13px;line-height:1.45;color:var(--ink-2);padding:4px 0}.mo-rs .ico{flex:none;width:15px;height:15px;margin-top:2px}.mo-rs.bad .ico{color:var(--bad)}.mo-rs.warn .ico{color:var(--warn)}.mo-rs.clock .ico,.mo-rs.info .ico{color:var(--accent)}
.mo-rj{display:grid;grid-template-columns:44px 1fr auto;gap:8px;align-items:center;padding:7px 0;border-bottom:1px solid var(--line);font-size:12.5px;line-height:1.4}.mo-rj:last-of-type{border-bottom:0}.mo-rj b{font-family:var(--mono);font-size:12px;color:var(--muted)}
.mo-why .row-btns{margin-top:10px}.mo-why .chipbtn{width:auto;padding:0 12px}.mo-why .chipbtn span{display:inline}.mo-why.ok{border-color:color-mix(in srgb,var(--good) 40%,transparent)}
.mo-curve{display:block;width:100%;height:auto}.mo-bal{fill:none;stroke:var(--accent);stroke-width:2.6;stroke-linejoin:round}.mo-fl{fill:none;stroke:var(--bad);stroke-width:2;stroke-dasharray:5 4}
.mo-tg{stroke:var(--good);stroke-width:1.6;stroke-dasharray:6 4}.mo-st{stroke:var(--muted);stroke-width:1}.mo-lk{stroke:var(--muted);stroke-width:1;stroke-dasharray:2 4}
.mo-ax{font:600 10px var(--mono);fill:var(--muted)}.mo-lab{font:650 10.5px var(--sans)}.mo-lab.tg{fill:var(--good)}.mo-lab.fl{fill:var(--bad)}
.mo-pt{fill:var(--accent);stroke:var(--page);stroke-width:1.5}.mo-pt.up{fill:var(--good)}.mo-pt.dn{fill:var(--bad)}
.mo-rsel{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:10px}.mo-rsel .hb-sel{flex:1 1 200px;min-width:0}
.mo-rsvg{display:block;width:100%;height:auto;border-radius:12px;background:rgba(7,8,12,.35)}
.mo-l-tg{stroke:var(--good);stroke-width:1.5;stroke-dasharray:6 4}.mo-l-en{stroke:var(--accent);stroke-width:1.5}.mo-l-sl{stroke:var(--bad);stroke-width:1.5;stroke-dasharray:6 4}.mo-l-be{stroke:var(--warn);stroke-width:1.6;stroke-dasharray:3 3}
.mo-l-tg-bg{fill:color-mix(in srgb,var(--good) 30%,#0b0e14)}.mo-l-en-bg{fill:color-mix(in srgb,var(--accent) 35%,#0b0e14)}.mo-l-sl-bg{fill:color-mix(in srgb,var(--bad) 35%,#0b0e14)}.mo-l-be-bg{fill:color-mix(in srgb,var(--warn) 35%,#0b0e14)}
.mo-tl{font:650 9px var(--mono);fill:#fff}.mo-sw{stroke:var(--bsl);stroke-width:1;stroke-dasharray:2 3;opacity:.8}.mo-exit{fill:none;stroke:#fff;stroke-width:2}
.mo-cur{filter:drop-shadow(0 0 4px rgba(255,255,255,.6))}
.mo-stage{display:flex;justify-content:space-between;gap:10px;align-items:baseline;margin:0 0 8px;font-size:13.5px}.mo-stage b{font-family:var(--mono)}
.mo-range{width:100%;margin:10px 0 6px;accent-color:var(--accent)}
.mo-ctl{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:10px}.mo-ctl .btn.ghost{min-width:44px;padding:0 10px}.mo-ctl .seg{margin-left:auto}
.mo-why-l{margin-top:10px}.mo-tiles{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-bottom:12px}@media (max-width:760px){.mo-tiles{grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}}
.mo-shcv{display:block;width:100%;max-width:420px;height:auto;margin:0 auto 12px;border-radius:16px;border:1px solid var(--line)}
html[data-contrast="high"]{--ink:#fff;--ink-2:#e6e9f2;--muted:#c3c9d6;--line:rgba(230,235,255,.38);--surface:#05060a;--surface-2:#0d1018;--surface-3:#1a1f2c;--good-ink:#6dffbf;--good:#3dffaa;--bad:#ff7a93;--warn:#ffcc66}
html[data-contrast="high"] .card,html[data-contrast="high"] .hb-tile,html[data-contrast="high"] .stat,html[data-contrast="high"] .hb-sc,html[data-contrast="high"] .hb-jr{background:#05060a!important;border-color:rgba(230,235,255,.4)!important;box-shadow:none!important;backdrop-filter:none!important}
html[data-contrast="high"] canvas.fx-bg,html[data-contrast="high"] #fxField,html[data-contrast="high"] .fx-aura{opacity:0!important}
html[data-contrast="high"][data-theme="light"]{--ink:#000;--ink-2:#1b2030;--muted:#3a4152;--line:rgba(0,0,0,.4);--surface:#fff;--surface-2:#f2f4f8;--surface-3:#e3e7ef}
html[data-contrast="high"][data-theme="light"] .card,html[data-contrast="high"][data-theme="light"] .hb-tile,html[data-contrast="high"][data-theme="light"] .stat{background:#fff!important;border-color:rgba(0,0,0,.45)!important}
@media (max-width:760px){.mo-rj{grid-template-columns:40px 1fr}.mo-rj .chip{grid-column:2;justify-self:start}.mo-lv{grid-template-columns:1fr auto 84px}}
`;

  install();
})();

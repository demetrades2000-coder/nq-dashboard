// Alerts plus (engine/alerts_plus.py; loaded by index.html with one <script defer> after more.js; read-only, paper only):
//   #/ack          the open critical alerts (Surface offline, FEED STALE, position mismatch, kill switch, eval near the floor,
//                  clock drift, update failed) with one big "Got it" each. A tap posts {"le":"ack","id"} to the free ntfy relay
//                  (tools/web_public/push_relay.json); the PC's ops task and the cloud monitor read it and stop the 10-minute
//                  repeats. The list comes from the relay's {"le":"crit"} messages (each sender posts its open alerts).
//   Settings       "Alert levels": on / silent / off for each new kind (setup armed / expired, the critical ones, stale cloud,
//                  rules differ). Posted to the relay as {"le":"prefs"} (again on each open when older than 6 h: the relay
//                  forgets after ~12 h); the senders apply them (off = not pushed, silent = no sound).
//   every page     a banner when the cloud monitor has not published for 45+ min in market hours while the PC's live feed
//                  keeps the page fresh (more.js shows its own "data is old" banner when the live feed is off too), and a red
//                  "N alerts need Got it" banner while a critical alert is open.
// Classic script that uses the main page's helpers (VIEWS, DETAIL, SCENE, store, esc, icon, chip, head, toast, D, render).
(function () {
  'use strict';
  if (typeof GROUPS === 'undefined' || typeof VIEWS === 'undefined') return;
  const KINDS = [['armed', 'Setup armed / expired', 'LIT limit armed, 1m-CISD wait, expired without a fill', false],
    ['pc_offline', 'Surface offline', 'no heartbeat from the PC in the session', true],
    ['feed_stale', 'FEED STALE', 'NinjaTrader bars missing: new entries blocked', true],
    ['unprotected', 'Position mismatch', 'NinjaTrader vs the bot, reconcile flatten', true],
    ['kill', 'Kill switch fired', 'the bot flattened and stopped', true],
    ['eval_floor', 'Eval near the floor', 'less than $400 to the trailing max-loss floor', true],
    ['clock', 'Clock drift', 'PC clock off: entries blocked', true],
    ['update', 'Update failed', 'bot auto-update failed or rolled back', true],
    ['cloud_stale', 'Cloud monitor stale', 'no cloud publish for 45+ min in market hours', false],
    ['rules', 'Rules differ', 'PC and cloud run different LIT rules', false],
    ['second', 'ATLAS (PAPER)', 'ATLAS (EMA / MACD / S/R) paper entries and exits next to LIT (never traded)', false],
    ['freeze', 'Feed frozen in a trade', 'a position is open and the NinjaTrader 1m bars stopped', true],
    ['anomaly', 'Anomaly', 'price spike / bad tick, an entry routed 30+ s after its signal', false],
    ['drift', 'Drift', 'LIT / account B below the backtest range, execution drift', false],
    ['loss_cap', 'Both accounts loss', 'LIT + account B at the combined daily / weekly cap', false],
    ['rules_change', 'Rules changed', 'the trading rules the PC bot runs changed', false]];
  const LV = [['on', 'On'], ['silent', 'Silent'], ['off', 'Off']];
  const STALE_S = 45 * 60;
  const nowS = () => Date.now() / 1000;
  const A = { msgs: null, at: 0, busy: null };

  // ---- relay (ntfy.sh): read the last 12 h, post ack / prefs
  async function relayInfo() {
    if (typeof pushRelay === 'function') { try { const r = await pushRelay(); if (r && r.topic) return r; } catch (e) { } }
    try { const r = await fetch('push_relay.json?t=' + Date.now()); return r.ok ? await r.json() : null; } catch (e) { return null; }
  }
  const base = (r) => `${String(r.ntfy || 'https://ntfy.sh').replace(/\/$/, '')}/${encodeURIComponent(r.topic)}`;
  async function post(obj) {
    const r = await relayInfo(); if (!r || !r.topic) throw new Error('no relay');
    const res = await fetch(base(r), { method: 'POST', body: JSON.stringify(obj) });
    if (!res.ok) throw new Error('relay HTTP ' + res.status);
  }
  function readRelay(force) {
    if (!force && A.msgs && Date.now() - A.at < 60e3) return Promise.resolve(A.msgs);
    if (A.busy) return A.busy;
    A.busy = (async () => {
      const r = await relayInfo(); if (!r || !r.topic) return (A.msgs = []);
      const txt = await (await fetch(`${base(r)}/json?poll=1&since=12h`)).text();
      const out = [];
      for (const ln of txt.split('\n')) {
        try { const m = JSON.parse(ln); if (m.event && m.event !== 'message') continue; const b = JSON.parse(m.message || ''); if (b && ['crit', 'ack'].includes(b.le)) { b._t = m.time || 0; out.push(b); } } catch (e) { }
      }
      A.at = Date.now(); return (A.msgs = out);
    })().catch(() => A.msgs || []).finally(() => { A.busy = null; });
    return A.busy;
  }
  const localAcks = () => store.get('plus.acked', {}) || {};
  // open alerts: the newest "crit" message of each sender, minus ids acked (here or on another phone) after they began
  function openAlerts(msgs) {
    const last = {}, acks = { ...localAcks() };
    for (const m of msgs || []) {
      if (m.le === 'crit' && (!last[m.src] || m._t >= last[m.src]._t)) last[m.src] = m;
      if (m.le === 'ack' && m.id) acks[m.id] = Math.max(acks[m.id] || 0, m._t || m.t || 0);
    }
    const out = [];
    for (const [src, m] of Object.entries(last)) for (const a of m.open || []) if (!(acks[a.id] >= (a.first || 0) - 60)) out.push({ ...a, src });
    return out.sort((a, b) => (a.first || 0) - (b.first || 0));
  }
  async function ack(id) {
    const L = localAcks(); L[id] = Math.round(nowS()); store.set('plus.acked', Object.fromEntries(Object.entries(L).filter(([, t]) => nowS() - t < 86400)));
    await post({ le: 'ack', id, t: Math.round(nowS()) });
  }

  // ---- #/ack
  DETAIL.ack = { group: 'system', label: 'Alerts to acknowledge', back: 'alerts' };
  SCENE.ack = 'engine';
  const hmT = (t) => t ? new Date(t * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
  function rowHTML(a, hl) {
    return `<div class="card ap-alert${a.id === hl ? ' hl' : ''}"><div class="card-h"><h3>${icon('alerts')}${esc(a.title || a.kind)}</h3>${chip(esc(a.src === 'cloud' ? 'cloud' : 'PC'), 'bad')}</div>
      <div class="note" style="margin-top:0">${esc(a.body || '')}</div>
      <div class="small mut">Since ${hmT(a.first)} · sent ${a.n || 1} of 6 · repeats every 10 min until you tap Got it or it clears</div>
      <div class="row-btns"><button class="btn ap-got" type="button" data-ack="${esc(a.id)}">${icon('check')}Got it</button></div></div>`;
  }
  VIEWS.ack = (el) => {
    const hl = typeof ARG === 'string' ? ARG : '';
    el.innerHTML = head('System · alerts', 'Alerts to acknowledge', 'A critical alert repeats every 10 minutes (at most 6 times) until you tap <b>Got it</b> here, or until the problem clears by itself.')
      + `<div id="apList">${typeof skLines === 'function' ? skLines(3) : ''}</div>`;
    const draw = (msgs) => {
      const box = el.querySelector('#apList'); if (!box) return;
      const L = openAlerts(msgs);
      if (hl && !L.some((a) => a.id === hl) && !(localAcks()[hl])) L.unshift({ id: hl, kind: hl.split(':')[0], title: 'Critical alert', body: 'The alert from the notification you tapped.', src: '', n: 1 });
      box.innerHTML = L.length ? L.map((a) => rowHTML(a, hl)).join('') : emptyBox('Nothing to acknowledge.', ' No critical alert is open on the PC or the cloud.');
      box.querySelectorAll('[data-ack]').forEach((b) => { b.onclick = async () => {
        b.disabled = true;
        try { await ack(b.dataset.ack); toast('Got it: the repeats stop on the next check (PC ~5 min, cloud next run)', 4200); A.at = 0; draw(A.msgs); banner(); }
        catch (e) { b.disabled = false; toast('Could not reach the relay (offline?). Tap again.', 4200); }
      }; });
    };
    draw(A.msgs || []);
    readRelay(true).then(draw);
  };

  // ---- Settings: alert levels
  const levels = () => store.get('plus.levels', {}) || {};
  async function pushLevels(force) {
    const P = levels(), last = +store.get('plus.levels_posted', 0) || 0;
    if (!force && (!Object.keys(P).length || Date.now() - last < 6 * 3600e3)) return;
    try { await post({ le: 'prefs', prefs: P, t: Math.round(nowS()) }); store.set('plus.levels_posted', Date.now()); } catch (e) { if (force) throw e; }
  }
  function levelsCard() {
    const P = levels();
    return `<div class="card" id="apLevels"><div class="card-h"><h3>${icon('alerts')}Alert levels</h3></div>
      <div class="note" style="margin-top:0"><b>On</b> rings, <b>Silent</b> arrives without sound (critical ones then do not repeat), <b>Off</b> is not pushed (it still shows in the app). Critical alerts repeat every 10 min until you tap <b>Got it</b> (<a href="#/ack">open alerts</a>). Sent to the PC and the cloud through the relay.</div>
      ${KINDS.map(([k, l, d, c]) => `<div class="row"><span><b>${esc(l)}${c ? ' · critical' : ''}</b><span class="small mut">${esc(d)}</span></span>
        <span class="ap-seg">${LV.map(([v, t]) => `<button type="button" class="chipbtn${(P[k] || 'on') === v ? ' on' : ''}" data-lk="${k}" data-lv="${v}"><span>${t}</span></button>`).join('')}</span></div>`).join('')}</div>`;
  }
  function wireLevels(root) {
    root.querySelectorAll('[data-lk]').forEach((b) => { b.onclick = async () => {
      const P = levels(); P[b.dataset.lk] = b.dataset.lv; store.set('plus.levels', P);
      root.querySelectorAll(`[data-lk="${b.dataset.lk}"]`).forEach((x) => x.classList.toggle('on', x === b));
      try { await pushLevels(true); toast(`${KINDS.find((k) => k[0] === b.dataset.lk)[1]}: ${b.dataset.lv}`); } catch (e) { toast('Saved here; the relay is unreachable, it is sent on the next open', 4200); }
    }; });
  }
  for (const v of ['settings', 'alerts']) {
    const f = VIEWS[v]; if (typeof f !== 'function') continue;
    VIEWS[v] = (el) => { f(el); const box = document.createElement('div'); box.innerHTML = levelsCard(); const c = box.firstElementChild; el.appendChild(c); wireLevels(c); };
  }

  // ---- banners: open critical alerts, a stale cloud while the PC live feed keeps the page fresh
  function etParts(ts) {
    const f = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date(ts * 1000));
    const g = (t) => (f.find((x) => x.type === t) || {}).value;
    return { wd: g('weekday'), m: (+g('hour') % 24) * 60 + +g('minute') };
  }
  function cloudStale() {
    const b = typeof D !== 'undefined' && D && D.built ? Date.parse(D.built) / 1000 : NaN;
    if (!Number.isFinite(b)) return null;
    const e = etParts(nowS()), age = nowS() - b;
    const win = !['Sat', 'Sun'].includes(e.wd) && e.m >= 135 && e.m <= 990;
    const la = window.LIVE && window.LIVE.age ? window.LIVE.age() : null;
    return win && age >= STALE_S && la != null && la < 600 ? Math.round(age / 60) : null;
  }
  function banner() {
    const pg = document.getElementById('page'); if (!pg) return;
    let s = document.getElementById('apBan');
    const L = openAlerts(A.msgs || []), cs = cloudStale();
    let h = '';
    if (L.length && PAGE !== 'ack') h += `<a class="mo-ban bad ap-ban" href="#/ack/${encodeURIComponent(L[0].id)}" role="alert">${icon('alerts')}<span><b>${L.length === 1 ? esc(L[0].title) : L.length + ' critical alerts'} · tap Got it</b><em>It repeats every 10 min until you acknowledge it or it clears.</em></span></a>`;
    if (cs != null) h += `<div class="mo-ban warn" role="status">${icon('clock')}<span><b>Cloud monitor: no publish for ${cs} min</b><em>The PC live feed is fine, but the cloud paper bot and the Surface-offline alarm are blind. GitHub → Actions → cloud-monitor → Run workflow.</em></span></div>`;
    if (!h) { if (s) s.remove(); return; }
    if (!s) { s = document.createElement('div'); s.id = 'apBan'; s.className = 'mo-strip'; }
    const strip = document.getElementById('moStrip');
    const at = strip && strip.parentNode === pg ? strip.nextSibling : pg.firstChild;
    if (s.parentNode !== pg) pg.insertBefore(s, at);
    if (s.innerHTML !== h) s.innerHTML = h;
  }
  const r0 = window.render;
  if (typeof r0 === 'function') window.render = function () { const out = r0.apply(this, arguments); try { banner(); } catch (e) { console.error(e); } return out; };
  const tick = () => readRelay(false).then(banner).catch(() => null);
  setInterval(tick, 90e3);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) tick(); });
  if (navigator.serviceWorker) navigator.serviceWorker.addEventListener('message', (e) => { if (e.data && e.data.type === 'push' && e.data.d && e.data.d.ack) { A.at = 0; tick(); } });
  const st = document.createElement('style'); st.id = 'ap-css';
  st.textContent = `.ap-seg{display:inline-flex;gap:4px;flex-wrap:wrap;justify-content:flex-end}.ap-seg .chipbtn{width:auto;padding:0 10px}.ap-seg .chipbtn span{display:inline}
.ap-seg .chipbtn.on{background:var(--accent);color:#fff;border-color:transparent}.ap-alert{border-color:color-mix(in srgb,var(--bad) 55%,transparent)}.ap-alert.hl{box-shadow:0 0 0 2px var(--bad)}
.ap-got{min-height:48px;min-width:160px;font-size:16px}.ap-ban{color:inherit;text-decoration:none}`;
  document.head.appendChild(st);
  tick();
  pushLevels(false);
  if (typeof route === 'function' && /^#\/ack/.test(location.hash)) route();
})();

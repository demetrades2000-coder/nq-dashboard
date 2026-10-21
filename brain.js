// Bot Brain (phone; loaded by index.html with one <script defer>; read-only): what the LIT bot is thinking right now.
// Data: the PC bot's Brain (engine/brain.compact) in live.pc.brain (live.json every ~60 s via live.js, and data.json from the
// heartbeat), else the cloud paper bot's own Brain (live.brain in data.json). Explainers: data.json brain_help.
// Tabs: Now (stage + what it waits for + pipeline + trade + sizing), Levels, Setups (each rule ✓ / ✗ with the numbers), Log.
// Classic script that uses the main page's helpers (D, VIEWS, GROUPS, PAGES, P, icon, head, esc, num, cls, segHTML, onSeg).
(function () {
  'use strict';
  if (typeof GROUPS === 'undefined' || typeof VIEWS === 'undefined') return;
  const S = { tab: 'now' };
  const FRESH_S = 20 * 60;
  const p2 = (x) => (x == null ? '—' : num(x, 2));
  const sg = (x, d = 1) => (x == null ? '—' : (x > 0 ? '+' : '') + num(x, d));
  const okI = (b) => `<span class="bz-ok ${b ? 'y' : 'n'}">${b ? '✓' : '✗'}</span>`;
  const info = (k) => `<button type="button" class="bz-i" data-help="${esc(k)}" aria-label="What is this?">i</button>`;
  const STAT = { armed: ['Limit armed', 'warn'], tapped: ['Tapped · waiting 1m CISD', 'warn'], entering: ['Entering now', 'up'], filled: ['Filled', 'up'],
    no_fill: ['No fill', 'mut'], rejected: ['Rejected', 'dn'], blocked: ['Blocked', 'mut'] };
  const LAB = { day: '1 trade a day', window: 'Entry window', depth: 'Sweep depth ≥ 0.5 ATR', idm: 'Inducement first', disp: 'Displacement ≥ 0.8 ATR',
    monday: 'Monday rule', stop: 'Stop 8-80 pts', target: 'Target ≥ 1.5R' };
  const STG = [['levels', 'Levels'], ['sweep', 'Sweep'], ['inducement', 'Inducement'], ['displacement', 'Displacement'], ['cisd5', '5m CISD'],
    ['limit', 'Limit armed'], ['cisd1m', '1m CISD wait'], ['entry', 'Entry'], ['trade', 'In trade'], ['done', 'Done today']];

  // the freshest Brain: the PC's (live.json / heartbeat) while it is fresh, else the cloud paper bot's
  function pick() {
    if (typeof D === 'undefined' || !D) return null;
    const L = D.live || {}, pc = L.pc || {}, now = Date.now() / 1000;
    const a = pc.brain && !pc.brain.error ? pc.brain : null, b = L.brain && !L.brain.error ? L.brain : null;
    if (a && (now - (+a.t || 0) < FRESH_S || !b || (+a.t || 0) >= (+b.t || 0))) return { b: a, src: 'PC bot', live: now - (+a.t || 0) < FRESH_S };
    if (b) return { b, src: 'cloud paper bot', live: now - (+b.t || 0) < 45 * 60 };
    return a ? { b: a, src: 'PC bot', live: false } : null;
  }
  const helpTxt = (k) => ((typeof D !== 'undefined' && D && D.brain_help) || {})[k] || '';

  function pipe(b) {
    const st = Object.fromEntries((b.stages || []).map(([k, s]) => [k, s]));
    return `<div class="bz-pipe">${STG.map(([k, l], i) => `<div class="bz-n ${st[k] || 'todo'}"><span>${st[k] === 'done' ? '✓' : st[k] === 'skip' ? '–' : i + 1}</span><em>${l}</em></div>`).join('')}</div>`;
  }
  function waiting(b, src) {
    const s = b.stage || {}, g = b.guards || {};
    return `<div class="card bz-wait ${(g.blocking || []).length ? 'blk' : ''}"><div class="bz-eb">What the bot is waiting for ${info(s.key && s.key !== 'closed' ? s.key : 'levels')}</div>
      <div class="bz-big">${esc(s.waiting || '—')}</div>
      <div class="bz-meta"><span class="chip">${s.n ? `Stage ${s.n}/10 · ` : ''}${esc(s.label || '')}</span>${s.dir ? `<span class="chip ${s.dir > 0 ? 'up' : 'dn'}">${s.dir > 0 ? 'LONG side' : 'SHORT side'}</span>` : ''}</div>
      ${pipe(b)}<div class="small mut">${esc(src.src)} · ${esc(b.at || '')} · price ${p2(b.price)} · ATR ${num(b.atr, 1)} pts${src.live ? '' : ' · <b class="dn">not live</b>'}</div>
      ${(g.blocking || []).length ? `<div class="bz-ban">Blocked: ${esc(g.blocking.join(' · '))}</div>` : ''}</div>`;
  }
  function trade(b) {
    const t = b.trade; if (!t) return '';
    return `<div class="card"><h3>The open trade ${info('be')}</h3><div class="bz-kv">
      <div><span>Side</span><b class="${t.dir > 0 ? 'up' : 'dn'}">${t.side} · ${t.qty} micros</b></div><div><span>Live</span><b class="${cls(t.r_now)}">${sg(t.r_now, 2)}R · ${sg(t.usd_now, 0)} $</b></div>
      <div><span>Entry</span><b>${p2(t.entry)}</b></div><div><span>Stop</span><b class="dn">${p2(t.stop)}</b></div><div><span>Target</span><b class="up">${p2(t.target)}</b></div><div><span>BE at +1R</span><b>${p2(t.be && t.be.trigger)}</b></div></div>
      <p class="small">${esc((t.be || {}).text || '')}</p>${t.t_check ? `<p class="small">${esc(t.t_check.text)} ${info('t_check')}</p>` : ''}<p class="small mut">${esc((t.flat || {}).text || '')} · bank at ${t.bank && t.bank.r}R</p></div>`;
  }
  function sizing(b) {
    const z = b.sizing || {}; if (!z.steps) return '';
    return `<details class="card"><summary><b>Sizing: ${z.qty ?? '—'} micros · $${num(z.risk_usd, 0)} at risk</b> ${info(z.mode === 'two_week' ? 'two_week' : 'stop')}<br><span class="small mut">${esc(z.what || '')}</span></summary>
      <ol class="bz-math">${z.steps.map((s) => `<li><b>${esc(s.label)}: ${esc(s.value)}</b><br><span class="small mut">${esc(s.text)}</span></li>`).join('')}</ol>
      ${z.eval && z.eval.text ? `<p class="small">Eval: ${esc(z.eval.text)}${z.eval.lock ? ' · <b class="dn">pass / fail lock: no new trade</b>' : ''}</p>` : ''}
      ${z.weekly_stop ? `<p class="small mut">${esc(z.weekly_stop.text || '')}</p>` : ''}</details>`;
  }
  function vNow(b, src) {
    const n = b.nearest || {}, g = b.guards || {}, m = g.market || {};
    const row = (r) => `<div class="bz-lv"><span>${esc(r.label)}</span><b>${p2(r.price)}</b><em class="${cls(r.dist)}">${sg(r.dist, 0)} pts</em></div>`;
    const W = (b.watch || []).filter((w) => w.text);
    return waiting(b, src) + trade(b) + `<div class="card"><h3>Nearest levels ${info('depth')}</h3><div class="bz-two"><div><div class="small mut">Above</div>${(n.above || []).map(row).join('') || '—'}</div>
        <div><div class="small mut">Below</div>${(n.below || []).map(row).join('') || '—'}</div></div></div>
      ${W.length ? `<div class="card"><h3>Forming now</h3>${W.map((w) => `<p class="small"><b class="${w.side === 'LONG' ? 'up' : 'dn'}">${w.side}</b> ${esc(w.text)}</p>`).join('')}</div>` : ''}
      ${sizing(b)}
      <div class="card"><h3>Guards &amp; market</h3><p class="small">${esc(m.text || '')}${m.early_close ? ` · CME early close ${esc(m.early_close)} ET` : ''}</p>
        <p class="small">News: ${(g.news || []).length ? esc(g.news.map((x) => `${x.time || ''} ${x.title}`).join(' · ')) : 'no high-impact USD news'}</p>
        <p class="small mut">VIX ${num((g.vix || {}).vix, 1)} · band ${p2((g.vix || {}).dn)} / ${p2((g.vix || {}).up)} ${info('vix')}${(g.off || []).length ? ` · off: ${esc(g.off.join(', '))}` : ''}</p></div>`;
  }
  function vLevels(b) {
    const L = b.levels || [];
    return `<div class="card"><h3>Levels the bot watches ${info('levels')}</h3><p class="small mut">Price ${p2(b.price)} · a sweep counts at ≥ ${(b.rules || {}).depth} ATR (${num((b.atr || 0) * ((b.rules || {}).depth || 0.5), 1)} pts)</p>
      ${L.map((r) => `<div class="bz-lr ${r.taken ? 'tk' : ''}"><div><b class="${r.side === 'H' ? 'up' : 'dn'}">${esc(r.label)}</b><br><span class="small mut">${r.taken ? `swept ${esc(r.taken_hm || '')} · ${num(r.depth_atr, 2)} ATR ${r.deep_ok ? '✓' : '✗'}` : 'untaken'}</span></div>
        <div class="bz-lp"><b>${p2(r.price)}</b><br><span class="small ${cls(r.dist)}">${sg(r.dist, 1)} pts · ${num(Math.abs(r.dist_atr), 1)} ATR</span></div></div>`).join('') || emptyBox('No levels yet.')}</div>`;
  }
  function vSetups(b) {
    const A = b.setups || [];
    if (!A.length) return emptyBox('No setup yet today.', 'A setup appears when a sweep is followed by a 5-minute close through the CISD level (Now shows what is forming).');
    const n = b.setups_n || {};
    return `<p class="small mut" style="margin:4px 2px 10px">Why it did or didn't trade: every rule in the engine's order; the first ✗ stopped it.${n.all > (n.shown || 0) ? ` Showing ${n.shown} of ${n.all} (${n.blocked} skipped by 1 trade a day).` : ''}</p>` +
      A.slice().reverse().map((s) => { const [l, k] = STAT[s.status] || [s.status, '']; const pl = s.plan;
        return `<div class="card bz-su"><div class="bz-sh"><b>${esc(s.hm)}</b> <b class="${s.dir > 0 ? 'up' : 'dn'}">${esc(s.side)}</b> <span class="chip ${k}">${esc(l)}</span></div>
          <p class="small">${esc(s.status_text || '')}</p><p class="small mut">swept ${esc((s.swept || []).join(', '))}</p>
          <ul class="bz-ck">${(s.checks || []).map(([key, o, txt]) => `<li class="${o ? '' : 'f'}">${okI(o)}<div><b>${esc(LAB[key] || key)}</b> ${info(key)}${txt ? `<br><span class="small mut">${esc(txt)}</span>` : ''}</div></li>`).join('')}</ul>
          ${pl ? `<p class="small">Limit ${p2(pl.limit)} · stop ${p2(pl.stop)} (${num(pl.stop_pts, 1)} pts) · target ${p2(pl.target)} (${num(pl.rr, 1)}R) · ${esc(pl.armed_hm || '')}→${esc(pl.expires_hm || '')}</p>` : ''}
          ${s.trade ? `<p class="small">Entry ${esc(s.trade.entry_hm)} @ ${p2(s.trade.entry)} · ${esc(s.trade.exit || '')} ${s.trade.r != null ? sg(s.trade.r, 2) + 'R' : ''}</p>` : ''}</div>`; }).join('');
  }
  function vLog(b) {
    const R = b.log || [];
    return `<div class="card"><h3>Thought log · ${esc(b.day || '')}</h3><p class="small mut">Newest first · last ${R.length} lines (the full log is on the PC: Bot Brain → Thought log)</p>
      <ol class="bz-log">${R.map((r) => `<li class="k-${esc(r.kind || '')}"><b>${esc(r.hm || '')}</b><span>${esc(r.text || '')}</span></li>`).join('') || '<li>nothing yet</li>'}</ol></div>`;
  }
  function view(el) {
    const src = pick();
    el.innerHTML = head('Bot Brain', 'What the bot is thinking', 'Live from the bot: what it waits for, every level, every setup today and the rule that stopped it. Tap i for a one-line explainer. Read-only.');
    if (!src) { el.insertAdjacentHTML('beforeend', emptyBox('No Bot Brain yet.', 'It appears once the PC bot (or the cloud paper bot) has run a LIT poll with this version.')); return; }
    const b = src.b;
    el.insertAdjacentHTML('beforeend', `<div class="bz-tabs" style="margin:8px 0">${segHTML('brTab', [['now', 'Now'], ['levels', 'Levels'], ['setups', 'Setups'], ['log', 'Log']], S.tab)}</div>
      <div id="brBody">${S.tab === 'levels' ? vLevels(b) : S.tab === 'setups' ? vSetups(b) : S.tab === 'log' ? vLog(b) : vNow(b, src)}</div>`);
    onSeg('brTab', (v) => { S.tab = v; view(el); });
  }
  // one floating explainer
  document.addEventListener('click', (e) => {
    const b = e.target.closest && e.target.closest('.bz-i');
    let tip = document.getElementById('brTip');
    if (!b) { if (tip) tip.remove(); return; }
    e.preventDefault(); e.stopPropagation();
    if (!tip) { tip = document.createElement('div'); tip.id = 'brTip'; tip.setAttribute('role', 'tooltip'); document.body.appendChild(tip); }
    tip.textContent = helpTxt(b.dataset.help) || 'No explainer for this yet.';
    const r = b.getBoundingClientRect();
    tip.style.left = Math.max(10, Math.min(innerWidth - 290, r.left - 130)) + 'px';
    tip.style.top = (r.bottom + 8 + scrollY) + 'px';
  }, true);
  // the big Home tile: stage + the waiting sentence, a tap opens the Bot Brain
  function homeTile() {
    const src = pick(); if (!src) return '';
    const s = src.b.stage || {};
    return `<button type="button" class="card bz-tile" data-go="brain"><span class="bz-eb">${icon('brain')} Bot Brain · ${esc(s.label || '')}${s.n ? ` (${s.n}/10)` : ''}</span>
      <span class="bz-tt">${esc(s.waiting || '')}</span><span class="small mut">${esc(src.src)} · ${esc(src.b.at || '')} · tap for every level, setup and rule</span></button>`;
  }
  const CSS = `.bz-wait{border-color:color-mix(in srgb,var(--accent) 45%,transparent)}.bz-wait.blk{border-color:var(--bad)}
.bz-eb{font:700 11px/1.3 var(--sans,system-ui);letter-spacing:.07em;text-transform:uppercase;color:var(--accent);display:flex;align-items:center;gap:6px}
.bz-big{font-size:19px;line-height:1.45;font-weight:650;margin:8px 0 10px}.bz-meta{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px}
.bz-pipe{display:grid;grid-template-columns:repeat(5,1fr);gap:10px 4px;margin:4px 0 10px}.bz-n{display:flex;flex-direction:column;align-items:center;gap:4px;text-align:center}
.bz-n span{width:30px;height:30px;border-radius:50%;display:grid;place-items:center;font-weight:700;font-size:12.5px;border:2px solid var(--line);color:var(--muted)}
.bz-n em{font-style:normal;font-size:10.5px;line-height:1.2;color:var(--muted)}.bz-n.done span{border-color:var(--good);color:var(--good)}
.bz-n.now span{background:var(--accent);border-color:var(--accent);color:#fff;box-shadow:0 0 14px var(--accent)}.bz-n.now em{color:var(--ink,inherit);font-weight:700}.bz-n.skip span{border-style:dashed}
.bz-ban{margin-top:8px;padding:8px 10px;border-radius:10px;background:color-mix(in srgb,var(--bad) 18%,transparent);color:var(--bad);font-weight:650;font-size:13px}
.bz-i{display:inline-grid;place-items:center;width:20px;height:20px;border-radius:50%;border:1px solid var(--line);background:none;color:var(--muted);font:700 11px var(--sans,system-ui);padding:0;vertical-align:middle;cursor:pointer}
#brTip{position:absolute;z-index:300;max-width:280px;padding:10px 12px;border-radius:12px;background:var(--card,#141824);border:1px solid var(--accent);font-size:14px;line-height:1.45;box-shadow:0 8px 28px rgba(0,0,0,.45)}
.bz-two{display:grid;grid-template-columns:1fr 1fr;gap:12px}.bz-lv{padding:6px 0;border-bottom:1px solid var(--line);font-size:13.5px}.bz-lv b{display:block;font-family:var(--mono,monospace)}.bz-lv em{font-style:normal;font-size:12px}
.bz-lr{display:flex;justify-content:space-between;gap:10px;padding:9px 0;border-bottom:1px solid var(--line);font-size:14px}.bz-lr.tk{opacity:.6}.bz-lp{text-align:right;font-family:var(--mono,monospace)}
.bz-kv{display:grid;grid-template-columns:1fr 1fr;gap:8px 12px;margin-bottom:8px}.bz-kv span{display:block;font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.05em}.bz-kv b{font-size:15px}
.bz-ck{list-style:none;margin:6px 0 0;padding:0}.bz-ck li{display:flex;gap:8px;padding:6px 0;border-top:1px solid var(--line);font-size:13.5px}.bz-ck li.f b{color:var(--bad)}
.bz-ok{flex:none;display:inline-grid;place-items:center;width:22px;height:22px;border-radius:7px;font-weight:800}.bz-ok.y{color:var(--good);background:color-mix(in srgb,var(--good) 16%,transparent)}.bz-ok.n{color:var(--bad);background:color-mix(in srgb,var(--bad) 16%,transparent)}
.bz-sh{display:flex;gap:8px;align-items:center;flex-wrap:wrap;font-size:15px}.bz-math{padding-left:18px;margin:8px 0}.bz-math li{padding:5px 0}
.bz-log{list-style:none;margin:0;padding:0}.bz-log li{display:grid;grid-template-columns:46px 1fr;gap:8px;padding:7px 0;border-bottom:1px solid var(--line);font-size:13.5px;line-height:1.45}
.bz-log li.k-rejected span{color:var(--bad)}.bz-log li.k-entry span,.bz-log li.k-exit span{color:var(--good)}
.bz-tile{display:flex;flex-direction:column;gap:6px;width:100%;text-align:left;cursor:pointer;font:inherit;color:inherit;border-color:color-mix(in srgb,var(--accent) 45%,transparent)}.bz-tt{font-size:16px;font-weight:650;line-height:1.4}`;
  function install() {
    if (typeof P !== 'undefined' && !P.brain) P.brain = '<path d="M12 5.2a3 3 0 0 0-5.6-1A3 3 0 0 0 4.5 9a3.2 3.2 0 0 0 .3 5.6A3 3 0 0 0 9 19.3a3 3 0 0 0 3-1.3z"/><path d="M12 5.2a3 3 0 0 1 5.6-1A3 3 0 0 1 19.5 9a3.2 3.2 0 0 1-.3 5.6A3 3 0 0 1 15 19.3a3 3 0 0 1-3-1.3"/><path d="M12 5.2V18"/>';
    // its own main tab on the bottom bar, right after Home (owner 2026-10-21)
    GROUPS.forEach((g) => { g.pages = g.pages.filter((p) => p[0] !== 'brain'); });
    if (!GROUPS.some((g) => g.id === 'brain')) GROUPS.splice(1, 0, { id: 'brain', label: 'Brain', icon: 'brain', pages: [['brain', 'Bot Brain', 'brain', 'What the bot is thinking: stage, levels, setups and the rule that stopped each one']] });
    PAGES.brain = { id: 'brain', label: 'Bot Brain', icon: 'brain', desc: 'What the bot is thinking', group: 'brain' };
    VIEWS.brain = view;
    if (typeof SCENE !== 'undefined') SCENE.brain = 'today';
    if (typeof ALIAS !== 'undefined') Object.assign(ALIAS, { thinking: 'brain', thoughts: 'brain', mind: 'brain' });
    const t0 = VIEWS.today;
    if (t0 && !t0.__brain) {
      VIEWS.today = function (el) { t0.apply(this, arguments); try { const h = homeTile(); if (h) { const first = el.querySelector('.card'); if (first) first.insertAdjacentHTML('afterend', h); else el.insertAdjacentHTML('afterbegin', h); } } catch (e) { console.warn('brain tile', e); } };
      VIEWS.today.__brain = true;
    }
    const st = document.createElement('style'); st.id = 'brain-css'; st.textContent = CSS; document.head.appendChild(st);
    if (typeof nav === 'function') { nav(); if (typeof route === 'function' && /^#\/(brain|thinking|thoughts|mind)\b/.test(location.hash)) route(); }
  }
  install();
})();

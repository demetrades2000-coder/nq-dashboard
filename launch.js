// Launch checklist (phone, 2026-10-25; loaded by index.html with one <script defer> after goals.js; read-only).
// Data: live.pc.launch (heartbeat.json / live.json "launch", engine/launch_check.py): one line per launch need (50K eval
// anchor, allowlist with both accounts, account B, startup reconciled, NinjaTrader connected, feed fresh, Sim roundtrip
// and Sim roundtrip + add, armed (display only), bot running from 01:55 ET), each red line with its one fix command.
//   Home        a "Launch checklist" card above Goals, shown until every line is green
//   #/launch    the full page (More > Launch checklist): every line with its detail, tonight's three steps
// When the PC's heartbeat is older than 20 min the PC lines (startup, NinjaTrader, feed, bot up) turn red here.
// Classic script that uses the main page's helpers (D, VIEWS, GROUPS, PAGES, icon, esc, head, emptyBox, toast). Paper only.
(function () {
  'use strict';
  if (typeof GROUPS === 'undefined' || typeof VIEWS === 'undefined') return;
  const HD = () => (typeof D !== 'undefined' && D) || window.HOMEJ || null;
  const nowS = () => Date.now() / 1000;
  const SILENT_S = 20 * 60;
  const START = 'powershell -ExecutionPolicy Bypass -File scripts\\run_bot.ps1';
  const PC_KEYS = ['startup', 'nt', 'feed', 'up'];
  const ORDER = [['anchor', '50K eval anchor'], ['allow', 'Allowlist has both accounts'], ['b', 'Account B (ATLAS) set up'],
    ['startup', 'Startup reconciled'], ['nt', 'NinjaTrader connected'], ['feed', 'Bar feed fresh'], ['sim', 'Sim roundtrip'],
    ['sim_add', 'Sim roundtrip + add'], ['armed', 'Armed (you do this)'], ['up', 'Bot running from 01:55 ET']];
  const STEPS = [
    ['Prepare both accounts', 'python -m engine.launch_prep --atlas "<25K Name>"'],
    ['Stop the bot, then on Sim101', 'python -m engine.ninjatrader --sim-roundtrip'],
    ['Arm both accounts yourself', 'docs/GO_LIVE_TONIGHT.md'],
  ];
  const usd2 = (v) => v == null || isNaN(v) ? '—' : '$' + (+v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtAge = (s) => s < 90 ? Math.round(s) + ' s' : s < 5400 ? Math.round(s / 60) + ' min' : s < 172800 ? (s / 3600).toFixed(1) + ' h' : Math.round(s / 86400) + ' days';

  // the checklist as this phone sees it: the PC's items, with the PC lines turned red when the heartbeat is old
  function model() {
    const h = HD() || {}, L = h.live || {}, pc = L.pc || {};
    const lc = pc.launch && !pc.launch.error && Array.isArray(pc.launch.items) ? pc.launch : null;
    const t = +pc.t || 0, age = t ? Math.max(0, nowS() - t) : null;
    const silent = !pc.present || age == null || age > SILENT_S || pc.silent === true;
    let items;
    if (lc) items = lc.items.map((i) => ({ ...i }));
    else items = ORDER.map(([key, label]) => ({ key, label, state: key === 'armed' ? 'info' : 'bad', detail: 'no checklist from the PC yet: update and start the PC bot', fix: key === 'armed' ? '' : START }));
    if (silent) {
      const why = age == null ? 'the PC has not reported yet' : `the PC has been silent for ${fmtAge(age)}`;
      for (const i of items) {
        if (PC_KEYS.includes(i.key)) Object.assign(i, { state: 'bad', detail: why, fix: START });
        else if (lc && i.state === 'good') i.detail = `${i.detail} (last known)`;
      }
    }
    const counted = items.filter((i) => i.state !== 'info');
    const good = counted.filter((i) => i.state === 'good').length;
    return { items, lc, silent, age, good, n: counted.length, all: counted.length > 0 && good === counted.length,
      facts: (lc && lc.facts) || {} };
  }
  const dotc = (s) => s === 'good' ? 'good' : s === 'bad' ? 'bad' : s === 'wait' ? 'warn' : 'idle';
  const fixBox = (cmd) => cmd ? `<button type="button" class="lc-fix" data-lccopy="${esc(cmd)}" aria-label="Copy the fix command">${icon('doc')}<code>${esc(cmd)}</code><em>copy</em></button>` : '';
  function row(i, full) {
    return `<li class="lc-i ${dotc(i.state)}"><span class="lc-d" aria-hidden="true"></span><div><b>${esc(i.label)}</b>${full || i.state !== 'good' ? `<span>${esc(i.detail)}</span>` : ''}
      ${i.state === 'bad' ? fixBox(i.fix) : ''}</div><i class="lc-st">${i.state === 'good' ? 'OK' : i.state === 'bad' ? 'FIX' : i.state === 'wait' ? 'WAIT' : 'INFO'}</i></li>`;
  }
  const meter = (M) => `<div class="lc-meter" role="img" aria-label="${M.good} of ${M.n} green"><i style="width:${(M.good / Math.max(1, M.n) * 100).toFixed(1)}%"></i></div>`;

  function card() {
    const M = model();
    if (M.all) return '';
    const red = M.items.filter((i) => i.state !== 'good');
    const green = M.items.filter((i) => i.state === 'good');
    return `<div class="card lc-card"><div class="card-h"><h3>${icon('check')}Launch checklist</h3><button class="chipbtn wide" type="button" data-go="launch"><span>${M.good} of ${M.n} green</span>${icon('right')}</button></div>
      ${meter(M)}
      <ul class="lc-list">${red.map((i) => row(i, false)).join('')}</ul>
      ${green.length ? `<div class="lc-greens">${green.map((i) => `<span class="lc-g">${icon('check')}${esc(i.label)}</span>`).join('')}</div>` : ''}
      <p class="lc-note">Launch 18:00 ET · the bot must run from 01:55 ET. Read-only: this card never arms anything.</p></div>`;
  }

  VIEWS.launch = (el) => {
    const M = model(), f = M.facts, a = f.anchor || {};
    el.innerHTML = head('More · launch', 'Launch checklist', 'Everything tonight’s launch needs, from the PC bot’s own state. Each red line has the one command that fixes it (tap to copy). Read-only: nothing here arms or starts the bot.',
      `<span class="lc-big ${M.all ? 'good' : 'bad'}">${M.good}/${M.n}</span>`);
    el.insertAdjacentHTML('beforeend', `
      <div class="card lc-card ${M.all ? 'done' : ''}"><div class="card-h"><h3>${icon(M.all ? 'check' : 'flag')}${M.all ? 'All green: ready' : 'Still to do'}</h3><span class="meta">${M.age != null ? 'PC ' + esc(fmtAge(M.age)) + ' ago' : 'PC not seen'}</span></div>
        ${meter(M)}<ul class="lc-list">${M.items.map((i) => row(i, true)).join('')}</ul></div>
      ${a.set ? `<div class="card"><div class="card-h"><h3>${icon('prop')}50K eval anchor</h3><span class="meta">as of ${esc(a.as_of || '—')}</span></div>
        <div class="lc-kv"><span>Balance</span><b>${usd2(a.balance)}</b><span>Floor</span><b>${usd2(a.floor)}</b><span>Room</span><b>${usd2((+a.balance || 0) - (+a.floor || 0))}</b></div></div>` : ''}
      <div class="card"><div class="card-h"><h3>${icon('today')}Tonight, after 18:00 ET</h3></div><ol class="lc-steps">${STEPS.map(([t, c], k) => [t, k === 0 && (f.b || {}).account ? c.replace('<25K Name>', f.b.account) : c]).map(([t, c], k) => `<li><b>${k + 1}. ${esc(t)}</b>${k < 2 ? fixBox(c) : `<span>${esc(c)}</span>`}</li>`).join('')}</ol>
        <p class="lc-note">Step 2 also has <code>--sim-roundtrip-add</code>. Then leave the bot running: it must be up from 01:55 ET.</p></div>
      <p class="small mut">${M.lc ? `Checked by the PC at ${esc(new Date((M.lc.t || 0) * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))}` : 'The PC has not sent its checklist yet'} · engine/launch_check.py</p>`);
  };

  document.addEventListener('click', (e) => {
    const b = e.target.closest && e.target.closest('[data-lccopy]');
    if (!b) return;
    e.preventDefault();
    const t = b.dataset.lccopy;
    const done = () => (typeof toast === 'function' ? toast('Copied') : null);
    (navigator.clipboard && navigator.clipboard.writeText(t) || Promise.reject()).then(done).catch(() => {
      const x = document.createElement('textarea'); x.value = t; document.body.appendChild(x); x.select();
      try { document.execCommand('copy'); done(); } catch (er) { /* select by hand */ } x.remove();
    });
  });
  window.LaunchUI = { model, card, version: 1 };

  function install() {
    const M = GROUPS.find((g) => g.id === 'system');
    if (M && !M.pages.some((p) => p[0] === 'launch')) M.pages.splice(1, 0, ['launch', 'Launch checklist', 'check', 'Tonight’s launch: every line green or the one command that fixes it']);
    PAGES.launch = { id: 'launch', label: 'Launch checklist', icon: 'check', desc: 'Tonight’s launch: every line green or the one command that fixes it', group: 'system' };
    if (typeof SCENE !== 'undefined') SCENE.launch = 'engine';
    if (typeof ALIAS !== 'undefined') { delete ALIAS.launch; Object.assign(ALIAS, { golive: 'launch', prelaunch: 'launch', launchcheck: 'launch' }); }
    const t0 = VIEWS.today;
    if (t0 && !t0.__launch) {
      VIEWS.today = function (el) {
        t0.apply(this, arguments);
        try {
          const html = card();
          if (!html) return;
          const gl = el.querySelector('.gl-card'), two = el.querySelector('.at-two'), sf = el.querySelector('.hb-surface');
          const at = gl || two;
          if (at) at.insertAdjacentHTML('beforebegin', html);
          else if (sf) sf.insertAdjacentHTML('afterend', html);
          else el.insertAdjacentHTML('afterbegin', html);
        } catch (e) { console.warn('launch home', e); }
      };
      VIEWS.today.__launch = true;
    }
    const st = document.createElement('style'); st.id = 'launch-css'; st.textContent = CSS; document.head.appendChild(st);
    if (typeof nav === 'function') { nav(); if (typeof route === 'function') route(); }
  }

  const CSS = `
.lc-card{border-color:color-mix(in srgb,var(--warn) 45%,transparent);background:linear-gradient(160deg,color-mix(in srgb,var(--warn) 8%,var(--surface)),var(--surface))}
.lc-card.done{border-color:color-mix(in srgb,var(--good) 45%,transparent);background:linear-gradient(160deg,color-mix(in srgb,var(--good) 8%,var(--surface)),var(--surface))}
.lc-meter{height:8px;border-radius:99px;background:var(--surface-3);overflow:hidden;margin:2px 0 10px}.lc-meter i{display:block;height:100%;border-radius:99px;background:var(--good);transition:width .8s var(--ease)}
.lc-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column}
.lc-i{display:grid;grid-template-columns:12px minmax(0,1fr) auto;gap:10px;align-items:start;padding:9px 0;border-bottom:1px solid var(--line)}.lc-i:last-child{border-bottom:0}
.lc-d{width:10px;height:10px;border-radius:50%;margin-top:5px;background:var(--muted)}.lc-i.good .lc-d{background:var(--good)}.lc-i.bad .lc-d{background:var(--bad);box-shadow:0 0 0 3px color-mix(in srgb,var(--bad) 25%,transparent)}.lc-i.warn .lc-d{background:var(--warn)}
.lc-i>div{min-width:0;display:flex;flex-direction:column;gap:3px}.lc-i b{font-size:14px}.lc-i>div>span{font-size:12.5px;line-height:1.45;color:var(--ink-2);overflow-wrap:anywhere}
.lc-st{font:700 10px var(--sans);letter-spacing:.07em;font-style:normal;padding:3px 7px;border-radius:99px;background:var(--surface-3);color:var(--muted);margin-top:2px}
.lc-i.good .lc-st{color:var(--good)}.lc-i.bad .lc-st{color:#fff;background:var(--bad)}.lc-i.warn .lc-st{color:#0b0e14;background:var(--warn)}
.lc-fix{display:flex;align-items:center;gap:8px;width:100%;margin-top:5px;padding:8px 10px;border-radius:10px;border:1px solid var(--line);background:var(--surface-2);color:var(--ink);text-align:left;cursor:pointer;font:inherit}
.lc-fix code{flex:1;min-width:0;font:600 11.5px var(--mono);overflow-wrap:anywhere;white-space:normal}.lc-fix em{font-style:normal;font-size:10.5px;color:var(--accent);font-weight:700;text-transform:uppercase;letter-spacing:.06em}.lc-fix .ico{flex:none;width:15px;height:15px;color:var(--muted)}
.lc-greens{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}.lc-g{display:inline-flex;align-items:center;gap:5px;font-size:11.5px;padding:4px 9px;border-radius:99px;background:color-mix(in srgb,var(--good) 12%,transparent);color:var(--ink-2)}.lc-g .ico{width:13px;height:13px;color:var(--good)}
.lc-note{margin:10px 0 0;font-size:12px;color:var(--muted);line-height:1.45}
.lc-big{font:750 26px var(--mono);padding:6px 14px;border-radius:14px;background:var(--surface-2)}.lc-big.good{color:var(--good)}.lc-big.bad{color:var(--warn)}
.lc-kv{display:grid;grid-template-columns:auto 1fr;gap:6px 14px;font-size:13.5px}.lc-kv span{color:var(--muted)}.lc-kv b{font-family:var(--mono);text-align:right}
.lc-steps{margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:12px}.lc-steps li{display:flex;flex-direction:column;gap:2px}.lc-steps span{font-size:12.5px;color:var(--ink-2)}
html[data-theme="light"] .lc-i.bad .lc-st{color:#fff}
`;
  install();
})();

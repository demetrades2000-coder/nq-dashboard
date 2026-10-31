// Fleet (phone, 2026-10-30; loaded by index.html with one <script defer> AFTER the last script; read-only: it never arms,
// routes, kills or changes the bot). The follower accounts that copy Zlarior / ATLAS / BLITZ (engine/fleet.py):
//   #/fleet   one glass card per follower: firm + plan, stage (eval / funded / LIVE), status (running / passed / failed /
//             killed / off), balance, room to the firm's floor, daily loss left, $ to the target, today / this week, the open
//             copy, slippage vs the lead's fill, the last copy it skipped and why, rule warnings (unverified / unknown values)
//             + the fleet totals and the kill flag. Nothing is drawn as a trade the bot did not report.
// Data: live.json (window.LIVE.j: pc.fleet = the heartbeat's compact block, engine/fleet.Fleet.hb_block), else
// data.json's live.pc.fleet. With the fleet off (no data/fleet.json on the PC) the page says so and shows the 3 steps.
(function () {
  'use strict';
  if (typeof VIEWS === 'undefined' || typeof PAGES === 'undefined') return;
  const E = (s) => (typeof esc === 'function' ? esc(s) : String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])));
  const $u = (v) => (v === null || v === undefined || isNaN(+v) ? '—' : (typeof usd === 'function' ? usd(+v) : '$' + Math.round(+v)));
  const $s = (v) => (v === null || v === undefined || isNaN(+v) ? '—' : (typeof susd === 'function' ? susd(+v) : (+v > 0 ? '+' : '') + '$' + Math.round(+v)));
  const K = (v) => (typeof cls === 'function' ? cls(+v || 0) : (+v > 0 ? 'up' : +v < 0 ? 'dn' : ''));
  const LJ = () => (window.LIVE && window.LIVE.j) || null;
  const HD = () => (typeof D !== 'undefined' && D) || window.HOMEJ || null;
  function block() {
    const j = LJ(), h = HD() || {};
    const a = j && j.pc && j.pc.fleet, b = h.live && h.live.pc && h.live.pc.fleet;
    if (a && b) return (+a.t || 0) >= (+b.t || 0) ? a : b;
    return a || b || null;
  }
  const ST = { running: ['Running', ''], passed: ['EVAL PASSED', 'up'], failed: ['FAILED', 'dn'], killed: ['KILLED', 'dn'], off: ['Off', ''] };
  const LEAD = { zlarior: 'Zlarior', atlas: 'ATLAS', blitz: 'BLITZ' };
  function card(a) {
    if (a.error) return `<div class="card"><div class="card-h"><h3>${E(a.id)}</h3></div><div class="card-d">${E(a.error)}</div></div>`;
    const st = ST[a.st] || [a.st || '—', ''];
    const live = a.lab === 'LIVE' || a.lab === 'REAL';
    const stage = a.stage === 'live' ? 'LIVE account' : a.stage === 'funded' ? 'Funded' : 'Eval';
    const tiles = [
      typeof statBox === 'function' ? statBox('Balance', $u(a.bal)) : '',
      typeof statBox === 'function' ? statBox(a.stage === 'live' ? 'Daily stop left' : 'Room to floor', $u(a.stage === 'live' ? a.dl : a.room), a.stage === 'live' ? '' : (a.dl !== undefined ? `daily loss left ${$u(a.dl)}` : '')) : '',
      typeof statBox === 'function' ? statBox('Today', $s(a.day), `week ${$s(a.wk)}`, K(a.day)) : '',
      a.stage === 'eval' && typeof statBox === 'function' ? statBox('To target', $u(a.tgt)) : '',
    ].join('');
    const pos = a.pos ? `<span class="chip">${a.pos[0] === 'L' ? 'LONG' : 'SHORT'} ${E(a.pos.slice(1))} micros</span>` : '<span class="chip">flat</span>';
    const slip = a.slip !== undefined && a.slip !== null ? `<span class="chip">slippage vs lead ${a.slip > 0 ? '+' : ''}${E(a.slip)} ticks</span>` : '';
    const warn = (a.warn || []).map((w) => `<div class="card-d">⚠ ${E(w)}</div>`).join('');
    const skip = a.skip ? `<div class="card-d">Last copy skipped: ${E(a.skip)}</div>` : '';
    return `<div class="card fx-card"><div class="card-h"><h3>${E(a.n || a.id)} <span class="chip">${live ? '● ' : ''}${E(a.lab || 'PAPER')}</span></h3>`
      + `<div><span class="meta ${st[1]}">${E(st[0])}</span></div></div>`
      + `<div class="card-d">${E(a.firm || '')} ${E(a.plan || '')} · ${E(stage)} · copies ${E(LEAD[a.lead] || a.lead)} · ${E(a.n_tr || 0)} copies booked</div>`
      + `<div class="stats">${tiles}</div><div class="chips">${pos}${slip}</div>${skip}${warn}</div>`;
  }
  function draw(el) {
    const F = block();
    const steps = '<ol class="card-d"><li>Buy the account (the owner\'s own price and code; see docs/ADD_ACCOUNT.md).</li>'
      + '<li>Log it in NinjaTrader 8 (Accounts tab shows its Name; test on Sim first).</li>'
      + '<li>On the PC dashboard: All tools &gt; More &gt; Fleet &gt; Add an account (or the console line <code>python -X utf8 -m engine.fleet --add --id &lt;id&gt; --lead zlarior --plan &lt;plan&gt; --account "&lt;Name&gt;" --start &lt;day&gt;</code>).</li></ol>';
    if (!F || !(F.acc || []).length) {
      el.innerHTML = head('Accounts · fleet', 'Fleet', 'Copy trading to your other accounts (prop firms, Sim, your own LIVE account). Off: no follower accounts yet.')
        + `<div class="card"><div class="card-h"><h3>Add an account</h3></div>${steps}<div class="card-d">Nothing is ever armed for you: a real account trades only after you arm it and type the live phrase at the bot's start.</div></div>`;
      return;
    }
    const T = F.tot || {};
    const top = typeof statBox === 'function'
      ? `<div class="stats">${statBox('Followers', E(F.n || (F.acc || []).length), `${E(T.open || 0)} open now`)}${statBox('Today, all', $s(T.today), '', K(T.today))}${statBox('This week, all', $s(T.week), '', K(T.week))}${statBox('Passed / failed', `${E(T.passed || 0)} / ${E(T.failed || 0)}`, T.live ? `${E(T.live)} real / LIVE` : 'paper / Sim')}</div>` : '';
    const kill = F.kill ? '<div class="card"><div class="card-h"><h3>FLEET KILL ON</h3></div><div class="card-d">Every follower is flat and takes no new copy. On the PC: <code>python -X utf8 -m engine.fleet --unkill all</code></div></div>' : '';
    const age = F.t ? Math.max(0, Math.round(Date.now() / 1000 - +F.t)) : null;
    el.innerHTML = head('Accounts · fleet', 'Fleet', `Every follower account, sized from its own room and its firm's rules. Never opposite another of your accounts. Read-only${age !== null ? ` · ${age < 120 ? age + ' s' : Math.round(age / 60) + ' min'} ago` : ''}.`)
      + kill + top + (F.acc || []).map(card).join('') + (F.cut ? '<div class="card-d">More followers on the PC page.</div>' : '')
      + `<div class="card"><div class="card-h"><h3>Add an account</h3></div>${steps}</div>`;
  }
  let timer = null;
  function view(el) {
    draw(el);
    clearInterval(timer);
    let last = (block() || {}).t;
    timer = setInterval(() => {
      if (typeof PAGE !== 'undefined' && PAGE !== 'fleet') { clearInterval(timer); return; }
      const t = (block() || {}).t; if (t !== last) { last = t; draw(el); }
    }, 15000);
  }
  VIEWS.fleet = view;
  PAGES.fleet = { id: 'fleet', label: 'Fleet', icon: 'modules', desc: 'Copy trading: every follower account (prop firms, Sim, your LIVE account), room, today, slippage, warnings', group: 'system' };
  const Sy = typeof GROUPS !== 'undefined' ? GROUPS.find((g) => g.id === 'system') : null;
  if (Sy && Sy.pages && !Sy.pages.some((p) => p[0] === 'fleet')) Sy.pages.push(['fleet', 'Fleet', 'modules', PAGES.fleet.desc]);
  if (typeof ALIAS !== 'undefined') Object.assign(ALIAS, { copy: 'fleet', copytrading: 'fleet', followers: 'fleet', accounts_fleet: 'fleet' });
  if (typeof SCENE !== 'undefined') SCENE.fleet = 'results';
})();

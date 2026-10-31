// Real accounts renderer (2026-10-28, owner: "improve dashboard, clarity, features, organization"; both MFFU accounts
// trade for real since today). Shared by the phone app (tools/web_public/real.js: the Home "Today" cards + #/real) and the
// PC dashboard (web_next/js/next/real.js: the Home "Today" cards + the "Real results" page); web_next/js/next/realcore.js
// is a byte-identical copy of tools/web_public/realcore.js (tests/test_real_ui.py checks it).
// Data: the live board (engine/live_board.py: PC GET /api/next/board, phone data.json / live.json "board"), its "real"
// block = the REAL account trades only (PC ledger + exits, never the paper run), the ledger check and Zlarior's backtest
// cone. Every $ on these cards is the account's own; a paper figure is always labelled PAPER next to its REAL twin.
// Read-only: nothing here talks to the bot; the buttons filter, expand a row or export a CSV.
//   RealUI.today(B, o)      Home: one card per REAL account (state, today's real trades, balance, room to the floor,
//                           $ to the target, daily loss, eval day N of 10 + pass ETA, next window, health score) + the
//                           Strategy 3 slot, ledger-check banners, the LIT vs ATLAS conflict line, "What happened today"
//   RealUI.safety(B, o)     Home: one safety card (floor + daily loss of both, orders confirmed, refused orders, feed,
//                           NinjaTrader, clock, conflict, kill switch link)
//   RealUI.results(B, o)    the Real results page: KPIs, vs backtest (cone / pace / odds), equity curves, daily P&L,
//                           R distribution, streaks, $ by strategy, this week's report card, incidents, the real trade log
//                           with running P&L, a timeline per trade and a CSV export
//   RealUI.wire(root, B, o) filters, row timelines, CSV
//   RealUI.realOf(row, B)   the REAL twin of a paper trade: "REAL: 3 micros, +$1,662" or "REAL: no order on the account"
//   RealUI.csv(rows)        the real trades as CSV text
// opts: {go: (id) => 'data-goto="id"' | 'data-go="id"', where: 'pc' | 'phone', download: (name, text) => void}
(function () {
  'use strict';
  if (typeof window === 'undefined') return;
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ok = (v) => v != null && v !== '' && !isNaN(v);
  const nowS = () => Date.now() / 1000;
  const usd = (v, d = 0) => !ok(v) ? '—' : (v < 0 ? '−' : '') + '$' + Math.abs(+v).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
  const susd = (v, d = 0) => !ok(v) ? '—' : (v > 0 ? '+' : '') + usd(v, d);
  const px = (v) => ok(v) ? (+v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—';
  const pct = (v) => ok(v) ? (+v).toFixed(0) + '%' : '—';
  const fR = (v) => !ok(v) ? '—' : (v > 0 ? '+' : '') + (+v).toFixed(2) + 'R';
  const cl = (v) => !ok(v) ? '' : v > 0 ? 'up' : v < 0 ? 'dn' : '';
  const clamp = (x) => Math.max(0, Math.min(1, x));
  const ETF = { timeZone: 'America/New_York', hour12: false };
  const hm = (t) => { if (!ok(t)) return '—'; try { return new Date(t * 1000).toLocaleTimeString('en-US', { ...ETF, hour: '2-digit', minute: '2-digit' }); } catch (e) { return '—'; } };
  const dhm = (t) => { if (!ok(t)) return ''; try { return new Date(t * 1000).toLocaleString('en-US', { ...ETF, weekday: 'short', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; } };
  const etDay = (t) => { try { return new Date(t * 1000).toLocaleDateString('en-CA', { timeZone: 'America/New_York' }); } catch (e) { return ''; } };
  const dur = (s) => { s = Math.max(0, Math.round(s)); if (s < 90) return s + ' s'; const m = Math.round(s / 60); if (m < 90) return m + ' min'; const h = Math.floor(m / 60); return h < 48 ? h + ' h ' + (m % 60) + ' min' : Math.round(h / 24) + ' d'; };
  const NAMES = { lit: 'Zlarior', atlas: 'ATLAS', blitz: 'BLITZ' };
  const PLAN = { lit: { start: 50000, target: 3000, mll: 2000, dll: 1000, size: '50K' }, atlas: { start: 25000, target: 1500, mll: 1000, dll: 600, size: '25K' },
    blitz: { start: 25000, target: 1500, mll: 1000, dll: 600, size: '25K' } };
  const KIND = { TARGET: 'target', STOP: 'stop', BE: 'breakeven', EOD: 'flat 15:55', FLAT: 'flat', CUT_T15: '15-min cut', CUT: '15-min cut', T15: '15-min cut', OPEN: 'open' };
  const how = (r) => r.open ? 'open' : KIND[String(r.exit || '').toUpperCase()] || String(r.exit || '').toLowerCase() || '—';
  const chip = (t, k) => `<span class="rc-chip ${k || ''}">${esc(t)}</span>`;
  // plain-language glossary: every term gets a tap / hover explanation
  const GLOSS = {
    'Room to floor': 'How much the account can still lose before MFFU closes the eval (the trailing max-loss floor). Below 25% the bot sizes down.',
    'To target': 'Profit still needed to pass the eval (50K: +$3,000, 25K: +$1,500).',
    'Daily loss': 'Today\'s losses against the daily loss limit (50K $1,000, 25K $600). At the limit no new trade today.',
    'Eval day': 'Trading sessions used on this eval. Goal: pass within 10 sessions (2 weeks), never more than 15.',
    'R': 'Result in units of the risk: -1R = a full stop-out, +2R = twice the risk won.',
    'Real': 'What happened on the MFFU account itself (the PC bot\'s ledger + NinjaTrader fills).',
    'Paper': 'What the strategy did in its own simulation on the same bars. Its size and $ are NOT the account\'s.',
    'Health score': 'One number for the account: 100 = all good. Points come off for a thin room to the floor, a guard that blocks entries, a red bot light or old data.',
    'Pass ETA': 'Sessions still needed at the 2026 H2 backtest pace ($ per session on the eval sizing). A guide, not a promise.',
    'Backtest band': 'Where 90% of 4,000 simulated 2026 H2 paths were after the same number of sessions (p5-p95; the darker band p25-p75).',
  };
  const tip = (t, label) => `<abbr class="rc-tip" tabindex="0" title="${esc(GLOSS[t] || '')}">${esc(label || t)}</abbr>`;
  const goA = (o, id) => (o && o.go ? o.go(id) : `data-goto="${id}"`);
  const short = (n) => { const s = String(n || ''); const m = s.match(/(\d{3,})$/); return m ? '…' + m[1].slice(-4) : s; };

  // ---------------------------------------------------------------- data helpers
  const accOf = (B, k) => (B && B[k] && !B[k].error ? B[k] : null);
  // the real accounts on the board: Zlarior + ATLAS, and BLITZ once its own 25K (account C, engine/account_c.py) is on
  const AKS = (B) => ['lit', 'atlas'].concat(accOf(B, 'blitz') ? ['blitz'] : []);
  const pageOf = (k) => (k === 'lit' ? 'zlarior' : k === 'atlas' ? 'atlas' : 'mission');
  function realRows(B) {
    const R = B && B.real && Array.isArray(B.real.trades) ? B.real.trades : (B && Array.isArray(B.trades) ? B.trades.filter((r) => r.src === 'live') : []);
    return R.slice().sort((x, y) => (+x.entry_t || 0) - (+y.entry_t || 0));
  }
  const today = (B) => (B && B.today) || etDay(nowS());
  const checksOf = (B, k) => ((B && B.real && B.real.checks) || []).filter((c) => !k || c.acct === k);
  function refused(a) {
    const O = (a && a.orders) || [];
    const filled = new Set(O.filter((o) => o.side === 'exit' || (o.ok === true && o.side !== 'exit')).map((o) => o.entry_t));
    return O.filter((o) => o.ok === false && o.side !== 'exit' && !filled.has(o.entry_t));
  }
  // the REAL twin of a paper trade (same account, same side, entry within 30 min)
  function realOf(r, B) {
    if (!r || r.src === 'live') return null;
    const R = realRows(B).filter((x) => x.acct === r.acct && x.side === r.side && ok(x.entry_t) && ok(r.entry_t) && Math.abs(x.entry_t - r.entry_t) <= 1800);
    if (R.length) { const x = R[0]; return { real: x, text: `REAL: ${x.qty ?? '?'} micros, ${x.open ? 'open' : susd(x.usd)}` }; }
    const acc = accOf(B, r.acct), start = acc && acc.eval_start;
    if (start && String(r.day || '') >= String(start)) return { real: null, text: 'REAL: no order on the account' };
    return { real: null, text: 'REAL: before the real account started' };
  }
  function sessionsBetween(a, b) {               // weekday sessions from day a to day b, both included
    if (!a || !b || b < a) return 0;
    let n = 0; const d = new Date(a + 'T12:00:00Z'), z = new Date(b + 'T12:00:00Z');
    for (let i = 0; i < 400 && d <= z; i++) { const w = d.getUTCDay(); if (w > 0 && w < 6) n++; d.setUTCDate(d.getUTCDate() + 1); }
    return n;
  }
  function perSession(B, k) {
    const E = (((B && B.progress) || {})[k] || {}).expected || {};
    return ok(E.per_session) ? +E.per_session : ok(E.per_month) ? +E.per_month / 21 : null;
  }
  function eta(B, a) {
    const ps = perSession(B, a.id);
    if (!ok(a.to_target) || a.to_target <= 0 || !ps || ps <= 0) return null;
    const n = Math.ceil(a.to_target / ps), at = (ok(a.session) ? +a.session : 0) + n;
    return { n, at, ps, k: at <= 10 ? 'good' : at <= 15 ? 'warn' : 'bad' };
  }
  function score(B, a) {
    if (!a) return { n: 0, why: ['no data'], k: 'bad' };
    const why = []; let n = 100;
    const st = String(a.status || '').toLowerCase();
    if (/fail|lost/.test(st)) return { n: 0, why: ['eval ' + st], k: 'bad' };
    const chk = checksOf(B, a.id);
    const rf = ok(a.room_frac) ? +a.room_frac : null;
    if (rf != null && rf < 0.25) { n -= chk.length ? 15 : 35; why.push(chk.length ? 'room thin by the ledger (may be a ledger error)' : 'room to the floor under 25%'); }
    else if (rf != null && rf < 0.5) { n -= 15; why.push('room to the floor under 50%'); }
    // the 50K's floor alert is global ("both") on the board: it does not cost ATLAS points
    const blk = (B.blocks || []).filter((b) => a.id === 'lit' || !/near the floor/i.test(b.text || '')).length + (a.blocks || []).length;
    if (blk) { n -= Math.min(40, 20 * blk); why.push(`${blk} guard${blk > 1 ? 's' : ''} blocking entries`); }
    const bad = ((B.health || {}).items || []).filter((x) => x.ok === false);
    if (bad.length) { n -= Math.min(30, 10 * bad.length); why.push(bad.map((x) => x.label).join(', ') + ' red'); }
    const warn = ((B.health || {}).items || []).filter((x) => x.warn);
    if (warn.length) { n -= 5; why.push(warn.map((x) => x.label).join(', ') + ' to watch'); }
    if (ok(B.data_t) && nowS() - B.data_t > 900) { n -= 15; why.push('data ' + dur(nowS() - B.data_t) + ' old'); }
    if (refused(a).length) { n -= 10; why.push(`${refused(a).length} refused order${refused(a).length > 1 ? 's' : ''}`); }
    if (chk.length) why.push('ledger check open');
    if (B.running === false) { n -= 20; why.push('bot stopped'); }
    n = Math.max(0, Math.min(100, n));
    return { n, why: why.length ? why : ['all good'], k: n >= 80 ? 'good' : n >= 55 ? 'warn' : 'bad' };
  }

  // ---------------------------------------------------------------- small parts
  // data-rc-n="key": the number in this element counts up when it first shows or changes (fx() below; never in node)
  const cn = (key) => (key ? ` data-rc-n="${esc(key)}"` : '');
  const bar = (f, k) => `<div class="rc-bar ${k || ''}"><i style="width:${(clamp(f || 0) * 100).toFixed(1)}%"></i></div>`;
  function gauge(label, val, f, k, sub, key) {
    return `<div class="rc-g"><div class="rc-gh"><span>${label}</span><b class="${k === 'bad' ? 'dn' : ''}"${cn(key)}>${val}</b></div>${bar(f, k)}${sub ? `<div class="rc-gs">${sub}</div>` : ''}</div>`;
  }
  // the health score as a glowing ring (the arc is the score out of 100)
  function ring(S, key) {
    return `<div class="rc-score rc-pop ${S.k}" title="${esc(S.why.join(' · '))}"><svg class="rc-ring" viewBox="0 0 72 72" aria-hidden="true"><circle class="t" cx="36" cy="36" r="31"/>`
      + `<circle class="f" cx="36" cy="36" r="31" pathLength="100" stroke-dasharray="${S.n} 100"/></svg><b${cn(key)}>${S.n}</b><span>${tip('Health score', 'health')}</span></div>`;
  }
  function win(w) {
    if (!w) return '—';
    if (ok(w.open_t)) {
      const n = nowS(), t = n < w.open_t ? `opens in ${dur(w.open_t - n)}` : n < w.close_t ? `open · closes in ${dur(w.close_t - n)}` : 'closed';
      return `<b class="rc-cd" data-bd-open="${w.open_t}" data-bd-close="${w.close_t}">${esc(t)}</b> <em>${esc(w.who ? w.who + ' · ' : '')}${esc(w.hours || '')}</em>`;
    }
    return `<b>${esc(w.text || '—')}</b>`;
  }
  function stateChips(B, a) {
    const badge = String(a.badge || '').toUpperCase();
    const live = /LIVE|EVAL|REAL/.test(badge) && !/SIM\b|PAPER/.test(badge);
    const out = [chip(live ? 'REAL ACCOUNT' : badge || 'PAPER', live ? 'good' : badge ? 'warn' : '')];
    out.push(B.running === false ? chip('bot stopped', 'bad') : B.running ? chip('bot running', 'good') : '');
    if (a.position) out.push(chip('in a trade', 'acc'));
    return out.join('');
  }
  function posLine(p, acct) {
    if (!p) return '';
    const side = p.side || (+p.dir > 0 ? 'LONG' : 'SHORT'), d = side === 'LONG' ? 1 : -1, q = +p.qty || 0;
    const toStop = ok(p.stop) && ok(p.entry) ? (p.stop - p.entry) * d * 2 * q : null;
    const toTgt = ok(p.target) && ok(p.entry) ? (p.target - p.entry) * d * 2 * q : null;
    const rNow = ok(p.unrealized_r) ? p.unrealized_r : ok(p.unrealized_usd) && toStop ? p.unrealized_usd / Math.abs(toStop) : null;
    return `<div class="rc-pos">${chip(side, d > 0 ? 'good' : 'bad')}<span><b>${esc(q || '?')} micros</b> at ${px(p.entry)}${p.strategy ? ' · ' + esc(p.strategy) : ''}${p.be ? ' · at breakeven' : ''}</span>
      <div class="rc-posg"><span>now <b class="${cl(p.unrealized_usd)}">${susd(p.unrealized_usd)}</b> ${ok(rNow) ? `<em>${fR(rNow)}</em>` : ''}</span><span>to stop <b class="dn">${susd(toStop)}</b> <em>${px(p.stop)}</em></span><span>to target <b class="up">${susd(toTgt)}</b> <em>${px(p.target)}</em></span></div></div>`;
  }
  function tradeLine(r) {
    return `<li class="rc-tr">${chip(r.side || '', r.side === 'LONG' ? 'good' : 'bad')}<span class="rc-trm"><b>${esc(r.qty ?? '?')} micros</b>${r.member ? ' · ' + esc(r.member) : ''} <em class="mono">${hm(r.entry_t)} ${px(r.entry)} → ${r.open ? 'open' : px(r.exit_px)}</em></span>
      <span class="rc-trh">${esc(how(r))} <em class="${cl(r.r)}">${fR(r.r)}</em></span><b class="rc-tru mono ${cl(r.usd)}">${r.open ? 'open' : susd(r.usd, 2)}</b></li>`;
  }
  function whyNone(B, a) {
    const blk = (B.blocks || []).filter((b) => a.id === 'lit' || !/near the floor/i.test(b.text || '')).concat(a.blocks || []);
    if (blk.length) return `Blocked: ${blk[0].text}`;
    if (a.done_today) return 'Done for today (its daily trade limit).';
    return a.waiting || 'Watching for a setup.';
  }

  // ---------------------------------------------------------------- Today: one real account
  function card(B, k, o) {
    const a = accOf(B, k), P = PLAN[k];
    if (!a) return `<section class="rc-card rc-acct ${k}"><div class="rc-h"><div class="rc-eye">${NAMES[k]} · ${P.size}</div></div><p class="rc-note">No data for this account yet. It appears after the PC bot reports.</p></section>`;
    if (k === 'atlas' && a.configured === false) return `<section class="rc-card rc-acct atlas"><div class="rc-h"><div class="rc-eye">ATLAS · 25K</div>${chip('not set up', 'warn')}</div><p class="rc-note">Account B is not on in the PC bot.</p></section>`;
    const td = today(B), R = realRows(B).filter((r) => r.acct === k && String(r.day) === td);
    const closed = R.filter((r) => !r.open && ok(r.usd)), realToday = closed.reduce((s, r) => s + +r.usd, 0) + (a.position && ok(a.position.unrealized_usd) ? +a.position.unrealized_usd : 0);
    const dayPnl = ok(a.today_pnl) ? +a.today_pnl : realToday;
    const mll = a.mll || P.mll, room = a.room, rf = ok(a.room_frac) ? a.room_frac : ok(room) ? room / mll : null;
    const chk = checksOf(B, k);
    const roomK = rf == null ? '' : rf < 0.25 ? 'bad' : rf < 0.5 ? 'warn' : 'good';
    const tgt = ok(a.target_balance) ? a.target_balance - P.start : P.target, prof = ok(a.profit) ? +a.profit : null;
    const dll = a.dll || P.dll, used = ok(a.dll_used) ? +a.dll_used : Math.max(0, -Math.min(0, dayPnl));
    const E = eta(B, a), S = score(B, a), funded = a.stage === 'funded';
    const sess = ok(a.session) ? +a.session : null;
    const altRoom = chk.length && ok(chk[0].room_if_error) ? `<div class="rc-gs warn">about <b>${usd(chk[0].room_if_error)}</b> if the ${esc(chk[0].day)} ${susd(chk[0].usd)} is a ledger error (no real trade that day)</div>` : '';
    return `<section class="rc-card rc-acct ${k} rc-tilt${S.k === 'bad' ? ' bad' : ''}" aria-label="${NAMES[k]} today">
      <div class="rc-h"><div class="rc-eye">${NAMES[k]} · ${P.size}<em>${esc(a.method || '')}${a.broker ? ' · ' + esc(short(a.broker)) : ''}</em></div><div class="rc-chips">${stateChips(B, a)}</div></div>
      <div class="rc-top"><div class="rc-big rc-pop"><span>Today · ${tip('Real', 'real')}</span><b class="${cl(dayPnl)}"${cn(k + '-day')}>${susd(dayPnl, 2)}</b><em>${R.length} of ${a.max_day || (k === 'lit' ? 1 : 2)} trade${(a.max_day || 1) === 1 ? '' : 's'} today</em></div>
        ${ring(S, k + '-score')}</div>
      ${posLine(a.position, k)}
      ${R.filter((r) => !r.open).length ? `<ul class="rc-trs">${R.filter((r) => !r.open).map(tradeLine).join('')}</ul>` : a.position ? '' : `<p class="rc-why"><b>No trade yet today.</b> ${esc(whyNone(B, a))}</p>`}
      <div class="rc-kv"><div><span>Balance</span><b${cn(k + '-bal')}>${usd(a.balance, 2)}</b></div><div><span>${tip('Eval day')}</span><b>${funded ? 'funded' : sess != null ? `${sess} of ${a.sessions || 10}` : '—'}</b>${E && !funded ? `<em class="${E.k}">${tip('Pass ETA', `pass ≈ day ${E.at}`)}</em>` : ''}</div>
        <div><span>Next window</span>${win(a.window)}</div></div>
      ${gauge(tip('Room to floor'), usd(room), rf, roomK, `floor ${usd(a.floor, 2)} · of ${usd(mll)}${rf != null && rf < 0.25 && !chk.length ? ' · thin: the bot sizes down' : ''}`, k + '-room')}${altRoom}
      ${gauge(tip('To target'), ok(a.to_target) ? (a.to_target <= 0 ? 'reached' : usd(a.to_target)) : '—', prof != null && tgt ? prof / tgt : 0, 'acc', `${susd(prof)} of +${usd(tgt)}${E ? ` · ≈ ${E.n} more session${E.n > 1 ? 's' : ''} at the backtest pace (${usd(E.ps)} a session)` : ''}`, k + '-tgt')}
      ${gauge(tip('Daily loss'), `${usd(used)} of ${usd(dll)}`, used / dll, used / dll > 0.75 ? 'bad' : used / dll > 0.4 ? 'warn' : 'good', used >= dll ? 'limit reached: no new trade today' : `${usd(dll - used)} left today`, k + '-dll')}
      ${S.n < 100 ? `<p class="rc-scw">${esc(S.why.join(' · '))}</p>` : ''}
      <div class="rc-f"><button type="button" class="rc-btn" ${goA(o, pageOf(k))}>Open ${NAMES[k]}</button><button type="button" class="rc-btn" ${goA(o, 'real')}>Real results</button></div>
    </section>`;
  }
  function slot3(o) {
    return `<section class="rc-card rc-slot rc-tilt" aria-label="BLITZ 25K (not set up)"><div class="rc-h"><div class="rc-eye">BLITZ · 25K<em>the scalper · paper until its 25K is set</em></div>${chip('no account', '')}</div>
      <p class="rc-note">BLITZ trades on paper only until its own MFFU 25K is set on the Start page (BLITZ · 25K) and you arm it. Nothing routes here until then.</p>
      <div class="rc-f"><button type="button" class="rc-btn" ${goA(o, 'mission')}>Mission Control</button></div></section>`;
  }
  function conflict(B) {
    const L = accOf(B, 'lit'), A = accOf(B, 'atlas');
    const d = (p) => (p ? ((p.side || '') === 'LONG' || +p.dir > 0 ? 1 : -1) : 0);
    if (L && A && L.position && A.position && d(L.position) !== d(A.position)) return { k: 'bad', t: `Opposite positions now: Zlarior ${L.position.side || ''} and ATLAS ${A.position.side || ''}. They cancel each other out; check Bot Control.` };
    const td = today(B), R = realRows(B).filter((r) => String(r.day) === td);
    const sides = (k) => new Set(R.filter((r) => r.acct === k).map((r) => r.side));
    const ls = sides('lit'), as = sides('atlas');
    if ([...ls].some((s) => as.size && !as.has(s))) return { k: 'warn', t: `Today Zlarior traded ${[...ls].join('/')} and ATLAS ${[...as].join('/')}: opposite directions on the same day (not at the same time).` };
    return { k: 'good', t: 'No conflict: the accounts are not on opposite sides (ATLAS never enters against an open Zlarior trade).' };
  }
  function events(B) {
    const td = today(B), ev = [];
    for (const k of AKS(B)) {
      const a = accOf(B, k); if (!a) continue;
      for (const o of a.orders || []) {
        if (!ok(o.t) || etDay(o.t) !== td) continue;
        const who = NAMES[k] + (o.src ? ' · ' + ({ ema_lon_vix: 'EMA', macd_sweep: 'MACD', sr_nyreclaim: 'S/R' }[o.src] || o.src) : '');
        if (o.side === 'exit') ev.push({ t: o.t, k: cl(o.pnl) === 'up' ? 'good' : 'bad', who, text: `exit ${KIND[String(o.reason || '').toUpperCase()] || o.reason || ''}: ${susd(o.pnl, 2)} (${o.qty ?? '?'} micros)` });
        else if (o.side === 'modify') ev.push({ t: o.t, k: '', who, text: 'stop moved (breakeven)' });
        else if (o.ok === false) ev.push({ t: o.t, k: refused(a).includes(o) ? 'bad' : 'warn', who, text: `${o.side} ${o.qty ?? '?'} micros: ${refused(a).includes(o) ? 'REFUSED' : 'sent, fill came later'}${o.error ? ' · ' + o.error : ''}` });
        else ev.push({ t: o.t, k: 'acc', who, text: `${o.side === 'buy' ? 'BUY' : 'SELL'} ${o.qty ?? '?'} micros sent and accepted` });
      }
    }
    for (const c of checksOf(B)) ev.push({ t: null, k: 'warn', who: NAMES[c.acct], text: 'Ledger check: ' + c.text });
    return ev.sort((x, y) => (+y.t || 9e12) - (+x.t || 9e12));
  }
  function eventsCard(B) {
    const E = events(B);
    return `<section class="rc-card rc-ev" aria-label="What happened today"><div class="rc-h"><div class="rc-eye">What happened today<em>orders, fills, exits, checks · newest first</em></div></div>
      ${E.length ? `<ul class="rc-evl">${E.slice(0, 14).map((e) => `<li class="${e.k}"><span class="mono">${e.t ? hm(e.t) : '!'}</span><b>${esc(e.who)}</b><span>${esc(e.text)}</span></li>`).join('')}</ul>` : '<p class="rc-note">Nothing yet today: no order sent on either account.</p>'}</section>`;
  }
  function checkBanners(B) {
    return checksOf(B).map((c) => `<div class="rc-ban warn"><i></i><span><b>Ledger check (${esc(NAMES[c.acct] || c.acct)}):</b> ${esc(c.text)}</span></div>`).join('');
  }
  function today_(B, o) {
    css(); o = o || {};
    if (!B || B.error) return `<section class="rc-wrap"><p class="rc-note">${esc((B && B.error) || 'Waiting for the PC bot\'s first report.')}</p></section>`;
    const C = conflict(B), age = ok(B.data_t) ? nowS() - B.data_t : null;
    return `<section class="rc-wrap rc-today" aria-label="Today on the real accounts">
      <div class="rc-hd"><div><div class="rc-eyeb">Today · real accounts</div><h2>${esc(new Date(today(B) + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }))}</h2></div>
        <span class="rc-age ${age != null && age > 900 ? 'warn' : ''}">data <b data-bd-age="${esc(B.data_t || '')}">${age != null ? esc(dur(age)) : '—'}</b> old · real $ only</span></div>
      ${checkBanners(B)}
      <div class="rc-grid">${card(B, 'lit', o)}${card(B, 'atlas', o)}${accOf(B, 'blitz') ? card(B, 'blitz', o) : slot3(o)}</div>
      <div class="rc-ban ${C.k}"><i></i><span><b>LIT vs ATLAS:</b> ${esc(C.t)}</span></div>
      ${eventsCard(B)}
    </section>`;
  }

  // ---------------------------------------------------------------- Safety card (Home)
  function safety(B, o) {
    css(); o = o || {};
    if (!B || B.error) return '';
    const H = {}; for (const x of ((B.health || {}).items || [])) H[x.key] = x;
    const row = (lv, k, v, sub) => `<div class="rc-sr ${lv}"><i></i><span>${k}</span><b>${v}</b>${sub ? `<em>${sub}</em>` : ''}</div>`;
    const lvOf = (x) => (!x ? 'idle' : x.ok === false ? 'bad' : x.warn ? 'warn' : x.ok ? 'good' : 'idle');
    const rows = [];
    for (const k of AKS(B)) {
      const a = accOf(B, k); if (!a) continue;
      const P = PLAN[k], rf = ok(a.room_frac) ? a.room_frac : null, chk = checksOf(B, k);
      rows.push(row(rf == null ? 'idle' : rf < 0.25 ? (chk.length ? 'warn' : 'bad') : rf < 0.5 ? 'warn' : 'good', `${NAMES[k]} floor`, usd(a.room) + ' left', chk.length ? 'ledger check open' : `floor ${usd(a.floor)}`));
      const used = ok(a.dll_used) ? +a.dll_used : Math.max(0, -Math.min(0, +a.today_pnl || 0)), dll = a.dll || P.dll;
      rows.push(row(used >= dll ? 'bad' : used / dll > 0.5 ? 'warn' : 'good', `${NAMES[k]} daily loss`, `${usd(used)} / ${usd(dll)}`));
      const O = (a.orders || []).filter((x) => ok(x.t) && etDay(x.t) === today(B) && x.side !== 'exit' && x.side !== 'modify'), rf2 = refused(a).filter((x) => etDay(x.t) === today(B));
      rows.push(row(rf2.length ? 'bad' : 'good', `${NAMES[k]} orders`, O.length ? `${O.length - rf2.length} of ${O.length} confirmed` : 'none today', rf2.length ? esc(rf2[0].error || 'refused') : ''));
    }
    const C = conflict(B);
    rows.push(row(C.k, 'LIT vs ATLAS', C.k === 'good' ? 'no conflict' : C.k === 'bad' ? 'opposite now' : 'opposite today'));
    for (const [k, lab] of [['nt', 'NinjaTrader'], ['age_1m_s', 'Feed (1m bars)'], ['clock', 'PC clock'], ['heartbeat', 'Check-in'], ['error', 'Last error'], ['poll_ms', 'Poll time']]) if (H[k]) rows.push(row(lvOf(H[k]), lab, esc(H[k].value), esc(H[k].fix || '')));
    const bad = rows.filter((r) => r.includes('rc-sr bad')).length, warn = rows.filter((r) => r.includes('rc-sr warn')).length;
    return `<section class="rc-wrap"><section class="rc-card rc-safe" aria-label="Safety"><div class="rc-h"><div class="rc-eye">Safety<em>floors, daily loss, orders, NinjaTrader, feed, clock</em></div>${chip(bad ? `${bad} red` : warn ? `${warn} to watch` : 'all green', bad ? 'bad' : warn ? 'warn' : 'good')}</div>
      <div class="rc-srs">${rows.join('')}</div>
      <div class="rc-f">${o.where === 'pc' ? `<button type="button" class="rc-btn bad" ${goA(o, 'botctl')}>Kill switch (Bot Control)</button>` : '<span class="rc-note">Kill switch: on the PC, Bot Control > HOLD TO KILL (this app is read-only).</span>'}<button type="button" class="rc-btn" ${goA(o, 'board')}>Live board</button></div></section></section>`;
  }

  // ---------------------------------------------------------------- Results page
  const F = { acct: 'all', open: null };
  function stats(R) {
    const C = R.filter((r) => !r.open && ok(r.usd));
    const w = C.filter((r) => r.usd > 0), l = C.filter((r) => r.usd < 0);
    const gw = w.reduce((s, r) => s + +r.usd, 0), gl = -l.reduce((s, r) => s + +r.usd, 0);
    let cur = 0, curK = '', maxL = 0, maxW = 0, run = 0, runK = '';
    for (const r of C) { const k = r.usd > 0 ? 'W' : r.usd < 0 ? 'L' : 'B'; if (k === runK) run++; else { runK = k; run = 1; } if (k === 'L') maxL = Math.max(maxL, run); if (k === 'W') maxW = Math.max(maxW, run); }
    cur = run; curK = runK;
    const Rs = C.filter((r) => ok(r.r)).map((r) => +r.r);
    return { n: C.length, open: R.length - C.length, wins: w.length, losses: l.length, win: C.length ? 100 * w.length / C.length : null, net: gw - gl,
      pf: gl ? gw / gl : w.length ? Infinity : null, avgW: w.length ? gw / w.length : null, avgL: l.length ? -gl / l.length : null,
      avgR: Rs.length ? Rs.reduce((s, x) => s + x, 0) / Rs.length : null, best: C.reduce((b, r) => (!b || r.usd > b.usd ? r : b), null),
      worst: C.reduce((b, r) => (!b || r.usd < b.usd ? r : b), null), cur, curK, maxL, maxW, Rs };
  }
  const kpi = (k, v, sub, c, n) => `<div class="rc-kpi rc-tilt"><span>${k}</span><b class="${c || ''}"${cn(n)}>${v}</b>${sub ? `<em>${sub}</em>` : ''}</div>`;
  function kpis(S) {
    return `<div class="rc-kpis">${kpi('Real net', susd(S.net, 2), `${S.n} closed trade${S.n === 1 ? '' : 's'}${S.open ? ' + ' + S.open + ' open' : ''}`, cl(S.net), 'k-net-' + F.acct)}
      ${kpi('Win rate', S.win == null ? '—' : pct(S.win), `${S.wins} won · ${S.losses} lost`, '', 'k-win-' + F.acct)}${kpi('Profit factor', S.pf == null ? '—' : S.pf === Infinity ? '∞' : S.pf.toFixed(2), '', '', 'k-pf-' + F.acct)}
      ${kpi(tip('R', 'Average R'), fR(S.avgR), '', cl(S.avgR), 'k-r-' + F.acct)}${kpi('Avg win / loss', `${susd(S.avgW)} / ${susd(S.avgL)}`)}
      ${kpi('Streak now', S.curK ? `${S.cur} ${S.curK === 'W' ? 'win' : S.curK === 'L' ? 'loss' : 'BE'}${S.cur > 1 ? (S.curK === 'L' ? 'es' : 's') : ''}` : '—', `longest: ${S.maxW} won · ${S.maxL} lost in a row`)}
      ${kpi('Best / worst', `${susd(S.best && S.best.usd)} / ${susd(S.worst && S.worst.usd)}`)}</div>`;
  }
  // equity by eval session: the real line (the eval's booked days for Zlarior, its real trades for ATLAS) over the backtest
  function curve(B, k) {
    const a = accOf(B, k); if (!a) return '';
    const start = a.eval_start || (realRows(B).find((r) => r.acct === k) || {}).day;
    let pts = [[0, 0]];
    if (k === 'lit' && (a.days || []).length) {
      let c = 0; for (const [d, v] of a.days) { if (d === '0000-00-00' || (start && d < start)) continue; c += +v || 0; pts.push([sessionsBetween(start, d), c]); }
    } else {
      let c = 0; for (const r of realRows(B).filter((x) => x.acct === k && !x.open && ok(x.usd))) { c += +r.usd; pts.push([sessionsBetween(start, String(r.day)), c]); }
    }
    const nowN = Math.max(1, sessionsBetween(start, today(B)));
    const cone = k === 'lit' && B.real && B.real.cone && B.real.cone.rows ? B.real.cone.rows : null;
    const ps = perSession(B, k);
    const nMax = Math.max(10, nowN + 2, ...pts.map((p) => p[0]));
    const rows = cone ? cone.filter((r) => r[0] <= nMax) : null;
    const ys = pts.map((p) => p[1]).concat(rows ? rows.flatMap((r) => [r[1], r[5]]) : []).concat(ps ? [ps * nMax, 0] : [0]);
    const tgt = (a.target_balance || PLAN[k].start + PLAN[k].target) - PLAN[k].start, flo = -(a.mll || PLAN[k].mll);
    let lo = Math.min(...ys, flo * 0.6), hi = Math.max(...ys, tgt * 0.6); const pad = (hi - lo) * 0.08; lo -= pad; hi += pad;
    const W = 520, Hh = 230, L = 62, Rr = 10, T = 12, Bt = 24;
    const X = (n) => L + (W - L - Rr) * (n / nMax), Y = (v) => T + (Hh - T - Bt) * (1 - (v - lo) / (hi - lo || 1));
    const area = (i, j) => rows ? `M${rows.map((r) => `${X(r[0]).toFixed(1)},${Y(r[i]).toFixed(1)}`).join('L')}L${rows.slice().reverse().map((r) => `${X(r[0]).toFixed(1)},${Y(r[j]).toFixed(1)}`).join('L')}Z` : '';
    const line = (P) => P.map((p, i) => `${i ? 'L' : 'M'}${X(p[0]).toFixed(1)},${Y(p[1]).toFixed(1)}`).join('');
    const hl = (v, c, t) => v >= lo && v <= hi ? `<line x1="${L}" x2="${W - Rr}" y1="${Y(v).toFixed(1)}" y2="${Y(v).toFixed(1)}" class="${c}"/><text x="${W - Rr - 4}" y="${(Y(v) - 4).toFixed(1)}" text-anchor="end" class="rc-ax ${c}">${t}</text>` : '';
    const ticks = [flo, 0, tgt].filter((v) => v >= lo && v <= hi).map((v) => `<text x="${L - 6}" y="${(Y(v) + 4).toFixed(1)}" text-anchor="end" class="rc-ax">${esc(susd(v))}</text>`).join('');
    const xt = [0, 5, 10, 15, 20].filter((n) => n <= nMax).map((n) => `<text x="${X(n).toFixed(1)}" y="${Hh - 6}" text-anchor="middle" class="rc-ax">${n}</text>`).join('');
    const last = pts[pts.length - 1];
    let verdict = '';
    if (rows && last[0] >= 1) {
      const r = rows.find((x) => x[0] === last[0]) || rows[rows.length - 1];
      verdict = last[1] < r[1] ? ['bad', `below the backtest band (under p5 after ${last[0]} sessions): investigate`] : last[1] < r[2] ? ['warn', `in the lower part of the band (p5-p25 after ${last[0]} sessions): a normal bad stretch, watch it`] : last[1] > r[4] ? ['good', `above the middle of the band (over p75)`] : ['good', `inside the middle of the backtest band (p25-p75)`];
    } else if (ps && last[0] >= 1) {
      const e = ps * last[0];
      verdict = last[1] >= e ? ['good', `at or above the backtest pace (${susd(e)} expected after ${last[0]} sessions)`] : ['warn', `under the backtest pace (${susd(e)} expected after ${last[0]} sessions); few trades so far, so this says little yet`];
    }
    // depth: the real line floats over the chart (a soft shadow below it, a neon glow around it, a lit area down to $0)
    const id = 'rcq' + esc(k), lp = line(pts), z = Y(Math.max(lo, Math.min(hi, 0))).toFixed(1), up = last[1] >= 0;
    const fillD = `${lp}L${X(last[0]).toFixed(1)},${z}L${X(pts[0][0]).toFixed(1)},${z}Z`;
    return `<figure class="rc-fig"><div class="rc-plot"><svg viewBox="0 0 ${W} ${Hh}" role="img" aria-label="${NAMES[k]} real equity by session vs the backtest">
      <defs><linearGradient id="${id}a" x1="0" y1="${up ? 0 : 1}" x2="0" y2="${up ? 1 : 0}"><stop offset="0" class="rc-s0"/><stop offset="1" class="rc-s1"/></linearGradient>
        <linearGradient id="${id}b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="rc-s2"/><stop offset="1" class="rc-s3"/></linearGradient>
        <filter id="${id}g" x="-10%" y="-30%" width="120%" height="160%"><feGaussianBlur stdDeviation="3.5"/></filter></defs>
      ${rows ? `<path d="${area(1, 5)}" class="rc-b1" fill="url(#${id}b)"/><path d="${area(2, 4)}" class="rc-b2"/><path d="${line(rows.map((r) => [r[0], r[3]]))}" class="rc-p50"/>` : ''}
      ${!rows && ps ? `<path d="M${X(0)},${Y(0)}L${X(nMax)},${Y(ps * nMax)}" class="rc-p50"/>` : ''}
      ${hl(0, 'rc-zero', '')}${hl(tgt, 'rc-tgt', 'target')}${hl(flo, 'rc-flo', 'floor')}
      <path d="${fillD}" class="rc-area" fill="url(#${id}a)"/><path d="${lp}" pathLength="100" class="rc-real-sh" transform="translate(0 9)" filter="url(#${id}g)"/>
      <path d="${lp}" pathLength="100" class="rc-real-gl" filter="url(#${id}g)"/><path d="${lp}" pathLength="100" class="rc-real"/>${pts.map((p, i) => `<circle cx="${X(p[0]).toFixed(1)}" cy="${Y(p[1]).toFixed(1)}" r="${i === pts.length - 1 ? 4.5 : 3}" class="rc-dot${i === pts.length - 1 ? ' last' : ''}"/>`).join('')}
      <circle cx="${X(last[0]).toFixed(1)}" cy="${Y(last[1]).toFixed(1)}" r="9" class="rc-halo"/>
      ${ticks}${xt}</svg></div>
      <figcaption><span class="rc-ax-l">x: eval session · y: $ since the eval start</span><span class="rc-lg real"></span>real ${susd(last[1], 2)} after ${last[0]} session${last[0] === 1 ? '' : 's'} ${rows ? `<span class="rc-lg band"></span>${tip('Backtest band', 'backtest band')}` : ps ? '<span class="rc-lg pace"></span>backtest pace' : ''}
        ${verdict ? `<b class="rc-vd ${verdict[0]}">${esc(verdict[1])}</b>` : ''}</figcaption></figure>`;
  }
  function vsBacktest(B, k, S) {
    const P = ((B.progress || {})[k]) || {}, E = P.expected || {}, A = P.actual || {}, O = ((P.odds || {}).rows || {}).H2;
    const a = accOf(B, k) || {};
    const wk = Math.max(1, sessionsBetween(a.eval_start || today(B), today(B))) / 5;
    const tpw = S.n / wk;
    return `<div class="rc-vs">${kpi('Backtest $ / month', usd(E.per_month), esc(E.src ? E.src.split(',')[0] : '2026 H2'), '', k + '-btm')}${kpi('Real pace $ / month', susd(A.per_month_pace), `${A.sessions ?? '—'} session${A.sessions === 1 ? '' : 's'} so far`, cl(A.per_month_pace), k + '-pace')}
      ${kpi('Trades a week', `${ok(tpw) ? tpw.toFixed(1) : '—'} real`, `backtest ${E.trades_per_week ?? '—'} · goal ${k === 'lit' ? '2-4' : '3-4'}`)}${O ? kpi('2-week eval odds', `${O.p10}% pass`, `${O.f10}% fail in 10 sessions · median ${O.pass_med}`) : ''}</div>`;
  }
  function daily(B, R) {
    const by = new Map();
    for (const r of R) if (!r.open && ok(r.usd)) by.set(String(r.day), (by.get(String(r.day)) || 0) + +r.usd);
    const D = [...by.entries()].sort((x, y) => (x[0] < y[0] ? -1 : 1)).slice(-20);
    if (!D.length) return '<p class="rc-note">No closed real trade yet.</p>';
    const m = Math.max(...D.map((d) => Math.abs(d[1])), 1);
    return `<div class="rc-days">${D.map(([d, v]) => `<div class="rc-day" title="${esc(d)} ${esc(susd(v, 2))}"><div class="rc-dcol"><i class="${v >= 0 ? 'up' : 'dn'}" style="height:${(Math.abs(v) / m * 100).toFixed(0)}%"></i></div><b class="${cl(v)}">${esc(susd(v))}</b><em>${esc(new Date(d + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' }))}</em></div>`).join('')}</div>`;
  }
  function rdist(S) {
    const bins = [['≤ −1R', (x) => x <= -0.95], ['−1 to 0', (x) => x > -0.95 && x < -0.05], ['BE', (x) => Math.abs(x) <= 0.05], ['0 to 2R', (x) => x > 0.05 && x < 2], ['2 to 6R', (x) => x >= 2 && x < 6], ['≥ 6R', (x) => x >= 6]];
    const n = bins.map(([, f]) => S.Rs.filter(f).length), m = Math.max(1, ...n);
    return `<div class="rc-rd">${bins.map(([l], i) => `<div><span>${l}</span><div class="rc-rdb"><i class="${i < 2 ? 'dn' : i > 2 ? 'up' : ''}" style="width:${(n[i] / m * 100).toFixed(0)}%"></i></div><b>${n[i]}</b></div>`).join('')}</div>`;
  }
  function byStrat(R) {
    const g = new Map();
    for (const r of R) { if (r.open || !ok(r.usd)) continue; const k = NAMES[r.acct] + (r.member ? ' · ' + r.member : ''); const x = g.get(k) || { n: 0, w: 0, net: 0 }; x.n++; if (r.usd > 0) x.w++; x.net += +r.usd; g.set(k, x); }
    if (!g.size) return '<p class="rc-note">No closed real trade yet.</p>';
    return `<table class="rc-t"><thead><tr><th>Strategy</th><th class="r">Trades</th><th class="r">Win</th><th class="r">Net (real)</th></tr></thead><tbody>${[...g.entries()].sort((x, y) => y[1].net - x[1].net).map(([k, x]) => `<tr><td>${esc(k)}</td><td class="r">${x.n}</td><td class="r">${pct(100 * x.w / x.n)}</td><td class="r mono ${cl(x.net)}">${susd(x.net, 2)}</td></tr>`).join('')}</tbody></table>`;
  }
  function weekCard(B, R) {
    const td = today(B), d = new Date(td + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
    const mon = d.toISOString().slice(0, 10), W = R.filter((r) => String(r.day) >= mon), S = stats(W);
    const G = (B.progress || {});
    const line = (k) => { const w = (G[k] || {}).week || {}; const n = W.filter((r) => r.acct === k).length; return `${NAMES[k]} ${n} trade${n === 1 ? '' : 's'} (goal ${w.lo ?? 2}-${w.hi ?? 4})`; };
    const grade = S.n === 0 ? ['—', 'no real trade yet this week'] : S.net > 0 && S.win >= 40 ? ['A', 'green week'] : S.net > 0 ? ['B', 'green, few wins'] : S.losses <= 2 ? ['C', 'small red: normal for 1-2 stop-outs'] : ['D', 'red week: read the trade reviews'];
    return `<div class="rc-week"><div class="rc-grade rc-tilt ${S.net > 0 ? 'good' : S.n ? 'warn' : ''}"><b class="rc-pop">${grade[0]}</b><span>${esc(grade[1])}</span></div>
      <div class="rc-wk">${kpi('This week (real)', susd(S.net, 2), `since Mon ${esc(mon.slice(5))}`, cl(S.net), 'k-wk-' + F.acct)}${kpi('Trades', String(S.n), esc(line('lit') + ' · ' + line('atlas')))}${kpi('Win rate', S.win == null ? '—' : pct(S.win))}</div></div>`;
  }
  function incidents(B) {
    const out = [];
    for (const k of AKS(B)) { const a = accOf(B, k); if (!a) continue; for (const o of refused(a)) out.push({ t: o.t, k, text: `${o.side} ${o.qty ?? '?'} micros REFUSED${o.error ? ': ' + o.error : ''}` }); }
    for (const c of checksOf(B)) out.push({ t: null, k: c.acct, text: 'Ledger check: ' + c.text });
    if (!out.length) return '<p class="rc-note">No refused order and no ledger question. Restarts and NinjaTrader messages are in the Bot log (PC).</p>';
    return `<ul class="rc-evl">${out.map((e) => `<li class="bad"><span class="mono">${e.t ? dhm(e.t) : '!'}</span><b>${esc(NAMES[e.k])}</b><span>${esc(e.text)}</span></li>`).join('')}</ul>`;
  }
  function timeline(B, r) {
    const a = accOf(B, r.acct) || {};
    const O = (a.orders || []).filter((o) => o.entry_t === r.entry_t).sort((x, y) => x.t - y.t);
    const st = [['Signal (bar)', r.entry_t]];
    for (const o of O) st.push([o.side === 'exit' ? `Exit booked (${how({ exit: o.reason })})` : o.side === 'modify' ? 'Stop to breakeven' : `${o.side === 'buy' ? 'Buy' : 'Sell'} order sent${o.ok === false ? ' (fill reported later)' : ''}`, o.t]);
    if (ok(r.exit_t) && !O.some((o) => o.side === 'exit')) st.push([`Exit (${how(r)})`, r.exit_t]);
    st.sort((x, y) => x[1] - y[1]);
    return `<ol class="rc-tl">${st.map(([l, t], i) => `<li><b>${esc(l)}</b><span class="mono">${hm(t)} ET</span>${i ? `<em>+${esc(dur(t - st[i - 1][1]))}</em>` : ''}</li>`).join('')}</ol>
      <p class="rc-note">Held ${ok(r.exit_t) ? esc(dur(r.exit_t - r.entry_t)) : 'open'} · stop ${px(r.stop)} · target ${px(r.target)}${ok(r.stop) && ok(r.entry) ? ` · risk ${Math.abs(r.entry - r.stop).toFixed(2)} pts = ${usd(Math.abs(r.entry - r.stop) * 2 * (+r.qty || 0))}` : ''}</p>`;
  }
  function log(B, R) {
    if (!R.length) return '<p class="rc-note">No real trade yet. The first one shows here the moment the bot closes it.</p>';
    let run = 0;
    const rows = R.map((r) => { if (!r.open && ok(r.usd)) run += +r.usd; return { ...r, run }; }).reverse();
    return `<div class="rc-log">${rows.map((r, i) => `<div class="rc-lr rc-n-${esc(r.acct)}${F.open === i ? ' on' : ''}"><button type="button" class="rc-lrh" data-rc-row="${i}" aria-expanded="${F.open === i}">
        <span class="mono rc-ld">${esc(dhm(r.entry_t) || r.day)}</span><span class="rc-la"><b>${esc(NAMES[r.acct] || r.acct)}${r.member ? ' · ' + esc(r.member) : ''}</b> ${chip(r.side || '', r.side === 'LONG' ? 'good' : 'bad')}</span>
        <span class="mono rc-lq">${esc(r.qty ?? '?')} × ${px(r.entry)} → ${r.open ? 'open' : px(r.exit_px)}</span><span class="rc-lh">${esc(how(r))} <em class="${cl(r.r)}">${fR(r.r)}</em></span>
        <b class="mono rc-lu ${cl(r.usd)}">${r.open ? 'open' : susd(r.usd, 2)}</b><span class="mono rc-lrun ${cl(r.run)}">${susd(r.run, 2)}</span></button>
        ${F.open === i ? `<div class="rc-lrb">${timeline(B, r)}</div>` : ''}</div>`).join('')}</div>`;
  }
  const H3 = (t, s) => `<h3 class="rc-sec">${esc(t)}${s ? ` <span>${esc(s)}</span>` : ''}</h3>`;
  function results(B, o) {
    css(); o = o || {};
    if (!B || B.error) return `<section class="rc-wrap"><p class="rc-note">${esc((B && B.error) || 'No data yet.')}</p></section>`;
    const all = realRows(B), R = all.filter((r) => F.acct === 'all' || r.acct === F.acct), S = stats(R);
    const seg = `<div class="rc-seg" role="tablist">${[['all', AKS(B).length > 2 ? 'All accounts' : 'Both accounts'], ['lit', 'Zlarior 50K'], ['atlas', 'ATLAS 25K']].concat(accOf(B, 'blitz') ? [['blitz', 'BLITZ 25K']] : []).map(([v, l]) => `<button type="button" role="tab" data-rc-acct="${v}" aria-selected="${F.acct === v}" class="${F.acct === v ? 'on' : ''}">${l}</button>`).join('')}</div>`;
    const ks = F.acct === 'all' ? AKS(B) : [F.acct];
    return `<section class="rc-wrap rc-res">${checkBanners(B)}
      <div class="rc-tb">${seg}<button type="button" class="rc-btn" data-rc-csv="1">Export real trades (CSV)</button></div>
      ${kpis(S)}
      ${H3('This week', 'report card')}<section class="rc-card">${weekCard(B, R)}</section>
      ${H3('Live vs backtest', 'is the real account on track?')}<div class="rc-grid2">${ks.map((k) => `<section class="rc-card rc-n-${k} rc-tilt"><div class="rc-h"><div class="rc-eye"><i class="rc-dotn"></i>${NAMES[k]} · ${PLAN[k].size}</div></div>${vsBacktest(B, k, stats(all.filter((r) => r.acct === k)))}${curve(B, k)}</section>`).join('')}</div>
      <div class="rc-grid2"><section class="rc-card rc-tilt"><div class="rc-h"><div class="rc-eye">Daily P&L (real)<em>last 20 trading days with a trade</em></div></div>${daily(B, R)}</section>
        <section class="rc-card rc-tilt"><div class="rc-h"><div class="rc-eye">${tip('R', 'R')} distribution<em>closed real trades</em></div></div>${rdist(S)}</section></div>
      <div class="rc-grid2"><section class="rc-card rc-tilt"><div class="rc-h"><div class="rc-eye">$ by strategy<em>real money only</em></div></div>${byStrat(R)}</section>
        <section class="rc-card rc-tilt"><div class="rc-h"><div class="rc-eye">Incidents<em>refused orders, ledger questions</em></div></div>${incidents(B)}</section></div>
      ${H3('Real trade log', 'newest first · tap a trade for its timeline · running P&L on the right')}<section class="rc-card">${log(B, R)}</section>
      <p class="rc-src">Real = the PC bot's ledger and NinjaTrader's fills on the MFFU accounts (engine/live_board.py "real"). Paper runs are never mixed in. Backtest: ${esc(((B.real || {}).cone || {}).src || '2026 H2')}; ATLAS research/second/atlas.json.</p></section>`;
  }

  // ---------------------------------------------------------------- CSV + wiring
  const COLS = ['day', 'entry_et', 'exit_et', 'account', 'member', 'side', 'qty', 'entry', 'stop', 'target', 'exit_px', 'exit', 'r', 'usd', 'running_usd'];
  function csv(rows) {
    const q = (v) => { const s = v == null ? '' : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
    let run = 0;
    const out = (rows || []).map((r) => { if (!r.open && ok(r.usd)) run += +r.usd; return { ...r, entry_et: dhm(r.entry_t), exit_et: dhm(r.exit_t), account: NAMES[r.acct] || r.acct, running_usd: run.toFixed(2) }; });
    return [COLS.join(','), ...out.map((r) => COLS.map((c) => q(r[c])).join(','))].join('\n');
  }
  function download(name, text, o) {
    if (o && o.download) return o.download(name, text);
    try { const b = new Blob([text], { type: 'text/csv' }), u = URL.createObjectURL(b), a = document.createElement('a'); a.href = u; a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(u); a.remove(); }, 1500); } catch (e) { /* nothing more to try */ }
  }
  function wire(root, B, o) {
    if (!root || !B) return;
    o = o || {};
    root.querySelectorAll('[data-rc-acct]').forEach((b) => { b.onclick = () => { F.acct = b.dataset.rcAcct; F.open = null; redraw(root, B, o); }; });
    root.querySelectorAll('[data-rc-row]').forEach((b) => { b.onclick = () => { const i = +b.dataset.rcRow; F.open = F.open === i ? null : i; redraw(root, B, o); }; });
    root.querySelectorAll('[data-rc-csv]').forEach((b) => { b.onclick = () => download(`real_trades_${today(B)}.csv`, csv(realRows(B).filter((r) => F.acct === 'all' || r.acct === F.acct)), o); });
    if (window.BoardUI && window.BoardUI.tick) window.BoardUI.tick(root);
    try { fx(root); } catch (e) { /* the look only: the numbers are already on the page */ }
  }
  function redraw(root, B, o) {
    const host = root.classList && root.classList.contains('rc-host') ? root : root.querySelector('.rc-host') || root;
    const y = window.scrollY;
    host.innerHTML = results(B, o); wire(host, B, o); window.scrollTo(0, y);
  }

  // ---------------------------------------------------------------- the trade pictures say REAL next to a paper figure
  let LAST = null;
  function hookPics() {
    if (!window.TradePics || window.TradePics.realOf) return;
    window.TradePics.realOf = (x) => {
      if (!LAST || !x || x.src === 'live' || x.example) return '';
      const acct = /^(ema_lon_vix|macd_sweep|sr_nyreclaim)$/.test(x.key || '') ? 'atlas' : x.key === 'lit' ? 'lit' : null;
      if (!acct) return '';
      const m = realOf({ acct, side: x.side, entry_t: x.entry_t, day: etDay(x.entry_t), src: 'paper' }, LAST);
      return m ? m.text : '';
    };
  }
  function remember(B) { if (B && !B.error) LAST = B; hookPics(); }
  hookPics();

  // ---------------------------------------------------------------- depth + motion (presentation only, 2026-10-28 owner:
  // "make it look sick, very 3D"): cards rise in, numbers count up, the health ring and the gauges sweep in, cards tilt
  // toward the mouse with a light that follows it. Everything is off with reduced motion / Motion off and on touch screens
  // (no tilt there); the numbers are always the final ones in the HTML, the animation only plays them in.
  const still = () => { try { return document.documentElement.dataset.motion === 'off' || (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { return true; } };
  const SEEN = {}, NUM = {};
  const NUMRE = /^([^\d]*?)(\d[\d,]*(?:\.\d+)?)([\s\S]*)$/;
  function countUp(el, fresh) {
    const key = el.getAttribute('data-rc-n'), txt = el.textContent, m = txt.match(NUMRE);
    if (!m) { delete NUM[key]; return; }
    const to = parseFloat(m[2].replace(/,/g, '')), dec = (m[2].split('.')[1] || '').length;
    const from = fresh || !(key in NUM) ? 0 : NUM[key];
    NUM[key] = to;
    if (from === to || !isFinite(to)) return;
    const f = (v) => m[1] + v.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec }) + m[3];
    const t0 = performance.now(), D = fresh ? 1100 : 700;
    el.textContent = f(from);
    const step = (now) => {
      if (!el.isConnected) return;
      const q = Math.min(1, (now - t0) / D), e = 1 - Math.pow(1 - q, 3);
      el.textContent = q < 1 ? f(from + (to - from) * e) : txt;
      if (q < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  function fx(root) {
    const w = root.matches && root.matches('.rc-wrap') ? root : root.querySelector('.rc-wrap');
    if (!w) return;
    const kind = w.classList.contains('rc-res') ? 'res' : 'today', now = Date.now();
    const fresh = !SEEN[kind] || now - SEEN[kind] > 60000;   // a refresh (every 15-30 s) keeps still; a new visit plays in
    SEEN[kind] = now;
    if (still()) { root.querySelectorAll('[data-rc-n]').forEach((el) => { const m = el.textContent.match(NUMRE); if (m) NUM[el.getAttribute('data-rc-n')] = parseFloat(m[2].replace(/,/g, '')); }); return; }
    if (fresh) root.querySelectorAll('.rc-wrap').forEach((x) => { x.classList.add('rc-enter'); setTimeout(() => x.classList.remove('rc-enter'), 2200); });
    root.querySelectorAll('[data-rc-n]').forEach((el) => countUp(el, fresh));
  }
  // tilt: one pointer listener for every real-account card on the page (mouse only; the outermost .rc-tilt under it)
  let tiltOn = false;
  function tiltInit() {
    if (tiltOn || typeof document === 'undefined' || !document.addEventListener || !window.matchMedia || !window.requestAnimationFrame) return;
    tiltOn = true;
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)');
    let cur = null, ev = null, raf = 0;
    const reset = (c) => { c.classList.remove('rc-tilting'); for (const p of ['--rx', '--ry', '--px', '--py', '--mx', '--my']) c.style.removeProperty(p); };
    const frame = () => {
      raf = 0;
      const e = ev, t = e && e.target && e.target.closest ? e.target : null;
      let c = t ? t.closest('.rc-tilt') : null, up;
      while (c && c.parentElement && (up = c.parentElement.closest('.rc-tilt'))) c = up;
      if (cur && cur !== c) reset(cur);
      cur = c;
      if (!c) return;
      const r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      const k = 7 * Math.min(1, 340 / Math.max(r.width, r.height));   // small cards tilt up to 7 deg, wide ones less
      c.classList.add('rc-tilting');
      c.style.setProperty('--ry', ((x - 0.5) * k).toFixed(2) + 'deg'); c.style.setProperty('--rx', ((0.5 - y) * k).toFixed(2) + 'deg');
      c.style.setProperty('--px', ((x - 0.5) * 2).toFixed(3)); c.style.setProperty('--py', ((y - 0.5) * 2).toFixed(3));
      c.style.setProperty('--mx', (x * 100).toFixed(1) + '%'); c.style.setProperty('--my', (y * 100).toFixed(1) + '%');
    };
    document.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse' || !fine.matches || still()) { if (cur) { reset(cur); cur = null; } return; }
      ev = e; if (!raf) raf = requestAnimationFrame(frame);
    }, { passive: true });
    document.documentElement.addEventListener('pointerleave', () => { if (cur) { reset(cur); cur = null; } }, { passive: true });
  }

  const CSS = `.rc-wrap{--rc-line:var(--line,var(--nx-line,rgba(160,170,220,.16)));--rc-s2:var(--surface-2,rgba(127,127,127,.08));--rc-s3:var(--surface-3,rgba(127,127,127,.15));
--rc-ink:var(--ink,var(--text,inherit));--rc-ink2:var(--ink-2,var(--text-2,#a9b1c3));--rc-mut:var(--muted,#7a8396);--rc-good:var(--good,#22c58b);--rc-bad:var(--bad,#f0506e);--rc-warn:var(--warn,#e8a93a);--rc-acc:var(--accent,#6d7cff);
display:flex;flex-direction:column;gap:12px;min-width:0;color:var(--rc-ink)}
.rc-wrap *{box-sizing:border-box}.rc-wrap .mono{font-family:var(--mono,ui-monospace,monospace);font-variant-numeric:tabular-nums}.rc-wrap .up{color:var(--rc-good)}.rc-wrap .dn{color:var(--rc-bad)}
.rc-hd{display:flex;justify-content:space-between;align-items:flex-end;gap:8px;flex-wrap:wrap}.rc-hd h2{margin:2px 0 0;font-size:22px;line-height:1.2;font-weight:700}
.rc-eyeb{font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--rc-acc)}.rc-age{font-size:12.5px;color:var(--rc-mut)}.rc-age.warn b{color:var(--rc-warn)}
.rc-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr) minmax(0,.62fr);gap:12px;align-items:start}
@media (max-width:1180px){.rc-grid{grid-template-columns:minmax(0,1fr) minmax(0,1fr)}.rc-slot{grid-column:1 / -1}}
@media (max-width:720px){.rc-grid{grid-template-columns:minmax(0,1fr)}}
.rc-grid2{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,380px),1fr));gap:12px}
.rc-card{min-width:0;border:1px solid var(--rc-line);border-radius:16px;padding:14px 16px;background:var(--surface,var(--card,transparent));display:flex;flex-direction:column;gap:10px}
.rc-acct.bad{border-color:color-mix(in srgb,var(--rc-bad) 45%,var(--rc-line))}
.rc-slot{border-style:dashed;background:transparent;opacity:.9}
.rc-h{display:flex;justify-content:space-between;align-items:flex-start;gap:8px;flex-wrap:wrap}.rc-eye{font-size:13px;font-weight:700;letter-spacing:.02em}.rc-eye em{display:block;font-style:normal;font-weight:500;font-size:11.5px;color:var(--rc-mut);margin-top:1px}
.rc-chips{display:flex;gap:4px;flex-wrap:wrap;justify-content:flex-end}
.rc-chip{display:inline-flex;align-items:center;height:22px;padding:0 9px;border-radius:99px;font-size:11px;font-weight:700;letter-spacing:.02em;background:var(--rc-s3);color:var(--rc-ink2);white-space:nowrap}
.rc-chip.good{background:color-mix(in srgb,var(--rc-good) 16%,transparent);color:var(--rc-good)}.rc-chip.bad{background:color-mix(in srgb,var(--rc-bad) 16%,transparent);color:var(--rc-bad)}
.rc-chip.warn{background:color-mix(in srgb,var(--rc-warn) 18%,transparent);color:var(--rc-warn)}.rc-chip.acc{background:color-mix(in srgb,var(--rc-acc) 18%,transparent);color:var(--rc-acc)}
.rc-top{display:flex;justify-content:space-between;align-items:center;gap:10px}
.rc-big span{display:block;font-size:12px;color:var(--rc-mut)}.rc-big b{display:block;font-size:30px;line-height:1.1;font-weight:800;font-variant-numeric:tabular-nums;letter-spacing:-.01em}.rc-big em{font-style:normal;font-size:12px;color:var(--rc-ink2)}
.rc-trs{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:6px}
.rc-tr{display:grid;grid-template-columns:auto minmax(0,1fr) auto;grid-template-areas:"s m u" "s h u";gap:1px 8px;align-items:center;padding:8px 10px;border-radius:12px;background:var(--rc-s2);font-size:13px}
.rc-tr>.rc-chip{grid-area:s}.rc-trm{grid-area:m;min-width:0}.rc-trm em{font-style:normal;color:var(--rc-mut);font-size:12px;margin-left:4px}.rc-trh{grid-area:h;font-size:12px;color:var(--rc-ink2)}.rc-trh em{font-style:normal}.rc-tru{grid-area:u;font-size:15px}
.rc-why{margin:0;padding:8px 10px;border-radius:12px;background:var(--rc-s2);font-size:13px;line-height:1.45;color:var(--rc-ink2)}.rc-why b{color:var(--rc-ink)}
.rc-pos{padding:9px 10px;border-radius:12px;border:1px solid color-mix(in srgb,var(--rc-acc) 45%,transparent);background:color-mix(in srgb,var(--rc-acc) 8%,transparent);font-size:13px;display:flex;flex-wrap:wrap;gap:6px 8px;align-items:center}
.rc-posg{display:flex;flex-wrap:wrap;gap:4px 14px;width:100%;font-size:12.5px;color:var(--rc-ink2)}.rc-posg b{font-variant-numeric:tabular-nums}.rc-posg em{font-style:normal;color:var(--rc-mut)}
.rc-kv{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.rc-kv>div{padding:8px 10px;border-radius:12px;background:var(--rc-s2);min-width:0}
.rc-kv span{display:block;font-size:11.5px;color:var(--rc-mut)}.rc-kv b{display:block;font-size:15px;font-variant-numeric:tabular-nums;overflow-wrap:anywhere}.rc-kv em{display:block;font-style:normal;font-size:11.5px;color:var(--rc-ink2)}
.rc-kv em.good{color:var(--rc-good)}.rc-kv em.warn{color:var(--rc-warn)}.rc-kv em.bad{color:var(--rc-bad)}
@media (max-width:420px){.rc-kv{grid-template-columns:minmax(0,1fr) minmax(0,1fr)}.rc-kv>div:last-child{grid-column:1 / -1}}
.rc-g{display:flex;flex-direction:column;gap:4px}.rc-gh{display:flex;justify-content:space-between;gap:8px;font-size:12.5px;color:var(--rc-ink2)}.rc-gh b{color:var(--rc-ink);font-variant-numeric:tabular-nums}.rc-gh b.dn{color:var(--rc-bad)}
.rc-gs{font-size:11.5px;color:var(--rc-mut);line-height:1.35}.rc-gs.warn{color:var(--rc-warn)}.rc-gs.warn b{color:var(--rc-warn)}
.rc-scw{margin:0;font-size:11.5px;color:var(--rc-mut)}
.rc-f{display:flex;gap:8px;flex-wrap:wrap;align-items:center}.rc-btn{min-height:40px;padding:0 14px;border-radius:11px;border:1px solid var(--rc-line);background:var(--rc-s2);color:var(--rc-ink);font:600 13px var(--sans,system-ui);cursor:pointer}
.rc-btn:hover{border-color:color-mix(in srgb,var(--rc-acc) 50%,var(--rc-line))}.rc-btn.bad{color:var(--rc-bad);border-color:color-mix(in srgb,var(--rc-bad) 40%,var(--rc-line))}
.rc-note{margin:0;font-size:12.5px;line-height:1.45;color:var(--rc-ink2)}.rc-src{margin:2px;font-size:11.5px;color:var(--rc-mut);line-height:1.4}
.rc-ban{display:flex;gap:10px;align-items:flex-start;padding:10px 12px;border-radius:12px;font-size:13.5px;line-height:1.45;border:1px solid var(--rc-line);background:var(--rc-s2)}
.rc-ban i{flex:none;width:9px;height:9px;border-radius:50%;margin-top:6px;background:var(--rc-mut)}.rc-ban.good i{background:var(--rc-good)}.rc-ban.bad i{background:var(--rc-bad)}.rc-ban.warn i{background:var(--rc-warn)}
.rc-ban.warn{border-color:color-mix(in srgb,var(--rc-warn) 45%,transparent);background:color-mix(in srgb,var(--rc-warn) 8%,transparent)}.rc-ban.bad{border-color:color-mix(in srgb,var(--rc-bad) 45%,transparent);background:color-mix(in srgb,var(--rc-bad) 9%,transparent)}
.rc-evl{list-style:none;margin:0;padding:0;display:flex;flex-direction:column}.rc-evl li{display:grid;grid-template-columns:52px minmax(70px,auto) minmax(0,1fr);gap:8px;padding:7px 2px;border-top:1px solid var(--rc-line);font-size:12.5px;align-items:baseline}
.rc-evl li:first-child{border-top:0}.rc-evl li .mono{color:var(--rc-mut)}.rc-evl li span:last-child{color:var(--rc-ink2);overflow-wrap:anywhere}.rc-evl li.bad b{color:var(--rc-bad)}.rc-evl li.good b{color:var(--rc-good)}.rc-evl li.warn b{color:var(--rc-warn)}
@media (max-width:520px){.rc-evl li{grid-template-columns:44px minmax(0,1fr)}.rc-evl li span:last-child{grid-column:2}}
.rc-srs{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,240px),1fr));gap:6px}
.rc-sr{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:2px 8px;align-items:center;padding:7px 10px;border-radius:11px;background:var(--rc-s2);font-size:12.5px}
.rc-sr i{width:8px;height:8px;border-radius:50%;background:var(--rc-mut)}.rc-sr.good i{background:var(--rc-good)}.rc-sr.bad i{background:var(--rc-bad)}.rc-sr.warn i{background:var(--rc-warn)}
.rc-sr span{color:var(--rc-ink2)}.rc-sr b{font-variant-numeric:tabular-nums;text-align:right}.rc-sr.bad b{color:var(--rc-bad)}.rc-sr em{grid-column:2 / -1;font-style:normal;font-size:11px;color:var(--rc-mut);overflow-wrap:anywhere}
.rc-tip{text-decoration:underline dotted color-mix(in srgb,var(--rc-mut) 70%,transparent);text-underline-offset:3px;cursor:help}
.rc-tb{display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:space-between}
.rc-seg{display:inline-flex;gap:2px;padding:3px;border-radius:12px;background:var(--rc-s2);border:1px solid var(--rc-line);max-width:100%;overflow-x:auto}
.rc-seg button{min-height:36px;padding:0 12px;border:0;border-radius:9px;background:none;color:var(--rc-ink2);font:600 13px var(--sans,system-ui);cursor:pointer;white-space:nowrap}.rc-seg button.on{background:var(--surface,var(--card,#1a1f2b));color:var(--rc-ink);box-shadow:0 0 0 1px var(--rc-line)}
.rc-kpis,.rc-vs,.rc-wk{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,140px),1fr));gap:8px}
.rc-kpi{padding:9px 11px;border-radius:12px;background:var(--rc-s2);min-width:0}.rc-kpi span{display:block;font-size:11.5px;color:var(--rc-mut)}.rc-kpi b{display:block;font-size:18px;font-variant-numeric:tabular-nums}.rc-kpi em{display:block;font-style:normal;font-size:11.5px;color:var(--rc-ink2);line-height:1.35}
.rc-sec{margin:8px 2px 0;font-size:13px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:var(--rc-ink2)}.rc-sec span{text-transform:none;letter-spacing:0;font-weight:500;color:var(--rc-mut);margin-left:6px}
.rc-fig{margin:0}.rc-fig svg{width:100%;height:auto;display:block}.rc-fig figcaption{display:flex;flex-wrap:wrap;gap:4px 10px;align-items:center;font-size:12px;color:var(--rc-ink2)}
.rc-p50{fill:none;stroke:var(--rc-acc);stroke-width:1.5;stroke-dasharray:4 4}
.rc-real{fill:none;stroke:var(--rc-ink);stroke-width:2.5;stroke-linejoin:round}.rc-zero{stroke:var(--rc-line);stroke-width:1}.rc-tgt{stroke:var(--rc-good);stroke-width:1;stroke-dasharray:2 3}.rc-flo{stroke:var(--rc-bad);stroke-width:1;stroke-dasharray:2 3}
.rc-ax{fill:var(--rc-mut);font-size:13px;font-family:var(--sans,system-ui)}.rc-ax-l{width:100%;font-size:11px;color:var(--rc-mut)}.rc-ax.rc-tgt{fill:var(--rc-good);stroke:none}.rc-ax.rc-flo{fill:var(--rc-bad);stroke:none}
.rc-lg{display:inline-block;width:14px;height:4px;border-radius:2px;vertical-align:middle}.rc-lg.real{background:var(--rc-ink)}.rc-lg.band{background:color-mix(in srgb,var(--rc-acc) 35%,transparent);height:8px}.rc-lg.pace{background:var(--rc-acc)}
.rc-vd{font-weight:600;font-size:12px}.rc-vd.good{color:var(--rc-good)}.rc-vd.warn{color:var(--rc-warn)}.rc-vd.bad{color:var(--rc-bad)}
.rc-days{display:flex;gap:6px;overflow-x:auto;padding-bottom:4px}.rc-day{flex:0 0 58px;display:flex;flex-direction:column;align-items:center;gap:3px;font-size:11px}.rc-day em{font-style:normal;color:var(--rc-mut)}
.rc-dcol{height:70px;width:22px;display:flex;align-items:flex-end;border-radius:6px;overflow:hidden}.rc-dcol i{display:block;width:100%}
.rc-rd{display:flex;flex-direction:column;gap:5px}.rc-rd>div{display:grid;grid-template-columns:70px minmax(0,1fr) 26px;gap:8px;align-items:center;font-size:12.5px}.rc-rd span{color:var(--rc-ink2)}.rc-rd b{text-align:right}
.rc-rdb{height:12px;border-radius:6px}.rc-rdb i{display:block;height:100%;border-radius:6px}
.rc-t{width:100%;border-collapse:collapse;font-size:13px}.rc-t th{text-align:left;color:var(--rc-mut);font-weight:600;padding:6px;border-bottom:1px solid var(--rc-line)}.rc-t td{padding:7px 6px;border-top:1px solid var(--rc-line)}.rc-t .r{text-align:right}
.rc-week{display:flex;gap:12px;align-items:center;flex-wrap:wrap}.rc-grade{flex:none;width:86px;height:86px;border-radius:18px;display:flex;flex-direction:column;align-items:center;justify-content:center;background:var(--rc-s2);text-align:center}
.rc-grade b{font-size:34px;line-height:1}.rc-grade span{font-size:10.5px;color:var(--rc-mut);padding:0 4px}.rc-grade.good b{color:var(--rc-good)}.rc-grade.warn b{color:var(--rc-warn)}.rc-wk{flex:1 1 260px}
.rc-log{display:flex;flex-direction:column}.rc-lr{border-top:1px solid var(--rc-line)}.rc-lr:first-child{border-top:0}
.rc-lrh{width:100%;display:grid;grid-template-columns:130px minmax(120px,1fr) minmax(150px,1.2fr) 110px 100px 100px;gap:8px;align-items:center;padding:9px 4px;border:0;background:none;color:var(--rc-ink);font:inherit;font-size:13px;text-align:left;cursor:pointer}
.rc-lrh:hover{background:var(--rc-s2)}.rc-ld{color:var(--rc-mut);font-size:12px}.rc-lq{color:var(--rc-ink2);font-size:12.5px}.rc-lh{font-size:12.5px;color:var(--rc-ink2)}.rc-lh em{font-style:normal}.rc-lu{text-align:right}.rc-lrun{text-align:right;font-size:12px;opacity:.85}
.rc-lr.on{background:var(--rc-s2);border-radius:12px}.rc-lrb{padding:4px 10px 12px}
@media (max-width:760px){.rc-lrh{grid-template-columns:minmax(0,1fr) auto;grid-template-areas:"a u" "d run" "q q" "h h";gap:2px 8px}.rc-la{grid-area:a}.rc-lu{grid-area:u}.rc-ld{grid-area:d}.rc-lrun{grid-area:run}.rc-lq{grid-area:q}.rc-lh{grid-area:h}}
.rc-tl{list-style:none;margin:6px 0;padding:0 0 0 14px;border-left:2px solid var(--rc-line);display:flex;flex-direction:column;gap:6px}.rc-tl li{position:relative;display:flex;flex-wrap:wrap;gap:4px 10px;font-size:12.5px}
.rc-tl li::before{content:'';position:absolute;left:-20px;top:4px;width:10px;height:10px;border-radius:50%;background:var(--rc-acc)}.rc-tl li .mono{color:var(--rc-ink2)}.rc-tl li em{font-style:normal;color:var(--rc-mut)}`;
  // depth layer (2026-10-28): frosted glass with lit edges and depth shadows, a neon colour per account (Zlarior blue,
  // ATLAS orange, Strategy 3 purple), the gauges as glowing 3D tubes, the health score as a glowing ring, the equity curve
  // floating over a perspective floor. Dark first; the light theme keeps the same depth with soft shadows and no glow on text.
  const DEPTH = `
.rc-wrap{--rc-e:cubic-bezier(.2,.8,.2,1);--rc-n-lit:#4da3ff;--rc-n-atlas:#ff9a3d;--rc-n-s3:#b47cff;--rc-neon:var(--rc-acc);
--rc-g1:color-mix(in srgb,var(--surface,#10131a) 76%,transparent);--rc-g2:color-mix(in srgb,var(--surface,#10131a) 52%,transparent);
--rc-hi:rgba(255,255,255,.09);--rc-well:rgba(0,0,0,.34);--rc-wellhi:rgba(255,255,255,.05);--rc-tile:linear-gradient(180deg,rgba(255,255,255,.05),rgba(255,255,255,.012));
--rc-sh:0 1px 0 rgba(0,0,0,.35),0 22px 44px -24px rgba(0,0,0,.85),0 46px 90px -52px rgba(0,0,0,.7);--rc-tsh:inset 0 1px 0 rgba(255,255,255,.06),0 8px 18px -12px rgba(0,0,0,.75)}
:root[data-theme="light"] .rc-wrap{--rc-n-lit:#1f6fe0;--rc-n-atlas:#d96500;--rc-n-s3:#7a4bd8;
--rc-g1:color-mix(in srgb,var(--surface,#fff) 92%,transparent);--rc-g2:color-mix(in srgb,var(--surface,#fff) 76%,transparent);
--rc-hi:rgba(255,255,255,.95);--rc-well:rgba(20,40,90,.09);--rc-wellhi:rgba(255,255,255,.8);--rc-tile:linear-gradient(180deg,rgba(255,255,255,.9),rgba(255,255,255,.4));
--rc-sh:0 1px 2px rgba(20,40,90,.07),0 16px 36px -18px rgba(20,40,90,.3),0 40px 80px -52px rgba(20,40,90,.28);--rc-tsh:inset 0 1px 0 rgba(255,255,255,.9),0 6px 14px -10px rgba(20,40,90,.3)}
.rc-wrap .rc-acct.lit,.rc-wrap .rc-n-lit,.rc-wrap .rc-seg [data-rc-acct="lit"]{--rc-neon:var(--rc-n-lit)}.rc-wrap .rc-acct.atlas,.rc-wrap .rc-n-atlas,.rc-wrap .rc-seg [data-rc-acct="atlas"]{--rc-neon:var(--rc-n-atlas)}.rc-wrap .rc-slot,.rc-wrap .rc-n-s3,.rc-wrap .rc-acct.blitz,.rc-wrap .rc-n-blitz,.rc-wrap .rc-seg [data-rc-acct="blitz"]{--rc-neon:var(--rc-n-s3)}
.rc-wrap .rc-big{min-height:0}
.rc-wrap .rc-hd h2{font-size:24px;letter-spacing:-.02em;background:linear-gradient(92deg,var(--rc-ink) 35%,color-mix(in srgb,var(--rc-ink) 50%,var(--rc-n-lit)) 72%,color-mix(in srgb,var(--rc-ink) 45%,var(--rc-n-atlas)));-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}
.rc-wrap .rc-eyeb{color:color-mix(in srgb,var(--rc-acc) 75%,var(--rc-ink));text-shadow:0 0 14px color-mix(in srgb,var(--rc-acc) 55%,transparent)}
.rc-wrap .rc-age{display:inline-flex;align-items:center;gap:8px;padding:5px 12px;border-radius:99px;border:1px solid var(--rc-line);background:var(--rc-tile),var(--rc-s2);box-shadow:var(--rc-tsh);color:var(--rc-ink2)}
.rc-wrap .rc-age::before{content:'';flex:none;width:7px;height:7px;border-radius:50%;color:var(--rc-good);background:currentColor;box-shadow:0 0 0 3px color-mix(in srgb,currentColor 22%,transparent),0 0 10px currentColor;animation:rcPulse 2.6s ease-in-out infinite}
.rc-wrap .rc-age.warn::before{color:var(--rc-warn)}
.rc-wrap .rc-card{position:relative;isolation:isolate;border-radius:18px;border-color:color-mix(in srgb,var(--rc-neon) 14%,var(--rc-line));
background:radial-gradient(120% 80% at 0% 0%,color-mix(in srgb,var(--rc-neon) 11%,transparent),transparent 58%),linear-gradient(165deg,var(--rc-g1),var(--rc-g2));
box-shadow:inset 0 1px 0 var(--rc-hi),var(--rc-sh);-webkit-backdrop-filter:blur(18px) saturate(1.35);backdrop-filter:blur(18px) saturate(1.35)}
.rc-wrap .rc-card::after{content:'';position:absolute;inset:-1px;border-radius:inherit;padding:1px;pointer-events:none;
background:linear-gradient(160deg,rgba(255,255,255,.32),color-mix(in srgb,var(--rc-neon) 50%,transparent) 15%,transparent 40%,transparent 70%,color-mix(in srgb,var(--rc-neon) 30%,transparent));
-webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask-composite:exclude;opacity:.6}
.rc-wrap .rc-card::before{content:'';position:absolute;inset:0;border-radius:inherit;pointer-events:none;z-index:-1;opacity:0;transition:opacity .35s;
background:radial-gradient(420px circle at var(--mx,50%) var(--my,0%),rgba(255,255,255,.055),color-mix(in srgb,var(--rc-neon) 7%,transparent) 32%,transparent 62%)}
.rc-wrap .rc-tilting::before{opacity:1}
.rc-wrap .rc-acct{border-color:color-mix(in srgb,var(--rc-neon) 26%,var(--rc-line));
background:linear-gradient(90deg,transparent 6%,color-mix(in srgb,var(--rc-neon) 85%,#fff) 50%,transparent 94%) top/100% 1px no-repeat,
radial-gradient(130% 85% at 0% 0%,color-mix(in srgb,var(--rc-neon) 20%,transparent),transparent 56%),radial-gradient(90% 70% at 100% 100%,color-mix(in srgb,var(--rc-neon) 9%,transparent),transparent 62%),linear-gradient(165deg,var(--rc-g1),var(--rc-g2));
box-shadow:inset 0 1px 0 var(--rc-hi),var(--rc-sh),0 30px 70px -42px color-mix(in srgb,var(--rc-neon) 90%,transparent)}
.rc-wrap .rc-acct::after{opacity:.95}
.rc-wrap .rc-acct.bad{border-color:color-mix(in srgb,var(--rc-bad) 52%,var(--rc-line));box-shadow:inset 0 1px 0 var(--rc-hi),var(--rc-sh),0 0 0 1px color-mix(in srgb,var(--rc-bad) 20%,transparent),0 30px 70px -42px color-mix(in srgb,var(--rc-bad) 85%,transparent)}
.rc-wrap .rc-acct .rc-eye::before,.rc-wrap .rc-slot .rc-eye::before,.rc-wrap .rc-dotn{content:'';display:inline-block;width:8px;height:8px;margin-right:8px;border-radius:50%;vertical-align:1px;background:radial-gradient(circle at 35% 30%,#fff,var(--rc-neon) 60%);box-shadow:0 0 0 3px color-mix(in srgb,var(--rc-neon) 22%,transparent),0 0 12px var(--rc-neon)}
.rc-wrap .rc-slot{border:1px dashed color-mix(in srgb,var(--rc-neon) 48%,transparent);opacity:1;
background:repeating-linear-gradient(0deg,color-mix(in srgb,var(--rc-neon) 6%,transparent) 0 1px,transparent 1px 5px),radial-gradient(120% 90% at 50% 0%,color-mix(in srgb,var(--rc-neon) 17%,transparent),transparent 66%),linear-gradient(165deg,var(--rc-g1),var(--rc-g2))}
.rc-wrap .rc-slot::after{display:none}.rc-wrap .rc-slot .rc-eye{color:color-mix(in srgb,var(--rc-neon) 60%,var(--rc-ink))}
.rc-wrap .rc-grid{position:relative;isolation:isolate}
.rc-wrap .rc-grid::before{content:'';position:absolute;inset:-36px 0;z-index:-1;pointer-events:none;
background:radial-gradient(32% 56% at 20% 46%,color-mix(in srgb,var(--rc-n-lit) 24%,transparent),transparent 70%),radial-gradient(32% 56% at 58% 50%,color-mix(in srgb,var(--rc-n-atlas) 16%,transparent),transparent 70%),radial-gradient(24% 50% at 90% 40%,color-mix(in srgb,var(--rc-n-s3) 18%,transparent),transparent 70%)}
@media (max-width:1180px){.rc-wrap .rc-grid::before{background:radial-gradient(45% 40% at 25% 32%,color-mix(in srgb,var(--rc-n-lit) 24%,transparent),transparent 70%),radial-gradient(45% 40% at 75% 32%,color-mix(in srgb,var(--rc-n-atlas) 16%,transparent),transparent 70%),radial-gradient(50% 26% at 50% 90%,color-mix(in srgb,var(--rc-n-s3) 18%,transparent),transparent 70%)}}
@media (max-width:720px){.rc-wrap .rc-grid::before{background:radial-gradient(70% 22% at 50% 18%,color-mix(in srgb,var(--rc-n-lit) 24%,transparent),transparent 70%),radial-gradient(70% 22% at 50% 58%,color-mix(in srgb,var(--rc-n-atlas) 16%,transparent),transparent 70%),radial-gradient(70% 12% at 50% 93%,color-mix(in srgb,var(--rc-n-s3) 18%,transparent),transparent 70%)}}
:root[data-theme="light"] .rc-wrap .rc-grid::before{opacity:.5}
.rc-wrap :is(.rc-kv>div,.rc-kpi,.rc-tr,.rc-why,.rc-sr){background:var(--rc-tile),var(--rc-s2);border:1px solid color-mix(in srgb,var(--rc-ink) 7%,transparent);box-shadow:var(--rc-tsh)}
.rc-wrap .rc-kpi{position:relative;overflow:hidden}
.rc-wrap .rc-kpi::after{content:'';position:absolute;inset:0 12% auto;height:1px;background:linear-gradient(90deg,transparent,color-mix(in srgb,var(--rc-neon) 75%,#fff),transparent);opacity:.7}
.rc-wrap .rc-kpi b{font-size:20px;letter-spacing:-.01em;font-weight:750}
.rc-wrap :is(.rc-kpi b,.rc-lu,.rc-tru,.rc-gh b,.rc-kv b).up,.rc-wrap :is(.rc-kpi b,.rc-lu,.rc-tru,.rc-gh b,.rc-kv b).dn{text-shadow:0 0 16px color-mix(in srgb,currentColor 45%,transparent)}
.rc-wrap .rc-big b{font-size:34px;text-shadow:0 0 28px color-mix(in srgb,currentColor 40%,transparent),0 2px 0 rgba(0,0,0,.35)}
.rc-wrap .rc-chip{box-shadow:inset 0 1px 0 rgba(255,255,255,.08),inset 0 0 0 1px color-mix(in srgb,currentColor 20%,transparent)}
.rc-wrap :is(.rc-chip.good,.rc-chip.bad,.rc-chip.warn,.rc-chip.acc){box-shadow:inset 0 1px 0 rgba(255,255,255,.1),inset 0 0 0 1px color-mix(in srgb,currentColor 34%,transparent),0 0 14px -4px color-mix(in srgb,currentColor 60%,transparent);text-shadow:0 0 10px color-mix(in srgb,currentColor 45%,transparent)}
.rc-wrap .rc-score{--sc:var(--rc-mut);position:relative;flex:none;width:76px;height:76px;border:0;border-radius:50%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;cursor:help;
background:radial-gradient(circle at 36% 28%,rgba(255,255,255,.16),transparent 42%),radial-gradient(circle,color-mix(in srgb,var(--rc-s3) 92%,transparent) 0 50%,color-mix(in srgb,var(--surface,#10131a) 80%,#000) 72%);
box-shadow:inset 0 2px 2px rgba(255,255,255,.08),inset 0 -8px 16px rgba(0,0,0,.45),0 12px 24px -10px rgba(0,0,0,.8),0 0 30px -8px color-mix(in srgb,var(--sc) 85%,transparent)}
.rc-wrap .rc-score.good{--sc:var(--rc-good)}.rc-wrap .rc-score.warn{--sc:var(--rc-warn)}.rc-wrap .rc-score.bad{--sc:var(--rc-bad)}
.rc-wrap .rc-score::after{content:'';position:absolute;inset:0;border-radius:50%;pointer-events:none;background:conic-gradient(from 0deg,transparent 0 78%,rgba(255,255,255,.6) 88%,transparent 97%);
-webkit-mask:radial-gradient(closest-side,transparent calc(100% - 9px),#000 calc(100% - 8px) calc(100% - 3px),transparent calc(100% - 2px));mask:radial-gradient(closest-side,transparent calc(100% - 9px),#000 calc(100% - 8px) calc(100% - 3px),transparent calc(100% - 2px));opacity:.45;animation:rcSpin 7s linear infinite}
.rc-ring{position:absolute;inset:0;width:100%;height:100%;transform:rotate(-90deg);overflow:visible;filter:drop-shadow(0 0 5px color-mix(in srgb,var(--sc) 75%,transparent))}
.rc-ring circle{fill:none;stroke-width:5.5}.rc-ring .t{stroke:var(--rc-well)}.rc-ring .f{stroke:var(--sc);stroke-linecap:round}
.rc-wrap .rc-score b{position:relative;font-size:22px;line-height:1;font-weight:800;color:var(--rc-ink);text-shadow:0 0 14px color-mix(in srgb,var(--sc) 60%,transparent)}.rc-wrap .rc-score span{position:relative;font-size:10px;color:var(--rc-mut)}
.rc-wrap .rc-g{gap:6px}
.rc-wrap :is(.rc-bar,.rc-rdb){--c:var(--rc-mut);position:relative;height:10px;border-radius:99px;overflow:visible;background:linear-gradient(180deg,var(--rc-well),color-mix(in srgb,var(--rc-well) 45%,transparent));box-shadow:inset 0 1px 3px rgba(0,0,0,.5),inset 0 -1px 0 var(--rc-wellhi),0 1px 0 var(--rc-wellhi)}
.rc-wrap .rc-bar::before{content:'';position:absolute;inset:2px 0;pointer-events:none;background:repeating-linear-gradient(90deg,transparent 0 calc(25% - 1px),color-mix(in srgb,var(--rc-ink) 12%,transparent) calc(25% - 1px) 25%)}
.rc-wrap :is(.rc-bar,.rc-rdb) i{position:relative;display:block;height:100%;border-radius:inherit;background:linear-gradient(180deg,color-mix(in srgb,var(--c) 52%,#fff) 0%,var(--c) 45%,color-mix(in srgb,var(--c) 70%,#000) 100%);box-shadow:0 0 14px -2px color-mix(in srgb,var(--c) 80%,transparent),inset 0 1px 0 rgba(255,255,255,.4)}
.rc-wrap .rc-bar i::after{content:'';position:absolute;right:-4px;top:50%;width:14px;height:14px;margin-top:-7px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#fff 0 16%,color-mix(in srgb,var(--c) 65%,#fff) 30%,var(--c) 72%);box-shadow:0 0 0 2px color-mix(in srgb,var(--c) 25%,transparent),0 0 14px var(--c),0 2px 4px rgba(0,0,0,.5)}
.rc-wrap :is(.rc-bar,.rc-rdb).good,.rc-wrap .rc-rdb i.up{--c:var(--rc-good)}.rc-wrap .rc-bar.warn{--c:var(--rc-warn)}.rc-wrap :is(.rc-bar,.rc-rdb).bad,.rc-wrap .rc-rdb i.dn{--c:var(--rc-bad)}.rc-wrap .rc-bar.acc{--c:var(--rc-neon)}
.rc-wrap .rc-rdb{height:12px}
.rc-wrap .rc-pos{border-color:color-mix(in srgb,var(--rc-neon) 55%,transparent);background:radial-gradient(100% 140% at 0% 50%,color-mix(in srgb,var(--rc-neon) 16%,transparent),transparent 70%),var(--rc-tile);box-shadow:0 0 0 1px color-mix(in srgb,var(--rc-neon) 14%,transparent),0 0 24px -6px color-mix(in srgb,var(--rc-neon) 60%,transparent);animation:rcBreathe 3.2s ease-in-out infinite}
.rc-wrap .rc-btn{position:relative;background:linear-gradient(180deg,rgba(255,255,255,.09),rgba(255,255,255,.015)),var(--rc-s2);border-color:color-mix(in srgb,var(--rc-ink) 11%,transparent);box-shadow:inset 0 1px 0 rgba(255,255,255,.1),0 1px 0 rgba(0,0,0,.4),0 10px 20px -12px rgba(0,0,0,.8);transition:transform .16s var(--rc-e),box-shadow .25s,border-color .25s}
.rc-wrap .rc-btn:hover{transform:translateY(-1px);border-color:color-mix(in srgb,var(--rc-neon) 55%,transparent);box-shadow:inset 0 1px 0 rgba(255,255,255,.14),0 1px 0 rgba(0,0,0,.4),0 12px 24px -12px rgba(0,0,0,.8),0 0 22px -8px var(--rc-neon)}
.rc-wrap .rc-btn:active{transform:translateY(1px);box-shadow:inset 0 2px 5px rgba(0,0,0,.4)}
.rc-wrap .rc-btn.bad:hover{border-color:color-mix(in srgb,var(--rc-bad) 60%,transparent);box-shadow:inset 0 1px 0 rgba(255,255,255,.14),0 12px 24px -12px rgba(0,0,0,.8),0 0 22px -8px var(--rc-bad)}
.rc-wrap .rc-ban{--c:var(--rc-mut);background:radial-gradient(80% 160% at 0% 50%,color-mix(in srgb,var(--c) 13%,transparent),transparent 70%),linear-gradient(165deg,var(--rc-g1),var(--rc-g2));border-color:color-mix(in srgb,var(--c) 34%,var(--rc-line));box-shadow:inset 0 1px 0 var(--rc-hi),0 14px 30px -22px rgba(0,0,0,.8)}
.rc-wrap .rc-ban.good{--c:var(--rc-good)}.rc-wrap .rc-ban.warn{--c:var(--rc-warn)}.rc-wrap .rc-ban.bad{--c:var(--rc-bad)}
.rc-wrap .rc-ban i,.rc-wrap .rc-sr i{--c2:var(--c,var(--rc-mut));background:radial-gradient(circle at 35% 30%,color-mix(in srgb,var(--c2) 35%,#fff),var(--c2) 62%);box-shadow:0 0 0 3px color-mix(in srgb,var(--c2) 20%,transparent),0 0 12px color-mix(in srgb,var(--c2) 85%,transparent)}
.rc-wrap .rc-sr{--c:var(--rc-mut)}.rc-wrap .rc-sr.good{--c:var(--rc-good)}.rc-wrap .rc-sr.warn{--c:var(--rc-warn)}.rc-wrap .rc-sr.bad{--c:var(--rc-bad);border-color:color-mix(in srgb,var(--rc-bad) 35%,transparent)}.rc-wrap .rc-sr i{width:9px;height:9px}
.rc-wrap .rc-evl li{border-top-color:color-mix(in srgb,var(--rc-ink) 6%,transparent)}.rc-wrap .rc-evl li:hover{background:linear-gradient(90deg,color-mix(in srgb,var(--rc-acc) 8%,transparent),transparent 70%)}
.rc-wrap .rc-seg{background:var(--rc-well);border-color:transparent;box-shadow:inset 0 1px 3px rgba(0,0,0,.45),0 1px 0 var(--rc-wellhi)}
.rc-wrap .rc-seg button{transition:color .2s,background .25s,box-shadow .25s}
.rc-wrap .rc-seg button.on{background:linear-gradient(180deg,color-mix(in srgb,var(--rc-neon) 30%,var(--rc-s3)),color-mix(in srgb,var(--rc-neon) 12%,var(--rc-s2)));color:var(--rc-ink);box-shadow:inset 0 1px 0 rgba(255,255,255,.14),0 0 0 1px color-mix(in srgb,var(--rc-neon) 42%,transparent),0 6px 18px -8px color-mix(in srgb,var(--rc-neon) 85%,transparent)}
.rc-wrap .rc-sec{display:flex;align-items:baseline;flex-wrap:wrap;gap:4px 8px;margin-top:12px}.rc-wrap .rc-sec span{margin-left:0}
.rc-wrap .rc-sec::after{content:'';flex:1 1 60px;align-self:center;height:1px;background:linear-gradient(90deg,color-mix(in srgb,var(--rc-acc) 60%,transparent),transparent);box-shadow:0 0 8px color-mix(in srgb,var(--rc-acc) 50%,transparent)}
.rc-plot{position:relative}.rc-plot svg{position:relative;z-index:1;width:100%;height:auto;display:block;overflow:visible}
.rc-plot::before{content:'';position:absolute;left:13%;right:3%;bottom:10%;height:46%;z-index:0;pointer-events:none;opacity:.6;
background-image:linear-gradient(color-mix(in srgb,var(--rc-neon) 24%,transparent) 1px,transparent 1px),linear-gradient(90deg,color-mix(in srgb,var(--rc-neon) 24%,transparent) 1px,transparent 1px);background-size:100% 14px,28px 100%;
transform:perspective(240px) rotateX(52deg);transform-origin:50% 100%;-webkit-mask-image:linear-gradient(to top,#000 5%,transparent 92%);mask-image:linear-gradient(to top,#000 5%,transparent 92%)}
.rc-wrap .rc-s0{stop-color:var(--rc-neon);stop-opacity:.42}.rc-wrap .rc-s1{stop-color:var(--rc-neon);stop-opacity:0}.rc-wrap .rc-s2{stop-color:var(--rc-neon);stop-opacity:.2}.rc-wrap .rc-s3{stop-color:var(--rc-neon);stop-opacity:.05}
.rc-wrap .rc-b2{fill:color-mix(in srgb,var(--rc-neon) 20%,transparent)}.rc-wrap .rc-p50{stroke:color-mix(in srgb,var(--rc-neon) 80%,var(--rc-ink))}
.rc-wrap .rc-real{stroke-width:2.6;stroke-linecap:round}.rc-wrap .rc-real-gl{fill:none;stroke:var(--rc-neon);stroke-width:7;stroke-linejoin:round;opacity:.6}.rc-wrap .rc-real-sh{fill:none;stroke:#000;stroke-width:5;stroke-linejoin:round;opacity:.5}
.rc-wrap .rc-dot{fill:var(--rc-neon);stroke:var(--surface,#10131a);stroke-width:1.5}.rc-wrap .rc-dot.last{fill:var(--rc-ink);stroke:var(--rc-neon);stroke-width:2.5}
.rc-wrap .rc-halo{fill:none;stroke:var(--rc-neon);stroke-width:1.5;transform-box:fill-box;transform-origin:center;animation:rcHalo 2.4s ease-out infinite}
.rc-wrap .rc-lg.real{background:var(--rc-ink);box-shadow:0 0 8px var(--rc-neon)}.rc-wrap .rc-lg.band{background:color-mix(in srgb,var(--rc-neon) 35%,transparent)}.rc-wrap .rc-lg.pace{background:var(--rc-neon)}
.rc-wrap .rc-dcol{height:84px;width:24px;border-radius:7px;background:var(--rc-well);box-shadow:inset 0 2px 4px rgba(0,0,0,.45),0 1px 0 var(--rc-wellhi)}
.rc-wrap .rc-dcol i{--c:var(--rc-mut);border-radius:6px 6px 3px 3px;background:linear-gradient(90deg,color-mix(in srgb,var(--c) 60%,#000),var(--c) 36%,color-mix(in srgb,var(--c) 55%,#fff) 54%,var(--c) 72%,color-mix(in srgb,var(--c) 60%,#000));box-shadow:0 0 14px -2px color-mix(in srgb,var(--c) 80%,transparent),inset 0 1px 0 rgba(255,255,255,.55)}
.rc-wrap .rc-dcol i.up{--c:var(--rc-good)}.rc-wrap .rc-dcol i.dn{--c:var(--rc-bad)}
.rc-wrap .rc-grade{--c:var(--rc-mut);position:relative;border-radius:20px;border:1px solid color-mix(in srgb,var(--c) 40%,transparent);
background:radial-gradient(circle at 30% 18%,rgba(255,255,255,.14),transparent 50%),radial-gradient(circle at 50% 62%,color-mix(in srgb,var(--c) 22%,var(--rc-s3)),color-mix(in srgb,var(--surface,#10131a) 85%,#000));
box-shadow:inset 0 1px 0 rgba(255,255,255,.12),inset 0 -10px 18px rgba(0,0,0,.4),0 16px 30px -14px rgba(0,0,0,.85),0 0 30px -10px var(--c)}
.rc-wrap .rc-grade.good{--c:var(--rc-good)}.rc-wrap .rc-grade.warn{--c:var(--rc-warn)}
.rc-wrap .rc-grade b{display:block;text-shadow:0 0 20px color-mix(in srgb,var(--c) 75%,transparent),0 2px 0 rgba(0,0,0,.45)}
.rc-wrap .rc-lr{border-top-color:color-mix(in srgb,var(--rc-ink) 6%,transparent)}
.rc-wrap .rc-lrh{border-radius:12px;transition:background .2s,box-shadow .2s}
.rc-wrap .rc-lrh:hover{background:linear-gradient(90deg,color-mix(in srgb,var(--rc-neon) 11%,transparent),transparent 70%);box-shadow:inset 2px 0 0 var(--rc-neon)}
.rc-wrap .rc-la b::before{content:'';display:inline-block;width:7px;height:7px;margin-right:7px;border-radius:50%;vertical-align:1px;background:var(--rc-neon);box-shadow:0 0 9px var(--rc-neon)}
.rc-wrap .rc-lr.on{background:linear-gradient(165deg,var(--rc-g1),var(--rc-g2));box-shadow:inset 0 1px 0 var(--rc-hi),inset 3px 0 0 var(--rc-neon),0 14px 30px -20px rgba(0,0,0,.85)}
.rc-wrap .rc-tl{border-left-color:color-mix(in srgb,var(--rc-neon) 40%,transparent)}
.rc-wrap .rc-tl li::before{background:radial-gradient(circle at 35% 30%,#fff,var(--rc-neon) 62%);box-shadow:0 0 0 3px color-mix(in srgb,var(--rc-neon) 22%,transparent),0 0 10px var(--rc-neon)}
.rc-wrap .rc-t tbody tr:hover td{background:color-mix(in srgb,var(--rc-acc) 7%,transparent)}
.rc-wrap .rc-tilt{transition:transform .6s var(--rc-e),box-shadow .4s var(--rc-e),border-color .3s}.rc-wrap .rc-pop{transition:transform .6s var(--rc-e)}
@media (hover:hover) and (pointer:fine){
.rc-wrap .rc-tilt.rc-tilting{transform:perspective(1100px) rotateX(var(--rx,0deg)) rotateY(var(--ry,0deg)) translate3d(0,-3px,0);transition:transform .12s linear,box-shadow .3s}
.rc-wrap .rc-card.rc-tilting{box-shadow:inset 0 1px 0 var(--rc-hi),var(--rc-sh),0 36px 72px -34px color-mix(in srgb,var(--rc-neon) 75%,transparent)}
.rc-wrap .rc-kpi.rc-tilting{box-shadow:var(--rc-tsh),0 14px 30px -14px color-mix(in srgb,var(--rc-neon) 70%,transparent)}
.rc-wrap .rc-tilting .rc-pop{transform:translate3d(calc(var(--px,0) * 6px),calc(var(--py,0) * 5px),0)}}
.rc-enter .rc-hd,.rc-enter .rc-card,.rc-enter .rc-kpi,.rc-enter>.rc-ban,.rc-enter .rc-tb{animation:rcRise .75s var(--rc-e) backwards}
.rc-enter .rc-grid>:nth-child(2),.rc-enter .rc-kpis>:nth-child(2),.rc-enter .rc-grid2>:nth-child(2){animation-delay:.07s}.rc-enter .rc-grid>:nth-child(3),.rc-enter .rc-kpis>:nth-child(3){animation-delay:.14s}
.rc-enter .rc-kpis>:nth-child(4){animation-delay:.2s}.rc-enter .rc-kpis>:nth-child(5){animation-delay:.25s}.rc-enter .rc-kpis>:nth-child(n+6){animation-delay:.3s}
.rc-enter .rc-bar i,.rc-enter .rc-rdb i{animation:rcGrow 1.1s .25s var(--rc-e) backwards}.rc-enter .rc-dcol i{animation:rcCol .9s .25s var(--rc-e) backwards}
.rc-enter .rc-ring .f{animation:rcSweep 1.3s .3s var(--rc-e) backwards}
.rc-enter :is(.rc-real,.rc-real-gl,.rc-real-sh){stroke-dasharray:100 100;animation:rcDraw 1.5s .25s var(--rc-e) backwards}
@keyframes rcRise{from{opacity:0;transform:perspective(900px) translate3d(0,22px,0) rotateX(10deg) scale(.98)}}
@keyframes rcGrow{from{width:0}}@keyframes rcCol{from{height:0}}@keyframes rcSweep{from{stroke-dasharray:0 100}}@keyframes rcDraw{from{stroke-dashoffset:100}}
@keyframes rcSpin{to{transform:rotate(360deg)}}@keyframes rcHalo{0%{transform:scale(.5);opacity:.85}100%{transform:scale(1.9);opacity:0}}
@keyframes rcPulse{50%{box-shadow:0 0 0 6px color-mix(in srgb,currentColor 0%,transparent),0 0 14px currentColor}}
@keyframes rcBreathe{50%{box-shadow:0 0 0 1px color-mix(in srgb,var(--rc-neon) 32%,transparent),0 0 34px -4px color-mix(in srgb,var(--rc-neon) 85%,transparent)}}
@media (max-width:760px){.rc-wrap .rc-card{-webkit-backdrop-filter:none;backdrop-filter:none;--rc-g1:color-mix(in srgb,var(--surface,#10131a) 90%,transparent);--rc-g2:color-mix(in srgb,var(--surface,#10131a) 74%,transparent)}
.rc-wrap .rc-score{width:68px;height:68px}.rc-wrap .rc-score b{font-size:20px}.rc-wrap .rc-big b{font-size:30px}.rc-wrap .rc-hd h2{font-size:21px}}
:root[data-theme="light"] .rc-wrap .rc-card::after{opacity:.4}:root[data-theme="light"] .rc-wrap .rc-acct::after{opacity:.7}
:root[data-theme="light"] .rc-wrap .rc-card::before{background:radial-gradient(440px circle at var(--mx,50%) var(--my,0%),color-mix(in srgb,var(--rc-neon) 10%,transparent),transparent 62%)}
:root[data-theme="light"] .rc-wrap .rc-acct{box-shadow:inset 0 1px 0 var(--rc-hi),var(--rc-sh),0 26px 50px -38px color-mix(in srgb,var(--rc-neon) 75%,transparent)}
:root[data-theme="light"] .rc-wrap :is(.rc-big b,.rc-score b,.rc-chip,.rc-kpi b,.rc-grade b,.rc-eyeb,.rc-lu,.rc-tru,.rc-gh b,.rc-kv b){text-shadow:none}
:root[data-theme="light"] .rc-wrap .rc-score{background:radial-gradient(circle at 36% 28%,#fff,transparent 50%),radial-gradient(circle,var(--rc-s2) 0 55%,color-mix(in srgb,var(--rc-s3) 85%,#fff) 76%);box-shadow:inset 0 2px 2px #fff,inset 0 -6px 12px rgba(20,40,90,.12),0 10px 20px -10px rgba(20,40,90,.4),0 0 24px -8px color-mix(in srgb,var(--sc) 70%,transparent)}
:root[data-theme="light"] .rc-wrap .rc-score::after{opacity:.25;background:conic-gradient(from 0deg,transparent 0 78%,color-mix(in srgb,var(--sc) 70%,#fff) 88%,transparent 97%)}
:root[data-theme="light"] .rc-wrap :is(.rc-bar,.rc-rdb,.rc-dcol,.rc-seg){box-shadow:inset 0 1px 2px rgba(20,40,90,.2),0 1px 0 #fff}
:root[data-theme="light"] .rc-wrap .rc-btn{background:linear-gradient(180deg,#fff,var(--rc-s2));box-shadow:inset 0 1px 0 #fff,0 1px 2px rgba(20,40,90,.12),0 8px 16px -12px rgba(20,40,90,.4)}
:root[data-theme="light"] .rc-wrap .rc-seg button.on{background:linear-gradient(180deg,#fff,color-mix(in srgb,var(--rc-neon) 10%,#fff));box-shadow:0 0 0 1px color-mix(in srgb,var(--rc-neon) 40%,transparent),0 4px 12px -6px color-mix(in srgb,var(--rc-neon) 60%,transparent)}
:root[data-theme="light"] .rc-wrap .rc-grade{background:radial-gradient(circle at 30% 18%,#fff,transparent 55%),color-mix(in srgb,var(--c) 12%,var(--rc-s2));box-shadow:inset 0 1px 0 #fff,inset 0 -8px 14px rgba(20,40,90,.08),0 12px 24px -14px rgba(20,40,90,.4),0 0 24px -12px var(--c)}
:root[data-theme="light"] .rc-wrap .rc-real-sh{stroke:#14285a;opacity:.2}:root[data-theme="light"] .rc-wrap .rc-real-gl{opacity:.35}:root[data-theme="light"] .rc-plot::before{opacity:.35}
:root[data-theme="light"] .rc-wrap .rc-lr.on{box-shadow:inset 0 1px 0 var(--rc-hi),inset 3px 0 0 var(--rc-neon),0 10px 24px -18px rgba(20,40,90,.4)}
@media (prefers-reduced-motion:reduce){.rc-wrap *,.rc-wrap *::before,.rc-wrap *::after{animation:none!important;transition:none!important}.rc-wrap .rc-tilt.rc-tilting{transform:none}}
:root[data-motion="off"] .rc-wrap *::after{animation:none!important}`;
  function css() {
    if (typeof document === 'undefined' || document.getElementById('rc-css')) return;
    const s = document.createElement('style'); s.id = 'rc-css'; s.textContent = CSS + DEPTH; document.head.appendChild(s);
    tiltInit();
  }
  window.RealUI = {
    today: (B, o) => { remember(B); return today_(B, o); }, safety: (B, o) => { remember(B); return safety(B, o); },
    results: (B, o) => { remember(B); return results(B, o); }, wire, realOf, csv, score, stats, realRows, remember, css, fx, version: 2,
  };
})();

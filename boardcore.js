// Live board renderer (2026-10-26, owner: "improve the dashboard with more features, useful data stuff"). Shared by the
// phone app (tools/web_public/board.js: Home "Right now" card + #/board) and the PC dashboard (web_next/js/next/board.js:
// the Command center's "Right now" row + the Live board page); web_next/js/next/boardcore.js is a byte-identical copy
// (tests/test_live_board.py checks it). Data: engine/live_board.py (PC GET /api/next/board, phone data.json / live.json
// "board"). Read-only: nothing here talks to the bot; the buttons copy a fix, filter the trade log or export it as CSV.
//   BoardUI.page(B, opts)     the whole board: blocks, Right now per account, health strip, today's map, week and eval
//                             progress, the trade log with pictures
//   BoardUI.home(B, opts)     the compact cut for a Home page (Right now per account + the health strip)
//   BoardUI.wire(root, B, o)  health details, copy buttons, trade-log filters, CSV export, the live countdowns
//   BoardUI.csv(rows)         the trade log as CSV text
// opts: {charts: trade-picture index (engine/trade_chart index_view), go: (id) => 'data-goto="id"', where: 'pc' | 'phone'}
// 2026-10-26: ATLAS's funded stage (a.stage 'funded', a.funded = the payout tracker): $ to the payout line, payouts n of 5
// and a Payout row (buffer, best day vs 50%, traded days, eligibility) instead of the eval's target and session.
// 2026-10-28: paper rows say PAPER and show the REAL twin ("REAL: 3 micros, +$1,662" / "REAL: no order on the account");
// a floor alert carries the ledger check's doubt when live_board's "real".checks finds a booked day with no real trade.
(function () {
  'use strict';
  if (typeof window === 'undefined') return;
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ok = (v) => v != null && v !== '' && !isNaN(v);
  const nowS = () => Date.now() / 1000;
  const usd = (v, d = 0) => !ok(v) ? '—' : (v < 0 ? '−' : '') + '$' + Math.abs(+v).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
  const susd = (v) => !ok(v) ? '—' : (v > 0 ? '+' : '') + usd(v);
  const px = (v) => ok(v) ? (+v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—';
  const pts = (v) => !ok(v) ? '—' : (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(+v).toLocaleString('en-US', { maximumFractionDigits: 1 }) + ' pts';
  const pct = (v) => ok(v) ? (+v).toFixed(1).replace(/\.0$/, '') + '%' : '—';
  const fR = (v) => !ok(v) ? '—' : (v > 0 ? '+' : '') + (+v).toFixed(2) + 'R';
  const cl = (v) => !ok(v) ? '' : v > 0 ? 'up' : v < 0 ? 'dn' : '';
  const ETF = { timeZone: 'America/New_York', hour12: false };
  const hm = (t) => { if (!ok(t)) return '—'; try { return new Date(t * 1000).toLocaleTimeString('en-US', { ...ETF, hour: '2-digit', minute: '2-digit' }); } catch (e) { return '—'; } };
  const wdhm = (t) => { if (!ok(t)) return '—'; try { return new Date(t * 1000).toLocaleString('en-US', { ...ETF, weekday: 'short', hour: '2-digit', minute: '2-digit' }); } catch (e) { return '—'; } };
  const dayhm = (t) => { if (!ok(t)) return ''; try { return new Date(t * 1000).toLocaleString('en-US', { ...ETF, month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; } };
  function dur(s) {
    s = Math.max(0, Math.round(s));
    if (s < 90) return s + ' s';
    const m = Math.round(s / 60); if (m < 60) return m + ' min';
    const h = Math.floor(m / 60), mm = m % 60; if (h < 48) return h + ' h' + (mm ? ' ' + mm + ' min' : '');
    return Math.round(h / 24) + ' d';
  }
  const LV = (o) => (o === true ? 'good' : o === false ? 'bad' : 'idle');
  const chip = (t, k) => `<span class="bd-chip ${k || ''}">${esc(t)}</span>`;
  const NAMES = { lit: 'Zlarior', atlas: 'ATLAS', blitz: 'BLITZ' };   // blitz: account C (engine/account_c.py), drawn only when the board has it (2026-10-29)
  const hasBz = (B) => !!(B && B.blitz && typeof B.blitz === 'object' && !B.blitz.error);
  const KIND = { TARGET: 'target', STOP: 'stop', BE: 'breakeven', EOD: 'flat 15:55', FLAT: 'flat', CUT_T15: '15-min cut', CUT: '15-min cut', T15: '15-min cut', OPEN: 'open' };

  // ---------------------------------------------------------------- countdowns (one ticker for every page)
  // data-bd-open / data-bd-close: an entry window; data-bd-age: seconds since that time
  function windowText(o, c) {
    const n = nowS();
    if (ok(o) && n < o) return { t: `opens in ${dur(o - n)}`, k: 'idle' };
    if (ok(c) && n < c) return { t: `open · closes in ${dur(c - n)}`, k: 'good' };
    return { t: 'closed (refreshing)', k: 'idle' };
  }
  function tick(root) {
    (root || document).querySelectorAll('[data-bd-open]').forEach((el) => {
      const w = windowText(+el.dataset.bdOpen, +el.dataset.bdClose);
      el.textContent = w.t; el.classList.toggle('good', w.k === 'good');
    });
    (root || document).querySelectorAll('[data-bd-age]').forEach((el) => { el.textContent = dur(nowS() - +el.dataset.bdAge); });
  }
  if (!window.__bdTick) window.__bdTick = setInterval(() => { try { tick(document); } catch (e) { /* page gone */ } }, 1000);
  const win = (w) => w && ok(w.open_t) ? `<b class="bd-cd" data-bd-open="${w.open_t}" data-bd-close="${w.close_t}">${esc(windowText(w.open_t, w.close_t).t)}</b>` : `<b>${esc((w && w.text) || '—')}</b>`;

  // ---------------------------------------------------------------- blocks (a guard stops new entries)
  // 2026-10-28: a floor alert while the ledger check (live_board "real".checks) doubts a booked day says so next to it
  let CHK = [];
  const doubt = (t) => CHK.length && /floor|room \$|stuck/i.test(String(t || '')) ? ` <em class="bd-doubt">Ledger check: ${esc(CHK[0].day)} ${esc(susd(CHK[0].usd))} has no real trade; room may really be ${esc(usd(CHK[0].room_if_error))}. Check MFFU.</em>` : '';
  const blockRow = (b) => `<div class="bd-block"><span class="bd-dot bad"></span><div><b>${esc(b.text)}</b>${doubt(b.text)}${b.scope === 'both' ? '<em>both accounts</em>' : ''}
    <button type="button" class="bd-fix" data-bd-copy="${esc(b.fix)}" title="Copy the fix">Fix: ${esc(b.fix)}</button></div></div>`;
  function blocksHtml(B, a) {
    const own = (a && a.blocks) || [];
    const all = (B.blocks || []).concat(own);
    if (!all.length) return `<div class="bd-ok"><span class="bd-dot good"></span><span>Nothing is blocking new entries.</span></div>`;
    return all.map(blockRow).join('');
  }

  // ---------------------------------------------------------------- Right now: one account
  const STAGE = { levels: 'Levels', sweep: 'Sweep', inducement: 'Inducement', displacement: 'Displacement', cisd5: '5m CISD', limit: 'Limit order', cisd1m: '1m CISD', entry: 'Entry', trade: 'In trade', done: 'Done' };
  function steps(a) {
    const S = a.stages || [];
    if (!S.length) return '';
    return `<div class="bd-steps" aria-label="Setup steps">${S.map(([k, s]) => `<span class="bd-step ${esc(s)}" title="${esc(STAGE[k] || k)}: ${esc(s)}"><i></i><em>${esc(STAGE[k] || k)}</em></span>`).join('')}</div>`;
  }
  function posHtml(p) {
    if (!p) return '';
    const side = p.side || (p.dir > 0 ? 'LONG' : 'SHORT');
    return `<div class="bd-pos">${chip(side, side === 'LONG' ? 'good' : 'bad')}<span><b>${esc(p.qty ?? '')} micros</b> at ${px(p.entry)} · stop ${px(p.stop)} · target ${px(p.target)}${p.be ? ' · at breakeven' : ''}</span>
      ${ok(p.unrealized_usd) ? `<b class="${cl(p.unrealized_usd)}">${susd(p.unrealized_usd)}</b>` : ''}</div>`;
  }
  function sizeHtml(a) {
    const m = a.micros;
    if (!m) return '';
    if (a.id === 'lit' && ok(m.qty)) {
      const how = (m.steps || []).length ? `<details class="bd-how"><summary>How</summary><ul>${m.steps.map((s) => `<li><span>${esc(s.label)}</span><b>${esc(s.value)}</b></li>`).join('')}</ul></details>` : '';
      return `<div class="bd-row"><span class="bd-k">Size now</span><div><b>${esc(m.qty)} micros</b> <em>${m.typical ? 'at a typical' : 'at the'} ${esc(Math.round(m.risk_pts || 0))}-pt stop: risk ${usd(m.risk_usd)} · the target pays ${usd(m.win_usd)}</em>${how}</div></div>`;
    }
    if (ok(m.qty)) return `<div class="bd-row"><span class="bd-k">Last size</span><div><b>${esc(m.qty)} micros</b> <em>${esc(m.member || '')} at ${hm(m.t)} ET${(m.reasons || []).length ? ': ' + esc(m.reasons[m.reasons.length - 1]) : ''}</em></div></div>`;
    return `<div class="bd-row"><span class="bd-k">Size</span><div><em>${esc(m.what || '')}</em></div></div>`;
  }
  function members(a) {
    const M = a.members || [];
    if (!M.length) return '';
    return `<div class="bd-mem">${M.map((m) => `<div class="bd-mrow"><b>${esc(m.short)}</b><span class="bd-mt">${esc(m.text || (m.stage ? m.stage : 'no state yet'))}</span>
      <span class="bd-mw">${m.window && m.window.open ? win(m.window) : m.window && ok(m.window.open_t) ? `${esc(wdhm(m.window.open_t))} ET · ${win(m.window)}` : esc((m.window && m.window.text) || '')}</span></div>`).join('')}</div>`;
  }
  // ATLAS's funded account (engine/account_b.py stage "funded"): the MFFU payout tracker (engine/funded_life.track)
  function fundedHtml(F) {
    if (!F || !Object.keys(F).length) return '';
    const elig = F.eligible ? `eligible now: up to ${usd(F.max_request)} (${usd(F.to_you)} to you)` : F.eligible_from ? `first request from ${esc(F.eligible_from)}` : 'no funded trade yet';
    return `<div class="bd-row"><span class="bd-k">Payout</span><div><b>${esc(F.text || '')}</b>
      <em>buffer ${F.buffer_reached ? 'reached' : `${usd(F.buffer_balance)} not reached`} · best day ${pct(F.best_day_pct)} of the cycle (max ${pct(F.cons_limit_pct)}) · ${esc(F.cycle_days ?? 0)}/${esc(F.cycle_days_need ?? 2)} traded days · ${elig}</em></div></div>`;
  }
  function acctCard(B, a, opts) {
    if (!a || a.error) return `<section class="bd-card bd-acct"><p class="bd-note">${esc((a && a.error) || 'No data for this account yet.')}</p></section>`;
    const tgt = ok(a.target_balance) ? a.target_balance : null;
    const start = a.id === 'lit' ? 50000 : 25000;
    const prog = ok(a.profit) && tgt ? Math.max(0, Math.min(1, a.profit / (tgt - start))) : 0;
    const st = String(a.status || '').toLowerCase();
    const funded = a.stage === 'funded', F = a.funded || {};
    const stK = st === 'passed' || (funded && /funded|graduated/.test(st)) ? 'good' : /fail|stuck|lost|not set/.test(st) ? 'bad' : '';
    const roomK = !ok(a.room_frac) ? '' : a.room_frac < 0.25 ? 'bad' : a.room_frac < 0.5 ? 'warn' : 'good';
    const blocked = (B.blocks || []).length + (a.blocks || []).length > 0;
    const wait = a.id === 'lit'
      ? `<div class="bd-row bd-wait"><span class="bd-k">Waiting for</span><div>${a.stage && a.stage.label ? `<b>${esc(a.stage.label)}</b>${ok(a.stage.n) && a.stage.of ? ` <em>step ${esc(a.stage.n)} of ${esc(a.stage.of)}</em>` : ''}` : ''}
          <p>${esc(a.done_today ? 'Done for today (1 trade a day). Next chance: the next session.' : a.waiting || '—')}</p>${a.rule_note && !/Monday rule/.test(a.waiting || '') ? `<p class="bd-note">${esc(a.rule_note)}</p>` : ''}${steps(a)}</div></div>`
      : `<div class="bd-row bd-wait"><span class="bd-k">Waiting for</span><div><p>${esc(a.waiting || '—')}</p>${members(a)}</div></div>`;
    const w = a.window || {};
    return `<section class="bd-card bd-acct ${esc(a.id)}${blocked ? ' blocked' : ''}" aria-label="${esc(a.name)} right now">
      <div class="bd-h"><div class="bd-eye">${esc(a.name)} · ${esc((a.plan || '').replace('MFFU ', ''))}<em>${esc([a.badge, a.broker].filter(Boolean).join(' · ') || a.source || '')}</em></div>${chip(a.status || 'open', stK)}</div>
      ${funded
    ? `<div class="bd-big"><b>${ok(a.to_target) ? (a.to_target <= 0 ? 'Payout line' : usd(a.to_target)) : '—'}</b><em>${ok(a.to_target) && a.to_target <= 0 ? 'reached' : `to the ${usd(tgt)} payout line`}</em></div>`
    : `<div class="bd-big"><b>${ok(a.to_target) ? (a.to_target <= 0 ? 'Passed' : usd(a.to_target)) : '—'}</b><em>${ok(a.to_target) && a.to_target <= 0 ? 'target reached' : `to the ${usd(tgt)} target`}</em></div>`}
      <div class="bd-bar"><i style="width:${(prog * 100).toFixed(1)}%"></i></div>
      <div class="bd-kpis">
        <div><span>Balance</span><b>${usd(a.balance, 2)}</b></div>
        <div><span>Room to floor</span><b class="${roomK === 'bad' ? 'dn' : ''}">${usd(a.room)}</b><em>floor ${usd(a.floor)}</em></div>
        <div><span>Today</span><b class="${cl(a.today_pnl)}">${susd(a.today_pnl)}</b><em>${esc(a.trades_today ?? 0)} of ${esc(a.max_day)} trade${a.max_day === 1 ? '' : 's'}</em></div>
        ${funded
    ? `<div><span>Payouts</span><b>${esc(F.payouts_n ?? 0)} of ${esc(F.payouts_max ?? 5)}</b><em>${usd(F.paid_to_you)} to you</em></div>`
    : `<div><span>Session</span><b>${ok(a.session) ? `${esc(a.session)} of ${esc(a.sessions || 10)}` : '—'}</b><em>goal: pass in 10</em></div>`}
      </div>
      ${funded ? fundedHtml(F) : ''}
      ${posHtml(a.position)}
      ${wait}
      <div class="bd-row"><span class="bd-k">Entry window</span><div>${win(w)} <em>${esc(w.who ? w.who + ' · ' : '')}${esc(ok(w.open_t) && !w.open ? wdhm(w.open_t) + ' ET' : w.hours || '')}</em></div></div>
      ${sizeHtml(a)}
      <div class="bd-blocks">${blocksHtml(B, a)}</div>
    </section>`;
  }

  // ---------------------------------------------------------------- health strip
  // the feed / loop ages are the PC's own at its check-in (static); the heartbeat and phone-feed ages keep counting here
  function hval(x) {
    if (ok(x.t) && ['heartbeat', 'live_pub'].includes(x.key)) return `<b data-bd-age="${x.t}">${esc(dur(nowS() - x.t))}</b>`;
    return `<b>${esc(x.value)}</b>`;
  }
  const hcls = (x) => (x.ok === false ? 'bad' : x.warn ? 'warn' : LV(x.ok));
  function healthHtml(B, compact) {
    const H = B.health;
    if (!H || H.error || !(H.items || []).length) return `<div class="bd-health"><span class="bd-note">${esc((H && H.error) || 'No health data yet.')}</span></div>`;
    const data = ok(B.data_t) ? `<span class="bd-hp idle" title="When the PC made this data"><i></i><span>Data</span><b data-bd-age="${B.data_t}">${esc(dur(nowS() - B.data_t))}</b></span>` : '';
    const show = H.items.map((x, i) => [x, i]).filter(([x]) => !compact || hcls(x) === 'bad' || hcls(x) === 'warn');
    const n_ok = H.items.filter((x) => hcls(x) === 'good').length;
    return `<div class="bd-health" role="list">${show.map(([x, i]) => `<button type="button" role="listitem" class="bd-hp ${hcls(x)}" data-bd-h="${i}" title="${esc(x.label + ': ' + (x.detail || ''))}"><i></i><span>${esc(x.label)}</span>${hval(x)}</button>`).join('')}
      ${compact ? `<span class="bd-hp good"><i></i><span>${n_ok} ${show.length ? 'more ' : ''}green</span></span>` : ''}${data}</div>
      <div class="bd-hdet" hidden></div>`;
  }
  const hDetail = (x) => `<div class="bd-hd ${x.ok === false ? 'bad' : x.warn ? 'warn' : LV(x.ok)}"><b>${esc(x.label)}: ${esc(x.value)}</b><span>${esc(x.detail || '')}</span>
    ${x.fix ? `<button type="button" class="bd-fix" data-bd-copy="${esc(x.fix)}">Fix: ${esc(x.fix)}</button>` : ''}</div>`;

  // ---------------------------------------------------------------- today's map
  function band(M) {
    const V = M.vix;
    if (!V || !ok(V.up) || !ok(V.dn) || !ok(M.price)) return '';
    const lo = Math.min(V.dn, M.price), hi = Math.max(V.up, M.price), span = Math.max(1, hi - lo);
    const at = (p) => ((p - lo) / span * 100).toFixed(2) + '%';
    const up = V.up - M.price, dn = M.price - V.dn;
    return `<div class="bd-band" aria-label="Price inside the VIX objective band">
      <div class="bd-band-t"><span class="dn-s">down ${px(V.dn)}</span><span>18:00 open ${px(V.open18)}</span><span class="up-s">up ${px(V.up)}</span></div>
      <div class="bd-band-bar"><i class="bd-band-in" style="left:${at(V.dn)};right:calc(100% - ${at(V.up)})"></i><i class="bd-band-o" style="left:${at(V.open18)}"></i><i class="bd-band-p" style="left:${at(M.price)}"><em>${px(M.price)}</em></i></div>
      <p class="bd-note">Objective one VIX day move (${esc(Math.round(V.move || 0))} pts, VIX ${esc(V.vix)} · VXN ${esc(V.vxn)}) from the 18:00 open. Price is <b>${pts(up).replace('+', '')}</b> (${usd(Math.abs(up) * 2)} a micro) below the up objective and <b>${pts(dn).replace('+', '')}</b> (${usd(Math.abs(dn) * 2)} a micro) above the down objective.</p></div>`;
  }
  function mapHtml(B) {
    const M = B.map;
    if (!M || M.error) return `<p class="bd-note">${esc((M && M.error) || 'No map yet.')}</p>`;
    if (!ok(M.price) || !(M.levels || []).length) return `<p class="bd-note">The map fills in after the bot's first poll of the session (levels, VIX objective, the 18:00 open).</p>`;
    const L = M.levels.slice();
    let i = L.findIndex((r) => r.price < M.price); if (i < 0) i = L.length;
    const q = M.qty;
    const rows = L.map((r) => `<div class="bd-lv ${esc(r.kind)} ${r.side === 'H' ? 'hi' : r.side === 'L' ? 'lo' : ''}${r.taken ? ' taken' : ''}">
        <span class="bd-lv-n"><b>${esc(r.label)}</b>${r.note ? `<em>${esc(r.note)}</em>` : ''}</span><span class="bd-lv-p mono">${px(r.price)}</span>
        <span class="bd-lv-d mono ${r.dist > 0 ? 'up' : 'dn'}">${pts(r.dist)}</span><span class="bd-lv-u mono">${usd(r.usd_micro)}<em>/micro</em></span>
        <span class="bd-lv-q mono">${q ? `${usd(r.usd_size)}<em>at ${esc(q)}</em>` : ''}</span></div>`);
    rows.splice(i, 0, `<div class="bd-lv now"><span class="bd-lv-n"><b>Price now</b><em>${M.bar_hm ? esc(M.bar_hm) + ' ET bar' : ''}</em></span><span class="bd-lv-p mono">${px(M.price)}</span><span class="bd-lv-d"></span><span class="bd-lv-u"></span><span class="bd-lv-q"></span></div>`);
    const mon = M.monday === 'high' ? 'Monday rule: shorts only today (Friday\'s high was taken).' : M.monday === 'low' ? 'Monday rule: longs only today (Friday\'s low was taken).' : '';
    return `${band(M)}<div class="bd-ladder">${rows.join('')}</div>
      <p class="bd-note">A sweep must run ${M.sweep_pts ? esc(M.sweep_pts) + ' pts (0.5 ATR)' : '0.5 ATR'} beyond a level. Faded rows were already taken today. $ per micro = points x $2 (MNQ)${q ? `; "at ${esc(q)}" = the size the bot would trade now` : ''}.${mon ? ' ' + esc(mon) : ''}</p>`;
  }

  // ---------------------------------------------------------------- week and eval progress
  function weekDays(w) {
    return `<div class="bd-week">${(w.days || []).map((d) => `<span class="bd-wd ${d.today ? 'today' : ''} ${d.future ? 'fut' : ''} ${d.n ? 'has' : ''}" title="${esc(d.day)}: ${esc(d.n)} trade(s) ${ok(d.usd) && d.n ? susd(d.usd) : ''}">
      <em>${esc(d.wd)}</em><b>${d.n ? esc(d.n) : d.future ? '·' : '0'}</b>${d.n ? `<i class="${cl(d.usd)}">${susd(d.usd)}</i>` : ''}</span>`).join('')}</div>`;
  }
  function progCard(name, P) {
    if (!P || P.error) return `<section class="bd-card"><p class="bd-note">${esc((P && P.error) || 'No progress data yet.')}</p></section>`;
    const w = P.week || {};
    const wk = w.n >= w.lo && w.n <= w.hi ? 'good' : w.n > w.hi ? 'warn' : w.status === 'behind' ? 'warn' : '';
    const s = ok(P.session) ? +P.session : 0, max = P.sessions_max || 15;
    const sK = s > (P.sessions || 10) ? 'warn' : '';
    const O = (P.odds && P.odds.rows) || {};
    const oRow = (k) => O[k] ? `<div class="bd-odd"><span>${esc(O[k].label)}</span><div><b class="up">${pct(O[k].p10)}</b><em>pass in 2 weeks</em></div>
      <div><b class="${+O[k].f10 > 0 ? 'dn' : ''}">${pct(O[k].f10)}</b><em>fail in 2 weeks</em></div>${ok(O[k].pass_med) ? `<div><b>${esc(O[k].pass_med)}</b><em>sessions to pass (median)</em></div>` : ''}</div>` : '';
    const E = P.expected || {}, A = P.actual || {};
    return `<section class="bd-card bd-prog"><div class="bd-h"><div class="bd-eye">${esc(name)}<em>week and eval</em></div>${chip(`${w.n ?? 0} of ${w.lo}-${w.hi} this week`, wk)}</div>
      ${weekDays(w)}<p class="bd-line">${esc(w.sentence || '')}</p>
      <div class="bd-meter"><div class="bd-meter-h"><span>Eval session</span><b>${ok(P.session) ? `${esc(s)} of ${esc(P.sessions || 10)}` : 'not started'}</b></div>
        <div class="bd-sbar ${sK}"><i style="width:${Math.min(100, s / max * 100).toFixed(1)}%"></i><u style="left:${(10 / max * 100).toFixed(1)}%" title="10 sessions = 2 weeks"></u></div>
        <div class="bd-meter-s"><span>${ok(P.sessions_left) ? esc(P.sessions_left) + ' left of the 2-week goal' : ''}${ok(P.days_traded) ? ` · ${esc(P.days_traded)} of ${esc(P.min_days || 2)} min. days traded` : ''}</span><span>10 = 2 weeks · 15 = 3 weeks</span></div></div>
      ${Object.keys(O).length ? `<h4>Pass / fail odds <span>backtest Monte Carlo</span></h4>${oRow('H2')}${oRow('H1')}` : ''}
      <h4>$ a month</h4><div class="bd-money"><div><span>Expected</span><b>${usd(E.per_month)}</b><em>${esc(E.src ? E.src.split(',')[0] : 'no backtest number')}</em></div>
        <div><span>Actual so far</span><b class="${cl(A.profit)}">${susd(A.profit)}</b><em>${ok(A.sessions) ? `in ${esc(A.sessions)} session${A.sessions === 1 ? '' : 's'}` : ''}${ok(A.per_month_pace) && A.sessions >= 1 ? ` · pace ${susd(A.per_month_pace)}/mo` : ''}</em></div>
        ${ok(A.month_usd) ? `<div><span>This month</span><b class="${cl(A.month_usd)}">${susd(A.month_usd)}</b><em>${esc(A.month_trades || 0)} trades · ${esc(A.month_sessions || 0)} sessions</em></div>` : ''}</div>
      ${P.sentence ? `<p class="bd-note">${esc(P.sentence)}</p>` : ''}
      ${P.odds && P.odds.src ? `<p class="bd-src">${esc(P.odds.src)}</p>` : ''}</section>`;
  }

  // ---------------------------------------------------------------- trade log (+ pictures, CSV)
  function picIndex(charts) {
    const out = {};
    const S = (charts && charts.strategies) || {};
    // the bot's own pictures, then the backtest examples (a paper row that IS a backtest trade matches its example)
    for (const k of Object.keys(S)) for (const x of (S[k].items || []).concat(S[k].examples || [])) if (x && x.url && ok(x.entry_t)) (out[k] = out[k] || []).push(x);
    return out;
  }
  function picFor(ix, r) {
    const L = ix[r.key] || []; if (!L.length || !ok(r.entry_t)) return null;
    let best = null, gap = 1e9;
    for (const x of L) { const g = Math.abs(+x.entry_t - +r.entry_t); if (g < gap) { gap = g; best = x; } }
    return gap <= 600 ? best : null;
  }
  // 2026-10-28: a paper row's micros and $ are the strategy's own run: it says PAPER and shows the account's REAL twin
  function realTwin(rows, r) {
    if (r.src === 'live') return '';
    const x = rows.find((y) => y.src === 'live' && y.acct === r.acct && y.side === r.side && ok(y.entry_t) && ok(r.entry_t) && Math.abs(y.entry_t - r.entry_t) <= 1800);
    return x ? `REAL: ${x.qty ?? '?'} micros, ${x.open ? 'open' : susd(x.usd)}` : 'REAL: no order on the account';
  }
  const paperTag = (rows, r) => r.src !== 'live' ? ` <em class="bd-paper">paper</em> <em class="bd-real">${esc(realTwin(rows, r))}</em>` : '';
  const F = { acct: 'all', src: 'live' };
  function filt(rows) {
    return rows.filter((r) => (F.acct === 'all' || r.acct === F.acct) && (F.src === 'all' || r.src === F.src));
  }
  function tradesHtml(B, opts) {
    const rows = Array.isArray(B.trades) ? B.trades : [];
    if (!rows.some((r) => r.src === 'live') && F.src === 'live' && !F.touched) F.src = 'all';
    const R = filt(rows);
    const T = window.TradePics, ix = picIndex(opts.charts);
    const pics = [], pi = new Map();
    R.forEach((r, i) => { const p = T ? picFor(ix, r) : null; if (p) { pi.set(i, pics.length); pics.push(p); } });
    let g = '';
    let strip = '';
    if (T && pics.length) { strip = T.strip(pics, { label: 'Trade pictures' }); const m = strip.match(/data-tp="([^"]+)"/); g = m ? m[1] : ''; }
    const closed = R.filter((r) => !r.open && ok(r.usd)), w = closed.filter((r) => r.usd > 0), net = closed.reduce((s, r) => s + +r.usd, 0);
    const gl = -closed.filter((r) => r.usd < 0).reduce((s, r) => s + +r.usd, 0), gw = w.reduce((s, r) => s + +r.usd, 0);
    const seg = (key, vals) => `<div class="bd-seg" data-bd-f="${key}">${vals.map(([v, l]) => `<button type="button" data-v="${v}" class="${F[key] === v ? 'on' : ''}">${esc(l)}</button>`).join('')}</div>`;
    const body = R.length ? `<div class="bd-tw"><table class="bd-t"><thead><tr><th>Entry (ET)</th><th>Account</th><th>Side</th><th class="r">Micros</th><th class="r">Entry</th><th class="r">Stop</th><th class="r">Exit</th><th>How</th><th class="r">R</th><th class="r">$</th><th>Picture</th></tr></thead><tbody>
      ${R.slice(0, 120).map((r, i) => `<tr class="${r.open ? 'open' : ''}"><td class="mono">${esc(ok(r.entry_t) ? dayhm(r.entry_t) : r.day)}</td><td>${esc(NAMES[r.acct] || r.acct)}${r.member ? ' · ' + esc(r.member) : ''}${paperTag(rows, r)}</td>
        <td>${chip(r.side || '', r.side === 'LONG' ? 'good' : 'bad')}</td><td class="r mono">${esc(r.qty ?? '')}</td><td class="r mono">${px(r.entry)}</td><td class="r mono">${px(r.stop)}</td><td class="r mono">${px(r.exit_px)}</td>
        <td>${esc(r.open ? 'open' : KIND[String(r.exit || '').toUpperCase()] || r.exit || '')}</td><td class="r mono ${cl(r.r)}">${fR(r.r)}</td><td class="r mono ${cl(r.usd)}">${r.src !== 'live' ? '<em class="bd-mut">paper </em>' : ''}${susd(r.usd)}</td>
        <td>${pi.has(i) && g ? `<button type="button" class="bd-pic" data-tp="${g}" data-tp-i="${pi.get(i)}" title="Open the trade picture">${esc('View')}</button>` : '<span class="bd-mut">—</span>'}</td></tr>`).join('')}</tbody></table></div>
      <div class="bd-tl">${R.slice(0, 60).map((r, i) => `<div class="bd-tc ${r.open ? 'open' : ''}"><div class="bd-tc1"><span class="mono">${esc(ok(r.entry_t) ? dayhm(r.entry_t) : r.day)}</span>
          <b>${esc(NAMES[r.acct] || r.acct)}${r.member ? ' · ' + esc(r.member) : ''}</b>${paperTag(rows, r)}<b class="bd-tc-u mono ${cl(r.usd)}">${r.src !== 'live' ? '<em class="bd-mut">paper </em>' : ''}${susd(r.usd)}</b></div>
        <div class="bd-tc2">${chip(r.side || '', r.side === 'LONG' ? 'good' : 'bad')}<span class="mono">${esc(r.qty ?? '')} × ${px(r.entry)} → ${px(r.exit_px)}</span>
          <span>${esc(r.open ? 'open' : KIND[String(r.exit || '').toUpperCase()] || r.exit || '')}</span><span class="mono ${cl(r.r)}">${fR(r.r)}</span>
          ${pi.has(i) && g ? `<button type="button" class="bd-pic" data-tp="${g}" data-tp-i="${pi.get(i)}">View</button>` : ''}</div></div>`).join('')}</div>`
      : `<p class="bd-note">No ${F.src === 'live' ? 'live ' : ''}trade${F.acct !== 'all' ? ' for ' + esc(NAMES[F.acct]) : ''} yet. The first one shows here when the bot closes it.</p>`;
    const bzT = hasBz(B) || (Array.isArray(B.trades) && B.trades.some((t) => t && t.acct === 'blitz'));
    return `<div class="bd-tf">${seg('acct', [['all', bzT ? 'All' : 'Both'], ['lit', 'Zlarior'], ['atlas', 'ATLAS']].concat(bzT ? [['blitz', 'BLITZ']] : []))}${seg('src', [['live', 'Live'], ['paper', 'Paper'], ['all', 'All']])}
        <button type="button" class="bd-btn" data-bd-csv="1">Export CSV</button></div>
      <div class="bd-sum"><span><b>${R.length}</b> trades</span><span>net <b class="${cl(net)}">${susd(net)}</b></span><span>win <b>${closed.length ? pct(100 * w.length / closed.length) : '—'}</b></span><span>PF <b>${gl ? (gw / gl).toFixed(2) : w.length ? '∞' : '—'}</b></span></div>
      ${body}${strip ? `<h4>Pictures <span>${pics.length} of these trades</span></h4>${strip}` : ''}
      <p class="bd-src">Live = what the bot did on the account (PC ledger + exits); paper = the strategy's own run on the same bars. Pictures: engine/trade_chart.py.</p>`;
  }
  const CSV_COLS = ['day', 'entry_et', 'exit_et', 'account', 'source', 'member', 'side', 'qty', 'entry', 'stop', 'target', 'exit_px', 'exit', 'r', 'usd'];
  function csv(rows) {
    const q = (v) => { const s = v == null ? '' : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
    const out = (rows || []).map((r) => ({ ...r, entry_et: dayhm(r.entry_t), exit_et: dayhm(r.exit_t), account: NAMES[r.acct] || r.acct, source: r.src }));
    return [CSV_COLS.join(','), ...out.map((r) => CSV_COLS.map((c) => q(r[c])).join(','))].join('\n');
  }
  function download(name, text) {
    try {
      const b = new Blob([text], { type: 'text/csv' }), u = URL.createObjectURL(b), a = document.createElement('a');
      a.href = u; a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(u); a.remove(); }, 1500);
    } catch (e) { /* the copy fallback below */ copy(text); }
  }
  function copy(text) {
    const done = () => { const t = document.getElementById('bd-toast') || Object.assign(document.createElement('div'), { id: 'bd-toast', className: 'bd-toast' }); t.textContent = 'Copied'; document.body.appendChild(t); t.classList.add('on'); setTimeout(() => t.classList.remove('on'), 1400); };
    (navigator.clipboard && navigator.clipboard.writeText ? navigator.clipboard.writeText(text) : Promise.reject()).then(done).catch(() => {
      const t = document.createElement('textarea'); t.value = text; document.body.appendChild(t); t.select();
      try { document.execCommand('copy'); done(); } catch (e) { /* nothing more to try */ } t.remove();
    });
  }

  // ---------------------------------------------------------------- the page and the Home cut
  function lines(B) {
    const L = B.lines || [];
    if (!L.length) return `<div class="bd-banner good"><span class="bd-dot good"></span><span><b>All clear.</b> Nothing blocks new entries; the bot trades on its own.</span></div>`;
    return L.map((l) => `<div class="bd-banner ${esc(l.level)}"><span class="bd-dot ${esc(l.level)}"></span><span>${esc(l.text)}${doubt(l.text)}</span></div>`).join('');
  }
  function stale(B) {
    if (!ok(B.data_t)) return '';
    const a = nowS() - B.data_t;
    if (a < 15 * 60) return '';
    return `<div class="bd-banner warn"><span class="bd-dot warn"></span><span>This data is <b data-bd-age="${B.data_t}">${esc(dur(a))}</b> old (the PC's last check-in). Countdowns still run; balances and states may have moved.</span></div>`;
  }
  const H2 = (t, s) => `<h3 class="bd-sec">${esc(t)}${s ? ` <span>${esc(s)}</span>` : ''}</h3>`;
  const setChk = (B) => { CHK = ((B && B.real && B.real.checks) || []).filter((c) => c.acct === 'lit' && ok(c.room_if_error)); };
  function page(B, opts) {
    css(); opts = opts || {}; setChk(B);
    if (!B || B.error) return `<div class="bd-wrap"><p class="bd-note">${esc((B && B.error) || 'No board data yet. It appears after the PC bot reports.')}</p></div>`;
    return `<div class="bd-wrap">${stale(B)}${lines(B)}
      ${H2('Right now', hasBz(B) ? 'all three accounts' : 'both accounts')}<div class="bd-two">${acctCard(B, B.lit, opts)}${acctCard(B, B.atlas, opts)}${hasBz(B) ? acctCard(B, B.blitz, opts) : ''}</div>
      ${H2('Bot health', (B.health && B.health.text) || '')}${healthHtml(B)}
      ${H2("Today's map", 'Zlarior levels, VIX objective, 18:00 open')}<section class="bd-card">${mapHtml(B)}</section>
      ${H2('Week and eval', 'trades vs the goal, odds, $ a month')}<div class="bd-two">${progCard('Zlarior · 50K', (B.progress || {}).lit)}${progCard('ATLAS · 25K', (B.progress || {}).atlas)}${(B.progress || {}).blitz ? progCard('BLITZ · 25K', B.progress.blitz) : ''}</div>
      ${H2('Trade log', 'both accounts, with pictures')}<section class="bd-card bd-trades">${tradesHtml(B, opts)}</section>
      <p class="bd-src">engine/live_board.py · ${esc(B.where === 'pc' ? 'from the running PC bot' : B.where === 'live' ? 'from the PC live feed' : 'from the PC heartbeat (cloud copy)')}${B.brain_src ? ' · map from the ' + esc(B.brain_src) : ''} · read-only</p></div>`;
  }
  function miniAcct(B, a, opts) {
    if (!a || a.error) return '';
    const w = a.window || {};
    const blocked = (B.blocks || []).length + (a.blocks || []).length > 0;
    const m = a.micros || {};
    return `<div class="bd-mini ${esc(a.id)}${blocked ? ' blocked' : ''}"><div class="bd-h"><div class="bd-eye">${esc(a.name)} · right now</div>${blocked ? chip('blocked', 'bad') : chip(w.open ? 'window open' : 'waiting', w.open ? 'good' : '')}</div>
      <p class="bd-line clamp">${esc(a.id === 'lit' && a.done_today ? 'Done for today (1 trade a day).' : a.waiting || '—')}</p>
      <div class="bd-mrow2"><span>Entry window ${win(w)}</span>${a.id === 'lit' && ok(m.qty) ? `<span>size now <b>${esc(m.qty)} micros</b> (risk ${usd(m.risk_usd)}, the target pays ${usd(m.win_usd)})</span>` : ''}<span>today <b class="${cl(a.today_pnl)}">${susd(a.today_pnl)}</b> · room <b>${usd(a.room)}</b> · <b>${usd(a.to_target)}</b> to go</span></div>
      ${(a.blocks || []).slice(0, 2).map(blockRow).join('')}</div>`;
  }
  function home(B, opts) {
    css(); opts = opts || {}; setChk(B);
    if (!B || B.error) return '';
    const go = opts.go ? opts.go('board') : 'data-goto="board"';
    return `<section class="bd-wrap bd-homecut" aria-label="Right now">${stale(B)}${(B.blocks || []).map(blockRow).join('')}<div class="bd-two">${miniAcct(B, B.lit, opts)}${miniAcct(B, B.atlas, opts)}${hasBz(B) ? miniAcct(B, B.blitz, opts) : ''}</div>
      ${healthHtml(B, true)}<button type="button" class="bd-btn wide" ${go}>Open the live board: map, odds, trade log</button></section>`;
  }

  // ---------------------------------------------------------------- wiring
  function wire(root, B, opts) {
    if (!root || !B) return;
    opts = opts || {};
    tick(root);
    const det = root.querySelector('.bd-hdet');
    root.querySelectorAll('[data-bd-h]').forEach((b) => {
      b.onclick = () => {
        const i = +b.dataset.bdH, same = b.classList.contains('on');
        root.querySelectorAll('[data-bd-h]').forEach((x) => x.classList.toggle('on', !same && x === b));
        if (!det) return;
        det.hidden = same;
        if (!same) det.innerHTML = hDetail(((B.health || {}).items || [])[i] || {});
      };
    });
    root.querySelectorAll('[data-bd-copy]').forEach((b) => { b.onclick = (e) => { e.preventDefault(); e.stopPropagation(); copy(b.dataset.bdCopy); }; });
    const tr = root.querySelector('.bd-trades');
    const redraw = () => { if (!tr) return; tr.innerHTML = tradesHtml(B, opts); wireTrades(); if (window.TradePics && window.TradePics.settle) window.TradePics.settle(tr); };
    function wireTrades() {
      if (!tr) return;
      tr.querySelectorAll('[data-bd-f]').forEach((s) => {
        s.onclick = (e) => { const b = e.target.closest('button'); if (!b) return; F[s.dataset.bdF] = b.dataset.v; F.touched = true; redraw(); };
      });
      const c = tr.querySelector('[data-bd-csv]');
      if (c) c.onclick = () => { const rows = filt(Array.isArray(B.trades) ? B.trades : []); (opts.download || download)(`trades_${F.acct}_${F.src}.csv`, csv(rows)); };
    }
    wireTrades();
    if (window.TradePics && window.TradePics.settle) window.TradePics.settle(root);
  }

  // ---------------------------------------------------------------- styles (both apps' tokens, with fallbacks)
  const CSS = `.bd-wrap{--bd-line:var(--line,var(--nx-line,rgba(160,170,220,.16)));--bd-s2:var(--surface-2,rgba(127,127,127,.08));--bd-s3:var(--surface-3,rgba(127,127,127,.14));
--bd-ink2:var(--ink-2,#a9b1c3);--bd-mut:var(--muted,#6f788b);--bd-good:var(--good,#2ee59d);--bd-bad:var(--bad,#ff5a7a);--bd-warn:var(--warn,#f7b955);--bd-acc:var(--accent,#6d7cff);
display:flex;flex-direction:column;gap:12px;min-width:0}
.bd-wrap *{box-sizing:border-box}.bd-wrap .mono{font-family:var(--mono,ui-monospace,monospace);font-variant-numeric:tabular-nums}
.bd-sec{margin:10px 2px 0;font-size:13px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:var(--bd-ink2)}.bd-sec span{text-transform:none;letter-spacing:0;font-weight:500;color:var(--bd-mut);margin-left:6px}
.bd-two{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,340px),1fr));gap:12px}
.bd-card,.bd-mini{min-width:0;border:1px solid var(--bd-line);border-radius:16px;padding:14px 16px;background:var(--surface,transparent)}
.bd-acct.blocked,.bd-mini.blocked{border-color:color-mix(in srgb,var(--bd-bad) 45%,var(--bd-line))}
.bd-acct.blitz:not(.blocked),.bd-mini.blitz:not(.blocked){border-color:color-mix(in srgb,#b388ff 45%,var(--bd-line))}.bd-acct.blitz .bd-eye,.bd-mini.blitz .bd-eye{color:#cdb4ff}
.bd-h{display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:8px}
.bd-eye{display:flex;flex-direction:column;font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--bd-ink2);min-width:0}
.bd-eye em{font-style:normal;text-transform:none;letter-spacing:0;font-weight:500;color:var(--bd-mut);margin-top:2px;overflow-wrap:anywhere}
.bd-chip{flex:none;display:inline-flex;align-items:center;gap:6px;height:24px;padding:0 10px;border-radius:99px;font:650 11px var(--sans,system-ui);letter-spacing:.03em;background:var(--bd-s3);color:var(--bd-ink2);white-space:nowrap}
.bd-chip::before{content:"";width:7px;height:7px;border-radius:50%;background:var(--bd-mut)}
.bd-chip.good{background:color-mix(in srgb,var(--bd-good) 14%,transparent);color:var(--bd-good)}.bd-chip.good::before{background:var(--bd-good)}
.bd-chip.warn{background:color-mix(in srgb,var(--bd-warn) 14%,transparent);color:var(--bd-warn)}.bd-chip.warn::before{background:var(--bd-warn)}
.bd-chip.bad{background:color-mix(in srgb,var(--bd-bad) 14%,transparent);color:var(--bd-bad)}.bd-chip.bad::before{background:var(--bd-bad)}
.bd-big{display:flex;align-items:baseline;gap:8px;flex-wrap:wrap}.bd-big b{font:750 34px/1.05 var(--sans,system-ui);letter-spacing:-.02em;font-variant-numeric:tabular-nums}.bd-big em{font-style:normal;font-size:14px;color:var(--bd-ink2)}
.bd-bar,.bd-sbar{position:relative;display:block;height:6px;border-radius:99px;background:var(--bd-s3);overflow:visible;margin:8px 0 10px}.bd-bar i,.bd-sbar i{display:block;height:100%;border-radius:99px;background:var(--bd-good)}
.bd-sbar.warn i{background:var(--bd-warn)}.bd-sbar u{position:absolute;top:-3px;width:2px;height:12px;background:var(--bd-ink2);opacity:.6;text-decoration:none}
.bd-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin:4px 0 8px}@media (max-width:520px){.bd-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}}
.bd-kpis div{padding:8px 10px;border-radius:12px;background:var(--bd-s2);min-width:0}.bd-kpis span{display:block;font-size:11.5px;color:var(--bd-mut)}
.bd-kpis b{display:block;font-size:16px;font-variant-numeric:tabular-nums;overflow-wrap:anywhere}.bd-kpis em{display:block;font-style:normal;font-size:11.5px;color:var(--bd-mut)}
.bd-row{display:grid;grid-template-columns:96px minmax(0,1fr);gap:10px;padding:8px 0;border-top:1px solid var(--bd-line);font-size:14px;line-height:1.45}
@media (max-width:420px){.bd-row{grid-template-columns:1fr;gap:2px}}
.bd-k{align-self:start;font-size:12px;color:var(--bd-mut);padding-top:2px}.bd-row p{margin:2px 0 0;color:var(--ink,inherit)}.bd-row em{font-style:normal;color:var(--bd-ink2);font-size:13px}
.bd-cd.good{color:var(--bd-good)}
.bd-steps{display:flex;flex-wrap:wrap;gap:4px;margin-top:8px}.bd-step{display:inline-flex;align-items:center;gap:4px;font-size:11px;color:var(--bd-mut);padding:2px 7px;border-radius:99px;background:var(--bd-s2)}
.bd-step i{width:6px;height:6px;border-radius:50%;background:var(--bd-s3)}.bd-step em{font-style:normal}.bd-step.done{color:var(--bd-ink2)}.bd-step.done i{background:var(--bd-good)}
.bd-step.now{color:var(--ink,inherit);background:color-mix(in srgb,var(--bd-acc) 18%,transparent)}.bd-step.now i{background:var(--bd-acc);box-shadow:0 0 0 3px color-mix(in srgb,var(--bd-acc) 25%,transparent)}
.bd-how{margin-top:4px}.bd-how summary{cursor:pointer;font-size:12.5px;color:var(--bd-acc)}.bd-how ul{list-style:none;margin:6px 0 0;padding:0}.bd-how li{display:flex;justify-content:space-between;gap:10px;font-size:12.5px;padding:3px 0;border-top:1px dashed var(--bd-line)}
.bd-mem{display:flex;flex-direction:column;gap:6px;margin-top:6px}.bd-mrow{display:grid;grid-template-columns:44px minmax(0,1fr);gap:2px 8px;font-size:13px;padding:6px 8px;border-radius:10px;background:var(--bd-s2)}
.bd-mrow .bd-mt{color:var(--bd-ink2)}.bd-mrow .bd-mw{grid-column:2;font-size:12.5px;color:var(--bd-mut)}
.bd-pos{display:flex;align-items:center;flex-wrap:wrap;gap:8px;padding:8px 10px;margin:4px 0;border-radius:12px;background:color-mix(in srgb,var(--bd-acc) 10%,transparent);font-size:13.5px}
.bd-blocks{border-top:1px solid var(--bd-line);padding-top:8px;display:flex;flex-direction:column;gap:6px}
.bd-block{display:flex;gap:10px;align-items:flex-start;padding:8px 10px;border-radius:12px;background:color-mix(in srgb,var(--bd-bad) 10%,transparent);border:1px solid color-mix(in srgb,var(--bd-bad) 35%,transparent)}
.bd-block b{display:block;font-size:13.5px;color:var(--bd-bad)}.bd-block em{display:block;font-style:normal;font-size:11.5px;color:var(--bd-mut)}
.bd-fix{display:block;margin-top:4px;padding:6px 10px;border-radius:10px;border:1px dashed var(--bd-line);background:var(--bd-s2);color:var(--ink,inherit);font:500 12.5px var(--sans,system-ui);text-align:left;cursor:copy;min-height:32px}
.bd-ok{display:flex;gap:8px;align-items:center;font-size:13px;color:var(--bd-ink2)}
.bd-dot{flex:none;width:9px;height:9px;border-radius:50%;background:var(--bd-mut);margin-top:5px}.bd-dot.good{background:var(--bd-good)}.bd-dot.bad{background:var(--bd-bad)}.bd-dot.warn{background:var(--bd-warn)}
.bd-ok .bd-dot{margin-top:0}
.bd-banner{display:flex;gap:10px;align-items:flex-start;padding:10px 12px;border-radius:12px;font-size:14px;line-height:1.45;border:1px solid var(--bd-line);background:var(--bd-s2)}
.bd-banner.bad{border-color:color-mix(in srgb,var(--bd-bad) 45%,transparent);background:color-mix(in srgb,var(--bd-bad) 10%,transparent)}
.bd-banner.warn{border-color:color-mix(in srgb,var(--bd-warn) 45%,transparent);background:color-mix(in srgb,var(--bd-warn) 9%,transparent)}
.bd-banner.good{border-color:color-mix(in srgb,var(--bd-good) 35%,transparent)}
.bd-health{display:flex;flex-wrap:wrap;gap:6px}.bd-hp{display:inline-flex;align-items:center;gap:6px;min-height:34px;padding:0 10px;border-radius:99px;border:1px solid var(--bd-line);background:var(--bd-s2);color:var(--ink,inherit);font:500 12.5px var(--sans,system-ui);cursor:pointer}
.bd-hp i{width:8px;height:8px;border-radius:50%;background:var(--bd-mut)}.bd-hp span{color:var(--bd-ink2)}.bd-hp b{font-variant-numeric:tabular-nums}
.bd-hp.good i{background:var(--bd-good)}.bd-hp.bad{border-color:color-mix(in srgb,var(--bd-bad) 55%,transparent);background:color-mix(in srgb,var(--bd-bad) 12%,transparent)}.bd-hp.bad i{background:var(--bd-bad)}.bd-hp.bad b{color:var(--bd-bad)}
.bd-hp.warn{border-color:color-mix(in srgb,var(--bd-warn) 55%,transparent)}.bd-hp.warn i{background:var(--bd-warn)}.bd-hp.warn b{color:var(--bd-warn)}.bd-hp.on{outline:2px solid color-mix(in srgb,var(--bd-acc) 60%,transparent)}
.bd-hdet .bd-hd{margin-top:8px;padding:10px 12px;border-radius:12px;background:var(--bd-s2);display:flex;flex-direction:column;gap:2px;font-size:13px}.bd-hd span{color:var(--bd-ink2)}
.bd-band{margin-bottom:10px}.bd-band-t{display:flex;justify-content:space-between;gap:6px;font-size:12px;color:var(--bd-mut);flex-wrap:wrap}.bd-band-t .up-s{color:var(--bd-good)}.bd-band-t .dn-s{color:var(--bd-bad)}
.bd-band-bar{position:relative;height:16px;margin:8px 0 26px;border-radius:99px;background:var(--bd-s3)}
.bd-band-in{position:absolute;top:0;bottom:0;border-radius:99px;background:linear-gradient(90deg,color-mix(in srgb,var(--bd-bad) 35%,transparent),color-mix(in srgb,var(--bd-acc) 20%,transparent),color-mix(in srgb,var(--bd-good) 35%,transparent))}
.bd-band-o{position:absolute;top:-3px;width:2px;height:22px;background:var(--bd-ink2);transform:translateX(-1px)}
.bd-band-p{position:absolute;top:-5px;width:4px;height:26px;border-radius:2px;background:var(--ink,#fff);transform:translateX(-2px)}.bd-band-p em{position:absolute;top:28px;left:50%;transform:translateX(-50%);font-style:normal;font-size:11.5px;font-weight:700;white-space:nowrap}
.bd-ladder{display:flex;flex-direction:column;border:1px solid var(--bd-line);border-radius:12px;overflow:hidden}
.bd-lv{display:grid;grid-template-columns:minmax(0,1.5fr) minmax(0,1fr) minmax(0,.9fr) minmax(0,.8fr) minmax(0,.8fr);grid-template-areas:"n p d u q";gap:2px 8px;align-items:center;padding:7px 12px;border-top:1px solid var(--bd-line);font-size:13px;border-left:3px solid transparent}
.bd-lv-n{grid-area:n;min-width:0}.bd-lv-p{grid-area:p}.bd-lv-d{grid-area:d}.bd-lv-u{grid-area:u}.bd-lv-q{grid-area:q}
.bd-lv:first-child{border-top:0}.bd-lv-n b{display:block;font-weight:600}.bd-lv-n em,.bd-lv-u em,.bd-lv-q em{font-style:normal;font-size:11px;color:var(--bd-mut);margin-left:3px}.bd-lv-n em{display:block;margin:0}
.bd-lv-p,.bd-lv-d,.bd-lv-u,.bd-lv-q{text-align:right;white-space:nowrap}
.bd-lv.hi{border-left-color:color-mix(in srgb,var(--bd-bad) 70%,transparent)}.bd-lv.lo{border-left-color:color-mix(in srgb,var(--bd-good) 70%,transparent)}
.bd-lv.target{background:color-mix(in srgb,var(--bd-acc) 10%,transparent);border-left-color:var(--bd-acc)}.bd-lv.open{background:var(--bd-s2)}
.bd-lv.taken{opacity:.5}.bd-lv.now{background:color-mix(in srgb,var(--ink,#fff) 8%,transparent);border-left-color:var(--ink,#fff);font-weight:700}
@media (max-width:600px){.bd-lv{grid-template-columns:minmax(0,1fr) auto auto;grid-template-areas:"n p u" "n d q";padding:7px 10px;font-size:12.5px}}
.bd-week{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:6px;margin:4px 0 6px}.bd-wd{display:flex;flex-direction:column;align-items:center;padding:6px 2px;border-radius:10px;background:var(--bd-s2);font-size:12px}
.bd-wd em{font-style:normal;color:var(--bd-mut)}.bd-wd b{font-size:17px}.bd-wd i{font-style:normal;font-size:11px}.bd-wd.today{outline:2px solid color-mix(in srgb,var(--bd-acc) 55%,transparent)}.bd-wd.fut{opacity:.55}.bd-wd.has{background:color-mix(in srgb,var(--bd-acc) 12%,transparent)}
.bd-line{margin:4px 0 8px;font-size:14px;line-height:1.45}.bd-meter{margin:8px 0}.bd-meter-h,.bd-meter-s{display:flex;justify-content:space-between;gap:8px;font-size:12.5px;color:var(--bd-ink2)}.bd-meter-s{font-size:11.5px;color:var(--bd-mut);flex-wrap:wrap}
.bd-prog h4,.bd-trades h4{margin:12px 0 6px;font-size:12px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:var(--bd-ink2)}.bd-prog h4 span,.bd-trades h4 span{text-transform:none;letter-spacing:0;font-weight:500;color:var(--bd-mut)}
.bd-odd{display:grid;grid-template-columns:minmax(0,1.2fr) repeat(3,minmax(0,1fr));gap:6px 10px;align-items:start;font-size:12.5px;padding:8px 10px;border-radius:10px;background:var(--bd-s2);margin-bottom:6px}
.bd-odd>span{color:var(--bd-ink2);padding-top:3px}.bd-odd b{display:block;font-size:17px;font-variant-numeric:tabular-nums}.bd-odd em{display:block;font-style:normal;font-size:11px;color:var(--bd-mut);line-height:1.3}
@media (max-width:520px){.bd-odd{grid-template-columns:repeat(3,minmax(0,1fr))}.bd-odd>span{grid-column:1 / -1;padding:0}}
.bd-money{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px}.bd-money div{padding:8px 10px;border-radius:12px;background:var(--bd-s2)}.bd-money span{display:block;font-size:11.5px;color:var(--bd-mut)}
.bd-money b{display:block;font-size:17px;font-variant-numeric:tabular-nums}.bd-money em{display:block;font-style:normal;font-size:11.5px;color:var(--bd-mut);line-height:1.35}
.bd-tf{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:8px}.bd-seg{display:inline-flex;gap:2px;padding:3px;border-radius:11px;background:var(--bd-s2);border:1px solid var(--bd-line)}
.bd-seg button{min-height:32px;padding:0 12px;border:0;border-radius:8px;background:none;color:var(--bd-ink2);font:600 12.5px var(--sans,system-ui);cursor:pointer}.bd-seg button.on{background:var(--surface,#1a1f2b);color:var(--ink,inherit);box-shadow:0 0 0 1px var(--bd-line)}
.bd-btn{min-height:36px;padding:0 14px;border-radius:11px;border:1px solid var(--bd-line);background:var(--bd-s2);color:var(--ink,inherit);font:600 13px var(--sans,system-ui);cursor:pointer}.bd-btn.wide{width:100%;min-height:44px}
.bd-sum{display:flex;flex-wrap:wrap;gap:14px;font-size:13px;color:var(--bd-ink2);margin:2px 0 8px}
.bd-tw{overflow-x:auto;-webkit-overflow-scrolling:touch;border:1px solid var(--bd-line);border-radius:12px}.bd-t{width:100%;border-collapse:collapse;font-size:12.5px;min-width:760px}
.bd-t th{position:sticky;top:0;text-align:left;font-weight:600;color:var(--bd-mut);padding:8px;background:var(--surface,#10131a);border-bottom:1px solid var(--bd-line);white-space:nowrap}
.bd-t td{padding:7px 8px;border-top:1px solid var(--bd-line);white-space:nowrap}.bd-t .r{text-align:right}.bd-t tr.open td{background:color-mix(in srgb,var(--bd-acc) 8%,transparent)}
.bd-tl{display:none;flex-direction:column;gap:6px}.bd-tc{padding:8px 10px;border-radius:12px;border:1px solid var(--bd-line);background:var(--bd-s2);font-size:13px}.bd-tc.open{border-color:color-mix(in srgb,var(--bd-acc) 45%,transparent)}
.bd-tc1{display:flex;align-items:center;gap:6px;flex-wrap:wrap}.bd-tc1 .mono{color:var(--bd-mut);font-size:12px}.bd-tc-u{margin-left:auto}
.bd-tc2{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:5px;color:var(--bd-ink2);font-size:12.5px}.bd-tc2 .bd-chip{height:20px;padding:0 8px;font-size:10.5px}.bd-tc2 .bd-pic{margin-left:auto}
@media (max-width:600px){.bd-trades .bd-tw{display:none}.bd-tl{display:flex}}
.bd-line.clamp{display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.bd-paper{font-style:normal;font-size:10.5px;padding:1px 6px;border-radius:99px;background:var(--bd-s3);color:var(--bd-mut)}.bd-real{font-style:normal;font-size:10.5px;padding:1px 6px;border-radius:99px;background:color-mix(in srgb,var(--bd-acc) 14%,transparent);color:var(--ink,inherit);font-weight:700;white-space:nowrap}.bd-doubt{display:block;font-style:normal;font-size:12px;color:var(--bd-warn);margin-top:2px}.bd-mut{color:var(--bd-mut)}
.bd-pic{min-height:28px;padding:0 10px;border-radius:8px;border:1px solid color-mix(in srgb,var(--bd-acc) 45%,transparent);background:color-mix(in srgb,var(--bd-acc) 10%,transparent);color:var(--ink,inherit);font:600 12px var(--sans,system-ui);cursor:zoom-in}
.bd-note{margin:6px 0 0;font-size:12.5px;line-height:1.45;color:var(--bd-ink2)}.bd-src{margin:6px 2px 0;font-size:11.5px;color:var(--bd-mut);line-height:1.4}
.bd-wrap .up{color:var(--bd-good)}.bd-wrap .dn{color:var(--bd-bad)}
.bd-homecut{gap:10px}.bd-mini{padding:12px 14px}.bd-mini .bd-line{font-size:13.5px}.bd-mrow2{display:flex;flex-direction:column;gap:4px;font-size:13px;color:var(--bd-ink2);margin-bottom:6px}.bd-mrow2 b{color:var(--ink,inherit)}
.bd-toast{position:fixed;left:50%;bottom:90px;transform:translateX(-50%) translateY(10px);opacity:0;padding:8px 14px;border-radius:99px;background:#111827;color:#fff;font:600 13px system-ui;z-index:2147483001;transition:opacity .2s,transform .2s;pointer-events:none}
.bd-toast.on{opacity:1;transform:translateX(-50%)}`;
  function css() {
    if (typeof document === 'undefined' || document.getElementById('bd-css')) return;
    const s = document.createElement('style'); s.id = 'bd-css'; s.textContent = CSS; document.head.appendChild(s);
  }
  window.BoardUI = { page, home, wire, csv, tick, css, dur, windowText, picFor, picIndex, version: 1 };
})();

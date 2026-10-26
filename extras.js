// Extra pages for the phone app (loaded by index.html with one <script defer> tag; data from data.json "extras", built by
// tools/build_web_dashboard.py _extras()):
//   Today  > Eval HQ     the 2-week pass path on the MFFU Builder 50K: $ to go, sessions left, $ needed per session, what one
//                        winner pays under the live two_week sizing, pass / fail odds (run lit_2wk_rec, Monte Carlo)
//   Today  > Ops check   live health lights (cloud run, data feed, PC heartbeat, phone push, eval clock), the pre-session
//                        checklist (ticks kept per day on this phone), NinjaTrader log messages, kill steps, quick links
//   Trades > Edge        where LIT makes its money: R histogram, MFE vs MAE, stop size vs R, entry hour, weekday, level types
//   Trades > Calendar    daily P&L calendar (backtest or paper), streaks, this week vs the backtest's expectation
//   System > MFFU rules  the Builder 50K rulebook (research/lit/mffu_rules.json) with how sure each rule is, and how LIT fits
// It runs after the page's main script and uses its helpers (D, head, statBox, scatter, esc, usd ...). Classic script, no deps.
(function () {
  'use strict';
  if (typeof GROUPS === 'undefined' || typeof VIEWS === 'undefined') return;

  // --------------------------------------------------------------------------------------------- pages + routing hook
  const ADD = {
    today: [['evalhq', 'Eval HQ', 'prop', 'The 2-week pass path: $ to go, sessions left, what one winner pays, the odds', 1],
      ['ops', 'Ops check', 'check', 'Is everything running? Checklist, NinjaTrader help, quick links', 99]],
    trades: [['edge', 'Edge', 'heat', 'Where Zlarior makes its money: R, hours, weekdays, levels, stop sizes', 2],
      ['pnlcal', 'Calendar', 'results', 'Daily P&L calendar, streaks, this week vs the backtest', 3]],
    system: [['mffurules', 'MFFU rules', 'rules', 'The Builder 50K rulebook and how Zlarior fits it', 4]],
  };
  const SCN = { evalhq: 'eval', ops: 'engine', edge: 'results', pnlcal: 'results', mffurules: 'eval' };
  const ALI = { hq: 'evalhq', evalhq: 'evalhq', pass: 'evalhq', edge: 'edge', stats: 'edge', analytics: 'edge', pnl: 'pnlcal', cal: 'pnlcal',
    streaks: 'pnlcal', ops: 'ops', health: 'ops', links: 'ops', ninjatrader: 'ops', rulebook: 'mffurules', prop: 'mffurules' };
  function install() {
    for (const [gid, list] of Object.entries(ADD)) {
      const G = GROUPS.find((g) => g.id === gid); if (!G) continue;
      for (const [id, label, ic, desc, at] of list) {
        if (G.pages.some((p) => p[0] === id)) continue;
        G.pages.splice(Math.min(at, G.pages.length), 0, [id, label, ic, desc]);
        PAGES[id] = { id, label, icon: ic, desc, group: gid };
      }
    }
    Object.assign(SCENE, SCN);
    for (const [k, v] of Object.entries(ALI)) if (k !== v && !PAGES[k] && !ALIAS[k]) ALIAS[k] = v;
    const st = document.createElement('style'); st.id = 'lex-css'; st.textContent = CSS; document.head.appendChild(st);
    nav(); route();
  }

  // --------------------------------------------------------------------------------------------- shared bits
  const X = () => (typeof D !== 'undefined' && D && D.extras) || null;
  const L = () => (D && D.live) || {};
  const PER = () => (D && D.results && D.results.periods) || {};
  const SPANS = [['2026', '2026'], ['H1', 'H1 · picked'], ['H2', 'H2 · check'], ['2021-25', '2021-25 · ref']];
  const PERIOD_OF = { '2026': '2026 YTD', H1: '2026 H1 (picked on)', H2: '2026 H2 (check)', '2021-25': '2021-25 (reference)' };
  const inSpan = (sp, d) => sp === '2026' ? d >= '2026' : sp === 'H1' ? d >= '2026' && d <= '2026-06-30' : sp === 'H2' ? d >= '2026-07-01' : d < '2026';
  const WD = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const EXIT_C = { TARGET: '#2ee59d', STOP: '#ff5a7a', BE: '#9aa3b5', TIME: '#ffb547' };
  const med = (a) => { const s = a.filter((v) => ok(v)).map(Number).sort((x, y) => x - y); return s.length ? (s.length % 2 ? s[s.length >> 1] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2) : null; };
  const sum = (a, f) => a.reduce((s, x) => s + (f ? f(x) : x), 0);
  const hm = (m) => String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
  const srcLine = (t) => `<p class="lex-src">${icon('sources')}<span>${t}</span></p>`;
  const tag = (t, k = '') => `<span class="chip ${k}">${t}</span>`;
  const noData = (what) => emptyBox('Not in this build.', `${what} is added by tools/build_web_dashboard.py on the next cloud-monitor run.`);
  const rows = () => { const x = X(); if (!x || !x.trades) return []; const c = x.tcols; return x.trades.map((r) => Object.fromEntries(c.map((k, i) => [k, r[i]]))); };
  let ROWS = null, ROWS_D = null;
  const allRows = () => { if (ROWS_D !== D) { ROWS = rows(); ROWS_D = D; } return ROWS; };
  function span(sp) { return allRows().filter((t) => inSpan(sp, t.day)); }
  function months(sp) { const p = PER()[PERIOD_OF[sp]]; if (p && p.from && p.to) return Math.max(1, tradeMonths(p.from, p.to)); const t = span(sp); return t.length ? Math.max(1, monthsBetween(t[0].day, t[t.length - 1].day)) : 1; }
  function kpis(t) {
    const won = sum(t.filter((x) => x.pnl > 0), (x) => x.pnl), lost = -sum(t.filter((x) => x.pnl < 0), (x) => x.pnl);
    return { n: t.length, win: t.length ? 100 * t.filter((x) => x.pnl > 0).length / t.length : null, avg: t.length ? sum(t, (x) => x.r) / t.length : null,
      netR: sum(t, (x) => x.r), net: sum(t, (x) => x.pnl), pf: lost > 0 ? won / lost : null };
  }
  // horizontal bars (phone friendly): rows [{ label, v, sub, color, k }]; signed = bars grow from the middle
  function hbars(list, { fmt = kusd, signed = true, note = '' } = {}) {
    if (!list.length) return emptyBox('Nothing to show.', '');
    const mx = Math.max(1e-9, ...list.map((r) => Math.abs(r.v || 0)));
    return `<div class="lex-hb${signed ? ' sg' : ''}">${list.map((r) => {
      const w = Math.abs(r.v || 0) / mx * (signed ? 50 : 100), pos = (r.v || 0) >= 0, c = r.color || (pos ? 'var(--good)' : 'var(--bad)');
      return `<div class="r"><span class="l">${r.label}</span><span class="t"><i style="width:${w.toFixed(1)}%;${signed ? (pos ? 'left:50%' : `left:${(50 - w).toFixed(1)}%`) : 'left:0'};background:${c}"></i></span>
        <b class="${r.k ?? (signed ? cls(r.v) : '')}">${fmt(r.v)}</b>${r.sub ? `<em>${r.sub}</em>` : ''}</div>`; }).join('')}</div>${note ? `<p class="note">${note}</p>` : ''}`;
  }
  const spanSeg = (id) => segHTML(id, SPANS, store.get('ex.span', '2026'));
  function bindSpan(id) { onSeg(id, (v) => { store.set('ex.span', v); render(true); }); }

  // --------------------------------------------------------------------------------------------- two_week sizing (engine/sizing.py two_week_qty, JS port)
  const TW = { PV: 2, COMM: 1.9, SLIP: 0.25, DSLIP: 0.5 };
  const RFP = () => Math.round(((D.lit_extra?.sizing?.two_week?.room_f) ?? 0.6) * 100);   // live room_f in % (0.8 since 2026-10-25)
  function twQty(stop, tgt, st) {
    const c = { need_buf: 1, room_f: 0.6, dll_cap: true, stop_at_target: true, ...(D.lit_extra?.sizing?.two_week || {}) };
    const P = { target: 3000, dll: 1000, ...(D.lit_extra?.plan || {}) }, maxq = D.lit_extra?.sizing?.max_micros || 40;
    const need = P.target - st.profit;
    if (c.stop_at_target && need <= 0) return { q: 0, why: 'target reached: no new trade', short: 'passed', need, risk: 0, win: 0 };
    let q = Math.max(1, Math.ceil(need * (c.need_buf || 1) / (tgt * TW.PV - TW.COMM) - 1e-9)), why = 'one winner passes', short = 'need';
    const caps = [];
    if (c.room_f && ok(st.room)) caps.push([Math.floor(c.room_f * Math.max(0, st.room) / (stop * TW.PV)), `${Math.round(c.room_f * 100)}% of the room`, `${Math.round(c.room_f * 100)}% room`]);
    if (c.dll_cap) caps.push([Math.floor(Math.max(0, P.dll + (st.cum || 0)) / ((stop + TW.DSLIP) * TW.PV + TW.COMM)), `$${P.dll.toLocaleString('en-US')} daily loss`, 'daily loss']);
    for (const [cap, lab, sh] of caps) if (cap < q) { q = Math.max(1, cap); why = lab; short = sh; }
    if (q > maxq) { q = maxq; why = `max ${maxq} micros`; short = `max ${maxq}`; }
    return { q, why, short, need, risk: q * ((stop + TW.SLIP) * TW.PV + TW.COMM), win: q * (tgt * TW.PV - TW.COMM) };
  }
  function evalNow() {
    const lv = L(), ev = lv.eval || {}, e2 = lv.eval_2wk || {}, P = { start: 50000, target: 3000, mll: 2000, dll: 1000, lock_at: 50100, ...(D.lit_extra?.plan || {}) };
    const bal = ok(ev.balance) ? +ev.balance : P.start, floor = ok(ev.trailing_mll) ? +ev.trailing_mll : P.start - P.mll;
    const profit = ok(ev.profit) ? +ev.profit : bal - P.start, toGo = Math.max(0, P.target - profit), room = bal - floor;
    const today = (lv.ledger || []).filter((v) => v.day === lv.today), cum = sum(today, (v) => +v.usd || 0);
    const limit = +e2.limit || 10, done = ok(e2.sessions_done) ? +e2.sessions_done : null, session = ok(e2.session) ? +e2.session : null;
    const left = done == null ? null : Math.max(0, limit - done);
    return { lv, ev, e2, P, bal, floor, profit, toGo, room, today, cum, limit, done, session, left, mode: lv.lit_sizing || D.lit_extra?.sizing?.mode || 'normal',
      tradedToday: today.length >= ((D.lit_extra?.rules?.max_per_day) || 1), status: e2.status || (profit >= P.target ? 'passed' : bal <= floor ? 'failed' : 'open') };
  }
  // eval lifecycle (engine/eval_life.py): the PC bot's (heartbeat health.eval_life, the real account) when it reports one,
  // else the cloud paper eval's (state eval_life): passed / failed / min-days and the weekly loss stop off / armed / tripped
  function lifeLine(lv) {
    const pc = lv.pc?.health?.eval_life, cl = lv.eval_life;
    if (!pc && !cl) return '';
    const st = pc ? pc.wk_stop : cl.wk_stop?.state, txt = pc ? pc.wk_text : cl.wk_stop?.text, tr = pc ? pc.trading : cl.trading;
    const k = st === 'tripped' ? 'bad' : st === 'armed' ? 'warn' : '';
    return `<p class="small" style="margin:8px 0 0">${tag('Weekly loss stop: ' + esc(st || 'off'), k)} <span class="mut">${esc(txt || '')}${tr ? ' · ' + esc(tr) : ''}${pc ? ' · PC bot' : ' · cloud paper'}</span></p>`;
  }
  function typical() {
    const t = span('2026'), st = med(t.map((x) => x.risk_pts)), tg = med(t.filter((x) => ok(x.rr)).map((x) => x.rr * x.risk_pts)), rr = med(t.map((x) => x.rr));
    return { stop: st || 46, tgt: tg || 230, rr: rr || 5 };
  }

  // ============================================================================================= EVAL HQ
  VIEWS.evalhq = (el) => {
    const E = evalNow(), x = X(), tw = x?.two_week, ty = typical(), lit = L().lit || {};
    const perSess = E.left ? E.toGo / E.left : null;
    const next = E.tradedToday ? { profit: E.profit, cum: 0, room: E.room } : { profit: E.profit, cum: E.cum, room: E.room };
    const stops = [...new Set([15, 25, 35, Math.round(ty.stop), 60, 80])].sort((a, b) => a - b);
    const tbl = stops.map((s) => { const tg = Math.min(8 * s, Math.max(1.5 * s, ty.tgt)), z = twQty(s, tg, next); return { s, tg, ...z, typ: s === Math.round(ty.stop) }; });
    const tz = tbl.find((r) => r.typ);
    const dots = Array.from({ length: E.limit }, (_, i) => { const n = i + 1, k = E.session == null ? '' : n < E.session ? 'done' : n === E.session ? 'now' : '';
      return `<i class="${k}" title="Session ${n}">${n}</i>`; }).join('');
    const statusK = E.status === 'passed' ? 'good' : E.status === 'failed' ? 'bad' : '';
    const ODDS = tw?.eval ? [['H2', 'H2 starts · the check (quote this)'], ['H1', 'H1 starts · picked on'], ['2026', 'All 2026 starts'], ['mc_H2', 'Monte Carlo · H2 days'],
      ['mc_H1', 'Monte Carlo · H1 days'], ['2021-25', '2021-25 · reference (5m bars)']].filter(([k]) => tw.eval[k]) : [];
    const h2 = tw?.eval?.H2;
    el.innerHTML = head('Today · MFFU Builder 50K · Eval HQ', E.status === 'passed' ? 'Eval passed' : `${usd(E.toGo)} to pass${E.left != null ? ` · ${plural(E.left, 'session')} left` : ''}`,
      `The owner’s rule: an eval is decided within 2 weeks (10 sessions). Paper eval on the cloud bot; sizing mode <b>${esc(E.mode)}</b>.`) +
      howto('evalhq', `<ul><li><b>Pass path</b>: the 10 sessions of the 2-week window; the lit one is today. <b>Needed per session</b> = what is left to +$3,000 spread over the sessions left.</li>
        <li><b>One winner passes</b>: the live two_week sizing buys enough micros that one trade reaching its target covers everything still needed, but never more than ${RFP()}% of the room to the trailing floor and never more than the $1,000 soft daily loss on a full stop. The table shows that rule at different stop sizes (the target is 2026’s median target distance, kept between 1.5R and 8R).</li>
        <li><b>Odds</b>: replays of every possible eval start in 2026 with the live sizing (${esc(tw?.run || "run lit_2wk_rec")}: Monte Carlo starts at the live two_week switches, research/lit/uprisk_eval.json). Pass / fail / still open after 10 sessions. H2 (Jul–Oct) is the honest check; H1 is where the rules were picked.</li>
        <li>All of it is the paper eval and the backtest. The bot never places real orders.</li></ul>`) +
      `<div class="card lex-hq"><div class="card-h"><h3>Pass path · paper eval</h3>${tag(esc(E.status).toUpperCase(), statusK)}</div>
        <div class="lex-big"><b>${usd(E.bal)}</b><span class="${cls(E.profit)}">${susd(E.profit)} since the start${E.ev.start ? ` (${fDate(E.ev.start)})` : ''}</span></div>
        <div class="lex-dots">${dots}</div>
        <p class="small mut" style="margin:6px 0 12px">${esc(E.e2.text || (E.session ? `session ${E.session} of ${E.limit}` : 'eval clock not started'))}${E.e2.reset === false || E.e2.reset == null ? ' · no reset: after session 10 it keeps going in safe_eval' : ''}</p>
        <div class="lex-prog"><div class="meter good"><i style="width:${Math.max(0, Math.min(100, E.profit / E.P.target * 100)).toFixed(1)}%"></i></div><div class="small"><span>To the $${E.P.target.toLocaleString('en-US')} target</span><b>${usd(E.toGo)} to go</b></div></div>
        <div class="lex-prog"><div class="meter"><i style="width:${Math.max(0, Math.min(100, E.room / E.P.mll * 100)).toFixed(1)}%"></i></div><div class="small"><span>Room above the floor ${usd(E.floor)}${E.floor >= E.P.lock_at - .5 ? ' (locked)' : ''}</span><b>${usd(E.room)}</b></div></div>
        ${lifeLine(E.lv)}
      </div>
      <div class="stats">
        ${statBox('Needed / session', perSess != null ? usd(perSess) : '—', E.left != null ? `${usd(E.toGo)} over ${plural(E.left, 'session')}` : 'eval clock missing')}
        ${statBox('Today · paper', susd(E.cum), `${plural(E.today.length, 'trade')}${E.tradedToday ? ' · done (1 a day)' : ''}`, cls(E.cum))}
        ${statBox('Next winner', tz ? (tz.win >= E.toGo ? 'Passes' : susd(tz.win)) : '—', tz ? `${tz.q} micros at a ${tz.s}-pt stop, ${Math.round(tz.tg)}-pt target` : '', tz && tz.win >= E.toGo ? 'up' : '')}
        ${statBox('Next full stop', tz ? usd(-tz.risk) : '—', tz ? `${pct(tz.risk / Math.max(1, E.room) * 100)} of the room · soft daily limit $${E.P.dll.toLocaleString('en-US')}` : '', 'dn')}
      </div>
      <div class="card"><div class="card-h"><h3>One winner passes · ${E.tradedToday ? 'the next session' : 'the next trade'}</h3><span class="meta">two_week sizing · from the balance now</span></div>
        <div class="tw fit"><table class="ht lex-t"><tr><th>Stop</th><th class="c">Micros</th><th class="c">Full stop</th><th class="c">If it hits</th></tr>
        ${tbl.map((r) => `<tr class="${r.typ ? 'lex-on' : ''}"><td><b>${r.s} pts</b><span class="dl small mut">${Math.round(r.tg)} pts · ${num(r.tg / r.s, 1)}R${r.typ ? ' · 2026 median' : ''}</span></td><td class="v">${r.q}<span class="dl small mut">${esc(r.short)}</span></td>
          <td class="v dn">${usd(-r.risk)}</td>
          <td class="v ${r.win >= E.toGo ? 'up' : ''}">${susd(r.win)}<span class="dl small ${r.win >= E.toGo ? 'up' : 'mut'}">${r.win >= E.toGo ? 'passes' : usd(E.toGo - r.win) + ' left'}</span></td></tr>`).join('')}</table></div>
        <p class="note">Wide stop, fewer micros: the room cap (${RFP()}% of ${usd(E.room)}) and the $1,000 soft daily loss shrink the size as the stop grows, so a wide-stop winner may not pass in one go. Costs in: $1.90 a micro round trip, 1 tick of stop slippage. ${ok(lit.vix_move) ? `Today’s target band: 18:00 open ${num(lit.open18)} ± 1 VIX day move = ${num(lit.vix_move, 0)} pts (VIX ${num(lit.vix, 1)}), banked at 8R.` : ''}</p></div>
      ${ODDS.length ? `<div class="card"><div class="card-h"><h3>Odds of deciding in 2 weeks · live sizing</h3><span class="meta">run ${esc(tw.run)} · backtest</span></div>
        <div class="lex-odds">${ODDS.map(([k, lab]) => { const o = tw.eval[k]; return `<div class="o"><div class="h"><span>${lab}</span><b>${pct(o.p10)} pass</b></div>
          <div class="bar"><i class="p" style="width:${o.p10}%"></i><i class="f" style="width:${o.f10}%"></i><i class="u" style="width:${Math.max(0, 100 - o.p10 - o.f10)}%"></i></div>
          <div class="s small mut"><span class="dn">${pct(o.f10)} fail</span> · ${pct(o.o10)} still open after 10 · ${pct(o.p20)} pass in 20 · median ${num(o.pass_med, 0)} sessions${ok(o.cost) ? ` · ${usd(o.cost)} per 2-week pass` : ''}</div></div>`; }).join('')}</div>
        <p class="note">Green = passed within 10 sessions, red = failed (trailing floor hit), grey = still open after 10 (it keeps going: no reset). $ per 2-week pass = $91.80 per eval ÷ the 2-week pass rate. ${h2 ? `Worst day ${usd(h2.worst_day)}, most at risk on one trade ${usd(h2.max_risk)} (H2).` : ''}</p>
        ${x.eventual ? `<div class="kv" style="margin-top:12px">${['H2', 'MC H2', 'H1', 'MC H1'].filter((k) => x.eventual[k]).map((k) => `<div><span>Eventual pass · ${k}</span><b>${pct(x.eventual[k].pass)} <small class="mut">/ ${pct(x.eventual[k].fail)} fail</small></b></div>`).join('')}</div>
          <p class="note">Eventual = the same eval kept going after session 10 in safe_eval (the live rule, no reset).</p>` : ''}
        ${tw.money ? `<div class="kv" style="margin-top:12px">${[['2026', '2026'], ['2021-25', '2021-25 ref']].filter(([k]) => tw.money[k]?.net != null).map(([k, l]) => { const m = tw.money[k];
          return `<div><span>Back-to-back evals · ${l}</span><b class="${cls(m.net)}">${kusd(m.net)} <small class="mut">${kusd(m.per_month)}/mo · PF ${fPF(m.pf)}</small></b></div>`; }).join('')}</div>` : ''}
        ${srcLine(esc(x.sources?.two_week || ''))}</div>` : `<div class="card">${noData('The two-week odds (run lit_2wk_rec)')}</div>`}
      ${x?.mc_normal?.prob ? `<div class="card"><div class="card-h"><h3>For comparison · normal sizing</h3><span class="meta">Monte Carlo · ${esc(x.mc_normal.built || '')}</span></div>
        <div class="kv">${[['pass_2w', 'Pass in 2 wk'], ['fail_2w', 'Fail in 2 wk'], ['pass_4w', 'Pass in 4 wk'], ['pass_60', 'Pass in 60 sessions']].map(([k, l]) => `<div><span>${l}</span><b>${pct(x.mc_normal.prob[k])}</b></div>`).join('')}
          <div><span>Median sessions to pass</span><b>${num(x.mc_normal.prob.pass_days_median, 0)}</b></div></div>
        <p class="note">The plain LIT size ($800 up to a 20-pt stop) is slower: it decides far fewer evals in 2 weeks. That is why the eval runs in two_week mode.</p>${srcLine(esc(x.sources?.mc_normal || ''))}</div>` : ''}
      <div class="grid g2"><div class="card"><div class="card-h"><h3>Rules in force</h3><button class="chipbtn lex-tx" type="button" data-go="mffurules">${icon('rules')}<span>All MFFU rules</span></button></div>
        <div class="kv one"><div><span>Profit target</span><b>+${usd(E.P.target)}</b></div><div><span>Trailing max loss (end of day)</span><b>${usd(E.P.mll)} · locks at ${usd(E.P.lock_at)}</b></div>
          <div><span>Soft daily loss</span><b>${usd(E.P.dll)} (pauses the day)</b></div><div><span>Max size</span><b>40 micros</b></div><div><span>Bot flat by</span><b>15:55 ET (MFFU closes 16:10)</b></div>
          <div><span>Trades a day</span><b>1</b></div><div><span>Eval price paid</span><b>$91.80 one-time</b></div></div></div>
        <div class="card"><div class="card-h"><h3>Where to look next</h3></div><div class="lex-links">
          <button class="chipbtn" type="button" data-go="cockpit">${icon('prop')}<span>Eval cockpit</span></button><button class="chipbtn" type="button" data-go="evals">${icon('sim')}<span>Monte Carlo</span></button>
          <button class="chipbtn" type="button" data-go="pnlcal">${icon('results')}<span>P&amp;L calendar</span></button><button class="chipbtn" type="button" data-go="edge">${icon('heat')}<span>Edge</span></button>
          <button class="chipbtn" type="button" data-go="ops">${icon('check')}<span>Ops check</span></button></div></div></div>`;
  };

  // ============================================================================================= EDGE
  VIEWS.edge = (el) => {
    const x = X(); if (!x || !x.trades) { el.innerHTML = head('Trades · backtest', 'Edge', '') + `<div class="card">${noData('The trade analytics')}</div>`; return; }
    const sp = store.get('ex.span', '2026'), t = span(sp), K = kpis(t), mo = months(sp), P = PER()[PERIOD_OF[sp]] || {};
    const bins = [['Full stop', (r) => r <= -0.9], ['Part loss', (r) => r > -0.9 && r < -0.1], ['Breakeven', (r) => r >= -0.1 && r <= 0.1], ['0–1R', (r) => r > 0.1 && r <= 1],
      ['1–2R', (r) => r > 1 && r <= 2], ['2–4R', (r) => r > 2 && r <= 4], ['4–6R', (r) => r > 4 && r <= 6], ['6R+', (r) => r > 6]];
    const hist = bins.map(([l, f]) => { const g = t.filter((q) => f(q.r)); return { label: l, v: g.length, sub: `${kusd(sum(g, (q) => q.pnl))} · ${pct(t.length ? g.length / t.length * 100 : 0)}`, color: l === 'Breakeven' ? '#9aa3b5' : /stop|loss/.test(l.toLowerCase()) ? 'var(--bad)' : 'var(--good)', k: '' }; });
    const hrs = []; for (let h = 2; h <= 15; h++) { const g = t.filter((q) => Math.floor(q.min / 60) === h); if (g.length) hrs.push({ label: `${String(h).padStart(2, '0')}:00`, v: sum(g, (q) => q.pnl), sub: `${g.length} · ${fR(sum(g, (q) => q.r) / g.length)}` }); }
    const wds = [0, 1, 2, 3, 4].map((w) => { const g = t.filter((q) => q.wd === w); return { label: WD[w], v: sum(g, (q) => q.pnl), sub: g.length ? `${g.length} · ${fR(sum(g, (q) => q.r) / g.length)}` : '0' }; });
    const SB = [[0, 20], [20, 30], [30, 45], [45, 60], [60, 999]];
    const sb = SB.map(([a, b]) => { const g = t.filter((q) => q.risk_pts > a && q.risk_pts <= b), k = kpis(g); return { a, b, g, k, qty: med(g.map((q) => q.qty)) }; }).filter((r) => r.g.length);
    const ex = ['TARGET', 'STOP', 'BE', 'TIME'].map((e) => { const g = t.filter((q) => q.exit === e); return { label: e === 'BE' ? 'Breakeven' : e === 'TIME' ? 'Time (15:55)' : e[0] + e.slice(1).toLowerCase(), v: sum(g, (q) => q.pnl), sub: `${g.length} · ${fR(g.length ? sum(g, (q) => q.r) / g.length : 0)}` }; });
    const ls = [[1, 'Long'], [-1, 'Short']].map(([d, l]) => { const g = t.filter((q) => q.dir === d); return { label: l, v: sum(g, (q) => q.pnl), sub: `${g.length} · ${pct(kpis(g).win || 0)} won · PF ${fPF(kpis(g).pf)}` }; });
    const lv = (x.levels && x.levels[sp]) || [];
    el.innerHTML = head('Zlarior · backtest · ' + (SPANS.find((s) => s[0] === sp) || [])[1], 'Edge', 'Where the strategy makes and loses its money. Backtest trades with the live rules at the normal size ($800 up to a 20-pt stop), costs in.', spanSeg('exSpan')) +
      howto('edge', `<ul><li><b>2026</b> is how LIT is judged (owner, 2026-10-18): rules picked on <b>H1</b> (Jan–Jun), checked on <b>H2</b> (Jul–Oct). <b>2021-25</b> is a reference line on 5m bars only (no 1m data), never a gate.</li>
        <li><b>R</b> = the result in units of the money at risk on that trade. A full stop is −1R; LIT banks winners at the VIX target, up to 8R.</li>
        <li>The $ figures are at the normal backtest size. The eval runs the two_week size, so its $ per trade differ; R and the patterns are the same trades.</li>
        <li>Few trades in a row means little: a bucket with under 10 trades is a hint, not a rule.</li></ul>`) +
      `<div class="stats">${statBox('Trades', K.n, P.per_week ? `${num(P.per_week, 2)} a week · ${P.weeks_2plus_pct ?? '—'}% weeks with 2+` : '')}${statBox('Won', pct(K.win), `avg ${fR(K.avg)} a trade`)}
        ${statBox('Net', kusd(K.net), `${kusd(K.net / mo)} a month · ${fR(K.netR, 1)}`, cls(K.net))}${statBox('Profit factor', fPF(K.pf), P.max_dd != null ? `max DD ${kusd(P.max_dd)}` : '')}</div>
      <div class="grid g2"><div class="card"><div class="card-h"><h3>R multiples</h3><span class="meta">trades per result · $ in each</span></div>${hbars(hist, { fmt: (v) => String(v), signed: false })}</div>
        <div class="card"><div class="card-h"><h3>How each trade ended</h3><span class="meta">net $ · trades · avg R</span></div>${hbars(ex)}<div style="height:12px"></div>${hbars(ls)}</div></div>
      <div class="card"><div class="card-h"><h3>Best move vs worst move (MFE vs MAE)</h3><span class="meta">R · dot = one trade</span></div><div id="exMM" class="lex-sc"></div>
        <p class="note">Right = the trade went further against the entry before it ended (MAE), up = the best point it reached (MFE). Green = target, red = stop, grey = breakeven, amber = time exit. Stops that first ran past +1R are the breakeven rule’s job.</p>
        <div class="lex-leg">${Object.entries(EXIT_C).map(([k, c]) => `<span><i style="background:${c}"></i>${k === 'BE' ? 'Breakeven' : k[0] + k.slice(1).toLowerCase()}</span>`).join('')}</div></div>
      <div class="card"><div class="card-h"><h3>Stop size vs result</h3><span class="meta">stop in points · R</span></div><div id="exSR" class="lex-sc"></div>
        <div class="tw fit"><table class="ht lex-t"><tr><th>Stop</th><th class="c">Trades</th><th class="c">Won</th><th class="c">Avg R</th><th class="c">Net</th><th class="c">Micros</th></tr>
        ${sb.map((r) => `<tr><td>${r.b > 900 ? `${r.a}+ pts` : `${r.a}–${r.b} pts`}</td><td class="v">${r.k.n}</td><td class="v">${pct(r.k.win)}</td><td class="v ${cR(r.k.avg)}">${fR(r.k.avg)}</td><td class="v ${cls(r.k.net)}">${kusd(r.k.net)}</td><td class="v">${num(r.qty, 0)}</td></tr>`).join('')}</table></div>
        <p class="note">Wide stop means fewer micros (size follows the stop), so a wide-stop loss costs about the same $ as a tight one.</p></div>
      <div class="grid g2"><div class="card"><div class="card-h"><h3>Entry hour (ET)</h3><span class="meta">net $ · trades · avg R</span></div>${hbars(hrs)}</div>
        <div class="card"><div class="card-h"><h3>Weekday</h3><span class="meta">net $ · trades · avg R</span></div>${hbars(wds)}<p class="note">Most LIT trades enter 02:00–08:00 ET (London): the PC and NinjaTrader must run from about 01:55 ET.</p></div></div>
      <div class="card"><div class="card-h"><h3>Which levels pay</h3><span class="meta">the level swept before the entry</span></div>
        ${lv.length ? `<div class="tw fit"><table class="ht lex-t"><tr><th>Level</th><th class="c">Avg R</th><th class="c">Net</th><th class="c">PF</th></tr>
        ${lv.map((r) => `<tr><td>${esc(r.name)}<span class="dl small mut">${r.n} trades · ${pct(r.win)} won${r.n < 10 ? ' · thin' : ''}</span></td><td class="v ${cR(r.avg_r)}">${fR(r.avg_r)}</td><td class="v ${cls(r.net)}">${kusd(r.net)}</td><td class="v">${r.pf == null ? '∞' : fPF(r.pf)}</td></tr>`).join('')}</table></div>` : emptyBox('No level data.', '')}
        <p class="note">A sweep often takes 2 levels at once (say the Tokyo high and an equal-highs build-up), so a trade counts once for each level it took; the rows add up to more than the trade count.</p></div>
      ${srcLine(esc(x.sources?.trades || ''))}`;
    bindSpan('exSpan');
    const tip = (q) => `<b>${fDate(q.day)} ${hm(q.min)} · ${q.dir > 0 ? 'Long' : 'Short'}</b><span>${esc(q.exit)} ${fR(q.r)} · ${susd(q.pnl)}</span><span>stop ${num(q.risk_pts, 2)} pts · ${q.qty} micros</span>`;
    const mm = t.filter((q) => ok(q.mae) && ok(q.mfe));
    scatter($('#exMM'), mm.map((q) => ({ x: Math.min(1.3, +q.mae), y: Math.min(9, +q.mfe), r: 4.5, color: EXIT_C[q.exit] || '#9aa3b5', alpha: .75, tip: tip(q) })),
      { h: 280, xmin: 0, xlab: 'MAE: worst point against (R)', ylab: 'MFE: best point (R)', refY: 1, xfmt: (v) => num(v, 1), yfmt: (v) => num(v, 0), empty: 'No MAE / MFE in this span.' });
    scatter($('#exSR'), t.map((q) => ({ x: +q.risk_pts, y: Math.max(-1.3, Math.min(8.5, +q.r)), r: 4.5, color: EXIT_C[q.exit] || '#9aa3b5', alpha: .75, tip: tip(q) })),
      { h: 260, xlab: 'stop (points)', ylab: 'result (R)', refY: 0, xfmt: (v) => num(v, 0), yfmt: (v) => num(v, 0) });
  };

  // ============================================================================================= P&L CALENDAR
  VIEWS.pnlcal = (el) => {
    const src = store.get('ex.calsrc', 'bt'), days = (D.results?.days || []).filter((d) => d[2] > 0 || d[1]);
    const led = (L().ledger || []).filter((v) => v.day && v.taken !== false);
    const paper = {}; for (const v of led) { const p = paper[v.day] || (paper[v.day] = [0, 0, 0]); p[0] += +v.usd || 0; p[1] += 1; p[2] += +v.R || 0; }
    const byDay = new Map(src === 'paper' ? Object.entries(paper).map(([d, p]) => [d, [p[0], p[1], p[2]]]) : days.map((d) => [d[0], [d[1], d[2], null]]));
    const keys = [...byDay.keys()].sort(), allMonths = [...new Set(keys.map((k) => k.slice(0, 7)))];
    const today = L().today || new Date().toISOString().slice(0, 10);
    let cur = store.get('ex.calm', null); if (!cur || !allMonths.includes(cur)) cur = allMonths[allMonths.length - 1] || today.slice(0, 7);
    const yr = cur.slice(0, 4), bt = new Map(allRows().map((t) => [t.day, t]));
    // the month grid: Monday to Friday
    const [Y, M] = cur.split('-').map(Number), nd = new Date(Date.UTC(Y, M, 0)).getUTCDate();
    let cells = '', first = true, mNet = 0, mN = 0, mG = 0;
    for (let d = 1; d <= nd; d++) {
      const dt = new Date(Date.UTC(Y, M - 1, d)), w = (dt.getUTCDay() + 6) % 7; if (w > 4) continue;
      if (first) { cells += '<span class="e"></span>'.repeat(w); first = false; }
      const k = `${cur}-${String(d).padStart(2, '0')}`, v = byDay.get(k);
      if (v && v[1]) { mNet += v[0]; mN += v[1]; if (v[0] > 0) mG++; }
      const a = v && v[1] ? Math.min(1, Math.abs(v[0]) / 2500) : 0, bg = v && v[1] ? (v[0] > 0 ? `rgba(46,229,157,${(.14 + .6 * Math.sqrt(a)).toFixed(2)})` : v[0] < 0 ? `rgba(255,90,122,${(.14 + .6 * Math.sqrt(a)).toFixed(2)})` : 'rgba(154,163,181,.18)') : '';
      cells += `<button type="button" class="d${k === today ? ' now' : ''}${v && v[1] ? '' : ' z'}" data-k="${k}" style="${bg ? 'background:' + bg : ''}"><i>${d}</i>${v && v[1] ? `<b>${kusd(v[0])}</b>` : ''}</button>`;
    }
    // streaks over the selected year (trading days only)
    const yk = keys.filter((k) => k.startsWith(yr) && byDay.get(k)[1] > 0), seq = yk.map((k) => byDay.get(k)[0]);
    let bw = 0, bl = 0, cw = 0, cl = 0; for (const v of seq) { if (v > 0) { cw++; cl = 0; } else if (v < 0) { cl++; cw = 0; } bw = Math.max(bw, cw); bl = Math.max(bl, cl); }
    const last = seq.length ? seq[seq.length - 1] : 0, curS = last > 0 ? `${cw} green` : last < 0 ? `${cl} red` : '—';
    const best = yk.reduce((b, k) => (!b || byDay.get(k)[0] > byDay.get(b)[0] ? k : b), null), worst = yk.reduce((b, k) => (!b || byDay.get(k)[0] < byDay.get(b)[0] ? k : b), null);
    const weeks = {}; for (const k of yk) { const dt = new Date(k + 'T12:00:00Z'), mon = new Date(dt - ((dt.getUTCDay() + 6) % 7) * 864e5).toISOString().slice(0, 10); const w = weeks[mon] || (weeks[mon] = [0, 0]); w[0] += byDay.get(k)[0]; w[1] += byDay.get(k)[1]; }
    const wv = Object.values(weeks), green = seq.filter((v) => v > 0).length;
    let btRed = 0; { let c = 0; for (const d of days) if (String(d[0]) >= '2026' && d[2] > 0) { c = d[1] < 0 ? c + 1 : 0; btRed = Math.max(btRed, c); } }
    // this week vs the backtest's expectation (2026 H2, the check half)
    const H2 = PER()['2026 H2 (check)'] || PER()['2026 YTD'] || {}, nowD = new Date(today + 'T12:00:00Z'), monK = new Date(nowD - ((nowD.getUTCDay() + 6) % 7) * 864e5).toISOString().slice(0, 10);
    const friK = new Date(Date.parse(monK + 'T12:00:00Z') + 4 * 864e5).toISOString().slice(0, 10);
    const wk = led.filter((v) => v.day >= monK && v.day <= friK), wkR = sum(wk, (v) => +v.R || 0), wkUsd = sum(wk, (v) => +v.usd || 0);
    const h2w = H2.from && H2.to ? Math.max(1, (Date.parse(H2.to) - Date.parse(H2.from)) / (7 * 864e5)) : null, expT = H2.per_week || null;
    const h2t = span('H2'), expR = h2t.length && expT ? sum(h2t, (q) => q.r) / h2t.length * expT : null, expUsd = h2w ? H2.net / h2w : null;
    const wdLeft = Math.max(0, 4 - ((nowD.getUTCDay() + 6) % 7));
    el.innerHTML = head('Trades · ' + (src === 'paper' ? 'cloud paper bot' : 'Zlarior backtest'), 'P&L calendar', src === 'paper' ? 'Every paper trade of the cloud bot, by day (paper only: no real orders).' : 'Every replay trading day: live rules, normal size ($800 up to a 20-pt stop), costs in.',
      segHTML('exCalSrc', [['bt', 'Backtest'], ['paper', 'Paper · live']], src)) +
      `<div class="card lex-wk"><div class="card-h"><h3>This week vs the backtest</h3><span class="meta">${fDate(monK)} – ${fDate(friK)} · paper</span></div>
        <div class="lex-gauge"><div><span>Trades</span><b>${wk.length} <small class="mut">of ~${num(expT, 1)} expected</small></b><div class="meter"><i style="width:${expT ? Math.min(100, wk.length / 4 * 100) : 0}%"></i><em style="left:50%"></em></div><small class="mut">owner’s band 2–4 a week · ${plural(wdLeft, 'session')} left after today</small></div>
          <div><span>Result</span><b class="${cls(wkR)}">${fR(wkR)} <small class="${cls(wkUsd)}">${susd(wkUsd)}</small></b><small class="mut">backtest H2 average week ${expR != null ? fR(expR) : '—'} · ${expUsd != null ? kusd(expUsd) : '—'} at normal size</small></div></div>
        <p class="note">One quiet week is normal: in 2026 ${PER()['2026 YTD']?.weeks_2plus_pct ?? '—'}% of weeks had 2+ trades. Paper $ is at the eval’s two_week size; the backtest $ at the normal size, so compare R.</p></div>
      <div class="card"><div class="card-h"><h3>${MONTHS[M - 1]} ${Y}</h3><div class="lex-mnav"><button class="chipbtn" type="button" data-m="-1" aria-label="Previous month">${icon('left')}</button><button class="chipbtn" type="button" data-m="1" aria-label="Next month">${icon('right')}</button></div></div>
        <div class="lex-cal"><span class="h">Mon</span><span class="h">Tue</span><span class="h">Wed</span><span class="h">Thu</span><span class="h">Fri</span>${cells}</div>
        <div class="lex-calinfo small" id="exCalI">${mN ? `<b class="${cls(mNet)}">${susd(mNet)}</b> this month · ${plural(mN, 'trade')} · ${mG} green days. Tap a day.` : 'No trades this month.'}</div></div>
      <div class="card"><div class="card-h"><h3>Streaks · ${yr}</h3><span class="meta">trading days only</span></div>
        <div class="kv">
          <div><span>Green days</span><b>${seq.length ? pct(green / seq.length * 100) : '—'} <small class="mut">${green} of ${seq.length}</small></b></div>
          <div><span>Now</span><b>${curS}</b></div><div><span>Longest green run</span><b class="up">${bw} days</b></div><div><span>Longest red run</span><b class="dn">${bl} days</b></div>
          <div><span>Best day</span><b class="${best ? cls(byDay.get(best)[0]) : ''}">${best ? susd(byDay.get(best)[0]) : '—'} <small class="mut">${best ? fDate(best) : ''}</small></b></div>
          <div><span>Worst day</span><b class="${worst ? cls(byDay.get(worst)[0]) : ''}">${worst ? susd(byDay.get(worst)[0]) : '—'} <small class="mut">${worst ? fDate(worst) : ''}</small></b></div>
          <div><span>Green weeks</span><b>${wv.length ? pct(wv.filter((w) => w[0] > 0).length / wv.length * 100) : '—'}</b></div>
          <div><span>Year so far</span><b class="${cls(sum(seq))}">${kusd(sum(seq))} <small class="mut">${kusd(sum(seq) / Math.max(1, new Set(yk.map((k) => k.slice(0, 7))).size))}/mo</small></b></div></div>
        <p class="note">A red run of several days is part of LIT: about 1 trade in 4 wins, and the winners are large. In the 2026 backtest the longest red run was ${btRed} trading days.</p></div>`;
    onSeg('exCalSrc', (v) => { store.set('ex.calsrc', v); store.set('ex.calm', null); render(true); });
    $$('.lex-mnav [data-m]', el).forEach((b) => b.onclick = () => { const i = allMonths.indexOf(cur) + +b.dataset.m; if (i >= 0 && i < allMonths.length) { store.set('ex.calm', allMonths[i]); render(true); } else toast(src === 'paper' ? 'No paper trades that month' : 'No backtest days that month'); });
    const cal = $('.lex-cal', el); if (cal) cal.onclick = (e) => {
      const c = e.target.closest('.d[data-k]'); if (!c) return; $$('.d.on', cal).forEach((q) => q.classList.remove('on')); c.classList.add('on');
      const k = c.dataset.k, v = byDay.get(k), info = $('#exCalI');
      if (!v || !v[1]) { info.innerHTML = `<b>${fDate(k)}</b> · no trade`; return; }
      const t = src === 'bt' ? bt.get(k) : null, pr = src === 'paper' ? led.filter((q) => q.day === k) : [];
      info.innerHTML = `<b>${WD[(new Date(k + 'T12:00:00Z').getUTCDay() + 6) % 7]} ${fDate(k)}</b> · <b class="${cls(v[0])}">${susd(v[0])}</b> · ${plural(v[1], 'trade')}` +
        (t ? ` · ${t.dir > 0 ? 'Long' : 'Short'} ${hm(t.min)} ET · ${esc(t.exit)} ${fR(t.r)} · ${num(t.risk_pts, 2)}-pt stop, ${t.qty} micros` : '') +
        pr.map((q) => ` · ${esc(q.side)} ${esc(q.entry || '')} · ${esc(q.exit || 'open')} ${fR(q.R)} · ${q.qty} micros`).join('');
    };
  };

  // ============================================================================================= OPS CHECK
  const CHECK = [
    ['pc', 'PC on, plugged in, awake by 01:55 ET', 'Most LIT trades enter 02:00–08:00 ET. Sleep or hibernate settings off.'],
    ['nt', 'NinjaTrader open and connected', 'Control Center: the Tradovate connection is green. Accounts tab shows the eval account.'],
    ['ati', 'Automated Trading Interface on', 'Control Center > Tools > Options > Automated trading interface > AT Interface ticked.'],
    ['feed', 'LE_BarFeed chart open on MNQ', 'It writes le_feed\\MNQ_1m.csv; without fresh bars the bot opens no new trade (FEED STALE; no Yahoo).'],
    ['bot', 'The bot is running and says ready', 'Dashboard log: "NinjaTrader adapter: account …, ready". The Accounts page shows the account.'],
    ['news', 'Looked at today’s news', 'Red USD events (CPI, NFP, FOMC) move NQ hard. MFFU allows news trading on Builder.'],
    ['push', 'Phone notifications on', 'Settings > Notifications: one notice for every entry and result.'],
    ['flat', 'After the close: flat', 'The bot is flat by 15:55 ET; MFFU closes everything at 16:10 ET. On CME half-days flatten yourself.'],
  ];
  VIEWS.ops = (el) => {
    const lv = L(), now = Date.now() / 1000, e = et(now), mod = e.h * 60 + e.mi, wkday = !['Sat', 'Sun'].includes(e.wd), mkt = wkday && mod >= 120 && mod <= 990;
    const H = lv.health || {}, pc = lv.pc || {}, push = lv.push || {}, e2 = lv.eval_2wk || {}, repo = X()?.repo;
    const age = lv.last_run ? now - lv.last_run : null;
    const lights = [
      ['Cloud paper bot', age == null ? 'no run yet' : `last run ${ago(lv.last_run)}`, age == null ? 'bad' : mkt ? (age < 45 * 60 ? 'good' : age < 90 * 60 ? 'warn' : 'bad') : 'good',
        mkt ? 'Runs every 30 min 02:00–16:25 ET on market days (GitHub Actions).' : 'Outside market hours the cloud bot sleeps; that is normal.'],
      ['Price feed', H.error ? 'error' : H.stale ? `stale · last bar ${esc(H.last_bar || '')}` : `last bar ${esc(H.last_bar || '—')}${ok(H.age_min) ? ` (${num(H.age_min, 0)} min)` : ''}`,
        H.error ? 'bad' : (H.stale || H.waiting) && mkt ? 'warn' : 'good', `${H.waiting ? esc(H.waiting) + '. ' : ''}${H.source === 'yahoo' ? 'Yahoo NQ=F' : "The PC's NinjaTrader bars (no Yahoo)"} for the cloud bot; ${H.bars_today ?? '—'} bars today${(H.gaps_today || []).length ? `, ${H.gaps_today.length} gaps` : ''}.`],
      ['PC bot heartbeat', pc.present ? (pc.silent ? 'silent' : `reporting${ok(pc.age_s) ? ` · ${Math.round(pc.age_s / 60)} min ago` : ''}`) : 'not reporting',
        pc.present ? (pc.silent ? 'bad' : 'good') : mkt ? 'warn' : '', pc.present ? `${esc(pc.adapter || '')} ${esc(pc.host || '')}` : `The PC bot sends a heartbeat when LE_HEARTBEAT=1 (${esc(pc.reason || 'none')}).`],
      ['Phone notifications', push.configured ? `${push.devices ?? 0} device${push.devices === 1 ? '' : 's'}` : 'off', push.configured && push.devices ? 'good' : 'warn',
        push.devices ? 'Every fill and result is pushed to the Home Screen app.' : 'Open Settings > Notifications on the phone and tap Allow.'],
      ['Eval clock', e2.text || 'not started', e2.status === 'failed' ? 'bad' : e2.status === 'passed' ? 'good' : e2.session ? 'good' : 'warn', `Sizing mode ${esc(lv.lit_sizing || '—')} · ${esc(lv.model_state || '')}`],
    ];
    const ck = store.get('ex.ops.' + lv.today, {}) || {};
    const gh = (p) => repo ? `https://github.com/${repo}/${p}` : null;
    const LINKS = [['Cloud bot runs (Actions)', gh('actions/workflows/cloud-monitor.yml'), 'see each run, or Run workflow by hand'], ['Dashboard branch README', gh('blob/dashboard/README.md'), 'the cloud bot’s text report'],
      ['Go-live steps', gh('blob/HEAD/docs/GO_LIVE_TONIGHT.md'), 'the eval go-live checklist'], ['NinjaTrader setup', gh('blob/HEAD/ninjatrader/SETUP.md'), 'install, connect, test on Sim101'],
      ['Phone notifications', gh('blob/HEAD/docs/NOTIFICATIONS.md'), 'how the push works'], ['PC-off options', gh('blob/HEAD/scripts/PC_OFF_OPTIONS.md'), 'free ways to run with the PC off'],
      ['MFFU help center', 'https://help.myfundedfutures.com/', 'the firm’s own rule pages']].filter((l) => l[1]);
    el.innerHTML = head('Today · operations', 'Ops check', 'Is everything that the bot needs running? Live lights from the last cloud run, then your own checklist for the session.') +
      `<div class="card"><div class="card-h"><h3>Live lights</h3><span class="meta">${lv.last_run ? 'cloud run ' + ago(lv.last_run) : ''} · ${mkt ? 'market hours' : 'outside the LIT window'}</span></div>
        <div class="lex-lights">${lights.map(([n, v, k, s]) => `<div class="li ${k}"><i></i><div><b>${n}</b><span>${v}</span><em>${s}</em></div></div>`).join('')}</div></div>
      <div class="card"><div class="card-h"><h3>Session checklist · ${fDate(lv.today)}</h3><span class="meta" id="exCkN">${Object.values(ck).filter(Boolean).length} of ${CHECK.length}</span></div>
        <div class="lex-ck">${CHECK.map(([k, t, s]) => `<label><input type="checkbox" data-ck="${k}"${ck[k] ? ' checked' : ''}><span><b>${t}</b><em>${s}</em></span></label>`).join('')}</div>
        <p class="note">Ticks stay on this phone for today only. Going live on the eval is your step: this app never places orders.</p></div>
      <div class="card"><div class="card-h"><h3>NinjaTrader log: what it means</h3></div><div class="lex-log">
        <div><span><code>did not pick up … NOT executed</code></span><b>NinjaTrader closed or AT Interface off</b></div>
        <div><span><code>REFUSED: …</code></span><b>a safety gate said no (size, time, kill, open position)</b></div>
        <div><span><code>fill not reported yet</code></span><b>stop and target go in at the next poll; cancelled after 45 s</b></div>
        <div><span><code>… REJECTED …: flattening</code></span><b>stop or target refused: position closed, read the Log tab</b></div>
        <div><span><code>FLATTEN NOT CONFIRMED</code></span><b>look at NinjaTrader now; the bot retries every 30 s</b></div>
        <div><span><code>FEED STALE: NinjaTrader …</code></span><b>LE_BarFeed chart closed or disconnected: no new trade until it is back</b></div></div></div>
      <div class="card lex-kill"><div class="card-h"><h3>Stop or kill</h3></div><ol>
        <li><b>Stop</b> (no new trades): dashboard <b>Stop</b>. An open trade keeps its stop and target; the bot no longer moves the stop.</li>
        <li><b>Kill</b>: dashboard <b>HOLD TO KILL</b>, or NinjaTrader right-click &gt; <b>Flatten Everything</b>. It flattens every account connected in NinjaTrader.</li>
        <li>NinjaTrader down too: flatten in the Tradovate or MFFU app.</li>
        <li>No trade for 5 days: place 1 MNQ by hand (MFFU may close accounts after 7 quiet days).</li></ol></div>
      <div class="card"><div class="card-h"><h3>Quick links</h3><span class="meta">open in the GitHub app</span></div>
        <div class="lex-ql">${LINKS.map(([n, u, s]) => `<a href="${esc(u)}" target="_blank" rel="noopener"><b>${n}</b><span>${s}</span>${icon('ext')}</a>`).join('')}</div></div>`;
    $$('.lex-ck input', el).forEach((i) => i.onchange = () => { const c = store.get('ex.ops.' + lv.today, {}) || {}; c[i.dataset.ck] = i.checked; store.set('ex.ops.' + lv.today, c);
      const n = $('#exCkN'); if (n) n.textContent = `${Object.values(c).filter(Boolean).length} of ${CHECK.length}`; });
  };

  // ============================================================================================= MFFU RULES
  const KN = { price: 'Eval price', activation_fee: 'Activation fee', renewal: 'Renewal', reset_fee: 'Reset fee', eval_expiry: 'Eval expiry', start_balance: 'Start balance', profit_target: 'Profit target',
    max_loss: 'Max loss', daily_loss_limit: 'Daily loss limit', consistency_eval: 'Consistency (best day)', consistency: 'Consistency (best day)', min_trading_days_eval: 'Minimum trading days',
    max_contracts: 'Max contracts', scaling_plan: 'Scaling plan', news_trading: 'News trading', trading_hours: 'Trading hours', overnight_weekend: 'Overnight / weekend', holidays_early_close: 'Holidays / early close',
    automation: 'Bots / automation', copy_trading: 'Copy trading', vps_ip: 'VPS / IP', hedging: 'Hedging', price_limit_rule: 'Price limits', prohibited: 'Prohibited', inactivity: 'Inactivity', inactivity_days: 'Inactivity',
    commission_rt: 'Commission (round trip)', accounts: 'Accounts', refund: 'Refund', buffer: 'Buffer', first_payout: 'First payout', payout_min: 'Payout minimum', payout_max: 'Payout maximum',
    payout_days_per_cycle: 'Days per payout cycle', split: 'Profit split', max_sim_payouts: 'Sim payouts before live', news: 'News', breach: 'Breach', payouts: 'Payouts', breach_cooldown_days: 'Cool-down after a breach', owner_present: 'Owner present' };
  const MONEYK = /price|fee|balance|target|amount|list|owner_paid|addon|buffer|payout|min$|max$|MNQ|NQ/;
  function fmtV(v, k = '') {
    if (v == null) return '<span class="mut">not published</span>';
    if (typeof v === 'number') return k === 'split' || (/consistency/.test(k) && v <= 1) ? pct(v * 100) : MONEYK.test(k) && !/days|cycle|sim_payouts|minis|micros/.test(k) ? usd(v, v % 1 ? 2 : 0) : String(v);
    if (typeof v === 'boolean') return v ? 'yes' : 'no';
    if (Array.isArray(v)) return v.map((x) => esc(typeof x === 'object' ? JSON.stringify(x) : x)).join(' · ');
    if (typeof v === 'object') return Object.entries(v).map(([a, b]) => `<span class="lex-sub"><i>${esc(a.replace(/_/g, ' '))}</i> ${Array.isArray(b) ? b.map(esc).join(', ') : typeof b === 'object' && b ? esc(JSON.stringify(b)) : fmtV(b, a)}</span>`).join('');
    return esc(v);
  }
  VIEWS.mffurules = (el) => {
    const m = X()?.mffu; if (!m) { el.innerHTML = head('System · prop firm', 'MFFU rules', '') + `<div class="card">${noData('The MFFU rulebook')}</div>`; return; }
    const stage = store.get('ex.mffu', 'eval'), S = m.stages.find((s) => s.stage === stage) || m.stages[0];
    const SK = { confirmed: 'good', conflict: 'warn', unconfirmed: 'bad' }, n = (st) => S.items.filter((i) => i.status === st).length;
    const fit = [['Max 40 micros', 'LIT caps at 40 micros (two_week max ~$990 at risk)', 'good'], ['Flat by 16:10 ET', 'LIT is flat at 15:55 ET, no new entry after 15:30', 'good'],
      ['$1,000 soft daily loss', 'two_week sizes a full stop inside it (2 ticks of slippage assumed)', 'good'], ['No consistency rule in the eval', 'one big LIT winner may pass it (“one winner passes”)', 'good'],
      ['1 trade a day', 'LIT takes at most 1 trade a day; MFFU has no trade-count rule', 'good'], ['7 quiet days', 'LIT trades ~3 a week; if 5 days pass with nothing, place 1 MNQ by hand', 'warn'],
      ['Commission $1.90 / micro', 'in every eval number on these pages', 'good'], ['Bots allowed', 'with your own settings; ask MFFU in writing about presence before live', 'warn']];
    el.innerHTML = head('System · prop firm · ' + esc(m.title || ''), 'MFFU rules', `Builder 50K, read ${esc(m.built || '')}. Each rule says how sure it is: confirmed on MFFU’s pages, conflict (MFFU pages disagree), or unconfirmed.`,
      segHTML('exMf', m.stages.map((s) => [s.stage, s.stage === 'sim_funded' ? 'Sim funded' : s.stage[0].toUpperCase() + s.stage.slice(1)]), stage)) +
      `<div class="card"><div class="card-h"><h3>How Zlarior fits the eval</h3></div><div class="lex-lights">${fit.map(([a, b, k]) => `<div class="li ${k}"><i></i><div><b>${a}</b><em>${b}</em></div></div>`).join('')}</div></div>
      <div class="card"><div class="card-h"><h3>${stage === 'sim_funded' ? 'Sim funded' : stage[0].toUpperCase() + stage.slice(1)}</h3><span class="meta">${tag(n('confirmed') + ' confirmed', 'good')} ${n('conflict') ? tag(n('conflict') + ' conflict', 'warn') : ''} ${n('unconfirmed') ? tag(n('unconfirmed') + ' unconfirmed', 'bad') : ''}</span></div>
        <div class="lex-rules">${S.items.map((i) => `<div class="ru"><div class="h"><b>${esc(KN[i.k] || i.k.replace(/_/g, ' '))}</b>${tag(esc(i.status || '?'), SK[i.status] || '')}</div><div class="v">${fmtV(i.value, i.k)}</div>${i.note ? `<p class="small mut">${esc(i.note)}</p>` : ''}</div>`).join('')}</div>
        <p class="note">${esc(m.method || '')}</p>${srcLine(esc(X()?.sources?.mffu || ''))}</div>`;
    onSeg('exMf', (v) => { store.set('ex.mffu', v); render(true); });
  };

  // ============================================================================================= TODAY CARD (hook in VIEWS.today)
  function todayCard() {
    try {
      if (!D || !D.live) return '';
      const E = evalNow(), tw = X()?.two_week?.eval?.H2, perSess = E.left ? E.toGo / E.left : null;
      return `<div class="card lex-tc"><div class="card-h"><h3>${icon('prop')} Eval HQ · 2-week pass path</h3><button class="chipbtn" type="button" data-go="evalhq"><span>Open</span>${icon('right')}</button></div>
        <div class="lex-tcg"><div><span>To pass</span><b>${usd(E.toGo)}</b></div><div><span>Sessions left</span><b>${E.left ?? '—'}<small class="mut"> / ${E.limit}</small></b></div>
          <div><span>Needed / session</span><b>${perSess != null ? usd(perSess) : '—'}</b></div><div><span>2-wk pass odds</span><b>${tw ? pct(tw.p10) : '—'}<small class="mut">${tw ? ' · ' + pct(tw.f10) + ' fail' : ''}</small></b></div></div>
        <div class="lex-links"><button class="chipbtn" type="button" data-go="edge">${icon('heat')}<span>Edge</span></button><button class="chipbtn" type="button" data-go="pnlcal">${icon('results')}<span>Calendar</span></button>
          <button class="chipbtn" type="button" data-go="ops">${icon('check')}<span>Ops check</span></button><button class="chipbtn" type="button" data-go="mffurules">${icon('rules')}<span>MFFU rules</span></button></div>
        <p class="small mut" style="margin:8px 0 0">Odds: backtest, two_week sizing, H2 2026 starts (the check half). Paper eval.</p></div>`;
    } catch (e) { console.warn('extras today card', e); return ''; }
  }

  const CSS = `
.lex-src{display:flex;gap:6px;align-items:flex-start;font-size:11.5px;color:var(--muted);margin:12px 0 0;line-height:1.45}.lex-src .ico{flex:none;width:14px;height:14px;margin-top:1px}
.lex-big{display:flex;flex-direction:column;gap:2px;margin:0 0 12px}.lex-big b{font-size:32px;font-weight:780;letter-spacing:-.02em}.lex-big span{font-size:13px}
.lex-dots{display:grid;grid-template-columns:repeat(10,1fr);gap:5px}.lex-dots i{font:600 11px var(--mono);font-style:normal;text-align:center;padding:7px 0;border-radius:9px;background:var(--surface-3);color:var(--muted);border:1px solid var(--line)}
.lex-dots i.done{background:color-mix(in srgb,var(--accent) 22%,transparent);color:var(--ink)}.lex-dots i.now{background:var(--accent);color:#fff;box-shadow:0 0 14px color-mix(in srgb,var(--accent) 60%,transparent)}
.lex-prog{margin:10px 0 0}.lex-prog .small{display:flex;justify-content:space-between;gap:8px;margin-top:6px;color:var(--ink-2)}
.lex-t td,.lex-t th{white-space:nowrap}.tw.fit .lex-t{min-width:0}.lex-t .dl{white-space:normal}.tw.fit .lex-t td:first-child{white-space:normal;min-width:84px}.tw.fit .lex-t th{white-space:normal}.lex-t tr.lex-on td{background:color-mix(in srgb,var(--accent) 12%,transparent)}.lex-t .dl{display:block;font-family:var(--sans);font-weight:500}
.lex-odds{display:flex;flex-direction:column;gap:14px}.lex-odds .h{display:flex;justify-content:space-between;gap:8px;font-size:12.5px;margin-bottom:6px}.lex-odds .h span{color:var(--ink-2)}
.lex-odds .bar{display:flex;height:10px;border-radius:99px;overflow:hidden;background:var(--surface-3)}.lex-odds .bar i{display:block;height:100%}.lex-odds .p{background:var(--good)}.lex-odds .f{background:var(--bad)}.lex-odds .u{background:rgba(154,163,181,.28)}
.lex-odds .s{margin-top:5px;line-height:1.45}
.lex-links{display:flex;flex-wrap:wrap;gap:8px}.lex-links .chipbtn,.chipbtn.lex-tx{width:auto;padding:0 12px}.lex-links .chipbtn span,.chipbtn.lex-tx span{display:inline}
.lex-t td{font-size:12.5px}.lex-t td,.lex-t th{padding:8px 6px}
.lex-hb{display:flex;flex-direction:column;gap:8px}.lex-hb .r{display:grid;grid-template-columns:78px 1fr auto;grid-template-rows:auto auto;column-gap:10px;align-items:center}
.lex-hb .l{font-size:12.5px;color:var(--ink-2);grid-row:1/3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.lex-hb .t{position:relative;height:9px;border-radius:99px;background:var(--surface-3);overflow:hidden}
.lex-hb .t i{position:absolute;top:0;bottom:0;border-radius:99px}.lex-hb.sg .t::after{content:"";position:absolute;left:50%;top:-2px;bottom:-2px;width:1px;background:rgba(238,241,248,.35)}
.lex-hb b{font:600 12.5px var(--mono);text-align:right;min-width:52px}.lex-hb em{grid-column:2/4;font-style:normal;font-size:11px;color:var(--muted)}
.lex-sc{min-height:240px}.lex-leg{display:flex;flex-wrap:wrap;gap:12px;font-size:11.5px;color:var(--ink-2);margin-top:8px}.lex-leg i{display:inline-block;width:9px;height:9px;border-radius:50%;margin-right:5px;vertical-align:-1px}
.lex-cal{display:grid;grid-template-columns:repeat(5,1fr);gap:5px}.lex-cal .h{font-size:10.5px;color:var(--muted);text-align:center;text-transform:uppercase;letter-spacing:.08em}
.lex-cal .d{all:unset;box-sizing:border-box;cursor:pointer;min-height:52px;border-radius:10px;padding:5px 6px;display:flex;flex-direction:column;justify-content:space-between;border:1px solid var(--line);background:var(--surface-2,rgba(255,255,255,.03))}
.lex-cal .d i{font:600 11px var(--mono);font-style:normal;color:var(--ink-2)}.lex-cal .d b{font:700 11.5px var(--mono);color:var(--ink);text-align:right}.lex-cal .d.z{opacity:.55}
.lex-cal .d.now{box-shadow:inset 0 0 0 2px var(--accent)}.lex-cal .d.on{box-shadow:inset 0 0 0 2px var(--ink)}.lex-calinfo{margin-top:10px;line-height:1.5;color:var(--ink-2)}
.lex-mnav{display:flex;gap:6px}
.lex-gauge{display:grid;grid-template-columns:1fr 1fr;gap:14px}.lex-gauge>div{display:flex;flex-direction:column;gap:5px;min-width:0}.lex-gauge span{font-size:11.5px;color:var(--muted);font-weight:550}.lex-gauge b{font-size:18px}
.lex-gauge .meter{margin:4px 0 2px}.lex-gauge .meter em{position:absolute;top:-2px;bottom:-2px;width:2px;background:rgba(238,241,248,.5)}
@media (max-width:420px){.lex-gauge{grid-template-columns:1fr}}
.lex-lights{display:flex;flex-direction:column;gap:10px}.lex-lights .li{display:flex;gap:12px;align-items:flex-start}.lex-lights .li>i{flex:none;width:11px;height:11px;border-radius:50%;margin-top:4px;background:var(--muted)}
.lex-lights .li.good>i{background:var(--good);box-shadow:0 0 10px var(--good)}.lex-lights .li.warn>i{background:var(--warn);box-shadow:0 0 10px var(--warn)}.lex-lights .li.bad>i{background:var(--bad);box-shadow:0 0 10px var(--bad)}
.lex-lights .li>div{display:flex;flex-direction:column;gap:1px;min-width:0}.lex-lights b{font-size:13.5px}.lex-lights span{font-size:12.5px;color:var(--ink)}.lex-lights em{font-style:normal;font-size:11.5px;color:var(--muted);line-height:1.4}
.lex-ck{display:flex;flex-direction:column;gap:2px}.lex-ck label{display:flex;gap:12px;align-items:flex-start;padding:9px 0;border-bottom:1px solid var(--line);cursor:pointer}.lex-ck label:last-child{border-bottom:0}
.lex-ck input{flex:none;width:20px;height:20px;margin:1px 0 0;accent-color:var(--accent)}.lex-ck span{display:flex;flex-direction:column;gap:2px}.lex-ck b{font-size:13.5px}.lex-ck em{font-style:normal;font-size:11.5px;color:var(--muted);line-height:1.4}
.lex-ck input:checked+span b{color:var(--good-ink);text-decoration:line-through;text-decoration-color:color-mix(in srgb,var(--good) 50%,transparent)}
.lex-kill ol{margin:0;padding-left:20px;display:flex;flex-direction:column;gap:8px;font-size:13px;line-height:1.5;color:var(--ink-2)}
.lex-log>div{display:flex;flex-direction:column;gap:3px;padding:9px 0;border-bottom:1px solid var(--line)}.lex-log>div:last-child{border-bottom:0}.lex-log b{font-size:13px;font-weight:600}.lex-log code{font:500 11px var(--mono);color:var(--ink-2);white-space:normal;word-break:break-word}
.lex-ql{display:flex;flex-direction:column}.lex-ql a{display:grid;grid-template-columns:1fr auto;grid-template-rows:auto auto;column-gap:10px;padding:10px 0;border-bottom:1px solid var(--line);color:var(--ink);text-decoration:none}
.lex-ql a:last-child{border-bottom:0}.lex-ql b{font-size:13.5px}.lex-ql span{grid-row:2;font-size:11.5px;color:var(--muted)}.lex-ql .ico{grid-row:1/3;grid-column:2;align-self:center;color:var(--muted)}
.lex-rules{display:flex;flex-direction:column}.lex-rules .ru{padding:11px 0;border-bottom:1px solid var(--line)}.lex-rules .ru:last-child{border-bottom:0}
.lex-rules .h{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:4px}.lex-rules .h b{font-size:13.5px}.lex-rules .v{font-size:13px;color:var(--ink);line-height:1.5;word-break:break-word}
.lex-rules p{margin:5px 0 0;line-height:1.45}.lex-sub{display:block}.lex-sub i{font-style:normal;color:var(--muted)}
.lex-tcg{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:12px}.lex-tcg>div{display:flex;flex-direction:column;gap:2px;min-width:0}.lex-tcg span{font-size:11px;color:var(--muted);font-weight:550}.lex-tcg b{font-size:16px;font-weight:700}
@media (max-width:520px){.lex-tcg{grid-template-columns:1fr 1fr}}
.lex-tc .card-h h3{display:flex;align-items:center;gap:8px}
`;

  window.LEX = { todayCard, twQty, version: 1 };
  install();
})();

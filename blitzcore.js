// BLITZ page renderer (2026-10-29, owner: "How's the scalp bot coming along? Make a separate tab at the bottom"; read-only).
// ONE renderer for both apps: tools/web_public/blitzcore.js = web_next/js/next/blitzcore.js (byte-identical, like
// missioncore.js). Classic script: window.BlitzUI. Phone: blitz.js (the BLITZ bottom tab, #/blitz/<part>); PC:
// js/next/blitz.js (sidebar BLITZ after ATLAS). Sections (BlitzUI.PARTS):
//   today    state (next check, today's noise band, the day filter verdict, signals), the open PAPER / REAL position with $ at
//            the stop, account C (its own 25K: off / Sim test / armed / paused)
//   brain    what BLITZ is thinking, the playbook rule now (B1-B8), structure note, its two paper ledgers (+ the Mind cards
//            the page passes in opts.mind)
//   trades   paper ledgers (25K eval, 50K next to LIT) + account C's real / Sim trades, Holodeck replay links, pictures
//   results  the research bands (BLITZ_STRATEGY.md), live vs the band, the kill-switch contract and how close it is
//   rules    BLITZ_STRATEGY.md in plain words
//   golive   the owner's 3 steps for next week + the preflight checks the data has
// Input (BlitzUI.model(src)): { now, where: 'phone'|'pc', lv: the Live View data (strategies.scalp = engine/liveview_api
// blitz_layer), card: engine/blitz.card (data.json "blitz" / GET /api/next/blitz), ac: account C's block (heartbeat /
// live.json "account_c", absent = off), board: the live board's "blitz" block, holo: Holodeck trades of BLITZ, preflight }.
// Every field is optional: the page shows what the data has and says what is missing. Nothing here talks to the bot.
(function () {
  'use strict';
  const V = 1;
  const PURPLE = '#b388ff';
  const PARTS = [['today', 'Today'], ['brain', 'Brain'], ['trades', 'Trades'], ['results', 'Results'], ['rules', 'Rules'], ['golive', 'Go live']];
  const CHECKS = [660, 690, 720, 750, 780, 810, 840, 870, 900, 930];          // 1m closes 11:00 ... 15:30 ET (minute of the day)
  const PV = 2;                                                               // MNQ: $2 a point a micro
  // BLITZ_STRATEGY.md "BLITZ as account C trades" ($150 a trade, costs in) + the 25K eval at account C's size
  const RESEARCH = [
    { k: 'H1', label: '2026 H1 (pick)', n: 217, tpw: 8.5, wk2: 89, win: 56.7, avg_r: 0.165, pf: 1.70, net: 5873, pm: 963, dd: -1152, p2: 36.1, f2: 37.8, p1m: 48.6, f1m: 49.5, slot: 270 },
    { k: 'H2', label: '2026 H2 (check)', n: 106, tpw: 6.8, wk2: 75, win: 56.6, avg_r: 0.200, pf: 1.62, net: 2478, pm: 667, dd: -815, p2: 36.2, f2: 34.8, p1m: 27.1, f1m: 72.9, slot: 37, main: true },
    { k: 'ref', label: '2021-25 (5m reference)', n: 1841, tpw: 8.6, wk2: 80, win: 50.1, avg_r: 0.013, pf: 1.05, net: 3765, pm: 73, dd: -5512, p2: 20.4, f2: 50.2, p1m: 25.3, f1m: 70.8, slot: -40 },
  ];
  // the kill switch (engine/account_c.score): after N finished trades, avg R or PF(R) under the 2026 bootstrap p5 -> PAUSED
  const KILL = [[20, -0.150, 0.62], [30, -0.095, 0.74], [40, -0.061, 0.83], [60, -0.021, 0.94], [100, 0.019, 1.06], [200, 0.061, 1.19]];
  const LOSE_DAYS_CAP = 6;
  const RULES = [
    ['B1', 'Only on lively days', 'Trade a day only if yesterday\'s 09:30-16:00 range was at least 0.8 x the average of the last 14 such ranges. Known before the open.'],
    ['B2', 'The noise band', 'For each minute: sigma = the average over the last 14 sessions of how far price was from the 09:30 open at that minute. Band = today\'s 09:30 open x (1 +/- sigma).'],
    ['B3', 'Checks on the half hour', 'Only at the 1-minute closes 11:00, 11:30 ... 15:30 (10 checks). A close above the band = BUY, below = SELL, at market at the next bar\'s open. A signal seen more than 50 s late is not chased.'],
    ['B4', 'Enough for today', 'One position at a time, at most 6 trades a day, no new trade after the day is down 3R, nothing without clean 1-minute bars.'],
    ['B5', 'Stop 1.5 ATR', 'The stop sits 1.5 x the 5-minute ATR (14 bars, about 60 points in 2026) from the signal close, at NinjaTrader from the entry on.'],
    ['B6', 'Trail after +1R', 'After +1R the stop trails 1.5R behind the best price (only ever tighter).'],
    ['B7', 'Time stop', 'Out at market after 30 one-minute bars, always flat by 15:55 (an early-close day: 5 minutes before the halt). No fixed target.'],
    ['B8', 'Zlarior first', 'Never against Zlarior or ATLAS: no entry while Zlarior holds, enters or has a setup armed the other way, or ATLAS holds the other side. If they enter the other way, BLITZ is closed first.'],
  ];
  const STAGE_RULE = { filtered: 'B1', waiting: 'B2', warming: 'B2', watching: 'B3', done: 'B4', closed: 'B4', stale: 'B4', trade: 'B6', off: 'B2', error: 'B4', paused: 'B4' };

  // ------------------------------------------------------------------ helpers
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ok = (v) => typeof v === 'number' && Number.isFinite(v);
  const num = (v) => (v == null || v === '' ? NaN : +v);
  const usd = (v, sign) => { const x = num(v); if (!Number.isFinite(x)) return '—'; const s = '$' + Math.abs(Math.round(x)).toLocaleString('en-US'); return sign ? (x > 0 ? '+' : x < 0 ? '−' : '') + s : (x < 0 ? '−' : '') + s; };
  const px = (v) => { const x = num(v); return Number.isFinite(x) ? x.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'; };
  const fr = (v, d = 2) => { const x = num(v); return Number.isFinite(x) ? (x > 0 ? '+' : '') + x.toFixed(d) + 'R' : '—'; };
  const pct = (v, d = 0) => { const x = num(v); return Number.isFinite(x) ? x.toFixed(d) + '%' : '—'; };
  const cls = (v) => (num(v) > 0 ? 'up' : num(v) < 0 ? 'dn' : '');
  const arr = (a) => (Array.isArray(a) ? a : []);
  const obj = (o) => (o && typeof o === 'object' && !Array.isArray(o) ? o : null);
  const FMT = {};
  const fmt = (o) => { const k = JSON.stringify(o); return FMT[k] || (FMT[k] = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour12: false, ...o })); };
  function etParts(t) {
    const p = {}; for (const x of fmt({ year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', weekday: 'short' }).formatToParts(new Date(t * 1000))) p[x.type] = x.value;
    const h = +p.hour % 24;
    return { date: `${p.year}-${p.month}-${p.day}`, mod: h * 60 + +p.minute, wd: p.weekday };
  }
  const hm = (t) => (ok(+t) ? fmt({ hour: '2-digit', minute: '2-digit' }).format(new Date(t * 1000)) : '—');
  const dayLbl = (t) => (ok(+t) ? fmt({ weekday: 'short', month: 'short', day: 'numeric' }).format(new Date(t * 1000)) : '');
  // unix time of ET wall time (date 'YYYY-MM-DD', minute of the day), DST-safe
  function etTime(date, mod) {
    let g = Date.parse(`${date}T00:00:00Z`) / 1000 + mod * 60 + 5 * 3600;
    for (let i = 0; i < 2; i++) { const q = etParts(g); const want = Date.parse(`${date}T00:00:00Z`) / 1000 + mod * 60, got = Date.parse(`${q.date}T00:00:00Z`) / 1000 + q.mod * 60; g += want - got; }
    return g;
  }
  const addDays = (date, n) => { const d = new Date(`${date}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
  const isWk = (date) => { const w = new Date(`${date}T12:00:00Z`).getUTCDay(); return w > 0 && w < 6; };
  function dur(s) {
    s = Math.max(0, Math.round(s));
    const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
    return d ? `${d}d ${h}h` : h ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m ${String(s % 60).padStart(2, '0')}s`;
  }
  const chip = (txt, lvl) => `<span class="bl-chip ${lvl || ''}">${esc(txt)}</span>`;
  const sideOf = (d) => (+d > 0 ? 'LONG' : +d < 0 ? 'SHORT' : '');
  const goA = (o, id, arg) => (o && typeof o.go === 'function' ? o.go(id, arg) : `data-go="${esc(id)}"${arg ? ` data-arg="${esc(arg)}"` : ''}`);

  // ------------------------------------------------------------------ the model: one normalized view of every source
  function model(src) {
    src = src || {};
    const now = ok(+src.now) ? +src.now : Date.now() / 1000;
    const lvd = obj(src.lv), scRaw = lvd && obj(lvd.strategies) ? obj(lvd.strategies.scalp) : null;
    const sc = scRaw && !scRaw.placeholder ? scRaw : null;
    const card = obj(src.card) && !src.card.error ? src.card : null;
    const ac = obj(src.ac) && (src.ac.account || src.ac.label || src.ac.eval) ? src.ac : null;
    const slot = obj(src.slot) && !src.slot.error ? src.slot : null;          // the Start page's BLITZ slot (PC: GET /api/next/blitz)
    const board = obj(src.board);
    const th = obj(sc && sc.thinking) || {};
    const st = (card && obj(card.state)) || {};
    const ast = (ac && obj(ac.state)) || {};
    const stage = th.stage || st.stage || (ac ? ast.stage : '') || (sc || card ? 'waiting' : 'off');
    const text = th.headline || st.text || (ac && ast.text) || (sc && sc.text) || '';
    // today's noise band: the card's checks, else the Live View rows [[t, up, lo]]
    let band = null;
    const cb = card && obj(card.band);
    if (cb && arr(cb.checks).length) band = { o0: num(cb.o0), date: cb.date, prng: num(cb.prng), day_ok: cb.day_ok, filter: cb.filter, range: num(cb.range), mean: num(cb.mean),
      rows: arr(cb.checks).filter((r) => r && r.up != null).map((r) => ({ t: +r.t, hm: r.hm || hm(+r.t), up: +r.up, lo: +r.lo })) };
    else if (sc && arr(sc.band).length) {
      const o0l = arr(sc.lines).find((l) => l && l.id === 'blz_o0');
      const filt = arr(sc.lines).some((l) => l && /day filter: no trades today/.test(String(l.label || '')));
      band = { o0: o0l ? num(o0l.price) : NaN, rows: arr(sc.band).filter((r) => Array.isArray(r) && r[1] != null).map((r) => ({ t: +r[0], hm: hm(+r[0]), up: +r[1], lo: +r[2] })),
        day_ok: filt ? false : stage === 'filtered' ? false : undefined, prng: NaN, range: NaN, mean: NaN };
    }
    if (band && cb && !ok(band.prng) && ok(num(cb.prng))) band.prng = num(cb.prng);
    if (band && stage === 'filtered') band.day_ok = false;
    // signals
    const sig = (card && arr(card.signals).length ? arr(card.signals).map((x) => ({ t: +x.t, ct: +x.close_t || +x.t + 60, side: sideOf(x.dir) || x.side, price: num(x.close), band: num(x.band), taken: !!x.taken, why: x.why || '' }))
      : arr(sc && sc.signals).filter((x) => x && x.ledger !== '50k').map((x) => ({ t: +x.t, ct: +x.close_t || +x.t + 60, side: String(x.side || sideOf(x.dir)).toUpperCase(), price: num(x.price), band: num(x.band), taken: !!x.taken, why: x.taken ? '' : (String(x.text || '').match(/not taken \(([^)]*)\)/) || [])[1] || '' })))
      .filter((x) => ok(x.t)).sort((a, b) => a.t - b.t);
    // open paper positions (the 25K eval, the 50K next to LIT), the account C position
    const lvPos = (p, tag) => (p && p.entry != null ? { tag, side: p.side ? String(p.side).toUpperCase() : sideOf(p.dir), dir: +p.dir || (String(p.side).toLowerCase() === 'short' || String(p.side).toLowerCase() === 'sell' ? -1 : 1), qty: num(p.qty), entry: num(p.entry), stop: num(p.stop), stop0: num(p.stop0), entry_t: +p.entry_t, out_t: +p.time_exit_t, best: num(p.best), unreal: num(p.unrealized_usd), stop_usd: num(p.stop_usd) } : null);
    const cardPos = (p, tag) => (p && p.entry != null && (p.exit_kind == null || p.exit_kind === 'OPEN') ? { tag, side: p.side || sideOf(p.dir), dir: +p.dir || 1, qty: num(p.qty), entry: num(p.entry), stop: num(p.stop_now != null ? p.stop_now : p.stop), stop0: num(p.stop), entry_t: +p.entry_t, out_t: +p.time_exit_t, best: num(p.best), unreal: NaN, stop_usd: NaN } : null);
    let pos25 = sc ? lvPos(sc.position && sc.position.ledger !== '50K + LIT' ? sc.position : null, '25K eval') : null;
    let pos50 = sc ? lvPos(sc.position50, '50K + LIT') : null;
    if (!pos25 && card) pos25 = cardPos(card.open, '25K eval');
    if (!pos50 && card && obj(card.funded50)) pos50 = cardPos(card.funded50.open, '50K + LIT');
    const price = num(lvd && lvd.price) || (lvd && arr(lvd.bars).length ? num(lvd.bars[lvd.bars.length - 1][4]) : NaN);
    for (const p of [pos25, pos50]) if (p) {
      if (!ok(p.stop_usd) && ok(p.stop) && ok(p.qty)) p.stop_usd = Math.round((p.stop - p.entry) * p.dir * PV * p.qty);
      if (!ok(p.unreal) && ok(price) && ok(p.qty)) p.unreal = Math.round((price - p.entry) * p.dir * PV * p.qty);
    }
    let posC = null;
    if (ac && obj(ac.open) && ac.open.entry != null) {
      const o = ac.open, d = +o.dir || (String(o.side).toUpperCase() === 'SHORT' ? -1 : 1);
      posC = { tag: 'account C', side: o.side || sideOf(d), dir: d, qty: num(o.qty), entry: num(o.entry), stop: num(o.stop), entry_t: +o.entry_t, out_t: +o.time_exit_t, real: true,
        stop_usd: ok(num(o.stop)) && ok(num(o.qty)) ? Math.round((num(o.stop) - num(o.entry)) * d * PV * num(o.qty)) : NaN,
        unreal: ok(price) && ok(num(o.qty)) ? Math.round((price - num(o.entry)) * d * PV * num(o.qty)) : NaN };
    }
    const ev = (card && obj(card.eval)) || (sc && obj(sc.eval)) || null;
    const money = (card && obj(card.money)) || (sc && obj(sc.money)) || null;
    const f50 = (card && obj(card.funded50)) || (sc && obj(sc.funded50)) || null;
    const today25 = arr(card && card.today).length ? arr(card.today) : arr(sc && sc.trades);
    const today50 = arr(f50 && f50.today);
    const hist25 = arr(card && card.trades), hist50 = arr(card && card.trades50);
    const rule = obj(sc && sc.rule) || (() => { const id = STAGE_RULE[stage] || 'B2', r = RULES.find((x) => x[0] === id); return { id, title: r[1], text: r[2], derived: true }; })();
    const t = Math.max(+(lvd && lvd.t) || 0, +(card && card.t) || 0, +(ac && ac.t) || 0) || null;
    return { v: V, now, where: src.where || 'phone', sc, card, ac, slot, board, lv: lvd, stage, text, band, signals: sig, pos25, pos50, posC, price, ev, money, f50,
      today25, today50, hist25, hist50, holo: arr(src.holo), rule, structure: (sc && sc.structure_note) || (th && th.structure) || null, thinking: th,
      evals: arr(card && card.evals), preflight: arr(src.preflight).length ? arr(src.preflight) : arr(ac && ac.preflight).length ? arr(ac.preflight) : arr(card && card.preflight),
      t, source: src.where === 'pc' ? 'PC bot' : card && card.source ? (card.source === 'PC' ? 'PC heartbeat' : card.source === 'cloud' ? 'cloud monitor' : card.source) : sc ? 'PC (Live View)' : null,
      research: card && obj(card.research) };
  }

  function sinceT(M) {
    const f = M.card && M.card.first_run;
    if (f == null || f === '') return NaN;
    if (ok(+f) && +f > 1e9) return +f;
    const t = Date.parse(String(f).length <= 10 ? `${f}T12:00:00Z` : String(f)) / 1000;
    return ok(t) ? t : NaN;
  }
  // "How's BLITZ coming along?" in one sentence: its trades so far against the 2026 H2 research line
  function report(M) {
    const sc = M.ac && obj(M.ac.scorecard) && num(M.ac.scorecard.n) > 0 ? M.ac.scorecard : null, m = M.money || {};
    const n = sc ? num(sc.n) : num(m.n), t0 = sinceT(M), H2 = RESEARCH[1];
    const since = ok(t0) ? fmt({ month: 'short', day: 'numeric' }).format(new Date(t0 * 1000)) : '';
    const where = sc ? 'on account C' : 'on paper';
    if (!ok(n) || n <= 0) return { lvl: '', text: `No finished BLITZ trade yet${since ? ` (${where} since ${since})` : ''}: it trades on about 43% of days, 7-9 trades a week.` };
    const win = sc ? num(sc.win_pct) : num(m.wins) / n * 100, avg = sc ? num(sc.avg_r) : num(m.avg_r), usd150 = sc ? num(sc.usd) : num(m.usd150);
    const head = `${n} trade${n === 1 ? '' : 's'} ${where}${since ? ` since ${since}` : ''}${ok(num(m.days)) && !sc ? ` on ${m.days} day${m.days === 1 ? '' : 's'}` : ''}: ${ok(win) ? win.toFixed(0) + '% won, ' : ''}${ok(avg) ? fr(avg) + ' a trade' : ''}${ok(usd150) ? `, ${usd(usd150, true)}${sc ? '' : ' at $150 a trade'}` : ''}.`;
    if (n < 20) return { lvl: '', text: `${head} Too early to judge: the research line needs about 20 trades (${Math.max(1, Math.ceil((20 - n) / 7.5))} more week${Math.ceil((20 - n) / 7.5) > 1 ? 's' : ''}).` };
    const fl = killAt(n), good = ok(avg) && avg >= H2.avg_r * 0.5, bad = fl && ok(avg) && avg < fl.avg_r_p5;
    return { lvl: bad ? 'bad' : good ? 'good' : 'warn', text: `${head} ${bad ? 'Below the kill-switch floor: account C would pause.' : good ? `In line with the 2026 H2 research (${fr(H2.avg_r)} a trade).` : `Under the 2026 H2 research (${fr(H2.avg_r)}) but above the floor.`}` };
  }

  // account C: off / Sim test / armed / paused / funded
  function acctC(M) {
    const a = M.ac, sl = M.slot;
    if (!a && sl && sl.on) return { mode: 'set', label: sl.sim ? 'SET · SIM TEST' : sl.armed ? 'SET · ARMED' : 'SET · NOT ARMED', lvl: 'warn',
      line: `${sl.say || 'Account C is set'}${sl.problem ? ' · ' + sl.problem : ''}. The bot picks it up at its next poll once it runs (Start trading).` };
    if (!a) return { mode: 'off', label: 'OFF · paper shadow', lvl: '', line: 'Account C (BLITZ\'s own 25K) is off: BLITZ runs two PAPER ledgers on the PC and nothing is routed.' };
    const name = a.account ? ` on ${a.account}` : '';
    if (a.paused) return { mode: 'paused', label: 'PAUSED', lvl: 'bad', line: `Paused by the performance contract${a.paused.why ? ': ' + a.paused.why : ''}. Resume is your decision.` };
    if (a.enabled === false && a.disabled) return { mode: 'off', label: 'SET · NOT RUNNING', lvl: 'warn', line: `Account C is set${name} but not running: ${a.disabled}` };
    if (a.stage === 'funded') return { mode: 'funded', label: `FUNDED${a.kind === 'LIVE' ? ' · REAL' : ''}`, lvl: 'good', line: `Funded${name}: 10% of the room, at most $150 a trade, no new trade after +$400 on the day.` };
    if (a.kind === 'SIM') return { mode: 'sim', label: 'SIM TEST', lvl: 'warn', line: `Sim test${name}: BLITZ trades a NinjaTrader Sim account, no real money.` };
    if (a.kind === 'LIVE') return a.armed ? { mode: 'armed', label: 'ARMED · REAL', lvl: 'live', line: `Armed${name}: BLITZ trades its real MFFU 25K eval.` }
      : { mode: 'set', label: 'SET · NOT ARMED', lvl: 'warn', line: `Set${name}, not armed: no real orders until you arm it on the Start page.` };
    return { mode: 'paper', label: 'PAPER ADAPTER', lvl: '', line: `Account C runs on the paper adapter${name}: nothing reaches NinjaTrader.` };
  }

  // the next check (11:00 ... 15:30 ET on a weekday)
  function nextCheck(now) {
    const p = etParts(now);
    let date = p.date;
    for (let i = 0; i < 8; i++) {
      if (isWk(date)) { const m = CHECKS.find((c) => etTime(date, c) > now + (i ? -1e9 : 0)); if (m != null) return { t: etTime(date, m), date, mod: m, today: i === 0 }; }
      date = addDays(date, 1);
    }
    return null;
  }
  const modHM = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

  function status(M) {
    const c = acctC(M);
    const stg = M.stage;
    const lvl = stg === 'trade' ? 'good' : stg === 'error' || stg === 'stale' ? 'bad' : stg === 'filtered' || stg === 'done' ? 'warn' : '';
    const word = { trade: 'IN A PAPER TRADE', watching: 'WATCHING THE BAND', waiting: 'WAITING', warming: 'WARMING UP', filtered: 'SKIPPING TODAY', done: 'DONE TODAY', closed: 'NO MORE CHECKS', stale: 'NO 1M BARS', error: 'ERROR', off: 'NOT RUNNING YET', paused: 'PAUSED' }[stg] || String(stg || '').toUpperCase();
    return { stage: stg, word, lvl, acct: c };
  }

  // ------------------------------------------------------------------ pieces
  function bandSvg(M) {
    const B = M.band; if (!B || !B.rows.length) return '';
    const rows = B.rows, W = 340, H = 120, L = 6, R = 6, T = 10, Bt = 18;
    const vals = rows.flatMap((r) => [r.up, r.lo]).concat(ok(B.o0) ? [B.o0] : []).concat(ok(M.price) ? [M.price] : []).concat(M.signals.map((s) => s.price).filter(ok));
    let lo = Math.min(...vals), hi = Math.max(...vals); const pad = (hi - lo) * 0.08 || 5; lo -= pad; hi += pad;
    const t0 = rows[0].t, t1 = rows[rows.length - 1].t || t0 + 1;
    const X = (t) => L + (W - L - R) * (rows.length > 1 ? (t - t0) / (t1 - t0) : 0.5), Y = (v) => T + (H - T - Bt) * (1 - (v - lo) / (hi - lo));
    const up = rows.map((r, i) => `${i ? 'L' : 'M'}${X(r.t).toFixed(1)},${Y(r.up).toFixed(1)}`).join(''), dn = rows.map((r, i) => `${i ? 'L' : 'M'}${X(r.t).toFixed(1)},${Y(r.lo).toFixed(1)}`).join('');
    const area = up + rows.slice().reverse().map((r) => `L${X(r.t).toFixed(1)},${Y(r.lo).toFixed(1)}`).join('') + 'Z';
    const nowX = M.now >= t0 && M.now <= t1 + 1800 ? Math.min(W - R, X(Math.min(M.now, t1))) : null;
    const dots = M.signals.filter((s) => s.t >= t0 - 60 && s.t <= t1 + 60 && ok(s.price)).map((s) => `<circle cx="${X(s.t).toFixed(1)}" cy="${Y(s.price).toFixed(1)}" r="4.5" class="${s.taken ? 'tk' : 'sk'} ${s.side === 'LONG' ? 'l' : 's'}"><title>${esc(hm(s.ct))} ${esc(s.side)} signal ${s.taken ? 'taken' : 'not taken'}</title></circle>`).join('');
    const ticks = rows.map((r, i) => (i % 2 === 0 || rows.length < 6 || i === rows.length - 1 ? `<text x="${X(r.t).toFixed(1)}" y="${H - 4}" text-anchor="${i === 0 ? 'start' : i === rows.length - 1 ? 'end' : 'middle'}">${esc(r.hm)}</text>` : '')).join('');
    return `<svg class="bl-band" viewBox="0 0 ${W} ${H}" role="img" aria-label="Today's noise band at each check">
      <defs><linearGradient id="blG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${PURPLE}" stop-opacity=".30"/><stop offset="1" stop-color="${PURPLE}" stop-opacity=".06"/></linearGradient></defs>
      <path d="${area}" fill="url(#blG)"/><path d="${up}" class="u"/><path d="${dn}" class="d"/>
      ${ok(B.o0) ? `<line x1="${L}" x2="${W - R}" y1="${Y(B.o0).toFixed(1)}" y2="${Y(B.o0).toFixed(1)}" class="o"/>` : ''}
      ${nowX != null ? `<line x1="${nowX.toFixed(1)}" x2="${nowX.toFixed(1)}" y1="${T - 4}" y2="${H - Bt + 2}" class="n"/>` : ''}
      ${ok(M.price) && nowX != null ? `<circle cx="${nowX.toFixed(1)}" cy="${Y(M.price).toFixed(1)}" r="3.5" class="p"/>` : ''}
      ${dots}${ticks}</svg>`;
  }
  function filterLine(M) {
    const B = M.band;
    if (!B || B.day_ok == null) {
      if (M.stage === 'filtered') return { ok: false, text: M.text || 'Skipped today: yesterday was a quiet day (range under 0.8 x its 14-day mean).' };
      return { ok: null, text: 'Day filter: known at the 09:30 open (yesterday\'s range vs its 14-day mean, needs 0.8 x).' };
    }
    const rr = ok(B.range) && ok(B.mean) ? `${Math.round(B.range)} pts vs mean ${Math.round(B.mean)} pts` : '';
    const ratio = ok(B.prng) ? `${B.prng.toFixed(2)} x` : '';
    if (B.day_ok === false) return { ok: false, text: `Skipped: yesterday's range ${rr ? rr + ' = ' : ''}${ratio || 'under 0.8 x'} its 14-day mean (needs ≥ 0.8 x). No BLITZ trades today.` };
    return { ok: true, text: `Trading today: yesterday's range ${rr ? rr + ' = ' : ''}${ratio ? ratio + ' ' : ''}its 14-day mean (≥ 0.8 x).` };
  }
  function posCard(p, M) {
    const real = !!p.real, tag = real ? (M.ac && M.ac.kind === 'LIVE' ? 'REAL' : M.ac && M.ac.kind === 'SIM' ? 'SIM' : 'PAPER') : 'PAPER';
    const also = !real && p.tag === '25K eval' && M.pos50 && M.pos50.entry_t === p.entry_t && ok(M.pos50.qty) ? `<span>+ ${M.pos50.qty} MNQ on the 50K + LIT</span>` : '';
    const trail = ok(p.stop0) && ok(p.stop) && p.stop !== p.stop0 ? 'trailing 1.5R behind the best price' : ok(p.stop0) && ok(p.entry) ? `trail starts at +1R (${px(p.entry + p.dir * Math.abs(p.entry - p.stop0))})` : 'trail 1.5R after +1R';
    return `<div class="bl-pos ${p.dir > 0 ? 'lg' : 'sh'}"><div class="bl-pos-h"><b>${esc(tag)} ${esc(p.side)}</b><span>${esc(p.tag)}</span>${ok(p.qty) ? `<span>${p.qty} MNQ</span>` : '<span>no size</span>'}${also}</div>
      <div class="bl-kv"><div><span>Entry</span><b>${px(p.entry)}</b><em>${esc(hm(p.entry_t))} ET</em></div>
        <div><span>Stop</span><b>${px(p.stop)}</b><em class="${cls(p.stop_usd)}">${ok(p.stop_usd) ? usd(p.stop_usd, true) + ' at the stop' : ''}</em></div>
        <div><span>Target</span><b>none</b><em>${esc(trail)}</em></div>
        <div><span>Now</span><b class="${cls(p.unreal)}">${ok(p.unreal) ? usd(p.unreal, true) : '—'}</b><em>out by ${esc(hm(p.out_t))} ET</em></div></div></div>`;
  }
  function evalTiles(e, label) {
    if (!e || (!ok(num(e.balance)) && !e.status)) return '';
    const tgt = ok(num(e.target)) && ok(num(e.start_balance)) ? num(e.target) - num(e.start_balance) : 1500;
    const prog = ok(num(e.profit)) ? Math.max(0, Math.min(1, num(e.profit) / tgt)) : 0;
    return `<div class="bl-eval"><div class="bl-eval-h"><span>${esc(label)}</span>${e.status ? chip(e.status, /pass/.test(e.status) ? 'good' : /fail|stuck|lost/.test(e.status) ? 'bad' : '') : ''}</div>
      <div class="bl-tiles"><div><span>Balance</span><b>${usd(e.balance)}</b></div><div><span>To target</span><b>${usd(e.to_target)}</b></div>
        <div><span>Room</span><b>${usd(e.room)}</b></div><div><span>Session</span><b>${ok(num(e.session)) ? e.session : '—'}</b></div></div>
      <div class="bl-bar"><i style="width:${(prog * 100).toFixed(1)}%"></i></div></div>`;
  }
  function scoreRow(s) {
    if (!s || !ok(num(s.n))) return '';
    return `<div class="bl-tiles sm"><div><span>Trades</span><b>${s.n}</b></div><div><span>Win</span><b>${pct(s.win_pct)}</b></div><div><span>Avg R</span><b class="${cls(s.avg_r)}">${fr(s.avg_r, 3)}</b></div>
      <div><span>PF (R)</span><b>${ok(num(s.pf_r)) ? num(s.pf_r).toFixed(2) : '—'}</b></div><div><span>$</span><b class="${cls(s.usd)}">${usd(s.usd, true)}</b></div><div><span>Losing days</span><b>${ok(num(s.lose_days)) ? s.lose_days + ' / ' + LOSE_DAYS_CAP : '—'}</b></div></div>`;
  }

  // ------------------------------------------------------------------ sections
  function hero(M, o) {
    const S = status(M), c = S.acct, nc = nextCheck(M.now);
    return `<section class="bl-hero" aria-label="BLITZ status"><div class="bl-orb" aria-hidden="true"><i></i></div>
      <div class="bl-hero-h"><div><div class="bl-eye">Bot 3 · the scalper · 25K</div><h2>BLITZ</h2></div><div class="bl-chips">${chip(S.word, S.lvl)}${chip(c.label, c.lvl)}</div></div>
      <p class="bl-think">${esc(M.text || 'BLITZ has not reported yet: it runs after each Zlarior poll while the PC bot runs (paper).')}</p>
      ${(() => { const r = report(M); return `<p class="bl-report ${r.lvl}"><b>How it is going:</b> ${esc(r.text)}</p>`; })()}
      ${M.ac && c.mode !== 'off' && M.ac.state && M.ac.state.text && M.ac.state.text !== M.text ? `<p class="bl-line bl-acline"><b>Account C${M.ac.account ? ' · ' + esc(M.ac.account) : ''}:</b> ${esc(M.ac.state.text)}</p>` : ''}
      <div class="bl-hero-r">${nc ? `<div><span>Next check</span><b>${nc.today ? '' : esc(dayLbl(nc.t)) + ' '}${esc(modHM(nc.mod))} ET</b><em data-bl-cd="${Math.round(nc.t)}">in ${esc(dur(nc.t - M.now))}</em></div>` : ''}
        <div><span>Paper 25K</span><b>${M.ev && ok(num(M.ev.balance)) ? usd(M.ev.balance) : '—'}</b><em>${M.ev && ok(num(M.ev.to_target)) ? usd(M.ev.to_target) + ' to pass' : 'not started'}</em></div>
        <div><span>Paper trades</span><b>${M.money && ok(num(M.money.n)) ? M.money.n : 0}</b><em>${M.money && ok(num(M.money.usd)) ? usd(M.money.usd, true) + ' on the eval' : 'since the first run'}</em></div></div>
      ${M.t ? `<p class="bl-src">${esc(M.source || 'data')} · ${esc(dur(M.now - M.t))} ago${M.now - M.t > 20 * 60 ? ' · <b class="dn">the PC has not sent for a while</b>' : ''}</p>` : '<p class="bl-src">No BLITZ data yet (the PC bot sends it while it runs).</p>'}</section>`;
  }
  function today(M, o) {
    const f = filterLine(M), B = M.band, nc = nextCheck(M.now), c = acctC(M);
    const nxt = B && B.rows.length ? (B.rows.find((r) => r.t > M.now) || null) : null;
    const sigs = M.signals.slice(-8).reverse();
    const pos = [M.posC, M.pos25, M.pos50 && (!M.pos25 || M.pos50.entry_t !== M.pos25.entry_t) ? M.pos50 : null].filter(Boolean);
    const a = M.ac, e = a && obj(a.eval);
    return `${hero(M, o)}
      <section class="bl-card"><div class="bl-h"><h3>Today's noise band</h3>${chip(f.ok === true ? 'TRADING TODAY' : f.ok === false ? 'SKIPPED TODAY' : 'FILTER AT 09:30', f.ok === true ? 'good' : f.ok === false ? 'warn' : '')}</div>
        <p class="bl-line ${f.ok === false ? 'wn' : ''}">${esc(f.text)}</p>
        ${B && B.rows.length ? `${bandSvg(M)}<div class="bl-tiles sm"><div><span>09:30 open</span><b>${px(B.o0)}</b></div>
          <div><span>${nxt ? esc(nxt.hm) + ' close above' : 'Upper band'}</span><b class="up">${px(nxt ? nxt.up : B.rows[B.rows.length - 1].up)}</b><em>= PAPER LONG</em></div>
          <div><span>${nxt ? esc(nxt.hm) + ' close below' : 'Lower band'}</span><b class="dn">${px(nxt ? nxt.lo : B.rows[B.rows.length - 1].lo)}</b><em>= PAPER SHORT</em></div>
          <div><span>Price</span><b>${px(M.price)}</b></div></div>`
          : `<p class="bl-mut">The band is drawn from the 09:30 open; it shows here once the PC sends today's BLITZ data.</p>`}
        <p class="bl-mut">Checks at the 1-minute closes 11:00, 11:30 … 15:30 ET${nc ? ` · next ${nc.today ? '' : esc(dayLbl(nc.t)) + ' '}${esc(modHM(nc.mod))} ET (<span data-bl-cd="${Math.round(nc.t)}">${esc(dur(nc.t - M.now))}</span>)` : ''}.</p></section>
      <section class="bl-card"><div class="bl-h"><h3>Signals today</h3><span class="bl-meta">${sigs.length} seen</span></div>
        ${sigs.length ? `<ul class="bl-list">${sigs.map((s) => `<li><i class="bl-dot ${s.taken ? 'good' : ''}"></i><b>${esc(hm(s.ct))} ${esc(s.side)}</b><span>close ${px(s.price)}${ok(s.band) ? ' beyond ' + px(s.band) : ''}</span><em>${s.taken ? 'taken' : 'not taken' + (s.why ? ': ' + esc(s.why) : '')}</em></li>`).join('')}</ul>`
          : '<p class="bl-mut">No signal yet today. A 1-minute close outside the band at a check is a signal.</p>'}</section>
      <section class="bl-card"><div class="bl-h"><h3>Open position</h3>${pos.length ? chip(pos.length + ' open', 'good') : chip('FLAT', '')}</div>
        ${pos.length ? pos.map((p) => posCard(p, M)).join('') : '<p class="bl-mut">Flat. BLITZ holds one position at a time, at most 30 minutes, always flat by 15:55.</p>'}</section>
      <section class="bl-card bl-acc ${c.mode}"><div class="bl-h"><h3>Account C · BLITZ's own 25K</h3>${chip(c.label, c.lvl)}</div>
        <p class="bl-line">${esc(c.line)}</p>
        ${e ? evalTiles(e, (a.plan_label || 'MFFU Builder 25K') + (a.account ? ' · ' + a.account : '')) : ''}
        ${a ? `<div class="bl-tiles sm"><div><span>Today</span><b class="${cls(a.day_pnl)}">${usd(a.day_pnl, true)}</b></div><div><span>Entries</span><b>${ok(num(a.entries_today)) ? a.entries_today + ' / 6' : '—'}</b></div>
          <div><span>Kind</span><b>${esc(a.real || a.kind || '—')}</b></div><div><span>Armed</span><b>${a.armed ? 'yes' : 'no'}</b></div></div>${a.locked ? `<p class="bl-line wn">Locked today: ${esc(a.locked)}</p>` : ''}${scoreRow(a.scorecard)}`
          : `<p class="bl-mut">Turning it on is the Go live section (next week). Until then the paper ledgers below are the comparison.</p>`}
        ${evalTiles(M.ev, 'Paper 25K eval (simulated)')}</section>`;
  }
  function brain(M, o) {
    const r = M.rule || {}, th = M.thinking || {};
    const cur = String(r.id || '');
    const mems = arr(M.sc && M.sc.members);
    return `<section class="bl-card bl-mind"><div class="bl-h"><h3>What BLITZ is thinking</h3>${chip(status(M).word, status(M).lvl)}</div>
        <p class="bl-think">${esc(M.text || 'Nothing yet: BLITZ thinks once the PC sends its first 1-minute bars.')}</p>
        ${th.eval ? `<p class="bl-line">${esc(th.eval)}</p>` : ''}${th.funded50 ? `<p class="bl-line">${esc(th.funded50)}</p>` : ''}
        ${M.structure ? `<p class="bl-line"><b>Structure:</b> ${esc(M.structure)}</p>` : ''}</section>
      <section class="bl-card"><div class="bl-h"><h3>The playbook rule now</h3>${cur ? chip(cur, 'live') : ''}</div>
        <p class="bl-rule"><b>${esc(cur)} ${esc(r.title || '')}</b><span>${esc(r.text || '')}</span>${r.why ? `<em>${esc(r.why)}</em>` : ''}</p>
        <ol class="bl-ladder">${RULES.map(([id, t]) => `<li class="${id === cur ? 'on' : ''}"><b>${id}</b><span>${esc(t)}</span></li>`).join('')}</ol></section>
      ${mems.length ? `<section class="bl-card"><div class="bl-h"><h3>The two paper ledgers</h3><span class="bl-meta">never routed</span></div><ul class="bl-list">${mems.map((m) => `<li><i class="bl-dot ${m.stage === 'trade' ? 'good' : ''}"></i><b>${esc(m.short || m.key)}</b><span>${esc(m.text || '')}</span></li>`).join('')}</ul></section>` : ''}
      ${o && o.mind ? o.mind : ''}`;
  }
  function rowsOf(M) {
    const out = [];
    const push = (r, ledger, tag) => {
      if (!r || r.exit_kind === 'SKIP') return;
      const open = r.exit_kind == null || r.exit_kind === 'OPEN';
      out.push({ ledger, tag, day: r.day || (r.entry_t ? etParts(+r.entry_t).date : ''), entry_t: +r.entry_t || 0, side: r.side ? String(r.side).toUpperCase() : sideOf(r.dir), qty: num(r.qty), entry: num(r.entry),
        exit: num(r.exit != null ? r.exit : r.exit_px), kind: open ? 'OPEN' : (r.exit_kind || r.exit || ''), usd: num(r.usd != null ? r.usd : r.pnl), r: num(r.r), open, skip: r.skip || '' });
    };
    if (M.ac) { const seen = new Set(); arr(M.ac.closed).concat(arr(M.ac.trades_today)).forEach((r) => { const k = r.entry_t; if (seen.has(k)) return; seen.add(k); if (r.routed === false) return; push(r, 'Account C', M.ac.kind === 'LIVE' ? 'REAL' : M.ac.kind === 'SIM' ? 'SIM' : 'PAPER'); }); }
    const k25 = new Set(), k50 = new Set();
    M.hist25.concat(M.today25).forEach((r) => { if (r && !k25.has(r.entry_t)) { k25.add(r.entry_t); push(r, 'Paper 25K eval', 'PAPER'); } });
    M.hist50.concat(M.today50).forEach((r) => { if (r && !k50.has(r.entry_t)) { k50.add(r.entry_t); push(r, 'Paper 50K + LIT', 'PAPER'); } });
    if (!out.some((x) => x.ledger !== 'Account C')) M.holo.forEach((t) => push({ day: t.day, entry_t: t.entry_t || t.t0 || (t.entry && t.entry.t), side: t.side, qty: t.qty, entry: t.entry && t.entry.px != null ? t.entry.px : t.entry_px, exit_px: t.exit && t.exit.px, exit_kind: (t.exit && t.exit.reason) || 'OPEN', usd: t.usd, r: t.r }, 'Holodeck', t.real ? 'REAL' : 'PAPER'));
    return out.sort((a, b) => b.entry_t - a.entry_t);
  }
  function trades(M, o) {
    const R = rowsOf(M), groups = {};
    R.forEach((r) => { (groups[r.ledger] = groups[r.ledger] || []).push(r); });
    const order = ['Account C', 'Paper 25K eval', 'Paper 50K + LIT', 'Holodeck'];
    const sum = (L) => L.filter((x) => !x.open && ok(x.usd)).reduce((s, x) => s + x.usd, 0);
    const list = (L) => `<ul class="bl-trades">${L.slice(0, 40).map((r) => `<li class="${r.open ? 'open' : ''}"><span class="bl-tg ${r.tag.toLowerCase()}">${esc(r.tag)}</span>
        <b>${esc(r.day ? r.day.slice(5) : '')} ${esc(hm(r.entry_t))} ${esc(r.side)}${ok(r.qty) && r.qty ? ' ' + r.qty : ''}</b>
        <span class="bl-tp">${px(r.entry)} → ${r.open ? 'open' : px(r.exit)} · ${esc(r.kind)}${!ok(r.qty) || r.qty ? '' : ' · no size' + (r.skip ? ' (' + esc(r.skip) + ')' : '')}</span>
        <span class="bl-tv ${cls(r.usd)}">${r.open ? '' : usd(r.usd, true)}<em>${ok(r.r) ? fr(r.r) : ''}</em></span>
        ${r.day ? `<a class="bl-holo" ${goA(o, 'holo', r.day)} title="Replay ${esc(r.day)} in the Holodeck">3D</a>` : ''}</li>`).join('')}</ul>`;
    const blocks = order.filter((k) => groups[k]).map((k) => `<section class="bl-card"><div class="bl-h"><h3>${esc(k)}</h3><span class="bl-meta">${groups[k].length} trade${groups[k].length === 1 ? '' : 's'} · <b class="${cls(sum(groups[k]))}">${usd(sum(groups[k]), true)}</b></span></div>
      ${k === 'Paper 50K + LIT' ? '<p class="bl-mut">BLITZ on a funded 50K next to Zlarior, only while Zlarior is flat. Paper.</p>' : k === 'Account C' ? '<p class="bl-mut">Real NinjaTrader fills on BLITZ\'s own 25K (Sim while it is a Sim test).</p>' : ''}${list(groups[k])}</section>`).join('');
    return `${o && o.pics ? o.pics : ''}${blocks || `<section class="bl-card"><div class="bl-h"><h3>Trades</h3></div><p class="bl-mut">No BLITZ trade yet. The paper ledgers fill in from the first check after the PC bot starts; account C's real trades show here once it is on.</p></section>`}
      <p class="bl-foot">PAPER = simulated, never routed · SIM = NinjaTrader Sim · REAL = the real 25K · 3D = replay that day in the Holodeck</p>`;
  }
  // a metric against the research band (weak year .. H1 / H2), with the live marker
  function bandBar(label, live, weak, h2, h1, f) {
    const lo = Math.min(weak, h2, h1, ok(live) ? live : weak), hi = Math.max(weak, h2, h1, ok(live) ? live : h1);
    const span = hi - lo || 1, P = (v) => ((v - lo) / span * 100).toFixed(1);
    const v = !ok(live) ? 'no live number yet' : live >= Math.min(h1, h2) ? 'inside the 2026 band' : live >= weak ? 'between the weak year and 2026' : 'below the weak year';
    const lvl = !ok(live) ? '' : live >= Math.min(h1, h2) ? 'good' : live >= weak ? 'warn' : 'bad';
    return `<div class="bl-bb"><div class="bl-bb-h"><span>${esc(label)}</span><b class="${lvl}">${ok(live) ? esc(f(live)) : '—'}</b><em>${esc(v)}</em></div>
      <div class="bl-bb-t"><i class="wk" style="left:${P(weak)}%"></i><i class="band" style="left:${P(Math.min(h1, h2))}%;width:${(Math.abs(h1 - h2) / span * 100).toFixed(1)}%"></i>${ok(live) ? `<i class="lv" style="left:${P(live)}%"></i>` : ''}</div>
      <div class="bl-bb-l"><span>weak ${esc(f(weak))}</span><span>2026 ${esc(f(Math.min(h1, h2)))}–${esc(f(Math.max(h1, h2)))}</span></div></div>`;
  }
  function killAt(n) {
    if (!ok(n) || n < KILL[0][0]) return null;
    for (let i = KILL.length - 1; i >= 0; i--) if (n >= KILL[i][0]) {
      const a = KILL[i], b = KILL[i + 1]; if (!b) return { avg_r_p5: a[1], pf_p5: a[2] };
      const w = (n - a[0]) / (b[0] - a[0]); return { avg_r_p5: a[1] + (b[1] - a[1]) * w, pf_p5: a[2] + (b[2] - a[2]) * w, approx: true };
    }
    return null;
  }
  function results(M, o) {
    const H2 = RESEARCH[1], H1 = RESEARCH[0], RF = RESEARCH[2];
    const sc = M.ac && obj(M.ac.scorecard);
    const m = M.money || {};
    const liveSrc = sc && ok(num(sc.n)) && sc.n > 0 ? 'account C (its own fills)' : 'the paper 25K ledger ($150 a trade view)';
    const n = sc && sc.n ? +sc.n : num(m.n);
    const MIN_N = 5;                    // under 5 finished trades a live number says nothing: no marker on the bands
    const enough = ok(n) && n >= MIN_N;
    const win = !enough ? NaN : sc && sc.n ? num(sc.win_pct) : num(m.wins) / num(m.n) * 100;
    const avgR = !enough ? NaN : sc && sc.n ? num(sc.avg_r) : num(m.avg_r);
    const pf = !enough ? NaN : sc && sc.n ? num(sc.pf_r) : num(m.pf150);
    const t0 = sinceT(M), months = ok(t0) ? Math.max(1 / 21, (M.now - t0) / (30.4 * 86400)) : NaN;
    const pm = enough && ok(num(m.usd150)) && ok(months) ? num(m.usd150) / months : NaN;
    const tpw = enough && ok(months) ? n / (months * 30.4 / 7) : NaN;
    const fl = (sc && obj(sc.floor)) || killAt(n);
    const avgK = sc && sc.n ? num(sc.avg_r) : num(m.avg_r), pfK = sc && sc.n ? num(sc.pf_r) : num(m.pf150);
    const ld = sc ? num(sc.lose_days) : NaN;
    const tbl = `<div class="bl-scroll"><table class="bl-tbl"><thead><tr><th>Span</th><th>Trades</th><th>/ wk</th><th>Win</th><th>Avg R</th><th>PF</th><th>Net</th><th>$ / mo</th><th>Max DD</th></tr></thead>
      <tbody>${RESEARCH.map((r) => `<tr class="${r.main ? 'on' : ''}"><td>${esc(r.label)}</td><td>${r.n.toLocaleString('en-US')}</td><td>${r.tpw}</td><td>${r.win}%</td><td>${fr(r.avg_r, 3)}</td><td>${r.pf.toFixed(2)}</td><td>${usd(r.net, true)}</td><td><b>${usd(r.pm, true)}</b></td><td class="dn">${usd(r.dd)}</td></tr>`).join('')}</tbody></table></div>`;
    const ev = `<div class="bl-scroll"><table class="bl-tbl"><thead><tr><th>Builder 25K eval</th><th>2 weeks pass / fail</th><th>1 month pass / fail</th><th>Whole slot $ / mo</th></tr></thead>
      <tbody>${RESEARCH.map((r) => `<tr class="${r.main ? 'on' : ''}"><td>${esc(r.label)}</td><td>${r.p2}% / ${r.f2}%</td><td>${r.p1m}% / ${r.f1m}%</td><td>${usd(r.slot, true)}</td></tr>`).join('')}</tbody></table></div>`;
    const closeAvg = fl && ok(avgK) ? avgK - fl.avg_r_p5 : NaN, closePf = fl && ok(pfK) ? pfK - fl.pf_p5 : NaN;
    const kl = sc && sc.status === 'below' ? 'bad' : sc && sc.status === 'ok' ? 'good' : '';
    return `<section class="bl-card"><div class="bl-h"><h3>Research bands</h3><span class="bl-meta">$150 a trade, costs in</span></div>
        <p class="bl-mut">Picked on 2026 H1, checked on 2026 H2 (the honest line), 2021-25 on 5-minute bars as the reference. BLITZ_STRATEGY.md.</p>${tbl}
        <p class="bl-line">It trades on about 43% of days and takes 5-6 trades on trend days: a trend-day machine; quiet weeks lose a little.</p></section>
      <section class="bl-card"><div class="bl-h"><h3>Live vs the research band</h3><span class="bl-meta">${esc(liveSrc)}</span></div>
        ${bandBar('Win rate', win, RF.win, H2.win, H1.win, (v) => v.toFixed(0) + '%')}
        ${bandBar('Average R a trade', avgR, RF.avg_r, H2.avg_r, H1.avg_r, (v) => (v > 0 ? '+' : '') + v.toFixed(3) + 'R')}
        ${bandBar('PF (in R)', pf, RF.pf, H2.pf, H1.pf, (v) => v.toFixed(2))}
        ${bandBar('$ a month at $150 a trade', pm, RF.pm, H2.pm, H1.pm, (v) => usd(v, true))}
        ${bandBar('Trades a week', tpw, Math.min(RF.tpw, 6.8), H2.tpw, H1.tpw, (v) => v.toFixed(1))}
        <p class="bl-mut">${ok(n) && n > 0 ? `${n} finished trade${n === 1 ? '' : 's'} so far${enough ? ': under 20 the numbers swing a lot.' : `: the live markers show from ${MIN_N} trades.`}` : 'No finished trades yet.'}</p></section>
      <section class="bl-card bl-kill ${kl}"><div class="bl-h"><h3>Kill switch · the performance contract</h3>${chip(sc ? (sc.status === 'below' ? 'BELOW THE FLOOR' : sc.status === 'ok' ? 'ABOVE THE FLOOR' : sc.status === 'warming' ? 'WARMING UP' : String(sc.status || '').toUpperCase()) : 'ACCOUNT C OFF', kl)}</div>
        <p class="bl-line">After 20+ finished trades on account C, an average R or a PF (R) under the 2026 5th percentile for that many trades, or 6 losing days in a row, pauses BLITZ on its account (Zlarior and ATLAS keep trading). Resume is your decision.</p>
        <div class="bl-tiles sm"><div><span>Trades</span><b>${ok(n) ? n : 0}</b><em>${ok(n) && n < 20 ? (20 - n) + ' to the first check' : 'checked every trade'}</em></div>
          <div><span>Avg R vs floor</span><b class="${cls(closeAvg)}">${ok(closeAvg) ? (closeAvg > 0 ? '+' : '') + closeAvg.toFixed(3) : '—'}</b><em>${fl ? 'floor ' + fr(fl.avg_r_p5, 3) + (fl.approx ? ' ≈' : '') : 'floor from 20 trades'}</em></div>
          <div><span>PF vs floor</span><b class="${cls(closePf)}">${ok(closePf) ? (closePf > 0 ? '+' : '') + closePf.toFixed(2) : '—'}</b><em>${fl ? 'floor ' + num(fl.pf_p5).toFixed(2) + (fl.approx ? ' ≈' : '') : 'floor 0.62 at 20'}</em></div>
          <div><span>Losing days</span><b>${ok(ld) ? ld : '—'} / ${LOSE_DAYS_CAP}</b><em>2026's worst: 3</em></div></div>
        <div class="bl-meter" aria-label="Losing days in a row"><i style="width:${ok(ld) ? Math.min(100, ld / LOSE_DAYS_CAP * 100).toFixed(0) : 0}%"></i></div>
        <div class="bl-scroll"><table class="bl-tbl sm"><thead><tr><th>Finished trades</th>${KILL.map((k) => `<th class="${ok(n) && n >= k[0] ? 'on' : ''}">${k[0]}</th>`).join('')}</tr></thead>
          <tbody><tr><td>Avg R under</td>${KILL.map((k) => `<td>${fr(k[1], 3)}</td>`).join('')}</tr><tr><td>PF (R) under</td>${KILL.map((k) => `<td>${k[2].toFixed(2)}</td>`).join('')}</tr></tbody></table></div>
        ${sc && arr(sc.why).length ? `<p class="bl-line dn">${esc(arr(sc.why).join('; '))}</p>` : ''}
        ${sc && sc.resume_cmd ? `<p class="bl-mut">Resume (your decision): <code>${esc(sc.resume_cmd)}</code></p>` : ''}</section>
      <section class="bl-card"><div class="bl-h"><h3>Paper evals so far</h3><span class="bl-meta">simulated Builder 25K, $63 each</span></div>${ev}
        ${M.evals.length ? `<ul class="bl-list">${M.evals.slice(-6).reverse().map((e) => `<li><i class="bl-dot ${e.result === 'PASS' ? 'good' : e.result === 'FAIL' ? 'bad' : ''}"></i><b>Eval ${esc(e.n)} · ${esc(e.result)}</b><span>${esc(e.start || '')} → ${esc(e.end || e.day || '')}</span><em>${ok(num(e.profit)) ? usd(e.profit, true) : ''}${ok(num(e.sessions)) ? ' · ' + e.sessions + ' sessions' : ''}</em></li>`).join('')}</ul>`
          : `<p class="bl-mut">${M.money ? `${M.money.passes || 0} passed · ${M.money.fails || 0} failed · ${M.money.stuck || 0} stuck · ${usd(M.money.net_less_fees, true)} after fees` : 'No paper eval finished yet.'}</p>`}</section>`;
  }
  function rules(M, o) {
    return `<section class="bl-card"><div class="bl-h"><h3>The rule, exactly</h3><span class="bl-meta">engine/blitz.py · BLITZ_STRATEGY.md</span></div>
        <p class="bl-line">NQ futures as MNQ micros ($2 a point), 1-minute candles, New York time. Costs in everywhere: $1.90 a micro round trip + 1 tick on every market and stop fill.</p>
        <ol class="bl-rules">${RULES.map(([id, t, x]) => `<li><b>${id} · ${esc(t)}</b><span>${esc(x)}</span></li>`).join('')}</ol>
        <p class="bl-mut">How 2026's trades ended: 73% at the 30-minute clock, 20% at the stop (first stop or trail), 7% at 15:55.</p></section>
      <section class="bl-card"><div class="bl-h"><h3>Size and the 25K rules</h3></div><ul class="bl-bul">
        <li><b>Eval size:</b> risk = 40% of the room to the trailing floor for sessions 1-4, then the full room from session 5; at most $600 and 0.9 x what is left of today's $600 daily loss, divided by the stop's cost per micro, max 20 micros. A wide stop gets fewer micros.</li>
        <li><b>Eval:</b> pass at +$1,500 (never automatic: you switch to funded), fail when the $1,000 trailing room is gone, stuck under $249.56 of room (buy a new one), the $600 soft daily loss = no new entry today.</li>
        <li><b>Funded:</b> 10% of the room, at most $150 a trade, no new trade after +$400 on the day.</li>
        <li><b>Never against your other accounts:</b> Zlarior first, then ATLAS, then BLITZ. Same direction is allowed.</li>
        <li><b>Order checks:</b> at most 20 micros; a stop over 250 points is refused. An order NinjaTrader refused is never booked.</li></ul></section>
      <section class="bl-card"><div class="bl-h"><h3>Money first (honest)</h3></div>
        <p class="bl-line">On its own 25K, BLITZ is mostly an eval experiment: its real edge per trade is small. The whole account slot pays +$270 a month (2026 H1), +$37 (H2), −$40 (2021-25). The best use found is BLITZ on Zlarior's funded 50K while Zlarior is flat (+$290-300 a month per slot), which needs the 50K funded first.</p></section>`;
  }
  function golive(M, o) {
    const pf = M.preflight;
    const a = M.ac, sc = a && obj(a.scorecard), stg = M.stage;
    const auto = [
      ['BLITZ paper shadow runs on the PC', stg && !['off', 'error'].includes(stg) ? true : M.sc || M.card ? false : null, M.text],
      ['1-minute bars from NinjaTrader are fresh', stg === 'stale' ? false : M.t ? M.now - M.t < 20 * 60 : null, stg === 'stale' ? M.text : M.t ? `last BLITZ data ${dur(M.now - M.t)} ago` : 'no data yet'],
      ['Account C is set (its 25K Name)', a || (M.slot && M.slot.on) ? true : M.slot || M.where !== 'pc' ? false : null, a ? (a.account || 'set') : M.slot && M.slot.on ? (M.slot.say || M.slot.name) : 'Start page > BLITZ · 25K > Set BLITZ\'s 25K'],
      ['Sim test seen', a ? (a.kind === 'SIM' ? (arr(a.closed).length || arr(a.trades_today).length ? true : null) : a.kind === 'LIVE' ? true : null) : null, a && a.kind === 'SIM' ? `${arr(a.closed).length} Sim trades so far` : 'optional: Sim test = Sim101 for a day'],
      ['Armed on the real 25K', a ? (a.kind === 'LIVE' && a.armed) : M.slot && M.slot.on ? !!(M.slot.armed && !M.slot.sim) : false, a ? (a.armed ? 'armed' : 'not armed') : M.slot && M.slot.on ? (M.slot.armed ? 'armed' : 'not armed') : 'Start page: Arm BLITZ (the typed phrase)'],
      ['Performance contract not paused', a ? !a.paused : null, a && a.paused ? 'PAUSED: resume is your decision' : sc ? `${sc.status || ''}` : 'checks from 20 trades'],
    ];
    const rows = (pf.length ? pf.map((x) => [x.label || x.name || x.key, x.ok === true ? true : x.ok === false ? false : null, x.fix || x.text || x.detail || '']) : auto);
    const nOk = rows.filter((r) => r[1] === true).length;
    return `<section class="bl-card bl-steps"><div class="bl-h"><h3>Turn it on (you, next week)</h3>${chip('3 steps', 'live')}</div>
        <ol class="bl-step"><li><b>Buy the MFFU Builder 25K for BLITZ</b><span>Your price: $63 (or $43 with a code). Connect it in NinjaTrader.</span></li>
          <li><b>Start page › BLITZ · 25K</b><span>Type its Name exactly as NinjaTrader shows it, press Set BLITZ's 25K, then Arm BLITZ (type I ACCEPT LIVE RISK). Sim test first if you want to watch it on Sim101 for a day.</span></li>
          <li><b>Press Start trading</b><span>The bot picks it up once account C is flat.</span></li></ol>
        <p class="bl-mut">Console instead of step 2: <code>python -X utf8 -m engine.account_c --account "&lt;the 25K Name&gt;" --plan builder25k --start 2026-11-02</code></p>
        <p class="bl-mut">This page is read-only: it never arms, routes or changes the bot.</p></section>
      <section class="bl-card"><div class="bl-h"><h3>Preflight</h3>${chip(`${nOk} of ${rows.length} ready`, nOk === rows.length ? 'good' : 'warn')}</div>
        <p class="bl-mut">${pf.length ? 'From the bot\'s own preflight checks.' : 'From the data the PC sends (the Start page runs the full checks).'}</p>
        <ul class="bl-pf">${rows.map(([l, k, f]) => `<li class="${k === true ? 'good' : k === false ? 'bad' : ''}"><i>${k === true ? '✓' : k === false ? '✗' : '…'}</i><b>${esc(l)}</b>${f ? `<em>${esc(f)}</em>` : ''}</li>`).join('')}</ul></section>`;
  }
  const PART_FN = { today, brain, trades, results, rules, golive };

  function page(M, part, o) {
    if (!M || M.v !== V) M = model(M || {});
    part = PART_FN[part] ? part : 'today';
    let body;
    try { body = PART_FN[part](M, o || {}); } catch (e) { body = `<section class="bl-card"><b>Could not draw this part.</b><p class="bl-mut">${esc(e && e.message)}</p></section>`; }
    return `<div class="bl-wrap" data-bl-part="${part}">${part === 'today' ? '' : `<div class="bl-mini"><span class="bl-orb sm" aria-hidden="true"><i></i></span><b>BLITZ</b>${chip(status(M).word, status(M).lvl)}${chip(acctC(M).label, acctC(M).lvl)}</div>`}${body}</div>`;
  }
  // countdowns tick every second while the element is on screen
  function wire(el) {
    if (!el || el.__blT) return;
    const tick = () => {
      if (!el.isConnected) { clearInterval(el.__blT); el.__blT = null; return; }
      const n = Date.now() / 1000;
      el.querySelectorAll('[data-bl-cd]').forEach((x) => { const t = +x.dataset.blCd; x.textContent = (x.tagName === 'EM' ? 'in ' : '') + (t > n ? dur(t - n) : 'now'); });
    };
    el.__blT = setInterval(tick, 1000);
  }
  // a one-line summary for other pages (Home, Mission Control)
  function line(M) {
    if (!M || M.v !== V) M = model(M || {});
    const S = status(M), nc = nextCheck(M.now);
    return { word: S.word, lvl: S.lvl, acct: S.acct.label, text: M.text, next: nc ? `${nc.today ? '' : dayLbl(nc.t) + ' '}${modHM(nc.mod)} ET` : '' };
  }

  const CSS = `
.bl-wrap{--bl:${PURPLE};--bl-2:#7c4dff;--bl-ink:var(--ink,#eef1f8);--bl-mut:var(--muted,#9aa3b8);--bl-line:rgba(179,136,255,.20);--bl-good:var(--good,#2ee59d);--bl-bad:var(--bad,#ff5a7a);--bl-warn:var(--warn,#ffb547);
  --bl-glass:linear-gradient(180deg,rgba(26,16,52,.72),rgba(8,6,22,.64));color:var(--bl-ink);display:flex;flex-direction:column;gap:12px;min-width:0}
.bl-wrap *{box-sizing:border-box}
.bl-wrap .up{color:var(--bl-good)}.bl-wrap .dn{color:var(--bl-bad)}
.bl-card,.bl-hero{position:relative;padding:16px;border-radius:18px;background:var(--bl-glass) padding-box,linear-gradient(140deg,rgba(179,136,255,.55),rgba(124,77,255,.12) 45%,rgba(79,155,255,.22)) border-box;border:1px solid transparent;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.07),0 18px 44px -24px rgba(124,77,255,.55);overflow:hidden;min-width:0}
.bl-hero{padding:18px 16px 14px}
.bl-hero::before{content:"";position:absolute;inset:-50% -20% auto auto;width:80%;height:140%;background:radial-gradient(closest-side,rgba(179,136,255,.22),transparent);pointer-events:none}
.bl-orb{position:absolute;right:16px;top:16px;width:46px;height:46px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#efe3ff,#b388ff 38%,#4b1fa8 75%,#1a0b3d);box-shadow:0 0 24px rgba(179,136,255,.7),inset -6px -8px 14px rgba(0,0,0,.45)}
.bl-orb i{position:absolute;inset:-7px;border-radius:50%;border:1px solid rgba(179,136,255,.45);transform:rotateX(70deg);animation:bl-ring 6s linear infinite}
.bl-orb.sm{position:relative;right:auto;top:auto;width:18px;height:18px;display:inline-block;flex:none}.bl-orb.sm i{inset:-4px}
@keyframes bl-ring{to{transform:rotateX(70deg) rotateZ(360deg)}}
@media (prefers-reduced-motion:reduce){.bl-orb i{animation:none}}
.bl-hero-h{display:flex;justify-content:space-between;align-items:flex-start;gap:8px;padding-right:58px;flex-wrap:wrap}
.bl-eye{font:700 11px/1.2 var(--sans,Inter,system-ui,sans-serif);letter-spacing:.14em;text-transform:uppercase;color:#cdb4ff}
.bl-hero h2{margin:4px 0 0;font:800 30px/1 var(--sans,Inter,system-ui,sans-serif);letter-spacing:.04em;background:linear-gradient(90deg,#fff,#d9c4ff 45%,#b388ff);-webkit-background-clip:text;background-clip:text;color:transparent}
.bl-chips{display:flex;gap:6px;flex-wrap:wrap}
.bl-chip{display:inline-flex;align-items:center;gap:6px;height:24px;padding:0 10px;border-radius:99px;font:700 10.5px/1 var(--sans,Inter,sans-serif);letter-spacing:.06em;white-space:nowrap;color:var(--bl-mut);background:rgba(148,163,184,.12);border:1px solid rgba(148,163,184,.22);max-width:100%;overflow:hidden;text-overflow:ellipsis}
.bl-chip::before{content:"";width:7px;height:7px;border-radius:50%;background:currentColor;flex:none}
.bl-chip.good{color:var(--bl-good);background:color-mix(in srgb,var(--bl-good) 12%,transparent);border-color:color-mix(in srgb,var(--bl-good) 35%,transparent)}
.bl-chip.warn{color:var(--bl-warn);background:color-mix(in srgb,var(--bl-warn) 12%,transparent);border-color:color-mix(in srgb,var(--bl-warn) 35%,transparent)}
.bl-chip.bad{color:var(--bl-bad);background:color-mix(in srgb,var(--bl-bad) 12%,transparent);border-color:color-mix(in srgb,var(--bl-bad) 40%,transparent)}
.bl-chip.live{color:#e6d6ff;background:rgba(179,136,255,.18);border-color:rgba(179,136,255,.5)}.bl-chip.live::before{box-shadow:0 0 8px #b388ff;background:#b388ff}
.bl-think{margin:12px 0 0;font-size:15.5px;line-height:1.5;color:var(--bl-ink)}
.bl-hero-r{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:14px}
.bl-hero-r>div,.bl-tiles>div,.bl-kv>div{min-width:0;padding:10px;border-radius:12px;background:rgba(179,136,255,.07);border:1px solid var(--bl-line);display:flex;flex-direction:column;gap:3px}
.bl-hero-r span,.bl-tiles span,.bl-kv span{font:650 10.5px/1.2 var(--sans,Inter,sans-serif);letter-spacing:.08em;text-transform:uppercase;color:var(--bl-mut)}
.bl-hero-r b,.bl-tiles b,.bl-kv b{font:750 17px/1.15 var(--sans,Inter,sans-serif);font-variant-numeric:tabular-nums;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.bl-hero-r em,.bl-tiles em,.bl-kv em{font-style:normal;font-size:11.5px;color:var(--bl-mut);overflow:hidden;text-overflow:ellipsis}
.bl-src,.bl-foot{margin:10px 0 0;font-size:12px;color:var(--bl-mut)}.bl-foot{text-align:center}
.bl-acline{padding:8px 10px;border-radius:10px;background:rgba(179,136,255,.12);border:1px solid rgba(179,136,255,.3)}
.bl-report{margin:10px 0 0;padding:10px 12px;border-radius:12px;font-size:13.5px;line-height:1.5;background:rgba(148,163,184,.08);border:1px solid var(--bl-line)}
.bl-report b{color:#e6d6ff}.bl-report.good{border-color:color-mix(in srgb,var(--bl-good) 45%,transparent)}.bl-report.warn{border-color:color-mix(in srgb,var(--bl-warn) 45%,transparent)}.bl-report.bad{border-color:color-mix(in srgb,var(--bl-bad) 50%,transparent)}
:root[data-theme="light"] .bl-report b{color:#5b2fd6}
.bl-h{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:8px;flex-wrap:wrap}
.bl-h h3{margin:0;font:700 15px/1.3 var(--sans,Inter,sans-serif);color:var(--bl-ink)}
.bl-meta{font-size:12px;color:var(--bl-mut)}
.bl-line{margin:6px 0;font-size:14px;line-height:1.5}.bl-line.wn{color:var(--bl-warn)}.bl-line.dn{color:var(--bl-bad)}
.bl-mut{margin:6px 0;font-size:13px;line-height:1.5;color:var(--bl-mut)}
.bl-mut code,.bl-wrap code{font:12px/1.4 var(--mono,ui-monospace,monospace);padding:2px 6px;border-radius:6px;background:rgba(179,136,255,.12);word-break:break-all;user-select:all}
.bl-tiles{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin:10px 0}
.bl-tiles.sm{grid-template-columns:repeat(auto-fit,minmax(92px,1fr))}.bl-tiles.sm b{font-size:15px}
.bl-kv{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:8px}
.bl-band{display:block;width:100%;height:auto;margin:6px 0 2px}
.bl-band path.u{fill:none;stroke:#2ee59d;stroke-width:1.6;stroke-dasharray:4 3}.bl-band path.d{fill:none;stroke:#ff5a7a;stroke-width:1.6;stroke-dasharray:4 3}
.bl-band .o{stroke:#cdb4ff;stroke-width:1;stroke-dasharray:1 3}.bl-band .n{stroke:#fff;stroke-opacity:.5;stroke-width:1}.bl-band .p{fill:#fff;filter:drop-shadow(0 0 4px #b388ff)}
.bl-band circle.tk{stroke:#fff;stroke-width:1.2}.bl-band circle.l{fill:#2ee59d}.bl-band circle.s{fill:#ff5a7a}.bl-band circle.sk{fill-opacity:.35;stroke:currentColor;stroke-width:1}
.bl-band text{font:10px var(--sans,Inter,sans-serif);fill:var(--bl-mut)}
.bl-list{list-style:none;margin:0;padding:0}.bl-list li{display:grid;grid-template-columns:auto auto 1fr;gap:4px 10px;align-items:baseline;padding:9px 0;border-top:1px solid var(--bl-line);font-size:13.5px}
.bl-list li:first-child{border-top:0}.bl-list li em{grid-column:2/-1;font-style:normal;font-size:12px;color:var(--bl-mut)}.bl-list li span{min-width:0;color:var(--bl-mut);overflow-wrap:anywhere}
.bl-dot{width:8px;height:8px;border-radius:50%;background:#64748b;align-self:center}.bl-dot.good{background:var(--bl-good);box-shadow:0 0 8px var(--bl-good)}.bl-dot.bad{background:var(--bl-bad)}
.bl-pos{margin-top:8px;padding:12px;border-radius:14px;background:rgba(179,136,255,.08);border:1px solid var(--bl-line);border-left:3px solid var(--bl)}
.bl-pos.lg{border-left-color:var(--bl-good)}.bl-pos.sh{border-left-color:var(--bl-bad)}
.bl-pos-h{display:flex;gap:10px;align-items:baseline;flex-wrap:wrap;font-size:14px}.bl-pos-h span{color:var(--bl-mut);font-size:12.5px}
.bl-eval{margin-top:10px}.bl-eval-h{display:flex;justify-content:space-between;align-items:center;gap:8px;font-size:12.5px;color:var(--bl-mut);font-weight:650;flex-wrap:wrap}
.bl-bar,.bl-meter{height:6px;border-radius:99px;background:rgba(148,163,184,.18);overflow:hidden}.bl-bar i{display:block;height:100%;background:linear-gradient(90deg,#7c4dff,#b388ff);border-radius:99px}
.bl-meter{margin:4px 0 10px}.bl-meter i{display:block;height:100%;background:linear-gradient(90deg,var(--bl-warn),var(--bl-bad))}
.bl-acc.armed{background:var(--bl-glass) padding-box,linear-gradient(140deg,#b388ff,rgba(46,229,157,.4)) border-box}.bl-acc.paused{background:var(--bl-glass) padding-box,linear-gradient(140deg,var(--bl-bad),rgba(179,136,255,.3)) border-box}
.bl-rule{display:flex;flex-direction:column;gap:4px;margin:4px 0 10px;padding:12px;border-radius:12px;background:rgba(179,136,255,.1);border:1px solid rgba(179,136,255,.35)}
.bl-rule b{font-size:15px}.bl-rule span{font-size:13.5px;line-height:1.5}.bl-rule em{font-style:normal;font-size:12px;color:var(--bl-mut)}
.bl-ladder{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}
.bl-ladder li{display:flex;gap:8px;align-items:center;min-height:40px;padding:6px 10px;border-radius:10px;border:1px solid var(--bl-line);font-size:12.5px;color:var(--bl-mut)}
.bl-ladder li b{font:750 12px var(--mono,ui-monospace,monospace);color:#cdb4ff}.bl-ladder li.on{color:var(--bl-ink);border-color:#b388ff;background:rgba(179,136,255,.16);box-shadow:0 0 18px -6px #b388ff}
.bl-trades{list-style:none;margin:0;padding:0}
.bl-trades li{display:grid;grid-template-columns:auto 1fr auto auto;grid-template-areas:"tg b v h" "tg p v h";gap:2px 10px;align-items:center;padding:10px 0;border-top:1px solid var(--bl-line);min-height:56px}
.bl-trades li:first-child{border-top:0}.bl-trades li b{grid-area:b;font-size:13.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.bl-trades .bl-tp{grid-area:p;font-size:12px;color:var(--bl-mut);min-width:0;overflow-wrap:anywhere}
.bl-trades .bl-tv{grid-area:v;text-align:right;font:700 14px var(--sans,Inter,sans-serif);font-variant-numeric:tabular-nums;display:flex;flex-direction:column}.bl-trades .bl-tv em{font-style:normal;font-size:11px;color:var(--bl-mut);font-weight:500}
.bl-tg{grid-area:tg;font:750 9.5px/1 var(--sans,Inter,sans-serif);letter-spacing:.08em;padding:4px 6px;border-radius:6px;background:rgba(148,163,184,.16);color:var(--bl-mut)}
.bl-tg.real{background:rgba(46,229,157,.16);color:var(--bl-good)}.bl-tg.sim{background:rgba(255,181,71,.16);color:var(--bl-warn)}.bl-tg.paper{background:rgba(179,136,255,.16);color:#cdb4ff}
.bl-holo{grid-area:h;display:grid;place-items:center;min-width:44px;min-height:44px;border-radius:12px;border:1px solid rgba(179,136,255,.4);color:#e6d6ff;font:800 12px var(--sans,Inter,sans-serif);text-decoration:none;cursor:pointer;background:rgba(179,136,255,.1)}
.bl-scroll{overflow-x:auto;max-width:100%;-webkit-overflow-scrolling:touch;margin:8px 0}
.bl-tbl{border-collapse:collapse;width:100%;min-width:520px;font-size:12.5px;font-variant-numeric:tabular-nums}.bl-tbl.sm{min-width:420px}
.bl-tbl th,.bl-tbl td{padding:7px 8px;text-align:right;border-bottom:1px solid var(--bl-line);white-space:nowrap}.bl-tbl th:first-child,.bl-tbl td:first-child{text-align:left}
.bl-tbl th{font-weight:650;color:var(--bl-mut);font-size:11px;letter-spacing:.04em}.bl-tbl tr.on td{background:rgba(179,136,255,.1);color:var(--bl-ink)}.bl-tbl th.on{color:#e6d6ff}
.bl-bb{margin:10px 0}.bl-bb-h{display:flex;gap:8px;align-items:baseline;flex-wrap:wrap;font-size:13px}.bl-bb-h span{flex:1;min-width:120px}.bl-bb-h b{font-variant-numeric:tabular-nums}.bl-bb-h b.good{color:var(--bl-good)}.bl-bb-h b.warn{color:var(--bl-warn)}.bl-bb-h b.bad{color:var(--bl-bad)}
.bl-bb-h em{font-style:normal;font-size:11.5px;color:var(--bl-mut)}
.bl-bb-t{position:relative;height:10px;margin:6px 0 3px;border-radius:99px;background:rgba(148,163,184,.14)}
.bl-bb-t i{position:absolute;top:0;height:100%}.bl-bb-t i.band{background:linear-gradient(90deg,rgba(124,77,255,.55),rgba(179,136,255,.75));border-radius:99px;min-width:6px}
.bl-bb-t i.wk{width:2px;background:var(--bl-warn)}.bl-bb-t i.lv{width:14px;height:14px;top:-2px;margin-left:-7px;border-radius:50%;background:#fff;box-shadow:0 0 10px #b388ff}
.bl-bb-l{display:flex;justify-content:space-between;font-size:11px;color:var(--bl-mut)}
.bl-rules,.bl-step{margin:8px 0 0;padding-left:0;list-style:none;display:flex;flex-direction:column;gap:8px;counter-reset:s}
.bl-rules li,.bl-step li{display:flex;flex-direction:column;gap:3px;padding:10px 12px;border-radius:12px;border:1px solid var(--bl-line);background:rgba(179,136,255,.05)}
.bl-rules li b,.bl-step li b{font-size:14px;color:#e6d6ff}.bl-rules li span,.bl-step li span{font-size:13.5px;line-height:1.5;color:var(--bl-ink)}
.bl-step li{counter-increment:s;padding-left:46px;position:relative}.bl-step li::before{content:counter(s);position:absolute;left:12px;top:10px;width:24px;height:24px;border-radius:50%;display:grid;place-items:center;font:800 12px var(--sans,Inter,sans-serif);background:#b388ff;color:#1a0b3d}
.bl-bul{margin:4px 0 0;padding-left:18px;display:flex;flex-direction:column;gap:6px;font-size:13.5px;line-height:1.5}
.bl-pf{list-style:none;margin:0;padding:0}.bl-pf li{display:grid;grid-template-columns:28px 1fr;gap:2px 8px;align-items:center;min-height:44px;padding:6px 0;border-top:1px solid var(--bl-line)}
.bl-pf li:first-child{border-top:0}.bl-pf li i{font-style:normal;font-weight:800;width:24px;height:24px;border-radius:50%;display:grid;place-items:center;background:rgba(148,163,184,.16);color:var(--bl-mut);grid-row:span 2}
.bl-pf li.good i{background:rgba(46,229,157,.16);color:var(--bl-good)}.bl-pf li.bad i{background:rgba(255,90,122,.14);color:var(--bl-bad)}.bl-pf li b{font-size:14px}.bl-pf li em{font-style:normal;font-size:12px;color:var(--bl-mut);overflow-wrap:anywhere}
.bl-mini{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:2px 2px 0}.bl-mini b{font:800 15px var(--sans,Inter,sans-serif);letter-spacing:.06em;color:#e6d6ff;margin-right:2px}
@media (max-width:420px){.bl-hero-r{grid-template-columns:repeat(3,minmax(0,1fr))}.bl-hero-r b{font-size:15px}.bl-tiles{grid-template-columns:repeat(2,minmax(0,1fr))}.bl-ladder{grid-template-columns:1fr}}
@media (min-width:1100px){.bl-wrap[data-bl-part="today"],.bl-wrap[data-bl-part="results"]{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));align-items:start}.bl-wrap>.bl-hero,.bl-wrap>.bl-mini{grid-column:1/-1}}
:root[data-theme="light"] .bl-wrap{--bl-glass:linear-gradient(180deg,rgba(255,255,255,.9),rgba(245,240,255,.86));--bl-ink:#1b1530;--bl-mut:#5b5675;--bl-line:rgba(124,77,255,.18)}
:root[data-theme="light"] .bl-hero h2{background:linear-gradient(90deg,#3b1a8f,#7c4dff);-webkit-background-clip:text;background-clip:text}
:root[data-theme="light"] .bl-eye,:root[data-theme="light"] .bl-rules li b,:root[data-theme="light"] .bl-step li b,:root[data-theme="light"] .bl-ladder li b{color:#5b2fd6}
:root[data-theme="light"] .bl-chip.live{color:#5b2fd6;background:rgba(124,77,255,.12);border-color:rgba(124,77,255,.45)}:root[data-theme="light"] .bl-chip.live::before{background:#7c4dff}
:root[data-theme="light"] .bl-holo,:root[data-theme="light"] .bl-tg.paper,:root[data-theme="light"] .bl-mini b,:root[data-theme="light"] .bl-tbl th.on{color:#5b2fd6}
:root[data-theme="light"] .bl-ladder li.on,:root[data-theme="light"] .bl-tbl tr.on td{color:#1b1530}
:root[data-theme="light"] .bl-band .n{stroke:#1b1530}:root[data-theme="light"] .bl-band .p{fill:#5b2fd6}:root[data-theme="light"] .bl-band circle.tk{stroke:#1b1530}
:root[data-theme="light"] .bl-bb-t i.lv{background:#5b2fd6}
`;
  function css() {
    if (typeof document === 'undefined' || !document.head || document.getElementById('blitz-css')) return;
    const s = document.createElement('style'); s.id = 'blitz-css'; s.textContent = CSS; document.head.appendChild(s);
  }
  css();
  window.BlitzUI = { version: V, PARTS, RESEARCH, KILL, RULES, CHECKS, model, status, acctC, nextCheck, page, wire, line, css, rowsOf, filterLine, killAt, report };
})();

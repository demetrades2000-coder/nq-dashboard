// LIT kit: the LIT trader's panels for both dashboards (phone PWA tools/web_public/index.html and the PC web_next/), as plain
// functions that return HTML strings. No framework, no imports; its own scoped CSS (.lk-*) on the dashboards' tokens
// (--good --bad --warn --accent --accent-2 --ink --ink-2 --muted --line --surface-2 --surface-3 --bsl --ssl --mono).
// The PC copy is web_next/js/litkit.js (copied by `cd tools/web_public/fx && npm run build`): edit this file only.
//
//   import * as LK from './litkit.js';
//   const C = LK.fromCloud(D)               // phone: data.json -> the context every panel reads (LK.fromPC(...) on the PC)
//   LK.clockData(C)  -> the 'dayclock' 3D payload      LK.clockSVG(C)   -> its 2D fallback (svg + readout)
//   LK.planHTML(C)   -> "what happens next" timeline of today (sessions, entry window, news, flat, close)
//   LK.railData(C)   -> the 'pipeline' 3D payload       LK.railHTML(C)   -> the LIT setup tracker (step rail + prices)
//   LK.levels(C)     -> rows of every LIT level today   LK.levelsHTML(C) -> the levels board (distance in pts and $ per MNQ)
//   LK.cockpit(C)    -> MFFU eval numbers + what-ifs    LK.cockpitHTML(C, sim) -> the eval cockpit
//   LK.evalSim(C, { span: 'H2'|'2026', n, sessions }) -> forward pass / fail odds from the current balance (resampled
//                       2026 sessions) and paths for the 'montecarlo' 3D view (LK.simPayload(sim))
//   LK.readyHTML(C)  -> pre-session checklist (PC + NinjaTrader up before 01:55 ET, feed, 1m bars, eval, news, size rules)
//   LK.weekHTML(C)   -> the week planner (days, trades, USD events, Monday rule, weekly stop, 2-4 trades target)
//   LK.replay3d(t, { iSweep, iEntry, iExit }) -> { marks, zones, windows } for the 'candles' replay of a LIT trade
//   LK.css()         -> injects the CSS once (every *HTML function calls it)
// Paper only: these panels read the cloud / PC paper bot's state; nothing here places orders.

// ------------------------------------------------------------------ helpers
const ETF = (() => { try { return new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', weekday: 'short', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }); } catch { return null; } })();
const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export function et(ts) {
  const d = new Date(ts * 1000);
  if (!ETF) { const e = new Date(d.getTime() - 4 * 3600e3); return { y: e.getUTCFullYear(), mo: e.getUTCMonth() + 1, d: e.getUTCDate(), h: e.getUTCHours(), mi: e.getUTCMinutes(), wd: WD[e.getUTCDay()], dow: (e.getUTCDay() + 6) % 7, date: e.toISOString().slice(0, 10), min: e.getUTCHours() * 60 + e.getUTCMinutes() }; }
  const P = {}; for (const p of ETF.formatToParts(d)) P[p.type] = p.value;
  const h = (+P.hour) % 24, mi = +P.minute;
  return { y: +P.year, mo: +P.month, d: +P.day, h, mi, wd: P.weekday, dow: (WD.indexOf(P.weekday) + 6) % 7, date: `${P.year}-${P.month}-${P.day}`, min: h * 60 + mi };
}
// ET wall time (date 'YYYY-MM-DD', minute of day) -> epoch s (handles EDT / EST)
export function etEpoch(date, min) {
  const [y, m, d] = String(date).split('-').map(Number), guess = Date.UTC(y, m - 1, d, 0, 0) / 1000 + min * 60 + 4 * 3600;
  for (const off of [0, 3600, -3600]) { const t = guess + off, e = et(t); if (e.date === date && e.min === ((min % 1440) + 1440) % 1440) return t; }
  return guess;
}
const ok = (v) => v != null && v !== '' && Number.isFinite(+v);
const N = (v, d = NaN) => (ok(v) ? +v : d);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad2 = (n) => String(n).padStart(2, '0');
export const hm = (m) => { m = ((Math.round(m) % 1440) + 1440) % 1440; return `${pad2(Math.floor(m / 60))}:${pad2(m % 60)}`; };
const MINUS = '−';
const px = (v) => (ok(v) ? (+v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—');
const usd = (v) => (ok(v) ? (v < 0 ? MINUS : '') + '$' + Math.round(Math.abs(v)).toLocaleString('en-US') : '—');
const num = (v, d = 2) => (ok(v) ? Number(v).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }) : '—');
const susd = (v) => (ok(v) ? (v < 0 ? MINUS : v > 0 ? '+' : '') + '$' + Math.round(Math.abs(v)).toLocaleString('en-US') : '—');
const spts = (v, d = 1) => (ok(v) ? (v < 0 ? MINUS : v > 0 ? '+' : '') + Math.abs(v).toFixed(d) : '—');
const pct = (v) => (ok(v) ? (Math.abs(v) < 9.95 && v % 1 ? (+v).toFixed(1) : Math.round(v)) + '%' : '—');
const cls = (v) => (v > 0 ? 'lk-up' : v < 0 ? 'lk-dn' : '');
export function cd(s) {
  s = Math.max(0, Math.round(s)); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60);
  return h >= 48 ? `${Math.floor(h / 24)}d` : h >= 24 ? `${Math.floor(h / 24)}d ${h % 24}h` : h ? `${h}h ${pad2(m)}m` : m ? `${m}m` : `${s}s`;
}
const PV = 2;                         // MNQ $ per point
export const weekend = (ts) => { const e = et(ts); return (e.dow === 4 && e.min >= 1020) || e.dow === 5 || (e.dow === 6 && e.min < 1080); };
// the LIT trading day: the session that opens 18:00 ET belongs to the next weekday; returns { S: epoch of its 18:00, date }
export function sessionOf(ts, closed = weekend(ts)) {
  const e = et(ts), mm = ((e.min - 1080) % 1440 + 1440) % 1440;
  let S = Math.round(ts / 60) * 60 - mm * 60;
  if (closed) { const sdow = e.min >= 1080 ? e.dow : (e.dow + 6) % 7; S += ((6 - sdow + 7) % 7) * 86400; }
  return { S, date: et(S + 7 * 3600).date, closed };
}
const DEF_BOXES = [{ key: 'asia20', label: 'Asia 20-00', a: 1200, b: 1440, kind: 'asia' }, { key: 'lon23', label: 'Frankfurt 02-03', a: 120, b: 180, kind: 'london' },
  { key: 'lon34', label: 'London 03-04', a: 180, b: 240, kind: 'london' }, { key: 'pre', label: 'Premarket', a: 240, b: 570, kind: 'pre' },
  { key: 'ny89', label: 'NY 08-09', a: 480, b: 540, kind: 'ny' }, { key: 'rth', label: 'Cash session', a: 570, b: 960, kind: 'rth' }];
const short = (l) => String(l).replace(/ \d\d-\d\d$/, '');

// ------------------------------------------------------------------ the context
// D = data.json of the phone dashboard. Everything optional: missing parts leave their panel lines out.
export function fromCloud(D, now = Date.now() / 1000) {
  const lv = D?.live || {}, X = D?.lit_extra || {}, S = D?.strategy || {}, news = D?.news && !D.news.error ? D.news : null;
  const ledger = (lv.ledger || []).map((v) => ({ ...v, t: v.entry_t || ledgerT(v), exit_t: v.exit_ts || null }));
  return mk({ src: 'cloud', now, model: lv.model || S.model, model_state: lv.model_state, price: lv.price, last_run: lv.last_run, bars: lv.bars || [],
    levels: X.levels || lv.levels || lv.pools || [], levelsFull: !!(X.levels || lv.levels), lit: { ...(X.lit || {}), ...(lv.lit || {}) }, session: lv.session || X.lit?.session || {},
    setups: lv.setups || {}, position: lv.position || null, rules: lv.lit_rules || {}, eval: lv.eval || null, eval2wk: lv.eval_2wk || null, ledger, events: lv.events || [],
    news: news ? (news.events || []) : [], newsRules: news?.bot_now?.rules || null, newsDays: news?.days || [],
    sizing: { ...(X.sizing || {}), mode: lv.lit_sizing || X.sizing?.mode || S.lit_sizing?.mode || 'normal', risk_usd: X.sizing?.risk_usd ?? S.params?.risk_usd ?? 800,
      ref_stop: X.sizing?.ref_stop ?? S.params?.risk_ref_stop ?? 20, max_micros: X.sizing?.max_micros ?? S.params?.max_micros ?? 40,
      fast_ref_stop: X.sizing?.fast_ref_stop ?? S.lit_sizing?.fast_ref_stop ?? 40, safe_cap: X.sizing?.safe_cap ?? S.lit_sizing?.safe_cap ?? 0.6, wk_stop: X.sizing?.wk_stop ?? S.lit?.wk_stop ?? [2, 0.5] },
    plan: X.plan || null, litRules: { ...(X.rules || {}), window: X.rules?.window || S.lit?.window || [[120, 930]] }, boxes: X.boxes || null, stats: X.stats || null,
    timing: lv.eval_timing || null, periods: D?.results?.periods || null, engineTrades: lv.engine_trades || [], pc: lv.pc || null, health: lv.health || null });
}
// the PC dashboard: its live state (/api/live/state: the PC bot's LIT state) + data it already has
// PC ledger rows: { t, side: 'buy'|'sell'|'exit', qty, reason, pnl, entry_t, exit_t } (engine/live.py _route); exits become trades
export function pcLedger(rows) {
  const ent = new Map((rows || []).filter((r) => r.side !== 'exit' && r.entry_t).map((r) => [r.entry_t, r]));
  return (rows || []).filter((r) => r.side === 'exit' && r.entry_t).map((r) => {
    const e = ent.get(r.entry_t), t = +r.entry_t, d = sessionOf(t, false).date;
    return { day: d, t, exit_t: r.exit_t || r.t, side: e ? (/buy|long/i.test(e.side) ? 'LONG' : 'SHORT') : '', exit: r.reason || '', usd: N(r.pnl, 0), R: N(r.r), qty: r.qty };
  });
}
export function fromPC(live, extra = {}, now = Date.now() / 1000) {
  const st = live?.state || live || {};
  if (!extra.ledger && live?.ledger) extra = { ...extra, ledger: pcLedger(live.ledger), bars: extra.bars || live.bars };
  const bars = (extra.bars || st.bars || []).map((b) => (Array.isArray(b) ? b : [b.time ?? b.t, b.open ?? b.o, b.high ?? b.h, b.low ?? b.l, b.close ?? b.c]));
  return mk({ src: 'pc', now, model: st.model || 'lit', model_state: st.model_state, price: st.price, last_run: live?.last_poll ?? st.t, bars,
    levels: st.active_pools || extra.levels || [], levelsFull: !!st.active_pools, lit: st.lit || {}, session: st.session || {}, setups: st.setups || {}, position: st.position || null,
    rules: st.lit_rules || {}, eval: extra.eval || null, eval2wk: extra.eval2wk || st.eval_2wk || null, ledger: extra.ledger || [], events: extra.events || [], news: extra.news || [], newsRules: extra.newsRules || null,
    newsDays: extra.newsDays || [], sizing: extra.sizing || {}, plan: extra.plan || null, litRules: extra.rules || { window: [[120, 930]] }, boxes: extra.boxes || null,
    stats: extra.stats || null, timing: extra.timing || null, periods: extra.periods || null, engineTrades: extra.engineTrades || [],
    pc: { present: true, running: !!live?.running, silent: false, adapter: live?.cfg?.adapter, age_s: live?.last_poll ? now - live.last_poll : null }, health: live?.health || null });
}
// a ledger row's entry epoch: { day, entry: 'MM-DD HH:MM' } (ET)
function ledgerT(v) {
  const m = String(v.entry || '').match(/^(\d\d)-(\d\d) (\d\d):(\d\d)$/); if (!m || !v.day) return null;
  let y = +String(v.day).slice(0, 4); if (+m[1] === 12 && String(v.day).slice(5, 7) === '01') y--;
  return etEpoch(`${y}-${m[1]}-${m[2]}`, +m[3] * 60 + +m[4]);
}
function mk(c) {
  c.plan = { name: 'MFFU Builder 50K', start: 50000, target: 3000, mll: 2000, dll: 1000, lock_at: 50100, ...(c.plan || {}) };
  c.sizing = { risk_usd: 800, ref_stop: 20, max_micros: 40, mode: 'normal', fast_ref_stop: 40, safe_cap: 0.6, wk_stop: [2, 0.5], ...c.sizing };
  c.litRules = { window: [[120, 930]], flat_mod: 955, max_per_day: 1, min_stop: 8, max_stop: 80, min_rr: 1.5, max_rr: 8, be_r: 1, depth: 0.5, disp: 0.8, limit_min: 30, cisd1m_bars: 20, ...c.litRules };
  c.boxesDef = (c.boxes && c.boxes.length ? c.boxes : DEF_BOXES);
  const ses = sessionOf(c.now);
  c.S = ses.S; c.day = ses.date; c.closed = ses.closed;
  c.price = N(c.price, c.bars.length ? c.bars[c.bars.length - 1][4] : NaN);
  c.atr = atr5(c.bars);
  c.dayTrades = c.ledger.filter((v) => v.day === c.day);
  return c;
}
// 5m ATR(14), the same smoothing as engine/lit.py atr()
function atr5(bars) {
  if (!bars || bars.length < 3) return NaN;
  let a = bars[0][2] - bars[0][3];
  for (let i = 1; i < bars.length; i++) { const [, , h, l] = bars[i], pc = bars[i - 1][4], tr = Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc)); a += (tr - a) / 14; }
  return a;
}
const inMin = (m, a, b) => (a <= b ? m >= a && m < b : m >= a || m < b);
const inWin = (C, m) => (C.litRules.window || []).some(([a, b]) => inMin(m, a, b));

// ------------------------------------------------------------------ levels: session boxes + every untaken level
// taken: from the live loop's full untaken list when the state has it, else from the 5m bars since the box ended
export function levels(C) {
  const rows = [], seen = new Set(), P = C.price, bars = C.bars || [];
  const add = (r) => {
    if (!ok(r.price)) return;
    const twin = rows.find((x) => x.side === r.side && Math.abs(x.price - r.price) < 0.13 && !x.target === !r.target);
    if (twin) { if (!twin.label.split(' · ').includes(r.label)) twin.label += ' · ' + r.label; twin.strength = Math.max(twin.strength, r.strength); twin.taken = twin.taken && r.taken; return; }
    rows.push(r);
  };
  const untaken = (C.levels || []).filter((l) => ok(l.price));
  const inList = (p, side) => untaken.some((l) => Math.abs(l.price - p) < 0.13 && (!l.side || l.side === side));
  const takenByBars = (p, side, from) => { let at = null; for (const b of bars) { if (b[0] < from) continue; if (side === 'H' ? b[2] >= p : b[3] <= p) { at = b[0]; break; } } return at; };
  const sess = C.session || {};
  for (const B of C.boxesDef) {
    if (B.kind === 'rth') continue;
    const v = sess[B.label] || sess[B.key] || (B.key === 'lon23' ? sess['Frankfurt 02-03'] || sess['Frankfurt'] : null);
    if (!v || !ok(v[0])) continue;
    const end = C.S + (((B.b - 1080) % 1440 + 1440) % 1440) * 60;
    for (const [side, p] of [['H', +v[0]], ['L', +v[1]]]) {
      const at = takenByBars(p, side, end), taken = C.levelsFull ? !inList(p, side) : at != null;
      add({ label: `${short(B.label)} ${side === 'H' ? 'high' : 'low'}`, price: p, side, kind: B.kind, strength: 2, taken, takenAt: taken ? at : null, box: B.key });
    }
  }
  if (sess['Prev day']) for (const [side, p] of [['H', +sess['Prev day'][0]], ['L', +sess['Prev day'][1]]]) {
    const at = takenByBars(p, side, C.S), taken = C.levelsFull ? !inList(p, side) : at != null;
    add({ label: side === 'H' ? 'PDH' : 'PDL', price: p, side, kind: 'pd', strength: 3, taken, takenAt: taken ? at : null });
  }
  for (const l of untaken) {
    const vix = /vix/i.test(l.label || '') || l.kind === 'vix';
    add({ label: vix ? `VIX band ${l.side === 'H' ? 'up' : 'down'} (target)` : l.label || (l.side === 'H' ? 'high' : 'low'), price: +l.price, side: l.side || (l.price > P ? 'H' : 'L'),
      kind: vix ? 'vix' : l.kind || 'level', strength: N(l.strength, 1), taken: false, target: vix });
  }
  const depth = (C.litRules.depth || 0.5) * (ok(C.atr) ? C.atr : NaN);
  for (const r of rows) {
    r.dist = ok(P) ? r.price - P : NaN;
    r.usd = ok(r.dist) ? Math.abs(r.dist) * PV : NaN;
    r.above = ok(r.dist) ? r.dist > 0 : r.side === 'H';
    r.sweepAt = !r.target && !r.taken && ok(depth) ? r.price + (r.side === 'H' ? depth : -depth) : NaN;   // LIT counts a sweep >= 0.5 ATR beyond it
  }
  rows.sort((a, b) => b.price - a.price);
  const live = rows.filter((r) => !r.taken && !r.target && ok(r.dist));
  const up = live.filter((r) => r.dist > 0).sort((a, b) => a.dist - b.dist)[0], dn = live.filter((r) => r.dist < 0).sort((a, b) => b.dist - a.dist)[0];
  if (up) up.nearest = true; if (dn) dn.nearest = true;
  return rows;
}

// ------------------------------------------------------------------ the setup tracker
export const RAIL = ['Levels', 'Sweep', 'Inducement', 'Displacement', '5m CISD', 'Limit', '1m CISD', 'In trade', 'Done'];
const RAIL_D = ['session highs / lows, PDH/PDL, weekly, monthly, gaps, equal highs / lows', 'price takes a level by 0.5 ATR or more',
  'a swing taken first (within 1 ATR, 36 bars)', 'a body of 0.8 ATR or more away from the sweep', 'a 5m close through the CISD level: the signal',
  'limit order at the CISD level for 30 min', 'after the limit is touched: a 1m CISD within 20 bars, enter next 1m open', 'stop beyond the sweep, BE at 1R, target the VIX band',
  '1 trade a day; flat by 15:55'];
export function rail(C) {
  const sig = (C.lit?.signals_today || []).slice(-1)[0] || null, setups = Object.entries(C.setups || {}), pos = C.position;
  const L = levels(C), takenToday = L.filter((r) => r.taken && r.takenAt && r.takenAt >= C.S && inWin(C, et(r.takenAt).min));
  const done = C.dayTrades.length >= (C.litRules.max_per_day || 1) || /done for today/i.test(C.model_state || '');
  const ms = String(C.model_state || '');
  let idx = 0, why = 'watching the levels';
  if (pos) { idx = 7; why = 'in a trade'; }
  else if (done) { idx = 8; why = 'done for today'; }
  else if (setups.length && setups[0][1].tapped_t) { idx = 6; why = 'limit touched, waiting for a 1m CISD'; }
  else if (setups.length || /limit armed/i.test(ms)) { idx = 5; why = 'limit order waiting'; }
  else if (takenToday.length) { idx = 1; why = `${takenToday.map((r) => r.label).slice(0, 2).join(', ')} taken: waiting for inducement, displacement and a 5m CISD`; }
  const closed = C.closed || /market closed/i.test(ms), m = et(C.now).min, live = !closed && C.last_run && C.now - C.last_run < 2400;
  const desc = RAIL_D.slice();
  if (setups.length) { const [side, s] = setups[0]; desc[5] = `${side.toUpperCase()} limit ${px(s.limit)} until ${hm(et(s.expires_t).min)} ET`; }
  if (pos) desc[7] = `${pos.dir === 1 ? 'LONG' : 'SHORT'} ${px(pos.entry)} · stop ${px(pos.stop)}${pos.be ? ' (BE)' : ''} · target ${px(pos.target)}`;
  return { steps: RAIL, idx: closed && !pos ? -1 : idx, why: closed && !pos ? 'market closed' : why, desc, live, killzone: inWin(C, m) && !closed, sig, setup: setups[0] || null, pos, takenToday, closed };
}
export const railData = (C) => { const R = rail(C); return { steps: ['Levels', 'Sweep', 'Confirm', 'Limit', '1m CISD', 'Trade', 'Done'], idx: R.idx < 0 ? -1 : [0, 1, 2, 2, 2, 3, 4, 5, 6][R.idx], live: !!R.live, killzone: R.killzone,
  desc: [RAIL_D[0], R.idx === 1 ? R.why : RAIL_D[1], 'inducement + displacement + 5m CISD (one 5m close)', R.desc[5], RAIL_D[6], R.desc[7], RAIL_D[8]], zone: 'entry window',
  idle: R.closed ? 'market closed · the LIT day opens 18:00 ET' : R.killzone ? 'watching every LIT level for a sweep' : 'entries 02:00-15:30 ET' }; };
export function railHTML(C) {
  css();
  const R = rail(C), P = C.price;
  const step = (t, i) => `<li class="${R.idx < 0 ? '' : i < R.idx ? 'done' : i === R.idx ? 'on' : ''}"><i>${i < R.idx && R.idx >= 0 ? '✓' : i + 1}</i><b>${t}</b><span>${esc(R.desc[i])}</span></li>`;
  let detail = '';
  if (R.pos) {
    const p = R.pos, d = p.dir === 1 ? 1 : -1, risk = Math.abs(p.entry - (p.stop0 ?? p.stop)), r = ok(P) ? d * (P - p.entry) / (risk || 1) : N(p.unrealized_r);
    detail = kv([['Side', p.dir === 1 ? 'LONG' : 'SHORT'], ['Entry', px(p.entry)], ['Stop', `${px(p.stop)}${p.be ? ' · BE' : ''}`], ['Target', `${px(p.target)}${p.target_label ? ' · ' + esc(p.target_label) : ''}`],
      ['Now', `<span class="${cls(r)}">${spts(r, 2)}R</span>`], ['To target', ok(P) ? `${Math.abs(p.target - P).toFixed(1)} pts` : '—'], ['To stop', ok(P) ? `${Math.abs(P - p.stop).toFixed(1)} pts` : '—'],
      ['Open P&L', `<span class="${cls(p.unrealized)}">${susd(p.unrealized)}</span>`]]);
  } else if (R.setup) {
    const [side, s] = R.setup, left = N(s.expires_t) - C.now;
    detail = kv([['Setup', `${side.toUpperCase()} · swept ${esc((s.pools || []).join(', ') || '—')}`], ['Limit', `${px(s.limit)}${ok(P) ? ` <em>${spts(s.limit - P)} pts</em>` : ''}`],
      ['Stop', `${px(s.stop)} <em>${ok(s.limit) && ok(s.stop) ? Math.abs(s.limit - s.stop).toFixed(2) + ' pts' : ''}</em>`], ['Target', px(s.target)],
      ['Waiting for', esc(s.waiting || (s.tapped_t ? '1m CISD' : 'limit fill'))], ['Expires', ok(s.expires_t) ? `${hm(et(s.expires_t).min)} ET${left > 0 ? ` · in <span data-cd="${s.expires_t}">${cd(left)}</span>` : ''}` : '—']]);
  } else if (R.sig) {
    const s = R.sig; detail = kv([['Last signal', `${s.dir === 1 ? 'LONG' : 'SHORT'} ${hm(et(s.t).min)} ET`], ['Limit', px(s.limit_px)], ['Stop', px(s.stop_px)], ['Target', `${px(s.target_px)}${ok(s.rr) ? ` · ${(+s.rr).toFixed(1)}R` : ''}`]]);
  } else if (R.takenToday.length) {
    detail = kv(R.takenToday.slice(0, 4).map((r) => [esc(r.label), `${px(r.price)} <em>taken ${hm(et(r.takenAt).min)}</em>`]));
  } else {
    const L = levels(C).filter((r) => r.nearest);
    detail = L.length ? kv(L.map((r) => [`Nearest ${r.above ? 'above' : 'below'}`, `${esc(r.label)} ${px(r.price)} <em>${spts(r.dist)} pts · sweep at ${px(r.sweepAt)}</em>`])) : '';
  }
  return `<div class="lk lk-rail"><div class="lk-why"><span class="lk-dot ${R.live ? 'on' : ''}"></span><b>${esc(R.why)}</b>${R.killzone ? '<em class="lk-pill on">entry window open</em>' : '<em class="lk-pill">outside the entry window</em>'}</div>
    <ol class="lk-steps">${RAIL.map(step).join('')}</ol>${detail ? `<div class="lk-detail">${detail}</div>` : ''}</div>`;
}
const kv = (rows) => `<div class="lk-kv">${rows.map(([k, v]) => `<div><span>${k}</span><b>${v}</b></div>`).join('')}</div>`;

// ------------------------------------------------------------------ levels board
const nameShort = (l) => { const p = String(l).split(' · '); return p.length > 2 ? `${p[0]} · ${p[1]} +${p.length - 2}` : l; };
export function levelsHTML(C, { max = 14 } = {}) {
  css();
  const L = levels(C), P = C.price, mic = sizeNow(C);
  if (!L.length) return `<div class="lk lk-empty">No LIT levels yet. They appear once the cloud bot has run this session.</div>`;
  const above = L.filter((r) => r.above), below = L.filter((r) => !r.above);
  const pick = (arr, near) => arr.sort((a, b) => Math.abs(a.dist) - Math.abs(b.dist)).slice(0, Math.ceil(max / 2)).sort((a, b) => b.price - a.price);
  const stTxt = (r) => r.target ? 'target' : r.taken ? `taken${r.takenAt ? ' ' + hm(et(r.takenAt).min) : ''}` : ok(r.sweepAt) ? `sweep ${r.side === 'H' ? '≥' : '≤'} ${px(r.sweepAt)}` : 'untaken';
  const row = (r) => `<tr class="${r.taken ? 'lk-tk' : ''}${r.nearest ? ' lk-near' : ''}${r.target ? ' lk-tgt' : ''}"><td class="lk-lbl"><i class="lk-sw ${r.side === 'H' ? 'h' : 'l'}${r.target ? ' v' : ''}"></i><span title="${esc(r.label)}">${esc(nameShort(r.label))}</span>${r.nearest ? ' <em class="lk-pill on">next</em>' : ''}<small>${stTxt(r)}</small></td>
    <td class="lk-n">${px(r.price)}</td><td class="lk-n ${r.above ? 'lk-up' : 'lk-dn'}">${ok(r.dist) ? spts(r.dist) : '—'}</td><td class="lk-n lk-hs">${ok(r.usd) ? usd(r.usd) : '—'}</td>
    <td class="lk-n lk-hs">${mic.m && ok(r.usd) ? usd(r.usd * mic.m) : '—'}</td><td class="lk-stc lk-hs">${stTxt(r)}</td></tr>`;
  return `<div class="lk lk-lv"><div class="lk-tw"><table><thead><tr><th>Level</th><th class="lk-n">Price</th><th class="lk-n">Pts</th><th class="lk-n lk-hs">$ / MNQ</th><th class="lk-n lk-hs">$ at ${mic.m || 0}</th><th class="lk-hs">State</th></tr></thead>
    <tbody>${pick(above).map(row).join('')}<tr class="lk-pxr"><td colspan="6"><b>NQ ${px(P)}</b> <span>${ok(C.atr) ? `5m ATR ${C.atr.toFixed(1)} pts · a sweep needs ${(C.litRules.depth * C.atr).toFixed(1)} pts beyond a level` : ''}</span></td></tr>${pick(below).map(row).join('')}</tbody></table></div>
    <p class="lk-note">$ / MNQ = distance × $2 for one micro. “$ at ${mic.m || 0}” = the move at today’s size for a ${C.stats?.spans?.['2026']?.med_stop ?? 46}-pt stop (${mic.m || 0} micros${mic.mult < 1 ? ', weekly stop: half size' : ''}). LIT trades only when a level is swept, then waits for inducement, displacement and a 5m CISD.${C.levelsFull ? '' : ' Taken = traded through since the box closed (5m bars).'}</p></div>`;
}

// ------------------------------------------------------------------ sizing (engine/lit.py qty_for + the switches)
export function micros(C, stop, { mode = C.sizing.mode, mult = 1, room = null } = {}) {
  const Z = C.sizing, ref = mode === 'fast_eval' ? Z.fast_ref_stop : mode === 'eval' ? (Z.eval_ref_stop ?? 25) : Z.ref_stop, budget = stop <= ref ? Z.risk_usd : Z.risk_usd * ref / stop;
  let m = Math.max(0, Math.min(Z.max_micros, Math.floor(budget / (stop * PV) + 1e-9)));
  if ((mode === 'safe_eval' || mode === 'eval') && ok(room) && m >= 1) m = Math.max(1, Math.min(m, Math.floor(Z.safe_cap * room / (stop * PV))));
  if (mult < 1 && m >= 1) m = Math.max(1, Math.floor(m * mult));
  return { m, budget, usd: m * stop * PV, ref };
}
// two_week (engine/sizing.py two_week_qty, same numbers): one winner passes, capped at room_f of the room and a full stop
// inside the soft daily loss; at least 1, at most max_micros. st = { profit (eval profit now, $), cum (today's closed $), room }
const TW = { COMM: 1.9, SLIP: 0.25, DSLIP: 0.5 };
export function twQty(C, stop, tgt, st) {
  const c = { need_buf: 1, room_f: 0.6, dll_cap: true, stop_at_target: true, ...(C.sizing.two_week || {}) }, P = C.plan, maxq = C.sizing.max_micros || 40;
  const need = P.target - N(st.profit, 0), risk1 = (stop + TW.SLIP) * PV + TW.COMM;
  if (c.stop_at_target && need <= 0) return { m: 0, why: 'target reached: no new trade', need, usd: 0, risk: 0, win: 0 };
  let m = Math.max(1, Math.ceil(need * (c.need_buf || 1) / (tgt * PV - TW.COMM) - 1e-9)), why = `one winner passes: ${m} micros cover ${usd(need)}`;
  const caps = [];
  if (c.max_usd) caps.push([Math.floor(c.max_usd / risk1), `max ${usd(c.max_usd)} a trade`]);
  if (c.room_f && ok(st.room)) caps.push([Math.floor(c.room_f * Math.max(0, st.room) / (stop * PV)), `${Math.round(c.room_f * 100)}% of the ${usd(st.room)} room`]);
  if (c.dll_cap) caps.push([Math.floor(Math.max(0, P.dll + N(st.cum, 0)) / ((stop + TW.DSLIP) * PV + TW.COMM)), `${usd(P.dll)} soft daily loss`]);
  for (const [cap, lab] of caps) if (cap < m) { m = Math.max(1, cap); why = lab; }
  if (m > maxq) { m = maxq; why = `max ${maxq} micros`; }
  return { m, why, need, usd: m * stop * PV, risk: m * risk1, win: m * (tgt * PV - TW.COMM) };
}
// the mode that sizes the next trade: two_week until session two_week_until, then after_mode (owner 2026-10-18: no reset)
export function modeNow(C) {
  const Z = C.sizing, ses = N(C.eval2wk?.session, NaN);
  if (Z.mode === 'two_week' && Z.two_week_until && ok(ses) && ses > Z.two_week_until) return { mode: Z.after_mode || 'eval', after: true, session: ses };
  return { mode: Z.mode, after: false, session: ok(ses) ? ses : null };
}
export const modeLabel = (m) => ({ two_week: 'two-week eval', fast_eval: 'fast eval', safe_eval: 'safe eval', eval: 'eval', normal: 'normal', funded: 'funded' }[m] || m);
// eval numbers: the cloud's eval (the prior P&L is already in it), else the plan start + lit_sizing.eval_prior_pnl
function evalNums(C) {
  const P = C.plan, ev = C.eval || {}, prior = ok(ev.balance) ? 0 : N(C.sizing.eval_prior_pnl, 0);
  const bal = N(ev.balance, P.start + prior), floor = N(ev.trailing_mll, P.start - P.mll);
  return { bal, floor, profit: ok(ev.profit) ? +ev.profit : bal - P.start, room: bal - floor };
}
function sizeNow(C, stop) {
  const st = stop ?? N(C.stats?.spans?.['2026']?.med_stop, 46), wk = C.rules?.weekly_stop, M = modeNow(C), E = evalNums(C);
  if (M.mode === 'two_week') {
    // target distance: today's setup if there is one, else the typical winner (2026 H2 average winner R x the stop)
    const sig = (C.lit?.signals_today || []).slice(-1)[0], S = C.stats?.spans || {};
    const tgt = stop == null && sig && ok(sig.limit_px) && ok(sig.target_px) ? Math.abs(sig.target_px - sig.limit_px) : st * N((S.H2 || S['2026'] || {}).avg_win_r, 3.4);
    const cum = C.dayTrades.reduce((s, v) => s + N(v.usd, 0), 0);
    const z = twQty(C, st, tgt, { profit: E.profit, cum, room: E.room });
    return { ...z, stop: st, tgt, mult: 1, mode: M.mode, tw: true };
  }
  const mult = wk && N(wk.mult, 1) < 1 ? +wk.mult : 1;
  return { ...micros(C, st, { mode: M.mode, mult, room: E.room }), stop: st, mult, mode: M.mode };
}

// ------------------------------------------------------------------ eval cockpit
export function cockpit(C) {
  const P = C.plan, E0 = evalNums(C), bal = E0.bal, floor = E0.floor, target = P.start + P.target;
  const locked = floor >= P.lock_at - 0.5, cushion = bal - floor, toTarget = Math.max(0, target - bal);
  const dayPnl = C.dayTrades.reduce((s, v) => s + N(v.usd, 0), 0) + N(C.position?.unrealized, 0);
  const dllLeft = P.dll ? P.dll + Math.min(0, dayPnl) : null;
  const S = C.stats?.spans || {}, st = S.H2 || S['2026'] || {}, z = sizeNow(C), cost = 1.9 * z.m;
  const lossFull = z.tw ? z.risk : z.usd + cost, winTyp = z.tw ? z.win : N(st.avg_win_r, 3.4) * z.usd - cost;
  const wk = C.rules?.weekly_stop || null, mon = C.rules?.monday || null;
  const passed = bal >= target, failed = bal <= floor;
  return { bal, floor, target, locked, cushion, toTarget, dayPnl, dllLeft, z, lossFull, winTyp, wk, mon, passed, failed, st, mode: z.mode || C.sizing.mode, M: modeNow(C),
    afterLoss: { bal: bal - lossFull, cushion: cushion - lossFull, share: cushion > 0 ? lossFull / cushion : 1 },
    afterWin: { bal: bal + winTyp, toTarget: Math.max(0, toTarget - winTyp) },
    lossesToFail: lossFull > 0 ? Math.max(0, Math.ceil(cushion / lossFull)) : null, winsToPass: winTyp > 0 ? Math.ceil(toTarget / winTyp) : null,
    progress: Math.max(0, Math.min(1, (bal - P.start) / P.target)), room: Math.max(0, Math.min(1, cushion / P.mll)) };
}
// forward odds from the current balance: resample 2026 sessions (H2 = Jul-Oct, the honest check half; '2026' = the year)
export function evalSim(C, { span = 'H2', n = 1500, sessions = 30, seed = 7 } = {}) {
  const days = (C.stats?.days || []).filter((d) => span === '2026' || d[0] > (C.stats?.h1_end || '2026-06-30'));
  if (days.length < 15) return null;
  const P = C.plan, ev = C.eval || {}, bal0 = N(ev.balance, P.start), floor0 = N(ev.trailing_mll, P.start - P.mll), target = P.start + P.target;
  let s = seed >>> 0 || 1; const R = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const res = [], paths = [], keep = Math.min(260, n);
  for (let i = 0; i < n; i++) {
    let b = bal0, f = floor0, hi = bal0, out = 'OPEN', k = 0; const path = i < keep ? [b] : null;
    for (k = 1; k <= sessions; k++) {
      const d = days[(R() * days.length) | 0];
      if (b + Math.min(0, d[2]) <= f) { b = f; out = 'FAIL'; path?.push(b); break; }
      b += d[1]; path?.push(Math.round(b));
      if (b >= target) { out = 'PASS'; break; }
      hi = Math.max(hi, b); if (f < P.lock_at) f = Math.min(P.lock_at, Math.max(f, hi - P.mll));
    }
    res.push([out, Math.min(k, sessions)]); if (path) paths.push({ days: path, result: out, days_n: path.length });
  }
  const sh = (f) => Math.round(res.filter(f).length / n * 1000) / 10;
  const passK = res.filter((r) => r[0] === 'PASS').map((r) => r[1]).sort((a, b) => a - b);
  return { span, n, sessions, days: days.length, start: bal0, floor: floor0, target,
    pass10: sh((r) => r[0] === 'PASS' && r[1] <= 10), fail10: sh((r) => r[0] === 'FAIL' && r[1] <= 10), pass15: sh((r) => r[0] === 'PASS' && r[1] <= 15),
    fail15: sh((r) => r[0] === 'FAIL' && r[1] <= 15), pass30: sh((r) => r[0] === 'PASS'), fail30: sh((r) => r[0] === 'FAIL'),
    med: passK.length ? passK[passK.length >> 1] : null, paths };
}
export const simPayload = (sim) => sim && ({ paths: sim.paths, start: sim.start, target: sim.target, maxLoss: Math.max(1, sim.start - sim.floor),
  prob: { pass_2w: sim.pass10, fail_2w: sim.fail10, pass_3w: sim.pass15, pass_4w: null, pass_6w: sim.pass30, open_60: null } });
export function cockpitHTML(C, sim = null) {
  css();
  const K = cockpit(C), P = C.plan, st = K.st || {};
  const gauge = (k, v, label, sub) => `<div class="lk-g ${k}"><div class="lk-gb"><i style="width:${(v * 100).toFixed(1)}%"></i></div><div class="lk-gl"><span>${label}</span><b>${sub}</b></div></div>`;
  const wk = K.wk, wkN = C.sizing.wk_stop?.[0] ?? 2, monTxt = K.mon?.text || (K.mon?.on ? 'Monday rule on (applies on Mondays)' : 'Monday rule off');
  const status = K.passed ? ['pass', 'PASSED'] : K.failed ? ['fail', 'FAILED'] : K.dllLeft != null && K.dllLeft <= 0 ? ['halt', 'DAY STOPPED'] : ['open', 'OPEN'];
  return `<div class="lk lk-ck">
    <div class="lk-ckh"><div><span class="lk-k">Balance · ${esc(P.name)} (paper)</span><b class="lk-big">${usd(K.bal)}</b><em class="${cls(K.bal - P.start)}">${susd(K.bal - P.start)} vs start</em></div><span class="lk-st ${status[0]}">${status[1]}</span></div>
    ${gauge('good', K.progress, `To the ${usd(P.target)} target`, `${usd(K.toTarget)} to go`)}
    ${gauge(K.room < 0.35 ? 'bad' : 'room', K.room, `Room above the floor ${usd(K.floor)}${K.locked ? ' (locked)' : ''}`, `${usd(K.cushion)} left`)}
    ${P.dll ? gauge(K.dllLeft != null && K.dllLeft < P.dll * 0.4 ? 'bad' : 'day', Math.max(0, K.dllLeft) / P.dll, `Today’s soft limit ${usd(-P.dll)}`, `${susd(K.dayPnl)} today · ${usd(Math.max(0, K.dllLeft))} left`) : ''}
    <div class="lk-kv lk-3">
      <div><span>Size now</span><b>${K.z.m || 0} micros</b><em>${K.z.stop}-pt stop · ${usd(K.z.tw ? K.z.risk : K.z.usd)} risk${K.z.tw ? ` · ${esc(K.z.why)}` : ''}${K.z.mult < 1 ? ' · half (weekly stop)' : ''}</em></div>
      <div><span>Weekly stop</span><b class="${wk && wk.mult < 1 ? 'lk-wn' : ''}">${wk ? `${wk.stops} of ${wk.after ?? wkN}` : `0 of ${wkN}`}</b><em>${wk && wk.mult < 1 ? 'half size for the rest of the week' : 'stop-outs this week · full size'}</em></div>
      <div><span>Sizing mode</span><b>${esc(modeLabel(K.mode))}</b><em>${K.mode === 'two_week' ? `one winner passes: micros so the target covers what is left, max ${Math.round((C.sizing.two_week?.room_f ?? 0.6) * 100)}% of the room, a full stop inside ${usd(P.dll)}/day${K.M.session ? ` · session ${K.M.session} of ${C.sizing.two_week_until || 10}` : ''}` : K.M.after ? `session ${K.M.session} &gt; ${C.sizing.two_week_until}: the eval goes on in ${esc(modeLabel(K.mode))} (no reset) · ` : ''}${K.mode === 'fast_eval' ? `$${C.sizing.risk_usd} up to a ${C.sizing.fast_ref_stop}-pt stop` : K.mode === 'eval' ? `$${C.sizing.risk_usd} up to a ${C.sizing.eval_ref_stop ?? 25}-pt stop, max ${Math.round(C.sizing.safe_cap * 100)}% of the room` : K.mode === 'safe_eval' ? `capped at ${Math.round(C.sizing.safe_cap * 100)}% of the room` : K.mode === 'two_week' ? '' : `$${C.sizing.risk_usd} up to a ${C.sizing.ref_stop}-pt stop`}</em></div>
    </div>
    <div class="lk-mon">${esc(monTxt)}</div>
    <div class="lk-wi"><div class="lk-wl"><span>One full stop-out</span><b class="lk-dn">${susd(-K.lossFull)}</b><em>balance ${usd(K.afterLoss.bal)} · uses ${pct(K.afterLoss.share * 100)} of the room · ${K.lossesToFail ?? '—'} in a row to fail</em></div>
      <div class="lk-ww"><span>One typical winner</span><b class="lk-up">${susd(K.winTyp)}</b><em>${K.z.tw ? `${Math.round(K.z.tgt)}-pt target (${num(K.z.tgt / K.z.stop, 1)}R) at ${K.z.m} micros` : ok(st.avg_win_r) ? st.avg_win_r + 'R (2026 H2 average winner)' : ''} · ${usd(K.afterWin.toTarget)} left · ${K.winsToPass ?? '—'} to pass</em></div></div>
    ${sim ? `<div class="lk-sim"><div class="lk-k">From this balance · ${sim.n.toLocaleString('en-US')} simulated evals (2026 ${sim.span === 'H2' ? 'H2, Jul-Oct' : 'sessions'} resampled)</div>
      <div class="lk-kv lk-4"><div><span>Pass in 2 weeks</span><b class="lk-up">${pct(sim.pass10)}</b></div><div><span>Fail in 2 weeks</span><b class="lk-dn">${pct(sim.fail10)}</b></div>
      <div><span>Pass in 3 weeks</span><b class="lk-up">${pct(sim.pass15)}</b></div><div><span>Median to pass</span><b>${sim.med != null ? sim.med + ' sessions' : '—'}</b></div></div>
      <p class="lk-note">Owner’s rule: decided within 2 weeks (10 sessions), passed within 3 (15). Each path draws real 2026 LIT sessions (P&amp;L and intraday low) at random, with the trailing floor and its lock at ${usd(P.lock_at)}. A model, not a promise: ${sim.days} sessions in the sample.</p></div>` : ''}
  </div>`;
}

// ------------------------------------------------------------------ the day: clock + "what happens next"
function boxesFor(C) {
  const sess = C.session || {}, L = levels(C);
  return C.boxesDef.map((B) => {
    const v = sess[B.label] || sess[B.key] || null, lh = L.find((r) => r.box === B.key && r.side === 'H'), ll = L.find((r) => r.box === B.key && r.side === 'L');
    return { key: B.key, label: short(B.label), a: B.a, b: B.b, kind: B.kind, hi: v ? +v[0] : null, lo: v ? +v[1] : null, hiTaken: !!lh?.taken, loTaken: !!ll?.taken };
  });
}
function newsToday(C) {
  const R = C.newsRules || { before_min: 15, after_min: 30 };
  return (C.news || []).filter((e) => ok(e.t) && e.t >= C.S && e.t < C.S + 86400).map((e) => ({ ...e, impact: ['high', 'medium', 'low'].includes(e.impact) ? e.impact : 'low',
    win: e.impact === 'high' ? [e.t - (R.before_min ?? 15) * 60, e.t + (R.after_min ?? 30) * 60] : null }));
}
export function clockData(C) {
  const ev = newsToday(C), pos = C.position;
  const trades = C.dayTrades.map((v) => ({ t: v.t, exit_t: v.exit_t, dir: /long/i.test(v.side) ? 1 : -1, pnl: N(v.usd, 0), r: N(v.R), exit: v.exit, side: v.side })).filter((x) => ok(x.t));
  if (pos && ok(pos.entry_t)) trades.push({ t: pos.entry_t, exit_t: null, dir: pos.dir, pnl: N(pos.unrealized, 0), r: N(pos.unrealized_r), open: true });
  const su = Object.entries(C.setups || {})[0];
  return { now: C.now, day: C.day, closed: C.closed, windows: C.litRules.window, flat: C.litRules.flat_mod, boxes: boxesFor(C), events: ev.map(({ win, ...e }) => e),
    blackouts: ev.filter((e) => e.win).map((e) => e.win), trades, setup: su ? { t: su[1].arm_t, expires_t: su[1].expires_t, dir: su[0] === 'long' ? 1 : -1, label: 'swept ' + (su[1].pools || []).join(', ') } : null,
    open18: C.lit?.open18 ?? null, vixMove: C.lit?.vix_move ?? null, done: !pos && (C.dayTrades.length >= (C.litRules.max_per_day || 1) || /done for today/i.test(C.model_state || '')) };
}
// the milestones of today with their state (past / now / next / later)
export function plan(C) {
  const W = C.litRules.window || [[120, 930]], rows = [], at = (m) => C.S + (((m - 1080) % 1440 + 1440) % 1440) * 60;
  const push = (t, label, kind, note = '', t1 = null) => rows.push({ t, t1, label, kind, note });
  push(at(1080), 'Globex open', 'open', ok(C.lit?.open18) ? `18:00 open ${px(C.lit.open18)}: the target band is anchored here` : 'the target band is anchored to this open');
  for (const B of C.boxesDef) if (B.kind !== 'rth') push(at(B.a), `${short(B.label)} box`, B.kind, `${hm(B.a)}-${hm(B.b)} ET: its high and low become levels`, at(B.b === 1440 ? 1439.99 : B.b));
  for (const [a, b] of W) { push(at(a), 'Entries open', 'window', `the bot may enter from ${hm(a)} ET (most LIT trades come 02:00-08:00)`); push(at(b), 'Entries close', 'window', `no new entries after ${hm(b)} ET`); }
  push(at(570), 'Cash open', 'rth', 'NYSE open: volatility spike');
  push(at(C.litRules.flat_mod), 'Flat', 'flat', `an open trade is closed at ${hm(C.litRules.flat_mod)} ET`);
  push(at(1020), 'Close', 'close', 'session over; the next opens 18:00 ET');
  for (const e of newsToday(C)) push(e.t, e.title, 'news', `${e.impact} impact USD event${e.impact === 'high' ? ': expect a fast move (LIT does not pause for news)' : ''}`);
  for (const v of C.dayTrades) if (ok(v.t)) push(v.t, `Trade: ${esc(v.side)} → ${esc(v.exit || '')}`, 'trade', `${spts(N(v.R), 2)}R · ${susd(v.usd)}`);
  if (C.position && ok(C.position.entry_t)) push(C.position.entry_t, `In ${C.position.dir === 1 ? 'LONG' : 'SHORT'}`, 'trade', `entry ${px(C.position.entry)} · stop ${px(C.position.stop)} · target ${px(C.position.target)}`);
  rows.sort((a, b) => a.t - b.t || (a.kind === 'open' ? -1 : 0));
  let nextSet = false;
  for (const r of rows) {
    const end = r.t1 || r.t;
    r.state = C.now >= end + (r.t1 ? 0 : 60) ? 'past' : C.now >= r.t && r.t1 ? 'now' : !nextSet ? (nextSet = true, 'next') : 'later';
  }
  return rows;
}
export function planHTML(C, { compact = false } = {}) {
  css();
  const rows = plan(C), K = { open: 'acc', asia: 'asia', london: 'lon', pre: 'pre', ny: 'ny', window: 'go', rth: 'acc', flat: 'bad', close: 'mut', news: 'news', trade: 'trade' };
  const list = compact ? rows.filter((r) => r.state !== 'past').slice(0, 5) : rows;
  return `<div class="lk lk-plan">${C.closed ? `<div class="lk-why"><span class="lk-dot"></span><b>Market closed · the next LIT day opens Sunday 18:00 ET</b><em class="lk-pill">in <span data-cd="${C.S}">${cd(C.S - C.now)}</span></em></div>` : ''}
    <ol>${list.map((r) => `<li class="${r.state} k-${K[r.kind] || 'mut'}"><time>${hm(et(r.t).min)}${r.t1 ? '<small>–' + hm(et(r.t1).min) + '</small>' : ''}</time><i></i><div><b>${r.label}</b>${r.state === 'next' ? `<em class="lk-pill on">in <span data-cd="${r.t}">${cd(r.t - C.now)}</span></em>` : r.state === 'now' ? '<em class="lk-pill on">now</em>' : ''}<span>${r.note}</span></div></li>`).join('')}</ol></div>`;
}
// 2D fallback of the day clock: an SVG dial (18:00 at the top) + the readout
export function clockSVG(C) {
  css();
  const D = clockData(C), cx = 120, cy = 120, tau = Math.PI * 2, T = (m) => (((m - 1080) % 1440 + 1440) % 1440) / 1440, tt = (t) => (t - C.S) / 86400;
  const arc = (r, a0, a1) => { if (a1 <= a0) a1 += 1; const p = (a) => [cx + r * Math.sin(a * tau), cy - r * Math.cos(a * tau)], [x0, y0] = p(a0), [x1, y1] = p(a1); return `M${x0.toFixed(1)} ${y0.toFixed(1)}A${r} ${r} 0 ${a1 - a0 > 0.5 ? 1 : 0} 1 ${x1.toFixed(1)} ${y1.toFixed(1)}`; };
  const KC = { asia: '#b49bff', london: '#67e8f9', pre: '#ffc777', ny: '#ffb27a', rth: 'var(--accent)' };
  let s = `<circle cx="${cx}" cy="${cy}" r="98" stroke="var(--surface-3)" stroke-width="16" fill="none"/><circle cx="${cx}" cy="${cy}" r="78" stroke="var(--surface-3)" stroke-width="8" fill="none"/>`;
  s += `<path d="${arc(98, 23 / 24, 0.99999)}" stroke="var(--bad)" stroke-opacity=".25" stroke-width="16" fill="none"/>`;
  for (const b of D.boxes) s += `<path d="${arc(b.kind === 'rth' || b.kind === 'pre' ? 92 : 98, T(b.a), T(b.b === 1440 ? 1439.99 : b.b))}" stroke="${KC[b.kind] || 'var(--ink-2)'}" stroke-width="${b.kind === 'rth' || b.kind === 'pre' ? 4 : 14}" stroke-opacity="${b.hiTaken && b.loTaken ? 0.35 : 0.9}" fill="none"/>`;
  for (const [a, b] of D.windows) s += `<path d="${arc(78, T(a), T(b))}" stroke="var(--good)" stroke-width="8" fill="none" stroke-opacity=".85"/>`;
  for (const [a, b] of D.blackouts) { const x = tt(a), y = tt(b); if (x >= 0 && x < 1) s += `<path d="${arc(78, x, Math.min(0.9999, y))}" stroke="#ff7ad9" stroke-width="10" fill="none"/>`; }
  for (const e of D.events) { const a = tt(e.t); if (a < 0 || a >= 1) continue; const r = 78, x = cx + r * Math.sin(a * tau), y = cy - r * Math.cos(a * tau); s += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${e.impact === 'high' ? 4.5 : 3}" fill="${e.impact === 'high' ? 'var(--bad)' : e.impact === 'medium' ? 'var(--warn)' : 'var(--ink-2)'}"/>`; }
  for (const x of D.trades) { const a0 = tt(x.t), a1 = x.exit_t ? tt(x.exit_t) : tt(C.now); if (a0 < 0 || a0 >= 1) continue; s += `<path d="${arc(64, a0, Math.max(a0 + 0.004, Math.min(0.9999, a1)))}" stroke="${x.open ? 'var(--accent-2)' : x.pnl >= 0 ? 'var(--good)' : 'var(--bad)'}" stroke-width="6" stroke-linecap="round" fill="none"/>`; }
  for (let h = 0; h < 24; h += 3) { const a = T(h * 60), x = cx + 114 * Math.sin(a * tau), y = cy - 114 * Math.cos(a * tau); s += `<text x="${x.toFixed(1)}" y="${(y + 3).toFixed(1)}" text-anchor="middle" font-size="9" font-weight="650" fill="var(--muted)" font-family="Inter, system-ui">${pad2(h)}</text>`; }
  const hand = C.closed ? 0 : Math.max(0, Math.min(0.99999, tt(C.now))), hx = cx + 106 * Math.sin(hand * tau), hy = cy - 106 * Math.cos(hand * tau);
  s += `<line x1="${cx}" y1="${cy}" x2="${hx.toFixed(1)}" y2="${hy.toFixed(1)}" stroke="var(--ink)" stroke-width="2" stroke-linecap="round"/><circle cx="${hx.toFixed(1)}" cy="${hy.toFixed(1)}" r="4" fill="var(--ink)"/><circle cx="${cx}" cy="${cy}" r="3" fill="var(--ink)"/>`;
  const P = plan(C), nx = P.find((r) => r.state === 'next'), m = et(C.now).min, open = !C.closed && inWin(C, m);
  return `<div class="lk lk-clock"><svg viewBox="0 0 240 240" role="img" aria-label="LIT day clock">${s}</svg>
    <div class="lk-cr"><span class="lk-k">LIT day · ${esc(C.day)}</span><b>${C.closed ? 'Closed' : phaseName(m)}</b><em class="lk-pill ${open ? 'on' : ''}">${C.closed ? 'weekend' : open ? 'entries open' : 'entries closed'}</em>
      ${nx ? `<span>next: <b>${nx.label}</b> ${hm(et(nx.t).min)} · in <b data-cd="${nx.t}">${cd(nx.t - C.now)}</b></span>` : ''}${ok(D.open18) ? `<span>18:00 open ${px(D.open18)}${ok(D.vixMove) ? ` · VIX band ±${Math.round(D.vixMove)} pts` : ''}</span>` : ''}</div></div>`;
}
const phaseName = (m) => (m >= 1080 || m < 120 ? 'Asia' : m < 300 ? 'London' : m < 570 ? 'Pre-market' : m < 690 ? 'NY AM' : m < 810 ? 'NY lunch' : m < 960 ? 'NY PM' : m < 1020 ? 'After hours' : 'Halt');

// ------------------------------------------------------------------ pre-session checklist
// 95 of LIT's 120 trades in 2026 entered 02:00-08:00 ET: the PC + NinjaTrader must be up from ~01:55 ET for real fills
export function ready(C) {
  const out = [], add = (st, label, note) => out.push({ st, label, note });
  const h = C.health || {}, pc = C.pc || {}, ev = cockpit(C), news = newsToday(C).filter((e) => e.impact === 'high');
  const age = C.last_run ? C.now - C.last_run : null;
  add(age == null ? 'bad' : age < 40 * 60 || C.closed ? 'ok' : 'warn', C.src === 'pc' ? 'Paper bot (this PC)' : 'Cloud paper bot', age == null ? 'no run yet' : `last run ${cd(age)} ago${C.closed ? ' (market closed)' : ''}`);
  add(h.error ? 'bad' : h.stale ? 'warn' : 'ok', 'Price feed', h.error ? String(h.error) : h.stale ? `stale · last bar ${h.last_bar || '?'}` : `fresh · last bar ${h.last_bar || '—'}${C.src === 'pc' ? '' : h.source === 'yahoo' ? ' (Yahoo NQ=F)' : ' (PC NinjaTrader bars)'}`);
  add(pc.present ? (pc.silent ? 'bad' : pc.running === false ? 'warn' : 'ok') : 'warn', 'PC bot + NinjaTrader', pc.present ? (pc.silent ? `silent for ${cd(pc.age_s || 0)}` : `${pc.adapter || 'paper'} · ${pc.running === false ? 'stopped' : 'running'}`)
    : 'no heartbeat: start the PC by 01:55 ET (most LIT entries come 02:00-08:00)');
  add(C.lit?.one_min_day === false ? 'warn' : 'ok', '1-minute bars', C.lit?.one_min_day === false ? 'today runs on 5m bars only (fewer, worse fills)' : 'LIT enters on a 1m CISD');
  add(ev.failed ? 'bad' : ev.passed ? 'ok' : ev.room < 0.35 ? 'warn' : 'ok', 'Eval room', ev.passed ? 'target reached' : `${usd(ev.cushion)} above the floor · ${usd(ev.toTarget)} to the target`);
  add(ev.dllLeft != null && ev.dllLeft <= 0 ? 'bad' : 'ok', 'Daily loss limit', ev.dllLeft == null ? 'none' : `${usd(Math.max(0, ev.dllLeft))} left today`);
  add(ev.wk && ev.wk.mult < 1 ? 'warn' : 'ok', 'Size', `${ev.z.m} micros on a ${ev.z.stop}-pt stop · mode ${modeLabel(ev.z.mode || C.sizing.mode)}${ev.wk && ev.wk.mult < 1 ? ' · weekly stop: half size' : ''}`);
  add(news.length ? 'warn' : 'ok', 'High-impact news', news.length ? news.map((e) => `${hm(et(e.t).min)} ${e.title}`).join(' · ') : 'none today');
  if (ev.mon?.today && ev.mon.today !== 'none') add('warn', 'Monday rule', ev.mon.text || '');
  return out;
}
export function readyHTML(C) {
  css();
  const R = ready(C), bad = R.filter((r) => r.st === 'bad').length, warn = R.filter((r) => r.st === 'warn').length;
  return `<div class="lk lk-ready"><div class="lk-why"><span class="lk-dot ${bad ? '' : 'on'}"></span><b>${bad ? `${bad} problem${bad > 1 ? 's' : ''}` : warn ? `ready, ${warn} to check` : 'all set'}</b></div>
    <ul>${R.map((r) => `<li class="${r.st}"><i>${r.st === 'ok' ? '✓' : r.st === 'warn' ? '!' : '✕'}</i><b>${esc(r.label)}</b><span>${esc(r.note)}</span></li>`).join('')}</ul></div>`;
}

// ------------------------------------------------------------------ the week planner
export function weekHTML(C) {
  css();
  const e = et(C.now), dow = e.dow > 4 ? (e.dow === 6 && e.min >= 1080 ? -1 : 5) : e.dow;
  const base = new Date(`${C.day}T12:00:00Z`); const d0 = (new Date(base).getUTCDay() + 6) % 7; base.setUTCDate(base.getUTCDate() - d0);
  const days = [0, 1, 2, 3, 4].map((i) => { const d = new Date(base); d.setUTCDate(d.getUTCDate() + i); return d.toISOString().slice(0, 10); });
  const wk = C.rules?.weekly_stop, mon = C.rules?.monday, n = C.ledger.filter((v) => days.includes(v.day)).length;
  const cell = (date, i) => {
    const tr = C.ledger.filter((v) => v.day === date), usdD = tr.reduce((s, v) => s + N(v.usd, 0), 0), nd = (C.newsDays || []).find((x) => x.date === date);
    const ev = (C.news || []).filter((x) => x.date === date && x.impact !== 'low').slice(0, 3), state = date < C.day ? 'past' : date === C.day ? 'today' : 'fut';
    return `<div class="lk-day ${state}"><div class="lk-dh"><b>${['Mon', 'Tue', 'Wed', 'Thu', 'Fri'][i]} ${+date.slice(8)}</b>${tr.length ? `<em class="${cls(usdD)}">${susd(usdD)}</em>` : ''}</div>
      <div class="lk-dt">${tr.map((v) => `<i class="${N(v.usd, 0) > 0 ? 'w' : N(v.usd, 0) < 0 ? 'l' : ''}" title="${esc(v.side)} ${esc(v.exit)}"></i>`).join('') || (state === 'past' ? '<span>no trade</span>' : '')}</div>
      ${ev.map((x) => `<div class="lk-ev ${x.impact}"><time>${esc(x.time_et || hm(et(x.t).min))}</time>${esc(x.title)}</div>`).join('')}
      ${i === 0 && mon?.on ? '<div class="lk-ev rule">Monday rule day</div>' : ''}${nd?.holiday ? '<div class="lk-ev rule">holiday hours</div>' : ''}</div>`;
  };
  const [lo, hi] = [2, 4];
  return `<div class="lk lk-wk"><div class="lk-why"><b>${n} of ${lo}-${hi} trades this week</b><em class="lk-pill ${n >= lo ? 'on' : ''}">${n >= lo && n <= hi ? 'on target' : n > hi ? 'above the usual' : `${lo - n} to go`}</em>
      ${wk ? `<em class="lk-pill ${wk.mult < 1 ? 'wn' : ''}">weekly stop ${wk.stops}/${wk.after ?? 2}${wk.mult < 1 ? ' · half size' : ''}</em>` : ''}</div>
    <div class="lk-days">${days.map(cell).join('')}</div><p class="lk-note">Medium and high impact USD events per day (ET). LIT does not pause for news, but its stops sit beyond the sweep, so a release can move price to the target or the stop fast.${dow === 5 || dow < 0 ? ' Weekend: the next week starts Sunday 18:00 ET.' : ''}</p></div>`;
}

// ------------------------------------------------------------------ LIT trade replay overlays (3D candles)
// t = a replay trade (research/lab/backtest_live.json trades: entry, stop, target, sweep_ext, cisd_level, pools, side)
export function replay3d(t, { iSweep = -1, iEntry = 0, iExit = -1 } = {}) {
  const marks = [], zones = [], e = N(t.entry), st = N(t.stop), tg = N(t.target);
  if (iSweep >= 0 && ok(t.sweep_ext)) marks.push({ p: +t.sweep_ext, color: '#ff9b5c', label: `sweep ${px(t.sweep_ext)}${t.pools?.length ? ' · ' + t.pools.slice(0, 2).join(', ') : ''}`, i: Math.max(0, iSweep - 8), from: iSweep });
  if (ok(t.cisd_level)) marks.push({ p: +t.cisd_level, color: '#c084fc', label: `CISD ${px(t.cisd_level)}`, i: Math.max(0, (iSweep >= 0 ? iSweep : iEntry) - 2), from: iSweep >= 0 ? iSweep : iEntry });
  if (ok(e)) {
    marks.push({ p: e, color: '#8fa0ff', label: `entry ${px(e)}${t.entry_kind ? ' · ' + t.entry_kind : ''}`, i: iEntry, from: iEntry });
    const to = iExit >= 0 ? iExit : undefined;
    if (ok(st)) zones.push({ a: e, b: st, from: iEntry, to, color: '#ff5a7a', label: `risk ${Math.abs(e - st).toFixed(1)} pts` });
    if (ok(tg)) zones.push({ a: e, b: tg, from: iEntry, to, color: '#2ee59d', label: `reward ${ok(t.plan_rr) ? (+t.plan_rr).toFixed(1) + 'R' : Math.abs(tg - e).toFixed(0) + ' pts'}` });
    if (ok(st)) marks.push({ p: st, color: '#ff5a7a', label: `stop ${px(st)}`, i: iEntry, from: iEntry });
    if (ok(tg)) marks.push({ p: tg, color: '#2ee59d', label: `target ${px(tg)}${t.target_label ? ' · ' + t.target_label : ''}`, i: iEntry, from: iEntry });
  }
  return { marks, zones, windows: [[120, 930]] };
}

// ------------------------------------------------------------------ CSS
let _css = false;
export function css() {
  if (_css || typeof document === 'undefined') return; _css = true;
  const s = document.createElement('style'); s.id = 'litkit-css';
  s.textContent = `.lk{--lk-asia:#b49bff;--lk-lon:#67e8f9;--lk-pre:#ffc777;--lk-ny:#ffb27a;font-variant-numeric:tabular-nums;min-width:0}
.lk-up{color:var(--good-ink,var(--good))}.lk-dn{color:var(--bad)}.lk-wn{color:var(--warn)}
.lk-k{display:block;font-size:10.5px;font-weight:650;letter-spacing:.1em;text-transform:uppercase;color:var(--muted)}
.lk-pill{display:inline-flex;align-items:center;gap:.3em;height:20px;padding:0 8px;border-radius:99px;font-style:normal;font-size:10.5px;font-weight:700;letter-spacing:.02em;color:var(--ink-2);border:1px solid var(--line);background:var(--surface-2);white-space:nowrap}
.lk-pill.on{color:var(--good-ink,var(--good));border-color:color-mix(in srgb,var(--good) 40%,transparent);background:color-mix(in srgb,var(--good) 10%,transparent)}
.lk-pill.wn{color:var(--warn);border-color:color-mix(in srgb,var(--warn) 40%,transparent)}
.lk-why{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin:0 0 12px}.lk-why b{font-weight:700}
.lk-dot{width:9px;height:9px;border-radius:50%;background:var(--muted);flex:none}.lk-dot.on{background:var(--good);box-shadow:0 0 0 4px color-mix(in srgb,var(--good) 22%,transparent)}
.lk-kv{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px}
.lk-kv>div{padding:9px 11px;border-radius:12px;background:var(--surface-2);border:1px solid var(--line);min-width:0}
.lk-kv>div>span{display:block;font-size:11px;color:var(--muted);margin-bottom:3px}.lk-kv b{display:block;font-weight:700;font-size:14px;overflow-wrap:anywhere}
.lk-kv em,.lk-kv b em{display:block;font-style:normal;font-size:11px;font-weight:500;color:var(--ink-2);margin-top:2px}
.lk-note{margin:10px 0 0;font-size:12px;line-height:1.5;color:var(--muted)}
.lk-empty{padding:18px;text-align:center;color:var(--muted);font-size:13px}
.lk-steps{list-style:none;margin:0 0 12px;padding:0;display:grid;grid-template-columns:repeat(9,minmax(0,1fr));gap:4px;counter-reset:s}
.lk-steps li{position:relative;padding:8px 4px 0;border-top:3px solid var(--surface-3);min-width:0}
.lk-steps li i{display:grid;place-items:center;width:20px;height:20px;border-radius:50%;margin-bottom:5px;font-style:normal;font-size:10px;font-weight:800;color:var(--muted);background:var(--surface-2);border:1px solid var(--line)}
.lk-steps li b{display:block;font-size:11px;font-weight:700;color:var(--ink-2);line-height:1.2}
.lk-steps li span{display:none;font-size:10.5px;color:var(--muted);line-height:1.35;margin-top:3px}
.lk-steps li.done{border-top-color:color-mix(in srgb,var(--good) 70%,transparent)}.lk-steps li.done i{background:color-mix(in srgb,var(--good) 22%,transparent);color:var(--good-ink,var(--good));border-color:transparent}
.lk-steps li.on{border-top-color:var(--accent)}.lk-steps li.on i{background:var(--accent);color:#fff;border-color:transparent;box-shadow:0 0 0 4px color-mix(in srgb,var(--accent) 25%,transparent)}
.lk-steps li.on b{color:var(--ink)}.lk-steps li.on span{display:block}
@media (max-width:760px){.lk-steps{grid-template-columns:1fr;gap:0}.lk-steps li{display:grid;grid-template-columns:26px 1fr;column-gap:8px;border-top:0;border-left:3px solid var(--surface-3);padding:6px 0 6px 8px}
  .lk-steps li i{grid-row:span 2;margin:0}.lk-steps li.done{border-left-color:color-mix(in srgb,var(--good) 70%,transparent)}.lk-steps li.on{border-left-color:var(--accent)}
  .lk-steps li:not(.on):not(.done) span{display:none}.lk-steps li span{grid-column:2}}
.lk-detail{margin-top:2px}.lk-detail em{display:inline!important;color:var(--muted)!important}
.lk-tw{overflow-x:auto;-webkit-overflow-scrolling:touch;margin:0 -2px}
.lk-lv table{width:100%;border-collapse:collapse;font-size:12.5px}
.lk-lv th{font-size:10.5px;font-weight:650;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);text-align:left;padding:6px 6px;border-bottom:1px solid var(--line)}
.lk-lv td{padding:7px 6px;border-bottom:1px solid var(--line);white-space:nowrap}.lk-lv td.lk-lbl{white-space:normal}.lk-lv td.lk-lbl small{display:none;font-size:10.5px;color:var(--muted);margin:2px 0 0 15px}.lk-lv .lk-n{text-align:right;font-family:var(--mono)}
.lk-lv tr.lk-tk td{color:var(--muted);text-decoration:line-through;text-decoration-color:color-mix(in srgb,var(--muted) 60%,transparent)}.lk-lv tr.lk-tk td.lk-stc{text-decoration:none}
.lk-lv tr.lk-near td{background:color-mix(in srgb,var(--accent) 7%,transparent)}.lk-lv tr.lk-tgt td{color:var(--good-ink,var(--good))}
.lk-lv td.lk-stc{font-size:11px;color:var(--ink-2)}
.lk-lv tr.lk-pxr td{background:var(--surface-2);font-size:12px;color:var(--ink-2);white-space:normal}.lk-lv tr.lk-pxr b{color:var(--ink);font-family:var(--mono);margin-right:8px}
.lk-sw{display:inline-block;width:8px;height:8px;border-radius:2px;margin-right:7px;vertical-align:0}.lk-sw.h{background:var(--bsl)}.lk-sw.l{background:var(--ssl)}.lk-sw.v{background:var(--good);border-radius:50%}
@media (max-width:560px){.lk-lv .lk-hs{display:none}.lk-lv td.lk-lbl small{display:block}.lk-lv tr.lk-tk td.lk-lbl small{text-decoration:none}}
.lk-ckh{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:14px}
.lk-big{display:block;font-size:30px;font-weight:800;letter-spacing:-.02em;margin:4px 0 2px}.lk-ckh em{font-style:normal;font-size:12px;font-weight:650}
.lk-st{padding:6px 12px;border-radius:10px;font-size:12px;font-weight:800;letter-spacing:.08em;border:1px solid var(--line)}
.lk-st.open{color:var(--accent-2);border-color:color-mix(in srgb,var(--accent-2) 40%,transparent)}.lk-st.pass{color:var(--gold,#f2c35b);border-color:currentColor}
.lk-st.fail{color:var(--bad);border-color:currentColor}.lk-st.halt{color:var(--warn);border-color:currentColor}
.lk-g{margin:0 0 12px}.lk-gb{height:8px;border-radius:99px;background:var(--surface-3);overflow:hidden}.lk-gb i{display:block;height:100%;border-radius:99px;background:var(--accent);transition:width .8s cubic-bezier(.2,.8,.2,1)}
.lk-g.good .lk-gb i{background:linear-gradient(90deg,color-mix(in srgb,var(--good) 55%,transparent),var(--good))}.lk-g.room .lk-gb i{background:linear-gradient(90deg,#8b5cf6,var(--accent-2))}
.lk-g.day .lk-gb i{background:linear-gradient(90deg,var(--warn),color-mix(in srgb,var(--warn) 60%,var(--good)))}.lk-g.bad .lk-gb i{background:var(--bad)}
.lk-gl{display:flex;justify-content:space-between;gap:10px;margin-top:5px;font-size:12px;color:var(--muted)}.lk-gl b{color:var(--ink);font-weight:700;white-space:nowrap}
.lk-3{grid-template-columns:repeat(auto-fit,minmax(150px,1fr));margin-top:4px}.lk-4{grid-template-columns:repeat(auto-fit,minmax(110px,1fr))}
.lk-mon{margin:10px 0 0;padding:8px 11px;border-radius:10px;font-size:12px;color:var(--ink-2);background:var(--surface-2);border:1px dashed var(--line)}
.lk-wi{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}.lk-wi>div{padding:10px 12px;border-radius:12px;border:1px solid var(--line)}
.lk-wl{background:color-mix(in srgb,var(--bad) 7%,transparent)}.lk-ww{background:color-mix(in srgb,var(--good) 7%,transparent)}
.lk-wi span{display:block;font-size:11px;color:var(--muted)}.lk-wi b{display:block;font-size:18px;font-weight:800;margin:2px 0}.lk-wi em{display:block;font-style:normal;font-size:11.5px;color:var(--ink-2);line-height:1.4}
@media (max-width:420px){.lk-wi{grid-template-columns:1fr}}
.lk-sim{margin-top:14px;padding-top:12px;border-top:1px solid var(--line)}.lk-sim .lk-k{margin-bottom:8px}
.lk-plan ol{list-style:none;margin:0;padding:0}
.lk-plan li{display:grid;grid-template-columns:54px 14px 1fr;gap:0 8px;align-items:start;padding:7px 0;position:relative}
.lk-plan li time{font-family:var(--mono);font-size:12px;font-weight:650;color:var(--ink-2);text-align:right;line-height:1.25}.lk-plan li time small{display:block;font-size:10px;color:var(--muted)}
.lk-plan li>i{width:10px;height:10px;border-radius:50%;margin-top:3px;background:var(--c,var(--muted));box-shadow:0 0 0 3px color-mix(in srgb,var(--c,var(--muted)) 20%,transparent)}
.lk-plan li::before{content:'';position:absolute;left:66px;top:20px;bottom:-6px;width:2px;background:var(--line)}.lk-plan li:last-child::before{display:none}
.lk-plan li b{font-size:13px;font-weight:700;margin-right:6px}.lk-plan li span{display:block;font-size:11.5px;color:var(--muted);line-height:1.4;margin-top:1px}
.lk-plan li.past{opacity:.5}.lk-plan li.next b,.lk-plan li.now b{color:var(--ink)}.lk-plan li.next>i,.lk-plan li.now>i{animation:lkp 1.6s ease-in-out infinite}
@keyframes lkp{50%{box-shadow:0 0 0 7px color-mix(in srgb,var(--c,var(--accent)) 10%,transparent)}}
@media (prefers-reduced-motion:reduce){.lk-plan li>i{animation:none!important}}
.k-acc{--c:var(--accent)}.k-asia{--c:var(--lk-asia)}.k-lon{--c:var(--lk-lon)}.k-pre{--c:var(--lk-pre)}.k-ny{--c:var(--lk-ny)}.k-go{--c:var(--good)}.k-bad{--c:var(--bad)}.k-news{--c:#ff7ad9}.k-trade{--c:var(--accent-2)}.k-mut{--c:var(--muted)}
.lk-clock{display:grid;grid-template-columns:minmax(0,240px) 1fr;gap:14px;align-items:center}.lk-clock svg{width:100%;height:auto;max-width:240px;display:block;margin:0 auto}
.lk-cr{display:flex;flex-direction:column;gap:6px;align-items:flex-start;min-width:0}.lk-cr>b{font-size:24px;font-weight:800;letter-spacing:-.01em}.lk-cr>span{font-size:12.5px;color:var(--ink-2)}
@media (max-width:520px){.lk-clock{grid-template-columns:1fr}.lk-cr{align-items:center;text-align:center}}
.lk-days{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:6px}
.lk-day{padding:8px;border-radius:12px;background:var(--surface-2);border:1px solid var(--line);min-width:0;min-height:86px}
.lk-day.today{border-color:color-mix(in srgb,var(--accent) 55%,transparent);box-shadow:0 0 0 3px color-mix(in srgb,var(--accent) 12%,transparent)}.lk-day.past{opacity:.72}
.lk-dh{display:flex;justify-content:space-between;gap:4px;font-size:12px}.lk-dh em{font-style:normal;font-weight:700;font-size:11px}
.lk-dt{display:flex;gap:4px;min-height:14px;margin:6px 0}.lk-dt i{width:10px;height:10px;border-radius:50%;background:var(--ink-2)}.lk-dt i.w{background:var(--good)}.lk-dt i.l{background:var(--bad)}.lk-dt span{font-size:10.5px;color:var(--muted)}
.lk-ev{font-size:10.5px;line-height:1.3;color:var(--ink-2);margin-top:4px;overflow-wrap:anywhere}.lk-ev time{display:block;font-family:var(--mono);font-size:10px;color:var(--muted)}
.lk-ev.high{color:var(--bad)}.lk-ev.medium{color:var(--warn)}.lk-ev.rule{color:var(--accent-2);font-weight:650}
.lk-ready ul{list-style:none;margin:0;padding:0;display:grid;gap:6px}
.lk-ready li{display:grid;grid-template-columns:22px minmax(90px,150px) 1fr;gap:8px;align-items:baseline;padding:7px 10px;border-radius:10px;background:var(--surface-2);border:1px solid var(--line)}
.lk-ready li i{display:grid;place-items:center;width:18px;height:18px;border-radius:50%;font-style:normal;font-size:11px;font-weight:800;align-self:center}
.lk-ready li.ok i{background:color-mix(in srgb,var(--good) 22%,transparent);color:var(--good-ink,var(--good))}.lk-ready li.warn i{background:color-mix(in srgb,var(--warn) 22%,transparent);color:var(--warn)}
.lk-ready li.bad i{background:color-mix(in srgb,var(--bad) 22%,transparent);color:var(--bad)}.lk-ready li b{font-size:12.5px}.lk-ready li span{font-size:12px;color:var(--ink-2);min-width:0;overflow-wrap:anywhere}
@media (max-width:480px){.lk-ready li{grid-template-columns:22px 1fr}.lk-ready li span{grid-column:2}}
@media (max-width:560px){.lk-days{grid-template-columns:1fr}.lk-day{min-height:0;display:grid;grid-template-columns:70px 1fr;gap:2px 8px}.lk-dh{grid-row:span 3;flex-direction:column}.lk-dt{margin:0}}`;
  document.head.appendChild(s);
}

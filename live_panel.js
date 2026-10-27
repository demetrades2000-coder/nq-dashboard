// Live status panel for the phone app (tools/web_public/index.html: top of Today and of the Accounts eval section).
// Answers one question: is the PC bot trading the owner's eval right now? Big verdict badge (engine/accounts.verdict, made by
// the cloud monitor from the PC heartbeat's "health" block; the heartbeat age is re-checked here every 15 s), account name,
// LIVE / SIM, armed, feed + heartbeat age, the LIT stage stepper, setups seen today, last signal, orders today; the open
// trade on a full chart (tradechart.js, the cloud's recent 1m / 5m bars) with entry, stop now, target, breakeven, live P&L
// and time in trade; every closed trade of today with its chart. Read-only: nothing here places or changes an order.
//
//   import * as LP from './live_panel.js';  LP.mount(el, D, { where: 'today' | 'accounts', loadTC })

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ok = (v) => v != null && Number.isFinite(+v);
const num = (v, d = 2) => (ok(v) ? (+v).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }) : '—');
const susd = (v) => (ok(v) ? (v > 0 ? '+' : v < 0 ? '−' : '') + '$' + Math.round(Math.abs(v)).toLocaleString('en-US') : '—');
const fR = (v) => (ok(v) ? (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v).toFixed(2) + 'R' : '—');
const cls = (v) => (ok(v) ? (v > 0 ? 'up' : v < 0 ? 'dn' : '') : '');
const PV = 2;                                   // MNQ: $2 a point a micro
const STAGES = [['levels', 'Levels'], ['sweep', 'Sweep'], ['inducement', 'Inducement'], ['cisd', '5m CISD'], ['limit', 'Limit'], ['cisd1m', '1m CISD'], ['trade', 'In trade'], ['done', 'Done']];
const now_ = () => Date.now() / 1000;
function hm(t) {
  if (!ok(t)) return '—';
  try { return new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(t * 1000)); }
  catch { return new Date(t * 1000).toISOString().slice(11, 16); }
}
function etDay(t) {
  try {
    const f = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' });
    return f.format(new Date((t + 6 * 3600) * 1000));      // the trading day: 18:00 ET starts the next one
  } catch { return ''; }
}
export function dur(s) {
  if (!ok(s)) return '—';
  s = Math.max(0, Math.round(s));
  if (s < 90) return s + ' s';
  if (s < 5400) return Math.round(s / 60) + ' min';
  if (s < 172800) { const h = Math.floor(s / 3600), m = Math.round((s % 3600) / 60); return h + ' h' + (m ? ' ' + m + ' min' : ''); }
  return Math.round(s / 86400) + ' days';
}

// ------------------------------------------------------------------ verdict (the cloud's, with the heartbeat age re-checked now)
export function verdictNow(lv, now = now_()) {
  const pc = (lv && lv.pc) || {}, v = lv && lv.pc_verdict;
  const every = +pc.every_s || 300, age = ok(pc.t) && pc.t > 0 ? now - pc.t : null;
  if (!pc.present || age == null || age > Math.max(1200, 3 * every))
    return { code: 'SILENT', label: 'PC SILENT', level: 'bad', reason: age == null ? 'no heartbeat from the PC bot' : `the PC bot has not reported for ${dur(age)}`, hb_age: age };
  if (!v) return { code: 'OLD', label: "CAN'T CONFIRM", level: 'warn', reason: 'this build has no verdict yet (next cloud run)', hb_age: age };
  return { ...v, hb_age: age };
}

// ------------------------------------------------------------------ data helpers
const pcAcct = (D) => (D.accounts || []).find((a) => a.source === 'pc' && !a.error) || null;
const bars5 = (D) => (D.live && D.live.bars) || [];
const bars1 = (D) => (D.live && D.live.bars1) || [];
function lastPx(D, h) {
  const b1 = bars1(D), b5 = bars5(D);
  const t1 = b1.length ? b1[b1.length - 1][0] : 0, t5 = b5.length ? b5[b5.length - 1][0] : 0;
  const px = t1 >= t5 ? (b1.length ? b1[b1.length - 1][4] : null) : (b5.length ? b5[b5.length - 1][4] : null);
  return { px: ok(h?.lit?.price) && (h.t || 0) > Math.max(t1, t5) ? h.lit.price : px, t: Math.max(t1, t5) };
}
const toObj = (b) => ({ t: +b[0], o: +b[1], h: +b[2], l: +b[3], c: +b[4] });

// the open position as a trade dict for tradechart.fromTrade (+ stop now, breakeven, live P&L)
export function openTrade(D, now = now_()) {
  const a = pcAcct(D), p = a && a.position, h = D.live?.pc?.health;
  if (!p || !p.side || !ok(p.entry)) return null;
  const d = p.side === 'LONG' ? 1 : -1, stop0 = ok(p.stop0) ? +p.stop0 : +p.stop, risk = Math.abs(p.entry - stop0) || 1;
  const L = lastPx(D, h);
  const pnl = ok(p.unrealized) ? +p.unrealized : ok(L.px) ? (L.px - p.entry) * d * (p.qty || 0) * PV : null;
  const r = ok(p.unrealized_r) ? +p.unrealized_r : ok(L.px) ? (L.px - p.entry) * d / risk : null;
  return { day: D.live?.today, entry_t: +p.entry_t, side: p.side, dir: d, entry: +p.entry, stop: stop0, stop_now: ok(p.stop) ? +p.stop : stop0,
    target: +p.target, qty: p.qty, be: !!p.be, be_px: +p.entry, exit: null, pnl, r, px: L.px, px_t: L.t, since: now - +p.entry_t,
    target_label: p.target_label || '', risk_pts: Math.abs(p.entry - stop0), risk_usd: Math.abs(p.entry - stop0) * PV * (p.qty || 0), broker: p.broker || null };
}
export function todayClosed(D) {
  const a = pcAcct(D), today = D.live?.today;
  const pc = ((a && a.trades) || []).filter((t) => t.day === today && t.exit_t).map((t) => ({ ...t, src: 'eval' }));
  if (pc.length) return pc;
  return ((D.live && D.live.ledger) || []).filter((v) => v.day === today && v.entry_t && v.exit_ts && v.taken !== false)
    .map((v) => ({ day: v.day, entry_t: v.entry_t, exit_t: v.exit_ts, side: v.side, qty: v.qty, entry: v.entry_px, stop: v.stop_px, target: v.target_px,
      exit_px: v.exit_px, exit: v.exit, r: v.R, pnl: v.usd, risk_pts: v.risk_pts, src: 'paper' }));
}
const covers = (bars, t) => bars.length && ok(t) && bars[0][0] <= t && bars[bars.length - 1][0] >= t - 300;

// ------------------------------------------------------------------ HTML
function stepper(h) {
  const L = h?.lit || {}, i = L.stage === 'closed' ? -1 : ok(L.i) ? +L.i : 0;
  const sig = (L.setups_today || 0) > 0;
  return `<div class="lp-steps" role="list">${STAGES.map(([k, lab], j) => {
    const done = j < i || (sig && j >= 1 && j <= 3 && i >= 0), on = j === i;
    return `<span role="listitem" class="${on ? 'on' : done ? 'done' : ''}" title="${esc(lab)}"><i></i><em>${esc(lab)}</em></span>`; }).join('')}</div>`;
}
function feedLine(h, now) {
  const f = h?.feed || {}, src = f.used === 'ninjatrader' ? 'NinjaTrader' : f.no_yahoo ? 'NinjaTrader (stale: no new trades)' : f.source === 'ninjatrader' ? 'Yahoo (NinjaTrader missing)' : 'Yahoo';
  const age = ok(f.age_1m_s) ? f.age_1m_s : f.age_5m_s, tf = ok(f.age_1m_s) ? '1m' : '5m';
  const at = ok(h?.t) ? now - h.t : 0;
  return { src, tf, age: ok(age) ? age + at : null, bad: f.stale || f.fallback };
}
function kv(label, value, sub = '', k = '') { return `<div class="lp-kv"><span>${label}</span><b class="${k}">${value}</b>${sub ? `<em>${sub}</em>` : ''}</div>`; }

export function html(D, { where = 'today', now = now_() } = {}) {
  const lv = D.live || {}, pc = lv.pc || {}, h = pc.health && !pc.health.error ? pc.health : null, v = verdictNow(lv, now);
  const a = h?.account || {}, fl = feedLine(h, now), L = h?.lit || {}, O = h?.orders || {}, P = h?.poll || {}, nt = h?.nt || {};
  const icon = v.level === 'good' ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.2 4.2L19 7" /></svg>'
    : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 7v6M12 16.5v.5" /></svg>';
  const last = L.last_setup;
  const T = openTrade(D, now), C = todayClosed(D);
  const built = D.built ? Date.parse(D.built) / 1000 : null;
  return `<div class="card lp lp-${v.level}${v.code === 'SILENT' ? ' lp-old' : ''}" data-lp="${esc(where)}">
    <div class="lp-v"><span class="lp-vi">${icon}</span><div class="lp-vt"><span class="lp-eye">PC bot · ${esc(pc.host || 'PC')} · ${esc(h?.model || pc.model || '—').toUpperCase()}</span>
      <b>${esc(v.label)}</b><span class="lp-vr">${esc(v.reason || '')}</span></div></div>
    <div class="lp-chips">
      <span class="lp-chip"><i>Account</i><b>${esc(a.name || pc.adapter || '—')}</b></span>
      <span class="lp-chip ${a.label === 'LIVE' ? 'live' : a.label === 'SIM' ? 'sim' : ''}"><b>${esc(a.label || (pc.adapter === 'paper' ? 'PAPER' : '?'))}</b></span>
      <span class="lp-chip ${a.armed ? 'g' : ''}"><i>Armed</i><b>${h ? (a.armed ? 'yes' : 'no') : '—'}</b></span>
      <span class="lp-chip ${a.enabled === false ? 'r' : ''}"><i>Orders</i><b>${h ? (a.enabled === false ? 'DISABLED' : 'enabled') : '—'}</b></span>
      ${nt.connected != null ? `<span class="lp-chip ${nt.connected ? 'g' : 'r'}"><i>NinjaTrader</i><b>${nt.connected ? 'connected' : 'DISCONNECTED'}</b></span>` : ''}
      ${h?.kill ? '<span class="lp-chip r"><b>KILL ON</b></span>' : ''}</div>
    <div class="lp-grid">
      ${kv('Heartbeat', `<span data-lp-age="${ok(pc.t) ? pc.t : ''}">${ok(v.hb_age) ? dur(v.hb_age) : '—'}</span> ago`, `every ${dur(+pc.every_s || 300)}`, v.code === 'SILENT' ? 'dn' : '')}
      ${kv('Feed', h ? `${esc(fl.src)}` : '—', h ? `last ${fl.tf} bar ${fl.age != null ? dur(fl.age) + ' old' : '—'}` : 'no report', fl.bad || v.code === 'FEED' ? 'wn' : '')}
      ${kv('Last poll', h && ok(P.last_t) ? hm(P.last_t) + ' ET' : '—', h ? `${P.errors || 0} error${P.errors === 1 ? '' : 's'}${P.last_error ? ' · ' + esc(String(P.last_error).slice(0, 60)) : ''}` : '', P.consecutive_errors ? 'dn' : '')}
      ${kv('Orders today', h ? String(O.today ?? 0) : '—', h ? (O.last ? `last ${esc(O.last.side)} ${hm(O.last.t)} ${O.last.ok ? 'ok' : '<span class="dn">failed</span>'}` : 'none sent') : '')}
      ${kv('Setups today', h ? String(L.setups_today ?? 0) : '—', last ? `<span class="${last.side === 'LONG' ? 'up' : 'dn'}">${esc(last.side)}</span> ${esc(last.level || '')} · ${hm(last.t)}` : 'none yet')}
      ${kv('Uptime', h ? dur(h.uptime?.bot_s ?? h.uptime?.server_s) : '—', h ? `server ${dur(h.uptime?.server_s)}` : '')}</div>
    ${h ? stepper(h) : ''}
    ${h ? `<div class="lp-stage">${esc(L.text || '')}</div>` : ''}
    ${last ? `<div class="lp-sig"><span class="lp-eye">Last signal · ${hm(last.t)} ET</span><span><b class="${last.side === 'LONG' ? 'up' : 'dn'}">${esc(last.side)}</b> swept ${esc(last.level || '—')} · limit ${num(last.limit)} · stop ${num(last.stop)}${ok(last.risk_pts) ? ` (${num(last.risk_pts, 1)} pts)` : ''} · target ${num(last.target)}${ok(last.rr) ? ` (${(+last.rr).toFixed(1)}R)` : ''}${last.status ? ` · ${esc(last.status)}` : ''}</span></div>` : ''}
    ${T ? tradeBox(T) : ''}
    ${C.length ? `<div class="lp-closed"><div class="lp-eye">Today’s closed trade${C.length > 1 ? 's' : ''}${C[0].src === 'paper' ? ' · cloud paper' : ''}</div>${C.map((t, i) => `<div class="lp-ct">
        <div class="lp-cth"><b class="${t.side === 'LONG' ? 'up' : 'dn'}">${esc(t.side)}</b><span>${t.qty ?? '—'} MNQ · ${hm(t.entry_t)}–${hm(t.exit_t)} ET</span><span>${esc(t.exit || '')}</span><b class="${cls(t.pnl)}">${susd(t.pnl)} · ${fR(t.r)}</b></div>
        <div class="lp-chart" data-lp-closed="${i}"></div></div>`).join('')}</div>` : ''}
    ${where === 'accounts' ? execBox(D.exec) : ''}
    <div class="lp-foot">Cloud check ${built ? dur(now - built) + ' ago' : '—'} · the PC reports every ${dur(+pc.every_s || 300)} · read-only</div>
  </div>`;
}
// ------------------------------------------------------------------ execution quality (engine/fill_audit.py via the heartbeat "exec")
// slippage $ against the LIT backtest on the same bars, per trade and per month; missed trades (why, backtest $) and extras
const tks = (v) => (ok(v) ? (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v).toFixed(Math.abs(v) % 1 ? 1 : 0) + ' ticks' : '—');
export function execBox(x) {
  if (!x) return '';
  const rec = (x.recent || []).slice(0, 5), mo = (x.months || []).slice(-1)[0];
  const row = (r) => r.status === 'missed'
    ? `<div class="lp-cth"><b class="dn">MISSED</b><span>${esc(r.day || '')} ${hm(r.entry_t)} ET · ${esc(r.reason || '')}</span><b>${susd(r.missed_usd)} not taken</b></div>`
    : r.status === 'extra'
      ? `<div class="lp-cth"><b>EXTRA</b><span>${esc(r.day || '')} ${hm(r.entry_t)} ET</span><b class="${cls(r.live_pnl)}">${susd(r.live_pnl)}</b></div>`
      : `<div class="lp-cth"><b class="${r.side === 'LONG' ? 'up' : 'dn'}">${esc(r.side || '')}</b><span>${esc(r.day || '')} ${hm(r.entry_t)} ET · entry ${tks(r.entry_slip_ticks)} · exit ${tks(r.exit_slip_ticks)}${ok(r.latency_s) ? ` · ${r.latency_s} s` : ''}</span><b class="${cls(r.slip_usd)}">${susd(r.slip_usd)}</b></div>`;
  return `<div class="lp-closed"><div class="lp-eye">Execution vs the backtest${x.from ? ` · since ${esc(x.from)}` : ''}</div>
    <div class="lp-grid">
      ${kv('Slippage', susd(x.slip_usd), ok(x.slip_usd_per_trade) ? `${susd(x.slip_usd_per_trade)} a trade · ${x.trades} trades` : `${x.trades || 0} trades`, cls(x.slip_usd))}
      ${kv('Missed', String(x.missed || 0), `${susd(x.missed_usd)} in the backtest${x.missed_pc_on ? ` · ${x.missed_pc_on} with the PC on` : ''}`, x.missed ? 'dn' : '')}
      ${kv('Extra', String(x.extra || 0), susd(x.extra_usd))}
      ${kv('Median slip', tks(x.entry_slip_ticks_med), `entry · exit ${tks(x.exit_slip_ticks_med)}`)}
      ${kv('Latency', ok(x.latency_s_med) ? x.latency_s_med + ' s' : '—', 'CISD close → order')}
      ${kv('This month', mo ? susd(mo.slip_usd) : '—', mo ? `${mo.trades} trades · missed ${susd(mo.missed_usd)}` : '', mo ? cls(mo.slip_usd) : '')}</div>
    ${rec.map((r) => `<div class="lp-ct">${row(r)}</div>`).join('')}
    ${(x.nightly || []).slice(0, 3).map((n) => `<div class="lp-ct"><div class="lp-cth"><b class="${n.verdict === 'differs' ? 'dn' : n.verdict === 'same' ? 'up' : ''}">${esc(String(n.verdict || '').toUpperCase())}</b><span>night check · ${esc(n.text || '')}</span></div></div>`).join('')}
    <div class="lp-note">${esc(x.text || '')}${x.text ? '.' : ''} Ticks: positive = worse than the backtest. Push above 4 ticks and for a trade missed while the PC was on.</div></div>`;
}
function tradeBox(T) {
  const beHit = T.be || (ok(T.stop_now) && (T.stop_now - T.entry) * T.dir >= 0);
  return `<div class="lp-trade"><div class="lp-th"><span class="lp-eye">Open trade · ${hm(T.entry_t)} ET</span>
      <b class="${T.side === 'LONG' ? 'up' : 'dn'}">${esc(T.side)} ${T.qty ?? ''} MNQ</b><b class="lp-pnl ${cls(T.pnl)}">${susd(T.pnl)} <small>${fR(T.r)}</small></b></div>
    <div class="lp-nums">${kv('Entry', num(T.entry))}${kv('Stop now', num(T.stop_now), beHit ? 'at breakeven' : `${num(Math.abs(T.entry - T.stop_now), 1)} pts`, beHit ? 'up' : 'dn')}
      ${kv('Target', num(T.target), esc(T.target_label || ''), 'up')}${kv('Breakeven', num(T.be_px), beHit ? 'moved' : 'at 1R', '')}
      ${kv('Price', num(T.px), ok(T.px_t) ? 'bar ' + hm(T.px_t) : '')}${kv('In trade', `<span data-lp-since="${T.entry_t}">${dur(T.since)}</span>`)}</div>
    <div class="lp-chart" data-lp-open></div></div>`;
}

// ------------------------------------------------------------------ mount (HTML + charts) and the 15 s age ticker
function chartRec(TC, t, D, live) {
  const b5 = bars5(D), b1 = bars1(D);
  const rec = TC.fromTrade({ ...t, risk_usd: t.risk_usd ?? (ok(t.risk_pts) && t.qty ? t.risk_pts * PV * t.qty : 0), id: (live ? 'lpopen_' : 'lpday_') + t.entry_t, exit_price: t.exit_px ?? null }, b5);
  rec._bars1 = b1.map(toObj).filter((b) => b.t >= (rec._bars5[0]?.t ?? 0) - 3600);
  if (live) {
    rec.levels = [{ label: 'stop now', px: t.stop_now }].concat(Math.abs(t.stop_now - t.entry) > 0.1 ? [{ label: 'breakeven', px: t.entry }] : []);
    if (t.be) rec.be = { t: now_() - 60 };
  }
  return rec;
}
function mountChart(TC, box, t, D, live) {
  if (!box) return;
  const b5 = bars5(D), b1 = bars1(D);
  if (!covers(b5, t.entry_t) && !covers(b1, t.entry_t)) { box.innerHTML = '<div class="lp-note">The chart draws once the cloud’s recent bars cover the entry (next cloud run).</div>'; return; }
  try {
    const rec = chartRec(TC, t, D, live);
    TC.mount(box, rec, { tf: rec._bars1.length && covers(b1, t.entry_t) ? '1m' : '5m' });
    const h2 = box.querySelector('.tc-h2');
    if (h2 && live) h2.textContent = `entry ${num(t.entry)} · stop now ${num(t.stop_now)} (first ${num(t.stop)}) · target ${num(t.target)} · breakeven ${num(t.entry)} · price ${num(t.px)} · cloud bars (the PC's NinjaTrader bars), NinjaTrader fills`;
  } catch (e) { console.warn('live chart', e); box.innerHTML = '<div class="lp-note">The chart could not be drawn.</div>'; }
}
export function mount(el, D, { where = 'today', loadTC = null } = {}) {
  if (!el || !D) return;
  css();
  el.innerHTML = html(D, { where });
  const T = openTrade(D), C = todayClosed(D);
  if ((T || C.length) && loadTC) {
    loadTC().then((TC) => {
      if (!el.isConnected) return;
      if (T) mountChart(TC, el.querySelector('[data-lp-open]'), T, D, true);
      C.forEach((t, i) => mountChart(TC, el.querySelector(`[data-lp-closed="${i}"]`), t, D, false));
    }).catch(() => { el.querySelectorAll('.lp-chart').forEach((b) => { b.innerHTML = '<div class="lp-note">Charts unavailable offline.</div>'; }); });
  }
}
let _tick = null;
function ticker() {
  if (_tick) return;
  _tick = setInterval(() => {
    const n = now_();
    document.querySelectorAll('[data-lp-age]').forEach((s) => { if (s.dataset.lpAge) s.textContent = dur(n - +s.dataset.lpAge); });
    document.querySelectorAll('[data-lp-since]').forEach((s) => { s.textContent = dur(n - +s.dataset.lpSince); });
  }, 15000);
}

export function css() {
  ticker();
  if (typeof document === 'undefined' || document.getElementById('lp-css')) return;
  const s = document.createElement('style');
  s.id = 'lp-css';
  s.textContent = `
.lp{--lpc:var(--muted);border:1px solid color-mix(in srgb,var(--lpc) 45%,transparent)!important;background:linear-gradient(160deg,color-mix(in srgb,var(--lpc) 13%,var(--surface)),var(--surface) 55%)!important}
.lp-good{--lpc:var(--good)}.lp-warn{--lpc:var(--warn)}.lp-bad{--lpc:var(--bad)}
.lp-v{display:flex;gap:14px;align-items:center}
.lp-vi{flex:0 0 52px;height:52px;border-radius:16px;display:grid;place-items:center;background:color-mix(in srgb,var(--lpc) 22%,transparent);border:1px solid color-mix(in srgb,var(--lpc) 55%,transparent)}
.lp-vi svg{width:28px;height:28px;fill:none;stroke:var(--lpc);stroke-width:2.6;stroke-linecap:round;stroke-linejoin:round}
.lp-good .lp-vi{animation:lpPulse 2.4s ease-in-out infinite}
@keyframes lpPulse{0%,100%{box-shadow:0 0 0 0 color-mix(in srgb,var(--good) 40%,transparent)}50%{box-shadow:0 0 0 8px transparent}}
.lp-vt{display:flex;flex-direction:column;min-width:0}
.lp-vt b{font-size:22px;font-weight:800;letter-spacing:.02em;color:var(--lpc);line-height:1.15;overflow-wrap:anywhere}
.lp-vr{font-size:12.5px;color:var(--ink-2);margin-top:3px;overflow-wrap:anywhere}
.lp-eye{font-size:10.5px;letter-spacing:.12em;text-transform:uppercase;color:var(--muted);font-weight:600}
.lp-chips{display:flex;flex-wrap:wrap;gap:6px;margin:14px 0 4px}
.lp-chip{display:inline-flex;gap:6px;align-items:baseline;padding:4px 10px;border-radius:999px;border:1px solid var(--line);background:var(--surface-2);font-size:12px;max-width:100%}
.lp-chip i{font-style:normal;color:var(--muted);font-size:11px}.lp-chip b{font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.lp-chip.live{background:color-mix(in srgb,var(--bad) 30%,transparent);border-color:color-mix(in srgb,var(--bad) 60%,transparent)}.lp-chip.live b{color:#fff;letter-spacing:.08em}
.lp-chip.sim{border-color:color-mix(in srgb,var(--accent-2) 50%,transparent)}.lp-chip.sim b{color:var(--accent-2);letter-spacing:.08em}
.lp-chip.g b{color:var(--good-ink)}.lp-chip.r{border-color:color-mix(in srgb,var(--bad) 55%,transparent)}.lp-chip.r b{color:var(--bad)}
.lp-grid,.lp-nums{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px 14px;margin-top:12px}
@media (min-width:720px){.lp-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.lp-nums{grid-template-columns:repeat(6,minmax(0,1fr))}}
.lp-kv{display:flex;flex-direction:column;min-width:0}.lp-kv span{font-size:11px;color:var(--muted)}
.lp-kv b{font-size:15px;font-weight:700;font-family:var(--mono);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.lp-kv em{font-style:normal;font-size:11px;color:var(--ink-2);overflow-wrap:anywhere}
.lp .up{color:var(--good-ink)}.lp .dn{color:var(--bad)}.lp .wn{color:var(--warn)}
.lp-steps{display:grid;grid-template-columns:repeat(8,minmax(0,1fr));gap:3px;margin:16px 0 6px}
.lp-steps span{display:flex;flex-direction:column;gap:5px;min-width:0}
.lp-steps i{height:6px;border-radius:3px;background:var(--surface-3)}
.lp-steps em{font-style:normal;font-size:9px;color:var(--muted);text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.lp-steps .done i{background:color-mix(in srgb,var(--accent) 70%,transparent)}.lp-steps .done em{color:var(--ink-2)}
.lp-steps .on i{background:var(--lpc);box-shadow:0 0 10px var(--lpc)}.lp-steps .on em{color:var(--ink);font-weight:700}
.lp-stage{font-size:12.5px;color:var(--ink-2);overflow-wrap:anywhere}
.lp-sig{display:flex;flex-direction:column;gap:3px;margin-top:12px;padding-top:12px;border-top:1px solid var(--line);font-size:12.5px;overflow-wrap:anywhere}
.lp-trade,.lp-closed{margin-top:14px;padding-top:14px;border-top:1px solid var(--line)}
.lp-th{display:flex;flex-wrap:wrap;align-items:baseline;gap:6px 12px}.lp-th .lp-eye{flex-basis:100%}
.lp-th b{font-size:17px;font-weight:800}.lp-pnl{margin-left:auto;font-family:var(--mono)}.lp-pnl small{font-size:12px;opacity:.85}
.lp-chart{margin-top:12px;min-height:40px}
.lp-ct{margin-top:10px}.lp-cth{display:flex;flex-wrap:wrap;gap:4px 10px;font-size:12.5px;align-items:baseline}.lp-cth>b:last-child{margin-left:auto;font-family:var(--mono)}
.lp-note{font-size:12px;color:var(--muted);padding:8px 0}
.lp-old .lp-chips,.lp-old .lp-grid,.lp-old .lp-steps,.lp-old .lp-stage,.lp-old .lp-sig{opacity:.45}
.lp-old .lp-grid .lp-kv:first-child{opacity:1}
.lp-foot{margin-top:12px;font-size:10.5px;color:var(--muted)}`;
  document.head.appendChild(s);
}

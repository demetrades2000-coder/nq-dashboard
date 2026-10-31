// Trade chart: a LIT trade drawn like TradingView's Long / Short Position tool on the real candles, for both dashboards
// (phone PWA tools/web_public/index.html and the PC web_next/). Plain ES module, no imports, no CDN; SVG; its own scoped
// CSS (.tc-*) on the dashboards' tokens (--good --bad --warn --gold --ink --ink-2 --muted --ssl --bsl --surface-2 --mono).
// The PC copy is web_next/js/tradechart.js (copied by `cd tools/web_public/fx && npm run build`): edit this file only.
//
//   import * as TC from './tradechart.js';
//   const rec = await TC.load(id, { base: 'replays/' })   // phone: replays/<id>.json; PC: { base: '/api/next/tradechart/', ext: '' }
//   const ch = TC.mount(el, rec, { tf: '5m' })              // header (date, ET time, side, micros, $ at risk, result) + chart,
//                                                           //   5m / 1m toggle, wheel / pinch zoom, drag pan, double-tap reset,
//                                                           //   crosshair readout (ET time, O H L C). ch.destroy()
//   TC.svg(rec, { width, height, tf })  -> one static SVG string (no events)
//   TC.idOf(trade)                      -> '<date>_<HHMM ET>_<long|short>' (the record id = the PNG name of tools/lit_trade_charts.py)
//   TC.fromTrade(trade, bars5, opts)    -> a record from any trade dict + 5m bars [[t,o,h,l,c],...] (today's live trade)
//
// A record (tools/lit_chart_data.py, exported by tools/export_replays.py): exact engine prices and epoch-second times,
//   entry {t, px}, stop, target, exit {t, t_end, px, kind}, be {t}, levels [{label, px, t}], sweep {t, ext_px, ext_t},
//   idm [{t, px, taken_t}], cisd5 {px, ref_t, t}, limit {px, t0, t1, tap_t}, cisd1 {px, ref_t, t}, boxes [{k, t0, t1, hi, lo}],
//   b5 / b1 packed bars {t0, s, p0, dt[], o[], h[], l[], c[]} (price = (p0 + v) / 4), off = ET offset of the day in seconds.
// Paper backtest / paper bot data only: nothing here places orders.

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const q4 = (p) => Math.round(+p * 4) / 4;
export const fpx = (p) => q4(p).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const fusd = (v) => (v > 0 ? '+' : v < 0 ? '−' : '') + '$' + Math.round(Math.abs(v)).toLocaleString('en-US');
export const fr = (v) => (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v).toFixed(2) + 'R';
const pad2 = (n) => String(n).padStart(2, '0');
const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
// ET wall clock of epoch t with the record's fixed day offset (exact for a session: DST never changes inside one)
function etc(t, off) { const d = new Date((t + off) * 1000); return { h: d.getUTCHours(), mi: d.getUTCMinutes(), wd: WD[d.getUTCDay()], date: d.toISOString().slice(0, 10) }; }
const hm = (t, off) => { const e = etc(t, off); return `${pad2(e.h)}:${pad2(e.mi)}`; };
// US Eastern UTC offset (s) by the US rule (EDT from the 2nd Sunday of March 07:00 UTC to the 1st Sunday of November 06:00 UTC):
// only for a browser without Intl time zones (was a fixed -4 h: an hour off from Nov 1 to Mar 8)
function usEtOff(t) { const y = new Date(t * 1000).getUTCFullYear(), sun = (m, n) => 1 + ((7 - new Date(Date.UTC(y, m, 1)).getUTCDay()) % 7) + 7 * (n - 1); return t >= Date.UTC(y, 2, sun(2, 2), 7) / 1000 && t < Date.UTC(y, 10, sun(10, 1), 6) / 1000 ? -4 * 3600 : -5 * 3600; }
function etOffset(t) {
  try {
    const f = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
    const P = {}; for (const p of f.formatToParts(new Date(t * 1000))) P[p.type] = p.value;
    return Math.round((Date.UTC(+P.year, +P.month - 1, +P.day, +P.hour % 24, +P.minute) / 1000 - Math.floor(t / 60) * 60) / 3600) * 3600;
  } catch { return usEtOff(t); }
}
export function idOf(t) {
  const off = etOffset(+t.entry_t), e = etc(+t.entry_t, off);
  return `${t.day}_${pad2(e.h)}${pad2(e.mi)}_${String(t.side || (t.dir > 0 ? 'long' : 'short')).toLowerCase()}`;
}
const EXITK = (k) => (k === 'TIME' ? 'EOD' : k || 'OPEN');

export function unpack(b) {
  if (!b || !b.dt) return [];
  const out = new Array(b.dt.length);
  for (let i = 0; i < b.dt.length; i++) out[i] = { t: b.t0 + b.dt[i] * b.s, o: (b.p0 + b.o[i]) / 4, h: (b.p0 + b.h[i]) / 4, l: (b.p0 + b.l[i]) / 4, c: (b.p0 + b.c[i]) / 4 };
  return out;
}

// ------------------------------------------------------------------ loading
const _cache = new Map();
export async function load(id, { base = 'replays/', ext = '.json', fetcher = (u, o) => fetch(u, o) } = {}) {
  const key = base + id;
  if (_cache.has(key)) return _cache.get(key);
  const p = fetcher(base + encodeURIComponent(id) + ext, { cache: 'no-cache' })
    .then((r) => { if (!r.ok) throw new Error('chart ' + id + ': ' + r.status); return r.json(); })
    .then((rec) => { rec._bars5 = unpack(rec.b5); rec._bars1 = unpack(rec.b1); return rec; });
  _cache.set(key, p);
  p.catch(() => _cache.delete(key));
  return p;
}

// a record from a plain trade dict + 5m bars (today's live / paper trade; markers that the trade carries only)
export function fromTrade(t, bars5, { bars1 = null, levels = [], now = Date.now() / 1000 } = {}) {
  const d = (t.side || '').toUpperCase() === 'SHORT' || t.dir < 0 ? -1 : 1;
  const B = (bars5 || []).map((b) => (Array.isArray(b) ? { t: +b[0], o: +b[1], h: +b[2], l: +b[3], c: +b[4] } : { t: +b.t, o: +b.o, h: +b.h, l: +b.l, c: +b.c })).filter((b) => Number.isFinite(b.t)).sort((a, b) => a.t - b.t);
  const et0 = +t.entry_t, off = etOffset(et0 || (B[0] && B[0].t) || now);
  const kind = EXITK(t.exit);
  const xt = t.exit_t ? +t.exit_t - 60 : (B.length ? B[B.length - 1].t : et0);   // exit_t = end of the exit bar (1m or 5m)
  const entry = +t.entry, stop = +t.stop, target = +t.target;
  const risk = Math.abs(entry - stop) || 1;
  const xp = t.exit_price != null ? +t.exit_price : (B.length ? B[B.length - 1].c : entry);
  return {
    id: t.id || (t.day && et0 ? idOf(t) : 'live'), day: t.day, side: d > 0 ? 'LONG' : 'SHORT', d, tf: 5, off,
    qty: +t.qty || 0, risk_usd: +t.risk_usd || 0, risk_pts: +t.risk_pts || risk, pnl: +t.pnl || 0, r: t.r != null ? +t.r : (xp - entry) * d / risk,
    exit_kind: kind, entry_kind: t.entry_kind || '', size_why: t.size_why || [], live: !t.exit_t,
    entry: { t: et0, px: entry }, stop, target, plan_rr: t.plan_rr != null ? +t.plan_rr : Math.abs(target - entry) / risk,
    target_label: t.target_label || '', be: t.be_t ? { t: +t.be_t } : null,
    exit: { t: xt, t_end: t.exit_t ? +t.exit_t : xt + 300, px: xp, kind },
    levels: (levels || []).map((l) => ({ label: l.label, px: +l.px, t: l.t || null })),
    sweep: t.sweep_ext != null ? { t: et0, ext_px: +t.sweep_ext, ext_t: t.sweep_t || null } : null,
    idm: [], cisd5: t.cisd_level != null ? { px: +t.cisd_level, ref_t: t.cisd_t || null, t: et0 - 300 } : null,
    limit: null, cisd1: null, boxes: t.boxes || [], _bars5: B, _bars1: bars1 ? unpack(bars1) : [],
  };
}

// ------------------------------------------------------------------ geometry helpers
function xmap(bars, secs) {
  const T = bars.map((b) => b.t);
  return (t) => {
    if (t == null || !T.length) return null;
    let lo = 0, hi = T.length - 1;
    if (t < T[0]) return (t - T[0]) / secs;
    while (lo < hi) { const m = (lo + hi + 1) >> 1; if (T[m] <= t) lo = m; else hi = m - 1; }
    if (lo === T.length - 1) return lo + (t - T[lo]) / secs;     // past the last bar: off the panel, not piled on the edge
    return lo + Math.min(1, (t - T[lo]) / secs);
  };
}
function niceStep(range, n) {
  const raw = range / Math.max(1, n), p = Math.pow(10, Math.floor(Math.log10(raw)));
  for (const m of [1, 2, 2.5, 5, 10]) if (m * p >= raw) return m * p;
  return 10 * p;
}
// text width in px: measured on a canvas with the page's own font (fallback: an estimate)
let _mctx = null, _sans = null;
function tw(s, fs, bold = false) {
  try {
    if (!_mctx && typeof document !== 'undefined') {
      _mctx = document.createElement('canvas').getContext('2d');
      _sans = (getComputedStyle(document.documentElement).getPropertyValue('--sans') || '').trim() || 'system-ui, -apple-system, Segoe UI, sans-serif';
    }
    if (_mctx) { _mctx.font = `${bold ? 700 : 500} ${fs}px ${_sans}`; return _mctx.measureText(String(s)).width + 2; }
  } catch { /* estimate below */ }
  return String(s).length * fs * (bold ? 0.6 : 0.56) + 2;
}

// ------------------------------------------------------------------ the chart (one SVG string)
// view = { i0, i1 } visible bar range (floats); null = the whole window
export function svg(rec, { width = 380, height = 260, tf = '5m', view = null, compact = null, cross = null } = {}) {
  const one = tf === '1m' && rec._bars1 && rec._bars1.length;
  const bars = one ? rec._bars1 : (rec._bars5 || unpack(rec.b5));
  const secs = one ? 60 : 300;
  if (!bars.length) return `<svg class="tc-svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}"><text x="${width / 2}" y="${height / 2}" class="tc-t tc-mut" text-anchor="middle">no bars for this trade</text></svg>`;
  const small = compact ?? width < 520;
  const fs = small ? 9.5 : 11;
  const X = xmap(bars, secs);
  const n = bars.length;
  const d = rec.d;
  const RA = small ? 58 : 70, BA = 18, TOP = 6;
  const pl = 4, pr = width - RA, pt = TOP, pb = height - BA;
  const pw = pr - pl, ph = pb - pt;
  const i0 = view ? Math.max(-2, view.i0) : 0, i1 = view ? Math.min(n + 8, view.i1) : n + (small ? 4 : 6);
  const vis = bars.filter((b, i) => i + 1 >= i0 && i <= i1);
  const ent = rec.entry.px;
  const exitIn = rec.exit && rec.exit.t <= bars[n - 1].t;
  let lo = Infinity, hi = -Infinity;
  for (const b of vis.length ? vis : bars) { if (b.l < lo) lo = b.l; if (b.h > hi) hi = b.h; }
  const xe0 = X(rec.entry.t), xx0 = X(rec.exit.t_end);
  const boxVis = xe0 != null && xx0 != null && xx0 >= i0 && xe0 <= i1;
  if (boxVis) {
    lo = Math.min(lo, rec.stop, ent); hi = Math.max(hi, rec.stop, ent);
    if (!one || (exitIn && (rec.exit.kind || rec.exit_kind) === 'TARGET')) { lo = Math.min(lo, rec.target); hi = Math.max(hi, rec.target); }
  }
  const padY = (hi - lo) * 0.06 + 1;
  lo -= padY; hi += padY;
  const sx = (x) => pl + (x - i0) * pw / (i1 - i0);
  const sy = (p) => pt + (hi - p) * ph / (hi - lo);
  const bw = pw / (i1 - i0);
  const o = [];
  const lab = [];   // labels for the placer: {x, y, text, cls, anchor, prio, pill}
  o.push(`<svg class="tc-svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="${esc(`${rec.side} ${rec.day} trade chart`)}">`);
  o.push(`<defs><clipPath id="tcclip-${esc(rec.id)}-${tf}"><rect x="${pl}" y="${pt}" width="${pw}" height="${ph}"/></clipPath></defs>`);
  o.push(`<rect class="tc-bg" x="${pl}" y="${pt}" width="${pw}" height="${ph}" rx="6"/>`);
  // grid + price axis
  const step = niceStep(hi - lo, small ? 4 : 6);
  const yt = [];
  for (let p = Math.ceil(lo / step) * step; p <= hi; p += step) yt.push(p);
  for (const p of yt) o.push(`<line class="tc-grid" x1="${pl}" x2="${pr}" y1="${sy(p).toFixed(1)}" y2="${sy(p).toFixed(1)}"/>`);
  // time axis
  const per = (i1 - i0) / Math.max(1, pw / (small ? 64 : 80));
  const cand = (one ? [5, 10, 15, 30, 60] : [15, 30, 60, 120, 180, 240]).map((m) => m * 60);
  const tstep = cand.find((s) => s / secs >= per) || cand[cand.length - 1];
  const xt = [];
  bars.forEach((b, i) => { if ((b.t + rec.off) % tstep === 0 && i >= i0 && i <= i1) xt.push([i, b.t]); });
  o.push(`<g clip-path="url(#tcclip-${esc(rec.id)}-${tf})">`);
  // session boxes
  for (const bx of rec.boxes || []) {
    const a = X(bx.t0), z = X(bx.t1);
    if (z == null || z < i0 || a > i1) continue;
    const x0 = sx(Math.max(a, i0 - 1)), x1 = sx(z);
    o.push(`<rect class="tc-box tc-box-${esc(bx.k)}" x="${x0.toFixed(1)}" y="${sy(bx.hi).toFixed(1)}" width="${Math.max(1, x1 - x0).toFixed(1)}" height="${Math.max(1, sy(bx.lo) - sy(bx.hi)).toFixed(1)}"/>`);
    if (!one) lab.push({ x: Math.max(x0, pl) + 3, y: sy(bx.hi) - 3, text: bx.k, cls: `tc-boxl tc-box-${bx.k}`, anchor: 'start', prio: 4, max: 1, vb: 'bottom', fs: fs - 1.5 });
  }
  // the position boxes (fill -> exit)
  const xe = sx(xe0 ?? 0), xx = Math.max(sx(xx0 ?? 0), xe + 4);
  const yE = sy(ent), yT = sy(rec.target), yS = sy(rec.stop);
  o.push(`<rect class="tc-tgt" x="${xe.toFixed(1)}" y="${Math.min(yE, yT).toFixed(1)}" width="${(xx - xe).toFixed(1)}" height="${Math.abs(yT - yE).toFixed(1)}"/>`);
  o.push(`<rect class="tc-stp" x="${xe.toFixed(1)}" y="${Math.min(yE, yS).toFixed(1)}" width="${(xx - xe).toFixed(1)}" height="${Math.abs(yS - yE).toFixed(1)}"/>`);
  // candles
  const cw = Math.max(1, Math.min(14, bw * 0.64));
  for (let i = Math.max(0, Math.floor(i0) - 1); i < Math.min(n, Math.ceil(i1) + 1); i++) {
    const b = bars[i], cx = sx(i + 0.5), up = b.c >= b.o;
    const y1 = sy(Math.max(b.o, b.c)), y2 = sy(Math.min(b.o, b.c));
    o.push(`<line class="${up ? 'tc-up' : 'tc-dn'}" x1="${cx.toFixed(1)}" x2="${cx.toFixed(1)}" y1="${sy(b.h).toFixed(1)}" y2="${sy(b.l).toFixed(1)}"/>`
      + `<rect class="${up ? 'tc-upf' : 'tc-dnf'}" x="${(cx - cw / 2).toFixed(1)}" y="${y1.toFixed(1)}" width="${cw.toFixed(1)}" height="${Math.max(0.8, y2 - y1).toFixed(1)}"/>`);
  }
  // entry line + the trade path
  o.push(`<line class="tc-entry" x1="${xe.toFixed(1)}" x2="${xx.toFixed(1)}" y1="${yE.toFixed(1)}" y2="${yE.toFixed(1)}"/>`);
  const kind = rec.exit.kind || rec.exit_kind;
  const xk = sx(X(rec.exit.t) + 0.5), yk = sy(rec.exit.px);
  o.push(`<line class="tc-path tc-k-${esc(kind)}" x1="${xe.toFixed(1)}" y1="${yE.toFixed(1)}" x2="${xk.toFixed(1)}" y2="${yk.toFixed(1)}"/>`);
  if (!one && boxVis) {
    lab.push({ x: xe + 4, y: yT + (d > 0 ? 3 : -3), text: `Target ${fpx(rec.target)} · ${(+rec.plan_rr).toFixed(2)}R`, cls: 'tc-l-good', anchor: 'start', prio: 1, vb: d > 0 ? 'top' : 'bottom' });
    lab.push({ x: xe + 4, y: yS + (d > 0 ? -3 : 3), text: `Stop ${fpx(rec.stop)} · ${(+rec.risk_pts).toFixed(2)} pts · $${Math.round(rec.risk_usd).toLocaleString('en-US')}`, cls: 'tc-l-bad', anchor: 'start', prio: 1, vb: d > 0 ? 'bottom' : 'top' });
  }
  // swept levels (same price = one line)
  const lv = new Map();
  for (const l of rec.levels || []) { const m = lv.get(l.px) || { ...l, names: [] }; m.names.push(l.label); if (l.t && (!m.t || l.t < m.t)) m.t = l.t; lv.set(l.px, m); }
  const xsw = rec.sweep && rec.sweep.ext_t ? X(rec.sweep.ext_t) + 1 : (xe0 ?? n);
  for (const l of lv.values()) {
    if (xsw <= i0 + 0.5) continue;
    const a = l.t ? Math.max(X(l.t), -1) : -1, y = sy(l.px);
    o.push(`<line class="tc-lvl ${d < 0 ? 'tc-bsl' : 'tc-ssl'}" x1="${sx(a).toFixed(1)}" x2="${sx(Math.max(xsw, a + 1)).toFixed(1)}" y1="${y.toFixed(1)}" y2="${y.toFixed(1)}"/>`);
    if (!one) lab.push({ x: Math.max(sx(a), pl) + 3, y: y + (d > 0 ? -2 : 2), text: `${l.names.join(' / ')} ${fpx(l.px)}`, cls: d < 0 ? 'tc-l-bsl' : 'tc-l-ssl', anchor: 'start', prio: 2, vb: d > 0 ? 'bottom' : 'top' });
  }
  // inducement swings
  for (const z of rec.idm || []) {
    const a = X(z.t) + 0.5, b = z.taken_t ? X(z.taken_t) + 0.5 : a + 3, y = sy(z.px);
    if (b < i0 || a > i1) continue;
    o.push(`<line class="tc-idm" x1="${sx(a).toFixed(1)}" x2="${sx(b).toFixed(1)}" y1="${y.toFixed(1)}" y2="${y.toFixed(1)}"/>`);
    const s = 4, px = sx(a);
    o.push(d > 0 ? `<path class="tc-idmm" d="M${px - s} ${y + s + 2}L${px + s} ${y + s + 2}L${px} ${y + 1}Z"/>` : `<path class="tc-idmm" d="M${px - s} ${y - s - 2}L${px + s} ${y - s - 2}L${px} ${y - 1}Z"/>`);
    if (!one) lab.push({ x: px, y: y + (d > 0 ? s + 4 : -s - 4), text: 'IDM', cls: 'tc-l-gold', anchor: 'middle', prio: 3, max: 2, vb: d > 0 ? 'top' : 'bottom', bg: false, fs: fs - 1.5 });
  }
  // sweep extreme
  if (rec.sweep && rec.sweep.ext_t) {
    const x = sx(X(rec.sweep.ext_t) + 0.5), y = sy(rec.sweep.ext_px);
    o.push(`<circle class="tc-sweep" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${small ? 3.6 : 4.4}"/>`);
    lab.push({ x, y: y + (d > 0 ? 7 : -7), text: `sweep ${fpx(rec.sweep.ext_px)}`, cls: 'tc-l-warn', anchor: 'middle', prio: 2, vb: d > 0 ? 'top' : 'bottom' });
  }
  // 5m CISD level
  if (rec.cisd5 && rec.cisd5.ref_t) {
    const a = X(rec.cisd5.ref_t), b = X(rec.cisd5.t) + 1, y = sy(rec.cisd5.px);
    if (b >= i0 && a <= i1) {
      o.push(`<line class="tc-cisd" x1="${sx(a).toFixed(1)}" x2="${sx(b).toFixed(1)}" y1="${y.toFixed(1)}" y2="${y.toFixed(1)}"/>`);
      if (!one) lab.push({ x: sx(b), y: y + (d > 0 ? 2 : -2), text: `CISD 5m ${fpx(rec.cisd5.px)}`, cls: 'tc-l-acc', anchor: 'end', prio: 2, vb: d > 0 ? 'top' : 'bottom' });
    }
  }
  // limit (placement -> tap / expiry)
  if (rec.limit) {
    const L = rec.limit, a = X(L.t0), b = X(L.tap_t || L.t1) + (L.tap_t ? 0.5 : 0), y = sy(L.px);
    if (b >= i0 && a <= i1) {
      o.push(`<line class="tc-limit" x1="${sx(a).toFixed(1)}" x2="${sx(b).toFixed(1)}" y1="${y.toFixed(1)}" y2="${y.toFixed(1)}"/>`);
      if (L.tap_t) o.push(`<rect class="tc-tap" x="${(sx(b) - 3).toFixed(1)}" y="${(y - 3).toFixed(1)}" width="6" height="6" transform="rotate(45 ${sx(b).toFixed(1)} ${y.toFixed(1)})"/>`);
      if (one) lab.push({ x: sx(a) + 2, y: y + (d > 0 ? 2 : -2), text: `limit ${fpx(L.px)}`, cls: 'tc-l-teal', anchor: 'start', prio: 2, vb: d > 0 ? 'top' : 'bottom' });
    }
  }
  // 1m CISD (1m view)
  if (one && rec.cisd1) {
    const a = X(rec.cisd1.ref_t), b = X(rec.cisd1.t) + 1, y = sy(rec.cisd1.px);
    o.push(`<line class="tc-cisd tc-cisd1" x1="${sx(a).toFixed(1)}" x2="${sx(b).toFixed(1)}" y1="${y.toFixed(1)}" y2="${y.toFixed(1)}"/>`);
    o.push(`<circle class="tc-conf" cx="${sx(b - 0.5).toFixed(1)}" cy="${sy(bars[Math.min(n - 1, Math.max(0, Math.floor(b - 1)))].c).toFixed(1)}" r="3"/>`);
    lab.push({ x: sx(b) + 3, y, text: `CISD 1m ${fpx(rec.cisd1.px)}`, cls: 'tc-l-acc', anchor: 'start', prio: 2, vb: 'middle' });
  }
  // fill marker
  o.push(`<path class="tc-fill" d="M${(xe - 1).toFixed(1)} ${(yE - 5).toFixed(1)}L${(xe + 6).toFixed(1)} ${yE.toFixed(1)}L${(xe - 1).toFixed(1)} ${(yE + 5).toFixed(1)}Z"/>`);
  if (one) lab.push({ x: xe - 3, y: yE + (d > 0 ? -4 : 4), text: `fill ${fpx(ent)}`, cls: 'tc-l-ink', anchor: 'end', prio: 1, vb: d > 0 ? 'bottom' : 'top' });
  // breakeven move
  if (rec.be && rec.be.t) {
    const x = sx(X(rec.be.t) + 0.5);
    if (x >= pl && x <= pr) o.push(`<rect class="tc-be" x="${(x - 3.5).toFixed(1)}" y="${(yE - 3.5).toFixed(1)}" width="7" height="7" rx="1.5"/>`);
    if (x >= pl && x <= pr) lab.push({ x, y: yE + (d > 0 ? 6 : -6), text: 'BE', cls: 'tc-l-ink', anchor: 'middle', prio: 3, max: 2, vb: d > 0 ? 'top' : 'bottom', bg: false, fs: fs - 1.5 });
  }
  // exit (only on a panel that shows the exit bar)
  const xkI = X(rec.exit.t);
  if (xkI != null && xkI <= n + 0.2 && xk >= pl && xk <= pr) {
    const s = small ? 4 : 5;
    if (!rec.live || kind !== 'OPEN') o.push(`<path class="tc-x tc-k-${esc(kind)}" d="M${xk - s} ${yk - s}L${xk + s} ${yk + s}M${xk + s} ${yk - s}L${xk - s} ${yk + s}"/>`);
    const right = xk > pl + pw * 0.62;
    lab.push({ x: xk + (right ? -8 : 8), y: yk, text: `${kind} ${fusd(rec.pnl)} · ${fr(rec.r)}`, cls: `tc-pill tc-k-${kind}`, anchor: right ? 'end' : 'start', prio: 0, vb: 'middle', pill: true, fs: fs + 0.5, bold: true });
  }
  // crosshair
  if (cross && cross.i >= 0 && cross.i < n) {
    const cx = sx(cross.i + 0.5);
    o.push(`<line class="tc-cross" x1="${cx.toFixed(1)}" x2="${cx.toFixed(1)}" y1="${pt}" y2="${pb}"/>`);
    if (cross.y != null && cross.y >= pt && cross.y <= pb) o.push(`<line class="tc-cross" x1="${pl}" x2="${pr}" y1="${cross.y.toFixed(1)}" y2="${cross.y.toFixed(1)}"/>`);
  }
  o.push(placeLabels(lab, { pl, pr, pt, pb, fs }));
  o.push('</g>');
  // axes text
  for (const p of yt) { const y = sy(p); if (y > pt + 6 && y < pb - 4) o.push(`<text class="tc-t tc-ax" x="${pr + 6}" y="${(y + 3.5).toFixed(1)}" font-size="${fs - 1}">${Math.round(p).toLocaleString('en-US')}</text>`); }
  for (const [i, t] of xt) { const x = sx(i); if (x > pl + 14 && x < pr - 14) o.push(`<text class="tc-t tc-ax" x="${x.toFixed(1)}" y="${height - 5}" text-anchor="middle" font-size="${fs - 1}">${hm(t, rec.off)}</text>`); }
  // right-axis price tags (TradingView style), nudged apart
  const tags = [[rec.target, 'tc-tag-good'], [ent, 'tc-tag-ink'], [rec.stop, 'tc-tag-bad']]
    .filter(([p]) => sy(p) >= pt - 2 && sy(p) <= pb + 2).map(([p, c]) => ({ p, c, y: sy(p) }));
  tags.sort((a, b) => a.y - b.y);
  const th = fs + 6;
  for (let k = 1; k < tags.length; k++) if (tags[k].y - tags[k - 1].y < th) tags[k].y = tags[k - 1].y + th;
  for (const g of tags) {
    o.push(`<g class="${g.c}"><rect x="${pr + 1}" y="${(g.y - th / 2).toFixed(1)}" width="${RA - 3}" height="${th}" rx="3"/>`
      + `<text class="tc-t" x="${pr + 1 + (RA - 3) / 2}" y="${(g.y + fs * 0.36).toFixed(1)}" text-anchor="middle" font-size="${fs - 0.5}" font-weight="700">${fpx(g.p)}</text></g>`);
  }
  o.push(`<text class="tc-t tc-mut" x="${pl + 6}" y="${pt + fs + 3}" font-size="${fs - 1}">${one ? '1m' : '5m'} · ET</text>`);
  o.push('</svg>');
  return o.join('');
}

// greedy label placer: in priority order, each label tries vertical shifts until it overlaps no earlier label and stays
// inside the plot
function placeLabels(L, { pl, pr, pt, pb, fs }) {
  const placed = [], out = [];
  L.sort((a, b) => a.prio - b.prio);
  for (const l of L) {
    const f = l.fs || fs, w = tw(l.text, f, !!l.bold) + (l.pill ? 10 : 4), h = f + (l.pill ? 7 : 4);
    let x0 = l.anchor === 'end' ? l.x - w : l.anchor === 'middle' ? l.x - w / 2 : l.x;
    x0 = Math.max(pl + 1, Math.min(pr - w - 1, x0));
    const base = l.vb === 'top' ? l.y : l.vb === 'bottom' ? l.y - h : l.y - h / 2;
    let y0 = null;
    for (const k of [0, 1, -1, 2, -2, 3, -3, 4, -4, 5, -5, 6, -6, 8, -8, 10, -10]) {
      if (l.max != null && Math.abs(k) > l.max) break;
      const y = base + k * (h * 0.8);
      if (y < pt + 1 || y + h > pb - 1) continue;
      if (!placed.some((p) => x0 < p.x + p.w && x0 + w > p.x && y < p.y + p.h && y + h > p.y)) { y0 = y; break; }
    }
    if (y0 == null) { if (l.prio > 1) continue; y0 = Math.max(pt + 1, Math.min(pb - h - 1, base)); }
    placed.push({ x: x0, y: y0, w, h });
    if (l.pill) out.push(`<g class="${l.cls}"><rect x="${x0.toFixed(1)}" y="${y0.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" rx="${(h / 2).toFixed(1)}"/>`);
    else if (l.bg !== false) out.push(`<rect class="tc-lbg" x="${x0.toFixed(1)}" y="${y0.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" rx="3"/>`);
    out.push(`<text class="tc-lab ${l.pill ? '' : l.cls}" x="${(x0 + (l.pill ? 5 : 2)).toFixed(1)}" y="${(y0 + h / 2 + f * 0.35).toFixed(1)}" font-size="${f}"${l.bold ? ' font-weight="700"' : ''}>${esc(l.text)}</text>`);
    if (l.pill) out.push('</g>');
  }
  return out.join('');
}

// ------------------------------------------------------------------ header + interactive mount
export function headHTML(rec) {
  const e = etc(rec.entry.t, rec.off);
  const kind = rec.exit.kind || rec.exit_kind;
  const lv = rec.levels || [];
  const swept = lv.slice(0, 3).map((l) => `${esc(l.label)} ${fpx(l.px)}`).join(', ') + (lv.length > 3 ? ` (+${lv.length - 3})` : '');
  return `<div class="tc-head"><div class="tc-h1"><b>${e.wd} ${esc(rec.day || e.date)} · ${pad2(e.h)}:${pad2(e.mi)} ET</b>`
    + `<span class="tc-side ${rec.d > 0 ? 'tc-long' : 'tc-short'}">${rec.side}</span>`
    + `<span class="tc-mut">${rec.qty} MNQ · $${Math.round(rec.risk_usd).toLocaleString('en-US')} at risk</span>`
    + `<span class="tc-res tc-k-${esc(kind)}">${esc(kind)} ${fusd(rec.pnl)} · ${fr(rec.r)}</span></div>`
    + `<div class="tc-h2">${swept ? `swept ${swept} · ` : ''}${rec.sweep ? `sweep ${fpx(rec.sweep.ext_px)} · ` : ''}`
    + `entry ${fpx(rec.entry.px)}${rec.entry_kind ? ` (${esc(rec.entry_kind)})` : ''} · stop ${fpx(rec.stop)} · target ${fpx(rec.target)}`
    + `${rec.target_label ? ` ${esc(rec.target_label)}` : ''} · exit ${fpx(rec.exit.px)} at ${hm(rec.exit.t_end, rec.off)}`
    + `${(rec.size_why || []).length ? ' · ' + esc(rec.size_why.join('; ')) : ''}</div></div>`;
}

export function mount(el, rec, { tf = '5m', height = null } = {}) {
  css();
  if (!rec._bars5) { rec._bars5 = unpack(rec.b5); rec._bars1 = unpack(rec.b1); }
  const has1 = rec._bars1 && rec._bars1.length > 0;
  const st = { tf: has1 ? tf : '5m', view: null, cross: null };
  el.innerHTML = `<div class="tc">${headHTML(rec)}<div class="tc-bar"><div class="tc-seg">`
    + `<button type="button" data-tf="5m">5m</button><button type="button" data-tf="1m"${has1 ? '' : ' disabled title="no 1m bars for this day"'}>1m</button></div>`
    + `<span class="tc-read tc-mut"></span><button type="button" class="tc-reset" title="reset zoom">Fit</button></div>`
    + `<div class="tc-plot"></div><div class="tc-legend tc-mut">${legend()}</div></div>`;
  const plot = el.querySelector('.tc-plot'), read = el.querySelector('.tc-read');
  const bars = () => (st.tf === '1m' ? rec._bars1 : rec._bars5);
  let W = 0, H = 0;
  const full = () => ({ i0: 0, i1: bars().length + (W < 520 ? 4 : 6) });
  function draw() {
    W = Math.max(280, Math.floor(plot.clientWidth || el.clientWidth || 360));
    H = height || Math.round(Math.max(240, Math.min(560, W * (W < 520 ? 0.78 : 0.5))));
    plot.innerHTML = svg(rec, { width: W, height: H, tf: st.tf, view: st.view, cross: st.cross });
    el.querySelectorAll('[data-tf]').forEach((b) => b.classList.toggle('on', b.dataset.tf === st.tf));
  }
  const pos = (ev) => { const r = plot.getBoundingClientRect(); return { x: ev.clientX - r.left, y: ev.clientY - r.top }; };
  const RA = () => (W < 520 ? 58 : 70);
  const xToI = (x) => { const v = st.view || full(); return v.i0 + (x - 4) * (v.i1 - v.i0) / (W - RA() - 4); };
  function zoom(f, cx) {
    const v = st.view || full(), n = bars().length, c = xToI(cx);
    let w = Math.max(12, Math.min(n + 12, (v.i1 - v.i0) * f));
    let a = c - (c - v.i0) * w / (v.i1 - v.i0);
    a = Math.max(-2, Math.min(n + 8 - w, a));
    st.view = { i0: a, i1: a + w }; draw();
  }
  function pan(dx) {
    const v = st.view || full(), n = bars().length, di = dx * (v.i1 - v.i0) / (W - RA() - 4);
    let a = Math.max(-2, Math.min(n + 8 - (v.i1 - v.i0), v.i0 - di));
    st.view = { i0: a, i1: a + (v.i1 - v.i0) }; draw();
  }
  function hover(p) {
    const i = Math.floor(xToI(p.x)), B = bars();
    if (i < 0 || i >= B.length) { st.cross = null; read.textContent = ''; draw(); return; }
    const b = B[i];
    st.cross = { i, y: p.y }; draw();
    read.textContent = `${hm(b.t, rec.off)} ET  O ${fpx(b.o)}  H ${fpx(b.h)}  L ${fpx(b.l)}  C ${fpx(b.c)}`;
  }
  const ptrs = new Map();
  let drag = null, pinch = null, lastTap = 0;
  const on = (t, f, o) => { plot.addEventListener(t, f, o); offs.push(() => plot.removeEventListener(t, f, o)); };
  const offs = [];
  on('wheel', (ev) => { ev.preventDefault(); zoom(ev.deltaY > 0 ? 1.18 : 1 / 1.18, pos(ev).x); }, { passive: false });
  on('pointerdown', (ev) => {
    ptrs.set(ev.pointerId, pos(ev));
    if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch = { d: Math.abs(a.x - b.x) || 1, c: (a.x + b.x) / 2 }; drag = null; }
    else { drag = { x: pos(ev).x, moved: false }; if (ev.pointerType === 'touch') hover(pos(ev)); }
    const now = Date.now(); if (now - lastTap < 300) { st.view = null; draw(); } lastTap = now;
  });
  on('pointermove', (ev) => {
    const p = pos(ev);
    if (ptrs.has(ev.pointerId)) ptrs.set(ev.pointerId, p);
    if (pinch && ptrs.size === 2) { const [a, b] = [...ptrs.values()], dd = Math.abs(a.x - b.x) || 1; zoom(pinch.d / dd, pinch.c); pinch.d = dd; return; }
    if (drag && ev.buttons && ev.pointerType === 'mouse') { const dx = p.x - drag.x; if (Math.abs(dx) > 2) { drag.moved = true; pan(dx); drag.x = p.x; } return; }
    hover(p);
  });
  const up = (ev) => { ptrs.delete(ev.pointerId); if (ptrs.size < 2) pinch = null; if (!ptrs.size) drag = null; };
  on('pointerup', up); on('pointercancel', up);
  on('pointerleave', () => { st.cross = null; read.textContent = ''; draw(); });
  el.querySelectorAll('[data-tf]').forEach((b) => b.addEventListener('click', () => { if (b.disabled) return; st.tf = b.dataset.tf; st.view = null; st.cross = null; draw(); }));
  el.querySelector('.tc-reset').addEventListener('click', () => { st.view = null; draw(); });
  let ro = null;
  if (typeof ResizeObserver !== 'undefined') { let w0 = 0; ro = new ResizeObserver(() => { const w = Math.floor(plot.clientWidth); if (w && w !== w0) { w0 = w; draw(); } }); ro.observe(plot); }
  draw();
  return { el, rec, setTf: (t) => { st.tf = t; st.view = null; draw(); }, redraw: draw, destroy: () => { ro && ro.disconnect(); offs.forEach((f) => f()); el.innerHTML = ''; } };
}

function legend() {
  const it = (c, t) => `<span><i class="${c}"></i>${t}</span>`;
  return it('tc-lg-tgt', 'target') + it('tc-lg-stp', 'stop') + it('tc-lg-lvl', 'swept level') + it('tc-lg-idm', 'inducement')
    + it('tc-lg-sw', 'sweep extreme') + it('tc-lg-cisd', 'CISD') + it('tc-lg-lim', 'limit') + it('tc-lg-be', 'breakeven');
}

// a "Chart" button for trade rows: <button class="tc-btn" data-chart="<id>">
export const button = (id, label = 'Chart') => `<button type="button" class="tc-btn" data-chart="${esc(id)}" aria-label="Open the trade chart">`
  + `<svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true"><path d="M2 13h12M4 10V5M8 11V3M12 9V6" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="round"/></svg>${esc(label)}</button>`;

let _css = false;
export function css() {
  if (_css || typeof document === 'undefined') return; _css = true;
  const s = document.createElement('style');
  s.id = 'tc-css';
  s.textContent = `
.tc{--tc-good:var(--good,#2ee59d);--tc-bad:var(--bad,#ff5a7a);--tc-warn:var(--warn,#f7b955);--tc-gold:var(--gold,#f2c35b);--tc-acc:var(--accent,var(--brand,#6d7cff));
 --tc-teal:var(--accent-2,#3ee0c8);--tc-ink:var(--ink,#eef1f8);--tc-ink2:var(--ink-2,#a9b1c3);--tc-mut:var(--muted,#6f788b);--tc-panel:#0b0e14;
 --tc-up:var(--candle-up,#2ebd8f);--tc-dn:var(--candle-down,#f0506e);color:var(--tc-ink);font-family:var(--sans,system-ui,sans-serif);min-width:0}
.tc-head{display:grid;gap:3px;margin-bottom:6px}
.tc-h1{display:flex;flex-wrap:wrap;align-items:center;gap:6px 10px;font-size:14px}
.tc-h1 b{font-weight:700}
.tc-h2{font-size:11.5px;color:var(--tc-ink2);line-height:1.45}
.tc-side{font-weight:800;letter-spacing:.04em;font-size:12px;padding:2px 8px;border-radius:999px}
.tc-long{color:var(--tc-good);background:color-mix(in srgb,var(--tc-good) 14%,transparent)}
.tc-short{color:var(--tc-bad);background:color-mix(in srgb,var(--tc-bad) 14%,transparent)}
.tc-res{margin-left:auto;font-weight:800;font-family:var(--mono,ui-monospace,monospace);font-size:13px}
.tc-mut{color:var(--tc-mut)}
.tc-bar{display:flex;align-items:center;gap:8px;margin:4px 0 6px;min-height:28px}
.tc-seg{display:inline-flex;border:1px solid var(--line,rgba(160,170,220,.14));border-radius:999px;padding:2px}
.tc-seg button,.tc-reset{appearance:none;border:0;background:transparent;color:var(--tc-ink2);font:600 12px var(--sans,system-ui);padding:5px 12px;border-radius:999px;cursor:pointer;min-height:26px}
.tc-seg button.on{background:var(--surface-3,#1e2330);color:var(--tc-ink)}
.tc-seg button:disabled{opacity:.35;cursor:not-allowed}
.tc-reset{margin-left:auto;border:1px solid var(--line,rgba(160,170,220,.14))}
.tc-read{font:11px var(--mono,ui-monospace,monospace);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0;flex:1}
.tc-plot{width:100%;touch-action:pan-y;user-select:none;-webkit-user-select:none;cursor:crosshair}
.tc-svg{display:block;width:100%;height:auto;overflow:visible}
.tc-bg{fill:var(--tc-panel)}
.tc-grid{stroke:rgba(160,170,220,.08);stroke-width:1}
.tc-t{font-family:var(--mono,ui-monospace,Menlo,monospace);fill:var(--tc-ink)}
.tc-ax{fill:var(--tc-mut)}
.tc-lab{font-family:var(--sans,system-ui,-apple-system,Segoe UI,sans-serif);font-weight:500;fill:var(--tc-ink);stroke:none}
.tc-svg .tc-mut{fill:var(--tc-mut)}
.tc-up{stroke:var(--tc-up);stroke-width:1}.tc-dn{stroke:var(--tc-dn);stroke-width:1}
.tc-upf{fill:var(--tc-up)}.tc-dnf{fill:var(--tc-dn)}
.tc-tgt{fill:color-mix(in srgb,var(--tc-good) 15%,transparent);stroke:color-mix(in srgb,var(--tc-good) 55%,transparent);stroke-width:1}
.tc-stp{fill:color-mix(in srgb,var(--tc-bad) 15%,transparent);stroke:color-mix(in srgb,var(--tc-bad) 55%,transparent);stroke-width:1}
.tc-entry{stroke:#d7dbe6;stroke-width:1.4}
.tc-path{stroke-width:1.2;stroke-dasharray:4 3;fill:none}
.tc-k-TARGET{stroke:var(--tc-good);color:var(--tc-good)}.tc-k-STOP{stroke:var(--tc-bad);color:var(--tc-bad)}
.tc-k-BE{stroke:var(--tc-ink2);color:var(--tc-ink2)}.tc-k-EOD{stroke:var(--tc-warn);color:var(--tc-warn)}.tc-k-OPEN{stroke:var(--tc-acc);color:var(--tc-acc)}
.tc-x{stroke-width:2.2;stroke-linecap:round;fill:none}
.tc-pill rect{fill:currentColor;stroke:none}.tc-pill text{fill:#0b0d12;stroke:none}
.tc-box{fill-opacity:.07;stroke-width:1;stroke-dasharray:3 3;stroke-opacity:.7}
.tc-box-Asia{fill:#6d7cff;stroke:#6d7cff;color:#8f9bff}.tc-box-London{fill:#f7b955;stroke:#f7b955;color:#f7b955}.tc-box-NY{fill:#3ee0c8;stroke:#3ee0c8;color:#3ee0c8}
text.tc-boxl{fill:currentColor;opacity:.9;stroke:none}
.tc-lvl{stroke-width:1.3;stroke-dasharray:6 4}.tc-bsl{stroke:var(--bsl,#ff9b5c)}.tc-ssl{stroke:var(--ssl,#6d9bff)}
.tc-l-bsl{fill:var(--bsl,#ff9b5c)}.tc-l-ssl{fill:var(--ssl,#6d9bff)}.tc-l-good{fill:var(--tc-good)}.tc-l-bad{fill:var(--tc-bad)}
.tc-l-warn{fill:var(--tc-warn)}.tc-l-gold{fill:var(--tc-gold)}.tc-l-acc{fill:#8f9bff}.tc-l-teal{fill:var(--tc-teal)}.tc-l-ink{fill:var(--tc-ink)}
.tc-lbg{fill:var(--tc-panel);fill-opacity:.82}
.tc-idm{stroke:var(--tc-gold);stroke-width:1.2;stroke-dasharray:1.5 2.5}.tc-idmm{fill:var(--tc-gold)}
.tc-sweep{fill:none;stroke:var(--tc-warn);stroke-width:1.8}
.tc-cisd{stroke:#8f9bff;stroke-width:1.6}.tc-cisd1{stroke-dasharray:5 2}.tc-conf{fill:#8f9bff}
.tc-limit{stroke:var(--tc-teal);stroke-width:1.3;stroke-dasharray:3 2}.tc-tap{fill:var(--tc-teal)}
.tc-fill{fill:#d7dbe6}.tc-be{fill:var(--tc-ink);stroke:var(--tc-panel);stroke-width:1}
.tc-cross{stroke:rgba(238,241,248,.35);stroke-width:1;stroke-dasharray:3 3}
.tc-tag-good rect{fill:var(--tc-good)}.tc-tag-bad rect{fill:var(--tc-bad)}.tc-tag-ink rect{fill:#d7dbe6}
.tc-tag-good text,.tc-tag-bad text,.tc-tag-ink text{fill:#0b0d12}
.tc-legend{display:flex;flex-wrap:wrap;gap:4px 12px;font-size:11px;margin-top:6px}
.tc-legend span{display:inline-flex;align-items:center;gap:5px}
.tc-legend i{display:inline-block;width:14px;height:8px;border-radius:2px}
.tc-lg-tgt{background:color-mix(in srgb,var(--tc-good) 45%,transparent)}.tc-lg-stp{background:color-mix(in srgb,var(--tc-bad) 45%,transparent)}
.tc-lg-lvl{height:0!important;border-top:2px dashed var(--ssl,#6d9bff)}.tc-lg-idm{height:0!important;border-top:2px dotted var(--tc-gold)}
.tc-lg-sw{width:8px!important;height:8px!important;border:2px solid var(--tc-warn);border-radius:50%!important}
.tc-lg-cisd{height:2px!important;background:#8f9bff}.tc-lg-lim{height:0!important;border-top:2px dashed var(--tc-teal)}
.tc-lg-be{width:8px!important;background:var(--tc-ink)}
.tc-btn{display:inline-flex;align-items:center;gap:5px;appearance:none;border:1px solid var(--line,rgba(160,170,220,.16));background:var(--surface-2,#161a23);
 color:var(--ink,#eef1f8);font:600 12px var(--sans,system-ui);padding:5px 10px;border-radius:999px;cursor:pointer;min-height:28px}
.tc-btn:hover{border-color:var(--accent,#6d7cff)}
`;
  document.head.appendChild(s);
}

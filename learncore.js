// Live learning renderer (2026-10-25, owner: the bots "should learn, like a human trader without emotion"). Shared by the
// phone app (tools/web_public/learning.js: Zlarior > Results > Learning, ATLAS > Results > Learning) and the PC dashboard
// (web_next/js/next/learning.js); web_next/js/next/learncore.js is a byte-identical copy (tests/test_learning_live.py).
// Data: engine/live_learning.py, phone data.json "learning_live" (site_block) or the PC's /api/next/pc/learning (view):
//   costs      the learned execution costs per bot (slippage ticks, latency, commission, the reserve sizing would use)
//   weekly     Mon-Fri summaries: live vs backtest gap in $ and R, missed / extra trades, slippage, inside the band?
//   suggest    "The bot suggests" cards (the learning loop's shadow knobs, the cost reserve): evidence, "would have
//              changed $X", the command that approves it. Nothing is applied from here.
//   reviews    one record per finished trade vs its backtest twin on the same bars
// Read-only. window.LearnUI.page(block, bots, opts) -> HTML; LearnUI.css is injected once.
(function () {
  'use strict';
  const NAMES = { lit: 'Zlarior', atlas: 'ATLAS', atlas_v2: 'ATLAS v2' };
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ok = (v) => v != null && v !== '' && !isNaN(v);
  const usd = (v) => !ok(v) ? '—' : (v < 0 ? '−$' : v > 0 ? '+$' : '$') + Math.abs(+v).toLocaleString('en-US', { maximumFractionDigits: 0 });
  const rr = (v) => !ok(v) ? '—' : (v > 0 ? '+' : '') + (+v).toFixed(2) + 'R';
  const tk = (v) => !ok(v) ? '—' : (v > 0 ? '+' : '') + (+v).toFixed(1) + ' t';
  const cl = (v) => !ok(v) ? '' : v > 0 ? 'up' : v < 0 ? 'dn' : '';
  const hm = (t) => { if (!t) return '—'; try { return new Date(t * 1000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/New_York' }); } catch (e) { return '—'; } };
  const CSS = `.ll-wrap{display:grid;gap:12px}.ll-card{border:1px solid var(--line,rgba(127,127,127,.25));border-radius:14px;padding:12px 14px;background:var(--card,transparent)}
.ll-h{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:0 0 8px}.ll-h h3{margin:0;font-size:15px}.ll-h span{font-size:12px;opacity:.7}
.ll-kv{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px}.ll-kv div{padding:8px;border-radius:10px;background:var(--soft,rgba(127,127,127,.08))}
.ll-kv b{display:block;font-size:16px}.ll-kv em{display:block;font-style:normal;font-size:11px;opacity:.7}
.ll-row{display:grid;grid-template-columns:1fr auto;gap:6px;padding:8px 0;border-top:1px solid var(--line,rgba(127,127,127,.18))}.ll-row:first-child{border-top:0}
.ll-row small{display:block;opacity:.75;font-size:12px;line-height:1.35}.ll-chip{font-size:11px;padding:2px 7px;border-radius:99px;background:var(--soft,rgba(127,127,127,.12));white-space:nowrap}
.ll-chip.good{background:rgba(40,170,90,.16)}.ll-chip.bad{background:rgba(220,70,60,.16)}.ll-chip.warn{background:rgba(230,160,30,.18)}
.ll-sug{border-left:3px solid rgba(230,160,30,.8);padding:8px 10px;margin:6px 0;border-radius:8px;background:var(--soft,rgba(127,127,127,.06))}
.ll-sug code{display:block;margin-top:6px;font-size:12px;white-space:pre-wrap;word-break:break-all}.ll-note{font-size:12px;opacity:.7;margin:6px 0 0}
.up{color:var(--up,#1f9d55)}.dn{color:var(--dn,#d0453a)}`;
  function css() {
    if (typeof document === 'undefined' || document.getElementById('ll-css')) return;
    const s = document.createElement('style'); s.id = 'll-css'; s.textContent = CSS; document.head.appendChild(s);
  }
  const reviewsOf = (B, bot) => { const R = B.reviews; if (Array.isArray(R)) return R.filter((r) => r.bot === bot); return (R && R[bot]) || []; };
  function costCard(B, bot) {
    const c = ((B.costs || {}).bots || {})[bot];
    if (!c) return bot === 'atlas_v2' ? '' : `<div class="ll-card"><div class="ll-h"><h3>Execution · ${esc(NAMES[bot])}</h3><span>real fills</span></div>
      <p class="ll-note">No real fills yet. Sizing assumes 1 tick of slippage and $1.90 a micro. The PC learns from every NinjaTrader fill.</p></div>`;
    const on = !!B.learn_costs;
    return `<div class="ll-card"><div class="ll-h"><h3>Execution · ${esc(NAMES[bot])}</h3><span class="ll-chip ${on ? 'good' : ''}">learn_costs ${on ? 'ON' : 'off'}</span></div>
      <div class="ll-kv"><div><b>${esc(c.fills || 0)}</b><em>real fills (last ${esc(c.window || 30)})</em></div>
        <div><b>${tk(c.entry_slip_ticks_med)}</b><em>entry slippage, median</em></div><div><b>${tk(c.stop_slip_ticks_med)}</b><em>stop slippage, median</em></div>
        <div><b>${ok(c.latency_route_s_med) ? (+c.latency_route_s_med).toFixed(1) + ' s' : '—'}</b><em>signal to order, median</em></div>
        <div><b>${ok(c.comm) ? '$' + (+c.comm).toFixed(2) : '—'}</b><em>commission a micro</em></div>
        <div><b>${ok(c.reserve_ticks) ? (+c.reserve_ticks).toFixed(0) + ' tick' + (+c.reserve_ticks === 1 ? '' : 's') : '—'}</b><em>cost reserve (1-4)</em></div></div>
      <p class="ll-note">${esc(c.text || '')} ${on ? 'Sizing uses it: only ever fewer micros.' : 'Not used for sizing (switch off): it would only ever mean fewer micros.'}</p></div>`;
  }
  function totalsCard(B, bots) {
    const T = B.totals || {};
    const rows = bots.filter((b) => T[b]).map((b) => { const t = T[b];
      return `<div class="ll-row"><div><b>${esc(NAMES[b])}</b><small>${esc(t.reviews)} reviewed (${esc(t.matched)} same trade, ${esc(t.missed)} missed, ${esc(t.extra)} extra) · ${esc(t.from || '')} → ${esc(t.to || '')}</small>
        <small>live ${usd(t.live_usd)} vs backtest ${usd(t.twin_usd)}</small></div><div class="${cl(t.gap_usd)}"><b>${usd(t.gap_usd)}</b><small>${rr(t.gap_r)} gap</small></div></div>`; });
    return `<div class="ll-card"><div class="ll-h"><h3>Live vs backtest</h3><span>same bars, same rules</span></div>${rows.join('') || '<p class="ll-note">No finished trade reviewed yet.</p>'}</div>`;
  }
  function weeklyCard(B, bots) {
    const W = (B.weekly || []).filter((w) => bots.some((b) => (w.bots || {})[b]));
    const band = (b) => !b || b.inside_band == null ? '' : `<span class="ll-chip ${b.inside_band ? 'good' : 'bad'}">${b.inside_band ? 'inside the band' : 'outside the band'}</span>`;
    return `<div class="ll-card"><div class="ll-h"><h3>Weekly reviews</h3><span>pushed Sunday evening</span></div>${W.slice(0, 6).map((w) => bots.filter((b) => (w.bots || {})[b]).map((b) => { const x = w.bots[b];
      return `<div class="ll-row"><div><b>${esc(w.label || w.week)} · ${esc(NAMES[b])}</b> ${w.final ? '' : '<span class="ll-chip">so far</span>'}<small>${esc(x.trades_live)} live vs ${esc(x.trades_twin)} backtest · live ${usd(x.live_usd)} vs ${usd(x.twin_usd)}${x.missed ? ` · ${esc(x.missed)} missed (${usd(-x.missed_usd)})` : ''}${x.extra ? ` · ${esc(x.extra)} extra (${usd(x.extra_usd)})` : ''}${ok(x.entry_slip_ticks_med) ? ` · fills ${tk(x.entry_slip_ticks_med)}` : ''}</small>
        ${x.band && x.band.text ? `<small>${esc(x.band.text)}</small>` : ''}</div><div class="${cl(x.gap_usd)}"><b>${usd(x.gap_usd)}</b><small>${rr(x.gap_r)}</small>${band(x)}</div></div>`; }).join('')).join('') || '<p class="ll-note">The first weekly review comes on Sunday evening.</p>'}</div>`;
  }
  function suggestCard(B, bots) {
    const S = (B.suggest || []).filter((s) => bots.includes(s.bot));
    return `<div class="ll-card"><div class="ll-h"><h3>The bot suggests</h3><span>nothing changes until you approve</span></div>${S.map((s) => `<div class="ll-sug"><b>${esc(s.title)}</b> <span class="ll-chip ${s.applied ? 'good' : 'warn'}">${s.applied ? 'applied' : 'suggestion'}</span>
      ${s.evidence ? `<small style="display:block;opacity:.8">${esc(s.evidence)}</small>` : ''}${s.would_text ? `<small style="display:block" class="${cl(s.would_usd)}">${esc(s.would_text)}</small>` : ''}
      ${s.note ? `<small style="display:block;opacity:.7">${esc(s.note)}</small>` : ''}${s.approve && !s.applied ? `<code>Approve: ${esc(s.approve)}</code>` : ''}${s.undo ? `<code>Undo: ${esc(s.undo)}</code>` : ''}</div>`).join('')
      || '<p class="ll-note">No suggestion right now: the evidence does not point at any change.</p>'}</div>`;
  }
  function reviewList(B, bots) {
    const R = bots.flatMap((b) => reviewsOf(B, b)).sort((a, b) => (b.entry_t || 0) - (a.entry_t || 0)).slice(0, 25);
    const st = (s) => s === 'matched' ? '<span class="ll-chip good">same trade</span>' : s === 'missed' ? '<span class="ll-chip bad">missed</span>' : '<span class="ll-chip warn">extra</span>';
    return `<div class="ll-card"><div class="ll-h"><h3>Trade reviews</h3><span>each trade vs its backtest twin</span></div>${R.map((r) => { const L = r.live || {}, T = r.twin || {};
      const ck = (r.checks || []).filter((c) => !c.ok);
      return `<div class="ll-row"><div><b>${esc(r.day)} ${hm(r.entry_t)} ${esc(r.side)} · ${esc(NAMES[r.bot] || r.bot)}${r.member_short ? ' ' + esc(r.member_short) : r.member ? ' ' + esc(r.member) : ''}</b> ${st(r.status)}
        <small>live ${L.exit_kind ? esc(L.exit_kind) + ' ' + usd(L.usd) : '—'} · backtest ${T.exit_kind ? esc(T.exit_kind) + ' ' + usd(T.usd) : '—'}${r.source === 'pc' ? ' · PC' : ''}</small>
        <small>${esc((r.notes || []).join('; '))}</small>
        <small>${r.cause ? 'cause: ' + esc(r.cause) + ' · ' : ''}MFE ${ok(r.mfe_r) ? (+r.mfe_r).toFixed(2) + 'R' : '—'} · MAE ${ok(r.mae_r) ? (+r.mae_r).toFixed(2) + 'R' : '—'}${r.checks ? ` · rules ${r.checks.length - ck.length}/${r.checks.length} ok` : ''}</small></div>
        <div class="${cl(r.gap_usd)}"><b>${usd(r.gap_usd)}</b><small>${rr(r.gap_r)}</small></div></div>`; }).join('') || '<p class="ll-note">No finished trade yet.</p>'}</div>`;
  }
  function page(B, bots, opts) {
    css();
    opts = opts || {};
    if (!B || B.error) return `<div class="ll-card"><p class="ll-note">${B && B.error ? 'Learning data unavailable: ' + esc(B.error) : 'No learning data yet. It fills in after the next cloud run (the PC adds its real fills).'}</p></div>`;
    return `<div class="ll-wrap">
      <div class="ll-card"><p class="ll-note" style="margin:0">Learns like a disciplined trader: measures the real fills and the gap to the backtest, and suggests. It never changes an entry, a stop or a target. The only automatic effect (switch <b>learn_costs</b>, ${B.learn_costs ? 'ON' : 'off'}) is a smaller size when real fills cost more than assumed.</p></div>
      ${totalsCard(B, bots)}${bots.map((b) => costCard(B, b)).join('')}${suggestCard(B, bots)}${weeklyCard(B, bots)}${reviewList(B, bots)}
      ${opts.foot ? `<p class="ll-note">${esc(opts.foot)}</p>` : ''}</div>`;
  }
  const api = { page, css, version: 1 };
  if (typeof window !== 'undefined') window.LearnUI = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();

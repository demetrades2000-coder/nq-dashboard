// Performance pages: the one renderer shared by the phone app (tools/web_public/perf.js) and the PC dashboard
// (web_next/js/next/perf.js loads web_next/js/next/perfcore.js, a byte-identical copy: tests/test_perf.py checks it).
// Classic script: window.PerfUI.render(el, P, opts). P = engine/perf.py view (data.json "perf" / GET /api/next/perf).
// Tabs: Range (is live inside the backtest's expected range), Live vs backtest, Exit efficiency, Robustness (+ the
// look-ahead audit), Months (out-of-sample scoreboard + walk-forward), Status (30-day uptime + incidents). Read-only.
(function () {
  'use strict';
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const n0 = (v, d = 0) => (v == null || isNaN(v)) ? '—' : Number(v).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
  const usd = (v) => (v == null || isNaN(v)) ? '—' : (v > 0 ? '+' : v < 0 ? '-' : '') + '$' + Math.abs(Math.round(v)).toLocaleString('en-US');
  const pct = (v, d = 0) => (v == null || isNaN(v)) ? '—' : n0(v, d) + '%';
  const fR = (v) => (v == null || isNaN(v)) ? '—' : (v > 0 ? '+' : '') + Number(v).toFixed(1) + 'R';
  const cl = (v) => v > 0 ? 'pf-up' : v < 0 ? 'pf-dn' : '';
  const C = { good: 'var(--good,#22c55e)', bad: 'var(--bad,#ef5350)', warn: 'var(--warn,#d4a72c)', mut: 'var(--muted,#8a93a6)', line: 'var(--line,rgba(140,150,170,.25))', acc: 'var(--accent,#6aa9ff)' };
  const LV = { good: C.good, warn: C.warn, bad: C.bad };
  const TABS = [['range', 'Range'], ['exec', 'Live vs backtest'], ['exit', 'Exit efficiency'], ['robust', 'Robustness'], ['months', 'Months'], ['status', 'Status']];
  const stat = (l, v, s, c) => `<div class="pf-stat"><span>${esc(l)}</span><b class="${c || ''}">${v}</b>${s ? `<em>${s}</em>` : ''}</div>`;
  const empty = (t, s) => `<div class="pf-card pf-empty"><b>${esc(t)}</b>${s ? `<p>${esc(s)}</p>` : ''}</div>`;
  const card = (h, body, cls) => `<div class="pf-card ${cls || ''}">${h ? `<h3>${h}</h3>` : ''}${body}</div>`;

  // ---- tiny SVG line chart: series [{pts:[[x,y]...], color, dash, w}], bands [{lo:[[x,y]], hi:[[x,y]], color, op}]
  function chart({ series = [], bands = [], W = 480, H = 230, xl = '', yfmt = usd, xfmt = (x) => x, zero = true, xs = null }) {
    const all = [...series.flatMap((s) => s.pts), ...bands.flatMap((b) => [...b.lo, ...b.hi])];
    if (!all.length) return '';
    const P = { l: 56, r: 12, t: 10, b: 26 };
    let x0 = Math.min(...all.map((p) => p[0])), x1 = Math.max(...all.map((p) => p[0]));
    let y0 = Math.min(...all.map((p) => p[1])), y1 = Math.max(...all.map((p) => p[1]));
    if (zero) { y0 = Math.min(0, y0); y1 = Math.max(0, y1); }
    if (x1 === x0) x1 = x0 + 1; if (y1 === y0) { y1 += 1; y0 -= 1; }
    const pad = (y1 - y0) * 0.06; y0 -= pad; y1 += pad;
    const X = (x) => P.l + (W - P.l - P.r) * (x - x0) / (x1 - x0), Y = (y) => P.t + (H - P.t - P.b) * (1 - (y - y0) / (y1 - y0));
    const path = (pts) => pts.map((p, i) => (i ? 'L' : 'M') + X(p[0]).toFixed(1) + ' ' + Y(p[1]).toFixed(1)).join(' ');
    const ticks = 4, yt = Array.from({ length: ticks + 1 }, (_, i) => y0 + (y1 - y0) * i / ticks);
    const xt = xs || Array.from({ length: 5 }, (_, i) => x0 + (x1 - x0) * i / 4);
    return `<svg class="pf-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="chart">
      ${yt.map((y) => `<line x1="${P.l}" x2="${W - P.r}" y1="${Y(y).toFixed(1)}" y2="${Y(y).toFixed(1)}" stroke="${C.line}" stroke-width="1"/><text x="${P.l - 6}" y="${(Y(y) + 3).toFixed(1)}" text-anchor="end" class="pf-ax">${esc(yfmt(y))}</text>`).join('')}
      ${zero && y0 < 0 && y1 > 0 ? `<line x1="${P.l}" x2="${W - P.r}" y1="${Y(0).toFixed(1)}" y2="${Y(0).toFixed(1)}" stroke="${C.mut}" stroke-width="1"/>` : ''}
      ${xt.map((x) => `<text x="${X(x).toFixed(1)}" y="${H - 8}" text-anchor="middle" class="pf-ax">${esc(xfmt(x))}</text>`).join('')}
      ${bands.map((b) => `<path d="${path(b.hi)} ${b.lo.slice().reverse().map((p) => 'L' + X(p[0]).toFixed(1) + ' ' + Y(p[1]).toFixed(1)).join(' ')} Z" fill="${b.color}" fill-opacity="${b.op || 0.15}" stroke="none"/>`).join('')}
      ${series.map((s) => `<path d="${path(s.pts)}" fill="none" stroke="${s.color}" stroke-width="${s.w || 2}" ${s.dash ? `stroke-dasharray="${s.dash}"` : ''} stroke-linejoin="round"/>${s.dots ? s.pts.map((p) => `<circle cx="${X(p[0]).toFixed(1)}" cy="${Y(p[1]).toFixed(1)}" r="3" fill="${s.color}"/>`).join('') : ''}`).join('')}
      ${xl ? `<text x="${W - P.r}" y="${H - 8}" text-anchor="end" class="pf-ax">${esc(xl)}</text>` : ''}</svg>`;
  }
  const legend = (items) => `<div class="pf-leg">${items.map(([c, l, d]) => `<span><i style="background:${c};${d ? 'height:2px;border-top:2px dashed ' + c + ';background:none' : ''}"></i>${esc(l)}</span>`).join('')}</div>`;

  // ---------------------------------------------------------------------------------------------- Range
  function rangeTab(P) {
    const R = P.range;
    if (!R || R.error) return empty('No expected-range band yet', R && R.error ? R.error : 'Run python -X utf8 -m engine.health_band build on the PC.');
    const main = (R.live && R.live.trades) ? R.live : R.paper;
    const block = (x) => {
      if (!x) return '';
      const col = LV[x.level] || C.mut;
      const br = x.band_r || {}, bu = x.band_usd || {}, bn = x.band_n || {};
      return `<div class="pf-card pf-hero" style="border-color:${col}"><div class="pf-eyebrow">${esc(x.label)} · since ${esc(x.start)} · ${x.sessions} session${x.sessions === 1 ? '' : 's'} · ${esc(x.band)} band</div>
        <div class="pf-verdict" style="color:${col}">${esc(x.text)}</div><p class="pf-note">${esc(x.detail || '')}</p>
        <div class="pf-stats">${stat('Trades', n0(x.trades), x.pct_n != null ? 'p' + n0(x.pct_n) + ' · normal ' + n0(bn.p5) + '-' + n0(bn.p95) : '')}
          ${stat('R so far', fR(x.r), x.pct_r != null ? 'p' + n0(x.pct_r) + ' (2026 band p' + n0(x.vs_2026) + ')' : '', cl(x.r))}
          ${stat('$ so far', usd(x.usd), x.pct_usd != null ? 'p' + n0(x.pct_usd) + ' · 90%: ' + usd(bu.p5) + ' to ' + usd(bu.p95) : '', cl(x.usd))}
          ${stat('Losing streak', n0(x.streak), x.p_streak != null ? `${n0(x.p_streak, 0)}% of 20-trade stretches have one this long` : 'no loss in a row now')}</div></div>`;
    };
    const cone = R.cone || { rows: [] }, rows = cone.rows || [];
    const lo = (i) => rows.map((r) => [r[0], r[i]]);
    const eq = (main && main.equity) || [];
    const live = eq.length ? [[0, 0], ...eq.map((e) => [e[0], e[2]])] : [];
    const B = R.bands || {}, h2 = B.H2 || {}, y = B['2026'] || {};
    return `${!R.live && !R.paper ? empty('No live trade since ' + (R.start || 'the LIT start') + ' yet', 'The PC\'s routed trades (and the cloud paper ledger on the phone) are placed in the band as soon as one finishes.') : ''}${block(R.live)}${R.live && R.paper ? block(R.paper) : (!R.live ? block(R.paper) : '')}
      ${card('Expected range from the eval start (H2 band, $ on the eval path)', chart({ bands: [{ lo: lo(1), hi: lo(5), color: C.acc, op: 0.12 }, { lo: lo(2), hi: lo(4), color: C.acc, op: 0.18 }],
        series: [{ pts: lo(3), color: C.mut, dash: '4 4', w: 1.5 }, ...(live.length ? [{ pts: live, color: LV[main.level] || C.good, w: 2.5, dots: live.length < 30 }] : [])], xl: 'sessions', xfmt: (x) => n0(x) })
        + legend([[C.acc, 'p5-p95 (outer) · p25-p75 (inner)'], [C.mut, 'median', 1], [LV[(main || {}).level] || C.good, (main || {}).label || 'live']])
        + `<p class="pf-note">The band is a bootstrap of the 2026 H2 sessions of run lit_live (${n0(h2.sessions)} sessions, ${n0(h2.trades)} trades, ${n0(h2.trades_per_week, 2)} a week, ${usd(h2.usd_eval_per_session)} a session on the eval path); all of 2026: ${n0(y.trades_per_week, 2)} a week, ${usd(y.usd_eval_per_session)} a session. Amber below p10, red below p5. It reports only: it never sizes or pauses the bot.</p>`)}`;
  }

  // ---------------------------------------------------------------------------------------------- Live vs backtest
  function execTab(P) {
    const E = P.exec;
    if (!E || E.error || !E.days || !E.days.length) return empty('No live trade audited yet', 'The PC fill audit (engine/fill_audit.py) re-runs the backtest on the same days after every routed trade; this chart fills in after the first one.');
    const d = E.days, xs = d.map((_, i) => i);
    const lab = (i) => (d[Math.round(i)] || d[d.length - 1])[0].slice(5);
    const parts = Object.entries(E.parts || {}), mx = Math.max(1, ...parts.map((p) => Math.abs(p[1])));
    return `${card('', `<div class="pf-verdict" style="font-size:18px">${esc(E.text)}</div>`)}
      <div class="pf-stats">${stat('Bot made', usd(E.live), (E.matched || 0) + ' matched · ' + (E.extra || 0) + ' extra', cl(E.live))}${stat('Backtest, same days', usd(E.bt), (E.missed || 0) + ' missed by the bot', cl(E.bt))}${stat('Gap', usd(E.gap), 'bot - backtest', cl(E.gap))}</div>
      ${card('What the bot made vs the backtest on the same days', chart({ series: [{ pts: d.map((r, i) => [i, r[1]]), color: C.mut, w: 2, dash: '5 4' }, { pts: d.map((r, i) => [i, r[2]]), color: C.good, w: 2.5 }], xfmt: lab, xs: xs.length > 6 ? [0, Math.round(xs.length / 3), Math.round(2 * xs.length / 3), xs.length - 1] : xs })
        + legend([[C.mut, 'backtest on the same days', 1], [C.good, 'what the bot made']]))}
      ${card('The gap explained', parts.map(([k, v]) => `<div class="pf-bar"><span>${esc(k)}</span><div><i style="width:${(50 * Math.abs(v) / mx).toFixed(1)}%;${v < 0 ? 'right:50%;background:' + C.bad : 'left:50%;background:' + C.good}"></i></div><b class="${cl(v)}">${usd(v)}</b></div>`).join('')
        + (E.missed_reasons ? `<p class="pf-note">Missed: ${Object.entries(E.missed_reasons).map(([k, v]) => `${esc(k)} (${v})`).join(' · ')}</p>` : '')
        + '<p class="pf-note">Slippage = worse fills on matched trades; other execution = a different exit or breakeven time; missed = backtest trades the bot did not take; extra = bot trades the backtest does not have.</p>')}`;
  }

  // ---------------------------------------------------------------------------------------------- Exit efficiency
  function exitTab(P) {
    const X = P.exit;
    if (!X || X.error || !X.y2026) return empty('No exit-efficiency data', 'Run python -X utf8 tools/trade_intel.py --exit-eff on the PC.');
    const y = X.y2026, sp = X.spans || {};
    const bt = (X.by_month || []).filter((m) => m.source === 'backtest');
    const lv = (X.by_month || []).filter((m) => m.source !== 'backtest');
    const mi = (m) => bt.findIndex((b) => b.month === m.month);
    const T = X.trades || [];
    const sc = (() => {
      const W = 480, H = 260, Pd = 36, pts = T.filter((t) => t[4] != null && t[3] != null && t[4] < 12);
      if (!pts.length) return '';
      const xm = Math.max(2, ...pts.map((t) => t[4])), ymn = Math.min(-1.2, ...pts.map((t) => t[3])), ymx = Math.max(xm, ...pts.map((t) => t[3]));
      const Xf = (v) => Pd + (W - Pd - 10) * v / xm, Yf = (v) => 10 + (H - Pd - 10) * (1 - (v - ymn) / (ymx - ymn));
      const col = { TARGET: C.good, STOP: C.bad, BE: C.warn, EOD: C.acc, CUT_T15: '#b48cff' };
      return `<svg class="pf-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="exit R vs best R"><line x1="${Pd}" y1="${Yf(0)}" x2="${W - 10}" y2="${Yf(0)}" stroke="${C.line}"/>
        <line x1="${Xf(0)}" y1="${Yf(0)}" x2="${Xf(Math.min(xm, ymx))}" y2="${Yf(Math.min(xm, ymx))}" stroke="${C.mut}" stroke-dasharray="4 4"/><text x="${Xf(Math.min(xm, ymx)) - 4}" y="${Yf(Math.min(xm, ymx)) + 12}" text-anchor="end" class="pf-ax">kept 100%</text>
        <text x="${W / 2}" y="${H - 6}" text-anchor="middle" class="pf-ax">best move (MFE, R) →</text><text x="12" y="${H / 2}" class="pf-ax" transform="rotate(-90 12 ${H / 2})" text-anchor="middle">exit R</text>
        ${pts.map((t) => `<circle cx="${Xf(t[4]).toFixed(1)}" cy="${Yf(t[3]).toFixed(1)}" r="${t[1] === 'backtest' ? 3 : 5}" fill="${col[t[2]] || C.mut}" fill-opacity="${t[1] === 'backtest' ? 0.7 : 1}" ${t[1] !== 'backtest' ? 'stroke="#fff" stroke-width="1"' : ''}/>`).join('')}</svg>`
        + legend(Object.entries(col).map(([k, c]) => [c, k]));
    })();
    const row = (s, l) => s && s.n ? `<tr><td>${esc(l)}</td><td>${s.n}</td><td>${pct(s.capture_sum)}</td><td>${pct(s.capture_up1_sum)}</td><td>${n0(s.n_up1)}</td><td>${fR(s.giveback_avg)}</td><td>${n0(s.gave_back)}</td><td>${fR(s.loss_mfe_avg)}</td></tr>` : '';
    return `${card('', `<div class="pf-verdict" style="font-size:17px">${esc(X.text || '')}</div>`)}
      <div class="pf-stats">${stat('Open profit kept', pct(y.capture_sum), '2026, all trades')}${stat('Kept after +1R', pct(y.capture_up1_sum), y.n_up1 + ' trades reached +1R')}
        ${stat('Giveback after +1R', fR(y.giveback_avg), y.gave_back + ' ended under +0.5R')}${stat('Losers were up', fR(y.loss_mfe_avg), 'before the stop (avg)')}</div>
      ${card('Capture % by month (open profit kept)', chart({ series: [{ pts: bt.map((m, i) => [i, m.capture_sum ?? 0]), color: C.acc, w: 2.5, dots: true }, { pts: bt.map((m, i) => [i, m.capture_up1_sum ?? 0]), color: C.good, w: 1.5, dash: '4 4', dots: true },
        ...(lv.length ? [{ pts: lv.map((m) => [Math.max(0, mi(m) < 0 ? bt.length : mi(m)), m.capture_sum ?? 0]), color: C.warn, w: 0.01, dots: true }] : [])],
        yfmt: (v) => n0(v) + '%', xfmt: (i) => (bt[Math.round(i)] || {}).month ? bt[Math.round(i)].month.slice(2) : '', xs: bt.map((_, i) => i).filter((i) => bt.length < 8 || i % 2 === 0) })
        + legend([[C.acc, 'all trades'], [C.good, 'trades that reached +1R', 1], ...(lv.length ? [[C.warn, 'paper / live']] : [])]))}
      ${card('By exit type (2026 backtest)', `<div class="pf-tw"><table class="pf-t"><thead><tr><th>Exit</th><th>n</th><th>Kept</th><th>Kept after +1R</th><th>+1R</th><th>Giveback</th><th>Ended &lt; 0.5R</th><th>Losers' best</th></tr></thead><tbody>
        ${(X.by_exit || []).map((s) => row(s, s.exit)).join('')}${row(sp.H1, '2026 H1')}${row(sp.H2, '2026 H2')}${row(sp['2021-25'], '2021-25 (ref)')}${row(sp.paper, 'Paper')}${row(sp.live, 'Live')}</tbody></table></div>`)}
      ${card('Exit R vs the best move (each trade)', sc + '<p class="pf-note">On the dashed line a trade kept all of its best move. Breakeven exits (amber) sit at 0 after reaching +1R: that is the giveback the breakeven rule accepts to cut losers. It explains the rules; it is not a rule.</p>')}`;
  }

  // ---------------------------------------------------------------------------------------------- Robustness
  function robustTab(P) {
    const R = P.robust, L = P.lookahead;
    let h = '';
    if (!R || R.error) h += empty('No robustness card yet', 'Run python -X utf8 tools/lit_robust.py on the PC (~5 min).');
    else {
      const T = R.tests || {}, ids = Object.keys(T);
      const rng = (a, lo, hi, f) => a == null ? '—' : f(a) + (lo != null && hi != null && lo !== hi ? ` <span class="pf-mut">(${f(lo)}-${f(hi)})</span>` : '');
      const bar = (t) => { const a = t['2026'] || {}, lo = Math.max(0, Math.min(130, a.keep_p10 ?? a.keep)), hi = Math.max(0, Math.min(130, a.keep_p90 ?? a.keep)), m = Math.max(0, Math.min(130, a.keep));
        const c = m >= 85 ? C.good : m >= 70 ? C.warn : C.bad;
        return `<div class="pf-keep"><i style="left:${(lo / 1.3).toFixed(1)}%;width:${Math.max(0.8, (hi - lo) / 1.3).toFixed(1)}%;background:${c};opacity:.35"></i><b style="left:${(m / 1.3).toFixed(1)}%;background:${c}"></b><u style="left:${(100 / 1.3).toFixed(1)}%"></u></div>`; };
      h += card('', `<div class="pf-verdict" style="font-size:17px">${esc((R.card || {}).headline || '')}</div><p class="pf-note">Base: 2026 ${usd(((R.base || {})['2026'] || {}).net)}, PF ${n0(((R.base || {})['2026'] || {}).pf, 2)}, 2-week pass/fail ${n0(((R.base || {})['2026'] || {}).p10, 1)}/${n0(((R.base || {})['2026'] || {}).f10, 1)}% (LIT size rule = run lit_live).</p>`)
        + card('Each stress test (2026; % of the $ kept, PF and 2-week eval pass / fail, p10-p90 over the copies)', `<div class="pf-tw"><table class="pf-t"><thead><tr><th>Test</th><th>Copies</th><th style="min-width:130px">$ kept (0-130%)</th><th>Kept</th><th>H1 / H2</th><th>PF</th><th>2-wk pass</th><th>2-wk fail</th></tr></thead><tbody>
          ${ids.map((k) => { const t = T[k], a = t['2026'] || {}; return `<tr><td>${esc(t.label)}</td><td>${t.reps}</td><td>${bar(t)}</td><td>${rng(a.keep, a.keep_p10, a.keep_p90, (v) => n0(v) + '%')}</td><td>${pct((t.H1 || {}).keep)} / ${pct((t.H2 || {}).keep)}</td><td>${rng(a.pf, a.pf_p10, a.pf_p90, (v) => n0(v, 2))}</td><td>${rng(a.p10, a.p10_lo, a.p10_hi, (v) => n0(v, 1) + '%')}</td><td>${rng(a.f10, a.f10_lo, a.f10_hi, (v) => n0(v, 1) + '%')}</td></tr>`; }).join('')}</tbody></table></div>
          <p class="pf-note">${esc(R.method || '')} Built ${esc((R.built || '').slice(0, 16))}. Honest evidence of how fragile the strategy is; it changes nothing live.</p>`);
    }
    if (L && !L.error && L.summary) {
      const s = L.summary;
      h += card('Look-ahead check of the stored research runs', `<div class="pf-verdict" style="font-size:16px;color:${s.flag ? C.bad : C.good}">${s.flag ? '✗ ' + s.flag + ' run(s) flagged' : '✓ no run flagged'}</div><p class="pf-note">${esc(s.text)}</p>
        ${Object.entries(L.badges || {}).map(([k, b]) => `<div class="pf-badge">${esc(k)}: ${esc(b)}</div>`).join('')}
        ${(L.flagged || []).map((f) => `<div class="pf-inc bad"><b>${esc(f.id)}</b> ${esc(f.title || '')}<br>${(f.trades || []).map((t) => `${esc(t.day)}: ${esc((t.diff || []).join(', '))}`).join('<br>')}</div>`).join('')}
        <p class="pf-note">${esc(L.method || '')}</p>`);
    }
    return h;
  }

  // ---------------------------------------------------------------------------------------------- Months
  function monthsTab(P) {
    const M = P.months;
    if (!M || M.error || !M.rows) return empty('No monthly scoreboard yet', 'Run python -X utf8 tools/lit_walkforward.py on the PC (~1 min).');
    const R = M.rows, ex = M.expect || {}, wf = M.wf || {};
    const has = (k) => R.some((r) => r[k] != null);
    const td = (v) => `<td class="${cl(v)}">${v == null ? '—' : usd(v)}</td>`;
    const bt = R.filter((r) => r.bt != null);
    const cum = (k) => { let c = 0; return bt.map((r, i) => [i, (c += (r[k] ?? 0))]); };
    const wfp = (() => { let c = 0; const o = []; bt.forEach((r, i) => { if (r.wf != null) { c += r.wf; o.push([i, c]); } }); return o; })();
    const fixd = (() => { let c = 0; const o = []; bt.forEach((r, i) => { if (r.wf != null) { c += r.bt; o.push([i, c]); } }); return o; })();
    return `${card('', `<div class="pf-verdict" style="font-size:17px">${esc(M.text || '')}</div><p class="pf-note">Expected: ${esc(ex.note || '')}. Quote the H2 rate.</p>`)}
      ${card('Walk-forward: re-picked every month vs the fixed live config (Feb-Oct, $ cumulative)', chart({ series: [{ pts: fixd, color: C.good, w: 2.5, dots: true }, { pts: wfp, color: C.warn, w: 2, dash: '5 4', dots: true }],
        xfmt: (i) => (bt[Math.round(i)] || {}).month ? bt[Math.round(i)].month.slice(5) : '', xs: bt.map((_, i) => i).filter((i) => i >= 1) })
        + legend([[C.good, 'fixed live config'], [C.warn, 'walk-forward (pick on all months before)', 1]])
        + `<p class="pf-note">Walk-forward ${usd(wf.wf)} vs fixed ${usd(wf.live)}: re-picking beat the fixed config in ${n0(wf.beats_live)} of ${R.filter((r) => r.wf != null).length} months. ${M.batch3b ? `Batch 3b's 3-month rolling walk-forward (combo grid, ${esc(M.batch3b.lit.from)}..${esc(M.batch3b.lit.to)}): ${usd(M.batch3b.lit.wf)} vs fixed ${usd(M.batch3b.lit.fixed)}.` : ''}</p>`)}
      ${card('Month by month', `<div class="pf-tw"><table class="pf-t"><thead><tr><th>Month</th><th>Backtest $</th><th>PF</th><th>Trades</th><th>Win %</th>${has('eval') ? '<th>Eval path $</th>' : ''}<th>Walk-fwd $</th>${has('paper') ? '<th>Paper $</th>' : ''}${has('live') ? '<th>Live $</th>' : ''}${has('replay') ? '<th>Replay same days</th>' : ''}</tr></thead><tbody>
        ${R.map((r) => `<tr><td>${esc(r.month)}</td>${td(r.bt)}<td>${r.bt_pf == null ? '—' : n0(r.bt_pf, 2)}</td><td>${n0(r.bt_n)}</td><td>${pct(r.bt_win)}</td>${has('eval') ? td(r.eval) : ''}${td(r.wf)}${has('paper') ? td(r.paper) + '' : ''}${has('live') ? td(r.live) : ''}${has('replay') ? td(r.replay) : ''}</tr>`).join('')}</tbody></table></div>
        <p class="pf-note">${esc(M.method || '')}</p>`)}`;
  }

  // ---------------------------------------------------------------------------------------------- Status
  function statusTab(P) {
    const S = P.status;
    if (!S || S.error) return empty('No status data', S && S.error ? S.error : '');
    const col = { up: C.good, down: C.bad, degraded: C.warn, unknown: C.mut };
    const sq = (v) => `<i title="${v[0]}: ${v[1] == null ? 'no data' : v[1] + '%'}" style="background:${v[1] == null ? C.line : v[1] >= 99 ? C.good : v[1] >= 90 ? C.warn : C.bad}"></i>`;
    const watched = (S.parts || []).some((p) => p.uptime != null);
    return `${card('', `<div class="pf-verdict" style="font-size:18px;color:${S.level === 'bad' ? C.bad : S.level === 'good' ? C.good : C.mut}">${esc(S.text)}</div><p class="pf-note">Watched ${esc(S.window)}. ${watched ? '' : 'Samples start with the next cloud run / heartbeat in the window.'}</p>`)}
      ${card('Parts (30 days, one square a weekday)', (S.parts || []).map((p) => `<div class="pf-part"><span class="pf-dot" style="background:${col[p.state] || C.mut}"></span><div class="pf-pl"><b>${esc(p.label)}</b><em>${esc(p.state)}${p.since_hm ? ' since ' + esc(p.since_hm) + ' ET' : ''} · ${p.uptime == null ? 'no data' : n0(p.uptime, 2) + '% up'}${p.watched_h ? ' · ' + n0(p.watched_h, 1) + ' h watched' : ''}</em></div><div class="pf-sq">${(p.days || []).map(sq).join('')}</div></div>`).join(''))}
      ${card('Incidents', (S.incidents || []).length ? (S.incidents || []).map((i) => `<div class="pf-inc ${i.open ? 'bad' : ''}"><b>${esc(i.start_hm)}${i.end_hm ? ' - ' + esc(i.end_hm.slice(-5)) : ' - now'} ET · ${esc(i.label || i.part)}</b> (${n0(i.mins)} min): ${esc(i.what)}${i.info ? ' (' + esc(i.info) + ')' : ''}<br><span class="pf-mut">Fix: ${esc(i.fix || '')}</span></div>`).join('') : '<p class="pf-note">No incident in the last 30 days.</p>')}`;
  }

  const CSS = `.pf-tabs{display:flex;gap:6px;flex-wrap:wrap;margin:0 0 12px}.pf-tabs button{border:1px solid ${C.line};background:transparent;color:inherit;border-radius:999px;padding:6px 12px;font:inherit;font-size:13px;cursor:pointer}
.pf-tabs button.on{background:color-mix(in srgb,${C.acc} 22%,transparent);border-color:${C.acc}}
.pf-card{border:1px solid ${C.line};border-radius:14px;padding:14px 16px;margin:0 0 12px;background:color-mix(in srgb,${C.line} 18%,transparent)}.pf-card h3{margin:0 0 10px;font-size:14px}
.pf-empty b{display:block;margin-bottom:4px}.pf-empty p,.pf-note{margin:6px 0 0;font-size:12.5px;line-height:1.5;opacity:.78}.pf-mut{opacity:.65}
.pf-hero{border-width:1.5px}.pf-eyebrow{font-size:11.5px;letter-spacing:.04em;text-transform:uppercase;opacity:.7}.pf-verdict{font-size:22px;font-weight:750;line-height:1.25;margin:6px 0 4px}
.pf-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px;margin:10px 0 12px}.pf-stat{border:1px solid ${C.line};border-radius:12px;padding:9px 11px;min-width:0}
.pf-stat span{display:block;font-size:11.5px;opacity:.7}.pf-stat b{display:block;font-size:19px;margin-top:2px}.pf-stat em{display:block;font-style:normal;font-size:11.5px;opacity:.7;margin-top:2px}
.pf-up{color:${C.good}}.pf-dn{color:${C.bad}}.pf-svg{width:100%;max-width:820px;max-height:340px;height:auto;display:block}.pf-ax{font-size:10.5px;fill:${C.mut}}
.pf-leg{display:flex;gap:14px;flex-wrap:wrap;font-size:12px;opacity:.85;margin-top:6px}.pf-leg i{display:inline-block;width:14px;height:8px;border-radius:2px;margin-right:6px;vertical-align:middle}
.pf-bar{display:grid;grid-template-columns:120px 1fr 80px;gap:10px;align-items:center;margin:6px 0;font-size:13px}.pf-bar div{position:relative;height:12px;border-radius:6px;background:${C.line}}.pf-bar i{position:absolute;top:0;height:12px;border-radius:6px}.pf-bar b{text-align:right}
.pf-tw{overflow-x:auto}.pf-t{width:100%;border-collapse:collapse;font-size:12.5px}.pf-t th,.pf-t td{padding:6px 8px;border-bottom:1px solid ${C.line};text-align:left;white-space:nowrap}.pf-t th{font-weight:600;opacity:.8}.pf-t td:first-child{white-space:normal;min-width:110px}
.pf-keep{position:relative;height:14px;border-radius:7px;background:${C.line}}.pf-keep i{position:absolute;top:0;height:14px;border-radius:7px}.pf-keep b{position:absolute;top:-2px;width:3px;height:18px;border-radius:2px;margin-left:-1px}.pf-keep u{position:absolute;top:-3px;width:1px;height:20px;background:${C.mut}}
.pf-part{display:grid;grid-template-columns:12px minmax(120px,1fr) auto;gap:10px;align-items:center;padding:8px 0;border-bottom:1px solid ${C.line}}.pf-part:last-child{border-bottom:0}.pf-dot{width:10px;height:10px;border-radius:50%}
.pf-pl b{display:block;font-size:13.5px}.pf-pl em{display:block;font-style:normal;font-size:12px;opacity:.72}.pf-sq{display:flex;gap:2px;flex-wrap:wrap;justify-content:flex-end;max-width:300px}.pf-sq i{width:9px;height:18px;border-radius:2px;display:inline-block}
.pf-inc{font-size:12.5px;line-height:1.5;padding:8px 10px;border-left:3px solid ${C.warn};margin:6px 0;border-radius:4px;background:color-mix(in srgb,${C.warn} 7%,transparent)}.pf-inc.bad{border-left-color:${C.bad};background:color-mix(in srgb,${C.bad} 8%,transparent)}
.pf-badge{font-size:12.5px;margin:4px 0}@media (max-width:520px){.pf-bar{grid-template-columns:90px 1fr 64px}.pf-sq{max-width:150px}.pf-verdict{font-size:19px}.pf-part{grid-template-columns:12px 1fr}.pf-sq{grid-column:2;justify-content:flex-start;max-width:none}}`;
  function css() { if (!document.getElementById('pf-css')) { const s = document.createElement('style'); s.id = 'pf-css'; s.textContent = CSS; document.head.appendChild(s); } }

  const RENDER = { range: rangeTab, exec: execTab, exit: exitTab, robust: robustTab, months: monthsTab, status: statusTab };
  function render(el, P, opts) {
    css();
    opts = opts || {};
    let tab = opts.tab && RENDER[opts.tab] ? opts.tab : 'range';
    const draw = () => {
      let body;
      try { body = P ? RENDER[tab](P) : empty('No performance data in this build'); } catch (e) { body = empty('This page failed to draw', String(e && e.message || e)); }
      el.innerHTML = `<div class="pf-tabs" role="tablist">${TABS.map(([k, l]) => `<button type="button" role="tab" data-t="${k}" class="${k === tab ? 'on' : ''}">${esc(l)}</button>`).join('')}</div><div class="pf-body">${body}</div>`;
      el.querySelectorAll('.pf-tabs button').forEach((b) => b.addEventListener('click', () => { tab = b.dataset.t; if (opts.onTab) opts.onTab(tab); draw(); }));
    };
    draw();
  }
  window.PerfUI = { render, TABS, version: 1 };
})();

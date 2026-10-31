// ATLAS (the second strategy: EMA + MACD + S/R, the 25K account; internal key "second") pages: the one renderer shared by the phone app (tools/web_public/second.js) and the PC
// dashboard (web_next/js/next/second.js loads web_next/js/next/secondcore.js, a byte-identical copy: tests/test_second.py
// checks it). Classic script: window.SecondUI.render(el, S, opts). S = engine/second.dashboard_block (data.json "second" /
// GET /api/next/second), opts.live = the PC's live cut (engine/second.compact from live.json / the heartbeat) laid over
// the state when newer. Per strategy: the rules in plain words, today's state (waiting for / armed / in trade / done), the
// paper trades and $, and the research numbers H1 / H2 / 2025 / 2021-24 alone and "with LIT" on one account. Read-only.
// v6 (2026-10-23): "Candidate members (paper)" on the ATLAS page: the stop hunts (sh_asia, sh_trend; candCard) with their
// brain, own go / no-go, paper trades, rules, research numbers and the 25K eval paths as an ATLAS member.
// v7 (2026-10-23): trade pictures (engine/trade_chart.py via tradepics.js, window.TradePics): each brain card and candidate
// card shows its member's latest trade picture (tap = full screen, pinch-zoom, swipe between trades), the ATLAS page a
// "Trade pictures" strip; opts.charts = data.json "charts" (phone) / GET /api/next/charts (PC).
// v8 (2026-10-25): "ATLAS v2 (paper shadow)" card on the ATLAS page (atlasV2Card, S.atlas_v2 = engine/atlas_v2.card): hunt
// trades so far / 20, paper $ vs the research band, the shadow 25K eval's progress, its trades. Read-only, never routed.
// 2026-10-26: ATLAS's funded account (engine/account_b.py stage "funded", ab.stage / ab.funded): the account card shows
// the MFFU payout tracker (balance, payout line, buffer, best day vs 50%, eligibility, payouts n/5; fundedB), Home's card
// says FUNDED. Same file name and ?v=8 (the phone's le-public-v38 cache refreshes it).
(function () {
  'use strict';
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const n0 = (v, d = 0) => (v == null || isNaN(v)) ? '—' : Number(v).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
  const usd = (v) => (v == null || isNaN(v)) ? '—' : (v > 0 ? '+' : v < 0 ? '-' : '') + '$' + Math.abs(Math.round(v)).toLocaleString('en-US');
  const fR = (v) => (v == null || isNaN(v)) ? '—' : (v > 0 ? '+' : '') + Number(v).toFixed(2) + 'R';
  const cl = (v) => v > 0 ? 'sc-up' : v < 0 ? 'sc-dn' : '';
  const hm = (t) => t ? new Date(t * 1000).toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour: '2-digit', minute: '2-digit', hour12: false }) : '—';
  const px = (v) => (v == null || isNaN(v)) ? '—' : Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const C = { good: 'var(--good,#22c55e)', bad: 'var(--bad,#ef5350)', warn: 'var(--warn,#d4a72c)', mut: 'var(--muted,#8a93a6)', line: 'var(--line,rgba(140,150,170,.25))', acc: 'var(--accent,#6aa9ff)' };
  const STAGE = { waiting: ['Waiting', C.mut], armed: ['Armed', C.warn], in_trade: ['In a trade', C.acc], done: ['Done today', C.good], off: ['Off hours', C.mut], error: ['Error', C.bad] };
  const PER = [['H1', '2026 H1 (picked)'], ['H2', '2026 H2 (check)'], ['2025', '2025'], ['2021-24', '2021-24']];
  // ---------------------------------------------------------------- trade pictures (tradepics.js; nothing when it is not loaded)
  let PICS = null;
  const TP = () => window.TradePics || null;
  function pics(key, empty) {
    const T = TP();
    if (!T || !PICS) return '';
    return T.latest(PICS, key, { empty: empty === false ? '' : 'No trade picture yet: the first paper trade of this strategy gets one at its entry.' });
  }

  function stateBox(s, src) {
    const st = s || {};
    const [lab, col] = STAGE[st.stage] || ['—', C.mut];
    return `<div class="sc-state" style="border-color:${col}"><span class="sc-pill" style="background:${col}">${esc(lab)}</span>
      <b>${esc(st.text || 'No run yet: the cloud / PC bot fills this in its next run.')}</b>
      <em>${st.day ? 'Session ' + esc(st.day) : ''}${st.window ? ' · entries ' + esc(st.window) : ''}${src ? ' · from the ' + esc(src) : ''}</em></div>`;
  }
  function btTable(bt, lab) {
    if (!bt || bt.error) return `<p class="sc-note">Backtest numbers unavailable${bt && bt.error ? ': ' + esc(bt.error) : ''}.</p>`;
    const row = (lab, x) => !x ? `<tr><td>${esc(lab)}</td><td colspan="7" class="sc-mut">—</td></tr>`
      : `<tr><td>${esc(lab)}</td><td>${n0(x.n)}</td><td>${n0(x.tpw, 2)}</td><td>${n0(x.win, 1)}%</td><td>${n0(x.pf, 2)}</td><td class="${cl(x.net)}">${usd(x.net)}</td><td class="${cl(x.per_month)}">${usd(x.per_month)}</td><td>${usd(x.dd)}</td></tr>`;
    const head = '<tr><th>Period</th><th>Trades</th><th>/week</th><th>Win</th><th>PF</th><th>Net $</th><th>$/month</th><th>Max DD</th></tr>';
    const own = PER.map(([k, l]) => row(l, (bt.own || {})[k])).join('');
    const wl = PER.map(([k, l]) => row(l + ' · LIT + it', (bt.with_lit || {})[k]) + row(l + ' · LIT alone', (bt.lit_only || {})[k])).join('');
    const ev = bt.eval_with_lit || {};
    const evl = ['H1', 'H2'].filter((k) => ev[k]).map((k) => `${k}: 2-week pass/fail ${n0(ev[k].p10, 1)}/${n0(ev[k].f10, 1)}%, 1 month ${n0(ev[k].p20, 1)}/${n0(ev[k].f20, 1)}%`).join(' · ');
    return `<h4>Backtest at $500 risk a trade (costs in)</h4><div class="sc-tw"><table class="sc-t"><thead>${head}</thead><tbody>${own}</tbody></table></div>
      <h4>With LIT on one account (LIT first, no entry while LIT is in a trade, max 2 a day)${lab ? ' · ' + esc(lab) : ''}</h4>
      <div class="sc-tw"><table class="sc-t"><thead>${head}</thead><tbody>${wl}</tbody></table></div>
      ${evl ? `<p class="sc-note">MFFU 50K eval with LIT: ${esc(evl)}</p>` : ''}
      <p class="sc-note">Picked on 2026 H1 only; H2 is the untouched check; 2025 and 2021-24 are references. Run ${esc(bt.run || '—')}${bt.writeup ? ` · write-up <a href="#/writeup/${encodeURIComponent(bt.writeup)}">${esc(bt.writeup)}</a>` : ''}.</p>`;
  }
  function trades(rows) {
    if (!rows || !rows.length) return '<p class="sc-note">No paper trades yet (the ledger starts on the first cloud run with ATLAS on).</p>';
    const body = rows.slice().sort((a, b) => (b.entry_t || 0) - (a.entry_t || 0)).slice(0, 40).map((t) => {
      const L = t.lit || {};
      const open = t.exit_kind === 'OPEN';
      return `<tr><td>${esc(t.day || '')} ${hm(t.entry_t)}</td><td>${t.dir > 0 ? 'LONG' : 'SHORT'}</td><td>${n0(t.qty)}</td><td>${px(t.entry)}</td><td>${px(open ? t.stop_now : t.stop)}</td><td>${px(t.target)}</td>
        <td>${open ? 'open · last ' + px(t.last) : esc(t.exit_kind || '')}</td><td class="${cl(t.r)}">${fR(t.r)}</td><td class="${cl(t.usd)}">${usd(t.usd)}</td>
        <td>${L.taken === false ? '<span class="sc-mut">skipped: ' + esc(L.why || '') + '</span>' : L.taken ? usd(L.usd) + (L.why ? ' <span class="sc-mut">(' + esc(L.why) + ')</span>' : '') : '—'}</td></tr>`;
    }).join('');
    return `<div class="sc-tw"><table class="sc-t"><thead><tr><th>Entry (ET)</th><th>Side</th><th>Micros</th><th>Entry</th><th>Stop</th><th>Target</th><th>Exit</th><th>R</th><th>$ (own)</th><th>With LIT</th></tr></thead><tbody>${body}</tbody></table></div>`;
  }
  // ---------------------------------------------------------------- go / no-go scorecard (engine/second_scorecard.py)
  // sc = {n, need, cum_r, usd, win, pf, pct, kind: collecting | on_track | below | ready, text, expected: {cum_r: [p5, p10,
  // p50, p90], usd, win, pf}, bad_year: {cum_r: [p10, p50, p90]}, like_2025}
  const SCK = { collecting: ['Collecting', C.mut], on_track: ['On track', C.acc], below: ["Below range: don't go live", C.bad], ready: ['Ready', C.good] };
  function scoreBox(sc, title) {
    if (!sc) return '';
    if (sc.error) return `<p class="sc-note">Scorecard unavailable: ${esc(sc.error)}</p>`;
    const [lab, col] = SCK[sc.kind] || ['—', C.mut];
    const e = sc.expected || {}, b = sc.bad_year || {};
    const er = sc.n && e.cum_r ? `${fR(e.cum_r[1])} to ${fR(e.cum_r[3])} (median ${fR(e.cum_r[2])})` : '—';
    const br = sc.n && b.cum_r ? `median ${fR(b.cum_r[1])}` : '—';
    const pct = Math.max(0, Math.min(100, sc.n ? Number(sc.pct || 0) : 0));
    return `<div class="sc-state sc-go" style="border-color:${col}"><span class="sc-pill" style="background:${col}">${esc(lab)}</span>
      <b>${esc(title || 'Go / no-go')}: ${esc(sc.text || '')}</b>
      <div class="sc-stats"><div class="sc-stat"><span>Paper trades</span><b>${n0(sc.n)}<small>/${n0(sc.need || 20)}</small></b><em>finished</em></div>
        <div class="sc-stat"><span>Cumulative R</span><b class="${cl(sc.cum_r)}">${fR(sc.cum_r)}</b><em>${sc.n ? 'p' + n0(sc.pct) + ' of the expected' : 'no trades yet'}</em></div>
        <div class="sc-stat"><span>Win · PF</span><b>${sc.win == null ? '—' : n0(sc.win, 0) + '%'} · ${sc.pf == null ? '—' : n0(sc.pf, 2)}</b><em>${e.win && sc.n ? 'expected ' + n0(e.win[1], 0) + '% · PF ' + n0(e.pf[1], 2) : ''}</em></div>
        <div class="sc-stat"><span>Paper $ ($500 risk)</span><b class="${cl(sc.usd)}">${usd(sc.usd)}</b><em>${e.usd && sc.n ? 'expected ' + usd(e.usd[0]) + ' to ' + usd(e.usd[2]) : ''}</em></div></div>
      <div class="sc-bar" title="where the paper result sits in the expected range"><i style="left:5%;width:5%;background:${C.warn}"></i><i style="left:10%;width:80%;background:color-mix(in srgb,${C.good} 35%,transparent)"></i><u style="left:${pct}%"></u></div>
      <em>Expected after ${n0(e.at_n || sc.n)} trades (2026 H2 bootstrap, p10-p90): ${esc(er)} · a 2025-like year: ${esc(br)}${sc.like_2025 ? ' · <b style="color:' + C.warn + '">looks like 2025 so far</b>' : ''}</em></div>`;
  }
  function scoreCard(S) {
    const g = S && S.scorecard;
    if (!g) return '';
    if (g.error) return `<div class="sc-card"><p class="sc-note">Scorecard unavailable: ${esc(g.error)}</p></div>`;
    const rows = (S.strategies || []).filter((s) => s.scorecard).map((s) => `<tr><td>${esc(s.short || s.key)}</td><td>${n0(s.scorecard.n)}</td><td class="${cl(s.scorecard.cum_r)}">${fR(s.scorecard.cum_r)}</td><td>${esc(s.scorecard.text)}</td></tr>`).join('');
    return `<div class="sc-card"><div class="sc-eyebrow" style="color:${C.acc}">Go / no-go · before buying the ATLAS 25K</div><h3>Scorecard: paper result vs the expected range</h3>
      <p class="sc-note">${esc(g.rule || '')}${g.source ? ' Source: ' + esc(g.source) + '.' : ''}</p>
      ${scoreBox(g.account_b, 'ATLAS (' + ((g.account_b || {}).keys || []).length + ' members pooled)')}
      ${rows ? `<div class="sc-tw"><table class="sc-t"><thead><tr><th>Strategy</th><th>Trades</th><th>Cum R</th><th>Verdict</th></tr></thead><tbody>${rows}</tbody></table></div>` : ''}</div>`;
  }
  function strat(s, live) {
    const lv = live && live.strategies ? live.strategies[s.key] : null;
    const st = lv && lv.state ? lv.state : s.state;
    const src = lv && lv.state ? 'PC (live)' : s.state_src === 'PC' ? 'PC' : 'cloud';
    const p = s.paper || {};
    const rows = (s.trades || []).slice();
    if (lv && lv.trades) for (const t of lv.trades) { const i = rows.findIndex((r) => +r.entry_t === +t.entry_t); if (i < 0) rows.push(t); else if (rows[i].exit_kind === 'OPEN') rows[i] = { ...rows[i], ...t }; }
    const rl = routeOf(s, live);
    return `<div class="sc-card"><div class="sc-eyebrow" style="color:${rl.on ? C.acc : C.warn}">${esc(rl.label)}${s.candidate ? ' · CANDIDATE ATLAS MEMBER' : ''} · ${esc(s.short || s.key)}${s.on ? '' : ' · OFF'}</div><h3>${esc(s.label)}</h3>
      ${s.summary ? `<p class="sc-note">${esc(s.summary)}</p>` : ''}
      ${stateBox(st, src)}
      ${pics(s.key, false)}
      <div class="sc-stats"><div class="sc-stat"><span>Paper trades</span><b>${n0(p.n)}</b><em>${n0(p.wins)} winners</em></div>
        <div class="sc-stat"><span>Paper $ (own, $500 risk)</span><b class="${cl(p.usd)}">${usd(p.usd)}</b><em>since the ledger started</em></div>
        <div class="sc-stat"><span>With LIT (one account)${s.with_lit_label ? ' · ' + esc(s.with_lit_label) : ''}</span><b class="${cl(p.with_lit_usd)}">${usd(p.with_lit_usd)}</b><em>${n0(p.with_lit_n)} taken</em></div></div>
      ${s.with_lit_note ? `<p class="sc-note"><b>${esc(s.with_lit_label || 'Note')}:</b> ${esc(s.with_lit_note)}</p>` : ''}
      ${scoreBox(s.scorecard, 'Go / no-go')}
      <details open><summary><b>Paper trades</b></summary>${trades(rows)}</details>
      <details><summary><b>Rules in plain words</b></summary><ol class="sc-rules">${(s.rules || []).map((r) => `<li>${esc(r)}</li>`).join('')}</ol></details>
      <details><summary><b>Backtest numbers</b></summary>${btTable(s.backtest, s.with_lit_label)}</details></div>`;
  }
  const CSS = `.sc-card{border:1px solid ${C.line};border-radius:14px;padding:14px 16px;margin:0 0 14px;background:color-mix(in srgb,${C.line} 18%,transparent)}.sc-card h3{margin:2px 0 6px;font-size:16px}.sc-card h4{margin:12px 0 6px;font-size:13px}
.sc-eyebrow{font-size:11.5px;letter-spacing:.05em;text-transform:uppercase;color:${C.warn};font-weight:700}.sc-note{margin:6px 0;font-size:12.5px;line-height:1.5;opacity:.8}.sc-mut{opacity:.65}
.sc-banner{border:1.5px solid ${C.warn};border-radius:12px;padding:10px 12px;margin:0 0 12px;font-size:13px;line-height:1.5;background:color-mix(in srgb,${C.warn} 8%,transparent)}
.sc-state{border:1.5px solid ${C.line};border-radius:12px;padding:10px 12px;margin:10px 0}.sc-state b{display:block;font-size:14px;line-height:1.4;margin-top:6px}.sc-state em{display:block;font-style:normal;font-size:11.5px;opacity:.7;margin-top:4px}
.sc-pill{display:inline-block;color:#fff;font-size:11px;font-weight:700;border-radius:999px;padding:2px 9px}
.sc-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px;margin:10px 0}.sc-stat{border:1px solid ${C.line};border-radius:12px;padding:9px 11px;min-width:0}
.sc-stat span{display:block;font-size:11.5px;opacity:.7}.sc-stat b{display:block;font-size:19px;margin-top:2px}.sc-stat em{display:block;font-style:normal;font-size:11.5px;opacity:.7;margin-top:2px}
.sc-up{color:${C.good}}.sc-dn{color:${C.bad}}.sc-tw{overflow-x:auto;max-width:100%}.sc-t{width:100%;border-collapse:collapse;font-size:12.5px}.sc-t th,.sc-t td{padding:6px 8px;border-bottom:1px solid ${C.line};text-align:left;white-space:nowrap}.sc-t th{font-weight:600;opacity:.8}
.sc-go .sc-stat b small{font-size:12px;opacity:.6;font-weight:500}.sc-bar{position:relative;height:8px;border-radius:99px;margin:8px 0 4px;background:color-mix(in srgb,${C.bad} 30%,transparent)}
.sc-bar i{position:absolute;top:0;bottom:0;border-radius:99px}.sc-bar u{position:absolute;top:-3px;width:3px;height:14px;margin-left:-1px;border-radius:2px;background:currentColor}
.sc-rules{margin:8px 0 4px;padding-left:20px;font-size:13px;line-height:1.55}.sc-rules li{margin:3px 0}.sc-card details{margin:8px 0}.sc-card summary{cursor:pointer;font-size:13.5px}`;
  // ---------------------------------------------------------------- Account B (engine/account_b.py): its own account + eval
  // ab = LiveBot.second_route_info().account_b: {label, account, plan_label, kind, sizing, keys, eval: {balance, floor, room,
  // target, to_target, session, status}, open, routed, day_pnl, entries_today, locked, disabled}
  const EVST = { open: ['Eval running', C.acc], passed: ['Eval PASSED', C.good], failed: ['Eval FAILED', C.bad], stuck: ['Stuck: buy a new one', C.warn] };
  // the funded stage (engine/account_b.py "funded", 2026-10-26): ab.stage 'funded', ab.funded = the MFFU payout tracker
  const FDST = { funded: ['Funded', C.good], lost: ['Funded account LOST', C.bad], stuck: ['Funded: stuck, buy a new eval', C.warn], graduated: ['5 payouts: MFFU moves it to live', C.good] };
  const abName = (ab) => String((ab && ab.label) || 'ATLAS').replace(/^Account B\b/, 'ATLAS');
  function fundedB(ab, ev) {
    const F = ab.funded || {};
    const [lab, col] = FDST[ev.status] || [ev.status || '—', C.mut];
    const op = ab.open;
    const pays = Object.entries(F.payouts || {}).map(([d, v]) => `${esc(d)} ${usd(v)}`).join(' · ');
    const elig = F.eligible ? `eligible now: request up to ${usd(F.max_request)} (${usd(F.to_you)} to you at 80%)` : F.eligible_from ? `first request from ${esc(F.eligible_from)}` : 'no funded trade yet';
    const rows = (ab.routed || []).slice().reverse().map((r) => `<tr><td>${hm(r.t)}</td><td>${esc(String(r.side || '').toUpperCase())}</td><td>${n0(r.qty)}</td><td>${esc(r.strategy || r.src || '')}</td><td>${esc(r.reason || '')}</td><td class="${cl(r.pnl)}">${r.pnl == null ? '' : usd(r.pnl)}</td></tr>`).join('');
    return `<div class="sc-card"><div class="sc-eyebrow" style="color:${C.good}">${esc(ab.kind || '')} · ${esc(abName(ab))} · ${esc(ab.plan_label || '')}</div>
      <h3>${esc(abName(ab))}: funded · ${esc((ab.keys || []).join(' + '))}</h3>
      ${ab.disabled ? `<p class="sc-note" style="color:${C.bad}">Not trading: ${esc(ab.disabled)}</p>` : ''}
      <div class="sc-state" style="border-color:${col}"><span class="sc-pill" style="background:${col}">${esc(lab)}</span>
        <b>${op ? `In a trade: ${esc(op.side)} ${n0(op.qty)} MNQ (${esc(op.strategy || '')}) from ${px(op.entry)}, stop ${px(op.stop)}, target ${px(op.target)}` : 'Flat'}${ab.locked ? ' · locked today: ' + esc(ab.locked) : ''}</b>
        <em>Funded from ${esc(ev.start || '?')}${ev.session ? ' · funded session ' + n0(ev.session) : ''}${ab.eval_account ? ' · passed eval ' + esc(ab.eval_account) : ''} · ${esc(ab.note || '')}</em></div>
      <p class="sc-note"><b>${esc(F.text || '')}</b></p>
      <div class="sc-stats"><div class="sc-stat"><span>Balance</span><b>$${n0(ev.balance)}</b><em>today ${usd(ab.day_pnl)}</em></div>
        <div class="sc-stat"><span>Payout line</span><b>$${n0(F.ask_at_balance)}</b><em>${F.to_ask != null ? (F.to_ask > 0 ? usd(F.to_ask) + ' to go' : 'reached') : ''}</em></div>
        <div class="sc-stat"><span>Room to the max-loss floor</span><b>${usd(ev.room)}</b><em>floor $${n0(ev.floor)}</em></div>
        <div class="sc-stat"><span>Buffer ($${n0(F.buffer)} stays in)</span><b>${F.buffer_reached ? 'reached' : 'not yet'}</b><em>at $${n0(F.buffer_balance)}</em></div>
        <div class="sc-stat"><span>Best day vs the ${n0(F.cons_limit_pct)}% rule</span><b>${F.best_day_pct == null ? '—' : n0(F.best_day_pct) + '%'}</b><em>cycle ${usd(F.cycle_profit)} · ${n0(F.cycle_days)}/${n0(F.cycle_days_need)} days</em></div>
        <div class="sc-stat"><span>Payouts</span><b>${n0(F.payouts_n)} of ${n0(F.payouts_max)}</b><em>${usd(F.paid_to_you)} to you</em></div></div>
      <p class="sc-note">Payout: ${elig}. ${(F.why || []).length && !F.ready ? 'Why not yet: ' + esc(F.why.slice(0, 3).join('; ')) + '.' : ''} The bot never requests a payout: you ask MFFU, then record it (${esc(String(F.record_cmd || '').replace('{day}', 'day').replace('{amount}', '$'))}).${pays ? ' Taken: ' + pays + '.' : ''}</p>
      ${rows ? `<details><summary><b>Orders on ${esc(ab.account || '')}</b></summary><div class="sc-tw"><table class="sc-t"><thead><tr><th>Time</th><th>Side</th><th>Micros</th><th>Strategy</th><th>Reason</th><th>$</th></tr></thead><tbody>${rows}</tbody></table></div></details>` : ''}</div>`;
  }
  function acctB(ab) {
    if (!ab) return '';
    const ev = ab.eval || {};
    if (ab.stage === 'funded') return fundedB(ab, ev);
    const [lab, col] = EVST[ev.status] || [ev.status || '—', C.mut];
    const op = ab.open;
    const rows = (ab.routed || []).slice().reverse().map((r) => `<tr><td>${hm(r.t)}</td><td>${esc(String(r.side || '').toUpperCase())}</td><td>${n0(r.qty)}</td><td>${esc(r.strategy || r.src || '')}</td><td>${esc(r.reason || '')}</td><td class="${cl(r.pnl)}">${r.pnl == null ? '' : usd(r.pnl)}</td></tr>`).join('');
    return `<div class="sc-card"><div class="sc-eyebrow" style="color:${C.acc}">${esc(ab.kind || '')} · ${esc(abName(ab))} · ${esc(ab.plan_label || '')}</div>
      <h3>${esc(abName(ab))}: ${esc((ab.keys || []).join(' + '))}</h3>
      ${ab.disabled ? `<p class="sc-note" style="color:${C.bad}">Not trading: ${esc(ab.disabled)}</p>` : ''}
      <div class="sc-state" style="border-color:${col}"><span class="sc-pill" style="background:${col}">${esc(lab)}</span>
        <b>${op ? `In a trade: ${esc(op.side)} ${n0(op.qty)} MNQ (${esc(op.strategy || '')}) from ${px(op.entry)}, stop ${px(op.stop)}, target ${px(op.target)}` : 'Flat'}${ab.locked ? ' · locked today: ' + esc(ab.locked) : ''}</b>
        <em>Own eval${ev.start ? ' from ' + esc(ev.start) : ''}${ev.session ? ' · session ' + n0(ev.session) : ''} · size ${esc(ab.sizing || 'need')} · ${esc(ab.note || '')}</em></div>
      <div class="sc-stats"><div class="sc-stat"><span>Balance</span><b>$${n0(ev.balance)}</b><em>today ${usd(ab.day_pnl)}</em></div>
        <div class="sc-stat"><span>Pass target</span><b>$${n0(ev.target)}</b><em>${ev.to_target != null ? usd(ev.to_target) + ' to go' : ''}</em></div>
        <div class="sc-stat"><span>Room to the max-loss floor</span><b>${usd(ev.room)}</b><em>floor $${n0(ev.floor)}</em></div>
        <div class="sc-stat"><span>Trades today</span><b>${n0(ab.entries_today)}</b><em>max 2 a day</em></div></div>
      ${rows ? `<details><summary><b>Orders on ${esc(ab.account || '')}</b></summary><div class="sc-tw"><table class="sc-t"><thead><tr><th>Time</th><th>Side</th><th>Micros</th><th>Strategy</th><th>Reason</th><th>$</th></tr></thead><tbody>${rows}</tbody></table></div></details>` : ''}</div>`;
  }
  function css() { if (!document.getElementById('sc-css')) { const s = document.createElement('style'); s.id = 'sc-css'; s.textContent = CSS; document.head.appendChild(s); } }
  function render(el, S, opts) {
    css();
    opts = opts || {};
    PICS = opts.charts || PICS;
    try {
      if (!S || !(S.strategies || []).length) {
        el.innerHTML = `<div class="sc-card"><b>No ATLAS members in this build.</b><p class="sc-note">${esc((S && S.error) || 'The next cloud run adds them (second_model.json).')}</p></div>`;
        return;
      }
      const anyR = S.strategies.some((s) => routeOf(s, opts.live).on);
      el.innerHTML = `<div class="sc-banner"><b>${anyR ? 'ROUTED + PAPER.' : 'PAPER ONLY.'}</b> ${esc(S.note || 'Nothing is traded. LIT and the eval account are unchanged.')}${S.source ? ' Source: ' + esc(S.source) + '.' : ''}</div>`
        + acctB((opts.live && opts.live.route && opts.live.route.account_b) || S.account_b || (S.route && S.route.account_b))
        + scoreCard(S)
        + S.strategies.map((s) => strat(s, opts.live)).join('');
    } catch (e) { el.innerHTML = `<div class="sc-card"><b>This page failed to draw</b><p class="sc-note">${esc(String(e && e.message || e))}</p></div>`; }
  }
  // "ROUTED on Sim101" / "PAPER": the PC's live cut (heartbeat / live.json second.route) first, then the dashboard block
  function routeOf(s, live) {
    const lv = live && live.strategies ? live.strategies[s.key] : null;
    const lab = String((lv && lv.route_label) || s.route_label || 'paper').replace(/Account B\b/, 'ATLAS');
    const on = lv ? !!lv.route : !!s.route;
    return { on, label: on ? String(lab).toUpperCase().replace(/^ROUTED ON/, 'ROUTED on') : 'PAPER' };
  }

  // ---------------------------------------------------------------- the second-strategy brain (Bot Brain pages)
  // data = {strategies: [{key, label, short, route, route_label, state, brain}], src, t}: one card per strategy with its
  // stage, the "waiting for" sentence, every rule in the engine's order (✓ / ✗ / · not yet; the first ✗ = why no trade),
  // the planned entry / stop / target / size, the S/R levels and today's log. engine/second.py brain (closed bars only).
  const BSTAGE = { waiting: ['Waiting', C.mut], armed: ['Armed', C.warn], in_trade: ['In trade', C.acc], done: ['Done today', C.good],
    off: ['Outside its hours', C.mut], error: ['Error', C.bad] };
  const mk = (o) => o === true ? `<span class="sb-ok y">✓</span>` : o === false ? `<span class="sb-ok n">✗</span>` : `<span class="sb-ok q">·</span>`;
  function brainCard(s) {
    const b = s.brain || {}, st = s.state || {};
    const [lab, col] = BSTAGE[b.stage || st.stage] || ['—', C.mut];
    const ro = !!s.route;
    const ff = b.first_fail;
    const pl = b.plan;
    const checks = (b.checks || []).map((c) => `<li class="${c.ok === false ? 'f' : ''}${c.k === ff ? ' ff' : ''}">${mk(c.ok)}<div><b>${esc(c.name)}</b>${c.val ? `<br><span class="sc-mut">${esc(c.val)}</span>` : ''}${c.need ? `<br><span class="sc-mut">needs ${esc(c.need)}</span>` : ''}</div></li>`).join('');
    const lv = (b.levels || []).length ? `<details><summary><b>Levels of the day</b> (${(b.levels || []).filter((x) => x.known).length} known)</summary><div class="sc-tw"><table class="sc-t"><tbody>${b.levels.map((x) => `<tr><td>${esc(x.name)}</td><td>${px(x.px)}</td><td>${x.known ? 'known' : '<span class="sc-mut">not yet</span>'}</td><td>${esc(x.stage || '')}</td></tr>`).join('')}</tbody></table></div></details>` : '';
    const log = (b.log || []).slice().reverse().map((x) => `<li class="${x.trade ? 'tr' : x.signal ? 'sg' : ''}"><span>${esc(x.text || '')}</span></li>`).join('');
    const cand = !!(s.candidate || b.candidate);
    return `<div class="sc-card sb-card"><div class="sc-eyebrow" style="color:${ro ? C.acc : C.warn}">${ro ? esc(s.route_label || 'ROUTED') : 'PAPER'}${cand ? ' · CANDIDATE MEMBER' : ''} · ${esc(s.short || s.key)}</div>
      <h3>${esc(s.label || s.key)}</h3>
      <div class="sc-state" style="border-color:${col}"><span class="sc-pill" style="background:${col}">${esc(lab)}</span><b>${esc(b.text || st.text || '—')}</b>
        <em>${esc((b.focus || {}).label || '')}${b.closed_bars_only !== false ? ' · closed bars only' : ''}${s.src ? ' · ' + esc(s.src) : ''}</em></div>
      ${pics(s.key)}
      ${b.error ? `<p class="sc-note" style="color:${C.bad}">Brain error: ${esc(b.error)}</p>` : ''}
      ${checks ? `<h4>Rules in the engine's order${ff ? ` · stopped at: <span style="color:${C.bad}">${esc(((b.checks || []).find((c) => c.k === ff) || {}).name || ff)}</span>` : ''}</h4><ul class="sb-ck">${checks}</ul>` : ''}
      ${pl ? `<p class="sc-note"><b>${esc(pl.side === 'long' ? 'LONG' : 'SHORT')} plan${pl.estimate ? ' (estimate until the fill bar)' : ''}:</b> entry ${px(pl.entry)} · stop ${px(pl.stop)} (${n0(pl.risk_pts, 2)} pts) · target ${px(pl.target)}${pl.rr ? ` (${n0(pl.rr, 2)}R)` : ''} · ${n0(pl.qty_500)} micros at $500 risk${ro ? ' (on the eval: capped by 60% of the room and the soft daily loss)' : ''}${pl.when ? ' · ' + esc(pl.when) + ' ET' : ''}</p>` : ''}
      ${lv}
      ${log ? `<details open><summary><b>Thought log today</b></summary><ol class="sb-log">${log}</ol></details>` : ''}</div>`;
  }
  const BCSS = `.sb-ck{list-style:none;margin:4px 0 0;padding:0}.sb-ck li{display:flex;gap:8px;padding:6px 0;border-top:1px solid ${C.line};font-size:13px;line-height:1.4}
.sb-ck li.f b{color:${C.bad}}.sb-ck li.ff{background:color-mix(in srgb,${C.bad} 7%,transparent)}
.sb-ok{flex:none;display:inline-grid;place-items:center;width:21px;height:21px;border-radius:7px;font-weight:800;font-size:12px}
.sb-ok.y{color:${C.good};background:color-mix(in srgb,${C.good} 16%,transparent)}.sb-ok.n{color:${C.bad};background:color-mix(in srgb,${C.bad} 16%,transparent)}.sb-ok.q{color:${C.mut}}
.sb-log{list-style:none;margin:4px 0;padding:0}.sb-log li{padding:5px 0;border-bottom:1px solid ${C.line};font-size:12.5px;line-height:1.4}.sb-log li.tr{color:${C.good};font-weight:650}.sb-log li.sg{color:${C.warn};font-weight:650}`;
  function brain(el, data, opts) {
    css();
    if (!document.getElementById('sb-css')) { const t = document.createElement('style'); t.id = 'sb-css'; t.textContent = BCSS; document.head.appendChild(t); }
    opts = opts || {};
    PICS = opts.charts || PICS;
    try {
      const L = (data && data.strategies) || [];
      if (!L.length) {
        el.innerHTML = `<div class="sc-card"><b>No ATLAS brain yet.</b><p class="sc-note">${esc((data && data.error) || 'It appears after the PC bot (or the cloud run) has run ATLAS with this version.')}</p></div>`;
        return;
      }
      const nR = L.filter((s) => s.route).length;
      el.innerHTML = `<div class="sc-banner"><b>ATLAS brain.</b> ${nR ? `${nR} routed to the account next to LIT (LIT first, one position at a time, max 2 trades a day); the rest paper.` : 'All paper: nothing here is traded.'} Each card: what it waits for and every rule in the engine's order (✓ passed · ✗ failed: the first ✗ is why there is no trade · · not decided yet).${data.src ? ' Source: ' + esc(data.src) + (data.t ? ' · ' + hm(data.t) + ' ET' : '') + '.' : ''}</div>`
        + acctB(data.account_b) + L.map(brainCard).join('');
    } catch (e) { el.innerHTML = `<div class="sc-card"><b>The ATLAS brain failed to draw</b><p class="sc-note">${esc(String(e && e.message || e))}</p></div>`; }
  }
  // the list from a compact (heartbeat / live.json / /api/next/brain/second) or a dashboard block (data.json "second")
  function brainList(x, src) {
    if (!x) return null;
    const account_b = (x.route && x.route.account_b) || x.account_b || null;
    if (Array.isArray(x.strategies)) return { src, t: x.t, account_b, strategies: x.strategies.map((s) => ({ ...s, src })) };
    return { src, t: x.t, account_b, strategies: Object.entries(x.strategies || {}).map(([key, s]) => ({ key, ...s, src })) };
  }

  // ---------------------------------------------------------------- ATLAS: everything about it on one page (owner 2026-10-22: "two
  // strategies: LIT on the 50K, the new one on the 25K"). ATLAS = the members EMA + MACD + S/R (account B's keys).
  // S = the dashboard block (data.json "second" / /api/next/second; S.atlas = research/second/atlas.json, else the
  // account-B research), opts.live = the PC's live cut (heartbeat / live.json second), opts.brain = brainList(...) of the
  // freshest brain. Read-only.
  const DEF_KEYS = ['ema_lon_vix', 'macd_sweep', 'sr_nyreclaim'];
  function members(S, live) {
    const A = (S && S.atlas) || {};
    let keys = (Array.isArray(A.members) ? A.members : []).map((m) => typeof m === 'string' ? m : (m && (m.key || m.id))).filter(Boolean);
    const ab = (live && live.route && live.route.account_b) || (S && S.account_b);
    if (!keys.length && ab && (ab.keys || []).length) keys = ab.keys.slice();
    if (!keys.length && S && S.scorecard && S.scorecard.account_b && (S.scorecard.account_b.keys || []).length) keys = S.scorecard.account_b.keys.slice();
    if (!keys.length) keys = DEF_KEYS.slice();
    const have = ((S && S.strategies) || []).map((x) => x.key);
    return have.length ? keys.filter((k) => have.includes(k)) : keys;
  }
  // PAPER / SIM / LIVE on <account> / ROUTED on LIT's account
  function atlasStatus(S, live) {
    const ab = (live && live.route && live.route.account_b) || (S && S.account_b) || null;
    if (ab && ab.account && ab.enabled !== false) {
      const k = String(ab.kind || (/^(sim|playback)/i.test(ab.account) ? 'SIM' : 'LIVE')).toUpperCase();
      return { mode: k, lvl: k === 'LIVE' ? 'good' : k === 'SIM' ? 'acc' : 'warn', text: `${k} on ${ab.account}`, ab, plan: ab.plan_label || 'MFFU Builder 25K' };
    }
    const keys = members(S, live);
    const routed = ((S && S.strategies) || []).filter((x) => keys.includes(x.key) && routeOf(x, live).on);
    if (routed.length) return { mode: 'ROUTED', lvl: 'acc', text: routeOf(routed[0], live).label, ab: null, plan: "LIT's account" };
    return { mode: 'PAPER', lvl: 'warn', text: 'Paper: nothing is traded yet', ab: null, plan: 'MFFU Builder 25K (not bought yet)' };
  }
  // every trade of the members (cloud ledger + the PC's live cut), newest first
  function allTrades(S, live, keys) {
    const out = [];
    for (const s of ((S && S.strategies) || []).filter((x) => keys.includes(x.key))) {
      const lv = live && live.strategies ? live.strategies[s.key] : null;
      const rows = (s.trades || []).slice();
      if (lv && lv.trades) for (const t of lv.trades) { const i = rows.findIndex((r) => +r.entry_t === +t.entry_t); if (i < 0) rows.push(t); else if (rows[i].exit_kind === 'OPEN') rows[i] = { ...rows[i], ...t }; }
      for (const t of rows) out.push({ ...t, member: s.short || s.key });
    }
    return out.sort((a, b) => (b.entry_t || 0) - (a.entry_t || 0));
  }
  function dayOf(S, live, keys) {
    for (const k of keys) { const lv = live && live.strategies && live.strategies[k]; if (lv && lv.state && lv.state.day) return lv.state.day; }
    const s = ((S && S.strategies) || []).find((x) => keys.includes(x.key) && x.state && x.state.day);
    return (live && live.day) || (s && s.state.day) || null;
  }
  // today's $, this week's $ and the trade count of the members (paper ledger, or account B's own day P&L)
  function atlasMoney(S, live) {
    const keys = members(S, live), st = atlasStatus(S, live), rows = allTrades(S, live, keys), day = dayOf(S, live, keys);
    const fin = rows.filter((t) => t.exit_kind && t.exit_kind !== 'OPEN');
    const d0 = day ? new Date(day + 'T12:00:00Z') : null;
    const wk0 = d0 ? new Date(d0.getTime() - ((d0.getUTCDay() + 6) % 7) * 86400000).toISOString().slice(0, 10) : null;   // Monday of that week
    const today = rows.filter((t) => day && t.day === day);
    const dayUsd = st.ab && st.ab.day_pnl != null ? +st.ab.day_pnl : fin.filter((t) => t.day === day).reduce((a, t) => a + (+t.usd || 0), 0);
    const weekUsd = fin.filter((t) => wk0 && t.day >= wk0 && t.day <= day).reduce((a, t) => a + (+t.usd || 0), 0);
    return { keys, st, rows, day, today, dayUsd, weekUsd };
  }
  function tradeRows(rows) {
    if (!rows.length) return '';
    return `<div class="sc-tw"><table class="sc-t"><thead><tr><th>Entry (ET)</th><th>Member</th><th>Side</th><th>Micros</th><th>Entry</th><th>Exit</th><th>R</th><th>$</th></tr></thead><tbody>${rows.map((t) => {
      const open = t.exit_kind === 'OPEN';
      return `<tr><td>${esc(t.day || '')} ${hm(t.entry_t)}</td><td><b>${esc(t.member)}</b></td><td>${t.dir > 0 ? 'LONG' : 'SHORT'}</td><td>${n0(t.qty)}</td><td>${px(t.entry)}</td>
        <td>${open ? 'open · last ' + px(t.last) : esc(t.exit_kind || '')}</td><td class="${cl(t.r)}">${fR(t.r)}</td><td class="${cl(t.usd)}">${usd(t.usd)}</td></tr>`;
    }).join('')}</tbody></table></div>`;
  }
  // research numbers: research/second/atlas.json (name, members, rules, numbers, eval25k) or the account-B fallback
  const pctF = (v) => (v == null || isNaN(v)) ? '—' : n0(v, 1) + '%';
  const NCOL = [['n', 'Trades', n0], ['tpw', '/week', (v) => n0(v, 2)], ['win', 'Win', pctF], ['pf', 'PF', (v) => n0(v, 2)],
    ['net', 'Net $', usd, 1], ['per_month', '$/month', usd, 1], ['dd', 'Max DD', usd]];
  const ECOL = [['p10', 'Pass 2 wk', pctF], ['f10', 'Fail 2 wk', pctF], ['p20', 'Pass 1 mo', pctF], ['f20', 'Fail 1 mo', pctF], ['dead10', 'Undecided 2 wk', pctF],
    ['pass_med', 'Sessions to pass (median)', (v) => n0(v, 1)], ['ev_eval_3m', '$ per eval (3 mo)', usd, 1]];
  const ORDER = ['H1', 'H2', '2026', '2025', '2021-24', '2021-25'];
  const plabel = (k) => ({ H1: '2026 H1 (picked)', H2: '2026 H2 (check)' })[k] || k;
  function periods(o) {
    if (!o || typeof o !== 'object') return [];
    if (Array.isArray(o)) return o.filter((x) => x && typeof x === 'object').map((x, i) => [x.period || x.label || String(i + 1), x]);
    const rk = (k) => { const i = ORDER.indexOf(k); return i < 0 ? 99 : i; };
    return Object.entries(o).filter(([, v]) => v && typeof v === 'object' && !Array.isArray(v)).sort((a, b) => rk(a[0]) - rk(b[0]));
  }
  function numTable(o, cols) {
    const P = periods(o); if (!P.length) return '';
    const cs = cols.filter(([k]) => P.some(([, x]) => x[k] != null)); if (!cs.length) return '';
    return `<div class="sc-tw"><table class="sc-t"><thead><tr><th>Period</th>${cs.map((c) => `<th>${esc(c[1])}</th>`).join('')}</tr></thead><tbody>${P.map(([k, x]) =>
      `<tr><td>${esc(plabel(k))}</td>${cs.map((c) => `<td class="${c[3] ? cl(x[c[0]]) : ''}">${c[2](x[c[0]])}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  }
  function rulesBlock(A, S, keys) {
    const R = A.rules;
    const per = ((S && S.strategies) || []).filter((x) => keys.includes(x.key));
    const ol = (L) => `<ol class="sc-rules">${(Array.isArray(L) ? L : []).map((r) => `<li>${esc(typeof r === 'string' ? r : (r && r.text) || JSON.stringify(r))}</li>`).join('')}</ol>`;
    let top = '';
    if (Array.isArray(R) && R.length) top = `<h4>${esc(A.name || 'ATLAS')} as a whole</h4>${ol(R)}`;
    else if (typeof R === 'string') top = `<p class="sc-note">${esc(R)}</p>`;
    const byKey = R && typeof R === 'object' && !Array.isArray(R) ? R : {};
    if (Array.isArray(byKey.all) && byKey.all.length) top = `<h4>${esc(A.name || 'ATLAS')} as a whole</h4>${ol(byKey.all)}`;
    return top + per.map((s) => `<details><summary><b>${esc(s.short || s.key)}</b> · ${esc(s.label || '')}</summary>${s.summary ? `<p class="sc-note">${esc(s.summary)}</p>` : ''}${ol(byKey[s.key] || s.rules)}</details>`).join('');
  }
  function css2() {
    css();
    if (!document.getElementById('sb-css')) { const t = document.createElement('style'); t.id = 'sb-css'; t.textContent = BCSS; document.head.appendChild(t); }
    if (!document.getElementById('at-css')) { const t = document.createElement('style'); t.id = 'at-css'; t.textContent = ACSS; document.head.appendChild(t); }
  }
  const LV = () => ({ good: C.good, acc: C.acc, warn: C.warn, bad: C.bad });
  function atlas(el, S, opts) {
    css2();
    opts = opts || {};
    PICS = opts.charts || PICS;
    try {
      if (!S || !(S.strategies || []).length) {
        el.innerHTML = `<div class="sc-card"><b>No ATLAS members in this build.</b><p class="sc-note">${esc((S && S.error) || 'The next cloud run adds them (second_model.json).')}</p></div>`;
        return;
      }
      const live = opts.live || null, A = S.atlas || {}, name = A.name || 'ATLAS';
      const M = atlasMoney(S, live), keys = M.keys, st = M.st;
      const per = S.strategies.filter((x) => keys.includes(x.key));
      const col = LV()[st.lvl] || C.mut;
      const bl = opts.brain && (opts.brain.strategies || []).length ? opts.brain : brainList(S, 'cloud run');
      const bs = ((bl && bl.strategies) || []).filter((x) => keys.includes(x.key));
      const sc = S.scorecard || {}, scb = sc.account_b;
      const hero = `<div class="sc-card at-hero" style="border-color:${col}"><div class="sc-eyebrow" style="color:${col}">${esc(name)} · ${esc(st.plan)} · ${per.map((s) => esc(s.short || s.key)).join(' + ')}</div>
        <div class="at-top"><div><span class="sc-pill" style="background:${col}">${esc(st.mode)}</span><h3 class="at-h">${esc(st.text)}</h3>
          <p class="sc-note">${esc(A.summary || 'The second strategy: three research setups pooled on their own 25K eval account, next to LIT on the 50K. Then we scale.')}</p></div>
          <div class="at-day"><span>Today${st.ab ? '' : ' (paper)'}</span><b class="${cl(M.dayUsd)}">${usd(M.dayUsd)}</b><em>${n0(M.today.length)} trade${M.today.length === 1 ? '' : 's'} · week ${usd(M.weekUsd)}</em></div></div>
        <p class="sc-note at-lit"><b>With LIT:</b> never opposite to LIT and LIT first (no ATLAS entry against an open or arming LIT trade; LIT entering the other way closes ATLAS first). Max 2 ATLAS trades a day, one position.</p></div>`;
      const evCard = st.ab ? acctB(st.ab) : `<div class="sc-card"><div class="sc-eyebrow" style="color:${C.warn}">25K eval · not started</div><h3>MFFU Builder 25K: not bought yet</h3>
        <p class="sc-note">${esc(name)} trades paper until the go / no-go below says Ready. Once the 25K runs, this card shows its balance, room, target, sessions and pass / fail.</p></div>`;
      const brainH = `<h3 class="at-sec">${esc(name)} brain <span class="sc-mut">· ${esc((bl && bl.src) || '—')}${bl && bl.t ? ' · ' + hm(bl.t) + ' ET' : ''}</span></h3>`
        + (bs.length ? bs.map(brainCard).join('') : `<div class="sc-card"><b>No ATLAS brain yet.</b><p class="sc-note">It appears after the PC bot (or the cloud run) has run ATLAS with this version.</p></div>`);
      const T = TP(), mine = T && PICS ? T.all(PICS, keys) : [], exs = T && PICS && mine.length < 8 ? T.examples(PICS, keys) : [];
      const picH = T ? `<div class="sc-card at-pics"><h3>Trade pictures <span class="sc-mut">· ${mine.length ? n0(mine.length) + ' paper trade' + (mine.length === 1 ? '' : 's') + (exs.length ? ' + backtest examples' : '') : exs.length ? 'backtest examples until the first paper trade' : 'none yet'}</span></h3>
        <p class="sc-note">Every ${esc(name)} trade as a chart: the swept level, the setup candles and the plan as the bot saw them at the entry (bright), then what happened (faded). Tap for full screen · pinch or double-tap to zoom · swipe between trades.</p>
        ${T.strip(mine.slice(0, 24).concat(exs), { label: name + ' trade pictures', empty: 'No pictures yet: the cloud draws one at each paper trade\'s entry and again at its exit.' })}</div>` : '';
      const mrow = per.filter((s) => s.scorecard);
      const goH = scb ? `<div class="sc-card"><div class="sc-eyebrow" style="color:${C.acc}">Go / no-go · before buying the 25K</div>${scoreBox(scb, name + ' (' + n0((scb.keys || keys).length) + ' members pooled)')}
        ${mrow.length ? `<div class="sc-tw"><table class="sc-t"><thead><tr><th>Member</th><th>Trades</th><th>Cum R</th><th>Verdict</th></tr></thead><tbody>${mrow.map((s) => `<tr><td>${esc(s.short || s.key)}</td><td>${n0(s.scorecard.n)}</td><td class="${cl(s.scorecard.cum_r)}">${fR(s.scorecard.cum_r)}</td><td>${esc(s.scorecard.text)}</td></tr>`).join('')}</tbody></table></div>` : ''}
        ${sc.rule ? `<p class="sc-note">${esc(sc.rule)}</p>` : ''}</div>` : (sc.error ? `<div class="sc-card"><p class="sc-note">Scorecard unavailable: ${esc(sc.error)}</p></div>` : '');
      const trH = `<div class="sc-card"><h3>Trades</h3><h4>Today${M.day ? ' · ' + esc(M.day) : ''}</h4>${tradeRows(M.today) || '<p class="sc-note">No ATLAS trade today.</p>'}
        <details ${M.today.length ? '' : 'open'}><summary><b>Recent</b> (${n0(M.rows.length)})</summary>${tradeRows(M.rows.slice(0, 30)) || '<p class="sc-note">No paper trades yet (the ledger starts on the first cloud run with ATLAS on).</p>'}</details></div>`;
      const numsT = numTable(A.numbers, NCOL), evT = numTable(A.eval25k || A.eval_25k, ECOL);
      const btH = `<div class="sc-card"><h3>Backtest numbers</h3>${numsT ? `<h4>${esc(name)} pooled${A.numbers_label ? ' · ' + esc(A.numbers_label) : ''}</h4>${numsT}` : ''}
        ${evT ? `<h4>MFFU Builder 25K eval odds${A.eval_label ? ' · ' + esc(A.eval_label) : ''}</h4>${evT}` : ''}
        ${!numsT && !evT ? '<p class="sc-note">Pooled numbers not built yet (research/second/atlas.json).</p>' : ''}
        <p class="sc-note">Picked on 2026 H1 only; H2 is the untouched check; 2025 and 2021-24 are references. Source: ${esc(A.source || '—')}${A.writeup ? ` · write-up <a href="#/writeup/${encodeURIComponent(A.writeup)}">${esc(A.writeup)}</a>` : ''}.</p>
        ${per.map((s) => `<details><summary><b>${esc(s.short || s.key)} alone</b> · ${esc(s.label || '')}</summary>${btTable(s.backtest, s.with_lit_label)}</details>`).join('')}</div>`;
      const ruH = `<div class="sc-card"><h3>Rules in plain words</h3>${rulesBlock(A, S, keys)}</div>`;
      const cands = S.strategies.filter((x) => x.candidate && !keys.includes(x.key));
      const cbr = (k) => ((bl && bl.strategies) || []).find((x) => x.key === k) || null;
      const caH = cands.length ? `<h3 class="at-sec">Candidate members (paper) <span class="sc-mut">· stop-hunt research, not part of ${esc(name)} yet</span></h3>
        <div class="sc-banner"><b>PAPER ONLY.</b> Two stop-hunt setups (research/writeups/stophunt.md) watched live next to ${esc(name)}: never routed, not on the 25K, not on LIT's account. Their own go / no-go below decides if they become members.</div>`
        + cands.map((s) => candCard(s, live, cbr(s.key))).join('') : '';
      const others = S.strategies.filter((x) => !keys.includes(x.key) && !x.candidate);
      const otH = others.length ? `<details class="sc-card"><summary><b>Other paper shadows</b> (${others.map((s) => esc(s.short || s.key)).join(', ')}): not part of ${esc(name)}</summary>${others.map((s) => strat(s, live)).join('')}</details>` : '';
      el.innerHTML = hero + evCard + atlasV2Card(S.atlas_v2) + brainH + picH + goH + trH + caH + ruH + btH + otH;
      if (T) T.settle(el);
    } catch (e) { el.innerHTML = `<div class="sc-card"><b>The ATLAS page failed to draw</b><p class="sc-note">${esc(String(e && e.message || e))}</p></div>`; }
  }
  // ATLAS v2 (paper shadow, engine/atlas_v2.card: data.json second.atlas_v2 / GET /api/next/second atlas_v2): candidate 1b of
  // research/writeups/atlas-v2.md on a simulated Builder 25K next to the live ATLAS. Hunt trades so far / 20, paper $ vs the
  // research band, the shadow eval's progress, its last trades and the research numbers. Read-only, never routed.
  function atlasV2Card(x) {
    if (!x) return '';
    if (x.error) return `<div class="sc-card"><b>ATLAS v2 (paper shadow)</b><p class="sc-note">Unavailable: ${esc(x.error)}</p></div>`;
    const m = x.money || {}, ev = x.eval || {}, sc = x.scorecard || {}, h = sc.hunts || {}, ac = sc.account || {}, pg = x.progress || {};
    const need = +pg.need || 20, n = +pg.hunts_n || 0, p = Math.max(0, Math.min(1, n / need)), ep = Math.max(0, Math.min(1, +ev.progress || 0));
    const kc = { ready: C.good, on_track: C.acc, below: C.bad, collecting: C.mut }[h.kind] || C.mut;
    const e = ac.expected || {}, band = e.usd && ac.n ? `${usd(e.usd[0])} to ${usd(e.usd[2])} (median ${usd(e.usd[1])}) after ${n0(e.at_n)} trades` : 'shown after the first finished trade';
    const rows = (x.trades || []).slice().sort((a, b) => (b.entry_t || 0) - (a.entry_t || 0)).slice(0, 10).map((t) => `<tr><td>${esc(t.day || '')} ${hm(t.entry_t)}</td><td>${esc(t.short || t.src || '')}</td><td>${t.dir > 0 ? 'LONG' : 'SHORT'}</td><td>${n0(t.qty)}</td><td>${esc(t.exit_kind || '')}</td><td class="${cl(t.usd)}">${t.usd == null ? '—' : usd(t.usd)}</td></tr>`).join('');
    const R = x.research || {}, T0 = x.today_research || {};
    const rr = ['H1', 'H2', '2025', '2021-24'].filter((k) => R[k]).map((k) => `<tr><td>${esc(R[k].label || k)}</td><td class="${cl(R[k].usd)}">${usd(R[k].usd)}</td><td class="${cl(R[k].per_month)}">${usd(R[k].per_month)}</td><td>${n0(R[k].p10, 1)}% / ${n0(R[k].f10, 1)}%</td><td class="${cl(T0[k])}">${usd(T0[k])}</td></tr>`).join('');
    const evs = (x.evals || []).slice(-6).map((v) => `${esc(v.result)} (${n0(v.sessions)} s)`).join(' · ');
    return `<div class="sc-card av2"><div class="sc-eyebrow" style="color:${C.warn}">ATLAS v2 · PAPER SHADOW · never routed${x.source ? ' · from the ' + esc(x.source) : ''}</div>
      <h3>ATLAS v2 (paper shadow)</h3><p class="sc-note">${esc(x.what || '')}</p>
      <div class="sc-stats"><div class="sc-stat"><span>Hunt trades so far</span><b>${n0(n)} / ${n0(need)}</b><em>decide after ${n0(need)}+</em></div>
        <div class="sc-stat"><span>Paper $ (all trades)</span><b class="${cl(m.usd)}">${usd(m.usd)}</b><em>${n0(m.n)} trades · after $63 evals ${usd(m.net_less_fees)}</em></div></div>
      <div class="av2-bar" style="--c:${kc}"><u style="width:${(p * 100).toFixed(1)}%"></u></div>
      <p class="sc-note"><span class="sc-pill" style="background:${kc}">${esc(h.text || 'collecting')}</span> Expected $ (research band): ${esc(band)}.</p>
      <h4>Shadow eval ${ev.n ? n0(ev.n) + ' · ' : ''}MFFU Builder 25K</h4>
      <div class="sc-stats"><div class="sc-stat"><span>Balance</span><b>${ev.balance != null ? '$' + n0(ev.balance) : '—'}</b><em>${ev.to_target != null ? usd(ev.to_target).replace('+', '') + ' to pass' : ''}</em></div>
        <div class="sc-stat"><span>Room to the floor</span><b>${ev.room != null ? '$' + n0(ev.room) : '—'}</b><em>session ${n0(ev.session)} · new eval under $${n0(ev.min_room || 200)}</em></div></div>
      <div class="av2-bar" style="--c:${C.acc}"><u style="width:${(ep * 100).toFixed(1)}%"></u></div>
      <p class="sc-note">Evals: ${n0(m.passes || 0)} passed · ${n0(m.fails || 0)} failed · ${n0(m.stuck || 0)} stuck · ${n0(m.evals_bought || 0)} bought ($63 each, paper)${evs ? ' · last: ' + evs : ''}.</p>
      <details ${rows ? 'open' : ''}><summary><b>Shadow trades</b> (${n0((x.trades || []).length)})</summary>${rows ? `<div class="sc-tw"><table class="sc-t"><thead><tr><th>Entry ET</th><th>Member</th><th>Side</th><th>Qty</th><th>Exit</th><th>$</th></tr></thead><tbody>${rows}</tbody></table></div>` : '<p class="sc-note">No shadow trade yet: it starts with the next cloud run.</p>'}</details>
      <details><summary><b>Research numbers</b> (eval money less the $63 fees)</summary>${rr ? `<div class="sc-tw"><table class="sc-t"><thead><tr><th>Period</th><th>v2 $</th><th>v2 $/month</th><th>2-week pass / fail</th><th>ATLAS today $</th></tr></thead><tbody>${rr}</tbody></table></div>` : ''}
        <p class="sc-note">${esc(sc.rule || '')} Run ${esc(x.run || '—')}${x.writeup ? ` · write-up <a href="#/writeup/${encodeURIComponent(x.writeup)}">${esc(x.writeup)}</a>` : ''}. Members: ${esc((x.members || []).join(' + '))}.</p></details></div>`;
  }
  // a candidate member (the stop hunts, second_model.json "candidate": true): its brain (stage, waiting for, rule checks,
  // plan, log), its own go / no-go, paper trades, rules, research numbers and the 25K eval paths with it as an ATLAS member
  // the brain card's body only (rule checks, plan, log) under the candidate's own header and state box
  function brainIn(b) {
    const h0 = PICS; PICS = null;                // the candidate card shows its picture once, above its brain
    const h = brainCard(b), i = h.indexOf('</em></div>');
    PICS = h0;
    const body = i >= 0 ? h.slice(i + 11, h.lastIndexOf('</div>')) : '';
    const f = (b.brain || {}).focus || {};
    return `<div class="sb-in"><h4>Brain${f.label ? ' · ' + esc(f.label) : ''} <span class="sc-mut">· closed bars only${b.src ? ' · ' + esc(b.src) : ''}</span></h4>${body.trim() || '<p class="sc-note">No brain yet: the PC bot / the next cloud run fills it.</p>'}</div>`;
  }
  function candCard(s, live, br) {
    const lv = live && live.strategies ? live.strategies[s.key] : null;
    const st = lv && lv.state ? lv.state : s.state;
    const rows = (s.trades || []).slice();
    if (lv && lv.trades) for (const t of lv.trades) { const i = rows.findIndex((r) => +r.entry_t === +t.entry_t); if (i < 0) rows.push(t); else if (rows[i].exit_kind === 'OPEN') rows[i] = { ...rows[i], ...t }; }
    const p = s.paper || {}, bt = s.backtest || {}, ae = bt.atlas_eval || {};
    const b = br ? { ...s, ...br, candidate: true } : { ...s, candidate: true };
    const ev = ['H1', 'H2', '2025', '2021-24'].filter((k) => (ae.atlas || {})[k] || (ae.atlas_plus || {})[k]).map((k) => {
      const f = (o) => o ? `${n0(o.p10, 1)}% / ${n0(o.f10, 1)}%` : '—';
      const a = (ae.atlas || {})[k], x = (ae.atlas_plus || {})[k], y = (ae.atlas_plus_both || {})[k];
      return `<tr><td>${esc(plabel(k))}</td><td>${f(a)}</td><td>${f(x)}</td><td>${f(y)}</td><td class="${cl(a && a.net)}">${usd(a && a.net)}</td><td class="${cl(x && x.net)}">${usd(x && x.net)}</td></tr>`;
    }).join('');
    const pl = Object.entries(bt.placebo || {}).filter(([k]) => k === 'H2' || k === 'all').map(([k, v]) => `${k === 'all' ? 'all periods' : k}: random-time p ${n0(v.p_rtime, 3)}`).join(' · ');
    return `<div class="sc-card at-cand"><div class="sc-eyebrow" style="color:${C.warn}">Candidate member · PAPER · ${esc(s.short || s.key)}${s.on ? '' : ' · OFF'}</div><h3>${esc(s.label)}</h3>
      ${s.summary ? `<p class="sc-note">${esc(s.summary)}</p>` : ''}
      ${stateBox(st, lv && lv.state ? 'PC (live)' : s.state_src === 'PC' ? 'PC' : 'cloud')}
      ${pics(s.key)}
      ${brainIn(b)}
      <div class="sc-stats"><div class="sc-stat"><span>Paper trades</span><b>${n0(p.n)}</b><em>${n0(p.wins)} winners</em></div>
        <div class="sc-stat"><span>Paper $ ($500 risk)</span><b class="${cl(p.usd)}">${usd(p.usd)}</b><em>since the ledger started</em></div></div>
      ${scoreBox(s.scorecard, 'Go / no-go (its own 2026 H2 range)')}
      <details ${rows.length ? 'open' : ''}><summary><b>Paper trades</b></summary>${trades(rows)}</details>
      <details><summary><b>Rules in plain words</b></summary><ol class="sc-rules">${(s.rules || []).map((r) => `<li>${esc(r)}</li>`).join('')}</ol></details>
      <details><summary><b>Research numbers</b> ($500 a trade, costs in)</summary>${numTable(bt.own, NCOL) || '<p class="sc-note">—</p>'}
        ${ev ? `<h4>As an ATLAS member on the Builder 25K: 2-week pass / fail</h4><div class="sc-tw"><table class="sc-t"><thead><tr><th>Period</th><th>ATLAS today</th><th>ATLAS + it</th><th>ATLAS + both hunts</th><th>$ path ATLAS</th><th>$ path + it</th></tr></thead><tbody>${ev}</tbody></table></div>` : ''}
        <p class="sc-note">Picked on 2026 H1 + 2025 + 2021-24 (worst period counts); 2026 H2 untouched.${pl ? ' Placebos: ' + esc(pl) + '.' : ''} Run ${esc(bt.run || '—')}${bt.writeup ? ` · write-up <a href="#/writeup/${encodeURIComponent(bt.writeup)}">${esc(bt.writeup)}</a>` : ''}.</p></details></div>`;
  }
  // the ATLAS · 25K card of the Home summary from the same data (each app adds its LIT card itself)
  function atlasCard(S, live, brain) {
    if (!S || !(S.strategies || []).length) return { name: 'ATLAS', plan: '25K', status: 'NOT BUILT', lvl: '', today: null, week: null, prog: 0, progText: 'no ATLAS block in this build', next: '', go: 'atlas' };
    const M = atlasMoney(S, live), st = M.st, ab = st.ab, ev = (ab && ab.eval) || {};
    let prog = 0, progText = '';
    if (ab && ev.target) {
      const start = ev.start_balance || (ev.target > 40000 ? 50000 : 25000), need = ev.target - start;
      prog = need > 0 ? ((ev.balance || start) - start) / need : 0;
      progText = ab.stage === 'funded'
        ? `FUNDED · ${ev.to_target != null ? (ev.to_target > 0 ? usd(ev.to_target) + ' to the payout line' : 'payout line reached') : ''} · payouts ${n0((ab.funded || {}).payouts_n)}/${n0((ab.funded || {}).payouts_max || 5)}${ev.status && ev.status !== 'funded' ? ' · ' + String(ev.status).toUpperCase() : ''}`
        : `${ev.to_target != null ? usd(ev.to_target) + ' to pass' : ''}${ev.session ? ' · session ' + n0(ev.session) : ''}${ev.status && ev.status !== 'open' ? ' · ' + String(ev.status).toUpperCase() : ''}`;
    } else {
      const g = (S.scorecard || {}).account_b || {};
      prog = g.n ? g.n / (g.need || 20) : 0;
      progText = `Go / no-go: ${n0(g.n || 0)}/${n0(g.need || 20)} paper trades · ${({ collecting: 'collecting', on_track: 'on track', below: 'below range', ready: 'ready' })[g.kind] || '—'}`;
    }
    const bl = brain && (brain.strategies || []).length ? brain : brainList(S, 'cloud run');
    const bs = ((bl && bl.strategies) || []).filter((x) => M.keys.includes(x.key));
    const rk = { in_trade: 0, armed: 1, waiting: 2, done: 3, off: 4, error: 5 };
    const pick = bs.slice().sort((a, b) => (rk[(a.brain || {}).stage || (a.state || {}).stage] ?? 9) - (rk[(b.brain || {}).stage || (b.state || {}).stage] ?? 9))[0];
    const nx = pick ? `${pick.short || pick.key}: ${(pick.brain || {}).text || (pick.state || {}).text || '—'}` : ((S.scorecard || {}).account_b || {}).text || '';
    return { name: 'ATLAS', plan: ab ? (ab.plan_label || '25K') + ' · ' + ab.account : '25K · paper until Ready', status: st.mode, lvl: st.lvl, today: M.dayUsd, week: M.weekUsd,
      prog, progText, next: nx, go: 'atlas' };
  }
  // Home: two cards side by side, "LIT · 50K" and "ATLAS · 25K". c = {name, plan, status, lvl, today, week, prog (0..1),
  // progText, next, go}; each app builds its LIT card from its own data.
  function twoCards(L) {
    css2();
    const one = (c) => {
      const col = LV()[c.lvl] || C.mut;
      const p = Math.max(0, Math.min(1, +c.prog || 0));
      return `<button type="button" class="at-two-c" data-go="${esc(c.go || '')}" data-goto="${esc(c.goto || c.go || '')}" style="--c:${col}">
        <span class="at-two-h"><b>${esc(c.name)}</b><em>${esc(c.plan)}</em></span>
        <span class="sc-pill" style="background:${col}">${esc(c.status)}</span>
        <span class="at-two-k"><span><i>Today</i><b class="${cl(c.today)}">${usd(c.today)}</b></span><span><i>This week</i><b class="${cl(c.week)}">${usd(c.week)}</b></span></span>
        <span class="at-two-bar"><u style="width:${(p * 100).toFixed(1)}%"></u></span><span class="at-two-p">${esc(c.progText || '')}</span>
        <span class="at-two-n">${esc(c.next || '')}</span></button>`;
    };
    return `<div class="at-two" aria-label="Two strategies">${L.map(one).join('')}</div>`;
  }
  const ACSS = `.av2{border-color:color-mix(in srgb,${C.warn} 45%,transparent)}.av2-bar{position:relative;height:6px;border-radius:99px;background:${C.line};overflow:hidden;margin:8px 0 4px}.av2-bar u{position:absolute;left:0;top:0;bottom:0;border-radius:99px;background:var(--c)}.at-cand{border-color:color-mix(in srgb,${C.warn} 45%,transparent)}.sb-in{border-top:1px solid ${C.line};margin-top:8px;padding-top:4px}.at-hero{border-width:1.5px}.at-top{display:flex;gap:14px;justify-content:space-between;align-items:flex-start;flex-wrap:wrap}.at-top>div:first-child{flex:1 1 220px;min-width:0}
.at-h{margin:8px 0 4px;font-size:20px}.at-day{text-align:right;min-width:110px}.at-day span,.at-day em{display:block;font-size:11.5px;opacity:.7;font-style:normal}.at-day b{display:block;font-size:26px;font-weight:800}
.at-lit{margin-top:10px;padding-top:8px;border-top:1px solid ${C.line}}.at-sec{margin:18px 2px 10px;font-size:16px}
.at-two{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:0 0 14px}.at-two-c{display:flex;flex-direction:column;gap:7px;text-align:left;font:inherit;color:inherit;cursor:pointer;min-width:0;
border:1.5px solid color-mix(in srgb,var(--c) 55%,transparent);border-radius:16px;padding:12px;background:color-mix(in srgb,var(--c) 8%,transparent)}
.at-two-h{display:flex;flex-direction:column;min-width:0}.at-two-h b{font-size:16px;letter-spacing:.03em}.at-two-h em{font-style:normal;font-size:11.5px;opacity:.7;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.at-two-c .sc-pill{align-self:flex-start;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.at-two-k{display:grid;grid-template-columns:1fr 1fr;gap:6px}.at-two-k i{display:block;font-style:normal;font-size:10.5px;opacity:.65;text-transform:uppercase;letter-spacing:.04em}.at-two-k b{font-size:16px}
.at-two-bar{position:relative;height:6px;border-radius:99px;background:${C.line};overflow:hidden}.at-two-bar u{position:absolute;left:0;top:0;bottom:0;border-radius:99px;background:var(--c)}
.at-two-p{font-size:11.5px;opacity:.75;line-height:1.35}.at-two-n{font-size:12.5px;line-height:1.4;font-weight:600;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
@media (max-width:340px){.at-two{grid-template-columns:1fr}}`;
  window.SecondUI = { render, brain, brainList, acctB, scoreBox, scoreCard, atlas, atlasStatus, atlasCard, atlasMoney, twoCards, members, candCard,
    setCharts: (c) => { PICS = c || null; }, version: 8, atlasV2Card };
})();

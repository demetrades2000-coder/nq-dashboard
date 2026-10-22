// The phone app's main pages (loaded by index.html with one <script defer> after extras.js). Data: data.json, and for the
// first paint of Home the small home.json (both built by tools/build_web_dashboard.py; "hub" = _hub()).
//   Navigation   five tabs: Home · Trades · Money · Strategy · More (the desktop sidebar shows the same groups)
//   Home         is the bot trading my eval (engine/accounts.verdict), today's P&L, the open trade on a mini chart (entry /
//                stop / target / breakeven), eval progress ($ to +$3,000, room to the floor, session X of 10, pass odds),
//                the next killzone and the entry cut-off, PC / feed health (heartbeat, NinjaTrader bars, version, auto-update,
//                auto-resume) and a "Bot stopped" banner with the one-line fix (this app is read-only: it cannot start the bot)
//   Home > LIT plan     today's levels, the VIX target band, the sweeps and CISDs seen (engine/lit_brief.py)
//   Home > Live detail  the previous Today page (Live Oracle, week ring, liquidity map, signals)
//   Trades > Journal    search / filter (side, result, session, month), CSV export, per-trade notes (this phone only)
//   Trades > Stats      key stats, streaks, R histogram, time-of-day heatmap (backtest or the live eval)
//   Trades > Execution  slippage, missed and extra trades against the backtest (engine/fill_audit.py via the heartbeat)
//   Money > Prop firms  firm cards (research/props/firms.json: prices, codes with copy, rules, LIT fit), what to buy next,
//                payout calendar, business P&L;  Home > Market: news week, CME holidays, the roll countdown, the VIX band
//   Money        $ a month (the Jul-Oct rate), the owner's monthly goal, the funded three-account plan, the payout tracker,
//                the accounts table;  Money > What if: the next trade at target / at the stop / at breakeven
//   Strategy     the live rules in plain words, the upgrade combo (t_check + scale_in + be_off; ON/OFF read from live_model.json: t_check + be_off ON since 2026-10-20, scale_in OFF until the Sim check), the research
//                scoreboard, the changelog
//   Settings     + monthly goal, compact mode, light theme (all stored on this phone only)
// Classic script that uses the main page's helpers (D, VIEWS, GROUPS, icon, esc, usd ...). Paper only, read-only.
(function () {
  'use strict';
  if (typeof GROUPS === 'undefined' || typeof VIEWS === 'undefined') return;
  window.HUB = true;
  VIEWS.live = VIEWS.today;                  // the previous Today page lives on as Home > Live detail

  // ============================================================================================ data access
  const HD = () => (typeof D !== 'undefined' && D) || window.HOMEJ || null;
  const HL = () => (HD() && HD().live) || {};
  const HUBD = () => (HD() && HD().hub) || {};
  const now = () => Date.now() / 1000;
  const ACC = () => ((HD() && HD().accounts) || []).filter((a) => a && a.id);
  const pcAcct = () => ACC().find((a) => a.source === 'pc' && !a.error) || null;
  const cloudAcct = () => ACC().find((a) => a.source === 'cloud' && !a.error) || null;
  const pcHB = () => HL().pc || {};
  const health = () => (pcHB().health && typeof pcHB().health === 'object' ? pcHB().health : null);
  const sum = (a, f) => a.reduce((s, x) => s + (f ? f(x) : x), 0);
  const ageTxt = (s) => !ok(s) ? '—' : s < 90 ? Math.round(s) + ' s' : s < 5400 ? Math.round(s / 60) + ' min' : s < 172800 ? Math.round(s / 3600) + ' h' : Math.round(s / 86400) + ' days';
  const hmET = (t) => (ok(t) && t > 0 ? et(t).hm : '—');
  const notesKey = 'notes';
  const getNotes = () => store.get(notesKey, {}) || {};
  const tid = (t) => `${t.day || ''}_${t.entry_t || t.time || ''}`;

  // the eval account the Home screen follows: the PC bot's (MFFU 50K) when it reports, else the cloud paper ledger
  function mainAcct() {
    const pc = pcAcct(), cl = cloudAcct();
    if (pc && pc.conn && pc.conn.connected) return { a: pc, src: 'pc' };
    if (pc && pc.eval) return { a: pc, src: 'pc-old' };
    return cl ? { a: cl, src: 'cloud' } : { a: pc, src: 'pc' };
  }
  // the open trade: the PC account's position, else the cloud paper position
  function openPos() {
    const pc = pcAcct();
    if (pc && pc.position && pc.position.side) { const p = pc.position; return { ...p, dir: p.dir || (p.side === 'LONG' ? 1 : -1), src: 'pc', acct: pc.name }; }
    const p = HL().position;
    if (p) { const d = +p.dir || 1; return { side: d === 1 ? 'LONG' : 'SHORT', dir: d, qty: p.qty, entry: +p.entry, stop: +p.stop, stop0: +(p.stop0 || p.stop), target: +p.target, be: !!p.be,
      entry_t: p.entry_t, risk_pts: p.risk_pts, target_label: p.target_label, unrealized_r: p.unrealized_r, src: 'cloud', acct: 'Paper (cloud)' }; }
    return null;
  }

  // ============================================================================================ time: killzones + entry window
  // LIT enters 02:00-15:30 ET (live_model.json lit.window); inside it the three usual killzones; flat at 15:55
  const KZ = [[120, 300, 'London killzone'], [570, 690, 'NY AM killzone'], [810, 930, 'NY PM killzone']];
  function clock(ts = now()) {
    const e = et(ts), mod = e.h * 60 + e.mi, wk = !['Sat', 'Sun'].includes(e.wd);
    const win = ((HD()?.strategy?.lit || {}).window || [[120, 930]])[0] || [120, 930];
    const base = ts - (mod * 60 + (ts % 60));                        // ET midnight in unix seconds (minute precision)
    const at = (m, dayAdd = 0) => base + m * 60 + dayAdd * 86400;
    const fri = e.wd === 'Fri', sat = e.wd === 'Sat', sun = e.wd === 'Sun';
    const nextDay = sat ? 2 : sun ? 1 : fri ? 3 : 1;
    const inWin = wk && mod >= win[0] && mod < win[1];
    const kz = wk && KZ.find(([a, b]) => mod >= a && mod < b);
    let nextKz = null;
    if (wk) { const k = KZ.find(([a]) => mod < a); if (k) nextKz = { label: k[2], t: at(k[0]), end: at(k[1]) }; }
    if (!nextKz) nextKz = { label: KZ[0][2], t: at(KZ[0][0], nextDay), end: at(KZ[0][1], nextDay) };
    const winOpen = inWin ? null : (wk && mod < win[0] ? at(win[0]) : at(win[0], nextDay));
    return { e, mod, wk, win, inWin, kz: kz ? { label: kz[2], end: at(kz[1]) } : null, nextKz, winOpen, cutoff: at(win[1]), flat: at(955) };
  }

  // ============================================================================================ small UI parts
  const pill = (txt, lvl) => `<span class="hb-pill ${lvl}">${txt}</span>`;
  const light = (lvl) => `<i class="hb-dot ${lvl}"></i>`;
  const tile = (label, value, sub = '', k = '') => `<div class="hb-tile"><span>${label}</span><b class="${k}">${value}</b>${sub ? `<em>${sub}</em>` : ''}</div>`;
  const meter = (f, k = '') => `<div class="hb-meter ${k}"><i style="width:${(Math.max(0, Math.min(1, f)) * 100).toFixed(1)}%"></i></div>`;
  const vchip = (v) => ({ rejected: chip('rejected', 'bad'), candidate: chip('candidate', 'good'), adopted: chip('live', 'good'), info: chip('info') }[v] || chip(esc(v || 'info')));
  const download = (name, text, type = 'text/csv') => {
    try { const b = new Blob([text], { type }), u = URL.createObjectURL(b), a = document.createElement('a'); a.href = u; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 2000); toast('Saved ' + name); }
    catch (e) { toast('Download not allowed here'); }
  };
  const csvCell = (v) => { const s = v == null ? '' : String(v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };

  // a mini chart of the open trade: the recent 5m candles with the entry, stop, target and breakeven lines (SVG, no deps)
  function miniChart(bars, p, W = Math.round(Math.min(1100, Math.max(300, (document.querySelector('#page')?.clientWidth || innerWidth) - 50))), H = 220) {
    if (!bars || bars.length < 3) return `<div class="note">No recent bars to draw yet: the chart appears with the next cloud run.</div>`;
    let i0 = 0;
    if (p && p.entry_t) { const k = bars.findIndex((b) => b[0] >= p.entry_t); if (k >= 0) i0 = Math.max(0, k - 18); }
    const B = bars.slice(Math.max(i0, bars.length - 60));
    const lv = p ? [[p.target, 'var(--good)', 'Target'], [p.entry, 'var(--accent-2)', 'Entry'], [p.stop0 || p.stop, 'var(--bad)', 'Stop']] : [];
    const r0 = p ? Math.abs(p.entry - (p.stop0 || p.stop)) : 0;
    if (p && r0) lv.push([p.entry + r0 * p.dir, 'rgba(238,241,248,.55)', p.be ? 'BE done' : 'BE 1R']);
    if (p && ok(p.stop) && p.stop0 && Math.abs(p.stop - p.stop0) > 0.01) lv.push([p.stop, 'var(--warn)', 'Stop now']);
    const vals = [...B.flatMap((b) => [b[2], b[3]]), ...lv.map((x) => x[0]).filter(ok)];
    let lo = Math.min(...vals), hi = Math.max(...vals); const pad = (hi - lo) * 0.06 || 1; lo -= pad; hi += pad;
    const R = 132, w = (W - R) / B.length, y = (v) => (H - 8) - (v - lo) / (hi - lo) * (H - 16);
    const cs = B.map((b, i) => { const x = i * w + w / 2, up = b[4] >= b[1], c = up ? '#2ee59d' : '#ff5a7a';
      return `<line x1="${x.toFixed(1)}" x2="${x.toFixed(1)}" y1="${y(b[2]).toFixed(1)}" y2="${y(b[3]).toFixed(1)}" stroke="${c}" stroke-width="1"/>`
        + `<rect x="${(x - w * 0.34).toFixed(1)}" y="${Math.min(y(b[1]), y(b[4])).toFixed(1)}" width="${Math.max(1, w * 0.68).toFixed(1)}" height="${Math.max(1, Math.abs(y(b[1]) - y(b[4]))).toFixed(1)}" fill="${c}" rx="1"/>`; }).join('');
    let ex = '';
    if (p && p.entry_t) { const k = B.findIndex((b) => b[0] >= p.entry_t); if (k >= 0) ex = `<line x1="${(k * w + w / 2).toFixed(1)}" x2="${(k * w + w / 2).toFixed(1)}" y1="4" y2="${H - 4}" stroke="rgba(238,241,248,.25)" stroke-dasharray="3 4"/>`; }
    const ls = lv.filter((x) => ok(x[0])).map(([v, c, l]) => `<line x1="0" x2="${W - R + 4}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}" stroke="${c}" stroke-width="1.4" ${/BE/.test(l) ? 'stroke-dasharray="5 4"' : ''}/>`
      + `<text x="${W - R + 8}" y="${(y(v) + 4).toFixed(1)}" fill="${c}" class="hb-ax">${l} ${num(v, 2)}</text>`).join('');
    return `<svg class="hb-mini" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Recent 5-minute bars with the trade's levels">${ex}${cs}${ls}</svg>`;
  }

  // ============================================================================================ HOME
  function banner() {
    const v = HL().pc_verdict || {}, pc = pcHB(), hl = health(), res = hl?.auto?.resume || {};
    const silent = v.code === 'SILENT' || (pc.present && pc.silent), stopped = v.code === 'DISABLED' && /stopped/i.test(v.label || '') || (pc.present && pc.running === false);
    if (!silent && !stopped && pc.present !== false) return '';
    if (!pc.present && !silent && !stopped) return '';
    const auto = res.on ? `Auto-resume is <b>on</b>${res.account ? ` (${esc(res.account)})` : ''}: it restarts the bot by itself after a reboot or a crash.` : 'Auto-resume is <b>off</b>: after a reboot the bot waits for you.';
    return `<div class="hb-banner bad" role="alert"><div class="hb-bi">${icon('pause')}</div><div><b>${silent ? 'PC bot silent: the PC or the bot is off' : 'Bot stopped'}</b>
      <p>${silent ? 'Turn the Surface on (or wake it), then' : 'On the Surface:'} <b>Bot Control → Start</b>. ${auto} This app is read-only and cannot start it.</p>
      ${v.reason ? `<p class="small mut">${esc(v.reason)}</p>` : ''}</div></div>`;
  }
  // the Surface's last check-in (the newest of the heartbeat in data.json and the PC's live.json, live.js), always on top of Home: red "OFFLINE since ..." when it is older than 30 min on a
  // weekday 01:30-16:00 ET (the cloud pushes the same alert once per outage: engine/push.pc_outage)
  function surfaceLine() {
    const pc = pcHB(), t = ok(pc.t) && pc.t > 0 ? pc.t : null, n = now();
    const e = et(n), mod = e.h * 60 + e.mi, inHours = !['Sat', 'Sun'].includes(e.wd) && mod >= 90 && mod <= 960;
    // judge the check-in against the time this phone's data was built (unless the PC's live.json is in): old cloud data is
    // "phone data is old", never "Surface offline"
    const bms = Date.parse(HD()?.built || ''), ref = pc.live || !Number.isFinite(bms) ? n : Math.min(n, bms / 1000);
    const age = t ? n - t : null, stale = !t || ref - t > 30 * 60;
    const since = t ? (et(t).date === e.date ? et(t).hm : `${et(t).wd} ${et(t).hm}`) : null;
    const lvl = !stale ? 'good' : inHours ? 'bad' : 'warn';
    const txt = !t ? 'Surface: no check-in yet (no heartbeat)'
      : stale && inHours ? `Surface OFFLINE since ${since} ET`
      : `Surface last check-in ${since} ET`;
    const sub = !t ? 'the PC bot does not report to the cloud' : stale && inHours ? `${ageTxt(age)} ago: the bot can't trade. Check it's awake and NinjaTrader is connected.`
      : `${ageTxt(age)} ago${stale ? ' · offline (outside trading hours)' : pc.live ? ' · live from the PC' : age > 30 * 60 ? ' · it was fine when this data was built; pull down to refresh' : ' · via the cloud check'}`;
    return `<div class="hb-surface ${lvl}" role="${lvl === 'bad' ? 'alert' : 'status'}">${light(lvl)}<div><b>${esc(txt)}</b><em>${esc(sub)}</em></div></div>`;
  }
  function verdictCard(M) {
    const v = HL().pc_verdict || {}, pc = pcHB(), hl = health(), a = hl?.account || {};
    const lvl = v.level || (pc.present ? 'warn' : 'bad'), hb = ok(pc.t) && pc.t > 0 ? now() - pc.t : pc.age_s;
    const label = v.label || (pc.present ? 'CHECKING' : 'PC NOT REPORTING');
    const acct = M.a ? `${esc(M.a.name)} ${accBadge(M.a)}` : '';
    const day = M.a?.pnl?.today;
    return `<div class="card hb-hero ${lvl}"><div class="hb-hl"><div class="eyebrow">Is the bot trading my eval?</div>
        <div class="hb-verdict">${light(lvl)}<span>${esc(label)}</span></div>
        <p class="hb-reason">${esc(v.reason || (pc.present ? 'The PC reports; waiting for its health block.' : 'No heartbeat from the PC: only the cloud paper bot runs.'))}</p>
        <div class="hb-meta">${acct}${a.name && a.name !== M.a?.name ? `<span>${esc(a.name)}</span>` : ''}<span>${icon('clock')}heartbeat ${hb != null ? ageTxt(hb) + ' ago' : '—'}</span>${pc.host ? `<span>${esc(pc.host)}</span>` : ''}</div></div>
      <div class="hb-hr"><span>Today</span><b class="${cls(day)}">${susd(day)}</b><em>${M.src === 'cloud' ? 'cloud paper' : esc(M.a?.name || 'eval')} · ${plural((M.a?.stats?.n ?? 0), 'trade')} closed</em></div></div>`;
  }
  function kpiRow(M) {
    const e = M.a?.eval || {}, tw = HD()?.extras?.two_week?.eval?.H2;
    const toGo = ok(e.to_target) ? e.to_target : null, room = e.room, ses = e.session;
    return `<div class="hb-tiles">
      ${tile('To +$3,000', toGo != null ? usd(toGo) : '—', ok(e.profit) ? `profit ${susd(e.profit)}` : '', toGo === 0 ? 'up' : '')}
      ${tile('Room to floor', ok(room) ? usd(room) : '—', ok(e.floor) ? `floor ${usd(e.floor)}${e.locked ? ' · locked' : ''}` : '', ok(room) && room < 700 ? 'dn' : '')}
      ${tile('Session', ok(ses) ? `${ses}<small> / ${e.sessions || 10}</small>` : '—', e.clock_text ? esc(e.clock_text).slice(0, 60) : 'two-week eval clock')}
      ${tile('Pass odds', tw ? pct(tw.p10) : '—', tw ? `in 2 weeks · fail ${pct(tw.f10)}` : 'backtest odds')}</div>`;
  }
  function tradeCard() {
    const p = openPos(), C = clock(), lv = HL(), hl = health();
    if (!p) {
      const stage = hl?.lit?.text || lv.model_state || '—';
      return `<div class="card hb-trade"><div class="card-h"><h3>${icon('target')}No open trade</h3><span class="meta">${esc((HL().lit_rules?.weekly_stop?.text) || '')}</span></div>
        <p class="hb-stage">${esc(stage)}</p>${killzone(C)}</div>`;
    }
    const px = ok(lv.price) ? lv.price : null, r0 = Math.abs(p.entry - (p.stop0 || p.stop)) || 1;
    const upnl = ok(p.unrealized) ? p.unrealized : px != null && p.qty ? (px - p.entry) * p.dir * p.qty * PV_MNQ : null;
    const ur = ok(p.unrealized_r) ? p.unrealized_r : px != null ? (px - p.entry) * p.dir / r0 : null;
    return `<div class="card hb-trade on"><div class="card-h"><h3><span class="${p.dir === 1 ? 'up' : 'dn'}">${icon(p.dir === 1 ? 'long' : 'short')}${esc(p.side)}</span> ${p.qty ?? '—'} MNQ · ${hmET(p.entry_t)} ET</h3>
        <span class="meta">${esc(p.acct || '')}${p.be ? ' · at breakeven' : ''}</span></div>
      <div class="hb-tiles t5">${tile('Open P&amp;L', susd(upnl), fR(ur), cls(upnl))}${tile('Entry', num(p.entry, 2))}${tile('Stop', num(p.stop, 2), p.be ? 'moved to BE' : num(r0, 1) + ' pts', 'dn')}
        ${tile('Target', num(p.target, 2), esc(p.target_label || ''), 'up')}${tile('BE at', num(p.entry + r0 * p.dir, 2), p.be ? 'done' : '+1R')}</div>
      ${miniChart(lv.bars, p)}</div>`;
  }
  function killzone(C) {
    const cut = C.wk && C.mod < C.win[1];
    const lines = [];
    if (C.kz) lines.push(`<div class="hb-kz on">${light('good')}<span><b>${esc(C.kz.label)} now</b> · ends in <b data-cd="${C.kz.end}">${cdFmt(C.kz.end - now())}</b></span></div>`);
    lines.push(`<div class="hb-kz">${light('')}<span>Next: <b>${esc(C.nextKz.label)}</b> ${et(C.nextKz.t).wd} ${et(C.nextKz.t).hm} ET · in <b data-cd="${C.nextKz.t}">${cdFmt(C.nextKz.t - now())}</b></span></div>`);
    lines.push(`<div class="hb-kz">${light(C.inWin ? 'good' : '')}<span>Entry window ${hmM(C.win[0])}–${hmM(C.win[1])} ET · ${C.inWin ? `open, <b>cut-off in <span data-cd="${C.cutoff}">${cdFmt(C.cutoff - now())}</span></b>` : C.winOpen ? `opens in <b data-cd="${C.winOpen}">${cdFmt(C.winOpen - now())}</b>` : ''}${cut || C.inWin ? ' · flat 15:55' : ''}</span></div>`);
    return `<div class="hb-kzs">${lines.join('')}</div>`;
  }
  function evalCard(M) {
    const e = M.a?.eval; if (!e) return '';
    const tw = HD()?.extras?.two_week?.eval, ev = HD()?.extras?.eventual;
    const prog = Math.max(0, Math.min(1, (e.profit || 0) / 3000)), roomF = Math.max(0, Math.min(1, (e.room || 0) / (e.mll || 2000)));
    const n = e.sessions || 10, s = e.session || 0;
    return `<div class="card"><div class="card-h"><h3>${icon('prop')}MFFU Builder 50K eval</h3><button class="chipbtn" type="button" data-go="whatif"><span>What if</span>${icon('right')}</button></div>
      <div class="hb-prog"><div class="hb-ph"><span>Profit <b class="${cls(e.profit)}">${susd(e.profit)}</b> of +$3,000</span><span>${usd(e.balance)}</span></div>${meter(prog, 'good')}
        <div class="hb-ph"><span>Room above the floor <b>${usd(e.room)}</b> of ${usd(e.mll || 2000)}</span><span>daily loss used ${usd(e.dll_used)} / ${usd(e.dll || 1000)}</span></div>${meter(roomF, roomF < 0.35 ? 'bad' : '')}</div>
      <div class="hb-ses" aria-label="Session ${s} of ${n}">${Array.from({ length: n }, (_, i) => `<i class="${i + 1 < s ? 'done' : i + 1 === s ? 'now' : ''}">${i + 1}</i>`).join('')}</div>
      <p class="small mut" style="margin:10px 0 0">${tw?.H2 ? `Backtest odds with today's two-week sizing: pass in 2 weeks <b class="up">${pct(tw.H2.p10)}</b> (Jul–Oct check) / ${pct(tw.H1?.p10)} (Jan–Jun), fail ${pct(tw.H2.f10)} / ${pct(tw.H1?.f10)}.` : ''}
        ${ev && (ev['MC H1'] || ev.H1) ? ` Eventual pass (no reset, safe_eval after session 10): ${pct((ev['MC H1'] || ev.H1).pass)} / ${pct((ev['MC H2'] || ev.H2 || {}).pass)}.` : ' After session 10 the eval keeps going in safe_eval (no reset).'}</p></div>`;
  }
  function healthCard() {
    const pc = pcHB(), hl = health(), f = hl?.feed || {}, A = hl?.auto || {}, u = A.update || {}, r = A.resume || {}, nt = hl?.nt || {};
    const hb = ok(pc.t) && pc.t > 0 ? now() - pc.t : pc.age_s;
    const row = (lvl, k, v, s = '') => `<div class="hb-hrow">${light(lvl)}<span>${k}</span><b>${v}</b>${s ? `<em>${s}</em>` : ''}</div>`;
    const age1 = f.age_1m_s, age5 = f.age_5m_s, mkt = f.market_open !== false && clock().wk;
    const barLvl = (a, lim) => !ok(a) ? '' : a <= lim ? 'good' : mkt ? 'bad' : 'warn';
    const cloudAge = HL().last_run ? now() - HL().last_run : null;
    const pcb = HL().health?.pc_bars || {};
    return `<div class="card"><div class="card-h"><h3>${icon('engine')}PC &amp; feed health</h3><button class="chipbtn" type="button" data-go="ops"><span>Ops check</span>${icon('right')}</button></div>
      <div class="hb-health">
        ${row(!pc.present ? 'bad' : hb != null && hb < 20 * 60 ? 'good' : 'bad', 'Heartbeat', pc.present ? ageTxt(hb) + ' ago' : 'none', pc.present ? `every ${ageTxt(+pc.every_s || 300)} · ${esc(pc.host || '')}` : 'the PC bot does not report')}
        ${(() => { const la = window.LIVE && window.LIVE.age ? window.LIVE.age() : null, lp = pc.live_pub || {};
          return row(la != null && la < 600 ? 'good' : lp.ok === false ? 'bad' : '', 'Live feed (PC → phone)', la != null ? ageTxt(la) + ' ago' : lp.ok === false ? 'failing' : '—',
            la != null && la < 600 ? 'every minute while the bot runs' : lp.ok === false ? esc(lp.error || 'push failed') + ' · on the Surface: python -m engine.live_publish --once' : 'starts with the PC bot update'); })()}
        ${row(pc.running === false ? 'bad' : pc.present ? 'good' : '', 'Bot', pc.running === false ? 'stopped' : pc.present ? 'running' : '—', hl?.kill ? 'kill switch ON' : '')}
        ${row(barLvl(age1, 240), 'NinjaTrader 1m bars', ok(age1) ? ageTxt(Math.max(0, age1)) + ' old' : pcb.age_1m_s != null ? ageTxt(pcb.age_1m_s) + ' old' : '—', f.entries_blocked ? 'new entries blocked: ' + esc(f.block || 'feed stale') : f.source ? esc(f.source) + (f.no_yahoo ? ' · no Yahoo' : '') : esc(pcb.text || ''))}
        ${row(barLvl(age5, 660), 'NinjaTrader 5m bars', ok(age5) ? ageTxt(Math.max(0, age5)) + ' old' : '—')}
        ${row(nt.connected === false ? 'bad' : nt.connected ? 'good' : '', 'NinjaTrader', nt.connected === false ? 'DISCONNECTED' : nt.connected ? 'connected' : '—', nt.last_error ? esc(nt.last_error) : '')}
        ${row(A.version ? (u.result === 'failed' || u.result === 'rolled_back' ? 'bad' : 'good') : '', 'Version', A.version ? esc(A.version) : '—', A.version ? `auto-update <b>${u.on ? 'on' : 'off'}</b>${u.result && u.result !== 'off' ? ` · last ${esc(u.result)}` : ''}${u.updated_at ? ` · updated ${et(u.updated_at).wd} ${et(u.updated_at).hm} ET` : ''}` : 'the PC bot sends no version yet (update it)')}
        ${row(r.on ? 'good' : A.version ? 'warn' : '', 'Auto-resume', A.version ? (r.on ? 'on' : 'off') : '—', r.on ? esc(r.account || '') : r.off_reason ? esc(r.off_reason) : r.last_result ? `last ${esc(r.last_result)}` : '')}
        ${row(cloudAge != null && cloudAge < 3600 ? 'good' : 'warn', 'Cloud check', cloudAge != null ? ageTxt(cloudAge) + ' ago' : '—', 'GitHub Actions · every 30 min on market days, from 01:30 ET')}
      </div></div>`;
  }
  function planTeaser() {
    const b = HL().brief || {}, m = b.morning || {}, log = (b.log || []).filter((x) => x.kind === 'sweep');
    if (!m.plan && !log.length) return '';
    const watched = (m.levels || []).filter((l) => !l.taken).length;
    return `<a class="card hb-plan" href="#/plan"><div class="card-h"><h3>${icon('target')}Today's LIT plan · ${esc(fDate(m.day || b.day || ''))}</h3><span class="meta">${icon('right')}</span></div>
      <p>${esc(m.plan || '')}</p><div class="chips">${chip(`${watched} levels watched`)}${chip(`${log.length} sweeps seen`)}${m.vix ? chip(`VIX ${num(m.vix.vix, 2)} · ${num(m.vix.move, 0)} pt move`) : ''}</div></a>`;
  }
  VIEWS.today = (el) => {
    const M = mainAcct();
    el.innerHTML = `${surfaceLine()}${banner()}${verdictCard(M)}${kpiRow(M)}${tradeCard()}
      <div class="grid g2 astart">${evalCard(M)}${healthCard()}</div>
      ${planTeaser()}
      <div class="hb-links">${[['trades', 'trades', 'Trades'], ['recaps', 'replay', 'Recaps'], ['weekly', 'results', 'Weekly'], ['money', 'wallet', 'Money'], ['strategy', 'rules', 'Strategy'], ['accounts', 'wallet', 'Accounts'], ['market', 'news', 'Market'], ['props', 'prop', 'Prop firms'], ['live', 'engine', 'Live detail'], ['activity', 'alerts', 'Activity']]
        .map(([g, ic, l]) => `<button class="chipbtn" type="button" data-go="${g}">${icon(ic)}<span>${l}</span></button>`).join('')}</div>
      <p class="small mut hb-foot">Paper / eval monitor · read-only · built ${HD()?.built ? esc(new Date(HD().built).toLocaleString()) : '—'}${HD()?.home_only ? ' · loading the rest…' : ''}</p>`;
  };

  // ============================================================================================ HOME > LIT plan
  VIEWS.plan = (el) => {
    if (!D) { el.innerHTML = skel(3); return; }
    const b = HL().brief || {}, m = b.morning || {}, n = b.now || {}, log = b.log || [], rc = b.recap;
    const kinds = { sweep: ['SWEEP', ''], cisd: ['CISD', 'good'], rejected: ['REJECTED', 'bad'], box: ['BOX', ''], armed: ['ARMED', 'good'], entry: ['ENTRY', 'good'], exit: ['EXIT', ''] };
    const untaken = (m.levels || []).filter((l) => !l.taken).sort((a, c) => c.price - a.price), taken = (m.levels || []).filter((l) => l.taken);
    const px = n.price || m.price || HL().price;
    const lvRow = (l) => `<div class="hb-lv ${l.side === 'H' ? 'h' : 'l'}"><span>${esc(l.label)}</span><b>${num(l.price, 2)}</b><em>${ok(px) ? (l.price > px ? '+' : '') + num(l.price - px, 1) + ' pts' : ''}</em></div>`;
    el.innerHTML = head(`Home · LIT plan · ${esc(fDate(m.day || b.day || ''))}`, 'Today’s LIT plan', esc(b.waiting ? `Built ${b.at || ''}; ${b.waiting}.` : `Built ${b.at || ''}.`))
      + (m.plan ? `<div class="card"><div class="card-h"><h3>${icon('target')}The plan</h3><span class="meta">engine/lit_brief.py</span></div><p class="lead">${esc(m.plan)}</p>
          ${m.vix ? `<p class="small mut">${esc(m.vix.text)}</p>` : ''}${m.eval?.text ? `<p class="small">${icon('prop')} ${esc(m.eval.text)}</p>` : ''}
          ${m.overnight?.text ? `<p class="small mut">${esc(m.overnight.text)}</p>` : ''}${b.news_text || m.news_text ? `<p class="small mut">${icon('news')} ${esc(b.news_text || m.news_text)}</p>` : ''}</div>` : emptyBox('No plan yet.', 'The day brief is written by the cloud monitor before the session.'))
      + `<div class="grid g2 astart"><div class="card"><div class="card-h"><h3>Levels watched</h3><span class="meta">${untaken.length} untaken · ${taken.length} taken · price ${num(px, 2)}</span></div>
          <div class="hb-lvs">${untaken.slice(0, 18).map(lvRow).join('') || '<p class="mut">Every level is taken.</p>'}</div>
          ${(m.boxes || []).length ? `<div class="chips" style="margin-top:12px">${m.boxes.map((x) => chip(`${esc(x.label)} ${esc(x.window || '')} · ${esc(x.status || '')}`)).join('')}</div>` : ''}</div>
        <div class="card"><div class="card-h"><h3>Sweeps and setups seen</h3><span class="meta">${plural(log.filter((x) => x.kind === 'sweep').length, 'sweep')} · ${plural(log.filter((x) => x.kind === 'cisd').length, 'CISD')}</span></div>
          <div class="feed">${log.slice(0, 30).map((x) => { const k = kinds[x.kind] || [String(x.kind || '').toUpperCase(), '']; return `<div class="evt"><div class="t">${hmET(x.t)}</div><div><span class="tag ${k[1]}">${esc(k[0])}</span>${esc(x.text)}</div></div>`; }).join('') || '<p class="mut">Nothing yet today.</p>'}</div></div></div>`
      + (rc ? `<div class="card"><div class="card-h"><h3>Recap</h3><span class="meta">${esc(rc.built || '')}</span></div><p>${esc(rc.text || '')}</p>${rc.setups ? `<p class="small mut">${esc(rc.setups)}</p>` : ''}${rc.lesson ? `<p class="small">${esc(rc.lesson)}</p>` : ''}</div>` : '')
      + `<div class="hb-links"><button class="chipbtn" type="button" data-go="levels">${icon('target')}<span>Levels board</span></button><button class="chipbtn" type="button" data-go="brief">${icon('doc')}<span>Full briefing</span></button><button class="chipbtn" type="button" data-go="day">${icon('clock')}<span>Day clock</span></button></div>`;
  };

  // ============================================================================================ TRADES > Journal (search, filter, CSV, notes)
  const SESS = [['all', 'All'], ['asia', 'Asia'], ['london', 'London'], ['pre', 'Pre-mkt'], ['nyam', 'NY AM'], ['lunch', 'Lunch'], ['nypm', 'NY PM']];
  const sessOf = (t) => { if (!t.entry_t) return 'all'; const e = et(t.entry_t), m = e.h * 60 + e.mi; return m >= 1080 || m < 120 ? 'asia' : m < 300 ? 'london' : m < 570 ? 'pre' : m < 690 ? 'nyam' : m < 810 ? 'lunch' : 'nypm'; };
  const resOf = (t) => (t.pnl > 5 ? 'win' : t.pnl < -5 ? 'loss' : 'be');
  function srcTrades(src) {
    if (src === 'live') { const a = pcAcct(); return (a?.trades || []).map((t) => ({ ...t, exit_price: t.exit_px, src: 'live' })).reverse(); }
    if (src === 'paper') { const a = cloudAcct(); return (a?.trades || []).map((t) => ({ ...t, exit_price: t.exit_px, src: 'paper' })).reverse(); }
    const T = D.trades || [];
    return src === 'all' ? T : T.filter((t) => String(t.day) >= '2026');
  }
  const JF = () => ({ src: '2026', side: 'all', res: 'all', sess: 'all', month: 'all', q: '', ...(store.get('jf', {}) || {}) });
  function jFilter(T, f) {
    const q = f.q.trim().toLowerCase(), N = getNotes();
    return T.filter((t) => (f.side === 'all' || t.side === f.side) && (f.res === 'all' || resOf(t) === f.res) && (f.sess === 'all' || sessOf(t) === f.sess)
      && (f.month === 'all' || String(t.day).slice(0, 7) === f.month)
      && (!q || [t.day, t.side, t.exit, t.target_label, t.trigger, N[tid(t)], ...(t.report?.why || []), t.report?.result].join(' ').toLowerCase().includes(q)));
  }
  const JSHOW = { n: 40 };
  VIEWS.journal = (el) => {
    if (!D) { el.innerHTML = skel(3); return; }
    const f = JF(), all = srcTrades(f.src), T = jFilter(all, f), N = getNotes();
    const months = [...new Set(all.map((t) => String(t.day).slice(0, 7)))].sort().reverse();
    const k = (t) => tid(t), net = sum(T, (t) => +t.pnl || 0), wins = T.filter((t) => resOf(t) === 'win').length;
    const sel = (id, opts, cur) => `<select class="hb-sel" id="${id}">${opts.map(([v, l]) => `<option value="${esc(v)}"${String(v) === String(cur) ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
    el.innerHTML = head('Trades · journal', 'Find any trade', 'Search and filter every trade, add your own notes (kept on this phone only) and export to CSV.')
      + `<div class="card hb-filt">
        <div class="hb-frow">${sel('jSrc', [['2026', 'Backtest 2026'], ['all', 'Backtest 5 years'], ['live', 'Live eval (PC)'], ['paper', 'Cloud paper']], f.src)}
          ${sel('jSide', [['all', 'Both sides'], ['LONG', 'Long'], ['SHORT', 'Short']], f.side)}${sel('jRes', [['all', 'Any result'], ['win', 'Winners'], ['loss', 'Losers'], ['be', 'Breakeven']], f.res)}
          ${sel('jSess', SESS.map(([v, l]) => [v, v === 'all' ? 'Any session' : l]), f.sess)}${sel('jMon', [['all', 'Any month'], ...months.map((m) => [m, fDate(m)])], f.month)}</div>
        <div class="hb-frow"><input class="hb-in" id="jQ" type="search" placeholder="Search: day, exit, level, your notes…" value="${esc(f.q)}" autocomplete="off">
          <button class="btn ghost" type="button" id="jCsv">${icon('share')}CSV</button><button class="btn ghost" type="button" id="jNotes">${icon('doc')}Notes</button><button class="btn ghost" type="button" id="jReset">${icon('close')}Reset</button></div>
        <p class="small mut" style="margin:8px 0 0"><b>${T.length}</b> of ${all.length} trades · net <b class="${cls(net)}">${susd(net)}</b> · win ${T.length ? pct(100 * wins / T.length) : '—'}${f.src === '2026' || f.src === 'all' ? ' · backtest at the LIT rule ($800 up to a 20-pt stop)' : ''}</p></div>
      <div class="hb-jl">${T.slice(0, JSHOW.n).map((t, i) => `<div class="hb-jr" data-i="${i}"><button type="button" class="hb-jm" data-open="${i}">
          <span class="side-i ${t.side === 'LONG' ? 'L' : 'S'}">${icon(t.side === 'LONG' ? 'long' : 'short')}</span>
          <span class="hb-jt"><b>${esc(fDate(t.day))} · ${hmET(t.entry_t)} ET</b><span class="small mut">${esc(t.side)} · ${t.qty ?? '—'} MNQ · ${num(t.risk_pts, 1)} pt stop · ${esc(t.exit || '')}${N[k(t)] ? ' · ' + icon('doc') + ' note' : ''}</span></span>
          <span class="hb-jv"><b class="${cls(t.pnl)}">${susd(t.pnl)}</b><span class="small ${cls(t.r)}">${fR(t.r)}</span></span></button>
        <details class="hb-note"${N[k(t)] ? ' open' : ''}><summary>${icon('doc')}My note</summary><textarea data-note="${esc(k(t))}" rows="2" placeholder="What did you see? (saved on this phone)">${esc(N[k(t)] || '')}</textarea></details></div>`).join('')
        || emptyBox('No trades match.', 'Change a filter or the source.')}${T.length > JSHOW.n ? `<button class="btn ghost hb-more" type="button" id="jMore">${icon('down')}Show ${Math.min(40, T.length - JSHOW.n)} more (${T.length - JSHOW.n} left)</button>` : ''}</div>`;
    $('#jMore')?.addEventListener('click', () => { JSHOW.n += 40; render(true); });
    const save = (p) => { store.set('jf', { ...JF(), ...p }); JSHOW.n = 40; render(true); };
    [['jSrc', 'src'], ['jSide', 'side'], ['jRes', 'res'], ['jSess', 'sess'], ['jMon', 'month']].forEach(([id, key]) => { const s = $('#' + id); if (s) s.onchange = () => save({ [key]: s.value, ...(key === 'src' ? { month: 'all' } : {}) }); });
    let qt; $('#jQ').oninput = (e) => { clearTimeout(qt); qt = setTimeout(() => { store.set('jf', { ...JF(), q: e.target.value }); const pos = e.target.selectionStart; render(true); const q = $('#jQ'); if (q) { q.focus(); try { q.setSelectionRange(pos, pos); } catch { } } }, 350); };
    $('#jReset').onclick = () => { store.set('jf', {}); render(true); };
    $('#jCsv').onclick = () => {
      const cols = ['day', 'entry_time_et', 'side', 'qty', 'entry', 'stop', 'target', 'exit_price', 'exit', 'risk_pts', 'r', 'pnl', 'session', 'note'];
      const rows = T.map((t) => [t.day, hmET(t.entry_t), t.side, t.qty, t.entry, t.stop, t.target, t.exit_price, t.exit, t.risk_pts, t.r, t.pnl, sessOf(t), N[k(t)] || '']);
      download(`lit-trades-${f.src}-${new Date().toISOString().slice(0, 10)}.csv`, [cols, ...rows].map((r) => r.map(csvCell).join(',')).join('\n'));
    };
    $('#jNotes').onclick = () => { const n = getNotes(), rows = Object.entries(n).filter(([, v]) => v); if (!rows.length) { toast('No notes yet'); return; }
      download(`lit-notes-${new Date().toISOString().slice(0, 10)}.csv`, [['trade', 'note'], ...rows].map((r) => r.map(csvCell).join(',')).join('\n')); };
    el.querySelectorAll('[data-open]').forEach((b) => { b.onclick = () => { const t = T[+b.dataset.open]; if (t) openSheet(t); }; });
    el.querySelectorAll('textarea[data-note]').forEach((ta) => { ta.oninput = () => { const n = getNotes(); if (ta.value.trim()) n[ta.dataset.note] = ta.value; else delete n[ta.dataset.note]; store.set(notesKey, n); }; });
  };

  // ============================================================================================ TRADES > Stats (key stats, streaks, R histogram, time of day)
  function streaks(T) {
    let cur = null, n = 0, bw = 0, bl = 0, rw = 0, rl = 0;
    for (const t of T) { const k = resOf(t); if (k === 'win') { rw++; rl = 0; } else if (k === 'loss') { rl++; rw = 0; } bw = Math.max(bw, rw); bl = Math.max(bl, rl); if (k === cur) n++; else { cur = k; n = 1; } }
    return { cur, n, bw, bl };
  }
  VIEWS.stats = (el) => {
    if (!D) { el.innerHTML = skel(3); return; }
    const sp = store.get('hs.span', '2026');
    const SP = { '2026': (t) => t.day >= '2026', H1: (t) => t.day >= '2026' && t.day <= '2026-06-30', H2: (t) => t.day >= '2026-07-01', '2021-25': (t) => t.day < '2026', live: null };
    const T = (sp === 'live' ? (pcAcct()?.trades || []) : (D.trades || []).filter(SP[sp] || SP['2026'])).filter((t) => ok(t.r)).slice().sort((a, b) => (a.entry_t || 0) - (b.entry_t || 0));
    const n = T.length, wins = T.filter((t) => t.pnl > 0), losses = T.filter((t) => t.pnl < 0), won = sum(wins, (t) => t.pnl), lost = -sum(losses, (t) => t.pnl);
    const S = streaks(T), best = T.reduce((a, t) => (!a || t.r > a.r ? t : a), null), worst = T.reduce((a, t) => (!a || t.r < a.r ? t : a), null);
    const bins = [[-9, -0.75, '−1R'], [-0.75, -0.25, '−0.5'], [-0.25, 0.25, 'BE'], [0.25, 1, '0–1R'], [1, 2, '1–2R'], [2, 4, '2–4R'], [4, 6, '4–6R'], [6, 8.5, '6–8R'], [8.5, 99, '8R+']];
    const H = bins.map(([a, b, l]) => ({ l, n: T.filter((t) => t.r >= a && t.r < b).length, neg: b <= 0.25 && a < -0.25 }));
    const mx = Math.max(1, ...H.map((x) => x.n));
    // weekday x entry hour (ET): average R, coloured; count in the corner
    const hours = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], WD = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
    const cell = {}; for (const t of T) { if (!t.entry_t) continue; const e = et(t.entry_t), w = WD.indexOf(e.wd); if (w < 0) continue; const k = w + '_' + e.h; (cell[k] = cell[k] || []).push(t); }
    const col = (r) => r == null ? 'transparent' : r > 0 ? `rgba(46,229,157,${Math.min(0.9, 0.15 + r / 4).toFixed(2)})` : `rgba(255,90,122,${Math.min(0.9, 0.2 + -r / 1.2).toFixed(2)})`;
    const byH = hours.map((h) => { const a = T.filter((t) => t.entry_t && et(t.entry_t).h === h); return { h, n: a.length, net: sum(a, (t) => t.pnl) }; });
    el.innerHTML = head('Trades · stats', 'Key stats & streaks', sp === 'live' ? 'The live eval’s closed trades (PC bot).' : 'The LIT replay of the live rules at the LIT size rule ($800 up to a 20-pt stop), costs in.')
      + `<div class="card hb-filt">${segHTML('hsSp', [['2026', '2026'], ['H1', 'Jan–Jun'], ['H2', 'Jul–Oct'], ['2021-25', '2021-25'], ['live', 'Live eval']], sp, 'sm')}</div>`
      + (!n ? emptyBox('No trades here yet.', sp === 'live' ? 'The live eval’s trades show here once the PC bot has closed one.' : '') : `
      <div class="hb-tiles">${tile('Trades', String(n), sp === 'live' ? '' : `${plural(wins.length, 'winner')}`)}${tile('Win rate', pct(100 * wins.length / n), `${losses.length} losers · ${n - wins.length - losses.length} flat`)}${tile('Avg R', fR(sum(T, (t) => t.r) / n), `net ${fR(sum(T, (t) => t.r), 1)}`, cls(sum(T, (t) => t.r)))}
        ${tile('Profit factor', lost ? fPF(won / lost) : '—', `net ${susd(won - lost)}`, cls(won - lost))}${tile('Best trade', fR(best?.r), `${susd(best?.pnl)} · ${esc(fDate(best?.day))}`, 'up')}${tile('Worst trade', fR(worst?.r), `${susd(worst?.pnl)} · ${esc(fDate(worst?.day))}`, 'dn')}
        ${tile('Now', `${S.n} ${S.cur === 'win' ? 'win' : S.cur === 'loss' ? 'loss' : 'BE'}${S.n === 1 ? '' : (S.cur === 'loss' ? 'es' : 's')}`, 'current streak', S.cur === 'win' ? 'up' : S.cur === 'loss' ? 'dn' : '')}${tile('Longest', `${S.bw} W · ${S.bl} L`, 'win / loss streaks')}</div>
      <div class="grid g2 astart"><div class="card"><div class="card-h"><h3>R-multiple histogram</h3><span class="meta">trades per result</span></div>
          <div class="hb-hist">${H.map((x) => `<div><b>${x.n || ''}</b><i class="${x.neg ? 'n' : x.l === 'BE' ? 'z' : 'p'}" style="height:${(x.n / mx * 100).toFixed(1)}%"></i><span>${x.l}</span></div>`).join('')}</div>
          <p class="small mut">LIT loses small and often (stop or breakeven) and wins big (target, banked at 8R): a ${pct(100 * wins.length / n)} win rate is enough.</p></div>
        <div class="card"><div class="card-h"><h3>Time of day</h3><span class="meta">entry hour ET · colour = average R</span></div>
          <div class="hb-heat" style="grid-template-columns:38px repeat(${hours.length},1fr)"><span></span>${hours.map((h) => `<span class="hh">${h}</span>`).join('')}
            ${WD.map((w, wi) => `<span class="hw">${w}</span>${hours.map((h) => { const a = cell[wi + '_' + h]; const r = a ? sum(a, (t) => t.r) / a.length : null;
              return `<i style="background:${col(r)}" title="${w} ${h}:00 · ${a ? a.length + ' trades · avg ' + fR(r) + ' · ' + susd(sum(a, (t) => t.pnl)) : 'no trades'}">${a ? a.length : ''}</i>`; }).join('')}`).join('')}</div>
          <div class="hb-hbar">${byH.filter((x) => x.n).map((x) => `<div><span>${pad2(x.h)}:00</span><b class="${cls(x.net)}">${kusd(x.net)}</b><em>${x.n}</em></div>`).join('')}</div></div></div>`)
      + `<div class="hb-links"><button class="chipbtn" type="button" data-go="edge">${icon('heat')}<span>Edge (MFE, levels, stops)</span></button><button class="chipbtn" type="button" data-go="pnlcal">${icon('results')}<span>P&amp;L calendar</span></button><button class="chipbtn" type="button" data-go="journal">${icon('doc')}<span>Journal</span></button></div>`;
    onSeg('hsSp', (v) => { store.set('hs.span', v); render(true); });
  };

  // ============================================================================================ TRADES > Execution
  VIEWS.execq = (el) => {
    const x = HD()?.exec;
    el.innerHTML = head('Trades · execution', 'Execution vs the backtest', 'How the live fills compare with the LIT backtest on the same bars: slippage in $ and ticks, missed trades and extra trades (engine/fill_audit.py on the PC, sent with its heartbeat).')
      + (x ? '<div class="card" id="hbExec"></div>' : emptyBox('No execution audit yet.', 'The PC sends it after its first audited trade on the eval. It needs the PC bot updated and running.'))
      + `<div class="card"><div class="card-h"><h3>What good looks like</h3></div><ul class="list"><li>Entry and exit slippage of 0–2 ticks a trade (one tick = $0.50 a micro).</li>
        <li>No trade missed while the PC was on. A missed trade is pushed to the phone.</li><li>Order latency a few seconds from the 1m CISD close (the PC routes ~3 s after it).</li></ul></div>`;
    if (x) loadLP().then((m) => { const b = $('#hbExec'); if (b && m.execBox) b.innerHTML = m.execBox(x); }).catch(() => { const b = $('#hbExec'); if (b) b.innerHTML = '<div class="note">Could not load the execution card.</div>'; });
  };

  // ============================================================================================ MONEY
  const goal = () => ({ usd: +store.get('goal.usd', 3000) || 3000, name: store.get('goal.name', 'C8 Corvette Z06') || 'my goal' });
  function accTable() {
    const A = ACC(); if (!A.length) return '';
    return `<div class="card"><div class="card-h"><h3>${icon('wallet')}Accounts side by side</h3><button class="chipbtn" type="button" data-go="accounts"><span>Accounts</span>${icon('right')}</button></div>
      <div class="tw"><table class="ht hb-at"><tr><th>Account</th><th class="c">Balance</th><th class="c">Profit</th><th class="c">Today</th><th class="c">To target</th><th class="c">Room</th><th class="c">Session</th><th class="c">Trades</th><th class="c">Win</th><th class="c">PF</th></tr>
      ${A.map((a) => { const e = a.eval || {}, s = a.stats || {}, p = a.pnl || {};
        return `<tr><td class="k"><b>${esc(a.name)}</b> ${accBadge(a)}${a.extra ? ' <span class="small mut">extra</span>' : ''}</td><td class="v">${usd(e.balance)}</td><td class="v ${cls(e.profit)}">${susd(e.profit)}</td><td class="v ${cls(p.today)}">${susd(p.today)}</td>
          <td class="v">${usd(e.to_target)}</td><td class="v ${ok(e.room) && e.room < 700 ? 'dn' : ''}">${usd(e.room)}</td><td class="v">${ok(e.session) ? `${e.session}/${e.sessions}` : '—'}</td><td class="v">${s.n ?? 0}</td><td class="v">${pct(s.win_pct)}</td><td class="v">${fPF(s.pf)}</td></tr>`; }).join('')}</table></div>
      <p class="small mut" style="margin:8px 0 0">Extra accounts appear here as soon as the PC bot routes them (live_model.json “accounts”, engine/multi_account.py).</p></div>`;
  }
  function payoutCard() {
    const F = ACC().find((a) => a.kind === 'funded'), e = F?.eval;
    const need = 50000 + 2100 + 1500;
    return `<div class="card"><div class="card-h"><h3>${icon('prop')}Funded payout tracker</h3>${F ? chip('funded', 'good') : chip('not funded yet')}</div>
      ${F && e ? `<div class="hb-tiles">${tile('Balance', usd(e.balance))}${tile('Ask for a payout at', usd(need), 'balance $53,600')}${tile('Still to go', usd(Math.max(0, need - e.balance)), '', e.balance >= need ? 'up' : '')}${tile('You can ask for', usd(Math.max(0, Math.min(2000, e.balance - 52100))), 'up to $2,000')}</div>`
        : `<p class="lead" style="margin-top:0">Shows here once the Builder 50K is passed and funded. Until then: the habit that pays most.</p>`}
      <ul class="list"><li>MFFU Builder funded: a <b>$2,100 buffer</b> stays above $50,000.</li><li>Ask <b>only once $1,500+ is above the buffer</b> (balance <b>$53,600</b>), then take up to <b>$2,000</b>.</li>
        <li>That habit pays <b>+$29 / +$32 a month</b> more per account (Jan–Jun / Jul–Oct) and loses fewer accounts (1.0 → 0.8%, 1.5 → 1.4%) than taking each $500 minimum (71% less).</li></ul>
      <p class="small mut"><a class="lnk" href="#/writeup/lit-money-batch2">research/writeups/lit-money-batch2.md</a> · funded sizing is not switched on yet (needs funded_state wiring).</p></div>`;
  }
  VIEWS.money = (el) => {
    const P = HD()?.results?.periods || {}, h2 = P['2026 H2 (check)'] || {}, h1 = P['2026 H1 (picked on)'] || {}, y = P['2026 YTD'] || {}, ref = P['2021-25 (reference)'] || {};
    const pm = (p) => ok(p.per_month) ? p.per_month : (typeof perMonth === 'function' && p.net != null ? perMonth(p.net, p.from, p.to) : null);
    const G = goal(), FU = HUBD().funded, tw = HD()?.extras?.two_week, M = mainAcct();
    const fH2 = FU?.trio?.H2, fH1 = FU?.trio?.H1;
    const bars = [['Backtest rate, Jul–Oct (check: quote this)', pm(h2), 'one account at the LIT rule'], ['Backtest rate, Jan–Jun (picked on)', pm(h1), 'the tuned half'],
      ['Three funded accounts, months 1-6 (Jul–Oct trades)', fH2?.net_per_month, 'net of every fee, mean'], ['Three funded accounts, months 4-6', fH2?.months4_6_per_month, 'once all three are funded']].filter((x) => ok(x[1]));
    const mx = Math.max(G.usd, ...bars.map((b) => b[1])) * 1.08;
    const thisMonth = (() => { const a = M.a, m = new Date().toISOString().slice(0, 7); return a?.days ? sum(a.days.filter((d) => String(d[0]).startsWith(m)), (d) => d[1]) : null; })();
    const plans = FU?.plans || [], up = sum(plans, (p) => +p.price || 0);
    el.innerHTML = head('Money', `${pm(h2) != null ? usd(pm(h2)) : '—'} a month`, 'The honest rate: the Jul–Oct 2026 half the strategy was not tuned on. Paper / backtest numbers, costs included ($1.90 a micro).')
      + `<div class="hb-tiles">${tile('Per month · Jul–Oct', usd(pm(h2)), `PF ${fPF(h2.pf)} · ${susd(h2.net)}`, 'up')}${tile('Per month · Jan–Jun', usd(pm(h1)), `PF ${fPF(h1.pf)} · ${susd(h1.net)}`)}
        ${tile('2026 so far', susd(y.net), `${usd(pm(y))} a month · DD ${usd(y.max_dd)}`)}${tile('2021-25 (reference)', susd(ref.net), `${usd(pm(ref))} a month · PF ${fPF(ref.pf)}`, cls(ref.net))}</div>
      <div class="card"><div class="card-h"><h3>${icon('star')}Goal: ${esc(G.name)}</h3><button class="chipbtn" type="button" data-go="settings"><span>Set goal</span>${icon('right')}</button></div>
        <p class="lead" style="margin-top:0">${usd(G.usd)} a month. ${fH2 && fH2.months4_6_per_month >= G.usd ? 'Three funded accounts reach it on the Jul–Oct trades once all three are funded.' : 'Not reached by one account on the check-half rate yet.'}</p>
        <div class="hb-goal">${bars.map(([l, v, s]) => `<div class="hb-gr"><span>${l}<em>${s}</em></span><div class="hb-gt"><i class="${v >= G.usd ? 'ok' : ''}" style="width:${(Math.max(0, v) / mx * 100).toFixed(1)}%"></i><u style="left:${(G.usd / mx * 100).toFixed(1)}%"></u></div><b class="${v >= G.usd ? 'up' : ''}">${usd(v)}</b></div>`).join('')}
          ${thisMonth != null ? `<div class="hb-gr"><span>${esc(M.a?.name || 'Eval')} this month<em>real ${M.src === 'cloud' ? 'paper' : 'eval'} P&amp;L</em></span><div class="hb-gt"><i class="${thisMonth >= G.usd ? 'ok' : ''}" style="width:${(Math.max(0, thisMonth) / mx * 100).toFixed(1)}%"></i><u style="left:${(G.usd / mx * 100).toFixed(1)}%"></u></div><b class="${cls(thisMonth)}">${susd(thisMonth)}</b></div>` : ''}</div>
        <p class="small mut">The white tick is your goal. Stored on this phone only.</p></div>
      ${FU ? `<div class="card"><div class="card-h"><h3>${icon('layers')}Funded plan: three accounts</h3>${chip('candidate', 'good')}</div>
        <div class="tw"><table class="ht"><tr><th>Account</th><th class="c">Firm</th><th class="c">Eval price</th></tr>${plans.map((p) => `<tr><td class="k">${esc(p.plan)}</td><td class="v">${esc(p.firm)}</td><td class="v">${usd(p.price, 2)}</td></tr>`).join('')}
          <tr><td class="k"><b>Up front</b></td><td></td><td class="v"><b>${usd(up, 2)}</b></td></tr></table></div>
        <div class="tw" style="margin-top:12px"><table class="ht"><tr><th>6 months from buying</th><th class="c">Jan–Jun</th><th class="c">Jul–Oct</th></tr>
          <tr><td class="k">$ a month, net of fees (mean)</td><td class="v">${usd(fH1?.net_per_month)}</td><td class="v up"><b>${usd(fH2?.net_per_month)}</b></td></tr>
          <tr><td class="k">$ a month in months 4-6</td><td class="v">${usd(fH1?.months4_6_per_month)}</td><td class="v up"><b>${usd(fH2?.months4_6_per_month)}</b></td></tr>
          <tr><td class="k">Chance months 4-6 pay $2,000+/mo</td><td class="v">${pct(fH1?.p_months4_6_ge_2000)}</td><td class="v">${pct(fH2?.p_months4_6_ge_2000)}</td></tr>
          <tr><td class="k">Chance the 6 months lose money</td><td class="v">${pct(fH1?.neg_6m)}</td><td class="v">${pct(fH2?.neg_6m)}</td></tr></table></div>
        <p class="small mut">The three trade the same signals (84-91% alike). On 2021-25 every plan loses money. One bot routes to one account today. <a class="lnk" href="#/writeup/lit-funded-firms">Write-up</a></p></div>` : ''}
      ${tw ? `<div class="card"><div class="card-h"><h3>${icon('prop')}What an eval pass costs</h3><span class="meta">two-week sizing · $91.80 eval</span></div>
        <div class="hb-tiles">${tile('Pass in 2 weeks · Jul–Oct', pct(tw.eval?.H2?.p10), `fail ${pct(tw.eval?.H2?.f10)}`, 'up')}${tile('Pass in 2 weeks · Jan–Jun', pct(tw.eval?.H1?.p10), `fail ${pct(tw.eval?.H1?.f10)}`)}
          ${tile('Cost per 2-week pass', usd(tw.eval?.H2?.cost), `Jan–Jun ${usd(tw.eval?.H1?.cost)}`)}${tile('Max risk a trade', usd(tw.eval?.H1?.max_risk), `worst day ${usd(tw.eval?.H1?.worst_day)}`, 'dn')}</div></div>` : ''}
      ${payoutCard()}${accTable()}
      <div class="hb-links"><button class="chipbtn" type="button" data-go="whatif">${icon('sim')}<span>What if</span></button><button class="chipbtn" type="button" data-go="evalhq">${icon('prop')}<span>Eval HQ</span></button><button class="chipbtn" type="button" data-go="eval">${icon('prop')}<span>MFFU eval</span></button><button class="chipbtn" type="button" data-go="evals">${icon('sim')}<span>Monte Carlo</span></button></div>`;
  };

  // ============================================================================================ MONEY > What if
  VIEWS.whatif = (el) => {
    const M = mainAcct(), e = M.a?.eval || { profit: 0, room: 2000, balance: 50000, floor: 48000 }, m = HL().brief?.morning || {};
    const stop = +store.get('wi.stop', m.eval?.stop || 46) || 46, tgt = +store.get('wi.tgt', Math.round(Math.min(stop * 5, (m.vix?.move || 300) * 0.75))) || 230;
    const st = { profit: +e.profit || 0, room: +e.room || 0, cum: +(M.a?.pnl?.today || 0) };
    const q = window.LEX?.twQty ? window.LEX.twQty(stop, tgt, st) : { q: Math.max(1, Math.min(40, Math.floor(800 * Math.min(1, 20 / stop) / (stop * 2)))), why: 'LIT size rule', risk: 0, win: 0 };
    if (!q.risk) { q.risk = q.q * (stop * 2 + 1.9); q.win = q.q * (tgt * 2 - 1.9); }
    const outcome = (label, pnl, k) => {
      const bal = (+e.balance || 50000) + pnl, profit = st.profit + pnl, floor0 = +e.floor || 48000;
      const floor = Math.min(50100, Math.max(floor0, bal - (e.mll || 2000))), room = bal - floor, passed = profit >= 3000, failed = bal <= floor0;
      const next = !passed && !failed && window.LEX?.twQty ? window.LEX.twQty(stop, tgt, { profit, room, cum: 0 }) : null;
      const one = next ? next.win >= 3000 - profit : null;
      return `<div class="card hb-wi ${k}"><div class="eyebrow">${label}</div><b class="hb-wib ${cls(pnl)}">${susd(pnl)}</b>
        <div class="kv one"><div><span>Balance</span><b>${usd(bal)}</b></div><div><span>$ still to +$3,000</span><b>${passed ? '<span class="up">PASSED</span>' : usd(3000 - profit)}</b></div>
          <div><span>Room above the floor</span><b class="${room < 700 ? 'dn' : ''}">${failed ? '<span class="dn">FAILED</span>' : usd(room)}</b></div>
          <div><span>Can one winner still pass?</span><b>${passed ? '—' : one == null ? '—' : one ? '<span class="up">yes</span>' : `<span class="wn">no: ${esc(next.why)}</span>`}</b></div></div></div>`;
    };
    el.innerHTML = head('Money · what if', 'The next trade', `With today’s eval (${usd(e.balance)}, ${usd(e.room)} of room) and the live two-week sizing: what a win at the target, a stop-out or a breakeven exit does.`)
      + `<div class="card hb-filt"><div class="hb-frow"><label class="hb-lab">Stop <input class="hb-in sm" id="wiS" type="number" min="8" max="90" step="0.25" value="${stop}"> pts</label>
          <label class="hb-lab">Target <input class="hb-in sm" id="wiT" type="number" min="10" max="900" step="1" value="${tgt}"> pts</label></div>
        <p class="small" style="margin:10px 0 0"><b>${q.q} micros</b> (${esc(q.why || '')}) · ${usd(q.risk)} at risk · ${usd(q.win)} at the target. Defaults: today’s typical stop and ~¾ of the VIX one-day move.</p></div>
      <div class="grid g3 astart">${outcome('Wins at the target', Math.round(q.win), 'w')}${outcome('Hits the stop', -Math.round(q.risk), 'l')}${outcome('Breakeven exit (costs only)', -Math.round(q.q * 1.9), 'b')}</div>
      <p class="small mut">Floor: $2,000 below the best end-of-day balance, locked at $50,100 (the trailing max loss). A win lifts the floor at the close. Paper sums, not advice.</p>`;
    const upd = () => { store.set('wi.stop', +$('#wiS').value || 46); store.set('wi.tgt', +$('#wiT').value || 230); render(true); };
    $('#wiS').onchange = upd; $('#wiT').onchange = upd;
  };

  // ============================================================================================ MONEY > Prop firms (research/props/firms.json)
  const PR = () => (typeof D !== 'undefined' && D && D.props) || null;
  const human = (k) => String(k).replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
  const val = (v) => v == null ? '—' : typeof v === 'boolean' ? (v ? 'yes' : 'no') : typeof v === 'number' ? (Math.abs(v) >= 100 ? usd(v, v % 1 ? 2 : 0) : String(v)) : Array.isArray(v) ? v.map((x) => typeof x === 'object' ? Object.values(x).join(' · ') : x).join(', ') : String(v);
  function kvBlock(title, o) {
    if (!o || typeof o !== 'object' || !Object.keys(o).length) return '';
    const rows = Object.entries(o).filter(([, v]) => v != null && v !== '').map(([k, v]) => v && typeof v === 'object' && !Array.isArray(v)
      ? `<div class="hb-kvs"><span>${esc(human(k))}</span><b>${esc(Object.entries(v).map(([a, b]) => `${human(a)}: ${val(b)}`).join(' · '))}</b></div>`
      : `<div class="hb-kvs"><span>${esc(human(k))}</span><b>${esc(val(v))}</b></div>`).join('');
    return `<details class="hb-pf"><summary>${esc(title)}${icon('down', 'chev')}</summary><div>${rows}</div></details>`;
  }
  function firmList() { const F = PR()?.firms; return Array.isArray(F) ? F : Array.isArray(F?.firms) ? F.firms : []; }
  function planCard(f, p) {
    const codes = (p.codes || []).filter((c) => c && c.code);
    const fit = p.lit_fit || {};
    const fitTxt = ok(fit.per_month) ? `${usd(fit.per_month)} a month${fit.span ? ' · ' + esc(fit.span) : ''}` : fit.text ? esc(fit.text) : '';
    return `<div class="hb-plan2"><div class="hb-p2h"><b>${esc(p.name || '')}</b><span>${ok(p.price_owner) ? `<b class="up">${usd(p.price_owner, 2)}</b>` : ''}${ok(p.price_list) && p.price_list !== p.price_owner ? ` <s class="mut">${usd(p.price_list, 2)}</s>` : ''}</span></div>
      ${codes.length ? `<div class="hb-codes">${codes.map((c) => `<button type="button" class="hb-code" data-code="${esc(c.code)}" title="${esc([c.source, c.date].filter(Boolean).join(' · '))}">${icon('doc')}<b>${esc(c.code)}</b>${ok(c.pct) ? `<span>−${num(c.pct, 0)}%</span>` : ''}</button>`).join('')}<span class="small mut">tap to copy · verify at checkout${codes[0].date ? ' · seen ' + esc(codes[0].date) : ''}</span></div>` : ''}
      ${fitTxt ? `<p class="small" style="margin:6px 0 0">${icon('results')} LIT fit: <b>${fitTxt}</b>${fit.verdict ? ' · ' + esc(fit.verdict) : ''}</p>` : ''}
      ${kvBlock('Eval rules', p.eval)}${kvBlock('Funded rules', p.funded)}${kvBlock('Payouts', p.payouts)}${kvBlock('Live account', p.live)}</div>`;
  }
  VIEWS.props = (el) => {
    if (!D) { el.innerHTML = skel(3); return; }
    const F = firmList(), P = PR() || {}, FU = HUBD().funded, nxt = P.firms?.next || P.next || null;
    const soon = !F.length;
    el.innerHTML = head('Money · prop firms', 'Prop firms', 'Prices (your real price next to the list price), discount codes, the rules that matter for a bot, and how LIT fits each plan.')
      + (soon ? `<div class="card"><div class="card-h"><h3>${icon('prop')}Firm cards: coming soon</h3>${chip('research running')}</div>
          <p class="lead" style="margin-top:0">The firm-by-firm study (research/props/firms.json) is being written. Until it lands, what is known:</p>
          <div class="kv one"><div><span>MFFU Builder 50K (your eval)</span><b>$91.80 with a code · $0 activation</b></div><div><span>MFFU Builder 25K</span><b>$63 with a code</b></div>
            ${(FU?.plans || []).filter((p) => p.id !== 'mffu_builder_50k').map((p) => `<div><span>${esc(p.firm)} ${esc(p.plan)}</span><b>${usd(p.price, 2)}</b></div>`).join('')}</div>
          <p class="small mut">Codes change often: verify at checkout. <a class="lnk" href="#/writeup/lit-prop-firms">LIT on 60 plans</a> · <a class="lnk" href="#/writeup/lit-funded-firms">the three-account plan</a></p></div>`
        : F.map((f) => `<div class="card"><div class="card-h"><h3>${icon('prop')}${esc(f.name || '')}</h3>${f.bots_allowed === false ? chip('no bots', 'bad') : f.verdict ? chip(esc(f.verdict)) : ''}</div>
          ${f.note || f.summary ? `<p class="small mut" style="margin:0 0 8px">${esc(f.note || f.summary)}</p>` : ''}${(f.plans || []).map((p) => planCard(f, p)).join('')}</div>`).join(''))
      + `<div class="card"><div class="card-h"><h3>${icon('star')}What to buy next</h3></div>
          <p class="lead" style="margin-top:0">${nxt ? esc(typeof nxt === 'string' ? nxt : nxt.text || '') : FU ? `Next to the Builder 50K: a <b>LucidPro 50K</b> and a <b>FundedNext Rapid Daily 50K</b> (~${usd(FU.trio?.H2?.net_per_month)} a month for the three on Jul–Oct trades, ${usd(FU.trio?.H2?.months4_6_per_month)} once all are funded). One bot routes to one account today.` : 'See the funded-firms write-up.'}</p></div>`
      + payoutCal(P) + bizPnl(P) + bizTools();
    const tx = el.querySelector('#bzTaxCsv');
    if (tx) tx.onclick = () => { const t = (HUBD().biz || {}).tax || {}; const q = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
      const csv = [`Prop business tax-year summary ${t.year} - ${t.label || 'NOT tax advice'}`, 'date,type,firm,account,description,amount_usd', ...(t.rows || []).map((r) => [r.date, r.type, r.firm, r.account, r.description, r.amount_usd].map(q).join(',')),
        '', `summary,,,,total fees,${t.fees}`, `summary,,,,total payouts,${t.payouts}`, `summary,,,,net,${t.net}`, `summary,,,,set-aside estimate at ${t.pct}% (not tax advice),${t.set_aside}`].join('\n');
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = `tax_${t.year}.csv`; document.body.appendChild(a); a.click(); a.remove(); };
    el.querySelectorAll('[data-code]').forEach((b) => { b.onclick = async () => { try { await navigator.clipboard.writeText(b.dataset.code); toast(`Copied ${b.dataset.code} · verify at checkout`); } catch { toast(b.dataset.code); } }; });
  };
  // business tools (tools/business.py view(), carried as data.hub.biz): statement, payout eligibility, tax year, eval planner,
  // scaling calendar, Z06 savings, ROI, the weekly rule-page / discount-code watchers
  function bizTools() {
    const V = HUBD().biz;
    if (!V || V.error) return '';
    const S = V.statement?.business || {}, T = V.statement?.trading || {}, tax = V.tax || {}, pl = V.planner || {}, ca = V.calendar || {}, g = V.goal || {}, roi = V.roi || {};
    const w = (V.watch?.rules?.updated || (V.watch?.codes?.rows || []).length) ? V.watch : (V.watch_pc ? { rules: { updated: V.watch_pc.rules_t, ok: V.watch_pc.rules_ok, pages: V.watch_pc.rules_pages, changes: V.watch_pc.changes || [] }, codes: { rows: V.watch_pc.codes || [] } } : V.watch || {});
    const tbl = (h, rows) => rows.length ? `<div class="tw"><table class="ht"><tr>${h.map((x, i) => `<th${i ? ' class="c"' : ''}>${x}</th>`).join('')}</tr>${rows.join('')}</table></div>` : '<p class="small mut" style="margin:0">None yet.</p>';
    const ST = { ready: ['up', 'can request'], allowed_wait: ['wn', 'allowed · habit: wait'], not_yet: ['', 'not yet'], not_funded: ['', 'eval first'], unknown: ['wn', 'balance missing'] };
    const months = (x) => ok(x) ? `${num(x, 0)} months` : 'never on this rate';
    const nx = (pl.steps || [])[0];
    return `<div class="card"><div class="card-h"><h3>${icon('doc')}Statement · ${esc(V.statement?.month || '')}</h3><span class="meta">PDF on the PC Business page</span></div>
        <div class="hb-tiles">${tile('Fees', usd(S.fees_total, 2))}${tile('Payouts', usd(S.payouts_total, 2))}${tile('Net', susd(S.net, 2), `YTD ${susd(S.ytd_net, 2)}`, cls(S.net))}${tile('Bot trades', String(T.trades || 0), `account P&L ${susd(T.pnl, 2)}`)}</div></div>
      <div class="card"><div class="card-h"><h3>${icon('clock')}Payout eligibility</h3></div>
        ${tbl(['Account', 'Status', 'Ask at profit'], (V.payouts?.rows || []).map((r) => { const s = ST[r.status] || ['', r.status]; return `<tr><td class="k">${esc((r.firm || '').replace('MyFundedFutures', 'MFFU'))} ${esc(r.plan || '')}<br><span class="small mut">${esc(r.text || '')}</span></td><td class="v ${s[0]}">${esc(s[1])}</td><td class="v">${usd(r.need_habit)}</td></tr>`; }))}
        <p class="small mut" style="margin:6px 0 0">${esc(V.payouts?.how || '')}</p></div>
      <div class="card"><div class="card-h"><h3>${icon('wallet')}Tax year ${esc(tax.year || '')}</h3>${chip('not tax advice', 'warn')}</div>
        <div class="hb-tiles">${tile('Fees', usd(tax.fees, 2))}${tile('Payouts', usd(tax.payouts, 2))}${tile('Net', susd(tax.net, 2), '', cls(tax.net))}${tile('Set aside', usd(tax.set_aside, 2), `${num(tax.pct, 0)}% of positive net`)}</div>
        <button type="button" class="chipbtn" id="bzTaxCsv"><span>Download tax_${esc(tax.year || '')}.csv</span></button><p class="small mut" style="margin:6px 0 0"><b>${esc(tax.label || '')}</b> ${esc(tax.note || '')}</p></div>
      <div class="card"><div class="card-h"><h3>${icon('star')}Next eval to buy</h3><span class="meta">cash ${usd(pl.cash, 2)}</span></div>
        ${nx ? `<p class="lead" style="margin-top:0"><b>${esc(nx.name)}</b> · ${usd(nx.price, 2)} (${esc(nx.price_basis || '')}) · ${nx.due ? '<b class="up">buy now</b>' : esc(nx.wait || 'later')}</p>` : ''}
        ${tbl(['Plan', 'From', 'Price'], (pl.steps || []).map((x) => `<tr><td class="k">${esc(x.name || x.plan)}${(x.codes || []).length ? `<br><span class="small mut">codes: ${x.codes.map((c) => esc(c.code) + (c.st === 'confirmed' ? '' : ' (unverified)')).join(', ')}</span>` : ''}</td><td class="v">${esc(fDate(x.date) || x.date || '')}</td><td class="v">${usd(x.price, 2)}</td></tr>`))}
        <p class="small mut" style="margin:6px 0 0">${esc(pl.rule || '')}</p></div>
      <div class="card"><div class="card-h"><h3>${icon('results')}Funded scaling calendar</h3><span class="meta">expected vs downside</span></div>
        ${tbl(['Month', 'Accounts', 'Cumulative', 'Downside'], (ca.rows || []).map((r) => `<tr><td class="k">${esc(r.month)}${(r.buy || []).length ? `<br><span class="small mut">buy ${esc(r.buy.join(', '))}</span>` : ''}</td><td class="v">${r.accounts}</td><td class="v ${cls(r.cum)}">${susd(r.cum)}</td><td class="v ${cls(r.down_cum)}">${susd(r.down_cum)}</td></tr>`))}
        <p class="small mut" style="margin:6px 0 0">${esc(ca.warn || '')}</p></div>
      <div class="card"><div class="card-h"><h3>${icon('target')}${esc(g.name || 'Goal')}</h3><span class="meta">${usd(g.target)}${g.placeholder ? ' · placeholder' : ''}</span></div>
        <div class="hb-tiles">${tile('Saved', usd(g.saved), `${num(g.pct, 1)}%`)}${tile('Expected', months(g.months_h2), `${usd(g.rate_h2)}/mo, 3 accounts`)}${tile('Conservative', months(g.months_cons), `${usd(g.rate_cons)}/mo, Builder 50K`)}</div>
        <p class="small mut" style="margin:0">${esc(g.how || '')}</p></div>
      <div class="card"><div class="card-h"><h3>${icon('results')}ROI per account</h3><span class="meta">net ${susd(roi.total?.net, 2)}</span></div>
        ${tbl(['Account', 'Fees', 'Payouts', 'Net'], (roi.accounts || []).map((a) => `<tr><td class="k">${esc((a.firm || '').replace('MyFundedFutures', 'MFFU'))} ${esc(a.plan || '')}<br><span class="small mut">${esc(a.stage || '')}${ok(a.roi_pct) ? ' · ROI ' + num(a.roi_pct, 0) + '%' : ''}</span></td><td class="v">${usd(a.fees, 2)}</td><td class="v">${usd(a.payouts, 2)}</td><td class="v ${cls(a.net)}">${susd(a.net, 2)}</td></tr>`))}</div>
      <div class="card"><div class="card-h"><h3>${icon('news')}Weekly watchers</h3><span class="meta">${w.rules?.updated ? 'rules ' + esc(w.rules.updated) : 'not run yet'}</span></div>
        <p class="small" style="margin:0 0 6px">Rule pages read OK: <b>${w.rules?.ok || 0}</b> of ${w.rules?.pages || 0}. ${(w.rules?.changes || []).length ? `Changed: ${w.rules.changes.map((c) => esc(c.firm + ' ' + c.key + ' (' + c.seen + ')')).join(', ')}.` : 'No change seen.'}</p>
        ${tbl(['New code (unverified)', 'Firm', 'Seen'], (w.codes?.rows || []).map((c) => `<tr><td class="k"><button type="button" class="hb-code" data-code="${esc(c.code)}"><b>${esc(c.code)}</b>${c.off ? `<span>${esc(c.off)}</span>` : ''}</button></td><td class="v">${esc(c.firm_name || c.firm || '')}</td><td class="v">${esc(c.seen || '')}</td></tr>`))}
        <p class="small mut" style="margin:6px 0 0">Weekly from the PC ops task. Codes are from third-party pages: verify at checkout.</p></div>`;
  }
  function payoutCal(P) {
    const rows = P.payouts?.calendar || P.payouts?.rows || (Array.isArray(P.payouts) ? P.payouts : []);
    return `<div class="card"><div class="card-h"><h3>${icon('clock')}Payout calendar</h3></div>${rows.length
      ? `<div class="tw"><table class="ht"><tr><th>Date</th><th class="c">Account</th><th class="c">Amount</th><th class="c">Status</th></tr>${rows.slice(0, 24).map((r) => `<tr><td class="k">${esc(fDate(r.date) || r.date || '')}</td><td class="v">${esc(r.account || r.firm || '')}</td><td class="v">${usd(r.amount ?? r.usd)}</td><td class="v">${esc(r.status || '')}</td></tr>`).join('')}</table></div>`
      : '<p class="mut" style="margin:0">No payouts yet: the first one comes after the eval is passed and funded (ask once $1,500+ is above the $2,100 buffer).</p>'}</div>`;
  }
  function bizPnl(P) {
    const B = P.business || {};
    const fees = B.fees || [{ item: 'MFFU Builder 50K eval (with code)', usd: 91.8, date: '2026-10-18' }], pays = B.payouts || [];
    const f = sum(fees, (x) => +x.usd || 0), p = sum(pays, (x) => +x.usd || 0);
    return `<div class="card"><div class="card-h"><h3>${icon('wallet')}Business P&amp;L</h3><span class="meta">fees vs payouts</span></div>
      <div class="hb-tiles">${tile('Fees paid', usd(f), plural(fees.length, 'item'), 'dn')}${tile('Payouts', usd(p), plural(pays.length, 'payout'), p ? 'up' : '')}${tile('Net', susd(p - f), p - f >= 0 ? 'in profit' : 'still paying in', cls(p - f))}</div>
      <div class="kv one">${fees.map((x) => `<div><span>${esc(x.item || x.name || 'fee')}${x.date ? ' · ' + esc(fDate(x.date)) : ''}</span><b class="dn" style="white-space:nowrap">−${usd(x.usd, 2)}</b></div>`).join('')}${pays.map((x) => `<div><span>${esc(x.item || x.account || 'payout')}${x.date ? ' · ' + esc(fDate(x.date)) : ''}</span><b class="up" style="white-space:nowrap">+${usd(x.usd, 2)}</b></div>`).join('')}</div>
      ${B.fees ? '' : '<p class="small mut" style="margin:8px 0 0">Recorded so far: the Builder 50K eval. More fees and payouts show here from research/props/business.json.</p>'}</div>`;
  }

  // ============================================================================================ HOME > Market (news week, CME holidays, roll, VIX band)
  function nextRoll(ts = now()) {
    // NQ rolls about 8 days before the 3rd Friday of Mar / Jun / Sep / Dec (the Thursday of the week before expiry)
    const d = new Date(ts * 1000);
    for (let k = 0; k < 6; k++) {
      const y = d.getUTCFullYear() + Math.floor((d.getUTCMonth() + k) / 12), m = (d.getUTCMonth() + k) % 12;
      if (m % 3 !== 2) continue;
      const first = new Date(Date.UTC(y, m, 1)), fri = 1 + ((5 - first.getUTCDay() + 7) % 7) + 14;
      const exp = Date.UTC(y, m, fri, 13, 30) / 1000, roll = exp - 8 * 86400;
      if (roll > ts - 86400) return { roll, exp, code: 'HMUZ'[[2, 5, 8, 11].indexOf(m)] + String(y).slice(2), next: 'HMUZ'[([2, 5, 8, 11].indexOf(m) + 1) % 4] + String(m === 11 ? y + 1 : y).slice(2) };
    }
    return null;
  }
  VIEWS.market = (el) => {
    if (!D) { el.innerHTML = skel(3); return; }
    const N = D.news || {}, M = PR()?.market || {}, b = HL().brief?.morning || {}, vx = b.vix, R = M.roll || nextRoll();
    const days = N.days || [], evs = (N.events || []).filter((e) => e.impact === 'high' || e.impact === 'medium');
    const hol = M.holidays || M.closures || [];
    el.innerHTML = head('Home · market', 'The market this week', 'USD news, CME holidays and early closes, the contract roll and today’s VIX target band.')
      + `<div class="hb-tiles">${tile('VIX', vx ? num(vx.vix, 2) : '—', vx ? `one-day move ${num(vx.move, 0)} pts` : 'from the day brief')}
          ${tile('Target band', vx ? num(vx.low, 0) : '—', vx ? `shorts · longs ${num(vx.high, 0)}` : '')}
          ${tile('Roll', R ? `<span data-cd="${R.roll}">${cdFmt(R.roll - now())}</span>` : '—', R ? `${esc(R.code || '')} → ${esc(R.next || '')} · ${esc(fDate(new Date(R.roll * 1000).toISOString().slice(0, 10)))}` : '')}
          ${tile('Next USD event', N.next ? esc(N.next.title) : '—', N.next ? `${esc(N.next.label || '')} · ${esc(N.next.impact || '')}` : '', N.next?.impact === 'high' ? 'wn' : '')}</div>
      ${vx ? `<div class="card"><p class="lead" style="margin:0">${esc(vx.text)}</p></div>` : ''}
      <div class="card"><div class="card-h"><h3>${icon('news')}This week</h3><button class="chipbtn" type="button" data-go="news"><span>News</span>${icon('right')}</button></div>
        <div class="hb-week">${days.slice(0, 7).map((d) => `<div class="${d.is_today ? 'now' : ''} ${d.holiday ? 'hol' : ''}"><b>${esc(d.weekday || '')}</b><span>${esc(String(d.label || '').replace(/^\w+ /, ''))}</span>
          <em>${d.holiday ? 'holiday' : d.n_high ? `${d.n_high} high` : d.n_medium ? `${d.n_medium} med` : 'quiet'}${d.fomc ? ' · FOMC' : ''}</em></div>`).join('') || '<p class="mut">No calendar in this build.</p>'}</div>
        <div class="feed" style="margin-top:12px">${evs.slice(0, 14).map((e) => `<div class="evt"><div class="t">${esc(e.weekday || '')} ${esc(e.time_et || '')}</div><div><span class="tag ${e.impact === 'high' ? 'bad' : ''}">${esc(String(e.impact || '').toUpperCase())}</span>${esc(e.title)}</div></div>`).join('') || '<p class="mut">No high or medium USD events this week.</p>'}</div></div>
      <div class="card"><div class="card-h"><h3>${icon('clock')}CME holidays and early closes</h3></div>${hol.length
        ? `<div class="kv one">${hol.slice(0, 12).map((h) => `<div><span>${esc(fDate(h.date) || h.date || '')} · ${esc(h.name || h.title || '')}</span><b>${esc(h.hours || h.close || h.status || '')}</b></div>`).join('')}</div>`
        : `<p class="mut" style="margin:0">${days.some((d) => d.holiday) ? 'Holiday this week: ' + days.filter((d) => d.holiday).map((d) => esc(d.label)).join(', ') + '.' : 'None this week.'} The full CME list shows here once research/props/market.json exists. The bot flattens 5 min before an early halt and stops entries 15 min before.</p>`}</div>
      <p class="small mut">Roll: the date is the usual rule (about 8 days before the third Friday); check the volume switch on TradingView. Before the Dec 2026 roll the chart must switch to MNQ 03-27 with a 30-day overlap.</p>`;
  };

  // ============================================================================================ STRATEGY
  function plainRules() {
    const L = HD()?.strategy?.lit || {}, w = (L.window || [[120, 930]])[0];
    const steps = [
      ['Find the levels', 'Session boxes (Asia, Frankfurt, London, New York), the prior day / week / month high and low, the weekly and daily opening gaps and equal highs or lows (build-ups). These are where stop orders sit.'],
      ['Wait for a sweep', `Price runs through a level by at least <b>${num(L.depth ?? 0.5, 1)} ATR</b>, after first taking a smaller swing (the <b>inducement</b>, within 1 ATR and 36 bars).`],
      ['See it turn', `A strong 5-minute candle the other way (body at least <b>${num(L.disp ?? 0.8, 1)} ATR</b>) closes through the last opposite candle: the <b>5m CISD</b>.`],
      ['Enter', 'A limit order at the CISD level for 30 minutes; if price comes back, a 1-minute CISD within 20 bars, then in at the next 1-minute open.'],
      ['Stop', 'One tick beyond the sweep extreme (the protected high or low), 8 to 80 points. Never a fixed distance.'],
      ['Target', 'The 18:00 open ± one VIX one-day move, at least 1.5R away; profit banked at 8R. One target, no greed.'],
      ['Manage', `Stop to breakeven at +1R. Flat at 15:55 ET. One trade a day, entries ${hmM(w[0])}–${hmM(w[1])} ET.`],
      ['Size', 'Size follows the stop: a wide stop means fewer micros. On the eval (two-week mode): enough micros that one winner passes, capped at 60% of the room and the $1,000 soft daily loss, max 40.'],
      ['Loss rules', 'After 2 stop-outs in a week, half size for the rest of it (not in two-week eval mode). Monday: once Friday’s high is taken only shorts, once Friday’s low is taken only longs.']];
    return `<div class="hb-steps">${steps.map(([t, d], i) => `<div class="hb-step"><span>${i + 1}</span><div><b>${t}</b><p>${d}</p></div></div>`).join('')}</div>`;
  }
  function comboCard() {
    const C = HUBD().combo; if (!C) return '';
    const rows = C.rows || [], base = rows.find((r) => r.id === 'base'), sw = C.switches || [];
    const d = (v, b) => ok(v) && ok(b) && b !== v ? `<small class="${v > b ? 'up' : 'dn'}">${v > b ? '+' : '−'}${kabs(Math.abs(v - b))}</small>` : '';
    const anyOn = sw.some((s) => s.on), allOn = sw.length > 0 && sw.every((s) => s.on), since = C.on_since ? ' since ' + fDate(C.on_since) : '';
    const onTxt = sw.filter((s) => s.on).map((s) => s.key).join(' + '), waitS = sw.filter((s) => !s.on && s.wait);
    const live = C.live_id || (allOn ? 'all3' : '');
    return `<div class="card"><div class="card-h"><h3>${icon('layers')}Upgrade: 15-min check + scale-in + BE+1.25</h3>${allOn ? chip('ON' + since, 'good') : anyOn ? chip('partly ON' + since, 'warn') : chip('OFF', 'bad')}</div>
      <p class="lead" style="margin-top:0">Three upgrades, tested alone and together on the real LIT engine. ${allOn ? `<b>Live (paper) since ${esc(fDate(C.on_since) || '2026-10-20')}</b>: all three are on in live_model.json.` : anyOn ? `<b>Partly live${esc(since)}</b>: ${esc(onTxt)} on in live_model.json${waitS.length ? '; ' + waitS.map((s) => `${esc(s.key)} off, ${esc(s.wait)}`).join('; ') : ''}.` : '<b>Not live.</b>'} Judged the LIT way: picked on Jan–Jun, checked on Jul–Oct.</p>
      <div class="chips" style="margin-bottom:12px">${sw.map((s) => `<span class="chip ${s.on ? 'good' : s.wait ? 'warn' : ''}" title="${esc(s.wait || s.text)}">${esc(s.key)} · ${s.on ? 'on' : s.wait ? 'off · waiting for the Sim check' : 'off'}</span>`).join('')}</div>
      <div class="tw"><table class="ht hb-ct"><tr><th>Variant</th><th class="c">Net Jan–Jun</th><th class="c">Net Jul–Oct</th><th class="c">PF H1 / H2</th><th class="c">Eval 2-wk pass H1 / H2</th><th class="c">Eval 2-wk fail H1 / H2</th></tr>
        ${rows.map((r) => `<tr class="${r.id === live ? 'hb-hi' : ''}"><td class="k">${esc(r.label)}${r.id === live && r.id !== 'base' ? ' <small class="up">live</small>' : ''}</td><td class="v">${kusd(r.lit.H1?.net)}${r.id !== 'base' ? d(r.lit.H1?.net, base?.lit.H1?.net) : ''}</td><td class="v">${kusd(r.lit.H2?.net)}${r.id !== 'base' ? d(r.lit.H2?.net, base?.lit.H2?.net) : ''}</td>
          <td class="v">${fPF(r.lit.H1?.pf)} / ${fPF(r.lit.H2?.pf)}</td><td class="v">${pct(r.eval.H1?.p10)} / ${pct(r.eval.H2?.p10)}</td><td class="v">${pct(r.eval.H1?.f10)} / ${pct(r.eval.H2?.f10)}</td></tr>`).join('')}</table></div>
      <ul class="list" style="margin-top:12px">${sw.map((s) => `<li>${esc(s.text)}.</li>`).join('')}</ul>
      <p class="small mut">Net = LIT size rule; eval = the live two-week sizing on the MFFU 50K. ${allOn || anyOn ? 'The cloud keeps a paper ledger without them (lit_base) to show what they add live. ' : 'Before switching on: the 15-minute cut must route on time on the PC, and scale-in needs the NinjaTrader add-order route. '}${esc(C.src || '')}</p></div>`;
  }
  function scoreboard() {
    const S = HUBD().scoreboard || []; if (!S.length) return '';
    return `${secH('Research scoreboard', `<button class="chipbtn" type="button" data-go="writeups"><span>All write-ups</span>${icon('right')}</button>`)}
      <div class="hb-score">${S.map((s) => `<a class="hb-sc ${esc(s.verdict)}" href="#/writeup/${encodeURIComponent(s.slug)}"><div class="hb-sch">${vchip(s.verdict)}<span class="small mut">${esc(fDate(s.date))}${s.tested ? ' · ' + esc(s.tested) + ' tested' : ''}</span></div>
        <b>${esc(String(s.title || s.slug).split(' - ')[0])}</b><p>${esc(s.line || '')}</p></a>`).join('')}</div>`;
  }
  function changelog() {
    const C = HUBD().changelog || []; if (!C.length) return '';
    return `${secH('What changed in the bot')}<div class="card hb-cl">${C.slice(0, 14).map((c) => `<div><span class="mono small mut">${esc(fDate(c.date))}</span><p>${esc(c.title)}</p></div>`).join('')}
      <p class="small mut" style="margin:8px 0 0">Commit titles of the main branch, newest first.</p></div>`;
  }
  const oldStrategy = VIEWS.strategy;
  VIEWS.strategy = (el) => {
    if (!D) { el.innerHTML = skel(3); return; }
    if (!isLIT()) { oldStrategy(el); return; }
    const S = D.strategy || {}, P = D.results?.periods || {}, h2 = P['2026 H2 (check)'] || {}, h1 = P['2026 H1 (picked on)'] || {};
    const pm = (p) => ok(p.per_month) ? p.per_month : perMonth(p.net, p.from, p.to);
    el.innerHTML = head(`Strategy · locked ${esc(fDate(S.chosen) || '')}`, 'LIT · Liquidity Inducement', 'The rules the bot trades, in plain words, what was tested to make it better, and what changed lately.',
        `<button class="btn ghost" type="button" data-go="results">${icon('results')}Results</button>`)
      + `<div class="hb-tiles">${tile('Jul–Oct (check)', `PF ${fPF(h2.pf)}`, `${susd(h2.net)} · ${usd(pm(h2))}/mo · ${num(h2.per_week, 1)}/wk`, 'up')}${tile('Jan–Jun (picked)', `PF ${fPF(h1.pf)}`, `${susd(h1.net)} · ${usd(pm(h1))}/mo`)}
        ${tile('Win rate 2026', pct(P['2026 YTD']?.win_pct), 'small losses, big wins')}${tile('Sizing now', esc((S.lit_sizing || {}).mode || 'normal'), 'two_week = one winner passes')}</div>`
      + `${secH('The rules in plain words')}<div class="card">${plainRules()}</div>`
      + comboCard() + scoreboard() + changelog()
      + `${secH('Word for word')}<details class="card hb-md"><summary>${icon('rules')}<b>STRATEGY.md · the exact rules</b></summary><article class="md">${S.rules_md ? md(S.rules_md).html : '<p class="mut">Not in this build.</p>'}</article></details>`
      + `<div class="hb-links"><button class="chipbtn" type="button" data-go="lab">${icon('lab')}<span>Lab</span></button><button class="chipbtn" type="button" data-go="experiments">${icon('variants')}<span>Every experiment</span></button><button class="chipbtn" type="button" data-go="losses">${icon('loss')}<span>Why it loses</span></button><button class="chipbtn" type="button" data-go="archive">${icon('archive')}<span>Previous strategy</span></button></div>`;
  };

  // ============================================================================================ SETTINGS: goal, compact, theme
  const oldSettings = VIEWS.settings;
  VIEWS.settings = (el) => {
    oldSettings(el);
    const G = goal(), box = document.createElement('div');
    box.className = 'grid g2 astart';
    box.innerHTML = `<div class="card"><div class="card-h"><h3>${icon('star')}Monthly goal</h3></div>
        <label class="row"><span><b>Goal</b><span class="small mut">What it is for</span></span><input class="hb-in" id="gName" type="text" maxlength="40" value="${esc(G.name)}"></label>
        <label class="row"><span><b>$ a month</b><span class="small mut">Shown on the Money page</span></span><input class="hb-in sm" id="gUsd" type="number" min="100" step="100" value="${G.usd}"></label></div>
      <div class="card"><div class="card-h"><h3>${icon('layers')}Look</h3></div>
        <div class="row"><span><b>Theme</b><span class="small mut">Light is easier outside; 3D effects look best in dark</span></span>${segHTML('sTheme', [['dark', 'Dark'], ['light', 'Light']], store.get('theme', 'dark'), 'sm')}</div>
        <label class="row"><span><b>Compact</b><span class="small mut">Smaller cards, more on one screen</span></span><input type="checkbox" class="switch" id="sCompact" ${store.get('compact', false) ? 'checked' : ''}></label></div>`;
    el.insertBefore(box, el.children[2] || null);
    $('#gName').onchange = (e) => { store.set('goal.name', e.target.value.trim() || 'my goal'); toast('Goal saved'); };
    $('#gUsd').onchange = (e) => { store.set('goal.usd', Math.max(100, +e.target.value || 3000)); toast('Goal saved'); };
    onSeg('sTheme', (v) => { store.set('theme', v); look(); });
    $('#sCompact').onchange = (e) => { store.set('compact', e.target.checked); look(); };
  };
  function look() {
    const r = document.documentElement, th = store.get('theme', 'dark');
    r.dataset.theme = th; r.dataset.compact = store.get('compact', false) ? 'on' : 'off';
    const m = document.querySelector('meta[name="theme-color"]'); if (m) m.content = th === 'light' ? '#f4f6fb' : '#07080c';
    const cs = document.querySelector('meta[name="color-scheme"]'); if (cs) cs.content = th === 'light' ? 'light' : 'dark';
  }

  // ============================================================================================ navigation: five tabs
  function install() {
    const have = {}; GROUPS.forEach((g) => g.pages.forEach((p) => { have[p[0]] = p; }));
    const P = (id, label, ic, desc) => have[id] ? [id, label || have[id][1], ic || have[id][2], desc || have[id][3]] : (label ? [id, label, ic, desc] : null);
    const NEW = [
      { id: 'today', label: 'Home', icon: 'today', pages: [P('today', 'Home', 'today', 'Is the bot trading my eval, today, the open trade, health'), P('plan', 'LIT plan', 'target', 'Today’s levels, the target band, sweeps seen'), P('market', 'Market', 'news', 'News week, CME holidays, the roll, the VIX band'),
        P('live', 'Live detail', 'engine', 'Live Oracle, week ring, liquidity map, signals'), P('brief'), P('day'), P('levels'), P('cockpit'), P('ops')] },
      { id: 'trades', label: 'Trades', icon: 'trades', pages: [P('trades'), P('recaps'), P('weekly'), P('journal', 'Journal', 'doc', 'Search, filter, notes, CSV export'), P('stats', 'Stats', 'results', 'Key stats, streaks, R histogram, time of day'),
        P('accounts'), P('execq', 'Execution', 'check', 'Slippage, missed and extra trades vs the backtest'), P('edge'), P('pnlcal'), P('results'), P('replays'), P('stops'), P('activity')] },
      { id: 'money', label: 'Money', icon: 'wallet', pages: [P('money', 'Money', 'wallet', '$ a month, goal, funded plan, payouts'), P('whatif', 'What if', 'sim', 'The next trade: target, stop or breakeven'), P('props', 'Prop firms', 'prop', 'Prices, codes, rules, LIT fit, what to buy next'), P('evalhq'), P('eval'), P('evals')] },
      { id: 'strategy', label: 'Strategy', icon: 'rules', pages: [P('strategy', 'Strategy', 'rules', 'The rules in plain words, upgrades, scoreboard'), P('lab'), P('experiments'), P('writeups'), P('losses'), P('intraday'), P('learned')] },
      { id: 'system', label: 'More', icon: 'modules', pages: [P('system'), P('chart'), P('engine'), P('news'), P('risk'), P('alerts'), P('mffurules'), P('sources'), P('archive'), P('settings')] },
    ].map((g) => ({ ...g, pages: g.pages.filter(Boolean) }));
    const placed = new Set(NEW.flatMap((g) => g.pages.map((p) => p[0])));
    Object.values(have).forEach((p) => { if (!placed.has(p[0])) NEW[4].pages.splice(NEW[4].pages.length - 1, 0, p); });   // anything new lands in More
    GROUPS.length = 0; NEW.forEach((g) => GROUPS.push(g));
    for (const k of Object.keys(PAGES)) delete PAGES[k];
    GROUPS.forEach((g) => g.pages.forEach(([id, label, ic, desc]) => { PAGES[id] = { id, label, icon: ic, desc, group: g.id }; }));
    Object.values(DETAIL).forEach((d) => { if (d.group === 'lab') d.group = 'strategy'; });
    Object.assign(SCENE, { plan: 'today', live: 'today', journal: 'trades', stats: 'results', execq: 'engine', money: 'eval', whatif: 'eval', strategy: 'engine', props: 'eval', market: 'today' });
    for (const k of Object.keys(ALIAS)) if (PAGES[k]) delete ALIAS[k];          // a page id wins over an old alias (plan, stats)
    Object.assign(ALIAS, { home: 'today', money: 'money', payout: 'money', goal: 'money', funded: 'money', journal: 'journal', notes: 'journal', search: 'journal', csv: 'journal',
      stat: 'stats', streaks: 'stats', histogram: 'stats', execution: 'execq', exec: 'execq', slippage: 'execq', whatif: 'whatif', simulate: 'whatif', scoreboard: 'strategy',
      changelog: 'strategy', upgrades: 'strategy', more: 'system', firms: 'props', prop: 'props', codes: 'props', payouts: 'props', business: 'props', roll: 'market', holidays: 'market', vix: 'market', liveplan: 'plan', litplan: 'plan', detail: 'live', oracle: 'live' });
    if (typeof LK_PAGES !== 'undefined' && !LK_PAGES.includes('live')) LK_PAGES.push('live');
    const st = document.createElement('style'); st.id = 'hub-css'; st.textContent = CSS; document.head.appendChild(st);
    look();
    nav(); route();
  }

  const CSS = `
.hb-surface{display:flex;gap:12px;align-items:center;padding:12px 16px;margin-bottom:12px;border-radius:var(--r);border:1px solid color-mix(in srgb,var(--good) 40%,transparent);background:color-mix(in srgb,var(--good) 8%,transparent)}
.hb-surface b{display:block;font-size:16px}.hb-surface em{display:block;font-style:normal;font-size:13px;opacity:.8;margin-top:2px}
.hb-surface.warn{border-color:color-mix(in srgb,var(--warn) 45%,transparent);background:color-mix(in srgb,var(--warn) 8%,transparent)}
.hb-surface.bad{border-color:var(--bad);background:linear-gradient(135deg,color-mix(in srgb,var(--bad) 30%,transparent),color-mix(in srgb,var(--bad) 10%,transparent))}
.hb-surface.bad b{color:var(--bad);font-size:18px}
.hb-banner{display:flex;gap:14px;align-items:flex-start;padding:16px 18px;margin-bottom:14px;border-radius:var(--r);border:1px solid color-mix(in srgb,var(--bad) 55%,transparent);background:linear-gradient(135deg,color-mix(in srgb,var(--bad) 22%,transparent),color-mix(in srgb,var(--bad) 6%,transparent))}
.hb-banner b{font-size:16px}.hb-banner p{margin:4px 0 0;font-size:13.5px;line-height:1.5}.hb-bi{flex:none;width:40px;height:40px;border-radius:12px;display:grid;place-items:center;background:var(--bad);color:#fff}
.hb-hero{display:flex;gap:18px;align-items:stretch;flex-wrap:wrap}.hb-hero .hb-hl{flex:1 1 300px;min-width:0}
.hb-hero.good{border-color:color-mix(in srgb,var(--good) 45%,transparent);box-shadow:inset 0 1px 0 rgba(255,255,255,.05),0 0 0 1px color-mix(in srgb,var(--good) 12%,transparent),0 20px 60px color-mix(in srgb,var(--good) 10%,transparent)}
.hb-hero.warn{border-color:color-mix(in srgb,var(--warn) 45%,transparent)}.hb-hero.bad{border-color:color-mix(in srgb,var(--bad) 50%,transparent)}
.hb-verdict{display:flex;align-items:center;gap:12px;margin:8px 0 6px;font-size:27px;font-weight:800;letter-spacing:-.02em;line-height:1.1}
.hb-hero.good .hb-verdict{color:var(--good-ink)}.hb-hero.warn .hb-verdict{color:var(--warn)}.hb-hero.bad .hb-verdict{color:var(--bad)}
.hb-reason{margin:0;color:var(--ink-2);font-size:13.5px;line-height:1.45}.hb-meta{display:flex;flex-wrap:wrap;gap:6px 12px;align-items:center;margin-top:10px;font-size:12px;color:var(--muted)}.hb-meta .ico{width:14px;height:14px;margin-right:4px}
.hb-hr{flex:0 0 auto;display:flex;flex-direction:column;justify-content:center;align-items:flex-end;gap:2px;padding-left:18px;border-left:1px solid var(--line);min-width:150px}
.hb-hr span{font:650 11px var(--sans);text-transform:uppercase;letter-spacing:.1em;color:var(--muted)}.hb-hr b{font-size:36px;font-weight:800;letter-spacing:-.03em;font-family:var(--sans)}.hb-hr em{font-style:normal;font-size:12px;color:var(--ink-2);text-align:right}
.hb-dot{flex:none;display:inline-block;width:11px;height:11px;border-radius:50%;background:var(--muted)}.hb-dot.good{background:var(--good);box-shadow:0 0 12px var(--good)}.hb-dot.warn{background:var(--warn);box-shadow:0 0 10px var(--warn)}.hb-dot.bad{background:var(--bad);box-shadow:0 0 12px var(--bad)}
.hb-verdict .hb-dot{width:16px;height:16px}
.hb-tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-bottom:16px}.hb-tiles.t5{grid-template-columns:repeat(5,minmax(0,1fr));margin-bottom:12px}
.hb-tile{display:flex;flex-direction:column;gap:3px;min-width:0;padding:14px 16px;border-radius:16px;border:1px solid var(--line);background:linear-gradient(160deg,rgba(22,26,35,.82),rgba(16,19,26,.6))}
.hb-tile>span{font:600 11px var(--sans);letter-spacing:.06em;text-transform:uppercase;color:var(--muted)}.hb-tile b{font-size:24px;font-weight:780;letter-spacing:-.02em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.hb-tile b small{font-size:14px;color:var(--muted);font-weight:600}
.hb-tile em{font-style:normal;font-size:11.5px;color:var(--ink-2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.hb-trade .card-h h3{display:flex;align-items:center;gap:8px}.hb-trade .card-h h3 .ico{margin-right:4px}.hb-trade.on{border-color:color-mix(in srgb,var(--accent) 40%,transparent)}
.hb-stage{margin:0 0 12px;font-size:15px;font-weight:600}.hb-mini{display:block;max-width:100%;height:auto;border-radius:12px;background:rgba(7,8,12,.35)}.hb-ax{font:600 11px var(--mono)}
.hb-kzs{display:flex;flex-direction:column;gap:8px}.hb-kz{display:flex;gap:10px;align-items:center;font-size:13.5px}.hb-kz b{font-family:var(--mono)}.hb-kz.on{font-size:14.5px}
.hb-prog{display:flex;flex-direction:column;gap:6px}.hb-ph{display:flex;justify-content:space-between;gap:10px;font-size:12.5px;color:var(--ink-2);flex-wrap:wrap}.hb-ph b{color:var(--ink)}
.hb-meter{position:relative;height:12px;border-radius:99px;background:var(--surface-3);overflow:hidden;margin-bottom:8px}.hb-meter i{position:absolute;inset:0 auto 0 0;border-radius:99px;background:var(--accent)}.hb-meter.good i{background:linear-gradient(90deg,var(--accent),var(--good))}.hb-meter.bad i{background:var(--bad)}
.hb-ses{display:grid;grid-template-columns:repeat(10,1fr);gap:5px;margin-top:6px}.hb-ses i{font:600 11px var(--mono);font-style:normal;text-align:center;padding:7px 0;border-radius:9px;background:var(--surface-3);color:var(--muted);border:1px solid var(--line)}
.hb-ses i.done{background:color-mix(in srgb,var(--accent) 22%,transparent);color:var(--ink)}.hb-ses i.now{background:var(--accent);color:#fff;box-shadow:0 0 14px color-mix(in srgb,var(--accent) 60%,transparent)}
.hb-health{display:flex;flex-direction:column}.hb-hrow{display:grid;grid-template-columns:14px 1fr auto;grid-template-rows:auto auto;column-gap:10px;align-items:center;padding:8px 0;border-bottom:1px solid var(--line)}.hb-hrow:last-child{border-bottom:0}
.hb-hrow>span{font-size:13px;color:var(--ink-2)}.hb-hrow>b{font:650 13px var(--mono);text-align:right}.hb-hrow>em{grid-column:2/4;font-style:normal;font-size:11.5px;color:var(--muted);line-height:1.4}.hb-hrow>.hb-dot{grid-row:1/3}
.hb-plan{display:block;color:inherit;text-decoration:none}.hb-plan p{margin:0 0 10px;color:var(--ink-2);font-size:13.5px;line-height:1.5;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.hb-links{display:flex;flex-wrap:wrap;gap:8px;margin:4px 0 14px}.hb-links .chipbtn{width:auto;padding:0 12px}.hb-links .chipbtn span{display:inline}.hb-foot{text-align:center;margin:8px 0 0}
.hb-lvs{display:flex;flex-direction:column}.hb-lv{display:grid;grid-template-columns:1fr auto 96px;gap:10px;padding:7px 0 7px 10px;border-bottom:1px solid var(--line);border-left:3px solid var(--ssl);font-size:13px}.hb-lv.h{border-left-color:var(--bsl)}
.hb-lv b{font-family:var(--mono)}.hb-lv em{font-style:normal;font-family:var(--mono);font-size:12px;color:var(--muted);text-align:right}
.hb-filt{padding:12px 14px}.hb-frow{display:flex;flex-wrap:wrap;gap:8px;align-items:center}.hb-frow+.hb-frow{margin-top:8px}
.hb-sel,.hb-in{height:38px;padding:0 12px;border-radius:12px;border:1px solid var(--line);background:var(--surface-2);color:var(--ink);font-size:13px;min-width:0}.hb-in{flex:1 1 200px}.hb-in.sm{flex:0 0 92px;width:92px}.hb-sel{flex:1 1 130px}
.hb-lab{display:inline-flex;gap:8px;align-items:center;font-size:13px;color:var(--ink-2)}
.hb-more{align-self:center;margin-top:4px}.hb-jl{display:flex;flex-direction:column;gap:8px;margin-bottom:16px}.hb-jr{border:1px solid var(--line);border-radius:14px;background:rgba(16,19,26,.6);overflow:hidden}
.hb-jm{all:unset;box-sizing:border-box;cursor:pointer;display:flex;align-items:center;gap:12px;width:100%;padding:10px 12px}.hb-jm .side-i{width:32px;height:32px;border-radius:10px;flex:none}
.hb-jt{flex:1;min-width:0;display:flex;flex-direction:column}.hb-jt .small{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.hb-jt .ico{width:12px;height:12px}.hb-jv{display:flex;flex-direction:column;align-items:flex-end}.hb-jv b{font:700 14px var(--mono)}
.hb-note{border-top:1px solid var(--line);padding:0 12px}.hb-note summary{cursor:pointer;list-style:none;display:flex;gap:6px;align-items:center;font-size:12px;color:var(--muted);padding:7px 0}.hb-note summary::-webkit-details-marker{display:none}.hb-note .ico{width:13px;height:13px}
.hb-note textarea{width:100%;margin:0 0 10px;padding:8px 10px;border-radius:10px;border:1px solid var(--line);background:var(--surface-2);color:var(--ink);font:13px var(--sans);resize:vertical}
.hb-hist{display:grid;grid-template-columns:repeat(9,1fr);gap:6px;align-items:end;height:190px;margin-bottom:10px}.hb-hist>div{display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%;gap:4px}
.hb-hist i{display:block;width:100%;min-height:2px;border-radius:6px 6px 2px 2px}.hb-hist i.p{background:linear-gradient(180deg,var(--good),color-mix(in srgb,var(--good) 40%,transparent))}.hb-hist i.n{background:linear-gradient(180deg,var(--bad),color-mix(in srgb,var(--bad) 40%,transparent))}.hb-hist i.z{background:var(--muted)}
.hb-hist b{font:600 11px var(--mono)}.hb-hist span{font-size:10.5px;color:var(--muted);white-space:nowrap}
.hb-heat{display:grid;gap:3px;font-size:10.5px}.hb-heat .hh{text-align:center;color:var(--muted);font-family:var(--mono)}.hb-heat .hw{color:var(--ink-2);align-self:center}
.hb-heat i{font-style:normal;display:grid;place-items:center;aspect-ratio:1;border-radius:5px;border:1px solid var(--line);font:600 10px var(--mono);color:var(--ink);min-width:0}
.hb-hbar{display:flex;flex-wrap:wrap;gap:6px;margin-top:12px}.hb-hbar>div{display:flex;gap:6px;align-items:baseline;padding:4px 8px;border-radius:9px;border:1px solid var(--line);font-size:11.5px}.hb-hbar span{color:var(--muted);font-family:var(--mono)}.hb-hbar b{font-family:var(--mono)}.hb-hbar em{font-style:normal;color:var(--muted)}
.hb-goal{display:flex;flex-direction:column;gap:12px;margin:6px 0 10px}.hb-gr{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,1fr) 78px;gap:12px;align-items:center}.hb-gr>span{font-size:13px;display:flex;flex-direction:column}.hb-gr em{font-style:normal;font-size:11px;color:var(--muted)}
.hb-gt{position:relative;height:14px;border-radius:99px;background:var(--surface-3)}.hb-gt i{position:absolute;inset:0 auto 0 0;border-radius:99px;background:var(--accent)}.hb-gt i.ok{background:linear-gradient(90deg,var(--accent),var(--good))}
.hb-gt u{position:absolute;top:-4px;bottom:-4px;width:3px;border-radius:2px;background:#fff;box-shadow:0 0 8px rgba(255,255,255,.6)}.hb-gr b{font:700 13.5px var(--mono);text-align:right}
.hb-at td,.hb-at th{white-space:nowrap}.hb-ct td,.hb-ct th{white-space:nowrap}.hb-ct small{display:block;font-size:10.5px}.hb-ct tr.hb-hi td{background:color-mix(in srgb,var(--accent) 12%,transparent)}
.hb-wi .eyebrow{color:var(--ink-2)}.hb-wib{display:block;font-size:30px;font-weight:800;margin:6px 0 10px}.hb-wi.w{border-color:color-mix(in srgb,var(--good) 40%,transparent)}.hb-wi.l{border-color:color-mix(in srgb,var(--bad) 40%,transparent)}
.hb-steps{display:flex;flex-direction:column;gap:2px}.hb-step{display:flex;gap:14px;padding:10px 0;border-bottom:1px solid var(--line)}.hb-step:last-child{border-bottom:0}
.hb-step>span{flex:none;width:28px;height:28px;border-radius:9px;display:grid;place-items:center;font:700 13px var(--mono);background:color-mix(in srgb,var(--accent) 22%,transparent);color:var(--ink)}.hb-step b{font-size:14px}.hb-step p{margin:3px 0 0;font-size:13px;line-height:1.5;color:var(--ink-2)}
.hb-score{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px;margin-bottom:16px}.hb-sc{display:flex;flex-direction:column;gap:6px;padding:14px 16px;border-radius:16px;border:1px solid var(--line);background:linear-gradient(160deg,rgba(22,26,35,.82),rgba(16,19,26,.6));color:inherit;text-decoration:none}
.hb-sc.rejected{border-left:3px solid var(--bad)}.hb-sc.candidate,.hb-sc.adopted{border-left:3px solid var(--good)}.hb-sc:hover{border-color:color-mix(in srgb,var(--accent) 40%,transparent)}
.hb-sch{display:flex;gap:8px;align-items:center;justify-content:space-between}.hb-sc b{font-size:13.5px;line-height:1.35}.hb-sc p{margin:0;font-size:12.5px;line-height:1.5;color:var(--ink-2)}
.hb-cl>div{display:grid;grid-template-columns:86px 1fr;gap:10px;padding:7px 0;border-bottom:1px solid var(--line)}.hb-cl>div:last-of-type{border-bottom:0}.hb-cl p{margin:0;font-size:13px;line-height:1.45}
.card .row:has(.seg){flex-wrap:wrap;gap:8px}.card .row:has(.seg) .seg{margin-left:auto}.hb-plan2{padding:12px 0;border-top:1px solid var(--line)}.hb-plan2:first-of-type{border-top:0}.hb-p2h{display:flex;justify-content:space-between;gap:10px;align-items:baseline}.hb-p2h b{font-size:14px}.hb-p2h s{font-size:12px}.hb-codes{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:8px}.hb-code{display:inline-flex;gap:6px;align-items:center;height:32px;padding:0 10px;border-radius:10px;border:1px dashed color-mix(in srgb,var(--good) 55%,transparent);background:color-mix(in srgb,var(--good) 10%,transparent);color:var(--ink);font:600 12.5px var(--mono)}.hb-code .ico{width:13px;height:13px}.hb-code span{color:var(--good-ink)}.hb-pf{margin-top:8px;border:1px solid var(--line);border-radius:12px;padding:0 12px}.hb-pf summary{cursor:pointer;list-style:none;display:flex;justify-content:space-between;align-items:center;padding:9px 0;font-size:13px;font-weight:600}.hb-pf summary::-webkit-details-marker{display:none}.hb-pf[open] .chev{transform:rotate(180deg)}.hb-kvs{display:flex;justify-content:space-between;gap:12px;padding:7px 0;border-top:1px solid var(--line);font-size:12.5px}.hb-kvs span{color:var(--muted)}.hb-kvs b{font-weight:600;text-align:right}.hb-week{display:grid;grid-template-columns:repeat(auto-fit,minmax(78px,1fr));gap:6px}.hb-week>div{display:flex;flex-direction:column;gap:2px;padding:8px 10px;border-radius:12px;border:1px solid var(--line);background:var(--surface-2)}.hb-week>div.now{box-shadow:inset 0 0 0 2px var(--accent)}.hb-week>div.hol{border-color:color-mix(in srgb,var(--warn) 60%,transparent)}.hb-week span{font-size:11.5px;color:var(--muted)}.hb-week em{font-style:normal;font-size:11.5px;color:var(--ink-2)}.hb-md summary{cursor:pointer;display:flex;gap:8px;align-items:center;list-style:none}.hb-md summary::-webkit-details-marker{display:none}.hb-md[open] summary{margin-bottom:12px}
@media (max-width:760px){
  .hb-hero{gap:12px}.hb-hr{align-items:flex-start;border-left:0;border-top:1px solid var(--line);padding:12px 0 0;flex-basis:100%}.hb-hr em{text-align:left}.hb-verdict{font-size:23px}
  .hb-tiles{grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.hb-tiles.t5{grid-template-columns:repeat(2,minmax(0,1fr))}.hb-tiles.t5 .hb-tile:first-child{grid-column:1/3}
  .hb-tile{padding:12px 13px}.hb-tile b{font-size:21px}.hb-gr{grid-template-columns:1fr 70px}.hb-gr>span{grid-column:1/3}.hb-gr .hb-gt{grid-column:1}
  .hb-heat{gap:2px}.hb-heat i{font-size:9px;border-radius:4px}.hb-hist span{font-size:9.5px}
}
html[data-compact="on"] .card{padding:12px 14px;margin-bottom:10px}html[data-compact="on"] .hb-tile,html[data-compact="on"] .stat{padding:9px 11px}html[data-compact="on"] .hb-tile b,html[data-compact="on"] .stat b{font-size:18px}
html[data-compact="on"] .page{padding-top:12px}html[data-compact="on"] .hero h2{font-size:22px}html[data-compact="on"] .hb-verdict{font-size:20px}html[data-compact="on"] .hb-hr b{font-size:26px}html[data-compact="on"] .grid{gap:10px;margin-bottom:10px}html[data-compact="on"] .hb-tiles{gap:7px;margin-bottom:10px}
html[data-theme="light"]{color-scheme:light;--page:#f3f5fa;--surface:#fff;--surface-2:#eef1f7;--surface-3:#e2e6ef;--ink:#101523;--ink-2:#414a5e;--muted:#6c7589;--line:rgba(20,30,70,.12);--hover:rgba(20,30,70,.05);--good-ink:#0a9a62;--good:#11b97a;--bad:#e23b5c;--warn:#c98a12}
html[data-theme="light"] body{background:var(--page)}html[data-theme="light"] .card,html[data-theme="light"] .hb-tile,html[data-theme="light"] .stat,html[data-theme="light"] .hb-sc,html[data-theme="light"] .hb-jr{background:#fff;box-shadow:0 4px 18px rgba(20,30,70,.07)}
html[data-theme="light"] .side,html[data-theme="light"] .top,html[data-theme="light"] .strip,html[data-theme="light"] .tabs,html[data-theme="light"] .side-foot{background:rgba(255,255,255,.88)!important}
html[data-theme="light"] .chipbtn,html[data-theme="light"] .status,html[data-theme="light"] .iconbtn,html[data-theme="light"] .btn.ghost{background:#fff}html[data-theme="light"] .hb-mini{background:#f6f8fc}
html[data-theme="light"] .hb-gt u{background:#101523}html[data-theme="light"] .sub{background:linear-gradient(180deg,rgba(243,245,250,.95),rgba(243,245,250,.7))!important}html[data-theme="light"] .hb-jr,html[data-theme="light"] .hb-sel,html[data-theme="light"] .hb-in{background:#fff}html[data-theme="light"] .sheet{background:#fff}html[data-theme="light"] canvas.fx-bg,html[data-theme="light"] #fxField{opacity:.15}
`;

  install();
  // first paint: home.json (small) may be here before data.json
  const firstHome = () => { if (!D && window.HOMEJ && PAGE === 'today') render(true); };
  if (window.HOMEJ) firstHome(); else if (window.HOMEP) window.HOMEP.then(firstHome).catch(() => null);
})();

// Mission Control (2026-10-29, owner: "make it look cooler ... features I should have had"; read-only).
// One renderer for both dashboards: tools/web_public/missioncore.js = web_next/js/next/missioncore.js (byte-identical,
// classic script -> window.MissionUI). It reads only data the pages already load:
//   board   the live board (engine/live_board.py: phone data.json / home.json / live.json "board", PC GET /api/next/board)
//   lv      the Live View data when the page has it (phone liveview.json, PC /api/next/liveview): BLITZ's thinking line
//   news    [{ t, title, impact }] the day's calendar (phone data.json goals.calendar, PC the goals API) - optional
//   cloud   { t } the cloud monitor's last run (phone data.json live.last_run) - optional
// Accounts are rendered generically: every account-shaped block of the board (lit, atlas, and any third one another
// change adds, e.g. blitz / scalp, or a board.accounts list); BLITZ shows "paper / not live yet" until its account exists.
// What it draws (each part also works alone):
//   strip(M)      Home's top: three orbit chips (balance, $ to target, today, state light), today's mission, next session
//   page(M)       #mission: the three orbits/planets with every number, today's mission, countdowns, and the features
//                 below (MissionUI.FEATURES lists them for the registry)
//   botStates(M)  { lit, atlas, scalp: 'trade' | 'armed' | 'idle' | 'off' } for the 3D satellites (fx.js FX.bots)
//   closed(M)     the closed trades (newest first, with a stable id) for the shooting stars (FX.shoot)
//   wire(el)      the countdowns tick every second (data-mc-cd) and the alert filter
// Paper only: it never arms, routes or changes the bot.
(function () {
  'use strict';
  const ET = 'America/New_York';
  const okN = (v) => typeof v === 'number' && Number.isFinite(v);
  const arr = (x) => (Array.isArray(x) ? x : []);
  const obj = (x) => (x && typeof x === 'object' && !Array.isArray(x) ? x : {});
  const num = (v) => (v == null || v === '' ? null : okN(+v) ? +v : null);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = (v) => (okN(v) ? (v < 0 ? '-' : '') + '$' + Math.abs(Math.round(v)).toLocaleString('en-US') : '—');
  const smoney = (v) => (okN(v) ? (v > 0 ? '+' : v < 0 ? '-' : '') + '$' + Math.abs(Math.round(v)).toLocaleString('en-US') : '—');
  const px = (v) => (okN(v) ? v.toLocaleString('en-US', { maximumFractionDigits: 2 }) : '—');
  const cls = (v) => (okN(v) ? (v > 0 ? 'up' : v < 0 ? 'dn' : '') : '');
  const nowS = () => Date.now() / 1000;
  function etParts(t) {
    const p = new Intl.DateTimeFormat('en-US', { timeZone: ET, weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(t * 1000));
    const g = (k) => (p.find((x) => x.type === k) || {}).value;
    const h = +g('hour') % 24, m = +g('minute');
    return { wd: g('weekday'), h, m, min: h * 60 + m, hm: String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0'), date: `${g('year')}-${g('month')}-${g('day')}` };
  }
  function dur(s) {
    s = Math.max(0, Math.round(s));
    const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
    return d ? `${d}d ${h}h` : h ? `${h}h ${String(m).padStart(2, '0')}m` : m ? `${m}m ${String(x).padStart(2, '0')}s` : `${x}s`;
  }
  const cd = (t, label) => (okN(t) ? `<span class="mc-cd" data-mc-cd="${Math.round(t)}"${label ? ` data-l="${esc(label)}"` : ''}>${label ? esc(label) + ' ' : ''}${dur(t - nowS())}</span>` : '');

  // ------------------------------------------------------------------ the three bots
  const BOT = {
    lit: { name: 'Zlarior', size: '50K', color: '#4f9bff', sat: 'lit', method: 'LIT · sweep → CISD → one target', hours: [[120, 930]] },
    atlas: { name: 'ATLAS', size: '25K', color: '#ff9a3d', sat: 'atlas', method: 'EMA · MACD · S/R', hours: [[180, 570], [120, 300], [570, 720]] },
    blitz: { name: 'BLITZ', size: '25K', color: '#b388ff', sat: 'scalp', method: 'scalper · 09:30 noise band', hours: [[570, 955]] },
  };
  const keyOf = (k, a) => {
    const s = String((a && (a.id || a.key)) || k || '').toLowerCase();
    if (/^(lit|zlarior)/.test(s)) return 'lit';
    if (/^atlas/.test(s)) return 'atlas';
    if (/^(blitz|scalp|strategy ?3|s3)/.test(s) || /blitz/i.test(String((a && a.name) || ''))) return 'blitz';
    return s || 'acct';
  };
  const NOT_ACCT = new Set(['map', 'health', 'progress', 'real', 'week_real', 'lines', 'blocks', 'trades']);
  // every account-shaped block of the board, Zlarior / ATLAS / BLITZ first; a BLITZ placeholder until it has an account
  function accounts(M) {
    M = obj(M);
    const B = obj(M && M.board), seen = new Map();
    const take = (k, a) => {
      if (!a || typeof a !== 'object' || Array.isArray(a) || a.error) return;
      if (!(a.id || a.name) || !('balance' in a || 'waiting' in a || 'plan' in a || 'room' in a)) return;
      const key = keyOf(k, a); if (!seen.has(key)) seen.set(key, a);
    };
    if (Array.isArray(B.accounts)) B.accounts.forEach((a) => take(a && (a.id || a.key), a));
    for (const [k, v] of Object.entries(B)) if (!NOT_ACCT.has(k)) take(k, v);
    const order = ['lit', 'atlas', 'blitz'];
    const keys = [...seen.keys()].sort((a, b) => (order.indexOf(a) < 0 ? 9 : order.indexOf(a)) - (order.indexOf(b) < 0 ? 9 : order.indexOf(b)));
    const out = keys.map((k) => norm(k, seen.get(k), M));
    if (!seen.has('blitz')) out.push(norm('blitz', null, M));
    return out;
  }
  function lvOf(M, sat) { const s = obj(M && M.lv && M.lv.strategies); return s[sat] && typeof s[sat] === 'object' ? s[sat] : null; }
  function norm(k, a, M) {
    const meta = BOT[k] || { name: (a && a.name) || k, size: '', color: '#8aa0ff', sat: k, method: (a && a.method) || '', hours: [] };
    const L = lvOf(M, meta.sat);
    const ph = !a;
    const plan = String((a && a.plan) || (ph ? 'MFFU Builder 25K' : '')), size = (plan.match(/(\d+)K/i) || [])[1] ? plan.match(/(\d+)K/i)[1] + 'K' : meta.size;
    const pos0 = a && a.position && typeof a.position === 'object' ? a.position : null;
    let pos = null;
    if (pos0) {
      const dir = pos0.dir || (String(pos0.side || '').toUpperCase() === 'LONG' ? 1 : -1), q = num(pos0.qty) || 0, e = num(pos0.entry);
      const atStop = num(pos0.risk_usd) != null ? -Math.abs(num(pos0.risk_usd)) : (e != null && num(pos0.stop) != null ? (num(pos0.stop) - e) * dir * q * 2 : null);
      const atTgt = num(pos0.target_usd) != null ? num(pos0.target_usd) : (e != null && num(pos0.target) != null ? (num(pos0.target) - e) * dir * q * 2 : null);
      pos = { side: pos0.side || (dir === 1 ? 'LONG' : 'SHORT'), dir, qty: q, entry: e, stop: num(pos0.stop), target: num(pos0.target), be: !!pos0.be,
        atStop, atTgt, unreal: num(pos0.unrealized_usd), member: pos0.strategy || pos0.key || null, t: num(pos0.entry_t) };
    }
    const think = (L && L.thinking && L.thinking.headline) || null;
    const st = a && a.stage && typeof a.stage === 'object' ? a.stage : null;
    const members = a && Array.isArray(a.members) ? a.members : (L && Array.isArray(L.members) ? L.members : []);
    const armed = !!(st && ['limit', 'cisd1m', 'entry'].includes(st.key)) || members.some((m) => /armed|tapped|pending|limit/i.test(String(m.stage || '')));
    const status = String((a && a.status) || (ph ? 'paper' : 'open'));
    const blocks = arr(a && a.blocks).filter((b) => b && typeof b === 'object');
    const configured = ph ? false : a.configured !== false;
    const ended = /passed|failed|lost|stuck|graduated/.test(status);
    const state = pos ? 'trade' : ph || !configured || ended ? 'off' : armed ? 'armed' : 'idle';
    const win = a && a.window && typeof a.window === 'object' ? a.window : null;
    const room = num(a && a.room), mll = num(a && a.mll), bal = num(a && a.balance);
    return {
      key: k, sat: meta.sat, name: (a && a.name) || meta.name, size, plan: plan || `MFFU Builder ${meta.size}`, color: meta.color, method: (a && a.method) || meta.method,
      placeholder: ph, paper: ph || /paper|cloud/i.test(String((a && a.source) || '')) || !!(L && L.paper && ph), source: (a && a.source) || (ph ? 'paper shadow' : ''),
      balance: bal, toTarget: num(a && a.to_target), target: num(a && a.target_balance), room, mll, roomFrac: num(a && a.room_frac) ?? (room != null && mll ? Math.max(0, Math.min(1, room / mll)) : null),
      floor: num(a && a.floor), today: num(a && a.today_pnl), profit: num(a && a.profit), session: num(a && a.session), sessions: num(a && a.sessions),
      dll: num(a && a.dll), dllUsed: num(a && a.dll_used), tradesToday: num(a && a.trades_today) || 0, maxDay: num(a && a.max_day), doneToday: !!(a && a.done_today),
      status, state, armed, pos, win, windows: (a && Array.isArray(a.windows) ? a.windows : []), waiting: (a && a.waiting) || (L && L.text) || '', think: think || (a && a.waiting) || (ph ? (L && !L.placeholder ? 'PAPER shadow: watching the 09:30 noise band (never routed)' : 'paper / not live yet') : ''),
      stage: st, members, micros: a && a.micros ? a.micros : null, blocks, configured, ruleNote: a && a.rule_note, days: (a && Array.isArray(a.days) ? a.days : []),
      funded: a && a.funded ? a.funded : null, meta, lvPos: L && (L.position || L.position50) ? (L.position || L.position50) : null,
    };
  }
  // health light per account: red on a block or a red health strip, amber on stale / warn, green when trading normally
  function light(A, M) {
    if (A.placeholder) return 'idle';
    const H = obj(M.board && M.board.health);
    if (A.blocks.some((b) => b.kind !== 'passed') || (M.board && arr(M.board.blocks).length)) return 'bad';
    if (H.level === 'bad') return 'bad';
    if (H.level === 'warn' || A.state === 'off') return 'warn';
    return 'good';
  }
  function botStates(M) {
    M = obj(M);
    const o = { lit: 'idle', atlas: 'idle', scalp: 'off' };
    for (const A of accounts(M)) if (BOT[A.key]) o[A.sat] = A.state;
    const L = lvOf(M, 'scalp');
    if (o.scalp === 'off' && L && !L.placeholder) o.scalp = L.position || L.position50 ? 'trade' : 'idle';
    return o;
  }
  // closed trades, newest first, each with a stable id (for the shooting stars: one per new close)
  function closed(M) {
    M = obj(M);
    const T = arr(M && M.board && M.board.trades).filter((t) => t && t.open === false && (okN(+t.exit_t) || t.exit));
    return T.map((t) => ({ id: `${t.acct}|${t.entry_t}|${t.exit_t || ''}`, acct: t.acct, usd: num(t.usd), r: num(t.r), t: num(t.exit_t) || num(t.entry_t) || 0, src: t.src }))
      .sort((a, b) => b.t - a.t);
  }

  // ------------------------------------------------------------------ sessions, windows, the next session
  // next 18:00 ET session open (Sun-Thu), from now
  function nextSession(now) {
    for (let i = 0; i < 9 * 24 * 4; i++) {
      const t = Math.floor(now / 900) * 900 + 900 * (i + 1), p = etParts(t);
      if (p.min === 18 * 60 && !['Fri', 'Sat'].includes(p.wd)) return t;
    }
    return null;
  }
  function inSessionNow(now) { const p = etParts(now); if (p.wd === 'Sat') return false; if (p.wd === 'Sun') return p.min >= 18 * 60; if (p.wd === 'Fri') return p.min < 17 * 60; return p.min < 17 * 60 || p.min >= 18 * 60; }
  // one line per bot: what it is waiting for (or doing)
  function missionLine(A, M) {
    const now = M.now || nowS();
    if (A.pos) {
      const u = okN(A.pos.unreal) ? ` · now ${smoney(A.pos.unreal)}` : '';
      return `In a ${A.pos.side} ${A.pos.qty || ''} MNQ at ${px(A.pos.entry)}${u}: managing it to the target ${px(A.pos.target)}, stop ${px(A.pos.stop)}${A.pos.be ? ' (at breakeven)' : ''}.`;
    }
    if (A.placeholder) return A.think || 'Paper shadow: not live yet.';
    if (/passed/.test(A.status)) return 'Eval passed: no new trades on it. Next step: the funded account.';
    if (/failed|lost/.test(A.status)) return 'Eval ended: no new trades on it until a new account is added.';
    if (A.blocks.length) return `Blocked: ${A.blocks[0].text}${A.blocks[0].fix ? ' · Fix: ' + A.blocks[0].fix : ''}`;
    if (A.doneToday) return `Done for today (${A.tradesToday} of ${A.maxDay || 1} trade${(A.maxDay || 1) === 1 ? '' : 's'}): back at the next session.`;
    if (A.win && !A.win.open && okN(+A.win.open_t) && +A.win.open_t > now) return `Outside its hours: next window ${A.win.text ? A.win.text.replace(/^next entry window /, '') : ''}.`;
    return A.waiting || A.think || 'Watching.';
  }
  // why no trade yet: every reason, in plain words
  function whyNot(A, M) {
    const now = M.now || nowS(), out = [];
    if (A.pos) return [{ ok: true, text: 'It is in a trade right now.' }];
    if (A.placeholder) return [{ ok: null, text: 'No account yet: BLITZ runs as a PAPER shadow on the PC and is never routed.' }];
    if (!inSessionNow(now)) out.push({ ok: false, text: 'The market is closed (CME futures: Sunday 18:00 to Friday 17:00 ET).' });
    if (A.win && !A.win.open) out.push({ ok: false, text: `Outside its entry hours (${A.win.hours || (A.win.who ? A.win.who + ' ' : '') + 'window'}); ${A.win.text || ''}`.trim() });
    else if (A.win && A.win.open) out.push({ ok: true, text: 'Entry window open now.' });
    if (A.doneToday) out.push({ ok: false, text: `Daily trade limit reached (${A.tradesToday} / ${A.maxDay || 1}).` });
    for (const b of A.blocks) out.push({ ok: false, text: `${b.text}${b.fix ? ' · ' + b.fix : ''}` });
    for (const b of arr(M && M.board && M.board.blocks)) out.push({ ok: false, text: `${b.text}${b.fix ? ' · ' + b.fix : ''}` });
    if (A.stage && A.stage.label) out.push({ ok: null, text: `Setup stage: ${A.stage.label}${A.stage.n && A.stage.of ? ` (${A.stage.n} of ${A.stage.of})` : ''}. ${A.waiting || ''}`.trim() });
    else if (A.members.length) for (const m of A.members.slice(0, 4)) out.push({ ok: /armed|tapped/i.test(m.stage || '') ? true : null, text: `${m.short || m.key}: ${m.text || m.stage || ''}` });
    if (A.ruleNote) out.push({ ok: null, text: A.ruleNote });
    const news = arr(M.news).filter((n) => okN(n.t) && n.t > now - 1800 && n.t < now + 3 * 3600);
    if (news.length) out.push({ ok: null, text: `News close by: ${news.slice(0, 2).map((n) => `${etParts(n.t).hm} ${n.title}`).join(', ')}.` });
    if (!out.length) out.push({ ok: null, text: A.waiting || 'Waiting for its setup. Most days have no trade: the plan is 2-4 a week.' });
    return out;
  }

  // ------------------------------------------------------------------ parts
  const ring = (frac, color, label) => {
    const f = okN(frac) ? Math.max(0, Math.min(1, frac)) : 0, C = 2 * Math.PI * 15.5;
    return `<svg class="mc-ring" viewBox="0 0 36 36" aria-hidden="true"><circle cx="18" cy="18" r="15.5" class="mc-ring-bg"/><circle cx="18" cy="18" r="15.5" class="mc-ring-v" style="stroke:${color};stroke-dasharray:${(f * C).toFixed(1)} ${C.toFixed(1)}"/><text x="18" y="20.5">${esc(label)}</text></svg>`;
  };
  const LBL = { trade: 'IN TRADE', armed: 'ARMED', idle: 'WATCHING', off: 'OFF' };
  const BOT_PAGE = { lit: 'zlarior', atlas: 'atlas', blitz: 'blitz' };     // each bot's own tab / page (the phone aliases zlarior -> lit)
  function orbitCard(A, M, big, opts) {
    const lt = light(A, M), prog = okN(A.profit) && okN(A.toTarget) && A.profit + A.toTarget > 0 ? Math.max(0, Math.min(1, A.profit / (A.profit + A.toTarget))) : null;
    const nextT = A.win && okN(+A.win.open_t) && !A.win.open ? +A.win.open_t : A.win && A.win.open && okN(+A.win.close_t) ? +A.win.close_t : null;
    const pos = A.pos ? `<div class="mc-pos ${A.pos.dir === 1 ? 'up' : 'dn'}"><b>${esc(A.pos.side)} ${A.pos.qty || ''} MNQ @ ${px(A.pos.entry)}</b>
        <span>stop ${px(A.pos.stop)} = <i class="dn">${smoney(A.pos.atStop)}</i></span><span>target ${px(A.pos.target)} = <i class="up">${smoney(A.pos.atTgt)}</i></span>${okN(A.pos.unreal) ? `<span>now <i class="${cls(A.pos.unreal)}">${smoney(A.pos.unreal)}</i></span>` : ''}</div>` : '';
    const nums = A.placeholder
      ? `<div class="mc-nums"><div><em>Account</em><b>not live yet</b></div><div><em>Mode</em><b>paper</b></div></div>`
      : `<div class="mc-nums"><div><em>Balance</em><b data-dp-n="mc-${esc(A.key)}-bal">${money(A.balance)}</b></div><div><em>To target</em><b data-dp-n="mc-${esc(A.key)}-tgt">${okN(A.toTarget) && A.toTarget <= 0 ? 'passed' : money(A.toTarget)}</b></div>
          <div><em>Room to floor</em><b data-dp-n="mc-${esc(A.key)}-room" class="${okN(A.roomFrac) && A.roomFrac < 0.35 ? 'dn' : ''}">${money(A.room)}</b></div><div><em>Today</em><b class="${cls(A.today)}">${smoney(A.today)}</b></div></div>`;
    const day = A.placeholder ? 'paper shadow' : okN(A.session) ? `eval day ${A.session} of ${A.sessions || 10}` : A.funded ? 'funded' : '';
    return `<article class="mc-orbit dp-tilt ${big ? 'big' : ''} st-${A.state} lt-${lt}${A.placeholder ? ' ph' : ''}" style="--c:${A.color}" data-mc-acct="${esc(A.key)}">
      <div class="mc-planet" aria-hidden="true" style="--p:${prog != null ? (prog * 100).toFixed(1) : 0}%"><i class="mc-prog"></i><i class="mc-o1"></i><i class="mc-o2"></i><b class="mc-ball"></b><i class="mc-sat"></i></div>
      <header><span class="mc-name"><b>${esc(A.name)}</b> · ${esc(A.size || '')}</span><span class="mc-light ${lt}" title="health">${LBL[A.state]}</span></header>
      <p class="mc-sub">${esc(A.plan)}${A.placeholder ? ' · <b>paper / not live yet</b>' : A.paper ? ' · paper' : ''}${day ? ' · ' + esc(day) : ''}</p>
      ${nums}
      ${prog != null ? `<div class="mc-bar" title="progress to the target"><i style="width:${(prog * 100).toFixed(1)}%"></i></div>` : ''}
      ${pos}
      <p class="mc-think"><i></i>${esc(A.think || missionLine(A, M))}</p>
      ${nextT ? `<p class="mc-next">${A.win && A.win.open ? 'window closes in' : 'next window in'} ${cd(nextT)}</p>` : ''}
      ${opts && opts.go && BOT_PAGE[A.key] ? `<button type="button" class="mc-open mc-bot" ${opts.go(BOT_PAGE[A.key])}>Open ${esc(A.name)} ›</button>` : ''}
    </article>`;
  }
  function missionList(M, As) {
    return `<ol class="mc-mission">${As.map((A) => `<li style="--c:${A.color}"><i></i><b>${esc(A.name)}</b><span>${esc(missionLine(A, M))}</span></li>`).join('')}</ol>`;
  }
  // the session's end (17:00 ET) while open, else the next 18:00 ET open
  function sessionEnd(now) {
    for (let i = 0; i < 2 * 24 * 4; i++) { const t = Math.floor(now / 900) * 900 + 900 * (i + 1), p = etParts(t); if (p.min === 17 * 60 && !['Sat', 'Sun'].includes(p.wd)) return t; }
    return null;
  }
  function sessionCountdown(M) {
    const now = M.now || nowS(), open = inSessionNow(now);
    return `<div class="mc-sess"><span class="mc-dot ${open ? 'good' : ''}"></span>${open ? `CME futures open · this session ends 17:00 ET in ${cd(sessionEnd(now))}` : `CME futures closed · next session opens 18:00 ET in ${cd(nextSession(now))}`}</div>`;
  }
  // strip: Home's top area
  function strip(M, opts = {}) {
    M = obj(M);
    const As = accounts(M);
    const chips = As.map((A) => {
      const lt = light(A, M);
      const big = A.placeholder ? 'paper' : A.pos ? smoney(A.pos.unreal) : okN(A.toTarget) ? (A.toTarget <= 0 ? 'passed' : money(A.toTarget)) : '—';
      const sub = A.placeholder ? 'not live yet' : A.pos ? `${A.pos.side} · stop ${smoney(A.pos.atStop)}` : `to target · today ${smoney(A.today)}`;
      return `<button type="button" class="mc-chip st-${A.state}" style="--c:${A.color}" ${opts.go ? opts.go('mission') : ''} aria-label="${esc(A.name)}: ${esc(big)} ${esc(sub)}">
        <span class="mc-mini" aria-hidden="true"><b></b><i></i></span><span class="mc-ct"><em>${esc(A.name)} · ${esc(A.size)}<i class="mc-light ${lt}"></i></em><b>${esc(big)}</b><small>${esc(sub)}</small></span></button>`;
    }).join('');
    return `<section class="mc-strip" aria-label="Mission Control"><header><span class="mc-eye">Mission Control</span>${sessionCountdown(M)}</header>
      <div class="mc-chips">${chips}</div>${missionList(M, As)}
      <button type="button" class="mc-open" ${opts.go ? opts.go('mission') : ''}>Open Mission Control ›</button></section>`;
  }

  // ------------------------------------------------------------------ features (each a card)
  // 1. If it stops out now: $ lost and the room left after, per account (flat: a full stop at today's size)
  function fStop(M, As) {
    const rows = As.filter((A) => !A.placeholder).map((A) => {
      let loss = null, what = '';
      if (A.pos && okN(A.pos.atStop)) { loss = A.pos.atStop; what = `the open ${A.pos.side} hits its stop ${px(A.pos.stop)}`; }
      else if (A.micros && okN(+A.micros.risk_usd)) { loss = -Math.abs(+A.micros.risk_usd); what = `a full stop at today's size (${A.micros.qty} micros, ${A.micros.risk_pts || '—'} pts)`; }
      if (loss == null) return `<li><b>${esc(A.name)}</b><span>no position and no size yet</span></li>`;
      const after = okN(A.room) ? A.room + loss : null, frac = okN(after) && A.mll ? after / A.mll : null;
      return `<li class="${okN(frac) && frac < 0.25 ? 'warn' : ''}"><b>${esc(A.name)}</b><span>If ${esc(what)}: <i class="dn">${smoney(loss)}</i> → room left <i class="${okN(frac) && frac < 0.25 ? 'dn' : ''}">${money(after)}</i>${okN(A.today) && okN(A.dll) ? ` · day loss ${money(Math.max(0, -(A.today + loss)))} of ${money(A.dll)}` : ''}</span></li>`;
    });
    return card('stop', 'If it stops out now', 'What one stop-out costs, and the room to the floor after it', `<ul class="mc-rows">${rows.join('')}</ul>`);
  }
  // 2. Why no trade yet, per bot
  function fWhy(M, As) {
    const t = (ok) => (ok === true ? '<b class="mc-ok">✓</b>' : ok === false ? '<b class="mc-no">✗</b>' : '<b class="mc-wait">…</b>');
    const body = As.map((A) => `<details class="mc-why" ${A.key === 'lit' ? 'open' : ''} style="--c:${A.color}"><summary><i></i><b>${esc(A.name)}</b><span>${esc(A.pos ? 'in a trade' : A.placeholder ? 'paper' : A.state === 'armed' ? 'armed' : 'no trade yet')}</span></summary>
      <ul>${whyNot(A, M).map((r) => `<li>${t(r.ok)}<span>${esc(r.text)}</span></li>`).join('')}</ul></details>`).join('');
    return card('why', 'Why no trade yet?', 'Every reason each bot is not in a trade, in plain words', body);
  }
  // 3. MFFU consistency + streaks (booked eval days)
  function fStreak(M, As) {
    const rows = As.filter((A) => !A.placeholder).map((A) => {
      const d = A.days.filter((x) => Array.isArray(x) && okN(+x[1]));
      if (!d.length) return `<li><b>${esc(A.name)}</b><span>no booked days yet on this account</span></li>`;
      const pnl = d.map((x) => +x[1]), tot = pnl.reduce((a, b) => a + b, 0), best = Math.max(...pnl), green = pnl.filter((v) => v > 0).length, red = pnl.filter((v) => v < 0).length;
      let streak = 0, sk = 0; for (let i = pnl.length - 1; i >= 0; i--) { const s = Math.sign(pnl[i]); if (!s) continue; if (!sk) sk = s; if (s !== sk) break; streak++; }
      const share = tot > 0 && best > 0 ? best / tot : null;
      const dots = d.slice(-14).map((x) => `<i class="${+x[1] > 0 ? 'up' : +x[1] < 0 ? 'dn' : ''}" title="${esc(x[0])} ${smoney(+x[1])}"></i>`).join('');
      return `<li><b>${esc(A.name)}</b><span><em class="mc-dots">${dots}</em>${green} green · ${red} red · ${streak ? `${streak} ${sk > 0 ? 'green' : 'red'} in a row` : 'no streak'} · best day ${share != null ? `<i class="${share > 0.5 ? 'dn' : 'up'}">${Math.round(share * 100)}%</i> of the profit (MFFU payout rule: at most 50%)` : '—'}</span></li>`;
    });
    return card('streak', 'Streaks & consistency', 'Green / red days, the current streak, the best day vs the MFFU 50% consistency rule', `<ul class="mc-rows">${rows.join('')}</ul>`);
  }
  // 4. Session timeline 18:00 -> 17:00 ET: Asia / London / New York, each bot's windows, the news, now
  function fTimeline(M, As) {
    const now = M.now || nowS(), p = etParts(now), sMin = (m) => ((m - 18 * 60 + 1440) % 1440), W = 23 * 60;
    const x = (m) => (sMin(m) / W * 100).toFixed(2);
    const span = (a, b) => `left:${x(a)}%;width:${(((sMin(b) - sMin(a)) + W) % W / W * 100).toFixed(2)}%`;
    const bands = [['Asia', 18 * 60, 2 * 60], ['London', 2 * 60, 8 * 60], ['New York', 9 * 60 + 30, 16 * 60]].map(([n, a, b]) => `<i class="mc-band" style="${span(a, b)}"><em>${n}</em></i>`).join('');
    const rows = As.map((A) => {
      const H = (A.key === 'atlas' && A.members.length ? A.members.flatMap((m) => parseHours(m.hours)) : null) || A.meta.hours || [];
      return `<div class="mc-tl-row" style="--c:${A.color}"><b>${esc(A.name)}</b><div class="mc-tl-track">${H.map(([a, b]) => `<i style="${span(a, b)}"></i>`).join('')}</div></div>`;
    }).join('');
    const news = arr(M.news).filter((n) => okN(n.t) && Math.abs(n.t - now) < 20 * 3600).map((n) => { const q = etParts(n.t); return `<i class="mc-news ${esc(n.impact || '')}" style="left:${x(q.min)}%" title="${esc(q.hm + ' ' + n.title)}"></i>`; }).join('');
    const nowX = inSessionNow(now) ? `<i class="mc-now" style="left:${x(p.min)}%"><em>${p.hm}</em></i>` : '';
    const ticks = [18, 21, 0, 3, 6, 9, 12, 15].map((h) => `<span style="left:${x(h * 60)}%">${String(h).padStart(2, '0')}</span>`).join('');
    return card('timeline', 'Session timeline', 'Today 18:00 → 17:00 ET: the sessions, each bot\'s entry hours, the news, the flat-by 15:55', `<div class="mc-tl"><div class="mc-tl-bands">${bands}${news}${nowX}<i class="mc-flat" style="left:${x(15 * 60 + 55)}%" title="flat by 15:55 ET"></i></div>${rows}<div class="mc-tl-ticks">${ticks}</div></div>`);
  }
  function parseHours(s) {
    const out = []; String(s || '').replace(/(\d\d):(\d\d)\s*-\s*(\d\d):(\d\d)/g, (_, a, b, c, d) => { out.push([+a * 60 + +b, +c * 60 + +d]); return ''; });
    return out;
  }
  // 5. Alerts center: everything that needs attention, most urgent first
  function alertsList(M, As) {
    const B = obj(M.board), out = [];
    for (const l of arr(B.lines)) out.push({ lvl: l.level || 'warn', text: l.text });
    const kinds = new Set(arr(B.lines).map((l) => l && (l.kind === 'poll' ? 'poll_ms' : l.kind)));     // a health item the board's lines already say
    for (const it of arr(obj(B.health).items)) if (it && (it.ok === false || it.warn) && !kinds.has(it.key)) out.push({ lvl: it.ok === false ? 'bad' : 'warn', text: `${it.label}: ${it.value}${it.detail ? ' · ' + it.detail : ''}${it.fix ? ' · Fix: ' + it.fix : ''}` });
    for (const A of As) if (A.pos && okN(A.room) && okN(A.pos.atStop) && A.room + A.pos.atStop < (A.mll || 0) * 0.25) out.push({ lvl: 'warn', text: `${A.name}: a stop-out now leaves only ${money(A.room + A.pos.atStop)} of room.` });
    const nar = arr(M.lv && M.lv.narrator).filter((m) => m.level && m.level !== 'dim').slice(0, 6);
    for (const m of nar) out.push({ lvl: m.level === 'bad' ? 'bad' : m.level === 'good' ? 'good' : 'info', text: `${m.hm || ''} ${m.title || ''}: ${m.text || ''}`.trim() });
    const seen = new Set();
    return out.filter((a) => { const k = a.text; if (seen.has(k)) return false; seen.add(k); return true; })
      .sort((a, b) => ['bad', 'warn', 'info', 'good'].indexOf(a.lvl) - ['bad', 'warn', 'info', 'good'].indexOf(b.lvl));
  }
  function fAlerts(M, As) {
    const L = alertsList(M, As);
    const body = L.length ? `<div class="mc-af" role="tablist"><button type="button" class="on" data-mc-af="all">All ${L.length}</button><button type="button" data-mc-af="bad">Red ${L.filter((a) => a.lvl === 'bad').length}</button><button type="button" data-mc-af="warn">Amber ${L.filter((a) => a.lvl === 'warn').length}</button></div>
      <ul class="mc-alerts">${L.map((a) => `<li class="${a.lvl}" data-lvl="${a.lvl}"><i></i><span>${esc(a.text)}</span></li>`).join('')}</ul>` : '<p class="mc-muted">All clear: nothing needs you right now.</p>';
    return card('alerts', 'Alerts center', 'Red and amber items from the board, the health strip and the bot\'s feed, most urgent first', body);
  }
  // 6. Health constellation: PC · NinjaTrader · feed · heartbeat · phone feed · cloud as connected stars
  function healthNodes(M) {
    const B = obj(M.board), I = {}; for (const it of arr(obj(B.health).items)) if (it && it.key) I[it.key] = it;
    const lv = (it) => (!it ? 'idle' : it.ok === false ? 'bad' : it.warn ? 'warn' : it.ok ? 'good' : 'idle');
    const now = M.now || nowS(), hbAge = okN(+B.data_t) ? now - B.data_t : null;
    const pc = B.running === false ? { l: 'bad', v: 'stopped' } : I.loop ? { l: lv(I.loop), v: I.loop.value } : { l: hbAge != null && hbAge < 900 ? 'good' : hbAge != null ? 'warn' : 'idle', v: hbAge != null ? dur(hbAge) + ' ago' : 'no data' };
    const feed = I.age_1m_s || I.age_5m_s;
    const cl = M.cloud && okN(+M.cloud.t) ? now - M.cloud.t : null;
    return [
      { k: 'pc', n: 'PC bot', l: pc.l, v: pc.v, x: 50, y: 16 },
      { k: 'nt', n: 'NinjaTrader', l: lv(I.nt), v: I.nt ? I.nt.value : '—', x: 84, y: 38 },
      { k: 'feed', n: 'Feed', l: lv(feed), v: feed ? feed.value : '—', x: 78, y: 80 },
      { k: 'hb', n: 'Heartbeat', l: lv(I.heartbeat), v: I.heartbeat ? I.heartbeat.value : '—', x: 22, y: 80 },
      { k: 'phone', n: 'Phone feed', l: lv(I.live_pub), v: I.live_pub ? I.live_pub.value : '—', x: 16, y: 38 },
      { k: 'cloud', n: 'Cloud', l: cl == null ? 'idle' : cl < 3600 ? 'good' : cl < 4 * 3600 ? 'warn' : 'idle', v: cl == null ? (M.where === 'pc' ? 'GitHub Actions' : '—') : dur(cl) + ' ago', x: 50, y: 56 },
    ];
  }
  function fHealth(M) {
    const N = healthNodes(M), E = [['pc', 'nt'], ['nt', 'feed'], ['pc', 'hb'], ['hb', 'cloud'], ['pc', 'phone'], ['phone', 'cloud'], ['feed', 'cloud'], ['pc', 'cloud']];
    const at = (k) => N.find((n) => n.k === k);
    const lines = E.map(([a, b]) => { const A = at(a), B2 = at(b), bad = [A.l, B2.l].includes('bad'); return `<line x1="${A.x}" y1="${A.y}" x2="${B2.x}" y2="${B2.y}" class="${bad ? 'bad' : [A.l, B2.l].includes('warn') ? 'warn' : ''}"/>`; }).join('');
    const stars = N.map((n) => `<g class="mc-star ${n.l}" transform="translate(${n.x} ${n.y})"><circle r="5.5" class="h"/><circle r="2.4"/><text y="-8">${esc(n.n)}</text><text y="12.5" class="v">${esc(n.v)}</text></g>`).join('');
    const red = N.filter((n) => n.l === 'bad').map((n) => n.n);
    return card('health', 'Health constellation', red.length ? `Red: ${red.join(', ')}` : 'Every link of the chain: PC bot → NinjaTrader → feed, heartbeat → cloud → phone',
      `<svg class="mc-const" viewBox="0 0 100 96" role="img" aria-label="Health: ${esc(N.map((n) => n.n + ' ' + n.l).join(', '))}">${lines}${stars}</svg>`);
  }
  // 7. Eval runway: $ to go per session left vs the backtest's $ per session
  function fRunway(M, As) {
    const P = obj(M.board && M.board.progress);
    const rows = As.filter((A) => !A.placeholder && okN(A.toTarget)).map((A) => {
      const pr = P[A.key] || {}, left = okN(pr.sessions_left) ? pr.sessions_left : okN(A.session) ? Math.max(0, (A.sessions || 10) - A.session + 1) : null;
      const per = okN(left) && left > 0 ? Math.max(0, A.toTarget) / left : null, exp = pr.expected && okN(+pr.expected.per_session) ? +pr.expected.per_session : null;
      const win = A.micros && okN(+A.micros.win_usd) ? +A.micros.win_usd : null;
      return `<li><b>${esc(A.name)}</b><span>${A.toTarget <= 0 ? 'target reached' : `${money(A.toTarget)} to go in ${left ?? '—'} session${left === 1 ? '' : 's'} = <i>${money(per)}</i> a session${exp != null ? ` (backtest ${money(exp)})` : ''}${win ? ` · one winner at today's size pays ~${money(win)}${win >= A.toTarget ? ' = enough to pass' : ` = ${Math.ceil(A.toTarget / win)} winners`}` : ''}`}</span></li>`;
    });
    return card('runway', 'Eval runway', 'What each eval still needs, per session left, next to the backtest pace and the size of one winner', `<ul class="mc-rows">${rows.join('') || '<li><span>No eval reporting yet.</span></li>'}</ul>`);
  }
  // 8. Daily loss gauge + 9. week pace
  function fLimits(M, As) {
    const P = obj(M.board && M.board.progress);
    const rows = As.filter((A) => !A.placeholder).map((A) => {
      const used = okN(A.dllUsed) ? A.dllUsed : okN(A.today) && A.today < 0 ? -A.today : 0, f = A.dll ? Math.min(1, used / A.dll) : 0;
      const wk = (P[A.key] || {}).week || null;
      return `<li><b>${esc(A.name)}</b><span><em class="mc-gauge"><i style="width:${(f * 100).toFixed(1)}%" class="${f > 0.6 ? 'dn' : ''}"></i></em>day loss ${money(used)} of ${money(A.dll)}${wk ? ` · this week ${wk.n} trade${wk.n === 1 ? '' : 's'} (goal ${wk.lo}-${wk.hi}) ${smoney(wk.usd)}` : ''}</span></li>`;
    });
    return card('limits', 'Daily loss & week pace', 'The daily loss limit used today and this week\'s trades vs the 2-4 goal', `<ul class="mc-rows">${rows.join('')}</ul>`);
  }
  // 10. Next news
  function fNews(M) {
    const now = M.now || nowS(), N = arr(M.news).filter((n) => okN(n.t) && n.t > now - 600).sort((a, b) => a.t - b.t).slice(0, 4);
    const body = N.length ? `<ul class="mc-rows">${N.map((n) => `<li class="${esc(n.impact || '')}"><b>${etParts(n.t).wd} ${etParts(n.t).hm}</b><span>${esc(n.title)} · ${n.t > now ? cd(n.t, 'in') : 'now'}</span></li>`).join('')}</ul>` : '<p class="mc-muted">No big US news on the calendar for today.</p>';
    return card('news', 'Next news', 'High-impact events coming up, with a countdown', body);
  }
  const card = (id, title, sub, body) => `<section class="card mc-card dp-tilt" data-mc-f="${id}"><header><h3>${esc(title)}</h3><p>${esc(sub)}</p></header>${body}</section>`;
  const FEATURES = [
    ['mission', 'Mission Control', 'the three accounts as orbits with balance, $ to target, room, today, the open position with $ at stop / target, eval day, next window, the thinking line, a health light'],
    ['today', "Today's mission", 'one line per bot: what it is waiting for or doing right now'],
    ['session', 'Next-session countdown', 'market open / closed and the time to the next 18:00 ET session'],
    ['stop', 'If it stops out now', '$ lost and the room to the floor after one stop-out, per account (flat: at today\'s size)'],
    ['why', 'Why no trade yet?', 'every reason per bot: hours, market closed, daily limit, guards, setup stage, rules, news'],
    ['streak', 'Streaks & consistency', 'green / red days, current streak, best day vs the MFFU 50% payout rule'],
    ['timeline', 'Session timeline', 'Asia / London / New York with each bot\'s entry hours, the news, now and the 15:55 flat'],
    ['alerts', 'Alerts center', 'every red / amber item from the board, the health strip and the bot\'s feed, with a filter'],
    ['health', 'Health constellation', 'PC bot, NinjaTrader, feed, heartbeat, phone feed and cloud as linked stars'],
    ['runway', 'Eval runway', '$ to go per session left vs the backtest pace, winners needed at today\'s size'],
    ['limits', 'Daily loss & week pace', 'the daily loss limit used today, this week\'s trades vs the goal'],
    ['news', 'Next news', 'upcoming high-impact events with a countdown'],
    ['telemetry', 'Telemetry strip', 'NQ price, ATR, VIX / VXN, the VIX-band objective and a ticking ET clock on top of Mission Control'],
    ['space', 'Deep space 3D', 'Earth, the eclipse, the Sun, stars; bot satellites glow when armed / in a trade, a shooting star on every closed trade, the aurora follows today\'s P&L'],
  ];
  // telemetry: NQ price, ATR, VIX / VXN and the VIX-band objective up / down from the 18:00 open, the ET clock (ticks)
  function telemetry(M) {
    const mp = obj(M.board && M.board.map), vx = obj(mp.vix), now = M.now || nowS();
    const it = [];
    if (okN(+mp.price)) it.push(['NQ', px(+mp.price) + (mp.bar_hm ? ` · ${mp.bar_hm}` : '')]);
    if (okN(+mp.atr)) it.push(['ATR', px(+mp.atr)]);
    if (okN(+vx.vix)) it.push(['VIX', px(+vx.vix) + (okN(+vx.vxn) ? ` · VXN ${px(+vx.vxn)}` : '')]);
    if (okN(+vx.up) && okN(+vx.dn)) it.push(['Band', `${px(+vx.dn)} – ${px(+vx.up)}`]);
    it.push(['ET', `<span data-mc-clock>${etParts(now).hm}</span>`]);
    return `<div class="mc-tele">${it.map(([k, v]) => `<span><em>${esc(k)}</em><b>${String(v).startsWith('<span') ? v : esc(v)}</b></span>`).join('')}</div>`;
  }
  function page(M, opts = {}) {
    M = obj(M);
    const As = accounts(M);
    return `<div class="mc-page">
      <header class="mc-hero"><div><span class="mc-eye">Mission Control · read-only</span><h2>Three bots in orbit</h2>${sessionCountdown(M)}${telemetry(M)}
        <p class="mc-skykey">In the sky behind: each bot is a satellite around the Earth (<span class="mc-lg" style="--c:#4f9bff"></span>Zlarior <span class="mc-lg" style="--c:#ff9a3d"></span>ATLAS <span class="mc-lg" style="--c:#b388ff"></span>BLITZ). It glows when armed, pulses with a beam to the ground while in a trade; a shooting star is a closed trade (green win, red loss); the aurora turns green or red with today's P&amp;L.</p></div></header>
      <div class="mc-orbits">${As.map((A) => orbitCard(A, M, true, opts)).join('')}</div>
      <section class="card mc-card" data-mc-f="today"><header><h3>Today's mission</h3><p>What each bot is waiting for, right now</p></header>${missionList(M, As)}</section>
      <div class="mc-grid">${fStop(M, As)}${fWhy(M, As)}${fTimeline(M, As)}${fAlerts(M, As)}${fHealth(M)}${fRunway(M, As)}${fStreak(M, As)}${fLimits(M, As)}${fNews(M)}</div>
      <p class="mc-foot">Read-only · ${M.board && okN(+M.board.t) ? `board ${dur((M.now || nowS()) - M.board.t)} old` : 'no board yet'}${M.board && M.board.where ? ' · from ' + esc(M.board.where) : ''}</p></div>`;
  }
  function tick(root) {
    (root || document).querySelectorAll('[data-mc-cd]').forEach((s) => { s.textContent = `${s.dataset.l ? s.dataset.l + ' ' : ''}${dur(+s.dataset.mcCd - nowS())}`; });
    (root || document).querySelectorAll('[data-mc-clock]').forEach((s) => { const p = new Intl.DateTimeFormat('en-US', { timeZone: ET, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(new Date()); s.textContent = p.replace(/^24/, '00'); });
  }
  let timer = null;
  function wire(el) {
    if (!el) return;
    el.querySelectorAll('[data-mc-af]').forEach((b) => b.addEventListener('click', () => {
      const v = b.dataset.mcAf; b.parentElement.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b));
      el.querySelectorAll('.mc-alerts li').forEach((li) => { li.hidden = v !== 'all' && li.dataset.lvl !== v; });
    }));
    clearInterval(timer);
    timer = setInterval(() => { if (!document.hidden) tick(document); if (!document.querySelector('[data-mc-cd], [data-mc-clock]')) { clearInterval(timer); timer = null; } }, 1000);
  }
  window.MissionUI = { version: 1, accounts, botStates, closed, strip, page, wire, tick, missionLine, whyNot, alertsList, healthNodes, nextSession, FEATURES };
})();

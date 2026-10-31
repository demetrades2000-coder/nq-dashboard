// Trader's deck (2026-10-29, owner: "keep finding stuff to add ... improve dashboard features"; read-only). ONE renderer for
// both apps: tools/web_public/deckcore.js = web_next/js/next/deckcore.js (byte-identical). Classic script: window.DeckUI.
// Eight features from the data the apps already load (web_next/FEATURES.md 73-80):
//   risk      cross-account risk meter: open risk $ on the 3 accounts vs each room and the combined daily loss
//   next24    the next 24 h: entry windows per bot, BLITZ's checks, the 15:55 flat, news, early closes, the clock change
//   odds      eval odds from today's balance (a random walk at the 2026 H2 pace) next to the research odds from the start
//   cal       real P&L calendar per bot (real fills only, never paper)
//   journal   one trade journal: every trade with its Mind review (A-F) and a Holodeck replay link
//   inbox     notification center: every red / amber line, Mind alerts and the bot's feed, a mute per bot (this device only)
//   digest    "since you last looked": new trades, fills, alerts, reviews and ideas since this device last opened Home
//   replays   Holodeck replay links per traded day (Mission Control)
// Input M: { now, where, board (the live board), lv (Live View data: narrator feed, BLITZ layer), mind (the Mind block),
// news: [{t, title, impact}], cal: goals.calendar ({news, early_close, clocks}), acc: account C block }. Nothing here talks
// to the bot; the mutes and the "last looked" time live in this browser's localStorage only.
(function () {
  'use strict';
  const V = 1;
  const BOT = { lit: { name: 'Zlarior', c: '#4f9bff', dll: 1000 }, atlas: { name: 'ATLAS', c: '#ff9a3d', dll: 600 }, blitz: { name: 'BLITZ', c: '#b388ff', dll: 600 }, sys: { name: 'System', c: '#94a3b8' } };
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ok = (v) => typeof v === 'number' && Number.isFinite(v);
  const n = (v) => (v == null || v === '' || typeof v === 'boolean' ? NaN : +v);
  const arr = (a) => (Array.isArray(a) ? a : []);
  const obj = (o) => (o && typeof o === 'object' && !Array.isArray(o) ? o : null);
  const usd = (v, sign) => { const x = n(v); if (!Number.isFinite(x)) return '—'; const s = '$' + Math.abs(Math.round(x)).toLocaleString('en-US'); return sign ? (x > 0 ? '+' : x < 0 ? '−' : '') + s : (x < 0 ? '−' : '') + s; };
  const cls = (v) => (n(v) > 0 ? 'up' : n(v) < 0 ? 'dn' : '');
  const key = (b) => { const s = String(b || '').toLowerCase(); return /^(blitz|scalp|c$|account_c)/.test(s) ? 'blitz' : /^(atlas|second|b$|ema|macd|sr)/.test(s) ? 'atlas' : /^(lit|zlarior|a$)/.test(s) ? 'lit' : 'sys'; };
  const tag = (b) => { const k = key(b); return `<span class="dk-bot" style="--c:${BOT[k].c}"><i></i>${esc(BOT[k].name)}</span>`; };
  const FMT = {};
  const fmt = (o) => { const k = JSON.stringify(o); return FMT[k] || (FMT[k] = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour12: false, ...o })); };
  function etParts(t) { const p = {}; for (const x of fmt({ year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', weekday: 'short' }).formatToParts(new Date(t * 1000))) p[x.type] = x.value; return { date: `${p.year}-${p.month}-${p.day}`, mod: (+p.hour % 24) * 60 + +p.minute, wd: p.weekday }; }
  function etTime(date, mod) { let g = Date.parse(`${date}T00:00:00Z`) / 1000 + mod * 60 + 5 * 3600; for (let i = 0; i < 2; i++) { const q = etParts(g); g += (Date.parse(`${date}T00:00:00Z`) / 1000 + mod * 60) - (Date.parse(`${q.date}T00:00:00Z`) / 1000 + q.mod * 60); } return g; }
  const addDays = (d, k) => { const x = new Date(`${d}T12:00:00Z`); x.setUTCDate(x.getUTCDate() + k); return x.toISOString().slice(0, 10); };
  const wday = (d) => new Date(`${d}T12:00:00Z`).getUTCDay();
  const hm = (t) => fmt({ hour: '2-digit', minute: '2-digit' }).format(new Date(t * 1000));
  const dlbl = (t) => fmt({ weekday: 'short', month: 'short', day: 'numeric' }).format(new Date(t * 1000));
  function dur(s) { s = Math.max(0, Math.round(s)); const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60); return d ? `${d}d ${h}h` : h ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m`; }
  const st = { get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* private window */ } } };
  const card = (id, title, meta, body, k) => `<section class="dk-card ${k || ''}" id="dk-${id}" data-dk="${id}"><div class="dk-h"><h3>${title}</h3>${meta ? `<span class="dk-meta">${meta}</span>` : ''}</div>${body}</section>`;
  const goA = (o, id, arg) => (o && typeof o.go === 'function' ? o.go(id, arg) : `data-go="${esc(id)}"${arg ? ` data-arg="${esc(arg)}"` : ''}`);

  // ------------------------------------------------------------------ accounts on the board (Zlarior, ATLAS, BLITZ)
  function accounts(M) {
    const B = obj(M.board) || {}, out = [];
    for (const k of ['lit', 'atlas', 'blitz']) {
      let a = obj(B[k]);
      if (!a && k === 'blitz') a = arr(B.accounts).find((x) => x && key(x.id || x.name) === 'blitz') || null;
      if (!a && k === 'blitz' && obj(M.acc) && obj(M.acc.eval)) { const e = M.acc.eval; a = { id: 'blitz', name: 'BLITZ', room: e.room, balance: e.balance, today_pnl: M.acc.day_pnl, dll: 600, position: M.acc.open, to_target: e.to_target, session: e.session, badge: M.acc.kind === 'LIVE' ? 'LIVE' : M.acc.kind }; }
      if (!a) continue;
      const p = obj(a.position);
      let risk = NaN;
      if (p) { risk = n(p.risk_usd); if (!ok(risk) && ok(n(p.entry)) && ok(n(p.stop)) && ok(n(p.qty))) risk = Math.abs(n(p.entry) - n(p.stop)) * 2 * n(p.qty); if (ok(n(p.stop_usd)) && !ok(risk)) risk = Math.abs(n(p.stop_usd)); }
      const dll = ok(n(a.dll)) ? n(a.dll) : BOT[k].dll, used = ok(n(a.dll_used)) ? n(a.dll_used) : Math.max(0, -(n(a.today_pnl) || 0));
      out.push({ k, name: BOT[k].name, c: BOT[k].c, a, pos: p, risk: ok(risk) ? risk : 0, open: !!p, room: n(a.room), dll, used, today: n(a.today_pnl), balance: n(a.balance), to_target: n(a.to_target), session: n(a.session), sessions: n(a.sessions) || 10, badge: a.badge || '' });
    }
    return out;
  }

  // 1. cross-account risk meter
  function risk(M, o) {
    const A = accounts(M);
    if (!A.length) return card('risk', 'Risk meter', 'all accounts', '<p class="dk-mut">No account on the board yet (the PC sends it while the bot runs).</p>');
    const tot = A.reduce((s, x) => s + x.risk, 0), usedAll = A.reduce((s, x) => s + x.used, 0), dllAll = A.reduce((s, x) => s + x.dll, 0);
    const worst = usedAll + tot, frac = dllAll ? Math.min(1, worst / dllAll) : 0;
    const lvl = frac > 0.8 ? 'bad' : frac > 0.5 ? 'warn' : 'good';
    const rows = A.map((x) => {
      const rf = ok(x.room) && x.room > 0 ? Math.min(1, x.risk / x.room) : 0, df = x.dll ? Math.min(1, (x.used + x.risk) / x.dll) : 0;
      return `<li style="--c:${x.c}"><div class="dk-rk-h">${tag(x.k)}<b>${x.open ? usd(x.risk) + ' at risk' : 'flat'}</b><em>${ok(x.room) ? 'room ' + usd(x.room) : ''}</em></div>
        <div class="dk-gauge" title="open risk vs the room to the floor"><i style="width:${(rf * 100).toFixed(1)}%"></i></div>
        <div class="dk-rk-f"><span>${ok(x.room) && x.open ? (rf * 100).toFixed(0) + '% of the room' : 'no open risk'}</span><span>daily loss ${usd(x.used)} + open ${usd(x.risk)} of ${usd(x.dll)}</span></div>
        <div class="dk-gauge sm ${df > 0.8 ? 'bad' : df > 0.5 ? 'warn' : ''}"><i style="width:${(df * 100).toFixed(1)}%"></i></div></li>`;
    }).join('');
    return card('risk', 'Risk meter · all accounts', `${A.length} account${A.length === 1 ? '' : 's'}`,
      `<div class="dk-big ${lvl}"><b>${usd(tot)}</b><span>open risk now${A.filter((x) => x.open).length ? ` on ${A.filter((x) => x.open).map((x) => x.name).join(' + ')}` : ''}</span></div>
      <div class="dk-gauge lg ${lvl}" aria-label="combined daily loss used if every open trade stops out"><i style="width:${(frac * 100).toFixed(1)}%"></i></div>
      <p class="dk-mut">If every open trade stops out now: ${usd(worst)} of the ${usd(dllAll)} combined daily loss (${(frac * 100).toFixed(0)}%). Each account's own limit is below.</p>
      <ul class="dk-rk">${rows}</ul>`);
  }

  // 2. the next 24 hours
  const ATLAS_W = [['EMA', 180, 570, true], ['MACD', 120, 300], ['MACD', 570, 660], ['S/R', 570, 720]];
  const BLITZ_CHECKS = [660, 690, 720, 750, 780, 810, 840, 870, 900, 930];
  function dstNext(now) {
    const y = +etParts(now).date.slice(0, 4);
    const nthSun = (yy, m, k) => { const d = new Date(Date.UTC(yy, m, 1, 12)); const first = (7 - d.getUTCDay()) % 7; return new Date(Date.UTC(yy, m, 1 + first + 7 * (k - 1), 12)).toISOString().slice(0, 10); };
    const cand = [[nthSun(y, 2, 2), 'forward'], [nthSun(y, 10, 1), 'back'], [nthSun(y + 1, 2, 2), 'forward']].map(([d, w]) => ({ day: d, way: w, t: etTime(d, 120) })).filter((x) => x.t > now - 86400);
    return cand.sort((a, b) => a.t - b.t)[0] || null;
  }
  function events24(M) {
    const now = M.now, end = now + 86400, ev = [], cal = obj(M.cal) || {};
    const early = {}; arr(cal.early_close).forEach((e) => { if (e && e.day && e.halt) { const [h, m] = String(e.halt).split(':').map(Number); early[e.day] = h * 60 + (m || 0); } });
    const d0 = etParts(now).date;
    for (let i = -1; i <= 2; i++) {
      const d = addDays(d0, i), w = wday(d), wk = w > 0 && w < 6, ec = early[d];
      if (wk) {
        const zl = ec != null ? Math.min(930, ec - 15) : 930;
        ev.push({ bot: 'lit', a: etTime(d, 120), z: etTime(d, zl), label: `Zlarior entries ${'02:00'}-${zl === 930 ? '15:30' : String(Math.floor(zl / 60)).padStart(2, '0') + ':' + String(zl % 60).padStart(2, '0')} ET` });
        ATLAS_W.forEach(([nm, a, z, noMon]) => { if (noMon && w === 1) return; ev.push({ bot: 'atlas', a: etTime(d, a), z: etTime(d, Math.min(z, ec != null ? ec - 15 : z)), label: `ATLAS ${nm} ${String(Math.floor(a / 60)).padStart(2, '0')}:${String(a % 60).padStart(2, '0')}-${String(Math.floor(z / 60)).padStart(2, '0')}:${String(z % 60).padStart(2, '0')} ET` }); });
        const ck = BLITZ_CHECKS.filter((c) => ec == null || c < ec - 15);
        if (ck.length) ev.push({ bot: 'blitz', a: etTime(d, ck[0]), z: etTime(d, ck[ck.length - 1]), ticks: ck.map((c) => etTime(d, c)), label: `BLITZ checks ${ck.length === 10 ? '11:00, 11:30 … 15:30' : ck.length + ' checks'} ET` });
        ev.push({ bot: 'sys', t: etTime(d, ec != null ? ec - 5 : 955), label: ec != null ? `Early close: flat by ${String(Math.floor((ec - 5) / 60)).padStart(2, '0')}:${String((ec - 5) % 60).padStart(2, '0')} ET (CME halt ${String(Math.floor(ec / 60)).padStart(2, '0')}:${String(ec % 60).padStart(2, '0')})` : 'Every bot flat by 15:55 ET', kind: ec != null ? 'warn' : '' });
        ev.push({ bot: 'sys', t: etTime(d, 1020), label: 'CME daily halt 17:00-18:00 ET' });
      }
      if (w >= 0 && w <= 4) ev.push({ bot: 'sys', t: etTime(d, 1080), label: 'New session opens 18:00 ET' });
    }
    arr(M.news).forEach((x) => { if (x && ok(+x.t)) ev.push({ bot: 'news', t: +x.t, label: x.title || 'news', kind: /high|fomc/i.test(String(x.impact || '')) ? 'bad' : 'warn' }); });
    const ds = dstNext(now);
    if (ds && ds.t > now && ds.t < now + 7 * 86400) ev.push({ bot: 'sys', t: ds.t, label: `US clocks go ${ds.way} 1 hour (DST)`, kind: 'warn', dst: ds });
    return ev.filter((e) => (e.t != null ? e.t >= now - 60 && e.t <= end : e.z >= now && e.a <= end)).sort((x, y) => (x.t != null ? x.t : Math.max(x.a, now)) - (y.t != null ? y.t : Math.max(y.a, now)));
  }
  function next24(M, o, compact) {
    const now = M.now, E = events24(M), W = 86400, P = (t) => Math.max(0, Math.min(100, (t - now) / W * 100));
    const lane = (b, label) => { const L = E.filter((e) => e.bot === b && e.a != null); return `<div class="dk-lane" style="--c:${(BOT[b] || BOT.sys).c}"><span>${esc(label)}</span><div>${L.map((e) => `<i class="seg" style="left:${P(e.a).toFixed(2)}%;width:${Math.max(0.6, P(e.z) - P(e.a)).toFixed(2)}%" title="${esc(e.label)}"></i>${arr(e.ticks).map((t) => t >= now && t <= now + W ? `<i class="tick" style="left:${P(t).toFixed(2)}%"></i>` : '').join('')}`).join('')}</div></div>`; };
    const pts = E.filter((e) => e.t != null);
    const hours = []; for (let h = 0; h <= 24; h += 6) hours.push(`<span style="left:${(h / 24 * 100).toFixed(1)}%">${h ? hm(now + h * 3600) : 'now'}</span>`);
    const track = `<div class="dk-track">${lane('lit', 'Zlarior')}${lane('atlas', 'ATLAS')}${lane('blitz', 'BLITZ')}
      <div class="dk-lane pts"><span>Events</span><div>${pts.map((e) => `<i class="pt ${e.kind || ''}" style="left:${P(e.t).toFixed(2)}%" title="${esc(e.label)}"></i>`).join('')}</div></div><div class="dk-hrs">${hours.join('')}</div></div>`;
    const ds = E.find((e) => e.dst);
    const dstNote = ds ? `<p class="dk-note"><b>Clock change ${esc(dlbl(ds.t))}:</b> US clocks go ${esc(ds.dst.way)} 1 hour at 02:00. Every time here and in the bot is New York time (ET), so the windows stay the same ET times${ds.dst.way === 'back' ? '; until then London is 4 hours ahead of New York (the UK changed on Oct 25)' : ''}.</p>` : '';
    const list = E.slice(0, compact ? 5 : 30).map((e) => { const t = e.t != null ? e.t : e.a; const live = e.a != null && e.a <= now && e.z >= now; return `<li class="${e.kind || ''}" style="--c:${(BOT[e.bot] || { c: e.bot === 'news' ? '#ff5a7a' : '#94a3b8' }).c}"><i></i><b>${live ? 'now' : esc(hm(t))}</b><span>${esc(e.label)}</span><em>${live ? 'until ' + esc(hm(e.z)) : t > now ? 'in ' + esc(dur(t - now)) : ''}</em></li>`; }).join('');
    const closed = !E.some((e) => e.a != null);
    return card('next24', 'Next 24 hours', 'New York time', `${closed ? '<p class="dk-mut">No entry window in the next 24 hours (weekend or holiday).</p>' : track}${dstNote}<ul class="dk-ev">${list || '<li><span>Nothing scheduled.</span></li>'}</ul>${compact ? `<a class="dk-link" ${goA(o, 'deck')}>The whole day plan and more tools</a>` : ''}`);
  }

  // 3. eval odds from today's balance
  function rng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 1e9) / 1e9; }; }
  function gauss(r) { let u = 0, v = 0; while (u === 0) u = r(); while (v === 0) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
  function walk(mu, sd, toGo, room, left, N = 2000) {
    if (!(left > 0) || !ok(mu) || !ok(sd) || sd <= 0) return null;
    const r = rng(Math.round(toGo * 7 + room * 13 + left * 101)); let p = 0, f = 0;
    for (let i = 0; i < N; i++) { let x = 0; for (let s = 0; s < left; s++) { x += mu + sd * gauss(r); if (x >= toGo) { p++; break; } if (x <= -room) { f++; break; } } }
    return { pass: p / N * 100, fail: f / N * 100, open: (N - p - f) / N * 100 };
  }
  function odds(M, o) {
    const A = accounts(M), B = obj(M.board) || {}, cone = obj(B.real) && obj(B.real.cone) ? B.real.cone : null;
    const rows = A.map((x) => {
      const pg = obj(obj(B.progress) && B.progress[x.k]) || {}, R = obj(obj(pg.odds) && pg.odds.rows) || {}, h2 = obj(R.H2), h1 = obj(R.H1);
      const left = ok(n(pg.sessions_left)) ? n(pg.sessions_left) : ok(x.session) ? Math.max(0, x.sessions - x.session + 1) : NaN;
      let est = null, how = '';
      if (x.k === 'lit' && cone && arr(cone.rows).length > 5) {
        const C = arr(cone.cols), last = cone.rows[cone.rows.length - 1], s = +last[0], ix = (k) => C.indexOf(k);
        const mu = last[ix('p50')] / s, sd = (last[ix('p75')] - last[ix('p25')]) / 1.349 / Math.sqrt(s);
        est = walk(mu, sd, x.to_target, x.room, left); how = 'a random walk at the 2026 H2 pace (bootstrap cone), from today\'s balance';
      } else if (ok(n(obj(pg.expected) && (pg.expected.per_session != null ? pg.expected.per_session : pg.expected.per_month)))) {
        const mu = ok(n(pg.expected.per_session)) ? n(pg.expected.per_session) : n(pg.expected.per_month) / 21; est = walk(mu, Math.max(Math.abs(mu) * 4, 150), x.to_target, x.room, left); how = 'a random walk at the backtest\'s $ per session (rough spread)';
      }
      const bz = x.k === 'blitz' && window.BlitzUI ? window.BlitzUI.RESEARCH.find((r) => r.main) : null;
      const startTxt = h2 ? `from the start: pass ${h2.p10}% / fail ${h2.f10}% in 2 weeks (${esc(h2.label || 'H2')})` : bz ? `from the start: pass ${bz.p2}% / fail ${bz.f2}% in 2 weeks (2026 H2)` : '';
      return `<li style="--c:${x.c}"><div class="dk-od-h">${tag(x.k)}<span>${ok(x.to_target) ? usd(x.to_target) + ' to go' : ''}${ok(x.room) ? ' · room ' + usd(x.room) : ''}${ok(left) ? ' · ' + left + ' session' + (left === 1 ? '' : 's') + ' left' : ''}</span></div>
        ${est ? `<div class="dk-odbar" aria-label="pass ${est.pass.toFixed(0)}%, fail ${est.fail.toFixed(0)}%"><i class="p" style="width:${est.pass.toFixed(1)}%"></i><i class="o" style="width:${est.open.toFixed(1)}%"></i><i class="f" style="width:${est.fail.toFixed(1)}%"></i></div>
          <div class="dk-od-l"><b class="up">pass ${est.pass.toFixed(0)}%</b><span>undecided ${est.open.toFixed(0)}%</span><b class="dn">fail ${est.fail.toFixed(0)}%</b></div><p class="dk-mut">Estimate: ${esc(how)}. Not a promise.</p>`
          : `<p class="dk-mut">${ok(left) && left <= 0 ? 'The 2-week window is used up: what is left is the 3-week limit.' : 'Not enough data for an estimate from today\'s balance.'}</p>`}
        ${startTxt ? `<p class="dk-mut">Research ${startTxt}.</p>` : ''}</li>`;
    }).join('');
    return card('odds', 'Eval odds from today\'s balance', 'within the sessions left', rows ? `<ul class="dk-od">${rows}</ul>` : '<p class="dk-mut">No eval on the board yet.</p>');
  }

  // 4. real P&L calendar per bot (real fills only)
  function realDays(M) {
    const B = obj(M.board) || {}, out = { lit: {}, atlas: {}, blitz: {} };
    arr(obj(B.real) && B.real.trades).forEach((t) => { if (!t || t.open) return; const k = key(t.acct || t.key); if (!out[k] || !t.day) return; out[k][t.day] = (out[k][t.day] || 0) + (n(t.usd) || 0); });
    if (obj(M.acc) && M.acc.kind === 'LIVE' && !Object.keys(out.blitz).length) arr(M.acc.closed).forEach((t) => { if (t && t.day) out.blitz[t.day] = (out.blitz[t.day] || 0) + (n(t.usd) || 0); });
    return out;
  }
  function cal(M, o) {
    const D = realDays(M), today = etParts(M.now).date;
    let start = addDays(today, -41); while (wday(start) !== 1) start = addDays(start, -1);
    const grid = (k) => {
      const days = D[k], vals = Object.values(days), mx = Math.max(100, ...vals.map((v) => Math.abs(v)));
      const weeks = []; for (let d = start; d <= today; d = addDays(d, 7)) weeks.push(d);
      const cells = weeks.map((w) => `<div class="dk-wk">${[0, 1, 2, 3, 4].map((i) => { const d = addDays(w, i), v = days[d]; const a = v == null ? 0 : Math.min(1, Math.abs(v) / mx); return `<i class="${v == null ? '' : v >= 0 ? 'g' : 'r'}${d > today ? ' f' : ''}${d === today ? ' t' : ''}" style="--a:${(0.18 + a * 0.82).toFixed(2)}" title="${esc(d)}${v != null ? ' ' + usd(v, true) : ''}"></i>`; }).join('')}</div>`).join('');
      const g = vals.filter((v) => v > 0).length, r = vals.filter((v) => v < 0).length, tot = vals.reduce((s, v) => s + v, 0);
      return `<div class="dk-cal" style="--c:${BOT[k].c}"><div class="dk-cal-h">${tag(k)}<span>${vals.length ? `${g} green · ${r} red · <b class="${cls(tot)}">${usd(tot, true)}</b>` : 'no real trade yet'}</span></div><div class="dk-cal-g"><div class="dk-wd"><i>M</i><i>T</i><i>W</i><i>T</i><i>F</i></div>${cells}</div></div>`;
    };
    return card('cal', 'Real P&L calendar', 'real fills only · last 6 weeks', `<div class="dk-cals">${grid('lit')}${grid('atlas')}${grid('blitz')}</div><p class="dk-mut">Each square is one trading day; brighter = a bigger $ day. Paper and backtest trades are never in here.</p>`);
  }

  // 5. trade journal (trades + Mind reviews + Holodeck links)
  function journal(M, o, max = 20) {
    const B = obj(M.board) || {}, MU = window.MindUI;
    const T = arr(B.trades).filter((t) => t && (t.exit_t || t.day)).slice().sort((a, b) => (n(b.exit_t) || n(b.entry_t) || 0) - (n(a.exit_t) || n(a.entry_t) || 0));
    const R = arr(obj(M.mind) && M.mind.reviews);
    if (!T.length && !R.length) return card('journal', 'Trade journal', '', '<p class="dk-mut">No trade yet. Each closed trade lands here with its review and a 3D replay link.</p>');
    const used = new Set();
    const rows = T.slice(0, max).map((t) => {
      const rv = MU && MU.reviewFor ? MU.reviewFor(M.mind, t) : null; if (rv) used.add(rv);
      return `<li style="--c:${BOT[key(t.acct)].c}"><div class="dk-j-h">${tag(t.acct)}<b>${esc(t.day || '')} ${t.entry_t ? esc(hm(+t.entry_t)) : ''} ${esc(t.side || '')}${t.qty ? ' ' + esc(t.qty) : ''}</b><span class="dk-src ${t.src === 'live' ? 'real' : ''}">${t.src === 'live' ? 'REAL' : esc(String(t.src || 'paper').toUpperCase())}</span>
        <span class="dk-jv ${cls(t.usd)}">${t.open ? 'open' : usd(t.usd, true)}${ok(n(t.r)) ? ` <em>${(n(t.r) > 0 ? '+' : '') + n(t.r).toFixed(2)}R</em>` : ''}</span></div>
        <div class="dk-j-b">${esc(t.exit || '')}${t.member ? ' · ' + esc(t.member) : ''}${rv ? ` · <span class="dk-gr g${esc(String(rv.grade || '?').slice(0, 1).toUpperCase())}">${esc(rv.grade)}</span> ${esc(rv.lesson || arr(rv.wrong)[0] || arr(rv.right)[0] || '')}` : ''}</div>
        ${t.day ? `<a class="dk-3d" ${goA(o, 'holo', t.day)}>Replay in 3D</a>` : ''}</li>`;
    }).join('');
    const extra = R.filter((r) => !used.has(r)).slice(0, 5).map((r) => { const tr = obj(r.trade) || {}; const day = tr.day || (String(r.trade || '').match(/^\d{4}-\d\d-\d\d/) || [])[0] || ''; return `<li style="--c:${BOT[key(r.bot)].c}"><div class="dk-j-h">${tag(r.bot)}<b>${esc(day || 'review')}</b><span class="dk-gr g${esc(String(r.grade || '?').slice(0, 1).toUpperCase())}">${esc(r.grade || '?')}</span></div><div class="dk-j-b">${esc(r.lesson || '')}</div>${day ? `<a class="dk-3d" ${goA(o, 'holo', day)}>Replay in 3D</a>` : ''}</li>`; }).join('');
    return card('journal', 'Trade journal', 'trades, reviews, 3D replays', `<ul class="dk-j">${rows}${extra}</ul>`);
  }

  // 6. notification center (a mute per bot, this device only)
  const MUTE_K = 'le.deck.mute';
  function inboxItems(M) {
    const B = obj(M.board) || {}, out = [];
    arr(B.lines).forEach((l) => l && out.push({ t: n(B.t) || M.now, bot: key(l.acct || (/atlas|blitz|lit/.test(String(l.kind)) ? l.kind : 'sys')), level: l.level === 'bad' ? 'bad' : l.level === 'warn' ? 'warn' : 'good', text: l.text, src: 'board' }));
    arr(obj(B.health) && B.health.items).forEach((h) => { if (h && (h.ok === false || h.warn)) out.push({ t: n(h.t) || n(B.t) || M.now, bot: 'sys', level: h.ok === false ? 'bad' : 'warn', text: `${h.label}: ${h.value || ''}${h.fix ? ' · ' + h.fix : ''}`, src: 'health' }); });
    for (const k of ['lit', 'atlas', 'blitz']) arr(obj(B[k]) && B[k].blocks).forEach((g) => g && out.push({ t: n(B.t) || M.now, bot: k, level: 'warn', text: `${g.label || g.key || 'blocked'}${g.fix ? ': ' + g.fix : ''}`, src: 'guard' }));
    arr(obj(M.mind) && M.mind.alerts).forEach((a) => a && out.push({ t: n(a.t) || M.now, bot: key(a.bot), level: /bad|red|crit|high/.test(String(a.level)) ? 'bad' : /warn|amber|med/.test(String(a.level)) ? 'warn' : 'good', text: a.text, src: 'mind' }));
    if (obj(M.acc) && M.acc.paused) out.push({ t: n(M.acc.paused.t) || M.now, bot: 'blitz', level: 'bad', text: 'BLITZ paused by the performance contract: ' + (M.acc.paused.why || ''), src: 'account C' });
    arr(obj(M.lv) && M.lv.narrator).slice(0, 30).forEach((x) => x && out.push({ t: n(x.t) || M.now, bot: key(x.strat || x.bot), level: x.level === 'bad' || x.important ? 'warn' : 'good', text: x.text || x.title || '', src: 'feed' }));
    return out.filter((x) => x.text).sort((a, b) => b.t - a.t);
  }
  function inbox(M, o) {
    const mute = st.get(MUTE_K, {}), I = inboxItems(M), f = (o && o.filter) || st.get('le.deck.inf', 'all');
    const shown = I.filter((x) => !mute[x.bot] && (f === 'all' || x.level === f));
    const cnt = (b) => I.filter((x) => x.bot === b).length;
    const chips = ['lit', 'atlas', 'blitz', 'sys'].map((b) => `<button type="button" class="dk-mute ${mute[b] ? 'off' : ''}" data-dk-mute="${b}" aria-pressed="${!mute[b]}" style="--c:${BOT[b].c}"><i></i>${esc(BOT[b].name)} <em>${cnt(b)}</em></button>`).join('');
    const fl = [['all', 'All'], ['bad', 'Red'], ['warn', 'Amber']].map(([v, l]) => `<button type="button" data-dk-f="${v}" aria-pressed="${f === v}">${l}</button>`).join('');
    return card('inbox', 'Notification center', `${I.filter((x) => x.level === 'bad').length} red · ${I.filter((x) => x.level === 'warn').length} amber`,
      `<div class="dk-mutes" role="group" aria-label="Mute per bot (this device only)">${chips}</div><div class="dk-fl" role="group" aria-label="Filter">${fl}</div>
      <ul class="dk-in">${shown.slice(0, 40).map((x) => `<li class="${x.level}"><i></i>${tag(x.bot)}<span>${esc(x.text)}</span><em>${esc(hm(x.t))} · ${esc(x.src)}</em></li>`).join('') || '<li class="good"><i></i><span>Nothing here with these filters.</span></li>'}</ul>
      <p class="dk-mut">Mutes only hide lines on this device; phone pushes keep their own settings (More › Notifications).</p>`);
  }

  // 7. since you last looked
  const SEEN_K = 'le.deck.seen';
  function digestData(M) {
    const last = st.get(SEEN_K, null), B = obj(M.board) || {}, mind = obj(M.mind) || {};
    if (!last || !ok(+last.t)) return { first: true, last: null };
    // within one visit (Home opened again less than 30 min later) the digest keeps comparing to the visit before
    const since = M.now - +last.t < 1800 && ok(+last.prev) ? +last.prev : +last.t, T = arr(B.trades);
    const newT = T.filter((t) => t && !t.open && (n(t.exit_t) || 0) > since);
    const opened = T.filter((t) => t && (n(t.entry_t) || 0) > since);
    const al = arr(mind.alerts).filter((a) => a && (n(a.t) || 0) > since);
    const rv = arr(mind.reviews).filter((r) => r && (n(r.t) || 0) > since);
    const pr = arr(mind.proposals).filter((p) => p && (n(p.t) || 0) > since);
    const usdNew = newT.filter((t) => t.src === 'live').reduce((s, t) => s + (n(t.usd) || 0), 0);
    return { first: false, last: since, newT, opened, al, rv, pr, usdNew, n: newT.length + opened.length + al.length + rv.length + pr.length };
  }
  function digest(M, o) {
    const G = digestData(M);
    if (G.first) return card('digest', 'Since you last looked', 'this device', '<p class="dk-mut">First visit on this device: from now on this card lists what changed while you were away (trades, fills, alerts, reviews, ideas).</p>', 'dk-dig');
    const ago = dur(M.now - G.last);
    if (!G.n) return card('digest', 'Since you last looked', `${esc(ago)} ago`, '<p class="dk-mut">Nothing new since then: no trade, fill, alert or review.</p>', 'dk-dig');
    const li = [];
    G.newT.slice(0, 6).forEach((t) => li.push(`<li>${tag(t.acct)}<span>closed ${esc(t.side || '')} ${esc(t.day || '')} · ${esc(t.exit || '')}</span><b class="${cls(t.usd)}">${usd(t.usd, true)}${t.src === 'live' ? '' : ' paper'}</b></li>`));
    G.opened.filter((t) => t.open).slice(0, 3).forEach((t) => li.push(`<li>${tag(t.acct)}<span>opened ${esc(t.side || '')} ${t.qty ? esc(t.qty) + ' MNQ' : ''} at ${esc(t.entry || '')}</span><b>open</b></li>`));
    G.al.slice(0, 4).forEach((a) => li.push(`<li>${tag(a.bot)}<span>${esc(a.text || '')}</span><b class="${/bad|red|high/.test(String(a.level)) ? 'dn' : ''}">alert</b></li>`));
    G.rv.slice(0, 3).forEach((r) => li.push(`<li>${tag(r.bot)}<span>review: ${esc(r.lesson || '')}</span><b class="dk-gr g${esc(String(r.grade || '?').slice(0, 1).toUpperCase())}">${esc(r.grade || '?')}</b></li>`));
    G.pr.slice(0, 3).forEach((p) => li.push(`<li>${tag(p.bot)}<span>new idea: ${esc(p.idea || '')}</span><b>${esc(p.status || 'idea')}</b></li>`));
    return card('digest', 'Since you last looked', `${esc(ago)} ago`, `<div class="dk-dig-n"><b>${G.n}</b><span>new: ${G.newT.length} closed trade${G.newT.length === 1 ? '' : 's'}${G.usdNew ? ' (' + usd(G.usdNew, true) + ' real)' : ''} · ${G.opened.length} opened · ${G.al.length} alert${G.al.length === 1 ? '' : 's'} · ${G.rv.length} review${G.rv.length === 1 ? '' : 's'} · ${G.pr.length} idea${G.pr.length === 1 ? '' : 's'}</span></div><ul class="dk-dl">${li.join('')}</ul>`, 'dk-dig');
  }
  function markSeen(now) {
    now = Math.round(now || Date.now() / 1000);
    const last = st.get(SEEN_K, null);
    if (!last || !ok(+last.t)) return st.set(SEEN_K, { t: now });
    st.set(SEEN_K, now - +last.t > 1800 ? { t: now, prev: +last.t } : { t: now, prev: ok(+last.prev) ? +last.prev : +last.t });
  }

  // 8. Holodeck replay links (Mission Control)
  function replays(M, o, max = 10) {
    const B = obj(M.board) || {}, by = {};
    arr(B.trades).forEach((t) => { if (!t || !t.day) return; const d = by[t.day] = by[t.day] || { day: t.day, bots: new Set(), usd: 0, n: 0, real: 0 }; d.bots.add(key(t.acct)); d.n++; if (t.src === 'live') { d.real++; d.usd += n(t.usd) || 0; } });
    const L = Object.values(by).sort((a, b) => (a.day < b.day ? 1 : -1)).slice(0, max);
    return card('replays', 'Replay a day in the Holodeck', 'every fill in 3D', L.length ? `<ul class="dk-rp">${L.map((d) => `<li><a ${goA(o, 'holo', d.day)}><b>${esc(d.day)}</b><span>${[...d.bots].map((b) => `<i style="--c:${BOT[b].c}"></i>`).join('')} ${d.n} trade${d.n === 1 ? '' : 's'}${d.real ? ` · <em class="${cls(d.usd)}">${usd(d.usd, true)} real</em>` : ''}</span><strong>3D ›</strong></a></li>`).join('')}</ul>` : '<p class="dk-mut">No traded day on the board yet.</p>');
  }

  function page(M, o) {
    const parts = [digest, risk, next24, odds, cal, journal, inbox, replays];
    return `<div class="dk-wrap"><div class="dk-title"><b>Trader's deck</b><span>risk, the next 24 h, eval odds, real calendar, journal, alerts · read-only</span></div>${parts.map((f) => { try { return f(M, o); } catch (e) { return `<section class="dk-card"><p class="dk-mut">${esc(f.name)}: ${esc(e && e.message)}</p></section>`; } }).join('')}</div>`;
  }
  function home(M, o) {
    const out = [];
    for (const f of [digest, risk, (m, oo) => next24(m, oo, true)]) { try { out.push(f(M, o)); } catch (e) { /* a card is optional */ } }
    return `<div class="dk-wrap dk-home">${out.join('')}</div>`;
  }
  // mutes / filters (the only state: localStorage); redraw = the page's own redraw
  function wire(el, redraw) {
    if (!el || el.__dk) return; el.__dk = true;
    el.addEventListener('click', (e) => {
      const m = e.target.closest('[data-dk-mute]'), f = e.target.closest('[data-dk-f]');
      if (m) { const s = st.get(MUTE_K, {}); s[m.dataset.dkMute] = !s[m.dataset.dkMute]; st.set(MUTE_K, s); if (redraw) redraw(); }
      else if (f) { st.set('le.deck.inf', f.dataset.dkF); if (redraw) redraw(); }
    });
  }

  const CSS = `
.dk-wrap{display:flex;flex-direction:column;gap:12px;min-width:0}
.dk-card{--dk-ink:var(--ink,#eef1f8);--dk-mut:var(--muted,#9aa3b8);--dk-line:rgba(150,175,255,.16);position:relative;padding:14px 16px;border-radius:18px;color:var(--dk-ink);min-width:0;overflow:hidden;
  background:linear-gradient(180deg,rgba(14,20,44,.7),rgba(6,8,22,.6)) padding-box,linear-gradient(140deg,rgba(79,155,255,.45),rgba(179,136,255,.22) 50%,rgba(255,154,61,.28)) border-box;border:1px solid transparent;box-shadow:inset 0 1px 0 rgba(255,255,255,.06),0 16px 40px -26px rgba(30,60,180,.6)}
.dk-card *{box-sizing:border-box}.dk-card .up{color:var(--good,#2ee59d)}.dk-card .dn{color:var(--bad,#ff5a7a)}
.dk-title{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;padding:2px}.dk-title b{font:800 16px var(--sans,Inter,sans-serif);letter-spacing:.06em;text-transform:uppercase;color:#cfe0ff}.dk-title span{font-size:12.5px;color:var(--muted,#9aa3b8)}
.dk-h{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:8px;flex-wrap:wrap}.dk-h h3{margin:0;font:700 15px/1.3 var(--sans,Inter,sans-serif)}.dk-meta{font-size:12px;color:var(--dk-mut)}
.dk-mut{margin:6px 0 0;font-size:12.5px;line-height:1.5;color:var(--dk-mut)}
.dk-note{margin:8px 0;padding:10px 12px;border-radius:12px;border:1px solid rgba(255,181,71,.4);background:rgba(255,181,71,.08);font-size:13px;line-height:1.5}
.dk-bot{display:inline-flex;align-items:center;gap:5px;font:700 11.5px var(--sans,Inter,sans-serif);color:var(--c);white-space:nowrap}.dk-bot i{width:7px;height:7px;border-radius:50%;background:var(--c);box-shadow:0 0 8px var(--c)}
.dk-big{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap}.dk-big b{font:800 34px/1.05 var(--sans,Inter,sans-serif);font-variant-numeric:tabular-nums}.dk-big span{font-size:13px;color:var(--dk-mut)}
.dk-gauge{height:8px;border-radius:99px;background:rgba(148,163,184,.16);overflow:hidden;margin:6px 0}.dk-gauge i{display:block;height:100%;border-radius:99px;background:var(--c,#7dd3fc)}
.dk-gauge.lg{height:12px}.dk-gauge.sm{height:5px}.dk-gauge.good i{background:var(--good,#2ee59d)}.dk-gauge.warn i{background:var(--warn,#ffb547)}.dk-gauge.bad i{background:var(--bad,#ff5a7a)}
.dk-rk,.dk-ev,.dk-od,.dk-j,.dk-in,.dk-dl,.dk-rp{list-style:none;margin:0;padding:0}
.dk-rk li{padding:10px 0;border-top:1px solid var(--dk-line)}.dk-rk-h{display:flex;gap:8px;align-items:baseline;flex-wrap:wrap}.dk-rk-h b{font-variant-numeric:tabular-nums}.dk-rk-h em{margin-left:auto;font-style:normal;font-size:12px;color:var(--dk-mut)}
.dk-rk-f{display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;font-size:11.5px;color:var(--dk-mut)}
.dk-track{position:relative;margin:4px 0 8px}.dk-lane{display:grid;grid-template-columns:64px 1fr;gap:8px;align-items:center;min-height:22px}.dk-lane>span{font:650 11px var(--sans,Inter,sans-serif);color:var(--c,var(--dk-mut))}
.dk-lane>div{position:relative;height:12px;border-radius:99px;background:rgba(148,163,184,.10)}.dk-lane .seg{position:absolute;top:0;height:100%;border-radius:99px;background:color-mix(in srgb,var(--c) 70%,transparent);box-shadow:0 0 10px -2px var(--c)}
.dk-lane .tick{position:absolute;top:-2px;width:2px;height:16px;background:#fff;opacity:.8;margin-left:-1px}.dk-lane.pts .pt{position:absolute;top:1px;width:10px;height:10px;margin-left:-5px;border-radius:50%;background:#94a3b8}.dk-lane .pt.bad{background:var(--bad,#ff5a7a)}.dk-lane .pt.warn{background:var(--warn,#ffb547)}
.dk-hrs{position:relative;height:16px;margin-left:72px}.dk-hrs span{position:absolute;transform:translateX(-50%);font-size:10.5px;color:var(--dk-mut);white-space:nowrap}.dk-hrs span:first-child{transform:none}.dk-hrs span:last-child{transform:translateX(-100%)}
.dk-ev li{display:grid;grid-template-columns:10px 48px 1fr auto;gap:8px;align-items:baseline;padding:8px 0;border-top:1px solid var(--dk-line);font-size:13px}.dk-ev li>i{width:8px;height:8px;border-radius:50%;background:var(--c);align-self:center}
.dk-ev li b{font-variant-numeric:tabular-nums}.dk-ev li span{min-width:0;overflow-wrap:anywhere}.dk-ev li em{font-style:normal;font-size:11.5px;color:var(--dk-mut);white-space:nowrap}.dk-ev li.bad span{color:var(--bad,#ff5a7a)}.dk-ev li.warn span{color:var(--warn,#ffb547)}
.dk-od li{padding:10px 0;border-top:1px solid var(--dk-line)}.dk-od li:first-child{border-top:0}.dk-od-h{display:flex;gap:8px;align-items:baseline;flex-wrap:wrap;font-size:12.5px;color:var(--dk-mut)}
.dk-odbar{display:flex;height:12px;border-radius:99px;overflow:hidden;margin:8px 0 4px;background:rgba(148,163,184,.14)}.dk-odbar i.p{background:var(--good,#2ee59d)}.dk-odbar i.o{background:rgba(148,163,184,.35)}.dk-odbar i.f{background:var(--bad,#ff5a7a)}
.dk-od-l{display:flex;justify-content:space-between;gap:8px;font-size:12.5px}.dk-od-l span{color:var(--dk-mut)}
.dk-cals{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px}.dk-cal-h{display:flex;justify-content:space-between;gap:8px;align-items:baseline;flex-wrap:wrap;font-size:12px;color:var(--dk-mut);margin-bottom:6px}
.dk-cal-g{display:flex;gap:3px}.dk-wd,.dk-wk{display:flex;flex-direction:column;gap:3px}.dk-wd i{font-style:normal;font-size:9px;color:var(--dk-mut);height:16px;line-height:16px}
.dk-wk i{width:16px;height:16px;border-radius:4px;background:rgba(148,163,184,.12)}.dk-wk i.g{background:color-mix(in srgb,var(--good,#2ee59d) calc(var(--a) * 100%),transparent)}.dk-wk i.r{background:color-mix(in srgb,var(--bad,#ff5a7a) calc(var(--a) * 100%),transparent)}.dk-wk i.f{opacity:.3}.dk-wk i.t{outline:1.5px solid var(--c);outline-offset:1px}
.dk-j li{padding:10px 0;border-top:1px solid var(--dk-line)}.dk-j li:first-child{border-top:0}.dk-j-h{display:flex;gap:8px;align-items:baseline;flex-wrap:wrap;font-size:13px}.dk-j-h b{font-size:13px}
.dk-jv{margin-left:auto;font:700 14px var(--sans,Inter,sans-serif);font-variant-numeric:tabular-nums}.dk-jv em{font-style:normal;font-size:11px;color:var(--dk-mut);font-weight:500}
.dk-src{font:750 9.5px/1 var(--sans,Inter,sans-serif);letter-spacing:.08em;padding:3px 6px;border-radius:6px;background:rgba(179,136,255,.16);color:#d9c4ff}.dk-src.real{background:rgba(46,229,157,.16);color:var(--good,#2ee59d)}
.dk-j-b{margin-top:4px;font-size:12.5px;color:var(--dk-mut);line-height:1.45;overflow-wrap:anywhere}
.dk-gr{display:inline-grid;place-items:center;min-width:22px;height:20px;padding:0 4px;border-radius:6px;font:800 11px var(--sans,Inter,sans-serif);color:#0b1020;background:#94a3b8}.dk-gr.gA{background:#2ee59d}.dk-gr.gB{background:#7dd3fc}.dk-gr.gC{background:#ffd166}.dk-gr.gD{background:#ff9a3d}.dk-gr.gE,.dk-gr.gF{background:#ff5a7a}
.dk-3d,.dk-link{display:inline-flex;align-items:center;min-height:44px;margin-top:6px;padding:0 12px;border-radius:12px;border:1px solid rgba(125,211,252,.35);color:#bfe9ff;font:650 12.5px var(--sans,Inter,sans-serif);text-decoration:none;cursor:pointer;background:rgba(125,211,252,.08)}
.dk-mutes,.dk-fl{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px}
.dk-mute,.dk-fl button{display:inline-flex;align-items:center;gap:6px;min-height:44px;padding:0 12px;border-radius:12px;border:1px solid var(--dk-line);background:rgba(148,163,184,.08);color:var(--dk-ink);font:650 12.5px var(--sans,Inter,sans-serif);cursor:pointer}
.dk-mute i{width:8px;height:8px;border-radius:50%;background:var(--c)}.dk-mute em{font-style:normal;color:var(--dk-mut)}.dk-mute.off{opacity:.45;text-decoration:line-through}.dk-fl button[aria-pressed="true"]{border-color:rgba(125,211,252,.6);background:rgba(125,211,252,.14)}
.dk-in li{display:grid;grid-template-columns:10px auto 1fr;gap:4px 8px;align-items:baseline;padding:8px 0;border-top:1px solid var(--dk-line);font-size:13px}.dk-in li:first-child{border-top:0}.dk-in li>i{width:8px;height:8px;border-radius:50%;background:var(--good,#2ee59d);align-self:center}
.dk-in li.bad>i{background:var(--bad,#ff5a7a);box-shadow:0 0 8px var(--bad,#ff5a7a)}.dk-in li.warn>i{background:var(--warn,#ffb547)}.dk-in li span{min-width:0;overflow-wrap:anywhere}.dk-in li em{grid-column:3;font-style:normal;font-size:11px;color:var(--dk-mut)}
.dk-dig{background:linear-gradient(180deg,rgba(14,26,48,.74),rgba(6,10,22,.62)) padding-box,linear-gradient(140deg,rgba(46,229,157,.5),rgba(79,155,255,.25)) border-box}
.dk-dig-n{display:flex;gap:10px;align-items:baseline;flex-wrap:wrap}.dk-dig-n b{font:800 30px/1 var(--sans,Inter,sans-serif)}.dk-dig-n span{font-size:12.5px;color:var(--dk-mut)}
.dk-dl li{display:grid;grid-template-columns:auto 1fr auto;gap:8px;align-items:baseline;padding:8px 0;border-top:1px solid var(--dk-line);font-size:13px}.dk-dl li span{min-width:0;overflow-wrap:anywhere}
.dk-rp li a{display:grid;grid-template-columns:auto 1fr auto;gap:10px;align-items:center;min-height:48px;padding:6px 0;border-top:1px solid var(--dk-line);color:inherit;text-decoration:none;cursor:pointer}.dk-rp li:first-child a{border-top:0}
.dk-rp li span{font-size:12.5px;color:var(--dk-mut);display:flex;align-items:center;gap:4px;flex-wrap:wrap}.dk-rp li span i{width:8px;height:8px;border-radius:50%;background:var(--c);box-shadow:0 0 6px var(--c)}.dk-rp li span em{font-style:normal}.dk-rp strong{color:#bfe9ff;font-size:12.5px}
@media (min-width:1100px){.dk-wrap:not(.dk-home){display:grid;grid-template-columns:repeat(2,minmax(0,1fr));align-items:start}.dk-wrap>.dk-title{grid-column:1/-1}}
:root[data-theme="light"] .dk-card{--dk-ink:#101828;--dk-mut:#526079;--dk-line:rgba(37,99,235,.16);background:linear-gradient(180deg,rgba(255,255,255,.92),rgba(240,247,255,.88)) padding-box,linear-gradient(140deg,rgba(37,99,235,.35),rgba(124,77,255,.2)) border-box}
:root[data-theme="light"] .dk-title b,:root[data-theme="light"] .dk-3d,:root[data-theme="light"] .dk-link,:root[data-theme="light"] .dk-rp strong{color:#1d4ed8}
:root[data-theme="light"] .dk-src{color:#5b2fd6;background:rgba(124,77,255,.12)}:root[data-theme="light"] .dk-lane .tick{background:#1b1530}
:root[data-theme="light"] .dk-dig{background:linear-gradient(180deg,rgba(255,255,255,.94),rgba(236,253,245,.9)) padding-box,linear-gradient(140deg,rgba(16,185,129,.45),rgba(37,99,235,.2)) border-box}
`;
  function css() { if (typeof document === 'undefined' || !document.head || document.getElementById('deck-css')) return; const s = document.createElement('style'); s.id = 'deck-css'; s.textContent = CSS; document.head.appendChild(s); }
  css();
  window.DeckUI = { version: V, accounts, risk, next24, events24, odds, cal, journal, inbox, inboxItems, digest, digestData, markSeen, replays, page, home, wire, css, dstNext };
})();

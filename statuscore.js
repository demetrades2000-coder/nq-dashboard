// Status, Sunday open, today in one line, account cards (2026-10-30 night, owner: "more very useful features ... organized,
// clean ... I wanna be shocked"; read-only). One renderer for both dashboards: tools/web_public/statuscore.js =
// web_next/js/next/statuscore.js (byte-identical, classic script -> window.StatusUI). It reads only what the pages already
// load and leans on MissionUI (missioncore.js) for the accounts, so every number means the same thing everywhere:
//   M = { now, where: 'phone' | 'pc', board, lv, news, cloud, blitz: BlitzUI.line(...) or null, alerts: [{ lvl, text }] }
//   items(M)    the "is everything OK right now?" list: PC bot, NinjaTrader, feed, Zlarior, ATLAS, BLITZ, next window, alerts
//   bar(M, o)   the one status bar (a dot + one sentence + chips; a tap opens every line with its fix)
//   sunday(M)   the "Sunday open" readiness card (Fri 00:00 -> Sun 20:00 ET; from Thu 18:00 on a clock-change weekend)
//   oneLine(A, M)  each bot's day in one line ({ text, lvl })
//   accounts(M, o) the three account cards: eval progress ring, $ to the target, room, today's real $, a sparkline
//   empty(kind, M) smart empty states: what will show here, and when
//   wire(root)  taps (the status bar folds) and the countdowns
// Paper only: it never arms, routes or changes the bot, and never calls the network (the pages pass the data in).
(function () {
  'use strict';
  const V = 1, ET = 'America/New_York';
  const okN = (v) => typeof v === 'number' && Number.isFinite(v);
  const num = (v) => (v == null || v === '' ? null : okN(+v) ? +v : null);
  const arr = (x) => (Array.isArray(x) ? x : []);
  const obj = (x) => (x && typeof x === 'object' && !Array.isArray(x) ? x : {});
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = (v) => (okN(v) ? (v < 0 ? '−' : '') + '$' + Math.abs(Math.round(v)).toLocaleString('en-US') : '—');
  const smoney = (v) => (okN(v) ? (v > 0 ? '+' : v < 0 ? '−' : '') + '$' + Math.abs(Math.round(v)).toLocaleString('en-US') : '—');
  const nowS = () => Date.now() / 1000;
  const COLOR = { lit: '#4f9bff', atlas: '#ff9a3d', blitz: '#b388ff' };
  const NAME = { lit: 'Zlarior', atlas: 'ATLAS', blitz: 'BLITZ' };
  const PAGE = { phone: { lit: 'lit', atlas: 'atlas', blitz: 'blitz' }, pc: { lit: 'zlarior', atlas: 'atlas', blitz: 'blitz' } };
  const RANK = { bad: 3, warn: 2, good: 1, idle: 0 };
  const FMT = new Intl.DateTimeFormat('en-US', { timeZone: ET, weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false, year: 'numeric' });
  function et(t) {
    const p = {}; for (const x of FMT.formatToParts(new Date(t * 1000))) p[x.type] = x.value;
    const h = +p.hour % 24, m = +p.minute;
    return { wd: p.weekday, mo: p.month, d: +p.day, y: +p.year, h, m, min: h * 60 + m, hm: String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') };
  }
  function dur(s) {
    s = Math.max(0, Math.round(s));
    const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
    return d ? `${d}d ${h}h` : h ? `${h}h ${String(m).padStart(2, '0')}m` : m ? `${m} min` : `${s} s`;
  }
  const when = (t, now) => { const a = et(t), b = et(now); return (a.wd === b.wd && t - now < 86400 ? '' : a.wd + ' ') + a.hm + ' ET'; };
  const cd = (t) => (okN(t) ? `<span class="su-cd" data-su-cd="${Math.round(t)}">${dur(t - nowS())}</span>` : '');
  // CME NQ: Sunday 18:00 to Friday 17:00 ET, a halt 17:00-18:00 every evening
  function marketOpen(now) { const p = et(now); if (p.wd === 'Sat') return false; if (p.wd === 'Sun') return p.min >= 1080; if (p.wd === 'Fri') return p.min < 1020; return p.min < 1020 || p.min >= 1080; }
  function nextReopen(now) {
    for (let i = 1; i < 9 * 96; i++) { const t = Math.floor(now / 900) * 900 + 900 * i, p = et(t); if (p.min === 1080 && p.wd === 'Sun') return t; }
    return null;
  }
  // the next clock change (US: 2nd Sunday of March forward, 1st Sunday of November back, at 02:00 local)
  function dstNext(now) {
    const y = et(now).y;
    // 02:00 local: 07:00 UTC in March (from EST), 06:00 UTC in November (from EDT)
    const nthSun = (yy, m, k, hUtc) => { const d = new Date(Date.UTC(yy, m, 1, 12)); const first = (7 - d.getUTCDay()) % 7; return Date.UTC(yy, m, 1 + first + 7 * (k - 1), hUtc) / 1000; };
    const c = [[nthSun(y, 2, 2, 7), 'forward'], [nthSun(y, 10, 1, 6), 'back'], [nthSun(y + 1, 2, 2, 7), 'forward']].map(([t, w]) => ({ t, way: w })).filter((x) => x.t > now - 86400);
    return c.sort((a, b) => a.t - b.t)[0] || null;
  }

  // ------------------------------------------------------------------ the model
  function accts(M) {
    const MU = window.MissionUI;
    let A = [];
    try { A = MU && MU.accounts ? MU.accounts(M) : []; } catch (e) { A = []; }
    const out = {};
    for (const a of A) if (a && COLOR[a.key] && !out[a.key]) out[a.key] = a;
    return out;
  }
  function healthOf(M) { const I = {}; for (const it of arr(obj(obj(M.board).health).items)) if (it && it.key) I[it.key] = it; return I; }
  const lvH = (it) => (!it ? 'idle' : it.ok === false ? 'bad' : it.warn ? 'warn' : it.ok ? 'good' : 'idle');

  // each bot's day in one line
  function oneLine(A, M) {
    const now = num(M && M.now) || nowS();
    if (!A) return { text: 'No data yet', lvl: 'idle' };
    if (A.key === 'blitz' && A.placeholder) {
      const b = obj(M && M.blitz);
      return { text: b.text ? `Paper only · ${String(b.text).replace(/\s+/g, ' ').slice(0, 90)}` : 'Paper only · off until its own 25K is bought and armed', lvl: 'idle' };
    }
    if (A.pos) {
      const u = okN(A.pos.unreal) ? ` · ${smoney(A.pos.unreal)} open` : '';
      return { text: `In a ${A.pos.side} · ${A.pos.qty || ''} MNQ at ${A.pos.entry != null ? A.pos.entry.toLocaleString('en-US', { maximumFractionDigits: 2 }) : '—'}${u}`, lvl: 'good', live: true };
    }
    if (/passed/.test(A.status)) return { text: 'Eval passed · no new trades on it', lvl: 'good' };
    if (/failed|lost/.test(A.status)) return { text: 'Eval ended · waiting for a new account', lvl: 'bad' };
    if (A.blocks && A.blocks.length) return { text: `Blocked · ${A.blocks[0].text}`, lvl: 'bad' };
    const t = okN(A.today) && A.tradesToday ? ` · ${smoney(A.today)} today` : '';
    if (A.doneToday) return { text: `Done for today${t || ' · no trade'} · back at the next session`, lvl: 'good' };
    if (A.armed) return { text: `Armed · a setup is forming${t}`, lvl: 'good', live: true };
    if (A.win && A.win.open && okN(+A.win.close_t)) return { text: `Window open · watching until ${when(+A.win.close_t, now)}${t}`, lvl: 'good', live: true, t: +A.win.close_t };
    if (A.win && okN(+A.win.open_t) && +A.win.open_t > now) return { text: `${A.tradesToday ? `${A.tradesToday} trade${A.tradesToday === 1 ? '' : 's'}${t} · ` : ''}Next window ${when(+A.win.open_t, now)}`, lvl: 'idle', t: +A.win.open_t };
    return { text: (A.waiting || 'Watching').replace(/\s+/g, ' ').slice(0, 110), lvl: 'idle' };
  }

  // "is everything OK right now?"
  function items(M) {
    M = obj(M);
    const now = num(M.now) || nowS(), B = obj(M.board), I = healthOf(M), As = accts(M), open = marketOpen(now), out = [];
    const hb = num(B.data_t) != null ? now - B.data_t : null;
    // the next entry window of any bot (or the open one closing)
    let nx = null;
    for (const A of Object.values(As)) {
      if (!A || A.placeholder || !A.win) continue;
      if (A.win.open && okN(+A.win.close_t)) { if (!nx || nx.open !== true) nx = { t: +A.win.close_t, open: true, who: A.name }; }
      else if (okN(+A.win.open_t) && +A.win.open_t > now && (!nx || (!nx.open && +A.win.open_t < nx.t))) nx = { t: +A.win.open_t, open: false, who: A.name };
    }
    const soon = nx && !nx.open ? nx.t - now : null;                 // seconds to the next window
    // PC bot: stopped = red; quiet = red while a window is open or opens within 30 min, amber otherwise
    if (B.running === false) out.push({ k: 'pc', label: 'PC bot', value: 'stopped', lvl: 'bad', detail: 'The PC server is up but the bot is stopped.', fix: 'On the Surface: Start page → Start trading.' });
    else if (hb == null) out.push({ k: 'pc', label: 'PC bot', value: 'no report', lvl: 'warn', detail: 'No check-in from the PC yet.', fix: 'Turn the Surface on (the bot starts by itself).' });
    else if (hb < 15 * 60) out.push({ k: 'pc', label: 'PC bot', value: hb < 120 ? 'live' : dur(hb) + ' ago', lvl: 'good', detail: `Last check-in ${dur(hb)} ago.` });
    else {
      const need = (nx && nx.open) || (soon != null && soon < 1800);
      // the weekend (Fri 17:00 -> 2 h before the Sunday reopen): a PC that is off is fine, it only needs to be on by Sunday
      const re = nextReopen(now), weekend = !open && re != null && re - now > 7200 && re - now < 3 * 86400;
      if (weekend) out.push({ k: 'pc', label: 'PC bot', value: 'off for the weekend', lvl: 'idle', detail: `No check-in for ${dur(hb)}: fine while the market is closed. Turn the Surface on by ${when(re - 1800, now)}.` });
      else out.push({ k: 'pc', label: 'PC bot', value: `quiet ${dur(hb)}`, lvl: need ? 'bad' : 'warn', detail: `No check-in for ${dur(hb)}.${!need && nx ? ` Fine until ${when(nx.t - 900, now)}.` : ''}`, fix: 'Check the Surface is on, awake and online, with the bot window open.' });
    }
    if (I.nt) out.push({ k: 'nt', label: 'NinjaTrader', value: I.nt.value || '—', lvl: lvH(I.nt), detail: I.nt.detail || '', fix: I.nt.fix || '' });
    const feed = I.age_1m_s || I.age_5m_s;
    if (!open) out.push({ k: 'feed', label: 'Feed', value: 'market closed', lvl: 'idle', detail: `CME reopens ${when(nextReopen(now) || now, now)}.` });
    else if (feed) out.push({ k: 'feed', label: 'Feed', value: feed.value || '—', lvl: lvH(feed), detail: feed.detail || '', fix: feed.fix || '' });
    for (const k of ['lit', 'atlas', 'blitz']) {
      const A = As[k]; if (!A) continue;
      const L = oneLine(A, M);
      const st = A.placeholder ? 'paper' : A.state === 'trade' ? 'in a trade' : A.armed ? 'armed' : A.state === 'off' ? 'off' : (A.win && A.win.open ? 'watching' : 'waiting');
      out.push({ k, label: NAME[k], value: st, lvl: L.lvl === 'bad' ? 'bad' : A.placeholder ? 'idle' : L.lvl === 'good' ? 'good' : 'idle', detail: L.text, bot: k, live: !!L.live });
    }
    if (nx) out.push({ k: 'next', label: nx.open ? 'Window' : 'Next window', value: nx.open ? `closes in ${dur(nx.t - now)}` : `in ${dur(nx.t - now)}`, lvl: nx.open ? 'good' : 'idle', detail: `${nx.who}: ${nx.open ? 'closes' : 'opens'} ${when(nx.t, now)}.`, t: nx.t });
    const AL = arr(M.alerts).filter((a) => a && (a.lvl === 'bad' || a.lvl === 'warn'));
    let MA = [];
    try { MA = window.MissionUI && window.MissionUI.alertsList ? window.MissionUI.alertsList(M, Object.values(As)) : []; } catch (e) { MA = []; }
    const seen = new Set(out.map((x) => x.k === 'pc' ? 'heartbeat' : x.k));
    const extra = AL.concat(MA.filter((a) => (a.lvl === 'bad' || a.lvl === 'warn') && !/^(Heartbeat|NinjaTrader|Feed)/i.test(a.text || '')));
    const uniq = []; const tx = new Set();
    for (const a of extra) { const t = String(a.text || ''); if (!t || tx.has(t)) continue; tx.add(t); uniq.push(a); }
    if (uniq.length) out.push({ k: 'alerts', label: 'Alerts', value: String(uniq.length), lvl: uniq.some((a) => a.lvl === 'bad') ? 'bad' : 'warn', detail: uniq.slice(0, 4).map((a) => a.text).join(' · '), list: uniq.slice(0, 8) });
    else out.push({ k: 'alerts', label: 'Alerts', value: 'none', lvl: 'good', detail: 'Nothing needs you right now.' });
    void seen;
    return out;
  }
  function summary(M) {
    const L = items(M), bad = L.filter((x) => x.lvl === 'bad'), warn = L.filter((x) => x.lvl === 'warn');
    const lvl = bad.length ? 'bad' : warn.length ? 'warn' : 'good';
    const nx = L.find((x) => x.k === 'next');
    const pcOk = (L.find((x) => x.k === 'pc') || {}).lvl === 'good';
    const title = bad.length ? `${bad.length} thing${bad.length === 1 ? '' : 's'} need${bad.length === 1 ? 's' : ''} you` : warn.length ? `${pcOk ? 'All running · ' : ''}${warn.length} thing${warn.length === 1 ? '' : 's'} to watch` : 'All good';
    const top = bad[0] || warn[0];
    const why = !top ? (nx ? nx.detail : 'Every light is green.') : top.k === 'alerts' && top.list && top.list[0] ? String(top.list[0].text).slice(0, 90) : `${top.label}: ${top.value}`;
    return { lvl, title, why, items: L, next: nx || null };
  }

  // ------------------------------------------------------------------ small parts
  const dot = (lvl, live) => `<i class="su-dot ${esc(lvl)}${live ? ' live' : ''}"></i>`;
  // a sparkline of the last days' real P&L, cumulative (an area under the line, the last point glows)
  function spark(vals, color, w = 96, h = 28) {
    const v = arr(vals).map(num).filter(okN);
    if (v.length < 3) return '';          // a line needs a few days to mean something
    const c = []; let s = 0; for (const x of v) { s += x; c.push(s); }
    const lo = Math.min(0, ...c), hi = Math.max(0, ...c), span = hi - lo || 1;
    const X = (i) => (i / (c.length - 1)) * (w - 4) + 2, Y = (y) => h - 3 - ((y - lo) / span) * (h - 6);
    const pts = c.map((y, i) => `${X(i).toFixed(1)},${Y(y).toFixed(1)}`).join(' ');
    const z = Y(0).toFixed(1), id = 'sg' + Math.random().toString(36).slice(2, 7), last = c[c.length - 1];
    return `<svg class="su-spark" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" aria-hidden="true"><defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${esc(color)}" stop-opacity=".38"/><stop offset="1" stop-color="${esc(color)}" stop-opacity="0"/></linearGradient></defs>
      <line x1="2" x2="${w - 2}" y1="${z}" y2="${z}" class="z"/><polygon points="2,${z} ${pts} ${(w - 2).toFixed(1)},${z}" fill="url(#${id})"/><polyline points="${pts}" fill="none" stroke="${esc(color)}" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round" class="ln"/>
      <circle cx="${X(c.length - 1).toFixed(1)}" cy="${Y(last).toFixed(1)}" r="2.4" fill="${esc(color)}" class="pt"/></svg>`;
  }
  const goA = (o, id, arg) => (o && typeof o.go === 'function' ? o.go(id, arg) : `data-go="${esc(id)}"${arg ? ` data-arg="${esc(arg)}"` : ''}`);

  // ------------------------------------------------------------------ the status bar
  function ackRow(S, o) {
    const A = S.items.find((x) => x.k === 'alerts'), a = A && A.list ? A.list.find((x) => x && x.go) : null;
    return a ? `<a class="su-ack" ${goA(o, a.go, a.arg)}><i class="su-dot bad live"></i><span><b>${esc(a.text)}</b><em>Tap to see it and acknowledge (Got it)</em></span><span class="su-ack-go" aria-hidden="true">›</span></a>` : '';
  }
  function bar(M, o) {
    o = o || {}; M = obj(M);
    const S = summary(M), open = !!o.open, ack = ackRow(S, o);
    // the alert to acknowledge has its own row: the headline's second line says the next thing instead of repeating it
    let why = S.why;
    if (ack) {
      const other = S.items.find((x) => (x.lvl === 'bad' || x.lvl === 'warn') && x.k !== 'alerts');
      why = other ? `${other.label}: ${other.value}` : S.next ? S.next.detail : 'Everything else is fine.';
    }
    const chips = S.items.map((x) => `<span class="su-chip ${x.lvl}" title="${esc(x.detail || '')}">${dot(x.lvl, x.live)}<span>${esc(x.label)}</span><b>${x.k === 'next' && x.t ? (x.value.startsWith('closes') ? 'closes in ' : 'in ') + cd(x.t) : esc(x.value)}</b></span>`).join('');
    const rows = S.items.map((x) => `<li class="${x.lvl}">${dot(x.lvl, x.live)}<div><b>${esc(x.label)} · ${esc(x.value)}</b>${x.detail ? `<span>${esc(x.detail)}</span>` : ''}${x.fix && x.lvl !== 'good' ? `<em>Fix: ${esc(x.fix)}</em>` : ''}${x.list ? `<ul>${x.list.map((a) => `<li class="${esc(a.lvl)}">${esc(a.text)}</li>`).join('')}</ul>` : ''}</div>${x.bot ? `<a class="su-go" ${goA(o, PAGE[o.where === 'pc' ? 'pc' : 'phone'][x.bot])} aria-label="Open ${esc(x.label)}">›</a>` : ''}</li>`).join('');
    return `<section class="su-bar ${S.lvl}${open ? ' open' : ''}" aria-label="Status: ${esc(S.title)}" data-su-bar>
      <button type="button" class="su-sum" aria-expanded="${open}" data-su-toggle>${dot(S.lvl, S.lvl === 'good')}<span class="su-t"><b>${esc(S.title)}</b><em>${esc(why)}</em></span><span class="su-chev" aria-hidden="true"></span></button>
      ${ack}<div class="su-chips">${chips}</div>
      <div class="su-more"><div><ul class="su-list">${rows}</ul>${o.more ? `<div class="su-links">${o.more}</div>` : ''}</div></div></section>`;
  }

  // ------------------------------------------------------------------ Sunday open readiness
  function sundayWindow(now) {
    const p = et(now), d = dstNext(now), re = nextReopen(now);
    if (!re) return null;
    const toRe = re - now;
    const dstWeekend = d && d.t > now - 86400 && Math.abs(d.t - re) < 2 * 86400;
    const fromFri = ['Fri', 'Sat', 'Sun'].includes(p.wd) && !(p.wd === 'Sun' && p.min >= 1200);
    const thuEve = p.wd === 'Thu' && p.min >= 1080 && dstWeekend;
    if (!(fromFri || thuEve) || toRe > 4 * 86400) return null;
    return { re, dst: dstWeekend ? d : null };
  }
  function sunday(M, o) {
    M = obj(M); o = o || {};
    const now = num(M.now) || nowS(), W = sundayWindow(now);
    if (!W) return '';
    const As = accts(M), I = healthOf(M), B = obj(M.board), DU = window.DeckUI;
    // what each bot does first: the deck's 24 h calendar seen from the reopen (Sunday 18:00 ET)
    let ev = [];
    try { ev = DU && DU.events24 ? DU.events24({ now: W.re, cal: M.cal || null, board: B }) : []; } catch (e) { ev = []; }
    const first = (bot) => ev.filter((e) => e && e.bot === bot && okN(e.a) && e.a >= W.re).sort((a, b) => a.a - b.a)[0] || null;
    const fl = first('lit'), fa = first('atlas'), fb = first('blitz');
    const bz = As.blitz, bzOn = bz && !bz.placeholder && bz.configured !== false;
    const re = et(W.re);
    const hb = num(B.data_t) != null ? now - B.data_t : null;
    const ready = [
      ['PC on, the bot running by Sun 17:30 ET', B.running === false ? 'bad' : hb != null && hb < 900 ? 'good' : 'warn', B.running === false ? 'bot stopped' : hb != null ? (hb < 900 ? 'running now' : `quiet ${dur(hb)}`) : 'no report yet'],
      ['NinjaTrader connected', lvH(I.nt) === 'idle' ? 'warn' : lvH(I.nt), I.nt ? I.nt.value : 'not reported'],
      ['Bars flowing after 18:00 ET', 'idle', 'checks itself at the open'],
    ];
    if (W.dst) ready.push(['Windows clock: Set time automatically ON', 'warn', 'so the PC follows the clock change']);
    const line = (k, txt) => `<li style="--c:${COLOR[k]}"><i></i><div><b>${NAME[k]}</b><span>${esc(txt)}</span></div></li>`;
    const t = (e) => (e ? `${et(e.a).wd} ${et(e.a).hm} ET` : '');
    return `<section class="su-sun" aria-label="Sunday open">
      <div class="su-sun-h"><span class="su-eye">Sunday open · ${esc(re.mo)} ${re.d}</span><span class="su-pill">${W.re > now ? `opens in ${cd(W.re)}` : 'open'}</span></div>
      <h3>CME reopens Sun 18:00 ET</h3>
      ${W.dst ? `<p class="su-dst"><b>Clocks go ${W.dst.way === 'back' ? 'back' : 'forward'} 1 hour</b> at 2:00 AM on Sun ${esc(et(W.dst.t).mo)} ${et(W.dst.t).d} (${W.dst.way === 'back' ? 'EDT → EST' : 'EST → EDT'}). Every time here stays in ET; the bots keep their ET hours.</p>` : ''}
      <ul class="su-first">
        ${line('lit', fl ? `First entries ${t(fl)} (the Sunday evening session is watch-only)` : 'First entries Mon 02:00 ET')}
        ${line('atlas', fa ? `First window ${t(fa)}${fa.label ? ' · ' + String(fa.label).replace(/^ATLAS\s*/, '').split(' ')[0] : ''}` : 'First window Mon 02:00 ET')}
        ${line('blitz', bzOn ? (fb ? `First check ${t(fb)}` : 'First check Mon 11:00 ET') : 'Off until its own 25K is bought and armed · paper shadow only')}
      </ul>
      <ul class="su-ready">${ready.map(([l, v, s]) => `<li class="${v}">${dot(v)}<span>${esc(l)}</span><em>${esc(s)}</em></li>`).join('')}</ul></section>`;
  }

  // ------------------------------------------------------------------ the three account cards
  // the ring: progress to the target (the bot's colour) when the eval is up, the share of the max loss used (red,
  // counter-clockwise) when it is down; the eval's profit in the middle
  function ring(frac, color, inner, down) {
    const f = okN(frac) ? Math.max(0, Math.min(1, frac)) : 0, C = 2 * Math.PI * 21;
    return `<span class="su-ring${down ? ' down' : ''}" style="--c:${esc(color)}"><svg viewBox="0 0 48 48" aria-hidden="true"${down ? ' style="transform:rotate(-90deg) scaleY(-1)"' : ''}><circle cx="24" cy="24" r="21" class="bg"/><circle cx="24" cy="24" r="21" class="v" style="--C:${C.toFixed(2)};stroke-dasharray:${(f * C).toFixed(2)} ${C.toFixed(2)}"/></svg><b>${inner}</b></span>`;
  }
  const kmoney = (v) => (!okN(v) ? '—' : (v > 0 ? '+' : v < 0 ? '−' : '') + '$' + (Math.abs(v) >= 1000 ? (Math.abs(v) / 1000).toFixed(Math.abs(v) >= 10000 ? 0 : 1).replace(/\.0$/, '') + 'k' : Math.round(Math.abs(v))));
  function stateChip(A, L) {
    const w = A.placeholder ? ['paper', 'idle'] : A.pos ? ['in a trade', 'good'] : A.armed ? ['armed', 'good'] : /passed/.test(A.status) ? ['passed', 'good'] : /failed|lost/.test(A.status) ? ['ended', 'bad']
      : A.blocks && A.blocks.length ? ['blocked', 'bad'] : A.win && A.win.open ? ['watching', 'good'] : ['waiting', 'idle'];
    return `<span class="su-state ${w[1]}">${dot(w[1], !!L.live)}${esc(w[0])}</span>`;
  }
  function acctCard(A, M, o) {
    const k = A.key, c = COLOR[k], L = oneLine(A, M), page = PAGE[o.where === 'pc' ? 'pc' : 'phone'][k];
    const tgt = okN(A.profit) && okN(A.toTarget) && A.profit + A.toTarget > 0 ? A.profit + A.toTarget : null;
    const passed = okN(A.toTarget) && A.toTarget <= 0;
    const down = okN(A.profit) && A.profit < 0;
    const frac = down ? (okN(A.mll) && A.mll > 0 ? -A.profit / A.mll : 0) : tgt && okN(A.profit) ? A.profit / tgt : 0;
    // REAL / SIM / PAPER: which money this card is (the board's badge: LIVE = a real MFFU account, SIM = NinjaTrader Sim)
    const bd = String(obj(obj(M.board)[k]).badge || '').toUpperCase(), tag = A.placeholder || A.paper ? 'PAPER' : /LIVE|REAL/.test(bd) ? 'REAL' : /SIM/.test(bd) ? 'SIM' : bd ? bd.slice(0, 8) : '';
    const head = (plan) => `<span class="su-a-h"><b>${NAME[k]}</b>${tag ? `<i class="su-tag ${tag === 'REAL' ? 'real' : ''}">${esc(tag)}</i>` : ''}<em>${esc(plan)}</em>${stateChip(A, L)}</span>`;
    if (A.placeholder) {
      return `<a class="su-acct ph" data-bot="${k}" style="--c:${c}" ${goA(o, page)} aria-label="${NAME[k]}: paper only">${head('25K · paper shadow')}
        ${ring(0, c, '<i>off</i>')}<span class="su-a-m"><span class="su-big"><b>Paper</b><em>until its own 25K</em></span><span class="su-sub"><span class="su-tx">never routed · 09:30 noise band</span></span></span>
        <span class="su-line">${dot('idle')}${esc(L.text)}</span></a>`;
    }
    // the sparkline: the account's real P&L per day, or this week's days (Mon -> today) while it has fewer than 3
    let days = arr(A.days).map((d) => (Array.isArray(d) ? num(d[1]) : num(obj(d).usd)));
    if (days.length < 3) { const wk = arr(obj(obj(obj(obj(M.board).progress)[k]).week).days).filter((d) => d && !d.future).map((d) => num(d.usd) || 0); if (wk.length >= 3) days = wk; }
    const big = passed ? 'Passed' : okN(A.toTarget) ? money(A.toTarget) : '—';
    const sub = [okN(A.room) ? `Room ${money(A.room)}` : '', okN(A.session) && okN(A.sessions) ? `day ${A.session} of ${A.sessions}` : ''].filter(Boolean).join(' · ');
    const roomLvl = okN(A.roomFrac) ? (A.roomFrac < 0.25 ? 'bad' : A.roomFrac < 0.5 ? 'warn' : 'good') : 'idle';
    const tc = okN(A.today) && A.today > 0 ? 'up' : okN(A.today) && A.today < 0 ? 'dn' : '';
    return `<a class="su-acct${A.pos ? ' trading' : ''}" data-bot="${k}" style="--c:${c}" ${goA(o, page)} aria-label="${NAME[k]} ${esc(A.size || '')}: ${esc(big)} to the target"><i class="su-sheen" aria-hidden="true"></i>
      ${head(`${A.size || ''} · ${String(A.plan || '').replace(/\s*\d+K$/i, '')}`)}
      ${ring(frac, down ? 'var(--bad,#ff5a7a)' : c, kmoney(A.profit), down)}
      <span class="su-a-m"><span class="su-big"><b data-su-count="${okN(A.toTarget) && !passed ? Math.round(A.toTarget) : ''}">${esc(big)}</b><em>${passed ? 'target reached' : 'to the target'}</em></span>
        <span class="su-sub"><i class="su-room ${roomLvl}"></i><span class="su-tx">${esc(sub)}</span></span></span>
      <span class="su-a-r"><span class="su-today ${tc}"><em>today</em><b>${okN(A.today) ? smoney(A.today) : '—'}</b></span>${spark(days, c)}</span>
      <span class="su-line">${dot(L.lvl, L.live)}${esc(L.text)}${L.t ? ` · in ${cd(L.t)}` : ''}</span></a>`;
  }
  function accounts(M, o) {
    o = o || {}; M = obj(M);
    const As = accts(M), out = ['lit', 'atlas', 'blitz'].map((k) => As[k]).filter(Boolean).map((A) => acctCard(A, M, o)).join('');
    return out ? `<section class="su-accts" aria-label="The three accounts">${out}</section>` : '';
  }

  // ------------------------------------------------------------------ this week vs the 2-4 trades goal (the board's progress)
  // one row per bot: trades so far against its goal, Mon-Fri as dots (green / red day, today ringed), the week's real $
  function week(M, o) {
    M = obj(M); o = o || {};
    const P = obj(obj(M.board).progress), rows = [];
    for (const k of ['lit', 'atlas', 'blitz']) {
      const w = obj(obj(P[k]).week); if (!Array.isArray(w.days) || !w.days.length) continue;
      const n = num(w.n) || 0, lo = num(w.lo), hi = num(w.hi), usd = num(w.usd);
      const goal = lo != null && hi != null ? `${lo}-${hi}` : '';
      const st = String(w.status || '').replace(/_/g, ' ');
      const lvl = /behind|short|low/.test(st) ? 'warn' : /over|too many/.test(st) ? 'warn' : n ? 'good' : 'idle';
      const dots = w.days.slice(0, 5).map((d) => {
        const u = num(d.usd), c = d.future ? 'fut' : !d.n ? 'none' : u > 0 ? 'win' : u < 0 ? 'loss' : 'flat';
        return `<i class="su-wd ${c}${d.today ? ' today' : ''}" title="${esc(d.wd || '')} ${esc(d.day || '')}${d.n ? ` · ${d.n} trade${d.n === 1 ? '' : 's'} ${smoney(u)}` : ''}"><em>${esc(String(d.wd || '').slice(0, 1))}</em></i>`;
      }).join('');
      rows.push(`<li style="--c:${COLOR[k]}"><b>${NAME[k]}</b><span class="su-wdots">${dots}</span><span class="su-wn ${lvl}">${n}${goal ? `<small>/${goal}</small>` : ''}</span><strong class="${usd > 0 ? 'up' : usd < 0 ? 'dn' : ''}">${okN(usd) ? smoney(usd) : '—'}</strong></li>`);
    }
    if (!rows.length) return '';
    return `<section class="su-week" aria-label="This week"><div class="su-week-h"><span class="su-eye2">This week · real trades</span><em>vs each bot's goal</em></div><ul>${rows.join('')}</ul></section>`;
  }

  // ------------------------------------------------------------------ the market: NQ between its nearest levels
  // the board's map: price, the bar's time, the nearest untaken level above / below (label, price, points away), the VIX
  // day band (18:00 open +/- one VIX day move: Zlarior's target band). A ladder: below level -> price -> above level.
  function market(M) {
    M = obj(M);
    const m = obj(obj(M.board).map), px0 = num(m.price);
    if (px0 == null) return '';
    const a = obj(m.nearest_above), b = obj(m.nearest_below), v = obj(m.vix);
    const hi = num(a.price), lo = num(b.price), up = num(v.up), dn = num(v.dn);
    const f2 = (x) => (x == null ? '—' : x.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
    const pts = (x) => (x == null ? '' : (x > 0 ? '+' : x < 0 ? '−' : '') + Math.abs(x).toLocaleString('en-US', { maximumFractionDigits: 1 }) + ' pts');
    let lad = '';
    if (hi != null && lo != null && hi > lo) {
      const span = hi - lo, at = (x) => Math.max(0, Math.min(100, ((x - lo) / span) * 100)).toFixed(1);
      const band = up != null && dn != null && up > lo && dn < hi ? `<i class="su-lad-band" style="left:${at(Math.max(lo, dn))}%;right:${(100 - at(Math.min(hi, up))).toFixed(1)}%"></i>` : '';
      lad = `<div class="su-lad" aria-hidden="true"><i class="su-lad-rail"></i>${band}<i class="su-lad-px" style="left:${at(px0)}%"></i></div>
        <div class="su-lad-l"><span><b>${esc(b.label || 'below')}</b><em>${f2(lo)} · ${pts(lo - px0)}</em></span><span><b>${esc(a.label || 'above')}</b><em>${f2(hi)} · ${pts(hi - px0)}</em></span></div>`;
    }
    const vix = num(v.vix), atr = num(m.atr);
    const meta = [vix != null ? `VIX ${vix.toFixed(1)}` : '', atr != null ? `ATR ${atr.toFixed(1)}` : '', up != null && dn != null ? `band ${f2(dn)}–${f2(up)}` : ''].filter(Boolean).join(' · ');
    return `<section class="su-mkt" aria-label="NQ now"><div class="su-mkt-h"><span class="su-eye2">NQ${m.bar_hm ? ` · ${esc(m.bar_hm)} ET bar` : ''}</span><b>${f2(px0)}</b><em>${esc(meta)}</em></div>${lad}</section>`;
  }

  // ------------------------------------------------------------------ smart empty states
  function empty(kind, M) {
    M = obj(M);
    const now = num(M.now) || nowS(), As = accts(M);
    const nxt = (k) => { const A = As[k]; return A && A.win && okN(+A.win.open_t) && +A.win.open_t > now ? when(+A.win.open_t, now) : null; };
    const T = {
      trades: ['No trades yet today', `${nxt('lit') ? `Zlarior's window opens ${nxt('lit')}. ` : ''}A fill shows here within a minute of the PC seeing it; most days have none (the plan is 2-4 a week).`],
      real: ['No real trades yet', 'Real results fill in from the PC\'s NinjaTrader fills only (never paper or backtest $). The first closed trade lands here within a minute.'],
      blitz: ['BLITZ is paper only', 'Its own MFFU 25K is not set yet: it watches on paper and is never routed. Its trades show here once the 25K is bought and armed on the PC.'],
      mind: ['The Mind is quiet', 'Its game plans and reviews arrive with the PC\'s next check-in while the bot runs.'],
      feed: ['Waiting for the PC', 'The phone shows the PC\'s live file within a minute of the bot starting on the Surface.'],
    };
    const x = T[kind] || ['Nothing here yet', 'It fills in with the next update.'];
    return `<div class="su-empty"><b>${esc(x[0])}</b><span>${esc(x[1])}</span></div>`;
  }

  // ------------------------------------------------------------------ wire: the fold, the countdowns, count-ups
  function tick(root) {
    (root || document).querySelectorAll('[data-su-cd]').forEach((e) => { const t = +e.dataset.suCd; e.textContent = dur(t - nowS()); });
  }
  function wire(root) {
    if (!root || root.__st) return; root.__st = true;
    root.addEventListener('click', (e) => {
      const b = e.target.closest && e.target.closest('[data-su-toggle]'); if (!b) return;
      const s = b.closest('[data-su-bar]'); if (!s) return;
      const on = !s.classList.contains('open'); s.classList.toggle('open', on); b.setAttribute('aria-expanded', String(on));
      try { localStorage.setItem('le.st.open', on ? '1' : '0'); } catch (er) { /* private */ }
    });
    if (!wire.__t) wire.__t = setInterval(() => { if (!document.hidden) tick(document); }, 1000);
  }
  const isOpen = () => { try { return localStorage.getItem('le.st.open') === '1'; } catch (e) { return false; } };

  const CSS = `
.su-bar{--st:var(--good,#2ee59d);position:relative;border-radius:18px;padding:0;margin:0 0 12px;background:linear-gradient(180deg,rgba(22,26,38,.78),rgba(12,14,22,.7));border:1px solid rgba(160,170,220,.14);box-shadow:inset 0 1px 0 rgba(255,255,255,.06),0 14px 40px -26px rgba(0,0,0,.8);overflow:hidden}
.su-bar.warn{--st:var(--warn,#f7b955)}.su-bar.bad{--st:var(--bad,#ff5a7a)}
.su-bar::before{content:"";position:absolute;inset:0 0 auto 0;height:2px;background:linear-gradient(90deg,transparent,var(--st),transparent);opacity:.8}
.su-sum{all:unset;box-sizing:border-box;display:flex;align-items:center;gap:12px;width:100%;padding:14px 16px 8px;cursor:pointer;min-height:48px}
.su-t{display:flex;flex-direction:column;min-width:0;flex:1}.su-t b{font-size:16px;font-weight:700;letter-spacing:-.01em;color:var(--ink,#eef1f8)}
.su-t em{font-style:normal;font-size:12.5px;color:var(--ink-2,#a9b1c3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.su-chev{width:9px;height:9px;border-right:2px solid var(--muted,#6f788b);border-bottom:2px solid var(--muted,#6f788b);transform:rotate(45deg) translateY(-3px);transition:transform .25s}
.su-bar.open .su-chev{transform:rotate(225deg) translateY(-1px)}
.su-dot{flex:none;width:8px;height:8px;border-radius:50%;background:var(--muted,#6f788b);display:inline-block;position:relative}
.su-dot.good{background:var(--good,#2ee59d);box-shadow:0 0 8px color-mix(in srgb,var(--good,#2ee59d) 70%,transparent)}
.su-dot.warn{background:var(--warn,#f7b955);box-shadow:0 0 8px color-mix(in srgb,var(--warn,#f7b955) 60%,transparent)}
.su-dot.bad{background:var(--bad,#ff5a7a);box-shadow:0 0 10px color-mix(in srgb,var(--bad,#ff5a7a) 70%,transparent)}
.su-sum>.su-dot{width:12px;height:12px}
.su-dot.live::after{content:"";position:absolute;inset:-4px;border-radius:50%;border:1.5px solid currentColor;color:inherit;border-color:inherit;background:none;opacity:0;animation:su-ping 2.4s cubic-bezier(.2,.8,.2,1) infinite}
.su-dot.good.live::after{border-color:var(--good,#2ee59d)}
@keyframes su-ping{0%{transform:scale(.6);opacity:.9}80%,100%{transform:scale(1.9);opacity:0}}
.su-ack{all:unset;box-sizing:border-box;cursor:pointer;display:flex;align-items:center;gap:10px;margin:0 16px 10px;padding:10px 12px;border-radius:14px;background:color-mix(in srgb,var(--bad,#ff5a7a) 12%,transparent);border:1px solid color-mix(in srgb,var(--bad,#ff5a7a) 40%,transparent)}
.su-ack>span:not(.su-ack-go){flex:1;min-width:0;display:flex;flex-direction:column}.su-ack b{font-size:13.5px;color:var(--bad,#ff5a7a);font-weight:700}.su-ack em{font-style:normal;font-size:12px;color:var(--ink-2,#a9b1c3)}
.su-ack-go{font-size:20px;color:var(--bad,#ff5a7a)}
.su-chips{display:flex;gap:6px;overflow-x:auto;padding:2px 16px 14px;scrollbar-width:none;-webkit-mask-image:linear-gradient(90deg,#000 88%,transparent);mask-image:linear-gradient(90deg,#000 88%,transparent)}
.su-chips::-webkit-scrollbar{display:none}
.su-chip{flex:none;display:inline-flex;align-items:center;gap:6px;height:28px;padding:0 10px;border-radius:99px;font-size:12px;color:var(--ink-2,#a9b1c3);background:rgba(255,255,255,.04);border:1px solid rgba(160,170,220,.12);white-space:nowrap}
.su-chip b{color:var(--ink,#eef1f8);font-weight:650}.su-chip.bad{border-color:color-mix(in srgb,var(--bad,#ff5a7a) 45%,transparent)}.su-chip.warn{border-color:color-mix(in srgb,var(--warn,#f7b955) 40%,transparent)}
.su-more{display:grid;grid-template-rows:0fr;transition:grid-template-rows .32s cubic-bezier(.2,.8,.2,1)}.su-bar.open .su-more{grid-template-rows:1fr}
.su-more>*{min-height:0;overflow:hidden}.su-more>ul,.su-more>div{margin:0}
.su-list{list-style:none;padding:0 16px;margin:0}.su-list>li{display:flex;gap:12px;align-items:flex-start;padding:10px 0;border-top:1px solid rgba(160,170,220,.09)}
.su-list>li>.su-dot{margin-top:6px}.su-list>li>div{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}
.su-list b{font-size:13.5px;font-weight:650;color:var(--ink,#eef1f8)}.su-list span{font-size:12.5px;color:var(--ink-2,#a9b1c3);line-height:1.45}
.su-list em{font-style:normal;font-size:12px;color:var(--warn,#f7b955)}.su-list li.bad em{color:var(--bad,#ff5a7a)}
.su-list ul{margin:4px 0 0;padding-left:16px;font-size:12px;color:var(--ink-2,#a9b1c3)}
.su-go{all:unset;cursor:pointer;width:32px;height:32px;display:grid;place-items:center;border-radius:10px;color:var(--muted,#6f788b);font-size:20px}
.su-links{display:flex;gap:8px;flex-wrap:wrap;padding:6px 16px 16px}
.su-accts{display:grid;gap:12px;margin:0 0 12px}
@media (min-width:900px){.su-accts{grid-template-columns:repeat(3,minmax(0,1fr))}}
.su-acct{all:unset;box-sizing:border-box;cursor:pointer;position:relative;display:grid;grid-template-columns:auto minmax(0,1fr) auto;grid-template-areas:"h h h" "r m t" "l l l";column-gap:14px;row-gap:10px;align-items:center;padding:16px;border-radius:20px;overflow:hidden;
  background:radial-gradient(120% 140% at 0% 0%,color-mix(in srgb,var(--c) 16%,transparent),transparent 55%),linear-gradient(180deg,rgba(22,26,38,.82),rgba(11,13,21,.78));
  border:1px solid color-mix(in srgb,var(--c) 26%,rgba(160,170,220,.12));box-shadow:inset 0 1px 0 rgba(255,255,255,.07),0 18px 44px -28px color-mix(in srgb,var(--c) 60%,transparent);transition:transform .18s cubic-bezier(.2,.8,.2,1),border-color .2s}
.su-acct::after{content:"";position:absolute;left:16px;right:16px;top:0;height:1px;background:linear-gradient(90deg,transparent,color-mix(in srgb,var(--c) 70%,#fff),transparent);opacity:.55}
.su-acct:active{transform:scale(.985)}
:is(.su-acct,.su-sum,.su-ack,.su-go):focus-visible{outline:2px solid color-mix(in srgb,var(--accent,#6d7cff) 85%,transparent);outline-offset:2px}
.su-acct.trading{border-color:color-mix(in srgb,var(--c) 55%,transparent)}
.su-acct.trading::before{content:"";position:absolute;inset:0;border-radius:inherit;pointer-events:none;box-shadow:inset 0 0 0 1.5px var(--c),0 0 26px -6px var(--c);opacity:.25;animation:su-glow 2.6s ease-in-out infinite;will-change:opacity}
@keyframes su-glow{50%{opacity:1}}
@media (hover:hover){.su-acct:hover{border-color:color-mix(in srgb,var(--c) 50%,transparent)}}
.su-acct.ph{opacity:.88}
.su-sheen{position:absolute;inset:0;pointer-events:none;background:linear-gradient(105deg,transparent 30%,rgba(255,255,255,.09) 48%,rgba(255,255,255,.02) 56%,transparent 70%);transform:translate3d(-120%,0,0);opacity:0}
.pl-first .su-sheen{animation:su-sheen 1.5s .4s cubic-bezier(.16,1,.3,1) both}
@keyframes su-sheen{0%{transform:translate3d(-120%,0,0);opacity:1}100%{transform:translate3d(120%,0,0);opacity:0}}
.su-a-h{grid-area:h;display:flex;align-items:center;gap:8px;min-width:0}.su-a-h b{font-size:15px;font-weight:750;color:var(--c);letter-spacing:.01em}
.su-tag{flex:none;font:700 9.5px/1 var(--sans,system-ui);letter-spacing:.1em;padding:4px 6px;border-radius:6px;color:var(--ink-2,#a9b1c3);background:rgba(255,255,255,.06);border:1px solid rgba(160,170,220,.14)}
.su-tag.real{color:#06140d;background:var(--good,#2ee59d);border-color:transparent;box-shadow:0 0 12px color-mix(in srgb,var(--good,#2ee59d) 45%,transparent)}
.su-a-h em{font-style:normal;font-size:12px;color:var(--muted,#6f788b);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1;min-width:0}
.su-state{flex:none;display:inline-flex;align-items:center;gap:6px;height:24px;padding:0 9px;border-radius:99px;font-size:11.5px;font-weight:650;color:var(--ink-2,#a9b1c3);background:rgba(255,255,255,.05);border:1px solid rgba(160,170,220,.12)}
.su-state.good{color:var(--good-ink,#4ff0ae);border-color:color-mix(in srgb,var(--good,#2ee59d) 35%,transparent)}.su-state.bad{color:var(--bad,#ff5a7a);border-color:color-mix(in srgb,var(--bad,#ff5a7a) 40%,transparent)}
.su-ring{grid-area:r;position:relative;width:62px;height:62px;flex:none;display:grid;place-items:center}
.su-ring svg{position:absolute;inset:0;width:100%;height:100%;transform:rotate(-90deg)}
.su-ring circle{fill:none;stroke-width:4.5}.su-ring .bg{stroke:rgba(255,255,255,.08)}
.su-ring .v{stroke:var(--c);stroke-linecap:round;filter:drop-shadow(0 0 4px color-mix(in srgb,var(--c) 70%,transparent))}
.su-ring b{position:relative;font:700 12.5px/1 var(--sans,system-ui);color:var(--ink,#eef1f8);font-variant-numeric:tabular-nums;letter-spacing:-.01em}.su-ring.down b{color:#ffb0bf}
.su-ring b i{font-style:normal;font-size:11px;color:var(--muted,#6f788b);text-transform:uppercase;letter-spacing:.08em}
.su-a-m{grid-area:m;display:flex;flex-direction:column;gap:4px;min-width:0}
.su-big{display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;row-gap:0}.su-big b{font:760 28px/1.05 var(--sans,system-ui);letter-spacing:-.03em;color:var(--ink,#eef1f8);font-variant-numeric:tabular-nums}.su-big em{font-style:normal;font-size:12px;color:var(--ink-2,#a9b1c3)}
.su-sub{display:flex;align-items:center;gap:6px;font-size:12.5px;color:var(--ink-2,#a9b1c3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.su-tx{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
@media (max-width:374px){.su-sub{font-size:11.5px;gap:5px}}
.su-room{flex:none;width:6px;height:6px;border-radius:2px;background:var(--muted,#6f788b)}.su-room.good{background:var(--good,#2ee59d)}.su-room.warn{background:var(--warn,#f7b955)}.su-room.bad{background:var(--bad,#ff5a7a);box-shadow:0 0 6px var(--bad,#ff5a7a)}
.su-line{grid-area:l;font-size:12.5px;color:var(--ink,#eef1f8);min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:block;padding-top:10px;border-top:1px solid rgba(160,170,220,.08)}.su-line .su-dot{margin-right:8px;vertical-align:1px}
.su-line .su-cd{font-variant-numeric:tabular-nums;color:var(--ink-2,#a9b1c3)}
.su-a-r{grid-area:t;display:flex;flex-direction:column;align-items:flex-end;gap:6px}
.su-today{display:flex;flex-direction:column;align-items:flex-end}.su-today em{font-style:normal;font-size:10.5px;text-transform:uppercase;letter-spacing:.1em;color:var(--muted,#6f788b)}
.su-today b{font:700 15px var(--sans,system-ui);font-variant-numeric:tabular-nums;color:var(--ink,#eef1f8)}.su-today.up b{color:var(--good-ink,#4ff0ae)}.su-today.dn b{color:var(--bad,#ff5a7a)}
.su-spark{display:block;width:72px;height:24px;overflow:visible}.su-spark .z{stroke:rgba(255,255,255,.12);stroke-dasharray:2 3}.su-spark .pt{filter:drop-shadow(0 0 4px currentColor)}
.su-sun{position:relative;border-radius:20px;padding:16px;margin:0 0 12px;overflow:hidden;background:radial-gradient(110% 120% at 100% 0%,rgba(242,195,91,.14),transparent 55%),linear-gradient(180deg,rgba(22,26,38,.82),rgba(11,13,21,.78));border:1px solid rgba(242,195,91,.22);box-shadow:inset 0 1px 0 rgba(255,255,255,.06)}
.su-sun-h{display:flex;align-items:center;justify-content:space-between;gap:8px}
.su-eye{font:650 11px var(--sans,system-ui);text-transform:uppercase;letter-spacing:.12em;color:var(--gold,#f2c35b)}
.su-pill{font-size:12px;font-weight:650;padding:4px 10px;border-radius:99px;background:rgba(242,195,91,.12);color:var(--gold,#f2c35b);font-variant-numeric:tabular-nums}
.su-sun h3{margin:8px 0 6px;font-size:18px;letter-spacing:-.01em;color:var(--ink,#eef1f8)}
.su-dst{margin:0 0 10px;font-size:13px;line-height:1.5;color:var(--ink-2,#a9b1c3)}.su-dst b{color:var(--ink,#eef1f8)}
.su-first,.su-ready{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px}
.su-first li{display:flex;gap:10px;align-items:flex-start}.su-first li>i{width:8px;height:8px;border-radius:50%;margin-top:6px;background:var(--c);box-shadow:0 0 10px var(--c);flex:none}
.su-first li>div{display:flex;flex-direction:column;min-width:0}.su-first b{font-size:13px;color:var(--c)}.su-first span{font-size:13px;color:var(--ink,#eef1f8);line-height:1.4}
.su-ready{margin-top:12px;padding-top:12px;border-top:1px solid rgba(160,170,220,.1)}
.su-ready li{display:grid;grid-template-columns:auto minmax(0,1fr);column-gap:10px;align-items:center;font-size:13px;color:var(--ink,#eef1f8)}.su-ready li span{min-width:0}.su-ready li em{grid-column:2;font-style:normal;font-size:12px;color:var(--muted,#6f788b)}
.su-week{border-radius:20px;padding:14px 16px;margin:0 0 12px;background:linear-gradient(180deg,rgba(22,26,38,.82),rgba(11,13,21,.78));border:1px solid rgba(160,170,220,.14);box-shadow:inset 0 1px 0 rgba(255,255,255,.06)}
.su-week-h{display:flex;align-items:baseline;justify-content:space-between;gap:8px;margin-bottom:8px}.su-week-h em{font-style:normal;font-size:11.5px;color:var(--muted,#6f788b)}
.su-eye2{font:650 11px var(--sans,system-ui);text-transform:uppercase;letter-spacing:.12em;color:var(--muted,#6f788b)}
.su-week ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:2px}
.su-week li{display:grid;grid-template-columns:64px minmax(0,1fr) auto 64px;align-items:center;gap:10px;min-height:36px}
.su-week li>b{font-size:13px;font-weight:700;color:var(--c)}.su-week li>strong{font:650 13px var(--sans,system-ui);font-variant-numeric:tabular-nums;text-align:right;color:var(--ink,#eef1f8)}
.su-week li>strong.up{color:var(--good-ink,#4ff0ae)}.su-week li>strong.dn{color:var(--bad,#ff5a7a)}
.su-wdots{display:flex;gap:6px}.su-wd{position:relative;width:20px;height:20px;border-radius:7px;display:grid;place-items:center;background:rgba(255,255,255,.05);border:1px solid rgba(160,170,220,.1)}
.su-wd em{font-style:normal;font-size:9.5px;font-weight:650;color:var(--muted,#6f788b)}
.su-wd.win{background:color-mix(in srgb,var(--good,#2ee59d) 70%,transparent);border-color:transparent;box-shadow:0 0 10px color-mix(in srgb,var(--good,#2ee59d) 40%,transparent)}.su-wd.win em{color:#04130b}
.su-wd.loss{background:color-mix(in srgb,var(--bad,#ff5a7a) 70%,transparent);border-color:transparent;box-shadow:0 0 10px color-mix(in srgb,var(--bad,#ff5a7a) 35%,transparent)}.su-wd.loss em{color:#1a0509}
.su-wd.flat{background:rgba(255,255,255,.18)}.su-wd.fut{opacity:.45;border-style:dashed}
.su-wd.today{outline:1.5px solid var(--c);outline-offset:2px}
.su-wn{font:700 14px var(--sans,system-ui);font-variant-numeric:tabular-nums;color:var(--ink,#eef1f8)}.su-wn small{font-size:11px;font-weight:600;color:var(--muted,#6f788b)}.su-wn.warn{color:var(--warn,#f7b955)}
:root[data-theme="light"] .su-week{background:linear-gradient(180deg,#fff,#f6f8fc);border-color:rgba(20,30,60,.1)}
.su-mkt{border-radius:20px;padding:14px 16px;margin:0 0 12px;background:linear-gradient(180deg,rgba(22,26,38,.82),rgba(11,13,21,.78));border:1px solid rgba(160,170,220,.14);box-shadow:inset 0 1px 0 rgba(255,255,255,.06)}
.su-mkt-h{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap}.su-mkt-h b{font:750 22px/1.1 var(--sans,system-ui);letter-spacing:-.02em;color:var(--ink,#eef1f8);font-variant-numeric:tabular-nums}
.su-mkt-h em{font-style:normal;font-size:12px;color:var(--ink-2,#a9b1c3);margin-left:auto;text-align:right}
.su-lad{position:relative;height:18px;margin:12px 2px 6px}.su-lad-rail{position:absolute;left:0;right:0;top:8px;height:2px;border-radius:2px;background:linear-gradient(90deg,var(--good,#2ee59d),rgba(160,170,220,.25) 50%,var(--bad,#ff5a7a))}
.su-lad::before,.su-lad::after{content:"";position:absolute;top:3px;width:2px;height:12px;border-radius:2px;background:rgba(238,241,248,.5)}.su-lad::before{left:0}.su-lad::after{right:0}
.su-lad-band{position:absolute;top:4px;height:10px;border-radius:5px;background:rgba(79,155,255,.18);border:1px solid rgba(79,155,255,.45)}
.su-lad-px{position:absolute;top:1px;width:16px;height:16px;margin-left:-8px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#fff,#b9c6ff 45%,#6d7cff);box-shadow:0 0 12px rgba(143,162,255,.85)}
.su-lad-l{display:flex;justify-content:space-between;gap:12px}.su-lad-l span{display:flex;flex-direction:column;min-width:0}.su-lad-l span:last-child{text-align:right}
.su-lad-l b{font-size:12.5px;font-weight:650;color:var(--ink,#eef1f8);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.su-lad-l em{font-style:normal;font-size:11.5px;color:var(--muted,#6f788b);font-variant-numeric:tabular-nums}
:root[data-theme="light"] .su-mkt{background:linear-gradient(180deg,#fff,#f6f8fc);border-color:rgba(20,30,60,.1)}
.su-empty{display:flex;flex-direction:column;gap:4px;padding:18px 16px;border-radius:16px;border:1px dashed rgba(160,170,220,.18);background:rgba(255,255,255,.02)}
.su-empty b{font-size:14px;color:var(--ink,#eef1f8)}.su-empty span{font-size:13px;line-height:1.5;color:var(--ink-2,#a9b1c3)}
:root[data-theme="light"] .su-bar,:root[data-theme="light"] .su-acct,:root[data-theme="light"] .su-sun{background:linear-gradient(180deg,rgba(255,255,255,.92),rgba(246,248,252,.88));border-color:rgba(20,30,60,.1);box-shadow:0 1px 0 rgba(255,255,255,.9) inset,0 14px 34px -24px rgba(20,30,60,.35)}
:root[data-theme="light"] .su-acct{background:radial-gradient(120% 140% at 0% 0%,color-mix(in srgb,var(--c) 12%,transparent),transparent 55%),linear-gradient(180deg,#fff,#f6f8fc)}
:root[data-theme="light"] .su-chip{background:rgba(20,30,60,.04);border-color:rgba(20,30,60,.1)}
:root[data-theme="light"] .su-ring .bg{stroke:rgba(20,30,60,.08)}:root[data-theme="light"] .su-ring.down b{color:#c8264a}:root[data-theme="light"] .su-wd em{color:#5b6478}
@media (prefers-reduced-motion:reduce){.pl-first .su-sheen{animation:none}.su-acct.trading::before{animation:none;opacity:.7}.su-dot.live::after{animation:none}.su-more,.su-acct,.su-chev{transition:none}}
`;
  function css() { if (typeof document === 'undefined' || document.getElementById('su-css')) return; const s = document.createElement('style'); s.id = 'su-css'; s.textContent = CSS; document.head.appendChild(s); }

  window.StatusUI = { version: V, items, summary, bar, sunday, sundayWindow, oneLine, accounts, acctCard, ring, spark, week, market, empty, wire, tick, isOpen, css, dstNext, marketOpen, nextReopen, COLOR, NAME };
})();

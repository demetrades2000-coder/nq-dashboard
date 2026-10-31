// Mind (Brain v2) cards (2026-10-29; read-only). ONE renderer for both apps: tools/web_public/mindcore.js =
// web_next/js/next/mindcore.js (byte-identical). Classic script: window.MindUI. It draws the "mind" block the bot builds
// (liveview.json / heartbeat / GET /api/next/mind) and draws NOTHING when the block is absent:
//   regime     {label, trend, vol, day_type: {p_trend, label, acc_note} | null, why}
//   plans      {bot: {t, headline, scenarios: [{if, then, levels, exp_usd, odds}], change_mind}}      the if-then game plan
//   similar    {bot: {n, win, avg_r, usd, conf, valid, examples: [{day, r, usd}]} | null}           similar past setups
//   reviews    [{t, bot, trade, grade, right: [], wrong: [], lesson, luck}]                         A-F trade reviews
//   proposals  [{id, bot, idea, evidence: {h1, h2, r2125, usd_month}, status, t, change}]          self-research ideas
//   alerts     [{t, bot, text, level}]
//   iq         {store_n: {lit, atlas, blitz}, calibration}
// API: MindUI.has(m) · bot(m, key, o) (one bot's cards) · home(m, o) (the compact Home card) · page(m, o) (everything) ·
// reviewFor(m, trade) (the review of one trade, for the journal). o.go(id, arg) -> the link attribute of the app.
(function () {
  'use strict';
  const V = 1;
  const BOTS = { lit: { name: 'Zlarior', c: '#4f9bff' }, atlas: { name: 'ATLAS', c: '#ff9a3d' }, blitz: { name: 'BLITZ', c: '#b388ff' } };
  const KEY = (b) => { const s = String(b || '').toLowerCase(); return s === 'scalp' || s === 'blitz' ? 'blitz' : s === 'second' || s === 'atlas' || s === 'b' ? 'atlas' : s === 'zlarior' || s === 'lit' ? 'lit' : s; };
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ok = (v) => typeof v === 'number' && Number.isFinite(v);
  const arr = (a) => (Array.isArray(a) ? a : []);
  const obj = (o) => (o && typeof o === 'object' && !Array.isArray(o) ? o : null);
  const n = (v) => (v == null || v === '' || typeof v === 'boolean' ? NaN : +v);
  const usd = (v, sign = true) => { const x = n(v); if (!Number.isFinite(x)) return esc(v == null ? '—' : v); const s = '$' + Math.abs(Math.round(x)).toLocaleString('en-US'); return (sign ? (x > 0 ? '+' : x < 0 ? '−' : '') : x < 0 ? '−' : '') + s; };
  const pctv = (v) => { const x = n(v); if (!Number.isFinite(x)) return esc(v == null ? '—' : v); return (Math.abs(x) <= 1 ? x * 100 : x).toFixed(0) + '%'; };
  const rr = (v) => { const x = n(v); return Number.isFinite(x) ? (x > 0 ? '+' : '') + x.toFixed(2) + 'R' : esc(v == null ? '—' : v); };
  const cls = (v) => (n(v) > 0 ? 'up' : n(v) < 0 ? 'dn' : '');
  const name = (b) => (BOTS[KEY(b)] || { name: String(b || 'Bot') }).name;
  const col = (b) => (BOTS[KEY(b)] || { c: '#94a3b8' }).c;
  const hm = (t) => { if (!ok(n(t))) return ''; try { return new Date(n(t) * 1000).toLocaleString('en-US', { timeZone: 'America/New_York', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false }); } catch (e) { return ''; } };
  // any small value as text: a number, a string, a list, or {k: v} as "k v · k v"
  function val(v, depth = 0) {
    if (v == null || v === '') return '—';
    if (typeof v === 'number') return Number.isInteger(v) ? v.toLocaleString('en-US') : (+v.toFixed(3)).toString();
    if (typeof v === 'boolean') return v ? 'yes' : 'no';
    if (Array.isArray(v)) return v.slice(0, 8).map((x) => val(x, depth + 1)).join(', ');
    if (typeof v === 'object') return depth > 1 ? '…' : Object.entries(v).slice(0, 8).map(([k, x]) => `${k} ${val(x, depth + 1)}`).join(' · ');
    return String(v);
  }
  const has = (m) => !!(obj(m) && !m.error && (obj(m.regime) || obj(m.plans) || obj(m.similar) || arr(m.reviews).length || arr(m.proposals).length || arr(m.alerts).length || obj(m.iq)));
  const grade = (g) => { const s = String(g || '?').trim().toUpperCase().slice(0, 2); const k = s[0]; return `<span class="mn-grade g${/[A-F]/.test(k) ? k : 'x'}" aria-label="grade ${esc(s)}">${esc(s)}</span>`; };
  const lvlOf = (l) => { const s = String(l || '').toLowerCase(); return /bad|red|crit|high|error/.test(s) ? 'bad' : /warn|amber|med/.test(s) ? 'warn' : /good|ok|info|low/.test(s) ? 'good' : ''; };
  const tag = (b) => `<span class="mn-bot" style="--c:${col(b)}"><i></i>${esc(name(b))}</span>`;
  const pick = (m, k, b) => { const o = obj(m && m[k]); if (!o) return null; const kb = KEY(b); return o[kb] || o[kb === 'blitz' ? 'scalp' : kb === 'lit' ? 'zlarior' : kb] || null; };

  function regime(m) {
    const R = obj(m && m.regime); if (!R) return '';
    const d = obj(R.day_type);
    return `<div class="mn-regime"><div class="mn-rg-h"><span class="mn-eye">Market regime</span><b>${esc(R.label || '—')}</b></div>
      <div class="mn-rg-c">${R.trend != null ? `<span>Trend <b>${esc(val(R.trend))}</b></span>` : ''}${R.vol != null ? `<span>Volatility <b>${esc(val(R.vol))}</b></span>` : ''}
        ${d ? `<span>Day type <b>${esc(d.label || '—')}</b>${d.p_trend != null && !/%/.test(String(d.label || '')) ? ` · trend day ${esc(pctv(d.p_trend))}` : ''}</span>` : ''}</div>
      ${d && d.acc_note ? `<p class="mn-mut">${esc(d.acc_note)}</p>` : ''}${R.why ? `<p class="mn-why">${esc(val(R.why))}</p>` : ''}</div>`;
  }
  function planCard(P, b) {
    if (!obj(P)) return '';
    const S = arr(P.scenarios);
    return `<section class="mn-card" style="--c:${col(b)}"><div class="mn-h"><h3>${esc(name(b))} · game plan</h3>${P.t ? `<span class="mn-meta">${esc(hm(P.t))} ET</span>` : ''}</div>
      ${P.headline ? `<p class="mn-head">${esc(P.headline)}</p>` : ''}
      ${S.length ? `<ol class="mn-scn">${S.slice(0, 6).map((s) => `<li><div><span class="mn-if">IF</span><b>${esc(val(s.if))}</b></div><div><span class="mn-then">THEN</span><span>${esc(val(s.then))}</span></div>
        <div class="mn-scn-f">${s.levels != null ? `<em>levels ${esc(val(s.levels))}</em>` : ''}${s.exp_usd != null ? `<em class="${cls(s.exp_usd)}">expect ${usd(s.exp_usd)}</em>` : ''}${s.odds != null ? `<em>odds ${esc(pctv(s.odds))}</em>` : ''}</div></li>`).join('')}</ol>` : ''}
      ${P.change_mind ? `<p class="mn-mut"><b>Changes its mind if:</b> ${esc(val(P.change_mind))}</p>` : ''}</section>`;
  }
  function simCard(Sm, b) {
    if (!obj(Sm)) return '';
    const E = arr(Sm.examples);
    const winN = n(Sm.win);
    return `<section class="mn-card" style="--c:${col(b)}"><div class="mn-h"><h3>${esc(name(b))} · similar past setups</h3>${Sm.valid === false ? '<span class="mn-chip warn">too few to trust</span>' : Sm.conf != null ? `<span class="mn-chip">confidence ${esc(typeof Sm.conf === 'number' ? pctv(Sm.conf) : val(Sm.conf))}</span>` : ''}</div>
      <div class="mn-tiles"><div><span>Seen</span><b>${esc(val(Sm.n))}</b></div><div><span>Won</span><b>${Number.isFinite(winN) ? pctv(winN) : '—'}</b></div>
        <div><span>Avg R</span><b class="${cls(Sm.avg_r)}">${rr(Sm.avg_r)}</b></div><div><span>Avg $</span><b class="${cls(Sm.usd)}">${usd(Sm.usd)}</b></div></div>
      ${Number.isFinite(winN) ? `<div class="mn-winbar" aria-hidden="true"><i style="width:${Math.max(0, Math.min(100, Math.abs(winN) <= 1 ? winN * 100 : winN)).toFixed(0)}%"></i></div>` : ''}
      ${E.length ? `<ul class="mn-ex">${E.slice(0, 6).map((x) => `<li><span>${esc(x.day || '')}</span><b class="${cls(x.r)}">${rr(x.r)}</b><em class="${cls(x.usd)}">${usd(x.usd)}</em></li>`).join('')}</ul>` : ''}
      ${Sm.text ? `<p class="mn-mut">${esc(val(Sm.text))}</p>` : ''}</section>`;
  }
  function reviewCard(r, o) {
    if (!obj(r)) return '';
    const tr = obj(r.trade);
    const tline = tr ? [tr.day, tr.side, tr.usd != null ? usd(tr.usd) : '', tr.r != null ? rr(tr.r) : ''].filter(Boolean).join(' · ')
      : r.trade != null ? String(r.trade) + (r.usd != null && !/\$/.test(String(r.trade)) ? ' · ' + usd(r.usd) : '') : '';
    const day = tr && tr.day ? tr.day : /^\d{4}-\d\d-\d\d/.test(String(r.trade || '')) ? String(r.trade).slice(0, 10) : '';
    return `<li class="mn-rev" style="--c:${col(r.bot)}">${grade(r.grade)}<div class="mn-rev-b"><div class="mn-rev-h">${tag(r.bot)}<span>${esc(tline)}</span>${r.t ? `<em>${esc(hm(r.t))}</em>` : ''}</div>
      ${arr(r.right).length ? `<p><b class="up">Right:</b> ${esc(arr(r.right).join('; '))}</p>` : ''}${arr(r.wrong).length ? `<p><b class="dn">Wrong:</b> ${esc(arr(r.wrong).join('; '))}</p>` : ''}
      ${r.lesson ? `<p><b>Lesson:</b> ${esc(val(r.lesson))}</p>` : ''}${r.luck != null && r.luck !== '' ? `<p class="mn-mut"><b>Luck or skill:</b> ${esc(val(r.luck))}${r.why ? ' · ' + esc(val(r.why)) : ''}</p>` : r.why ? `<p class="mn-mut">${esc(val(r.why))}</p>` : ''}
      ${day && o && typeof o.go === 'function' ? `<a class="mn-link" ${o.go('holo', day)}>Replay ${esc(day)} in the Holodeck</a>` : ''}</div></li>`;
  }
  function reviews(m, b, o, max = 6) {
    const L = arr(m && m.reviews).filter((r) => !b || KEY(r.bot) === KEY(b)).sort((x, y) => (n(y.t) || 0) - (n(x.t) || 0));
    if (!L.length) return '';
    return `<section class="mn-card"><div class="mn-h"><h3>${b ? esc(name(b)) + ' · ' : ''}trade reviews</h3><span class="mn-meta">A-F, newest first</span></div><ul class="mn-revs">${L.slice(0, max).map((r) => reviewCard(r, o)).join('')}</ul></section>`;
  }
  function proposals(m, b, max = 6) {
    const L = arr(m && m.proposals).filter((p) => !b || KEY(p.bot) === KEY(b)).sort((x, y) => (n(y.t) || 0) - (n(x.t) || 0));
    if (!L.length) return '';
    const ev = (e) => { const E = obj(e); if (!E) return e != null ? `<em>${esc(val(e))}</em>` : ''; return [['h1', '2026 H1'], ['h2', '2026 H2'], ['r2125', '2021-25']].filter(([k]) => E[k] != null).map(([k, l]) => `<span class="${String(E[k]).length > 40 ? 'long' : ''}"><i>${l}</i><b>${esc(val(E[k]))}</b></span>`).join(''); };
    const pm = (e) => { const E = obj(e); return E && E.usd_month != null ? `<span class="mn-pm ${cls(E.usd_month)}">${usd(E.usd_month)} / month</span>` : ''; };
    const item = (p) => `<li style="--c:${col(p.bot)}"><div class="mn-prop-h">${tag(p.bot)}<b>${esc(p.idea || p.id || 'idea')}</b><span class="mn-chip ${/adopt|pass|ok|done/i.test(p.status) ? 'good' : /reject|fail/i.test(p.status) ? 'bad' : /test|run|wait|pend/i.test(p.status) ? 'warn' : ''}">${esc(p.status || 'idea')}</span>${pm(p.evidence)}</div>
        ${p.why ? `<p class="mn-mut">${esc(val(p.why))}</p>` : ''}${obj(p.evidence) || p.evidence != null ? `<details class="mn-evd"><summary>Evidence: 2026 H1 · 2026 H2 · 2021-25</summary><div class="mn-ev">${ev(p.evidence)}</div></details>` : ''}${p.change ? `<p class="mn-mut">Change: ${esc(val(p.change))}</p>` : ''}</li>`;
    return `<section class="mn-card"><div class="mn-h"><h3>${b ? esc(name(b)) + ' · ' : ''}self-research ideas</h3><span class="mn-meta">evidence first; you adopt, never the bot</span></div>
      <ul class="mn-props">${L.slice(0, Math.min(max, 4)).map(item).join('')}</ul>
      ${L.length > Math.min(max, 4) ? `<details class="mn-more-ideas"><summary>${Math.min(L.length, max) - Math.min(max, 4)} more idea${Math.min(L.length, max) - Math.min(max, 4) === 1 ? '' : 's'}</summary><ul class="mn-props">${L.slice(Math.min(max, 4), max).map(item).join('')}</ul></details>` : ''}</section>`;
  }
  function alerts(m, b, max = 8) {
    const L = arr(m && m.alerts).filter((a) => !b || KEY(a.bot) === KEY(b)).sort((x, y) => (n(y.t) || 0) - (n(x.t) || 0));
    if (!L.length) return '';
    return `<section class="mn-card"><div class="mn-h"><h3>${b ? esc(name(b)) + ' · ' : ''}Mind alerts</h3><span class="mn-meta">${L.length}</span></div>
      <ul class="mn-alerts">${L.slice(0, max).map((a) => `<li class="${lvlOf(a.level)}"><i></i>${tag(a.bot)}<span>${esc(a.text || '')}</span><em>${esc(hm(a.t))}</em></li>`).join('')}</ul></section>`;
  }
  function iq(m) {
    const Q = obj(m && m.iq); if (!Q) return '';
    const S = obj(Q.store_n) || {}, C = Q.calibration;
    const cal = Array.isArray(C) ? `<ul class="mn-cal">${C.slice(0, 8).map((x) => obj(x) ? `<li><span>${esc(val(x.bin != null ? x.bin : x.p != null ? x.p : x.label))}</span><b>${esc(val(x.hit != null ? x.hit : x.obs != null ? x.obs : x.rate))}</b>${x.n != null ? `<em>n ${esc(val(x.n))}</em>` : ''}</li>` : `<li><span>${esc(val(x))}</span></li>`).join('')}</ul>`
      : C != null ? `<p class="mn-mut">Calibration: ${esc(val(C))}</p>` : '';
    const dt = Q.daytype ? `<p class="mn-mut">Day type: ${esc(val(Q.daytype))}</p>` : '';
    return `<section class="mn-card"><div class="mn-h"><h3>Mind IQ</h3><span class="mn-meta">what it remembers</span></div>
      <div class="mn-tiles">${['lit', 'atlas', 'blitz'].map((k) => `<div style="--c:${col(k)}"><span>${esc(name(k))}</span><b>${esc(val(S[k] != null ? S[k] : S[k === 'blitz' ? 'scalp' : k]))}</b><em>setups stored</em></div>`).join('')}</div>${cal}${dt}</section>`;
  }

  function bot(m, b, o) {
    if (!has(m)) return '';
    const out = planCard(pick(m, 'plans', b), b) + simCard(pick(m, 'similar', b), b) + reviews(m, b, o, 4) + proposals(m, b, 4) + alerts(m, b, 5);
    return out ? `<div class="mn-wrap" data-mind="${esc(KEY(b))}"><div class="mn-title"><span class="mn-logo" aria-hidden="true"></span><b>Mind</b><span>${esc(name(b))}'s game plan, memory and reviews</span></div>${out}</div>` : '';
  }
  function home(m, o) {
    if (!has(m)) return '';
    const R = obj(m.regime), P = obj(m.plans) || {};
    const lines = ['lit', 'atlas', 'blitz'].map((k) => { const p = pick(m, 'plans', k); return p && p.headline ? `<li style="--c:${col(k)}">${tag(k)}<span>${esc(p.headline)}</span></li>` : ''; }).join('');
    const al = arr(m.alerts).slice().sort((x, y) => (n(y.t) || 0) - (n(x.t) || 0))[0];
    const rv = arr(m.reviews).slice().sort((x, y) => (n(y.t) || 0) - (n(x.t) || 0))[0];
    const go = o && typeof o.go === 'function' ? o.go('mind') : '';
    return `<section class="mn-card mn-home" aria-label="Mind"><div class="mn-h"><h3><span class="mn-logo" aria-hidden="true"></span>Mind · today</h3>${R && R.label ? `<span class="mn-chip">${esc(R.label)}</span>` : ''}</div>
      ${R && (R.day_type || R.why) ? `<p class="mn-mut">${R.day_type && R.day_type.label ? esc(R.day_type.label) + (R.day_type.p_trend != null && !/%/.test(String(R.day_type.label)) ? ` (trend day ${esc(pctv(R.day_type.p_trend))})` : '') + ' · ' : ''}${esc(val(R.why || ''))}</p>` : ''}
      ${lines ? `<ul class="mn-lines">${lines}</ul>` : ''}
      ${al ? `<p class="mn-al ${lvlOf(al.level)}"><i></i>${tag(al.bot)} ${esc(al.text || '')}</p>` : ''}
      ${rv ? `<p class="mn-rv1">${grade(rv.grade)}<span>${tag(rv.bot)} last review: ${esc(val(rv.lesson || (arr(rv.wrong)[0]) || (arr(rv.right)[0]) || ''))}</span></p>` : ''}
      ${go ? `<a class="mn-more" ${go}>Open the Mind: plans, similar setups, reviews, ideas</a>` : ''}</section>`;
  }
  function page(m, o) {
    if (!has(m)) return `<div class="mn-wrap"><section class="mn-card"><div class="mn-h"><h3>Mind</h3></div><p class="mn-mut">The Mind has not reported yet. It shows each bot's game plan, similar past setups, A-F trade reviews and research ideas once the PC sends them.</p></section></div>`;
    const per = ['lit', 'atlas', 'blitz'].map((k) => planCard(pick(m, 'plans', k), k) + simCard(pick(m, 'similar', k), k)).join('');
    return `<div class="mn-wrap mn-page"><div class="mn-title"><span class="mn-logo" aria-hidden="true"></span><b>Mind</b><span>what every bot plans, remembers and learns · read-only</span></div>
      ${obj(m.regime) ? `<section class="mn-card">${regime(m)}</section>` : ''}${per}${reviews(m, null, o, 10)}${proposals(m, null, 10)}${alerts(m, null, 12)}${iq(m)}</div>`;
  }
  function reviewFor(m, t) {
    if (!has(m) || !t) return null;
    const key = (x) => String(x == null ? '' : x);
    return arr(m.reviews).find((r) => {
      const tr = obj(r.trade);
      if (tr) return (tr.entry_t != null && key(tr.entry_t) === key(t.entry_t)) || (tr.id != null && key(tr.id) === key(t.id)) || (tr.day && tr.day === t.day && KEY(r.bot) === KEY(t.acct || t.bot));
      if (r.entry_t != null && t.entry_t != null && key(r.entry_t) === key(t.entry_t)) return true;
      return r.trade != null && (key(r.trade) === key(t.id) || key(r.trade) === key(t.entry_t) || (key(r.trade).slice(0, 10) === key(t.day) && KEY(r.bot) === KEY(t.acct || t.bot)));
    }) || null;
  }

  const CSS = `
.mn-wrap{display:flex;flex-direction:column;gap:12px;min-width:0}
.mn-card{--mn-ink:var(--ink,#eef1f8);--mn-mut:var(--muted,#9aa3b8);--mn-line:rgba(150,175,255,.16);position:relative;padding:14px 16px;border-radius:18px;color:var(--mn-ink);min-width:0;overflow:hidden;
  background:linear-gradient(180deg,rgba(14,20,44,.72),rgba(6,8,22,.62)) padding-box,linear-gradient(140deg,color-mix(in srgb,var(--c,#7dd3fc) 55%,transparent),rgba(125,211,252,.10) 50%,rgba(179,136,255,.25)) border-box;border:1px solid transparent;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.06),0 16px 40px -26px rgba(56,189,248,.5)}
.mn-card *{box-sizing:border-box}.mn-card .up{color:var(--good,#2ee59d)}.mn-card .dn{color:var(--bad,#ff5a7a)}
.mn-title{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:2px}.mn-title b{font:800 15px var(--sans,Inter,sans-serif);letter-spacing:.08em;text-transform:uppercase;color:#bfe9ff}.mn-title span:last-child{font-size:12.5px;color:var(--muted,#9aa3b8)}
.mn-logo{display:inline-block;width:18px;height:18px;border-radius:50%;flex:none;background:radial-gradient(circle at 40% 35%,#fff,#7dd3fc 35%,#6d28d9 80%);box-shadow:0 0 14px rgba(125,211,252,.7);vertical-align:-3px;margin-right:6px}
.mn-h{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:8px;flex-wrap:wrap}.mn-h h3{margin:0;font:700 15px/1.3 var(--sans,Inter,sans-serif)}
.mn-meta{font-size:12px;color:var(--mn-mut)}.mn-mut{margin:6px 0 0;font-size:13px;line-height:1.5;color:var(--mn-mut)}.mn-why{margin:6px 0 0;font-size:13.5px;line-height:1.5}
.mn-eye{font:700 10.5px/1.2 var(--sans,Inter,sans-serif);letter-spacing:.12em;text-transform:uppercase;color:#9fdcff}
.mn-chip{display:inline-flex;align-items:center;height:24px;padding:0 10px;border-radius:99px;font:700 10.5px/1 var(--sans,Inter,sans-serif);letter-spacing:.05em;background:rgba(125,211,252,.12);color:#bfe9ff;border:1px solid rgba(125,211,252,.3);white-space:nowrap;max-width:100%;overflow:hidden;text-overflow:ellipsis}
.mn-chip.good{background:rgba(46,229,157,.12);color:var(--good,#2ee59d);border-color:rgba(46,229,157,.35)}.mn-chip.warn{background:rgba(255,181,71,.12);color:var(--warn,#ffb547);border-color:rgba(255,181,71,.35)}.mn-chip.bad{background:rgba(255,90,122,.12);color:var(--bad,#ff5a7a);border-color:rgba(255,90,122,.4)}
.mn-regime .mn-rg-h{display:flex;flex-direction:column;gap:2px}.mn-regime .mn-rg-h b{font:800 22px/1.15 var(--sans,Inter,sans-serif);background:linear-gradient(90deg,#fff,#9fdcff);-webkit-background-clip:text;background-clip:text;color:transparent}
.mn-rg-c{display:flex;flex-wrap:wrap;gap:6px 14px;margin-top:8px;font-size:13px;color:var(--mn-mut)}.mn-rg-c b{color:var(--mn-ink)}
.mn-head{margin:0 0 8px;font-size:15px;line-height:1.45;font-weight:600}
.mn-scn{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px}
.mn-scn li{padding:10px 12px;border-radius:12px;border:1px solid var(--mn-line);background:rgba(125,211,252,.05);display:flex;flex-direction:column;gap:4px;font-size:13.5px;line-height:1.45}
.mn-scn li>div{display:flex;gap:8px;align-items:baseline;min-width:0}.mn-scn li>div>:last-child{min-width:0;overflow-wrap:anywhere}
.mn-if,.mn-then{flex:none;font:800 9.5px/1 var(--sans,Inter,sans-serif);letter-spacing:.1em;padding:4px 6px;border-radius:6px}.mn-if{background:rgba(125,211,252,.16);color:#9fdcff}.mn-then{background:rgba(179,136,255,.18);color:#d9c4ff}
.mn-scn-f{flex-wrap:wrap}.mn-scn-f em{font-style:normal;font-size:12px;color:var(--mn-mut)}
.mn-tiles{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}.mn-tiles>div{min-width:0;padding:10px;border-radius:12px;background:rgba(125,211,252,.06);border:1px solid var(--mn-line);display:flex;flex-direction:column;gap:2px}
.mn-tiles span{font:650 10.5px/1.2 var(--sans,Inter,sans-serif);letter-spacing:.08em;text-transform:uppercase;color:var(--mn-mut)}.mn-tiles b{font:750 17px/1.15 var(--sans,Inter,sans-serif);font-variant-numeric:tabular-nums;overflow:hidden;text-overflow:ellipsis}.mn-tiles em{font-style:normal;font-size:11px;color:var(--mn-mut)}
.mn-winbar{height:6px;border-radius:99px;background:rgba(255,90,122,.35);overflow:hidden;margin:10px 0 4px}.mn-winbar i{display:block;height:100%;background:var(--good,#2ee59d)}
.mn-ex{list-style:none;margin:8px 0 0;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:6px}.mn-ex li{display:flex;flex-direction:column;padding:6px 8px;border-radius:10px;border:1px solid var(--mn-line);font-size:12px}.mn-ex li span{color:var(--mn-mut)}.mn-ex li em{font-style:normal}
.mn-revs,.mn-props,.mn-alerts,.mn-lines,.mn-cal{list-style:none;margin:0;padding:0}
.mn-rev{display:grid;grid-template-columns:44px 1fr;gap:10px;padding:10px 0;border-top:1px solid var(--mn-line)}.mn-rev:first-child{border-top:0}
.mn-rev-b{min-width:0}.mn-rev-b p{margin:4px 0 0;font-size:13px;line-height:1.45;overflow-wrap:anywhere}.mn-rev-h{display:flex;gap:8px;align-items:center;flex-wrap:wrap;font-size:12.5px;color:var(--mn-mut)}.mn-rev-h em{font-style:normal}
.mn-grade{display:grid;place-items:center;width:40px;height:40px;border-radius:12px;font:850 18px var(--sans,Inter,sans-serif);color:#0b1020;background:#94a3b8;box-shadow:0 0 16px -4px currentColor}
.mn-grade.gA{background:#2ee59d}.mn-grade.gB{background:#7dd3fc}.mn-grade.gC{background:#ffd166}.mn-grade.gD{background:#ff9a3d}.mn-grade.gE,.mn-grade.gF{background:#ff5a7a}
.mn-bot{display:inline-flex;align-items:center;gap:5px;font:700 11px var(--sans,Inter,sans-serif);color:var(--c);white-space:nowrap}.mn-bot i{width:7px;height:7px;border-radius:50%;background:var(--c);box-shadow:0 0 8px var(--c)}
.mn-link,.mn-more{display:inline-flex;align-items:center;min-height:44px;margin-top:6px;padding:0 12px;border-radius:12px;border:1px solid rgba(125,211,252,.35);color:#bfe9ff;font:650 13px var(--sans,Inter,sans-serif);text-decoration:none;cursor:pointer;background:rgba(125,211,252,.08)}
.mn-props li{padding:10px 0;border-top:1px solid var(--mn-line)}.mn-props li:first-child{border-top:0}.mn-prop-h{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.mn-prop-h b{flex:1;min-width:140px;font-size:14px}
.mn-ev{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}
.mn-evd>summary,.mn-more-ideas>summary{display:flex;align-items:center;min-height:44px;cursor:pointer;font:650 12.5px var(--sans,Inter,sans-serif);color:#9fdcff;list-style:none}.mn-evd>summary::-webkit-details-marker,.mn-more-ideas>summary::-webkit-details-marker{display:none}
.mn-evd>summary::before,.mn-more-ideas>summary::before{content:"▸";margin-right:8px;transition:transform .15s}.mn-evd[open]>summary::before,.mn-more-ideas[open]>summary::before{transform:rotate(90deg)}
.mn-pm{font:750 12px var(--sans,Inter,sans-serif);font-variant-numeric:tabular-nums;white-space:nowrap}.mn-ev span{display:flex;flex-direction:column;padding:6px 8px;border-radius:10px;border:1px solid var(--mn-line);font-size:12.5px;min-width:0;overflow-wrap:anywhere}.mn-ev span.long{flex:1 1 100%}.mn-ev span.long b{font-weight:500;line-height:1.45}.mn-ev i{font-style:normal;font-size:10.5px;color:var(--mn-mut);letter-spacing:.06em;text-transform:uppercase}
.mn-alerts li{display:grid;grid-template-columns:10px auto 1fr;gap:4px 8px;align-items:center;padding:8px 0;border-top:1px solid var(--mn-line);font-size:13px}.mn-alerts li:first-child{border-top:0}.mn-alerts li>i{width:8px;height:8px;border-radius:50%;background:#64748b}
.mn-alerts li.bad>i{background:var(--bad,#ff5a7a);box-shadow:0 0 8px var(--bad,#ff5a7a)}.mn-alerts li.warn>i{background:var(--warn,#ffb547)}.mn-alerts li.good>i{background:var(--good,#2ee59d)}.mn-alerts li em{grid-column:3;font-style:normal;font-size:11.5px;color:var(--mn-mut)}.mn-alerts li span{min-width:0;overflow-wrap:anywhere}
.mn-lines li{display:grid;grid-template-columns:auto 1fr;gap:8px;align-items:baseline;padding:7px 0;border-top:1px solid var(--mn-line);font-size:13.5px;line-height:1.4}.mn-lines li:first-child{border-top:0}.mn-lines li span{min-width:0;overflow-wrap:anywhere}
.mn-al{display:flex;gap:8px;align-items:baseline;margin:8px 0 0;font-size:13px;line-height:1.4}.mn-al>i{flex:none;width:8px;height:8px;border-radius:50%;background:#64748b}.mn-al.bad>i{background:var(--bad,#ff5a7a)}.mn-al.warn>i{background:var(--warn,#ffb547)}
.mn-rv1{display:flex;gap:10px;align-items:center;margin:8px 0 0;font-size:13px}.mn-rv1 .mn-grade{width:32px;height:32px;font-size:15px;border-radius:10px;flex:none}
.mn-cal li{display:flex;gap:8px;padding:5px 0;font-size:12.5px;border-top:1px solid var(--mn-line)}.mn-cal li span{flex:1}.mn-cal li em{font-style:normal;color:var(--mn-mut)}
@media (max-width:420px){.mn-tiles{grid-template-columns:repeat(2,minmax(0,1fr))}}
:root[data-theme="light"] .mn-card{--mn-ink:#101828;--mn-mut:#526079;--mn-line:rgba(37,99,235,.16);background:linear-gradient(180deg,rgba(255,255,255,.92),rgba(240,247,255,.88)) padding-box,linear-gradient(140deg,color-mix(in srgb,var(--c,#2563eb) 45%,transparent),rgba(37,99,235,.12)) border-box}
:root[data-theme="light"] .mn-regime .mn-rg-h b{background:linear-gradient(90deg,#0b2a6b,#2563eb);-webkit-background-clip:text;background-clip:text}
:root[data-theme="light"] .mn-title b,:root[data-theme="light"] .mn-eye,:root[data-theme="light"] .mn-chip,:root[data-theme="light"] .mn-link,:root[data-theme="light"] .mn-more,:root[data-theme="light"] .mn-evd>summary,:root[data-theme="light"] .mn-more-ideas>summary,:root[data-theme="light"] .mn-if{color:#1d4ed8}
:root[data-theme="light"] .mn-then{color:#5b2fd6}
`;
  function css() {
    if (typeof document === 'undefined' || !document.head || document.getElementById('mind-css')) return;
    const s = document.createElement('style'); s.id = 'mind-css'; s.textContent = CSS; document.head.appendChild(s);
  }
  css();
  window.MindUI = { version: V, has, bot, home, page, regime, reviewFor, KEY, name, css };
})();

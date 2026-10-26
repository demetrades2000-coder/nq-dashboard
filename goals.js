// Goals (phone, 2026-10-25; loaded by index.html with one <script defer> after scale.js; read-only). Data: data.json /
// home.json "goals" (engine/goals.py: each eval vs target / floor / 10 sessions, this week's trades vs 2-4 LIT and 3-4 ATLAS,
// the month vs the backtest band, the ATLAS go-live scorecard, payout, the scale step, the news / early-close / clock calendar).
//   Home     a "Goals" card on top (rings + bars + one plain sentence each) and a "Today" card (next session countdown, what the
//            bot is waiting for, news chips, early-close / clock-change banners)
//   #/goals  the full Goals page: per account, the week strip, the month band, ATLAS go-live, payout, scale, pass-by dates
// Classic script that uses the main page's helpers (D, VIEWS, GROUPS, PAGES, icon, esc, usd, store ...). Paper only.
(function () {
  'use strict';
  if (typeof GROUPS === 'undefined' || typeof VIEWS === 'undefined') return;
  const HD = () => (typeof D !== 'undefined' && D) || window.HOMEJ || null;
  const GL = () => (HD() && HD().goals) || null;
  const nowS = () => Date.now() / 1000;
  const okN = (v) => v != null && v !== '' && !isNaN(v);
  const LVC = { good: 'var(--good)', warn: 'var(--warn)', bad: 'var(--bad)', idle: 'var(--muted)' };
  const lvc = (l) => LVC[l] || 'var(--accent)';
  const money = (v) => okN(v) ? usd(Math.round(v)) : '—';

  // ------------------------------------------------------------------ drawing parts
  // a ring: value 0..1, the big text in the middle, a small label under it
  function ring(f, big, small, col, size = 92) {
    const r = size / 2 - 7, c = 2 * Math.PI * r, v = Math.max(0, Math.min(1, +f || 0));
    return `<div class="gl-ring" style="--c:${col};width:${size}px"><svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" aria-hidden="true">
      <circle cx="${size / 2}" cy="${size / 2}" r="${r}" class="gl-rt"/>${v > 0.004 ? `<circle cx="${size / 2}" cy="${size / 2}" r="${r}" class="gl-rv" stroke-dasharray="${(c * v).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 ${size / 2} ${size / 2})"/>` : ''}</svg>
      <b>${big}</b><em>${small}</em></div>`;
  }
  const bar = (f, col, mark) => `<div class="gl-bar" style="--c:${col}"><i style="width:${(Math.max(0, Math.min(1, +f || 0)) * 100).toFixed(1)}%"></i>${mark != null ? `<u style="left:${(Math.max(0, Math.min(1, mark)) * 100).toFixed(1)}%"></u>` : ''}</div>`;
  function sessions(a) {
    const used = a.sessions_used || 0, n = a.sessions_max || 15, goal = a.sessions_goal || 10;
    return `<div class="gl-ses" role="img" aria-label="Session ${used} of ${goal}">${Array.from({ length: n }, (_, i) => {
      const k = i + 1; return `<i class="${k < used ? 'done' : k === used ? 'now' : ''}${k > goal ? ' late' : ''}">${k}</i>`; }).join('')}</div>`;
  }
  // weekdays from today: the date of the n-th session ahead (today = 1 if it is a weekday)
  function sessionDate(n) {
    if (!okN(n) || n < 1) return null;
    const d = new Date(); let k = 0;
    for (let i = 0; i < 60; i++) { const wd = d.getDay(); if (wd > 0 && wd < 6) { k++; if (k >= n) break; } d.setDate(d.getDate() + 1); }
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  }
  const perSession = (a) => okN(a.to_go) && okN(a.sessions_left) && a.sessions_left > 0 ? a.to_go / a.sessions_left : null;

  // ------------------------------------------------------------------ Home: the Goals card
  function acctBlock(a, compact) {
    if (!a || a.error) return '';
    const col = lvc(a.level), idle = a.level === 'idle' && a.balance == null;
    const prog = idle ? 0 : a.progress || 0;
    const head = `<div class="gl-ah"><b>${esc(a.strategy)} · ${esc(String(a.name || '').replace('MFFU Builder ', ''))}</b><span class="gl-pill" style="--c:${col}">${esc(idle ? 'not started' : a.status === 'open' ? (a.level === 'good' ? 'on track' : a.level === 'warn' ? 'watch' : 'at risk') : a.status)}</span></div>`;
    if (idle) return `<div class="gl-acct idle">${head}<p class="gl-s">${esc(a.sentence)}</p>${bar(0, col)}</div>`;
    const ps = perSession(a);
    return `<div class="gl-acct">${head}
      <div class="gl-top">${ring(prog, `${Math.round(prog * 100)}%`, 'of target', col, compact ? 78 : 92)}
        <div class="gl-bars"><div class="gl-row"><span>Profit <b class="${cls(a.profit)}">${susd(Math.round(a.profit || 0))}</b> of +${money(a.profit_target)}</span><em>${money(a.to_go)} to go</em></div>${bar(prog, 'var(--good)')}
          <div class="gl-row"><span>Room above the floor <b>${money(a.room)}</b></span><em>of ${money(a.mll)}</em></div>${bar(a.room_frac, (a.room_frac || 0) < 0.35 ? 'var(--bad)' : 'var(--accent-2)')}
          <div class="gl-row"><span>Session <b>${a.sessions_used ?? '—'}</b> of ${a.sessions_goal}</span><em>${a.sessions_left != null ? plural(a.sessions_left, 'session') + ' left' : ''}</em></div></div></div>
      ${compact ? '' : sessions(a)}
      <p class="gl-s">${esc(a.sentence)}${ps != null && ps > 0 ? ` That is about <b>${money(ps)}</b> a session.` : ''}</p>
      ${a.days_text ? `<div class="chips">${chip(esc(a.days_text), (a.days_traded || 0) >= (a.min_days || 0) ? 'good' : '')}${a.anchored ? chip('matches the MFFU dashboard (anchored)', 'good') : ''}${chip('source: ' + esc(a.source))}</div>` : ''}</div>`;
  }
  // "since you last looked": the 50K's $ to go against the value seen on an earlier visit (kept on this phone; the reference
  // moves on after 3 hours so the line means "since this morning / yesterday", not "since a second ago")
  function since(a) {
    if (!a || a.to_go == null || !(typeof D !== 'undefined' && D)) return '';
    const s = store.get('goals.seen', null), n = nowS();
    let out = '';
    if (s && okN(s.to_go) && s.to_go !== a.to_go) {
      const d = s.to_go - a.to_go;
      out = `<span class="gl-since">${d > 0 ? 'closer by' : 'further by'}<b class="${d > 0 ? 'up' : 'dn'}">${usd(Math.abs(Math.round(d)))}</b>since ${esc(new Date(s.t * 1000).toLocaleString('en-US', { weekday: 'short', hour: '2-digit', minute: '2-digit' }))}</span>`;
    }
    if (!s || n - s.t > 3 * 3600) store.set('goals.seen', { to_go: a.to_go, t: Math.round(n) });
    return out;
  }
  function weekRing(w, label) {
    if (!w || w.error) return '';
    const up = w.status === 'upcoming';
    const col = w.status === 'met' || w.status === 'on_pace' ? 'var(--good)' : w.status === 'above' ? 'var(--accent)' : up ? 'var(--muted)' : 'var(--warn)';
    return ring(up ? 0 : w.n / Math.max(1, w.lo), up ? `0` : String(w.n), `${label} · goal ${w.lo}-${w.hi}`, col, 84);
  }
  function card() {
    const G = GL();
    if (!G) return `<div class="card gl-card"><div class="card-h"><h3>${icon('target')}Goals</h3></div><p class="mut small">No goals data in this build yet: it comes with the next cloud run.</p></div>`;
    const [lit, at] = G.accounts && Array.isArray(G.accounts) ? G.accounts : [null, null];
    const W = G.week || {}, sc = G.scorecard || {}, m = G.month || {};
    const scR = ring(sc.frac || 0, `${sc.n || 0}`, `ATLAS go-live · of ${sc.need || 20}`, lvc(sc.level === 'idle' ? 'warn' : sc.level), 84);
    return `<div class="card gl-card"><div class="card-h"><h3>${icon('target')}Goals</h3><button class="chipbtn wide" type="button" data-go="goals"><span>All goals</span>${icon('right')}</button></div>
      ${acctBlock(lit, true)}${since(lit)}${acctBlock(at, true)}
      <div class="gl-rings">${weekRing(W.lit, 'Zlarior this week')}${weekRing(W.atlas, 'ATLAS this week')}${scR}</div>
      <p class="gl-s small">${esc((W.lit || {}).sentence || '')}</p>
      ${monthBlock(m)}
      <div class="gl-foot">${G.payout && !G.payout.error ? `<span>${icon('wallet')}${esc(G.payout.sentence)}</span>` : ''}${G.scale && G.scale.step != null ? `<span>${icon('layers')}Scale step ${G.scale.step} of ${G.scale.of} · ${G.scale.progress ?? 0}% to the next</span>` : ''}</div></div>`;
  }
  function monthBlock(m) {
    if (!m || m.error) return '';
    const e = m.expected || {};
    if (e.p10 == null || e.p90 == null) return `<div class="gl-month"><div class="gl-row"><span>This month <b class="${cls(m.usd)}">${susd(m.usd)}</b></span><em>${e.p50 != null ? 'backtest average ' + susd(e.p50) : ''}</em></div><p class="gl-s small">${esc(m.sentence)}</p></div>`;
    const lo = Math.min(e.p10, m.usd, 0), hi = Math.max(e.p90, m.usd), f = (v) => (v - lo) / ((hi - lo) || 1);
    return `<div class="gl-month"><div class="gl-row"><span>This month <b class="${cls(m.usd)}">${susd(m.usd)}</b> · ${plural(m.trades || 0, 'trade')}</span><em>${plural(m.sessions || 0, 'session')}</em></div>
      <div class="gl-band" role="img" aria-label="Month result inside the backtest range"><i style="left:${(f(e.p10) * 100).toFixed(1)}%;width:${((f(e.p90) - f(e.p10)) * 100).toFixed(1)}%"></i><s style="left:${(f(e.p50) * 100).toFixed(1)}%"></s><u style="left:${(f(m.usd) * 100).toFixed(1)}%" class="${m.level || ''}"></u></div>
      <div class="gl-row xs"><em>usual low ${susd(e.p10)}</em><em>middle ${susd(e.p50)}</em><em>usual high ${susd(e.p90)}</em></div>
      <p class="gl-s small">${esc(m.sentence)}</p></div>`;
  }

  // ------------------------------------------------------------------ Home: Today card (plan, countdown, waiting for, news)
  const KZ = [[120, 300, 'London'], [570, 690, 'NY AM'], [810, 930, 'NY PM']];
  function todayFacts(t = nowS()) {
    const e = et(t), mod = e.h * 60 + e.mi, wk = !['Sat', 'Sun'].includes(e.wd);
    const base = t - (mod * 60 + (Math.floor(t) % 60));
    const at = (m, add = 0) => base + m * 60 + add * 86400;
    // the next LIT entry window opening (02:00 ET on the next weekday), the session open (18:00 ET the evening before)
    let open = null, add = 0;
    for (let i = 0; i < 8; i++) { const ee = et(t + i * 86400); if (!['Sat', 'Sun'].includes(ee.wd) && (i > 0 || mod < 120)) { add = i; break; } }
    open = at(120, add);
    const inWin = wk && mod >= 120 && mod < 930;
    const kz = wk ? KZ.find(([a, b]) => mod >= a && mod < b) : null;
    const nk = wk ? KZ.find(([a]) => mod < a) : null;
    const sesOpen = e.wd === 'Sun' ? (mod < 1080 ? at(1080) : null) : e.wd === 'Fri' && mod >= 1020 ? at(1080, 2) : e.wd === 'Sat' ? at(1080, 1) : null;
    return { e, mod, wk, inWin, kz, nk: nk ? { label: nk[2], t: at(nk[0]) } : null, open, flat: at(955), cut: at(930), sesOpen };
  }
  function todayCard() {
    const G = GL() || {}, C = todayFacts(), h = HD() || {}, L = h.live || {};
    const b = (L.pc && L.pc.brain && !L.pc.brain.error && nowS() - (+L.pc.brain.t || 0) < 1200) ? L.pc.brain : L.brain;
    const waiting = (b && b.stage && b.stage.waiting) || L.model_state || '';
    const today = G.today || C.e.date, cal = G.calendar || {};
    const newsT = (cal.news || []).filter((n) => n.day === today), newsN = (cal.news || []).filter((n) => n.day > today);
    const ec = (cal.early_close || []).filter((x) => x.day >= today).slice(0, 1)[0];
    const clk = (cal.clocks || []).filter((x) => x.day >= today || daysTo(x.day) > -7);
    const lines = [];
    if (C.inWin) lines.push(`<div class="gl-t now">${icon('clock')}<span><b>Entry window open</b> · cut-off in <b data-cd="${C.cut}">${cdFmt(C.cut - nowS())}</b> · flat 15:55 ET</span></div>`);
    else lines.push(`<div class="gl-t">${icon('clock')}<span>Next Zlarior window <b>${et(C.open).wd} 02:00 ET</b> · in <b data-cd="${C.open}">${cdFmt(C.open - nowS())}</b></span></div>`);
    if (C.sesOpen) lines.push(`<div class="gl-t">${icon('today')}<span>Market opens <b>${et(C.sesOpen).wd} 18:00 ET</b> · in <b data-cd="${C.sesOpen}">${cdFmt(C.sesOpen - nowS())}</b></span></div>`);
    if (C.kz) lines.push(`<div class="gl-t now">${icon('target')}<span><b>${esc(C.kz[2])} killzone now</b></span></div>`);
    else if (C.nk) lines.push(`<div class="gl-t">${icon('target')}<span>Next killzone <b>${esc(C.nk.label)}</b> in <b data-cd="${C.nk.t}">${cdFmt(C.nk.t - nowS())}</b></span></div>`);
    const ban = [];
    if (ec && daysTo(ec.day) <= 7) ban.push(`<div class="gl-ban warn">${icon('flag')}<span><b>Early close ${esc(fDay(ec.day))}</b> · CME halts at ${esc(ec.halt)} ET; the bot goes flat 5 min before and stops entries 15 min before.</span></div>`);
    for (const x of clk.slice(0, 2)) ban.push(`<div class="gl-ban">${icon('clock')}<span><b>${esc(x.who)} ${esc(x.what)} ${esc(fDay(x.day))}</b> · ${esc(x.note)}.</span></div>`);
    const fomc = (cal.news || []).find((n) => /FOMC/.test(n.event) && daysTo(n.day) >= 0 && daysTo(n.day) <= 5);
    return `<div class="card gl-today"><div class="card-h"><h3>${icon('today')}Today's plan</h3><span class="meta">${esc(C.e.wd)} ${esc(C.e.hm)} ET</span></div>
      ${waiting ? `<p class="gl-wait"><span>The bot is waiting for</span>${esc(waiting)}</p>` : ''}
      <div class="gl-ts">${lines.join('')}</div>
      <div class="gl-news"><span class="gl-nl">${icon('news')}News today</span>${newsT.length ? newsT.map((n) => `<span class="chip warn">${esc(n.time)} ${esc(n.event)}</span>`).join('') : '<span class="chip good">no big US news today</span>'}
        ${newsN.length ? `<span class="chip">next: ${esc(fDay(newsN[0].day))} ${esc(newsN[0].time)} ${esc(newsN[0].event)}</span>` : ''}${fomc && fomc.day !== today ? `<span class="chip warn">FOMC week</span>` : ''}</div>
      ${ban.join('')}</div>`;
  }
  const daysTo = (d) => Math.round((Date.parse(d + 'T12:00:00') - Date.parse((GL()?.today || et(nowS()).date) + 'T12:00:00')) / 86400000);
  const fDay = (d) => { try { return new Date(d + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }); } catch (e) { return d; } };

  // ------------------------------------------------------------------ #/goals: the full page
  function weekStrip(w) {
    if (!w || w.error) return '';
    const mx = Math.max(1, ...w.days.map((d) => Math.abs(d.usd || 0)));
    return `<div class="gl-wk">${w.days.map((d) => `<div class="gl-wd ${d.today ? 'today' : ''} ${d.future ? 'future' : ''}"><em>${d.wd}</em><b>${d.n || (d.future ? '' : '0')}</b>
      <i style="--h:${(Math.abs(d.usd || 0) / mx * 100).toFixed(0)}%" class="${cls(d.usd)}"></i><span class="${cls(d.usd)}">${d.n ? kusd(d.usd) : ''}</span></div>`).join('')}</div>
      <p class="gl-s">${esc(w.sentence)}</p>`;
  }
  VIEWS.goals = (el) => {
    const G = GL();
    el.innerHTML = head('Home · Goals', 'My goals', 'Pass each eval in 2 weeks (10 sessions, never more than 15) · Zlarior 2-4 trades a week · ATLAS 3-4 · then funded, payouts and more accounts');
    if (!G) { el.insertAdjacentHTML('beforeend', emptyBox('No goals yet.', 'The goals come with the next cloud run (engine/goals.py).')); return; }
    const [lit, at] = Array.isArray(G.accounts) ? G.accounts : [];
    const sum = (G.lines || []).map((x) => `<li style="--c:${lvc(x.level)}">${esc(x.text)}</li>`).join('');
    const pass = (a) => a && a.balance != null && a.status === 'open' ? `<div class="gl-dates">${chip(`session ${a.sessions_goal} = ${esc(sessionDate((a.sessions_left || 0)) || '—')}`)}${chip(`session ${a.sessions_max} (3-week limit) = ${esc(sessionDate((a.sessions_left || 0) + (a.sessions_max - a.sessions_goal)) || '—')}`)}</div>` : '';
    const sc = G.scorecard || {}, W = G.week || {};
    el.insertAdjacentHTML('beforeend', `
      <div class="card"><div class="card-h"><h3>${icon('check')}In one look</h3><div class="row-btns"><button class="chipbtn wide" type="button" id="glShare">${icon('share')}<span>Share</span></button></div></div><ul class="gl-sum">${sum}</ul></div>
      <div class="card">${acctBlock(lit, false)}${pass(lit)}</div>
      <div class="card">${acctBlock(at, false)}${pass(at)}</div>
      <div class="grid g2 astart"><div class="card"><div class="card-h"><h3>${icon('trades')}Zlarior this week</h3><span class="meta">goal ${(W.lit || {}).lo}-${(W.lit || {}).hi}</span></div>${weekStrip(W.lit)}</div>
        <div class="card"><div class="card-h"><h3>${icon('atlas')}ATLAS this week</h3><span class="meta">goal ${(W.atlas || {}).lo}-${(W.atlas || {}).hi}</span></div>${weekStrip(W.atlas)}</div></div>
      <div class="card"><div class="card-h"><h3>${icon('results')}Month vs the backtest</h3><span class="meta">${esc((G.month || {}).month || '')}</span></div>${monthBlock(G.month)}
        ${(G.month || {}).per_month_expected ? `<p class="small mut">On average the backtest makes about ${susd((G.month || {}).per_month_expected)} a month on this eval (the Jul-Oct check half, engine/health_band.py); the middle path is lower because a few big winners carry the average.</p>` : ''}</div>
      <div class="grid g2 astart"><div class="card"><div class="card-h"><h3>${icon('radar')}ATLAS go-live check</h3><span class="meta">${esc(sc.text || '')}</span></div>
          <div class="gl-top">${ring(sc.frac || 0, `${sc.n || 0}/${sc.need || 20}`, 'paper trades', lvc(sc.level === 'idle' ? 'warn' : sc.level))}<p class="gl-s">${esc(sc.sentence || '')} Rule: 20 finished paper trades at or above the backtest's p10.</p></div></div>
        <div class="card"><div class="card-h"><h3>${icon('wallet')}Payouts and scaling</h3></div>
          <div class="gl-row"><span>Payout</span><em>${esc((G.payout || {}).stage || '')}</em></div>${bar((G.payout || {}).frac, 'var(--gold)')}<p class="gl-s small">${esc((G.payout || {}).sentence || '')}</p>
          <div class="gl-row"><span>Scale step <b>${(G.scale || {}).step ?? '—'}</b> of ${(G.scale || {}).of ?? '—'}</span><em>${(G.scale || {}).progress ?? 0}% to the next</em></div>${bar((G.scale || {}).frac, 'var(--accent)')}<p class="gl-s small">${esc((G.scale || {}).sentence || '')}</p>
          <button class="chipbtn wide" type="button" data-go="scale" style="margin-top:8px">${icon('layers')}<span>Scaling plan</span></button></div></div>
      <p class="small mut">Read-only. Built ${esc(new Date((G.t || 0) * 1000).toLocaleString())} from ${esc((G.sources || {}).lit_trades || '—')} trades.</p>`);
    const sh = el.querySelector('#glShare');
    if (sh) sh.onclick = () => shareText('My goals\n' + (G.lines || []).map((x) => '• ' + x.text).join('\n'));
  };
  async function shareText(t) {
    try { if (navigator.share) { await navigator.share({ text: t }); return; } } catch (e) { if (e && e.name === 'AbortError') return; }
    try { await navigator.clipboard.writeText(t); toast('Copied'); } catch (e) { toast('Could not share here'); }
  }
  window.GoalsUI = { card, todayCard, ring, bar, shareText, sessionDate, todayFacts, version: 1 };

  // ------------------------------------------------------------------ install: the page + the Home hook
  function install() {
    if (typeof P !== 'undefined' && !P.atlas) P.atlas = '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.6 2.4 3.9 5.2 3.9 8.5s-1.3 6.1-3.9 8.5c-2.6-2.4-3.9-5.2-3.9-8.5s1.3-6.1 3.9-8.5z"/>';
    const H = GROUPS.find((g) => g.id === 'today') || GROUPS[0];
    if (!H.pages.some((p) => p[0] === 'goals')) H.pages.splice(1, 0, ['goals', 'Goals', 'target', 'Each eval vs its target, this week vs 2-4 trades, the month, ATLAS go-live']);
    PAGES.goals = { id: 'goals', label: 'Goals', icon: 'target', desc: 'My goals', group: H.id };
    SCENE.goals = 'eval';
    Object.assign(ALIAS, { goal: 'goals', targets: 'goals', progress: 'goals' });
    const t0 = VIEWS.today;
    if (t0 && !t0.__goals) {
      VIEWS.today = function (el) {
        t0.apply(this, arguments);
        try {
          const two = el.querySelector('.at-two'), html = card(), sf = el.querySelector('.hb-surface');
          if (sf && two && (sf.compareDocumentPosition(two) & Node.DOCUMENT_POSITION_FOLLOWING)) two.insertAdjacentHTML('beforebegin', html);
          else if (sf) { sf.insertAdjacentHTML('afterend', html); if (two) el.querySelector('.gl-card').insertAdjacentElement('afterend', two); }
          else if (two) two.insertAdjacentHTML('beforebegin', html);
          else { const inst = el.querySelector('#moInst'); if (inst) inst.insertAdjacentHTML('afterend', html); else el.insertAdjacentHTML('afterbegin', html); }
          const after = el.querySelector('.at-two') || el.querySelector('.gl-card');
          if (after) after.insertAdjacentHTML('afterend', todayCard());
        } catch (e) { console.warn('goals home', e); }
      };
      VIEWS.today.__goals = true;
    }
    const st = document.createElement('style'); st.id = 'goals-css'; st.textContent = CSS; document.head.appendChild(st);
    if (typeof nav === 'function') { nav(); if (typeof route === 'function') route(); }
  }

  const CSS = `
.gl-card{border-color:color-mix(in srgb,var(--accent) 40%,transparent);background:linear-gradient(160deg,color-mix(in srgb,var(--accent) 9%,var(--surface)),var(--surface))}
.gl-acct{padding:10px 0 12px;border-bottom:1px solid var(--line)}.gl-acct:last-of-type{border-bottom:0}.gl-acct.idle{opacity:.85}
.gl-ah{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:8px}.gl-ah b{font-size:15px;letter-spacing:.02em}
.gl-pill{font:700 10.5px var(--sans);letter-spacing:.06em;text-transform:uppercase;padding:4px 9px;border-radius:99px;color:#0b0e14;background:var(--c)}
.gl-top{display:flex;gap:14px;align-items:center}.gl-bars{flex:1;min-width:0;display:flex;flex-direction:column;gap:5px}
.gl-row{display:flex;justify-content:space-between;gap:8px;font-size:12.5px;color:var(--ink-2)}.gl-row b{color:var(--ink);font-family:var(--mono)}.gl-row em{font-style:normal;color:var(--muted);white-space:nowrap}
.gl-row.xs{font-size:10.5px;margin-top:3px}
.gl-bar{position:relative;height:8px;border-radius:99px;background:var(--surface-3);overflow:visible;margin-bottom:4px}.gl-bar i{position:absolute;left:0;top:0;bottom:0;border-radius:99px;background:var(--c);transition:width .8s var(--ease)}
.gl-bar u{position:absolute;top:-3px;bottom:-3px;width:2px;background:var(--ink)}
.gl-ring{position:relative;display:flex;flex-direction:column;align-items:center;flex:none}.gl-ring svg{display:block}
.gl-rt{fill:none;stroke:var(--surface-3);stroke-width:7}.gl-rv{fill:none;stroke:var(--c);stroke-width:7;stroke-linecap:round;transition:stroke-dasharray .9s var(--ease)}
.gl-since{display:inline-flex;margin:8px 0 0;font-size:12px;padding:4px 10px;border-radius:99px;background:var(--surface-2);color:var(--ink-2)}.gl-since b{margin:0 4px;font-family:var(--mono)}
.gl-ring>b{display:flex;position:absolute;inset:0 0 auto 0;aspect-ratio:1;align-items:center;justify-content:center;font:750 19px var(--mono);color:var(--ink)}
.gl-ring>em{font-style:normal;font-size:10.5px;color:var(--muted);text-align:center;margin-top:4px;line-height:1.25;max-width:110px}
.gl-rings{display:grid;grid-template-columns:repeat(3,1fr);justify-items:center;gap:6px;margin:14px 0 4px}
.gl-s{margin:8px 0 0;font-size:13.5px;line-height:1.5;color:var(--ink-2)}.gl-s b{color:var(--ink)}.gl-s.small{font-size:12.5px}
.gl-ses{display:grid;grid-template-columns:repeat(15,1fr);gap:3px;margin:10px 0 0}.gl-ses i{font:650 9.5px var(--mono);font-style:normal;text-align:center;padding:5px 0;border-radius:6px;background:var(--surface-3);color:var(--muted)}
.gl-ses i.done{background:color-mix(in srgb,var(--accent) 55%,transparent);color:#fff}.gl-ses i.now{background:var(--accent);color:#fff;box-shadow:0 0 0 2px color-mix(in srgb,var(--accent) 40%,transparent)}.gl-ses i.late{opacity:.55;border:1px dashed var(--line)}
.gl-month{margin-top:12px;padding-top:10px;border-top:1px solid var(--line)}
.gl-band{position:relative;height:14px;border-radius:99px;background:var(--surface-3);margin:8px 0 2px}.gl-band i{position:absolute;top:0;bottom:0;border-radius:99px;background:color-mix(in srgb,var(--accent-2) 35%,transparent)}
.gl-band s{position:absolute;top:2px;bottom:2px;width:2px;background:var(--accent-2)}.gl-band u{position:absolute;top:-4px;width:12px;height:22px;margin-left:-6px;border-radius:6px;background:var(--ink);box-shadow:0 2px 8px rgba(0,0,0,.4)}
.gl-band u.good{background:var(--good)}.gl-band u.warn{background:var(--warn)}
.gl-foot{display:flex;flex-direction:column;gap:6px;margin-top:12px;font-size:12.5px;color:var(--ink-2)}.gl-foot span{display:flex;gap:8px;align-items:flex-start}.gl-foot .ico{flex:none;width:15px;height:15px;margin-top:1px;color:var(--muted)}
.gl-today .gl-wait{margin:0 0 10px;font-size:14.5px;font-weight:600;line-height:1.45}.gl-wait span{display:block;font:650 10.5px var(--sans);letter-spacing:.08em;text-transform:uppercase;color:var(--muted);margin-bottom:3px}
.gl-ts{display:flex;flex-direction:column;gap:6px}.gl-t{display:flex;gap:9px;align-items:center;font-size:13.5px;color:var(--ink-2)}.gl-t b{color:var(--ink);font-family:var(--mono)}.gl-t .ico{flex:none;width:16px;height:16px;color:var(--muted)}.gl-t.now .ico{color:var(--good)}
.gl-news{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:12px}.gl-nl{display:inline-flex;gap:6px;align-items:center;font:650 10.5px var(--sans);letter-spacing:.08em;text-transform:uppercase;color:var(--muted);margin-right:4px}.gl-nl .ico{width:14px;height:14px}
.gl-ban{display:flex;gap:9px;align-items:flex-start;margin-top:10px;padding:10px 12px;border-radius:12px;border:1px solid var(--line);font-size:12.5px;line-height:1.45;color:var(--ink-2)}.gl-ban b{color:var(--ink)}.gl-ban .ico{flex:none;width:16px;height:16px;margin-top:1px}
.gl-ban.warn{border-color:color-mix(in srgb,var(--warn) 45%,transparent);background:color-mix(in srgb,var(--warn) 8%,transparent)}.gl-ban.warn .ico{color:var(--warn)}
.gl-sum{margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:8px}.gl-sum li{position:relative;padding-left:16px;font-size:13.5px;line-height:1.45}.gl-sum li::before{content:'';position:absolute;left:0;top:6px;width:8px;height:8px;border-radius:50%;background:var(--c)}
.gl-wk{display:grid;grid-template-columns:repeat(5,1fr);gap:6px}.gl-wd{display:flex;flex-direction:column;align-items:center;gap:3px;padding:8px 0;border-radius:12px;background:var(--surface-2);position:relative;min-height:96px}
.gl-wd em{font-style:normal;font-size:11px;color:var(--muted)}.gl-wd b{font:700 18px var(--mono)}.gl-wd span{font:600 10.5px var(--mono)}.gl-wd.today{outline:1.5px solid var(--accent)}.gl-wd.future{opacity:.5}
.gl-wd i{display:block;width:60%;height:calc(var(--h) * .3);min-height:2px;border-radius:4px;background:var(--muted)}.gl-wd i.up{background:var(--good)}.gl-wd i.dn{background:var(--bad)}
.gl-dates{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}.gl-acct .chips{margin-top:8px;display:flex;flex-wrap:wrap;gap:6px}
html[data-theme="light"] .gl-acct .chip,html[data-theme="light"] .gl-news .chip,html[data-theme="light"] .gl-dates .chip{background:var(--surface-2);color:var(--ink-2);border-color:var(--line)}
html[data-theme="light"] .gl-acct .chip.good,html[data-theme="light"] .gl-news .chip.good{color:#0b7a4b;background:color-mix(in srgb,var(--good) 14%,#fff)}
html[data-theme="light"] .gl-news .chip.warn{color:#8a5a00;background:color-mix(in srgb,var(--warn) 18%,#fff)}
@media (max-width:420px){.gl-ring>b{font-size:16px}}
`;
  install();
})();

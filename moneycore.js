// Road to $10K / Stingray 3LT renderer (2026-10-26, owner: "a $10K month by February 2027, a 2024 Stingray 3LT before I
// turn 19"). Shared by the phone app (tools/web_public/goals.js: the bottom of the Home Goals card and of #/goals) and the PC
// dashboard (web_next/js/next/money.js: the bottom of the Goals page, with the local-only form); web_next/js/next/moneycore.js
// is a byte-identical copy (tests/test_money_goal.py checks it). Data: engine/money_goal.py (PC GET /api/next/money, phone
// data.json / home.json "goals.money" or live.json "money", whichever is newer). Read-only to trading: the only write is the
// PC form's POST of the owner's own figures (savings, jobs, Kalshi, targets) to data/goals_money.json.
//   MoneyUI.card(M, opts)    the whole card: next action, the stack (9 accounts), then "My goals" at the bottom
//   MoneyUI.goals(M, opts)   only "My goals" (the Home Goals card's bottom; opts.compact: one bar each)
//   MoneyUI.form(M)          the PC's local form (savings now, this month's jobs / Kalshi, targets + plan)
//   MoneyUI.wire(root, M, o) countdown + the form's Save buttons (o.save(body) -> Promise of the API reply, o.done(card))
//   MoneyUI.pick(a, b)       the newer of two cards (data.json vs live.json)
(function () {
  'use strict';
  if (typeof window === 'undefined') return;
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ok = (v) => v != null && v !== '' && !isNaN(v);
  const usd = (v) => !ok(v) ? '—' : (v < 0 ? '−' : '') + '$' + Math.abs(Math.round(+v)).toLocaleString('en-US');
  const susd = (v) => !ok(v) ? '—' : (v > 0 ? '+' : '') + usd(v);
  const pct = (f) => ok(f) ? Math.round(+f * 100) + '%' : '—';
  const clamp = (f) => Math.max(0, Math.min(1, +f || 0));
  const kusd = (v) => { if (!ok(v)) return '—'; const a = Math.abs(+v); return a >= 1000 ? '$' + (+(a / 1000).toFixed(1)).toString() + 'K' : usd(v); };
  const STATE = { 'not bought': 'idle', eval: 'eval', passed: 'pass', funded: 'good', paying: 'pay' };
  const STATUS = { on_pace: ['good', 'on pace'], behind: ['bad', 'behind'], reached: ['good', 'target reached'], late: ['bad', 'date passed'],
    unknown: ['idle', 'pace: needs a 2nd balance'], hidden: ['idle', 'hidden on the phone'] };

  function pick(a, b) {
    const good = (x) => x && typeof x === 'object' && !x.error && Array.isArray(x.goals);
    if (!good(a)) return good(b) ? b : (a || b || null);
    if (!good(b)) return a;
    return (+b.t || 0) > (+a.t || 0) ? b : a;
  }
  // days from today (this device's date) to yyyy-mm-dd; the card's own number when the date cannot be read
  function daysTo(day, fallback) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(day || ''));
    if (!m) return fallback;
    const now = new Date(), t0 = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()), t1 = Date.UTC(+m[1], +m[2] - 1, +m[3]);
    return Math.max(0, Math.round((t1 - t0) / 864e5));
  }

  // ---------------------------------------------------------------- parts
  const chip = (t, k = '') => `<span class="mg-chip ${k}">${t}</span>`;
  function head(M, where) {
    const asof = M.inputs_t ? new Date(M.inputs_t * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : null;
    return `<div class="mg-head"><h3>${esc(M.title || 'Road to $10K')}</h3><span class="mg-meta">${M.hidden ? 'figures hidden on the phone' :
      asof ? 'your figures as of ' + esc(asof) : where === 'pc' ? 'type your figures below' : 'figures: entered on the PC'}</span></div>`;
  }
  function nextLine(n, where) {
    if (!n || !n.text) return '';
    const k = n.kind === 'payout' || n.kind === 'funded' ? 'warn' : n.kind === 'done' ? 'good' : '';
    const how = n.how && (where === 'pc' || !/python|Start page/.test(n.how)) ? n.how : '';     // PC steps stay on the PC
    return `<div class="mg-next ${k}"><span class="mg-k">Next</span><b>${esc(n.text)}</b>${how ? `<em>${esc(how)}</em>` : ''}</div>`;
  }
  function stackBlock(S) {
    if (!S || S.error) return '';
    const groups = (S.groups || []).map((g) => {
      const pills = (g.slots || []).map((s) => `<span class="mg-st ${STATE[s.state] || 'idle'}" title="${esc(g.label + (g.count > 1 ? ' #' + s.n : '') + ': ' + s.state + (s.name ? ' · ' + s.name : ''))}">${esc(s.state)}${s.payouts_n ? ' · ' + s.payouts_n + ' paid' : ''}</span>`).join('');
      const notes = [...new Set((g.slots || []).map((s) => s.note).filter(Boolean))];
      return `<div class="mg-grp"><div class="mg-gh"><b>${esc(g.label)}${g.count > 1 ? ` <span class="mg-x">×${g.count}</span>` : ''}</b>
        <span>${esc(g.bot)} · ${usd(g.usd_month_each)}/mo each${g.count > 1 ? ' · ' + usd(g.usd_month) + '/mo' : ''}</span></div>
        <div class="mg-pills">${pills}</div>${notes.map((x) => `<p class="mg-note">${esc(x)}</p>`).join('')}<p class="mg-cap">${esc(g.cap)}</p></div>`;
    }).join('');
    return `<div class="mg-sec">The stack <span>${S.funded} of ${S.of} funded · ${S.bought} bought</span></div>
      <div class="mg-stack">${groups}</div>
      <div class="mg-kpis"><div><span>Funded now</span><b>${usd(S.usd_month_now)}<i>/mo</i></b></div>
        <div><span>All ${S.of} funded (plan pace)</span><b>${usd(S.usd_month_all)}<i>/mo</i></b></div>
        <div><span>In a 2021-25-like year</span><b>${usd(S.usd_month_ref_all)}<i>/mo</i></b></div></div>`;
  }
  function monthGoal(g, compact) {
    const parts = g.parts || [];
    const segs = parts.filter((p) => (p.frac || 0) > 0).map((p) => `<i class="mg-seg ${p.k}" style="width:${(clamp(p.frac) * 100).toFixed(2)}%" title="${esc(p.label)}: ${usd(p.usd)}"></i>`).join('');
    const legend = parts.map((p) => `<span class="mg-lg"><i class="mg-sw ${p.k}"></i>${esc(p.label)} <b>${g.hidden && p.k !== 'prop' ? 'hidden' : p.usd == null ? '—' : usd(p.usd)}</b></span>`).join('');
    const goalMark = g.scale > g.goal ? `<u style="left:${(clamp(g.goal / g.scale) * 100).toFixed(2)}%" title="goal ${usd(g.goal)}"></u>` : '';
    return `<div class="mg-goal" data-k="month"><div class="mg-gt"><b>${esc(g.title)}</b>${chip(pct(g.frac), g.total >= g.goal ? 'good' : '')}</div>
      <div class="mg-big"><b>${usd(g.total)}</b><em>of ${usd(g.goal)} · ${esc(g.month_label || '')}</em></div>
      <div class="mg-bar stack" role="img" aria-label="${esc(g.sentence)}">${segs}${goalMark}</div>
      <div class="mg-legend">${legend}</div>
      ${compact ? '' : `<p class="mg-s">${esc(g.sentence)}</p>${g.plan ? `<p class="mg-s mut">${esc(g.plan.sentence)}</p>` : ''}`}</div>`;
  }
  function carGoal(g, compact) {
    const st = STATUS[g.status] || STATUS.unknown;
    const days = daysTo(g.by, g.days_left);
    // the goal label sits above the bar at its marker, the stretch (the bar's end) below: no overlap at phone width
    const at = (clamp(g.target_at) * 100).toFixed(2);
    const bar = `${g.stretch ? `<div class="mg-scale mg-up"><span class="mg-tlab ${clamp(g.target_at) > 0.5 ? 'end' : ''}" style="left:${at}%">goal ${kusd(g.target)}</span></div>` : ''}
      <div class="mg-bar car" role="img" aria-label="${esc(g.sentence)}"><i class="mg-fill" style="width:${(clamp(g.bar) * 100).toFixed(2)}%" title="saved ${usd(g.saved)}"></i>
        ${g.stretch ? `<u class="mg-tmark" style="left:${at}%" title="target ${usd(g.target)}"></u>` : ''}</div>
      <div class="mg-scale"><span>$0</span>${g.stretch ? `<span>stretch ${kusd(g.stretch)}</span>` : `<span>goal ${kusd(g.target)}</span>`}</div>`;
    const gap = g.status === 'behind' ? `behind by ${usd(-g.gap)}` : g.status === 'on_pace' ? `on pace (${susd(g.gap)})` : st[1];
    const gapBox = g.status === 'behind' || g.status === 'on_pace' || g.status === 'reached' || g.status === 'late' ? gap : '—';
    const kpis = compact ? '' : `<div class="mg-kpis four"><div><span>Days left</span><b data-mg-days="${esc(g.by)}">${days}</b><em>to ${esc(g.by_label)}</em></div>
        <div><span>Needed a week</span><b>${g.need_week == null ? '—' : usd(g.need_week)}</b><em>from today</em></div>
        <div><span>Current pace</span><b>${g.pace ? usd(g.pace.usd_week) : '—'}<i>/wk</i></b><em>${g.pace ? 'since ' + esc(g.pace.from) : 'needs 2 balances a week apart'}</em></div>
        <div><span>At the current pace</span><b class="${st[0]}">${esc(gapBox)}</b><em>${g.projected != null ? usd(g.projected) + ' by then' : gapBox === '—' ? 'after your next balance' : ''}</em></div></div>`;
    return `<div class="mg-goal" data-k="car"><div class="mg-gt"><b>${esc(g.title)}</b>${chip(esc(gap), st[0])}</div>
      <div class="mg-big"><b>${g.saved == null ? '—' : usd(g.saved)}</b><em>of ${usd(g.target)} · ${g.saved == null ? '' : pct(g.frac) + ' · '}<span data-mg-days="${esc(g.by)}">${days}</span> days left</em></div>
      ${bar}${kpis}
      ${compact ? '' : `<p class="mg-s">${esc(g.sentence)}</p><p class="mg-s mut">${esc(g.target_note || '')}${g.stretch ? ` · stretch ${usd(g.stretch)}: ${esc(g.stretch_note || '')}${g.stretch_need_week ? ` (${usd(g.stretch_need_week)} a week)` : ''}` : ''}${g.price ? ` · car ~${usd(g.price)} all-in` : ''}</p>`}</div>`;
  }
  function barGoal(g, compact) {
    return `<div class="mg-goal" data-k="${esc(g.k)}"><div class="mg-gt"><b>${esc(g.title)}</b>${chip(pct(g.frac))}</div>
      <div class="mg-big"><b>${g.saved == null ? '—' : usd(g.saved)}</b><em>of ${usd(g.target)} · no date</em></div>
      <div class="mg-bar" role="img" aria-label="${esc(g.sentence)}"><i class="mg-fill z" style="width:${(clamp(g.frac) * 100).toFixed(2)}%" title="saved ${usd(g.saved)} of ${usd(g.target)}"></i></div>
      ${compact ? '' : `<p class="mg-s mut">${esc(g.note || '')}</p>`}</div>`;
  }
  function goals(M, opts = {}) {
    css();
    if (!M || M.error || !Array.isArray(M.goals)) return M && M.error ? `<p class="mg-s mut">My goals: ${esc(M.error)}</p>` : '';
    const c = !!opts.compact;
    const body = M.goals.map((g) => g.kind === 'month' ? monthGoal(g, c) : g.kind === 'car' ? carGoal(g, c) : barGoal(g, c)).join('');
    return `<div class="mg-wrap mg-goals ${c ? 'compact' : ''}"><div class="mg-sec">My goals${opts.link ? ` <a class="mg-link" ${opts.link}>All</a>` : ''}</div>${body}</div>`;
  }
  function card(M, opts = {}) {
    css();
    if (!M) return `<div class="mg-wrap"><p class="mg-s mut">Road to $10K: no data in this build yet.</p></div>`;
    if (M.error) return `<div class="mg-wrap"><p class="mg-s mut">Road to $10K: ${esc(M.error)}</p></div>`;
    return `<div class="mg-wrap">${head(M, opts.where)}${nextLine(M.next, opts.where)}${stackBlock(M.stack)}${goals(M, {}).replace('mg-wrap mg-goals', 'mg-goals')}
      <ul class="mg-src">${(M.honest || []).map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>`;
  }

  // ---------------------------------------------------------------- the PC's local form
  const inp = (id, label, val, attrs = '') => `<label>${esc(label)}<input id="${id}" ${attrs} value="${esc(val == null ? '' : val)}"></label>`;
  function form(M) {
    css();
    const S = (M && M.settings) || {}, C = S.car || {}, Z = S.z06 || {}, P = S.plan || {}, st = S.start || {};
    const g1 = (M && M.goals && M.goals[0]) || {};
    const today = (M && M.today) || new Date().toISOString().slice(0, 10), month = g1.month || today.slice(0, 7);
    const num = 'type="number" step="0.01" inputmode="decimal"';
    const hist = ((M && M.savings) || []).slice().reverse().map((r) => `<li><span>${esc(r.day)}</span><b>${usd(r.usd)}</b><button type="button" class="mg-del" data-mg-del="${esc(r.day)}" title="remove this entry">remove</button></li>`).join('');
    return `<div class="mg-wrap mg-form"><div class="mg-sec">Your numbers <span>saved only on this PC (data/goals_money.json); nothing here touches the bot</span></div>
      <div class="mg-fgrid"><div class="mg-fbox"><h4>Savings balance now</h4><div class="mg-row2">${inp('mgSav', 'Balance $', M && M.saved, num + ' min="0"')}${inp('mgSavDay', 'As of', today, 'type="date"')}</div>
          <button type="button" class="mg-btn primary" data-mg-save="savings">Save balance</button>${hist ? `<ul class="mg-hist">${hist}</ul>` : ''}</div>
        <div class="mg-fbox"><h4>This month's income</h4><div class="mg-row3">${inp('mgMonth', 'Month', month, 'type="month"')}${inp('mgJobs', 'Job income $', g1.jobs, num + ' min="0"')}${inp('mgKal', 'Kalshi P&L $', g1.kalshi, num)}</div>
          <button type="button" class="mg-btn primary" data-mg-save="month">Save month</button><p class="mg-note">Prop payouts come from the bot (the payouts you record), not from here.</p></div></div>
      <p class="mg-msg" id="mgMsg" role="status" aria-live="polite"></p>
      <details class="mg-more"><summary>Goals and plan (targets, dates, the car)</summary>
        <div class="mg-fgrid three">
          <div class="mg-fbox"><h4>$10K month</h4>${inp('mgGoal', 'Month goal $', S.month_goal, num)}${inp('mgGoalBy', 'By (month)', S.goal_by, 'type="month"')}
            ${inp('mgPJobs', 'Plan: jobs $ a month', P.jobs, num)}<div class="mg-row3">${inp('mgPKlo', 'Kalshi low $/day', P.kalshi_day_lo, num)}${inp('mgPKhi', 'high $/day', P.kalshi_day_hi, num)}${inp('mgPKd', 'days a month', P.kalshi_days, 'type="number" step="1" min="0" max="31"')}</div></div>
          <div class="mg-fbox"><h4>Car</h4>${inp('mgCName', 'Name', C.name, 'maxlength="40"')}${inp('mgCWhy', 'Why / when', C.why, 'maxlength="40"')}${inp('mgCBy', 'Date', C.by, 'type="date"')}
            <div class="mg-row3">${inp('mgCPrice', 'Price all-in $', C.price, num)}${inp('mgCTarget', 'Target $', C.target, num)}${inp('mgCStretch', 'Stretch $', C.stretch, num)}</div>
            ${inp('mgCTNote', 'Target note', C.target_note, 'maxlength="80"')}${inp('mgCSNote', 'Stretch note', C.stretch_note, 'maxlength="80"')}</div>
          <div class="mg-fbox"><h4>Z06 and the start</h4>${inp('mgZName', 'Name', Z.name, 'maxlength="40"')}${inp('mgZTarget', 'Target $', Z.target, num)}${inp('mgZNote', 'Note', Z.note, 'maxlength="80"')}
            <div class="mg-row2">${inp('mgStart', 'Starting balance $', st.usd, num)}${inp('mgStartDay', 'on', st.day, 'type="date"')}</div>
            <label class="mg-check"><input id="mgPub" type="checkbox" ${S.publish === false ? '' : 'checked'}> Show my figures on the phone (the dashboard site is public)</label></div></div>
        <button type="button" class="mg-btn primary" data-mg-save="settings">Save goals and plan</button><p class="mg-msg"></p></details></div>`;
  }
  function body(root, kind) {
    const v = (id) => { const e = root.querySelector('#' + id); return e ? e.value.trim() : ''; };
    const n = (id) => { const s = v(id); return s === '' ? undefined : +s; };
    const t = (id) => { const s = v(id); return s === '' ? undefined : s; };
    if (kind === 'savings') return { savings: n('mgSav'), savings_day: t('mgSavDay') };
    if (kind === 'month') return { month: t('mgMonth'), jobs: n('mgJobs'), kalshi: n('mgKal') };
    const pub = root.querySelector('#mgPub');
    return { settings: { month_goal: n('mgGoal'), goal_by: t('mgGoalBy'), publish: pub ? !!pub.checked : undefined,
      plan: { jobs: n('mgPJobs'), kalshi_day_lo: n('mgPKlo'), kalshi_day_hi: n('mgPKhi'), kalshi_days: n('mgPKd') },
      car: { name: t('mgCName'), why: t('mgCWhy'), by: t('mgCBy'), price: n('mgCPrice'), target: n('mgCTarget'), stretch: n('mgCStretch'),
        target_note: t('mgCTNote'), stretch_note: t('mgCSNote') },
      z06: { name: t('mgZName'), target: n('mgZTarget'), note: t('mgZNote') }, start: { usd: n('mgStart'), day: t('mgStartDay') } } };
  }
  function wire(root, M, o = {}) {
    if (!root) return;
    root.querySelectorAll('[data-mg-days]').forEach((el) => { el.textContent = String(daysTo(el.dataset.mgDays, el.textContent)); });
    if (typeof o.save !== 'function') return;
    const msg = (t, bad) => root.querySelectorAll('.mg-msg').forEach((m) => { m.textContent = t; m.className = 'mg-msg' + (bad ? ' bad' : ' good'); });
    const send = async (b, btn) => {
      if (btn) btn.disabled = true;
      try {
        const r = await o.save(b);
        if (r && r.ok) { msg(r.say || 'Saved.'); if (typeof o.done === 'function' && r.card) o.done(r.card, r.say); }
        else msg((r && r.error) || 'Not saved.', true);
      } catch (e) { msg('Not saved: ' + (e && e.message ? e.message : e), true); }
      finally { if (btn) btn.disabled = false; }
    };
    root.querySelectorAll('[data-mg-save]').forEach((btn) => { btn.onclick = () => send(JSON.parse(JSON.stringify(body(root, btn.dataset.mgSave))), btn); });
    root.querySelectorAll('[data-mg-del]').forEach((btn) => { btn.onclick = () => send({ savings_delete: btn.dataset.mgDel }, btn); });
  }

  // ---------------------------------------------------------------- styles (both apps' tokens, with fallbacks)
  // series (dataviz reference palette, validated dark on #10131a / light): jobs blue, Kalshi orange, prop payouts aqua
  const CSS = `.mg-wrap{--mg-line:var(--line,var(--nx-line,rgba(160,170,220,.16)));--mg-s2:var(--surface-2,rgba(127,127,127,.08));--mg-s3:var(--surface-3,rgba(127,127,127,.16));
--mg-ink2:var(--ink-2,#a9b1c3);--mg-mut:var(--muted,#6f788b);--mg-good:var(--good,#2ee59d);--mg-bad:var(--bad,#ff5a7a);--mg-warn:var(--warn,#f7b955);--mg-acc:var(--accent,#6d7cff);--mg-gold:var(--gold,#f2c35b);
--mg-jobs:#3987e5;--mg-kal:#d95926;--mg-prop:#199e70;--mg-surf:var(--surface,#10131a);display:flex;flex-direction:column;gap:10px;min-width:0}
html[data-theme="light"] .mg-wrap{--mg-jobs:#2a78d6;--mg-kal:#eb6834;--mg-prop:#1baf7a}
.mg-wrap *{box-sizing:border-box}.mg-goals{display:flex;flex-direction:column;gap:10px;min-width:0}
.mg-head{display:flex;justify-content:space-between;align-items:baseline;gap:8px;flex-wrap:wrap}.mg-head h3{margin:0;font-size:16px;letter-spacing:.01em}.mg-meta{font-size:12px;color:var(--mg-mut)}
.mg-next{display:flex;flex-direction:column;gap:3px;padding:10px 12px;border-radius:12px;border:1px solid color-mix(in srgb,var(--mg-acc) 40%,transparent);background:color-mix(in srgb,var(--mg-acc) 9%,transparent)}
.mg-next.warn{border-color:color-mix(in srgb,var(--mg-warn) 50%,transparent);background:color-mix(in srgb,var(--mg-warn) 9%,transparent)}.mg-next.good{border-color:color-mix(in srgb,var(--mg-good) 45%,transparent)}
.mg-next b{font-size:14px;line-height:1.4;color:var(--ink,inherit)}.mg-next em{font-style:normal;font-size:12px;color:var(--mg-ink2);overflow-wrap:anywhere}
.mg-k{font:700 10.5px var(--sans,system-ui);letter-spacing:.08em;text-transform:uppercase;color:var(--mg-mut)}
.mg-sec{margin:6px 2px 0;font-size:12.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--mg-ink2);display:flex;gap:8px;align-items:baseline;flex-wrap:wrap}
.mg-sec span{text-transform:none;letter-spacing:0;font-weight:500;color:var(--mg-mut)}.mg-link{margin-left:auto;text-transform:none;letter-spacing:0;font-weight:600;color:var(--mg-acc);cursor:pointer;text-decoration:none}
.mg-stack{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,230px),1fr));gap:8px}
.mg-grp{padding:10px 12px;border-radius:12px;background:var(--mg-s2);border:1px solid var(--mg-line);min-width:0}
.mg-gh{display:flex;flex-direction:column;gap:2px}.mg-gh b{font-size:14px}.mg-gh .mg-x{font-weight:600;color:var(--mg-ink2)}.mg-gh>span{font-size:12px;color:var(--mg-ink2)}
.mg-pills{display:flex;flex-wrap:wrap;gap:5px;margin-top:8px}
.mg-st{display:inline-flex;align-items:center;gap:5px;height:24px;padding:0 9px;border-radius:99px;font:650 11.5px var(--sans,system-ui);background:var(--mg-s3);color:var(--mg-ink2);white-space:nowrap}
.mg-st::before{content:"";width:7px;height:7px;border-radius:50%;background:var(--mg-mut)}
.mg-st.eval{color:var(--ink,inherit);background:color-mix(in srgb,var(--mg-acc) 16%,transparent)}.mg-st.eval::before{background:var(--mg-acc)}
.mg-st.pass{color:var(--ink,inherit);background:color-mix(in srgb,var(--mg-gold) 18%,transparent)}.mg-st.pass::before{background:var(--mg-gold)}
.mg-st.good{color:var(--ink,inherit);background:color-mix(in srgb,var(--mg-good) 14%,transparent)}.mg-st.good::before{background:var(--mg-good)}
.mg-st.pay{color:var(--ink,inherit);background:color-mix(in srgb,var(--mg-good) 26%,transparent)}.mg-st.pay::before{background:var(--mg-good);box-shadow:0 0 0 3px color-mix(in srgb,var(--mg-good) 30%,transparent)}
.mg-note{margin:6px 0 0;font-size:12px;line-height:1.4;color:var(--mg-ink2)}.mg-cap{margin:4px 0 0;font-size:11px;color:var(--mg-mut)}
.mg-kpis{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.mg-kpis.four{grid-template-columns:repeat(4,minmax(0,1fr));margin-top:8px}
@media (max-width:560px){.mg-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}.mg-kpis.four{grid-template-columns:repeat(2,minmax(0,1fr))}.mg-kpis>div:last-child:nth-child(odd){grid-column:1 / -1}}
.mg-kpis>div{padding:8px 10px;border-radius:12px;background:var(--mg-s2);min-width:0}.mg-kpis span{display:block;font-size:11.5px;color:var(--mg-mut)}
.mg-kpis b{display:block;font-size:17px;font-variant-numeric:tabular-nums;overflow-wrap:anywhere;color:var(--ink,inherit)}.mg-kpis b i{font-style:normal;font-size:12px;font-weight:500;color:var(--mg-mut)}
.mg-kpis b.good{color:var(--mg-good)}.mg-kpis b.bad{color:var(--mg-bad)}.mg-kpis em{display:block;font-style:normal;font-size:11px;color:var(--mg-mut);line-height:1.3}
.mg-goal{padding:12px 14px;border-radius:14px;border:1px solid var(--mg-line);background:var(--mg-surf);min-width:0}
.mg-goals.compact .mg-goal{padding:9px 0 4px;border:0;border-top:1px solid var(--mg-line);border-radius:0;background:none}
.mg-gt{display:flex;justify-content:space-between;align-items:flex-start;gap:8px}.mg-gt b{font-size:14px;line-height:1.35}
.mg-chip{flex:none;display:inline-flex;align-items:center;height:22px;padding:0 9px;border-radius:99px;font:700 11px var(--sans,system-ui);background:var(--mg-s3);color:var(--mg-ink2);white-space:nowrap}
.mg-chip.good{background:color-mix(in srgb,var(--mg-good) 16%,transparent);color:var(--mg-good)}.mg-chip.bad{background:color-mix(in srgb,var(--mg-bad) 16%,transparent);color:var(--mg-bad)}
.mg-big{display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;margin-top:4px}.mg-big b{font:750 26px/1.1 var(--sans,system-ui);letter-spacing:-.02em;font-variant-numeric:tabular-nums}.mg-big em{font-style:normal;font-size:13px;color:var(--mg-ink2)}
.mg-goals.compact .mg-big b{font-size:19px}
.mg-bar{position:relative;display:flex;gap:2px;height:10px;border-radius:99px;background:var(--mg-s3);margin:8px 0 4px;overflow:visible}
.mg-bar>i{display:block;height:100%;min-width:4px;border-radius:4px}.mg-bar>i:first-child{border-top-left-radius:99px;border-bottom-left-radius:99px}
.mg-seg.jobs,.mg-sw.jobs{background:var(--mg-jobs)}.mg-seg.kalshi,.mg-sw.kalshi{background:var(--mg-kal)}.mg-seg.prop,.mg-sw.prop{background:var(--mg-prop)}
.mg-fill{background:var(--mg-good)}.mg-fill.z{background:var(--mg-acc)}
.mg-bar u{position:absolute;top:-4px;width:2px;height:18px;margin-left:-1px;background:var(--ink,#eef1f8);opacity:.85;text-decoration:none;border-radius:1px}
.mg-scale{position:relative;display:flex;justify-content:space-between;font-size:11px;color:var(--mg-mut);height:16px}.mg-tlab{position:absolute;white-space:nowrap;color:var(--mg-ink2);font-weight:600;padding-left:4px}
.mg-tlab.end{transform:translateX(-100%);padding:0 4px 0 0}.mg-scale.mg-up{margin-top:6px;height:14px;background:none}.mg-scale.mg-up+.mg-bar{margin-top:2px}
.mg-legend{display:flex;flex-wrap:wrap;gap:6px 14px;margin-top:2px}.mg-lg{display:inline-flex;align-items:center;gap:6px;font-size:12.5px;color:var(--mg-ink2)}.mg-lg b{color:var(--ink,inherit);font-variant-numeric:tabular-nums}
.mg-sw{display:inline-block;width:10px;height:10px;border-radius:3px}
.mg-s{margin:8px 0 0;font-size:13px;line-height:1.5;color:var(--ink,inherit)}.mg-s.mut{color:var(--mg-ink2);font-size:12.5px}
.mg-src{margin:4px 0 0;padding:0 0 0 16px;font-size:11.5px;line-height:1.45;color:var(--mg-mut)}
.mg-form .mg-fgrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,280px),1fr));gap:10px}.mg-fgrid.three{margin-top:10px}
.mg-fbox{padding:12px;border-radius:12px;border:1px solid var(--mg-line);background:var(--mg-s2);display:flex;flex-direction:column;gap:8px;min-width:0}.mg-fbox h4{margin:0;font-size:13px}
.mg-form label{display:flex;flex-direction:column;gap:4px;font-size:12px;color:var(--mg-ink2);min-width:0}
.mg-form input:not([type=checkbox]){width:100%;min-height:38px;padding:6px 10px;border-radius:10px;border:1px solid var(--mg-line);background:var(--mg-surf);color:var(--ink,inherit);font:500 14px var(--sans,system-ui)}
.mg-row2{display:grid;grid-template-columns:1fr 1fr;gap:8px}.mg-row3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
@media (max-width:480px){.mg-row3{grid-template-columns:1fr 1fr}}
.mg-check{flex-direction:row!important;align-items:center;gap:8px!important;font-size:12.5px!important}
.mg-btn{align-self:flex-start;min-height:38px;padding:0 16px;border-radius:10px;border:1px solid var(--mg-line);background:var(--mg-s3);color:var(--ink,inherit);font:650 13px var(--sans,system-ui);cursor:pointer}
.mg-btn.primary{background:var(--mg-acc);border-color:var(--mg-acc);color:#fff}.mg-btn[disabled]{opacity:.5;cursor:wait}
.mg-more summary{cursor:pointer;font-size:13px;font-weight:650;color:var(--mg-acc);padding:6px 0}.mg-more>.mg-btn{margin-top:10px}
.mg-hist{list-style:none;margin:2px 0 0;padding:0;display:flex;flex-direction:column;gap:2px}.mg-hist li{display:flex;gap:10px;align-items:center;font-size:12.5px;color:var(--mg-ink2);padding:3px 0;border-top:1px dashed var(--mg-line)}
.mg-hist b{margin-left:auto;color:var(--ink,inherit);font-variant-numeric:tabular-nums}.mg-del{border:0;background:none;color:var(--mg-mut);font:500 11.5px var(--sans,system-ui);cursor:pointer;text-decoration:underline}
.mg-msg{margin:0;min-height:18px;font-size:13px}.mg-msg.good{color:var(--mg-good)}.mg-msg.bad{color:var(--mg-bad)}`;
  function css() {
    if (typeof document === 'undefined' || document.getElementById('mg-css')) return;
    const s = document.createElement('style'); s.id = 'mg-css'; s.textContent = CSS; document.head.appendChild(s);
  }
  window.MoneyUI = { card, goals, form, wire, pick, css, daysTo, version: 1 };
})();

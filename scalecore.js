// Scaling plan: the one renderer shared by the phone app (tools/web_public/scale.js) and the PC dashboard
// (web_next/js/next/scale.js loads web_next/js/next/scalecore.js, a byte-identical copy: tests/test_scale_plan.py checks it).
// Classic script: window.ScaleUI.render(el, S). S = engine/scale_plan.py status (data.json "scale" / GET /api/next/scale):
// where the owner is on the ladder (2 -> 4 -> 6 -> 8 -> 10 accounts, LIT + ATLAS), the next step, its trigger and progress,
// the ladder table ($ a month 2026-like and 2025-like, fees, risk at once, eval $ and months to get there). Read-only.
(function () {
  'use strict';
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const n0 = (v, d = 0) => (v == null || isNaN(v)) ? '—' : Number(v).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
  const usd = (v) => (v == null || isNaN(v)) ? '—' : (v < 0 ? '-' : '') + '$' + Math.abs(Math.round(v)).toLocaleString('en-US');
  const sgn = (v) => (v == null || isNaN(v)) ? '—' : (v > 0 ? '+' : '') + usd(v);
  const C = { good: 'var(--good,#22c55e)', bad: 'var(--bad,#ef5350)', warn: 'var(--warn,#d4a72c)', mut: 'var(--muted,#8a93a6)', line: 'var(--line,rgba(140,150,170,.25))', acc: 'var(--accent,#6aa9ff)' };
  const STAGE = { planned: ['planned', C.mut], eval: ['eval', C.acc], passed: ['passed', C.good], funded: ['funded', C.good], failed: ['failed: buy again', C.bad], lost: ['lost', C.bad], closed: ['closed', C.mut] };
  const card = (h, body, cls) => `<div class="sc-card ${cls || ''}">${h ? `<h3>${h}</h3>` : ''}${body}</div>`;

  function curve(S) {
    const cv = S.curve || {}, h2 = (cv.H2 || {}).cum_med, p10 = (cv.H2 || {}).cum_p10, bad = (cv['2025'] || {}).cum_med;
    if (!Array.isArray(h2) || !h2.length) return '';
    const W = 480, H = 200, P = { l: 58, r: 10, t: 10, b: 24 };
    const all = [...h2, ...(p10 || []), ...(bad || []), 0];
    const y0 = Math.min(...all), y1 = Math.max(...all), n = h2.length;
    const X = (i) => P.l + (W - P.l - P.r) * i / Math.max(1, n - 1), Y = (y) => P.t + (H - P.t - P.b) * (1 - (y - y0) / ((y1 - y0) || 1));
    const line = (a, col, dash) => Array.isArray(a) && a.length ? `<path d="${a.map((v, i) => (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(v).toFixed(1)).join(' ')}" fill="none" stroke="${col}" stroke-width="2" ${dash ? 'stroke-dasharray="5 4"' : ''}/>` : '';
    const yt = [y0, (y0 + y1) / 2, y1];
    return `<svg class="sc-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="money over 24 months on the ladder">
      ${yt.map((y) => `<line x1="${P.l}" x2="${W - P.r}" y1="${Y(y).toFixed(1)}" y2="${Y(y).toFixed(1)}" stroke="${C.line}"/><text x="${P.l - 6}" y="${(Y(y) + 3).toFixed(1)}" text-anchor="end" class="sc-ax">${esc(usd(y))}</text>`).join('')}
      <line x1="${P.l}" x2="${W - P.r}" y1="${Y(0).toFixed(1)}" y2="${Y(0).toFixed(1)}" stroke="${C.mut}"/>
      ${[0, 6, 12, 18, 23].filter((i) => i < n).map((i) => `<text x="${X(i).toFixed(1)}" y="${H - 7}" text-anchor="middle" class="sc-ax">m${i + 1}</text>`).join('')}
      ${line(p10, C.warn, true)}${line(bad, C.bad, true)}${line(h2, C.good)}</svg>
      <div class="sc-leg"><span><i style="background:${C.good}"></i>2026-like (Jul-Oct trades), median path</span><span><i style="background:${C.warn}"></i>2026-like, bad 1 in 10</span><span><i style="background:${C.bad}"></i>2025-like, median path</span></div>`;
  }

  function hero(S) {
    const nx = S.next || {};
    const pr = Math.max(0, Math.min(100, Number(nx.progress) || 0));
    const col = nx.ready ? C.good : pr >= 50 ? C.acc : C.warn;
    const conds = (nx.conditions || []).map((c) => `<li class="${c.ok ? 'ok' : 'no'}"><b>${c.ok ? '✓' : '·'}</b><span>${esc(c.label)}</span><em>${c.money ? usd(c.have) + ' / ' + usd(c.need) : n0(c.have) + ' / ' + n0(c.need)}</em>${c.note ? `<small>${esc(c.note)}</small>` : ''}</li>`).join('');
    return `<div class="sc-card sc-hero" style="border-color:${col}">
      <div class="sc-eyebrow">Scaling plan · step ${n0(S.step)} of ${n0(S.of)}${S.step_done === false ? ' (in progress)' : ''}</div>
      <div class="sc-big">${esc(S.sentence || '')}</div>
      ${nx.action ? `<div class="sc-next"><span>Next</span><b>${esc(nx.action)}</b>${nx.when ? `<em>when ${esc(nx.when)}</em>` : ''}</div>` : ''}
      <div class="sc-prog" aria-label="progress ${pr}%"><i style="width:${pr}%;background:${col}"></i></div><div class="sc-pl">${pr}% ${nx.ready ? '· ready: all conditions met' : ''}</div>
      ${conds ? `<ul class="sc-conds">${conds}</ul>` : ''}
      ${nx.usd_month_h2 != null ? `<p class="sc-note">At that step: about ${usd(nx.usd_month_h2)} a month on 2026-like trades (Jul-Oct), ${sgn(nx.usd_month_2025)} on 2025-like trades.</p>` : ''}</div>`;
  }

  function ladder(S) {
    const T = S.table || [], cur = S.step_done === false ? -1 : Number(S.step);
    const rows = T.map((r) => `<div class="sc-rung ${r.step === cur ? 'cur' : r.step < cur ? 'done' : ''}">
      <div class="sc-rn">${r.step}</div><div class="sc-rb"><b>${n0(r.accounts)} accounts</b> <span class="sc-mut">LIT ${n0(r.lit)} · ATLAS ${n0(r.atlas)}</span>
        <div class="sc-act">${esc(r.step === 0 ? 'Today: ' + (r.action || '') : r.action || '')}</div>
        ${r.step ? `<div class="sc-mut sc-small">when ${esc(r.trigger_text || '')}</div>` : ''}
        <div class="sc-kv"><span>2026-like<b class="sc-up">${usd(r.usd_month_h2)}/mo</b></span><span>2025-like<b class="${r.usd_month_2025 > 0 ? '' : 'sc-dn'}">${sgn(r.usd_month_2025)}/mo</b></span>
          <span>gets there<b>${r.step ? n0(r.months_h2, 1) + ' mo' : 'now'}</b></span><span>evals to get there<b>${usd(r.fees_to_reach_h2)}</b></span>
          <span>at risk at once<b>${usd((r.risk || {}).typical)}–${usd((r.risk || {}).ladder)}</b></span></div></div></div>`).join('');
    return card('The ladder', rows + `<p class="sc-note">$ a month = once at that step (months 7-12 of holding it): payouts to you minus re-buy fees. 2026-like = the Jul-Oct 2026 trades (the half to quote); 2025-like = the same rules on 2025's trades. "Gets there" = median months on 2026-like trades; in a 2025-like year the payout triggers hold the ladder back on its own.</p>`);
  }

  function table(S) {
    const T = S.table || [];
    if (!T.length) return '';
    const h = ['Accounts', '$/mo 2026-like', '$/mo H1 2026', '$/mo 2025-like', '$/mo 2021-24', 'Re-buy fees/mo', 'Bad month (1 in 10)', 'Months ≤ $0', 'Risk at once typical / worst', 'Evals to get there', 'Months to get there', 'Reached in 24 mo: 2026 / 2025-like'];
    const tr = T.map((r) => `<tr><td><b>${n0(r.accounts)}</b> <span class="sc-mut">(step ${r.step})</span></td><td class="sc-up">${usd(r.usd_month_h2)}</td><td>${usd(r.usd_month_h1)}</td><td>${sgn(r.usd_month_2025)}</td><td>${sgn(r.usd_month_2021_24)}</td>
      <td>${usd(r.fees_month_h2)} <span class="sc-mut">(${usd(r.fees_month_2025)})</span></td><td>${sgn(r.month_p10_h2)}</td><td>${n0(r.month_le0_h2)}% <span class="sc-mut">(${n0(r.month_le0_2025)}%)</span></td>
      <td>${usd((r.risk || {}).typical)} / ${usd((r.risk || {}).ladder)}</td><td>${usd(r.fees_to_reach_h2)}</td><td>${r.step ? n0(r.months_h2, 1) + (r.months_h2_iqr ? ` <span class="sc-mut">(${n0(r.months_h2_iqr[0], 1)}-${n0(r.months_h2_iqr[1], 1)})</span>` : '') : '0'}</td>
      <td>${n0(r.reach_24m_h2)}% / ${n0(r.reach_24m_2025)}%</td></tr>`).join('');
    return card('Accounts 2 / 4 / 6 / 8 / 10', `<div class="sc-tw"><table class="sc-t"><thead><tr>${h.map((x) => `<th>${esc(x)}</th>`).join('')}</tr></thead><tbody>${tr}</tbody></table></div>
      <p class="sc-note">Fees: every plan is a one-time eval ($0 a month subscription, $0 activation; NinjaTrader and data free); the fee column is the expected re-buys (2025-like in brackets). Risk at once: typical = every account's median trade together; worst = the earlier accounts funded at their 1-in-20 trade + the two newest evals at their biggest trade. Cap across accounts: ${usd(S.day_cap_usd)} at risk at the same time.</p>`);
  }

  function accounts(S) {
    const A = S.accounts || [];
    if (!A.length) return '';
    return card('Your accounts', A.map((a) => { const s = STAGE[a.stage] || [a.stage, C.mut]; return `<div class="sc-acc"><b>${esc(a.strategy)}</b><span>${esc(a.label || a.plan || '')}</span><i style="color:${s[1]};border-color:${s[1]}">${esc(s[0])}</i></div>`; }).join('')
      + `<p class="sc-note">From research/props/business.json${S.source && /PC/.test(S.source) ? ' + the PC bot (LIT eval, extra accounts, account B)' : ''}. Cash for evals now: ${usd((S.money || {}).cash)} (budget ${usd((S.money || {}).budget)} + payouts ${usd((S.money || {}).payouts)} − fees ${usd((S.money || {}).fees)}).</p>`);
  }

  function rules(S) {
    const li = [
      `One bot, many accounts: LIT copies through engine/multi_account.py (built, OFF), ATLAS on its own account (engine/account_b.py, built, OFF). An ATLAS copy on a 2nd account is not built yet (step 2).`,
      'Never opposite positions across your own accounts: ATLAS waits while LIT holds or arms the other side, and is closed when LIT enters against it.',
      `Total $ at risk at the same time across all accounts: at most ${usd(S.day_cap_usd)}; above it every account of that signal is cut by the same factor (min 1 micro). One bad day across all accounts: stop new entries once the day's loss reaches ${usd(S.day_cap_usd)}.`,
      'Per firm: MFFU 1 funded Builder 50K + 2 funded Builder 25Ks (LIT once, ATLAS once there); Lucid bots and copiers allowed, 5 funded per household (sources say 5 or 10: the plan keeps 4); FundedNext copying your own accounts allowed, no futures cap found. Max contracts per plan: MFFU 25K 20 micros, 50Ks 40.',
      'Buy two accounts a week apart (they should not pass or fail on the same days). Grow from payouts: the cash rule keeps the ladder self-funding after the first $300.',
    ];
    return card('Rules of the ladder', `<ul class="sc-ul">${li.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`);
  }

  function honest(S) {
    const H = S.honest || [];
    return H.length ? card('Be honest about it', `<ul class="sc-ul">${H.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`) : '';
  }

  const CSS = `.sc-card{border:1px solid ${C.line};border-radius:14px;padding:14px 16px;margin:0 0 12px;background:color-mix(in srgb,${C.line} 18%,transparent);min-width:0}.sc-card h3{margin:0 0 10px;font-size:14px}
.sc-hero{border-width:1.5px}.sc-eyebrow{font-size:11.5px;letter-spacing:.04em;text-transform:uppercase;opacity:.7}.sc-big{font-size:18px;font-weight:700;line-height:1.35;margin:6px 0 10px}
.sc-next{display:flex;flex-direction:column;gap:2px;margin:0 0 10px}.sc-next span{font-size:11.5px;opacity:.7}.sc-next em{font-style:normal;font-size:12.5px;opacity:.8}
.sc-prog{height:12px;border-radius:6px;background:${C.line};overflow:hidden}.sc-prog i{display:block;height:12px;border-radius:6px}.sc-pl{font-size:12px;opacity:.8;margin:4px 0 8px}
.sc-conds{list-style:none;margin:0;padding:0}.sc-conds li{display:grid;grid-template-columns:16px 1fr auto;gap:8px;padding:6px 0;border-bottom:1px solid ${C.line};font-size:13px;align-items:baseline}.sc-conds li:last-child{border-bottom:0}
.sc-conds li.ok b{color:${C.good}}.sc-conds li.no b{color:${C.warn}}.sc-conds em{font-style:normal;white-space:nowrap}.sc-conds small{grid-column:2/4;opacity:.7}
.sc-note{margin:8px 0 0;font-size:12.5px;line-height:1.5;opacity:.78}.sc-mut{opacity:.65}.sc-small{font-size:12px;margin-top:2px}.sc-up{color:${C.good}}.sc-dn{color:${C.bad}}
.sc-rung{display:grid;grid-template-columns:34px 1fr;gap:10px;padding:10px 0;border-bottom:1px solid ${C.line}}.sc-rung:last-of-type{border-bottom:0}.sc-rn{width:30px;height:30px;border-radius:50%;border:1.5px solid ${C.line};display:flex;align-items:center;justify-content:center;font-weight:700}
.sc-rung.cur .sc-rn{border-color:${C.acc};background:color-mix(in srgb,${C.acc} 25%,transparent)}.sc-rung.done .sc-rn{border-color:${C.good};color:${C.good}}.sc-rb{min-width:0}.sc-act{font-size:13px;margin-top:3px;line-height:1.4}
.sc-kv{display:grid;grid-template-columns:repeat(auto-fit,minmax(118px,1fr));gap:6px;margin-top:8px}.sc-kv span{border:1px solid ${C.line};border-radius:10px;padding:6px 8px;font-size:11.5px;opacity:.92;min-width:0}.sc-kv b{display:block;font-size:14.5px;margin-top:1px}
.sc-tw{overflow-x:auto;max-width:100%}.sc-t{border-collapse:collapse;font-size:12.5px;min-width:100%}.sc-t th,.sc-t td{padding:6px 8px;border-bottom:1px solid ${C.line};text-align:left;white-space:nowrap}.sc-t th{font-weight:600;opacity:.8;white-space:normal;min-width:70px;vertical-align:bottom}
.sc-acc{display:grid;grid-template-columns:52px 1fr auto;gap:8px;align-items:center;padding:7px 0;border-bottom:1px solid ${C.line};font-size:13px}.sc-acc i{font-style:normal;font-size:11.5px;border:1px solid;border-radius:999px;padding:1px 8px;white-space:nowrap}
.sc-ul{margin:0;padding-left:18px;font-size:13px;line-height:1.5}.sc-ul li{margin:0 0 6px}.sc-svg{width:100%;max-width:820px;height:auto;display:block}.sc-ax{font-size:10.5px;fill:${C.mut}}
.sc-leg{display:flex;gap:12px;flex-wrap:wrap;font-size:12px;opacity:.85;margin-top:6px}.sc-leg i{display:inline-block;width:14px;height:8px;border-radius:2px;margin-right:6px;vertical-align:middle}`;
  function css() { if (!document.getElementById('sc-css')) { const s = document.createElement('style'); s.id = 'sc-css'; s.textContent = CSS; document.head.appendChild(s); } }

  function render(el, S) {
    css();
    if (!el) return;
    if (!S || S.error) { el.innerHTML = card('', `<b>No scaling plan in this build</b><p class="sc-note">${esc((S && S.error) || 'The next build adds it (tools/scale_plan.py -> research/second/scale.json).')}</p>`); return; }
    el.innerHTML = hero(S) + ladder(S) + card('Money on the ladder, 24 months (after every fee)', curve(S)) + table(S) + accounts(S) + rules(S) + honest(S)
      + `<p class="sc-note">Paper research (tools/scale_plan.py, ${esc(S.plan_built || '')}; write-up ${esc(S.writeup || 'research/writeups/scale-plan.md')}). Nothing here trades or arms anything.</p>`;
  }
  window.ScaleUI = { render, version: 1 };
})();

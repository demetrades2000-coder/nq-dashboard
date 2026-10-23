// System > AI watch (phone; loaded by index.html with one <script defer> after alerts.js; read-only):
// what the PC bot watches about itself (engine/ai_watch.py): anomalies (price spike / bad tick, feed frozen in a trade,
// slow route), drift per strategy (LIT and account B vs the backtest's expected range, execution), both accounts' loss
// today / this week, the rule-change log (who / when / why) and the switches (the two blocks are OFF by default).
// Data: data.json / live.json live.pc.ai (the PC heartbeat's "ai" block). Classic script using the page's helpers.
(function () {
  'use strict';
  if (typeof GROUPS === 'undefined' || typeof VIEWS === 'undefined') return;
  const E = (s) => (typeof esc === 'function' ? esc(s) : String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])));
  const ok = (v) => v != null && v !== '' && !Number.isNaN(+v);
  const m$ = (v) => (!ok(v) ? '—' : (v > 0 ? '+' : v < 0 ? '−' : '') + '$' + Math.round(Math.abs(v)).toLocaleString('en-US'));
  const ET = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  const hm = (t) => (ok(t) ? ET.format(new Date(t * 1000)) : '—');
  const LV = { good: ['in range', 'good'], warn: ['watch', 'warn'], bad: ['investigate', 'bad'] };
  const SW = [['anomaly_pause', 'Anomaly pause', 'no new entry 15 min after a spike / bad tick, and while the feed is frozen in a trade', 'live_model.json "guards": {"anomaly_pause": true}'],
    ['combined_loss', 'Both-accounts loss cap', 'no new entry on LIT or account B at −$1,500 today / −$3,000 this week together', 'live_model.json "guards": {"combined_loss": true}']];

  function view(el) {
    const A = (typeof D !== 'undefined' && D && D.live && D.live.pc && D.live.pc.ai) || null;
    const h = typeof head === 'function' ? head('System · AI watch', 'AI watch', 'Anomalies, drift vs the backtest, both accounts, rule changes') : '<h2>AI watch</h2>';
    if (!A) { el.innerHTML = h + '<div class="card"><b>No AI-watch data yet.</b><div class="small mut">The PC bot sends it with its heartbeat once it runs (engine/ai_watch.py).</div></div>'; return; }
    const lo = A.loss || {};
    const dr = (A.drift || []).map((d) => { const L = LV[d.level] || ['too early', '']; return `<div class="row"><span><b>${E(d.strategy)}</b> <span class="chip ${L[1]}">${L[0]}</span><span class="small mut">${E(d.text || d.error || '')}</span></span></div>`; }).join('');
    const an = (A.anomalies || []).slice().reverse().map((a) => `<div class="row"><span><b>${E(a.what)}</b><span class="small mut">${hm(a.t)} ET · ${E(a.text)}</span></span></div>`).join('');
    const rc = (A.rule_changes || []).slice().reverse().map((r) => `<div class="row"><span><b>${E((r.changes || []).slice(0, 2).join('; '))}</b><span class="small mut">${hm(r.t)} ET on the PC${r.commit ? ' · ' + E(r.commit.who || '') + ': ' + E(String(r.commit.why || '').slice(0, 80)) : ''}</span></span></div>`).join('');
    const gl = (A.rule_log || []).map((c) => `<div class="row"><span><b>${E(c.why)}</b><span class="small mut">${E(String(c.when || '').replace('T', ' '))} · ${E(c.who)} · ${E((c.changes || []).slice(0, 2).join('; '))}${c.n > 2 ? ` (+${c.n - 2})` : ''}</span></span></div>`).join('');
    const sw = SW.map(([k, l, d, how]) => { const on = !!(A.switches || {})[k]; return `<div class="row"><span><b>${l}</b> <span class="chip ${on ? 'bad' : ''}">${on ? 'ON' : 'off'}</span><span class="small mut">${d}. Switch: ${E(how)}</span></span></div>`; }).join('');
    const b = A.acct_b;
    el.innerHTML = h + `${A.freeze ? `<div class="card" style="border-color:var(--bad,#e5484d)"><b>FEED FROZEN in a trade</b><div class="small mut">${E(A.freeze.text)}. The broker stop / target still protect it.</div></div>` : ''}
      <div class="card"><b>Both accounts</b><div class="row"><span>Today</span><b>${m$(lo.total)}</b></div><div class="row"><span class="small mut">LIT ${m$(lo.lit)} · account B ${m$(lo.b)}</span></div><div class="row"><span>This week</span><b>${m$(lo.week)}</b></div>
        ${b ? `<div class="row"><span class="small mut">${E(b.label || 'Account B')} ${b.problem ? '· ' + E(b.problem) : `room $${Math.round(+b.room || 0).toLocaleString('en-US')} · ${E(b.status || '')}`}</span></div>` : ''}</div>
      <div class="card"><b>Drift: live vs the backtest range</b>${dr || '<div class="small mut">No verdict yet.</div>'}</div>
      <div class="card"><b>Anomalies</b>${an || '<div class="small mut">None logged.</div>'}</div>
      <div class="card"><b>Rule changes · who / when / why</b>${rc}${gl || (rc ? '' : '<div class="small mut">No change found.</div>')}</div>
      <div class="card"><b>Switches</b>${sw}<div class="small mut">Alerts are on (Settings > Alert levels: anomaly, freeze, drift, loss_cap, rules_change). Blocks are off until switched on. Updated ${hm(A.t)} ET.</div></div>`;
  }
  function install() {
    const G = GROUPS.find((g) => g.id === 'system') || GROUPS[GROUPS.length - 1];
    if (!G) return;
    if (!G.pages.some((p) => p[0] === 'aiwatch')) G.pages.push(['aiwatch', 'AI watch', 'radar', 'Anomalies, drift, both accounts, rule changes']);
    PAGES.aiwatch = { id: 'aiwatch', label: 'AI watch', icon: 'radar', desc: 'Anomalies, drift, both accounts, rule changes', group: G.id };
    VIEWS.aiwatch = view;
    if (typeof ALIAS !== 'undefined') Object.assign(ALIAS, { ai: 'aiwatch', drift: 'aiwatch', anomalies: 'aiwatch', rulelog: 'aiwatch' });
    if (typeof nav === 'function') { nav(); if (typeof route === 'function' && /^#\/(aiwatch|ai|drift)\b/.test(location.hash)) route(); }
  }
  install();
})();

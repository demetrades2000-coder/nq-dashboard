// Trades > Trade intel (phone; loaded by index.html with one <script defer>; read-only):
//   the win / loss signs summary and the top consistent signs from data.json "intel" (tools/trade_intel.py compact), then
//   on demand the full intel.json (every trade from every source with ~60 columns, every feature's buckets) for the
//   filters, the trade list (a tap opens the trade's report sheet when the backtest has one) and the bucket tables.
// Classic script that uses the main page's helpers (D, VIEWS, GROUPS, PAGES, head, esc, usd, fR, num, cls, segHTML, onSeg).
(function () {
  'use strict';
  if (typeof GROUPS === 'undefined' || typeof VIEWS === 'undefined') return;
  const S = { tab: 'signs', src: 'all', span: 'all', out: 'all', sort: 'entry_t', dir: -1, n: 60, feat: null };
  let FULL = null, FP = null, ROWS = null;
  const susd = (v) => (v == null ? '—' : (v > 0 ? '+' : '') + usd(v));
  const G = () => (typeof D !== 'undefined' && D && D.intel) || null;

  function loadFull() {
    const I = G();
    if (!I) return Promise.reject(new Error('No trade intel in this build'));
    if (!FP) FP = fetch((I.full || 'intel.json') + '?v=' + encodeURIComponent(D.built || '')).then((r) => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then((d) => { FULL = d; const k = d.cols.map((c) => c.key); ROWS = d.rows.map((a) => Object.fromEntries(k.map((x, i) => [x, a[i]]))); return d; })
      .catch((e) => { FP = null; throw e; });
    return FP;
  }
  const bst = (s) => !s || !s.n ? '<td class="mut" colspan="3">—</td>' : `<td class="mono">${s.n}</td><td class="mono ${cls(s.avg_r)}">${fR(s.avg_r)}</td><td class="mono ${cls(s.net)}">${susd(s.net)}</td>`;
  const btable = (s) => `<div class="tblwrap" style="overflow-x:auto"><table class="tbl"><thead><tr><th>Bucket</th><th colspan="3">2026 H1</th><th colspan="3">2026 H2</th><th colspan="3">2021-25</th></tr>
      <tr><th></th>${'<th>n</th><th>avg</th><th>$</th>'.repeat(3)}</tr></thead>
      <tbody>${(s.buckets || []).map((b) => `<tr><td>${esc(b.label)}</td>${bst(b.H1)}${bst(b.H2)}${bst(b['2021-25'])}</tr>`).join('')}</tbody></table></div>`;

  function signsHTML(I) {
    const sm = I.summary || {}, g = sm.groups || {};
    const li = (a) => (a || []).map((w) => `<li>${esc(w.text)}${w.held_5y ? ' <span class="up">· holds 2021-25</span>' : ''}</li>`).join('') || '<li class="mut">none</li>';
    const signs = FULL ? FULL.signs : I.top;
    return `<div class="card" style="border-color:color-mix(in srgb,var(--warn) 50%,transparent)"><b>Read this first</b><div class="note">${esc(sm.warning || '')}</div>
        <div class="note">Tested as rules in: ${(sm.writeups || []).map((w) => `<a href="#/writeup/${encodeURIComponent('lit-' + w.slug.replace(/^lit-/, ''))}">${esc(w.slug)}</a>`).join(' · ')}</div></div>
      <div class="stats">${statBox('Consistent signs', `${sm.n_consistent ?? '—'} / ${sm.n_features ?? '—'}`, `same side better in H1 and H2 by ≥ ${sm.min_gap}R`)}
        ${statBox('By chance', String(sm.chance ?? '—'), 'shuffled outcomes')}
        ${statBox('+1R then gave back', String(g.gave_back?.n ?? '—'), '2026 · ' + susd(g.gave_back?.net))}
        ${statBox('Clean wins', String(g.clean_win?.n ?? '—'), '2026 · ' + susd(g.clean_win?.net), 'up')}</div>
      <div class="grid g2 astart"><div class="card"><h3>What winners have in common</h3><ul class="list">${li(sm.winners)}</ul></div>
        <div class="card"><h3>What losers have in common</h3><ul class="list">${li(sm.losers)}</ul></div></div>
      ${secH(FULL ? 'Every feature' : 'Top consistent signs', FULL ? '' : '<button class="chipbtn" type="button" id="tiFull"><span>All features</span></button>')}
      ${(signs || []).map((s) => `<details class="card"${s.consistent || !FULL ? '' : ''}><summary><b>${esc(s.label)}</b> <span class="${s.consistent !== false ? 'up' : 'mut'}">· ${esc(s.why || '')}</span>${s.held_5y == null ? '' : s.held_5y ? ' <span class="up">· holds 2021-25</span>' : ' <span class="mut">· not in 2021-25</span>'}</summary>
        ${btable(s)}</details>`).join('')}`;
  }
  function listHTML() {
    if (!ROWS) return skel(3);
    let R = ROWS.filter((r) => (S.src === 'all' || r.source === S.src) && (S.span === 'all' || r.span === S.span) && (S.out === 'all' || r.outcome === S.out));
    const k = S.sort;
    R = R.slice().sort((a, b) => ((a[k] ?? -1e18) > (b[k] ?? -1e18) ? 1 : (a[k] ?? -1e18) < (b[k] ?? -1e18) ? -1 : 0) * S.dir);
    const net = R.reduce((s, r) => s + (r.pnl || 0), 0), w = R.filter((r) => (r.pnl || 0) > 0).length;
    return `<div class="stats">${statBox('Trades', R.length)}${statBox('Net', susd(net), 'costs in', cls(net))}${statBox('Win %', R.length ? pct(100 * w / R.length) : '—', '$ > 0')}</div>
      <div class="row-btns" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px">${segHTML('tiSort', [['entry_t', 'Newest'], ['r', 'R'], ['pnl', '$'], ['stop_pts', 'Stop'], ['mfe', 'MFE']], S.sort, 'sm')}</div>
      <div class="card" style="padding:0">${R.slice(0, S.n).map((r) => `<button type="button" class="ti-row" data-k="${esc(r.source)}|${r.entry_t}">
          <span class="ti-a"><b>${esc(r.day)}</b> <span class="mut">${esc(r.entry_hm || '')} · ${esc(r.source)}</span><br><span class="${r.side === 'LONG' ? 'up' : 'dn'}">${esc(r.side || '')}</span> · ${esc(r.lvl_type || r.session || '')} · ${r.stop_pts != null ? num(r.stop_pts, 1) + ' pts' : ''} · ${esc(r.exit || '')}</span>
          <span class="ti-b"><b class="${cls(r.r)}">${fR(r.r)}</b><br><span class="${cls(r.pnl)}">${susd(r.pnl)}</span></span></button>`).join('') || emptyBox('No trades match.')}</div>
      ${R.length > S.n ? `<button class="btn" type="button" id="tiMore" style="width:100%;margin-top:8px">Show more (${R.length - S.n} left)</button>` : ''}`;
  }
  function detail(r) {
    const C = FULL.cols.filter((c) => c.group !== 'id');
    const body = `<div class="nums">${C.map((c) => { let v = r[c.key]; v = v == null ? '—' : c.kind === 'bool' ? (v ? 'yes' : 'no') : c.kind === 'num' ? num(v, Math.abs(v) >= 100 || Number.isInteger(v) ? 0 : 2) : esc(String(v));
      return `<div><span>${esc(c.label)}${c.when === 'after' ? ' · after' : ''}</span><b>${v}</b></div>`; }).join('')}</div>`;
    const t = r.source === 'backtest' ? (D.trades || []).find((x) => x.day === r.day && x.entry_t === r.entry_t) : null;
    const w = sheet(`<div><div class="eyebrow">${esc(r.day)} · ${esc(r.entry_hm || '')} ET · ${esc(r.source)}</div><h3>${esc(r.side || '')} · ${esc(r.exit || '')}</h3></div>
      <div class="sh-res"><b class="${cls(r.r)}">${fR(r.r)}</b><span class="${cls(r.pnl)}">${susd(r.pnl)}</span></div>`, body,
      t ? '<button class="btn primary" type="button" id="tiRep">Report + chart</button>' : '', 'Trade intel');
    const b = (w && w.querySelector ? w : document).querySelector('#tiRep');
    if (b && t) b.onclick = () => { closeSheet(); setTimeout(() => openSheet(t), 240); };
  }
  function scatterHTML() {
    if (!ROWS) return skel(2);
    const R = ROWS.filter((r) => r.mfe != null && r.mae != null && (S.span === 'all' || r.span === S.span) && (S.src === 'all' || r.source === S.src));
    const W = 360, H = 300, P = 30, xm = Math.max(1.2, ...R.map((r) => r.mae)), ym = Math.max(2, ...R.map((r) => Math.min(r.mfe, 10)));
    const X = (v) => P + (W - P - 8) * Math.min(v, xm) / xm, Y = (v) => H - P - (H - P - 8) * Math.min(v, ym) / ym;
    const col = { win: 'var(--good)', loss: 'var(--bad)', scratch: 'var(--warn)' };
    return `<div class="card"><h3>MFE vs MAE · ${R.length} trades</h3><svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto" role="img" aria-label="MFE vs MAE">
      <line x1="${P}" y1="${H - P}" x2="${W - 8}" y2="${H - P}" stroke="var(--line)"/><line x1="${P}" y1="8" x2="${P}" y2="${H - P}" stroke="var(--line)"/>
      <line x1="${P}" x2="${W - 8}" y1="${Y(1)}" y2="${Y(1)}" stroke="var(--warn)" stroke-dasharray="4 4"/><text x="${W - 10}" y="${Y(1) - 4}" font-size="10" text-anchor="end" fill="var(--warn)">+1R</text>
      <text x="${W / 2}" y="${H - 6}" font-size="10" text-anchor="middle" fill="var(--muted)">MAE (R) → ${num(xm, 1)}</text><text x="10" y="${H / 2}" font-size="10" text-anchor="middle" fill="var(--muted)" transform="rotate(-90 10 ${H / 2})">MFE (R) → ${num(ym, 0)}</text>
      ${R.map((r) => `<circle cx="${X(r.mae).toFixed(1)}" cy="${Y(r.mfe).toFixed(1)}" r="${r.source === 'backtest' ? 2.6 : 4.5}" fill="${col[r.outcome] || 'gray'}" fill-opacity="${r.span === '2021-25' ? 0.3 : 0.8}"/>`).join('')}</svg>
      <div class="note"><span class="up">●</span> win <span style="color:var(--warn)">●</span> scratch <span class="dn">●</span> loss. Above the dashed line = reached +1R (breakeven moves there); not green there = gave it back.</div></div>`;
  }
  function view(el) {
    const I = G();
    el.innerHTML = head('Trades · intel', 'Trade intel', 'Every LIT trade (backtest, paper, live) with ~60 facts, and what winners and losers have in common. Judged on 2026 H1 (picked) and H2 (check); 2021-25 is a reference.');
    if (!I) { el.insertAdjacentHTML('beforeend', emptyBox('No trade intel in this build.', 'Run python -X utf8 tools/trade_intel.py on the PC.')); return; }
    const T = I.totals || {};
    const tl = (k, l) => T[k] && T[k].n ? statBox(l, T[k].n, `${susd(T[k].net)} · PF ${T[k].pf == null ? '—' : num(T[k].pf, 2)}`, cls(T[k].net)) : '';
    el.insertAdjacentHTML('beforeend', `<div class="stats">${tl('H1', '2026 H1')}${tl('H2', '2026 H2')}${tl('2021-25', '2021-25')}${tl('paper', 'Paper')}${tl('live', 'Live')}</div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin:8px 0">${segHTML('tiTab', [['signs', 'Signs'], ['list', 'Trades'], ['scatter', 'MFE / MAE']], S.tab)}</div>
      ${S.tab !== 'signs' ? `<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px">${segHTML('tiSrc', [['all', 'All'], ['backtest', 'Backtest'], ['paper', 'Paper'], ['live', 'Live']], S.src, 'sm')}
        ${segHTML('tiSpan', [['all', 'All'], ['H1', 'H1'], ['H2', 'H2'], ['2021-25', '21-25']], S.span, 'sm')}${S.tab === 'list' ? segHTML('tiOut', [['all', 'Any'], ['win', 'Wins'], ['scratch', 'Scratch'], ['loss', 'Losses']], S.out, 'sm') : ''}</div>` : ''}
      <div id="tiBody">${S.tab === 'signs' ? signsHTML(I) : S.tab === 'list' ? listHTML() : scatterHTML()}</div>`);
    onSeg('tiTab', (v) => { S.tab = v; view(el); });
    onSeg('tiSrc', (v) => { S.src = v; view(el); }); onSeg('tiSpan', (v) => { S.span = v; view(el); }); onSeg('tiOut', (v) => { S.out = v; view(el); });
    onSeg('tiSort', (v) => { S.dir = S.sort === v ? -S.dir : -1; S.sort = v; view(el); });
    const more = el.querySelector('#tiMore'); if (more) more.onclick = () => { S.n += 100; view(el); };
    const fb = el.querySelector('#tiFull'); if (fb) fb.onclick = () => { fb.disabled = true; loadFull().then(still(() => view(el))).catch(still((e) => el.insertAdjacentHTML('beforeend', failBox(e)))); };
    el.querySelectorAll('.ti-row').forEach((b) => b.addEventListener('click', () => { const [s, t] = b.dataset.k.split('|'); const r = ROWS.find((x) => x.source === s && String(x.entry_t) === t); if (r) detail(r); }));
    if (S.tab !== 'signs' && !ROWS) loadFull().then(still(() => view(el))).catch(still((e) => el.insertAdjacentHTML('beforeend', failBox(e))));
  }
  const CSS = `.ti-row{display:flex;justify-content:space-between;gap:10px;width:100%;padding:10px 12px;border:0;border-bottom:1px solid var(--line);background:none;color:inherit;text-align:left;font:inherit;font-size:13px;line-height:1.45;cursor:pointer}
.ti-row:last-child{border-bottom:0}.ti-b{text-align:right;white-space:nowrap;font-family:var(--mono)}details.card summary{cursor:pointer;font-size:13.5px;line-height:1.45}details.card[open] summary{margin-bottom:8px}`;
  function install() {
    const Gr = GROUPS.find((g) => g.id === 'trades'); if (!Gr) return;
    if (!Gr.pages.some((p) => p[0] === 'intel')) Gr.pages.splice(1, 0, ['intel', 'Trade intel', 'learned', 'Every trade with ~60 facts: what winners and losers have in common']);
    PAGES.intel = { id: 'intel', label: 'Trade intel', icon: 'learned', desc: 'Every trade with ~60 facts', group: 'trades' };
    VIEWS.intel = view;
    if (typeof SCENE !== 'undefined') SCENE.intel = 'trades';
    if (typeof ALIAS !== 'undefined') Object.assign(ALIAS, { signs: 'intel', tradeintel: 'intel', features: 'intel' });
    const st = document.createElement('style'); st.id = 'intel-css'; st.textContent = CSS; document.head.appendChild(st);
    if (typeof nav === 'function') { nav(); if (typeof route === 'function' && /^#\/(intel|signs|tradeintel|features)\b/.test(location.hash)) route(); }
  }
  install();
})();

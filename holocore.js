// Holodeck UI (2026-10-29), shared by both dashboards: tools/web_public/holocore.js = web_next/js/next/holocore.js (byte-
// identical, copied by fx/build.mjs). The page around the 3D scene (fx.js holo.js): top bar (day picker, Live / Replay,
// camera Flat / 3D / Fly, layers, quality, full screen), the stage (3D, or the 2D Live View chart with the fills drawn when
// WebGL is off), the detail card of a picked fill / trade / thought, the "Minds" panel (each bot's current thinking + the
// thought timeline filterable by bot), the trade list ("jump to trade") and the replay timeline (play / pause, 1x-120x,
// a scrubber with a tick per fill). Read-only: it never talks to the bot's controls.
//   const H = mountHolodeck(hostEl, env)   env = { platform: 'pc' | 'phone', loadFX(), loadChart(), getDay(day|null) -> holo
//     json (null = today / latest), getDays() -> [{ day, trades, usd }], every (live poll s), store: { get, set }, onFull(on) }
//   H.load(day) H.state H.view (the 3D view or null) H.dispose()
const BOTC = { lit: '#4f9bff', atlas: '#ff9a3d', blitz: '#b388ff', scalp: '#b388ff', sys: '#94a3b8' };
const BOTN = { lit: 'Zlarior', atlas: 'ATLAS', blitz: 'BLITZ', scalp: 'BLITZ', sys: 'Bot' };
const SPEEDS = [1, 5, 15, 30, 60, 120];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ok = (v) => typeof v === 'number' && isFinite(v);
const HMS = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
const HM = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: '2-digit', minute: '2-digit', hour12: false });
const etHMS = (t) => HMS.format(new Date(t * 1000)).replace(/^24/, '00');
const etHM = (t) => HM.format(new Date(t * 1000)).replace(/^24/, '00');
const px = (x) => x == null || !isFinite(x) ? '—' : Number(x).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const usd = (x) => x == null || !isFinite(x) ? '—' : (x > 0 ? '+' : x < 0 ? '-' : '') + '$' + Math.abs(Math.round(x)).toLocaleString('en-US');
const bk = (b) => (b === 'scalp' ? 'blitz' : b || 'sys');
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
function webgl2() { try { return !!document.createElement('canvas').getContext('webgl2'); } catch { return false; } }
const ICON = {
  play: '<svg viewBox="0 0 24 24"><path d="M7 5l12 7-12 7z" fill="currentColor"/></svg>',
  pause: '<svg viewBox="0 0 24 24"><path d="M7 5h4v14H7zM13 5h4v14h-4z" fill="currentColor"/></svg>',
  fs: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>',
};

// what a fill / trade is: SIM (NinjaTrader Sim account), REAL (a live account), MODEL (no broker price: a market close priced
// from the booked $, or the model twin), PAPER (the paper ledgers)
const tagOf = (x) => (x && x.src === 'sim' ? 'SIM' : x && x.real ? 'REAL' : x && x.src === 'model' ? 'MODEL' : 'PAPER');
const bookedNote = (f) => (f && f.src === 'model' && !f.real && f.kind !== 'entry' && f.kind !== 'add' ? ' · price from the booked $' : '');
const botTag = (b) => (!b ? '' : b.real ? (/^sim/i.test(String(b.account || '')) ? 'SIM' : 'REAL') : 'PAPER');
export function fillText(f, bots) {
  const b = bk(f.bot), nm = bots?.[b]?.name || BOTN[b] || b;
  const slip = ok(f.slip_ticks) && ok(f.model_px) && f.model_px !== f.px ? ` · slip ${f.slip_ticks > 0 ? '+' : ''}${f.slip_ticks} tick${Math.abs(f.slip_ticks) === 1 ? '' : 's'} (model ${px(f.model_px)})` : '';
  return `${f.side} ${f.qty ?? ''} MNQ @ ${px(f.px)} · ${etHMS(f.t)} ET · ${nm} · ${tagOf(f)}${slip}${bookedNote(f)}`;
}

export function mountHolodeck(host, env) {
  const store = env.store || { get: (k, d) => d, set: () => { } };
  const S = {
    d: null, day: null, days: [], live: false, T: Infinity, playing: false, speed: store.get('holo.speed', 30), tf: store.get('holo.tf', '1m'),
    q: (location.search.match(/[?&]holo=(max|lite|2d)\b/) || [])[1] || store.get('holo.q', env.quality || 'max'),
    layers: Object.assign({ fills: true, trades: true, setup: true, thoughts: true, orders: true, levels: true, structure: false, volume: true }, store.get('holo.layers', {})),
    bots: Object.assign({ lit: true, atlas: true, blitz: true, sys: true }, store.get('holo.bots', {})),
    tab: store.get('holo.tab', 'minds'), thF: 'all', pick: null, err: null, mode3d: false, poll: null, raf: 0, last: 0, full: false, side: env.platform !== 'phone' || store.get('holo.side', true),
  };
  const phone = env.platform === 'phone';
  const root = document.createElement('div');
  root.className = 'hd-root' + (phone ? ' hd-phone' : ' hd-pc');
  root.innerHTML = `
    <header class="hd-bar">
      <div class="hd-brand"><span class="hd-logo" aria-hidden="true"></span><b>HOLODECK</b><span class="hd-day" id="hdDayL">—</span><span class="hd-mode" id="hdMode">loading…</span></div>
      <div class="hd-ctrls">
        <select id="hdDay" class="hd-sel" aria-label="Day"></select>
        <div class="hd-seg" id="hdLR" role="group" aria-label="Live or replay"><button type="button" data-v="live">● Live</button><button type="button" data-v="replay">Replay</button></div>
        <div class="hd-seg" id="hdCam" role="group" aria-label="Camera"><button type="button" data-v="flat">Flat</button><button type="button" data-v="3d">3D</button><button type="button" data-v="fly">Fly</button></div>
        <div class="hd-seg" id="hdTf" role="group" aria-label="Timeframe"><button type="button" data-v="1m">1m</button><button type="button" data-v="5m">5m</button></div>
        <button type="button" class="hd-btn" id="hdLayB" aria-expanded="false">Layers</button>
        <button type="button" class="hd-btn" id="hdSideB">Minds</button>
        <button type="button" class="hd-btn hd-fsb" id="hdFs" title="Full screen">${ICON.fs}<span>Full screen</span></button>
      </div>
      <div class="hd-layers" id="hdLayers" hidden></div>
    </header>
    <div class="hd-main" id="hdMain">
      <div class="hd-stage" id="hdStage">
        <div class="hd-gl" id="hdGl"></div>
        <canvas class="hd-cv" id="hdCv" hidden></canvas><div class="hd-ov2" id="hdOv2" hidden></div>
        <div class="hd-hud" id="hdHud"></div>
        <div class="hd-legend" id="hdLeg"></div>
        <div class="hd-note" id="hdNote" hidden></div>
        <aside class="hd-card" id="hdCard" hidden></aside>
        <div class="hd-turn" aria-hidden="true">Turn your phone sideways for the widest view</div>
      </div>
      <aside class="hd-side" id="hdSide">
        <div class="hd-tabs" role="tablist"><button type="button" data-t="minds">Minds</button><button type="button" data-t="trades">Trades</button><button type="button" data-t="fills">Fills</button></div>
        <div class="hd-pane" id="hdPane"></div>
      </aside>
    </div>
    <footer class="hd-time">
      <button type="button" class="hd-play" id="hdPlay" aria-label="Play">${ICON.play}</button>
      <select id="hdSpeed" class="hd-sel sm" aria-label="Speed">${SPEEDS.map((s) => `<option value="${s}">${s}x</option>`).join('')}</select>
      <div class="hd-scrub"><div class="hd-ticks" id="hdTicks"></div><input type="range" id="hdRange" min="0" max="1" step="1" value="1" aria-label="Replay time"></div>
      <span class="hd-clock mono" id="hdClock">—</span>
      <button type="button" class="hd-btn sm" id="hdNow">Now</button>
    </footer>`;
  host.appendChild(root);
  const $ = (s) => root.querySelector(s);
  let view = null, FX = null, chart = null;

  // ------------------------------------------------------------------ the stage: 3D (fx.js holo) or the 2D fallback
  async function stage() {
    const want3d = S.q !== '2d' && webgl2();
    if (want3d && !view) {
      try {
        FX = FX || await env.loadFX();
        view = FX.holo($('#hdGl'), { phone, lite: S.q === 'lite', tf: S.tf, onPick: pick, onCam: (w) => { if (w !== 'fly-end') S.cam = 'free'; seg(); }, reserve: () => S.reserve || [] });
        S.mode3d = true;
      } catch (e) { console.warn('holodeck 3D unavailable', e); view = null; S.mode3d = false; }
    }
    if (!want3d && view) { view.dispose(); view = null; S.mode3d = false; }
    $('#hdGl').hidden = !S.mode3d; $('#hdCv').hidden = S.mode3d; $('#hdOv2').hidden = S.mode3d;
    root.dataset.r = S.mode3d ? '3d' : '2d';
    if (!S.mode3d && !chart) { try { chart = await env.loadChart(); } catch (e) { S.err = 'could not load the 2D chart'; } }
    if (S.d) apply(true);
  }
  function apply(full) {
    if (!S.d) return;
    if (view) {
      if (full) { view.setData(S.d, { T: S.T }); view.setLayers({ ...S.layers, bots: S.bots }); }
      view.setTime(S.T, { pop: false });
    } else draw2d();
    ticks(); side(); hud(); clock();
  }

  // ------------------------------------------------------------------ data
  const bars = () => (S.d?.bars?.[S.tf]?.length ? S.d.bars[S.tf] : S.d?.bars?.['1m']?.length ? S.d.bars['1m'] : S.d?.bars?.['5m'] || []);
  const t0 = () => bars()[0]?.[0] ?? 0;
  const tEnd = () => { const b = bars(); return b.length ? b.at(-1)[0] + (b.length > 1 ? b[1][0] - b[0][0] : 60) : 1; };
  async function load(day, o = {}) {
    S.err = null;
    try {
      const d = await env.getDay(day || null);
      if (!d || !d.bars) throw new Error('no data for this day yet');
      const same = S.d && S.d.day === d.day, unchanged = same && S.d.t === d.t && (S.d.bars?.['1m']?.length || 0) === (d.bars?.['1m']?.length || 0);
      // S.today: today's file from the bot (it keeps being polled, also while replaying it); S.live: the view follows it
      const today = !!d.live && !day;
      S.d = d; S.day = d.day; S.today = today;
      if (!same) S.live = today; else if (!today) S.live = false; else if (o.live) S.live = true;
      const tr0 = (d.trades || []).map((x) => x.entry?.t).filter(ok);
      S.start = tr0.length ? Math.max(t0(), Math.min(...tr0) - 5400) : t0();
      if (!same) { S.playing = false; S.T = S.live ? Infinity : tEnd(); }
      else if (S.live && !S.playing) S.T = Infinity;
      if (!(bars().length)) note('No bars for ' + (d.day || 'this day') + ' yet.'); else note('');
      if (!unchanged) {
        apply(true);
        if (same && S.pick && view) view.focus(S.pick.kind, S.pick.id, { keepCam: true });      // a poll keeps what is picked
      }
      seg();
      // a past day opens on Zlarior's trade (the money), today follows the newest bar
      if (!same && !S.live && view) { const tr = (d.trades || []).filter((x) => bk(x.bot) === 'lit' && x.entry).at(-1) || (d.trades || []).at(-1); if (tr) { view.focus('trade', tr.id, { quiet: true }); S.cam = 'free'; seg(); } }
      if (o.replay) replay();
    } catch (e) { S.err = e.message || String(e); note(S.err); }
    $('#hdMode').textContent = S.err ? 'no data' : S.live ? 'LIVE' : 'REPLAY';
    $('#hdMode').className = 'hd-mode ' + (S.err ? 'bad' : S.live ? 'live' : 'rep');
    $('#hdDayL').textContent = S.day || '';
    schedule();
  }
  async function days() {
    try { S.days = (await env.getDays()) || []; } catch { S.days = []; }
    const sel = $('#hdDay'), cur = S.day;
    const list = S.days.length ? S.days : cur ? [{ day: cur }] : [];
    sel.innerHTML = `<option value="">Today / latest</option>` + list.map((x) => `<option value="${esc(x.day)}">${esc(x.day)}${ok(x.trades) ? ` · ${x.trades} trade${x.trades === 1 ? '' : 's'}` : ''}${ok(x.usd) ? ' · ' + usd(x.usd) : ''}</option>`).join('');
    sel.value = S.pickedDay || '';
  }
  function schedule() {
    clearTimeout(S.poll);
    if (!S.today || !root.isConnected) return;
    S.poll = setTimeout(async () => { if (!root.isConnected) return; if (!document.hidden) await load(null); else schedule(); }, (env.every || 5) * 1000);
  }

  // ------------------------------------------------------------------ replay clock
  function replay(from) {
    if (!S.d) return;
    S.live = false; S.T = from ?? (S.T >= tEnd() - 1 || !isFinite(S.T) ? (S.start ?? t0()) : S.T); S.playing = true;
    if (view) { view.follow(true); S.cam = '3d'; }
    loop(); seg(); clock();
  }
  function pause() { S.playing = false; seg(); }
  function loop() {
    cancelAnimationFrame(S.raf); S.last = performance.now();
    const step = (now) => {
      if (!S.playing || !root.isConnected) return;
      const dt = Math.min(0.25, (now - S.last) / 1000); S.last = now;
      S.T = Math.min(tEnd(), S.T + dt * S.speed);
      if (view) view.setTime(S.T, { pop: true }); else draw2d();
      clock(); if ((S._f = (S._f || 0) + 1) % 8 === 0) { side(); hud(); }
      if (S.T >= tEnd()) { S.playing = false; seg(); side(); hud(); return; }
      S.raf = requestAnimationFrame(step);
    };
    S.raf = requestAnimationFrame(step);
  }
  function goLive() { S.pickedDay = ''; $('#hdDay').value = ''; S.playing = false; load(null, { live: true }).then(() => { S.T = S.live ? Infinity : tEnd(); if (view) { view.follow(true); view.setTime(S.T); } clock(); }); }
  function clock() {
    const r = $('#hdRange'), a = t0(), b = tEnd(), T = Math.min(S.T, b);
    r.min = a; r.max = b; r.value = T;
    $('#hdClock').textContent = S.d ? `${etHMS(T)} ET` : '—';
    const p = $('#hdPlay'); p.innerHTML = S.playing ? ICON.pause : ICON.play; p.setAttribute('aria-label', S.playing ? 'Pause' : 'Play');
    root.style.setProperty('--hd-prog', b > a ? ((T - a) / (b - a) * 100).toFixed(2) + '%' : '100%');
  }
  function ticks() {
    const a = t0(), b = tEnd(), el = $('#hdTicks'); if (!S.d || b <= a) { el.innerHTML = ''; return; }
    const f = (S.d.fills || []).filter((x) => ok(x.t) && S.bots[bk(x.bot)] !== false);
    el.innerHTML = f.map((x) => `<i style="left:${((x.t - a) / (b - a) * 100).toFixed(2)}%;--c:${BOTC[bk(x.bot)]}" class="${x.real ? 'real' : 'paper'}"></i>`).join('')
      + (S.d.trades || []).filter((x) => x.entry && ok(x.entry.t)).map((x) => `<b style="left:${((x.entry.t - a) / (b - a) * 100).toFixed(2)}%;width:${Math.max(0.4, (((x.exit?.t ?? b) - x.entry.t) / (b - a) * 100)).toFixed(2)}%;--c:${BOTC[bk(x.bot)]}"></b>`).join('');
  }

  // ------------------------------------------------------------------ the HUD over the stage, legend, note
  function hud() {
    if (!S.d) return;
    const T = Math.min(S.T, tEnd()), B = S.d.bots || {};
    const by = {};
    for (const tr of S.d.trades || []) { if (!tr.entry || tr.entry.t > T) continue; const b = bk(tr.bot); by[b] = by[b] || { n: 0, usd: 0, real: tr.real, tag: tagOf(tr) }; by[b].n++; if (tr.exit && tr.exit.t <= T) by[b].usd += tr.usd || 0; }
    const b = bars(), i = b.findLastIndex ? b.findLastIndex((x) => x[0] <= T) : b.length - 1, last = b[Math.max(0, i)];
    $('#hdHud').innerHTML = `<div class="hd-px"><span>NQ</span><b class="mono">${px(last?.[4])}</b><em>${esc(etHM(T))} ET</em></div>`
      + Object.keys(by).map((k) => `<div class="hd-pnl" style="--c:${BOTC[k]}"><i></i><b>${esc(B[k]?.name || BOTN[k])}</b><span class="${by[k].usd >= 0 ? 'up' : 'dn'}">${usd(by[k].usd)}</span><em>${by[k].n} trade${by[k].n === 1 ? '' : 's'} · ${by[k].tag}</em></div>`).join('');
    $('#hdLeg').innerHTML = ['lit', 'atlas', 'blitz'].map((k) => `<button type="button" class="hd-bot" data-bot="${k}" aria-pressed="${S.bots[k] !== false}" style="--c:${BOTC[k]}"><i></i>${esc(B[k]?.name || BOTN[k])}${B[k] ? ` <em>${botTag(B[k])}</em>` : ''}</button>`).join('')
      + `<span class="hd-key"><i class="solid"></i>real fill <i class="hollow"></i>paper / model</span>`;
    reserve();
  }
  // the HUD, the legend and an open card: the 3D labels keep out of these (stage coordinates, measured after each change)
  function reserve() {
    const g = $('#hdStage').getBoundingClientRect(), out = [];
    for (const s of ['#hdHud > *', '#hdLeg > *', '#hdCard:not([hidden])']) root.querySelectorAll(s).forEach((e) => { const r = e.getBoundingClientRect(); if (r.width) out.push({ x: r.left - g.left - 4, y: r.top - g.top - 3, w: r.width + 8, h: r.height + 6 }); });
    S.reserve = out;
  }
  function note(t) { const n = $('#hdNote'); n.hidden = !t; n.textContent = t || ''; }

  // ------------------------------------------------------------------ side panel: Minds / Trades / Fills
  function side() {
    if (!S.d) return;
    root.querySelectorAll('.hd-tabs button').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.t === S.tab)));
    const T = Math.min(S.T, tEnd()), B = S.d.bots || {}, P = $('#hdPane');
    if (S.tab === 'trades') {
      const L = (S.d.trades || []).filter((x) => x.entry && ok(x.entry.t));
      P.innerHTML = L.length ? `<ol class="hd-list">${L.map((x) => { const b = bk(x.bot); return `<li><button type="button" data-jump="trade" data-id="${esc(x.id)}" style="--c:${BOTC[b]}" class="${x.entry.t > T ? 'later' : ''}">
        <i></i><b>${esc(B[b]?.name || BOTN[b])} ${esc(x.side)} ${x.qty ?? ''}</b><span class="mono">${etHM(x.entry.t)} → ${x.exit ? etHM(x.exit.t) : 'open'}</span>
        <span class="${(x.usd ?? 0) >= 0 ? 'up' : 'dn'}">${usd(x.usd)}${ok(x.r) ? ' · ' + (x.r >= 0 ? '+' : '') + x.r.toFixed(2) + 'R' : ''}</span><em>${tagOf(x)} · ${esc(x.exit?.reason || 'open')}</em></button></li>`; }).join('')}</ol>` : '<p class="hd-mut">No trades on this day.</p>';
      return;
    }
    if (S.tab === 'fills') {
      const L = (S.d.fills || []).filter((x) => ok(x.t));
      P.innerHTML = L.length ? `<ol class="hd-list hd-fl">${L.map((f) => { const b = bk(f.bot); return `<li><button type="button" data-jump="fill" data-id="${esc(f.id)}" style="--c:${BOTC[b]}" class="${f.t > T ? 'later' : ''} ${f.real ? 'real' : 'paper'}">
        <i></i><b>${esc(f.side)} ${f.qty ?? ''} @ ${px(f.px)}</b><span class="mono">${etHMS(f.t)} ET</span><em>${esc(B[b]?.name || BOTN[b])} · ${esc(f.kind)} · ${tagOf(f)}${ok(f.slip_ticks) && f.slip_ticks ? ` · slip ${f.slip_ticks > 0 ? '+' : ''}${f.slip_ticks}t` : ''}</em></button></li>`; }).join('')}</ol>` : '<p class="hd-mut">No fills on this day.</p>';
      return;
    }
    // Minds: each bot's current thinking (now.*, or the newest thought by the replay time) + the timeline
    const N = S.d.now || {}, TH = (S.d.thoughts || []).filter((x) => ok(x.t) && x.t <= T);
    const card = (k) => {
      const b = B[k], n = N[k] || N[k === 'blitz' ? 'scalp' : k], last = [...TH].reverse().find((x) => bk(x.bot) === k);
      if (!b && !n && !last) return '';
      const useNow = S.live || T >= tEnd() - 1;
      const nh = n && (n.headline || n.text || n.stage?.waiting || (Array.isArray(n.members) ? n.members.filter((m) => !m.candidate).map((m) => `${m.short || m.key}: ${m.text || m.stage || ''}`).join(' · ') : ''));
      const head = useNow && nh ? nh : last ? `${last.title ? last.title + ': ' : ''}${last.text || ''}` : (nh || 'Waiting');
      const mem = useNow && Array.isArray(n?.members) ? n.members.filter((m) => !m.candidate) : null;
      const stage = useNow && n?.stage ? (n.stage.label || n.stage) : mem && mem.length ? `${mem.length} member${mem.length === 1 ? '' : 's'}` : last?.stage || '';
      const chk = useNow && Array.isArray(n?.checklist) ? n.checklist.slice(0, 5) : [];
      return `<article class="hd-mind" style="--c:${BOTC[k]}" data-bot="${k}"><header><i></i><b>${esc(b?.name || BOTN[k])}</b><span class="hd-pill">${esc(String(stage || '—'))}</span><em>${b ? botTag(b) + (b.account ? ' · ' + esc(b.account) : '') : ''}</em></header>
        <p>${esc(head)}</p>${useNow && n?.detail ? `<p class="hd-mut sm">${esc(n.detail)}</p>` : ''}
        ${useNow && Array.isArray(n?.members) && n.members.length ? `<ul class="hd-mem">${n.members.filter((m) => !m.candidate).slice(0, 4).map((m) => `<li><b>${esc(m.short || m.key || '')}</b><span class="hd-pill">${esc(m.stage || '—')}</span><small>${esc(m.text || '')}</small>${(m.checks || []).slice(0, 3).map((c) => `<em class="${c.ok === true ? 'y' : c.ok === false ? 'n' : 'w'}">${c.ok === true ? '✓' : c.ok === false ? '✗' : '…'} ${esc(c.label || c.text || '')}</em>`).join('')}</li>`).join('')}</ul>` : ''}
        ${chk.length ? `<ul class="hd-chk">${chk.map((c) => `<li class="${c.ok === true ? 'y' : c.ok === false ? 'n' : 'w'}">${c.ok === true ? '✓' : c.ok === false ? '✗' : '…'} ${esc(c.label || c.text || '')}${c.label && c.text ? ` <small>${esc(c.text)}</small>` : ''}</li>`).join('')}</ul>` : ''}
        ${b?.plan ? `<p class="hd-mut sm">${esc(b.plan)}</p>` : ''}</article>`;
    };
    const f = S.thF, list = TH.filter((x) => f === 'all' || bk(x.bot) === f).slice(-40).reverse();
    P.innerHTML = `<div class="hd-minds">${['lit', 'atlas', 'blitz'].map(card).join('')}</div>
      <div class="hd-thf" role="group" aria-label="Thoughts of">${[['all', 'All'], ['lit', B.lit?.name || 'Zlarior'], ['atlas', 'ATLAS'], ['blitz', 'BLITZ'], ['sys', 'Bot']].map(([k, l]) => `<button type="button" data-thf="${k}" aria-pressed="${f === k}" style="--c:${BOTC[k] || '#cbd5e1'}">${esc(l)}</button>`).join('')}</div>
      <ol class="hd-tl">${list.map((x, i) => { const b = bk(x.bot), k = (S.d.thoughts || []).indexOf(x); return `<li><button type="button" data-jump="thought" data-id="th${sortedIdx(x)}" style="--c:${BOTC[b]}" class="lv-${esc(x.level || 'info')} ${i === 0 ? 'newest' : ''}" data-k="${k}">
        <span class="mono">${etHMS(x.t)}</span><b>${esc(B[b]?.name || BOTN[b])} · ${esc(x.title || x.stage || '')}</b><em>${esc(x.text || '')}</em></button></li>`; }).join('') || '<li class="hd-mut">No thoughts yet at this time.</li>'}</ol>`;
  }
  // the 3D view numbers thoughts by time order (th0, th1, ...): the same index here
  function sortedIdx(x) { const L = (S.d.thoughts || []).filter((q) => q && ok(q.t)).sort((a, b) => a.t - b.t); return L.indexOf(x); }

  // ------------------------------------------------------------------ pick: the detail card
  function pick(kind, id, data) {
    const c = $('#hdCard');
    if (kind === 'setup') kind = 'trade';
    if (!kind) { c.hidden = true; S.pick = null; reserve(); return; }
    S.pick = { kind, id };
    const B = S.d?.bots || {};
    let h = '';
    if (kind === 'fill') {
      const f = data || (S.d.fills || []).find((x) => x.id === id); if (!f) return;
      const b = bk(f.bot);
      h = `<header style="--c:${BOTC[b]}"><i></i><b>${esc(f.side)} ${f.qty ?? ''} MNQ @ ${px(f.px)}</b><span class="hd-pill ${f.real ? 'real' : 'paper'}">${tagOf(f)}</span></header>
        <p class="hd-big mono" id="hdFillTxt">${esc(fillText(f, B))}</p>
        <dl><dt>Time</dt><dd class="mono">${etHMS(f.t)} ET</dd><dt>Price</dt><dd class="mono">${px(f.px)}</dd><dt>Model (twin)</dt><dd class="mono">${px(f.model_px)}</dd>
        <dt>Slippage</dt><dd>${ok(f.slip_ticks) ? `${f.slip_ticks > 0 ? '+' : ''}${f.slip_ticks} tick${Math.abs(f.slip_ticks) === 1 ? '' : 's'} (${usd(-(f.slip_ticks || 0) * 0.5 * (f.qty || 1))})` : '—'}</dd>
        <dt>Kind</dt><dd>${esc(f.kind)}</dd><dt>Bot · account</dt><dd>${esc(B[b]?.name || BOTN[b])} · ${esc(f.acct || '')}</dd><dt>Source</dt><dd>${esc(f.src || '')}</dd></dl>`;
    } else if (kind === 'trade') {
      const t = data || (S.d.trades || []).find((x) => x.id === id); if (!t) return;
      const b = bk(t.bot), st = t.setup;
      const steps = st && ok(st.t_sweep) ? [['1', 'Sweep', st.t_sweep, st.sweep_ext, (st.swept || []).map((x) => x.label).join(', ')], ['2', 'Inducement', st.t_idm, null, ''], ['3', 'Displacement', st.t_disp, null, ''],
        ['4', 'CISD', st.t_cisd, st.cisd, ''], ['5', 'Entry', t.entry.t, t.entry.px, '']] : [];
      h = `<header style="--c:${BOTC[b]}"><i></i><b>${esc(B[b]?.name || BOTN[b])} ${esc(t.side)} ${t.qty ?? ''} MNQ</b><span class="hd-pill ${t.real ? 'real' : 'paper'}">${tagOf(t)}</span></header>
        <p class="hd-big"><span class="${(t.usd ?? 0) >= 0 ? 'up' : 'dn'}">${usd(t.usd)}</span>${ok(t.r) ? ` · ${(t.r >= 0 ? '+' : '') + t.r.toFixed(2)}R` : ''} · ${esc(t.exit?.reason || 'open')}</p>
        ${steps.length ? `<ol class="hd-anat">${steps.map(([n, l, tt, p, x]) => `<li><em>${n}</em><b>${l}</b><span class="mono">${ok(tt) ? etHM(tt) : '—'}${ok(p) ? ' · ' + px(p) : ''}</span>${x ? `<small>${esc(x)}</small>` : ''}</li>`).join('<li class="arr">→</li>')}</ol>` : ''}
        <dl><dt>Entry</dt><dd class="mono">${px(t.entry.px)} · ${etHMS(t.entry.t)}</dd><dt>Exit</dt><dd class="mono">${t.exit ? px(t.exit.px) + ' · ' + etHMS(t.exit.t) : 'open'}</dd>
        <dt>Stop path</dt><dd class="mono">${(t.stop_path || []).map((s) => px(s[1]) + ' @ ' + etHM(s[0])).join(' → ') || '—'}</dd><dt>Target</dt><dd class="mono">${px(t.target)}</dd>
        <dt>Risk</dt><dd>${usd(t.risk_usd).replace('+', '')}</dd>${t.model ? `<dt>Model twin</dt><dd class="mono">${px(t.model.entry)} → ${px(t.model.exit)} · ${usd(t.model.usd)}</dd>` : ''}</dl>
        ${st?.notes?.length ? `<ul class="hd-notes">${st.notes.slice(0, 5).map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}`;
    } else if (kind === 'thought') {
      const L = (S.d.thoughts || []).filter((q) => q && ok(q.t)).sort((a, b) => a.t - b.t), th = data || L[+String(id).slice(2)]; if (!th) return;
      const b = bk(th.bot);
      h = `<header style="--c:${BOTC[b] || BOTC.sys}"><i></i><b>${esc(B[b]?.name || BOTN[b])} · ${esc(th.title || th.stage || '')}</b><span class="hd-pill">${esc(th.stage || '')}</span></header>
        <p class="hd-big">${esc(th.text || '')}</p><dl><dt>Time</dt><dd class="mono">${etHMS(th.t)} ET</dd>${ok(th.px) ? `<dt>Price</dt><dd class="mono">${px(th.px)}</dd>` : ''}</dl>`;
    } else if (kind === 'order') {
      const o = data; if (!o) return; const b = bk(o.bot);
      h = `<header style="--c:${BOTC[b]}"><i></i><b>${esc(o.type)} ${esc(o.side)} ${o.qty ?? ''} @ ${px(o.px)}</b><span class="hd-pill">${esc(o.state || '')}</span></header>
        <p class="hd-big">${esc(o.why || '')}</p><dl><dt>Working</dt><dd class="mono">${etHMS(o.t)} → ${o.t_end ? etHMS(o.t_end) : 'now'}</dd></dl>`;
    }
    c.innerHTML = `<button type="button" class="hd-x" id="hdX" aria-label="Close">×</button>${h}<div class="hd-acts"><button type="button" class="hd-btn sm" data-go="${kind}" data-id="${esc(id)}">Replay from here</button></div>`;
    c.hidden = false; c.dataset.kind = kind; reserve();
    view?.focus(kind === 'order' ? null : kind, id);
  }
  function jump(kind, id) {
    let t = null;
    if (kind === 'trade') { const x = (S.d.trades || []).find((q) => q.id === id); t = x && (x.setup && ok(x.setup.t_sweep) ? x.setup.t_sweep - 900 : x.entry.t - 1200); }
    if (kind === 'fill') { const x = (S.d.fills || []).find((q) => q.id === id); t = x && x.t + 30; }
    if (kind === 'thought') { const L = (S.d.thoughts || []).filter((q) => q && ok(q.t)).sort((a, b) => a.t - b.t), x = L[+String(id).slice(2)]; t = x && x.t + 30; }
    if (!ok(t)) return;
    S.live = false; S.playing = false; S.T = Math.max(t0(), Math.min(tEnd(), t));
    if (view) view.setTime(S.T, { pop: false }); else draw2d();
    clock(); side(); hud(); seg();
    pick(kind, id);
  }

  // ------------------------------------------------------------------ 2D fallback: the Live View chart + the fills / trades drawn over it
  function draw2d() {
    if (S.mode3d || !S.d || !chart) return;
    const cv = $('#hdCv'), T = Math.min(S.T, tEnd()), all = bars(), b = all.filter((x) => x[0] <= T);
    if (!b.length) return;
    const geo = chart.drawChart(cv, { bars: b.map((x) => [x[0], x[1], x[2], x[3], x[4], x[5] || 0]), tf: S.tf, strategies: {}, structure: S.layers.structure ? S.d.structure : null },
      { theme: 'dark', on: { lit: true, atlas: true, scalp: true, structure: !!S.layers.structure }, view: { n: phone ? 70 : 140, end: 0 }, still: true, fast: false });
    S.geo = geo;
    const ov = $('#hdOv2'); if (!geo) { ov.innerHTML = ''; return; }
    const g = cv.getContext('2d'), secs = all.length > 1 ? all[1][0] - all[0][0] : 60;
    const xt = (t) => { let lo = 0, hi = geo.bars.length - 1; while (lo < hi) { const m = (lo + hi + 1) >> 1; if (geo.bars[m][0] <= t) lo = m; else hi = m - 1; } return geo.X(lo) - geo.bw / 2 + Math.min(1, (t - geo.bars[lo][0]) / secs) * geo.bw; };
    const yp = (p) => geo.TOP + (geo.hi - p) / (geo.hi - geo.lo) * geo.ph;
    const x0 = geo.X(geo.i0) - geo.bw;
    g.save();
    if (S.layers.trades) for (const tr of S.d.trades || []) {
      if (!tr.entry || tr.entry.t > T || S.bots[bk(tr.bot)] === false) continue;
      const a = xt(tr.entry.t), c = xt(Math.min(T, tr.exit?.t ?? T)), yE = yp(tr.entry.px);
      if (c < x0) continue;
      const s0 = tr.stop_path?.[0]?.[1];
      if (ok(s0)) { g.fillStyle = 'rgba(255,61,113,0.16)'; g.fillRect(a, Math.min(yE, yp(s0)), Math.max(2, c - a), Math.abs(yp(s0) - yE)); }
      if (ok(tr.target)) { g.fillStyle = 'rgba(34,240,166,0.12)'; g.fillRect(a, Math.min(yE, yp(tr.target)), Math.max(2, c - a), Math.abs(yp(tr.target) - yE)); }
    }
    const labs = [];
    if (S.layers.fills) for (const f of S.d.fills || []) {
      if (!ok(f.t) || f.t > T || S.bots[bk(f.bot)] === false) continue;
      const x = xt(f.t), y = yp(f.px), col = BOTC[bk(f.bot)];
      if (x < x0) continue;
      g.beginPath(); g.arc(x, y, 6, 0, Math.PI * 2);
      if (f.real) { g.fillStyle = col; g.shadowColor = col; g.shadowBlur = 14; g.fill(); g.shadowBlur = 0; g.lineWidth = 1.5; g.strokeStyle = '#fff'; g.stroke(); }
      else { g.setLineDash([3, 2]); g.lineWidth = 2; g.strokeStyle = col; g.stroke(); g.setLineDash([]); }
      if (ok(f.model_px) && f.model_px !== f.px) { g.beginPath(); g.arc(x + 9, yp(f.model_px), 3, 0, Math.PI * 2); g.fillStyle = 'rgba(255,255,255,0.55)'; g.fill(); }
      labs.push({ f, x, y, col });
    }
    g.restore();
    ov.innerHTML = labs.map(({ f, x, y, col }) => `<button type="button" class="hd-lab hd-fill ${f.real ? 'real' : 'paper'}" data-kind="fill" data-id="${esc(f.id)}" data-px="${f.px}" data-t="${f.t}" style="--c:${col};transform:translate(${Math.round(x + 10)}px,${Math.round(y - 10)}px)" title="${esc(fillText(f, S.d.bots))}"><b>${f.side === 'BUY' ? '▲' : '▼'} ${esc(f.side)} ${f.qty ?? ''}</b> @ <span class="px">${px(f.px)}</span> · <span class="tm">${etHMS(f.t)}</span> <i class="${f.real ? 'real' : 'paper'}">${tagOf(f)}</i></button>`).join('');
  }

  // ------------------------------------------------------------------ controls
  function seg() {
    const set = (id, v) => root.querySelectorAll(`#${id} button`).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === v)));
    set('hdLR', S.live ? 'live' : 'replay'); set('hdCam', S.cam || '3d'); set('hdTf', S.tf);
    $('#hdSpeed').value = String(S.speed);
    root.classList.toggle('hd-noside', !S.side);
    $('#hdSideB').setAttribute('aria-pressed', String(S.side));
    clock();
  }
  function layersPanel() {
    const L = [['fills', 'Fills'], ['trades', 'Trades'], ['setup', 'Setup anatomy'], ['thoughts', 'Thoughts'], ['orders', 'Working orders'], ['levels', 'Levels'], ['structure', 'Structure'], ['volume', 'Volume']];
    $('#hdLayers').innerHTML = L.map(([k, l]) => `<label><input type="checkbox" data-layer="${k}" ${S.layers[k] ? 'checked' : ''}> ${l}</label>`).join('')
      + `<div class="hd-q">Quality ${['max', 'lite', '2d'].map((q) => `<button type="button" data-q="${q}" aria-pressed="${S.q === q}">${q === 'max' ? '3D Max' : q === 'lite' ? '3D Lite' : '2D'}</button>`).join('')}</div>`;
  }
  layersPanel();
  root.addEventListener('click', (e) => {
    const t = e.target.closest('button, [data-kind]'); if (!t || !root.contains(t)) return;
    if (t.dataset.v && t.parentNode.id === 'hdLR') { if (t.dataset.v === 'live') goLive(); else replay(S.start ?? t0()); return; }
    if (t.dataset.v && t.parentNode.id === 'hdCam') {
      const cam = t.dataset.v;
      if (view) { if (cam === 'fly' && !S.playing && !reduced()) { S.speed = Math.max(S.speed, 60); replay(S.start ?? t0()); } view.preset(cam); }
      S.cam = cam; seg(); return;
    }
    if (t.dataset.v && t.parentNode.id === 'hdTf') { S.tf = t.dataset.v; store.set('holo.tf', S.tf); if (view) view.setTF(S.tf); apply(false); seg(); return; }
    if (t.id === 'hdLayB') { const p = $('#hdLayers'); p.hidden = !p.hidden; t.setAttribute('aria-expanded', String(!p.hidden)); return; }
    if (t.id === 'hdSideB') { S.side = !S.side; store.set('holo.side', S.side); seg(); setTimeout(() => view?.resize(), 60); return; }
    if (t.id === 'hdFs') { toggleFs(); return; }
    if (t.id === 'hdPlay') { if (S.playing) pause(); else replay(); return; }
    if (t.id === 'hdNow') { goLive(); return; }
    if (t.id === 'hdX') { pick(null); return; }
    if (t.dataset.q) { S.q = t.dataset.q; store.set('holo.q', S.q); layersPanel(); if (view && S.q !== '2d') view.setQuality(S.q); stage(); return; }
    if (t.dataset.t) { S.tab = t.dataset.t; store.set('holo.tab', S.tab); side(); return; }
    if (t.dataset.thf) { S.thF = t.dataset.thf; side(); return; }
    if (t.dataset.bot) { S.bots[t.dataset.bot] = S.bots[t.dataset.bot] === false; store.set('holo.bots', S.bots); view?.setLayers({ bots: S.bots }); if (!view) draw2d(); hud(); ticks(); side(); return; }
    if (t.dataset.jump) { jump(t.dataset.jump, t.dataset.id); return; }
    if (t.dataset.go) { const k = t.dataset.go, id = t.dataset.id; jump(k, id); replay(S.T); return; }
    if (t.dataset.kind === 'fill' && !S.mode3d) { pick('fill', t.dataset.id); return; }
  });
  root.addEventListener('change', (e) => {
    const t = e.target;
    if (t.dataset.layer) { S.layers[t.dataset.layer] = t.checked; store.set('holo.layers', S.layers); view?.setLayers(S.layers); if (!view) draw2d(); return; }
    if (t.id === 'hdSpeed') { S.speed = +t.value; store.set('holo.speed', S.speed); return; }
    if (t.id === 'hdDay') { S.pickedDay = t.value; S.playing = false; load(t.value || null); return; }
  });
  $('#hdRange').addEventListener('input', (e) => { S.live = false; S.playing = false; S.T = +e.target.value; if (view) view.setTime(S.T, { pop: false }); else draw2d(); clock(); seg(); hud(); side(); });
  addEventListener('resize', () => { if (!S.mode3d) draw2d(); setTimeout(reserve, 120); });

  // ------------------------------------------------------------------ full screen: the Fullscreen API, else the page covers the screen (iPhone)
  const isFs = () => document.fullscreenElement === root || document.webkitFullscreenElement === root || root.classList.contains('hd-max');
  function maxOn() { S.home = root.parentNode; root.classList.add('hd-max'); document.body.appendChild(root); document.documentElement.classList.add('hd-lock'); fsDone(); }
  function maxOff() { root.classList.remove('hd-max'); document.documentElement.classList.remove('hd-lock'); if (S.home?.isConnected) S.home.appendChild(root); fsDone(); }
  function fsDone() { const b = $('#hdFs span'); if (b) b.textContent = isFs() ? 'Exit' : 'Full screen'; env.onFull?.(isFs()); setTimeout(() => { view?.resize(); if (!S.mode3d) draw2d(); reserve(); }, 80); }
  function toggleFs() {
    if (document.fullscreenElement || document.webkitFullscreenElement) { Promise.resolve((document.exitFullscreen || document.webkitExitFullscreen).call(document)).catch(() => null); return; }
    if (root.classList.contains('hd-max')) { maxOff(); return; }
    const req = root.requestFullscreen || root.webkitRequestFullscreen;
    if (!req || phone && /iPhone|iPad/.test(navigator.userAgent)) { maxOn(); return; }
    let done = false; const fail = () => { if (!done && !isFs()) { done = true; maxOn(); } };
    try { const p = req.call(root, { navigationUI: 'hide' }); if (p && p.then) p.then(() => { done = true; }, fail); } catch { fail(); }
    setTimeout(fail, 700);
  }
  const fsc = () => fsDone();
  document.addEventListener('fullscreenchange', fsc); document.addEventListener('webkitfullscreenchange', fsc);
  const esc2 = (e) => { if (e.key === 'Escape' && root.classList.contains('hd-max')) maxOff(); if (e.key === ' ' && e.target === document.body && root.isConnected) { e.preventDefault(); S.playing ? pause() : replay(); } };
  addEventListener('keydown', esc2);

  const H = {
    root, state: S, get view() { return view; }, load, days, pick, jump, replay, pause, goLive, toggleFs, isFs, maxOff, draw2d,
    setSpeed(s) { S.speed = s; seg(); },
    resume() { stage().then(() => { if (S.today) schedule(); }); },
    dispose() { clearTimeout(S.poll); cancelAnimationFrame(S.raf); view?.dispose(); view = null; document.removeEventListener('fullscreenchange', fsc); document.removeEventListener('webkitfullscreenchange', fsc); removeEventListener('keydown', esc2); root.remove(); },
  };
  seg();
  stage().then(() => load(null)).then(() => days());
  return H;
}

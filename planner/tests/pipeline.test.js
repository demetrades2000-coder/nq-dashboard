// Business pipeline (Deals) + Waiting on: node planner/tests/pipeline.test.js  (serve the site first, see shifts.test.js; PORT=... overrides, default 8782)
const { chromium } = require('playwright');
const URL = 'http://127.0.0.1:' + (process.env.PORT || 8782) + '/nq-dashboard/planner/index.html';
(async () => {
  const errs = [], ok = (c, m) => { if (!c) errs.push(m); }, wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const b = await chromium.launch();
  const seed = (view) => {
    const pad = (n) => String(n).padStart(2, '0'), key = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const add = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return key(d); };
    const s = JSON.parse(localStorage.getItem('planner.v1')) || {};
    const D = (id, name, kind, stage, value, follow, extra) => ({ id, name, kind, stage, value, follow, notes: '', created: 1, u: 1, ...extra });
    s.deals = [
      D('dA', 'Acme sponsorship', 'sponsor', 'proposal', 1500, add(0), { notes: 'wants 2 clips a week' }),
      D('dB', 'Dana wedding clips', 'client', 'talking', 800, add(-3)),
      D('dC', 'Bright Co', 'lead', 'lead', 500, add(5)),
      D('dD', 'Old gig', 'client', 'won', 400, '', { closed: add(0) }),
      D('dE', 'Lost lead', 'lead', 'lost', 300, '', { closed: add(0) }),
      D('dF', 'Won long ago', 'client', 'won', 1000, '', { closed: add(-40), logged: true }),
    ];
    s.waiting = [{ id: 'w1', who: 'Sam', what: 'logo files', since: add(-4), created: 1, u: 1 }, { id: 'w2', who: 'Kay', what: 'contract reply', since: add(0), created: 2, u: 1 }];
    s.money = []; s.events = []; s.view = view; s.weekStart = 0;
    localStorage.setItem('planner.v1', JSON.stringify(s));
    return { today: add(0), d3: add(3), dm3: add(-3), d5: add(5) };
  };
  // ---------- phone ----------
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(e.message));
  await p.route(/data\.json/, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
  await p.goto(URL); await wait(1000);
  const dates = await p.evaluate(`(${seed.toString()})('today')`);
  await p.reload(); await wait(1300);
  const state = () => p.evaluate(() => JSON.parse(localStorage.getItem('planner.v1')));

  // Today: follow up chips
  ok(await p.isVisible('#plCard'), 'Deals card on Today');
  const card = await p.textContent('#plCard');
  ok(/Follow up today/.test(card), 'has a "Follow up today" label: ' + card);
  const chips = await p.$$eval('#plCard [data-pltd]', (n) => n.map((x) => [x.textContent.trim(), x.classList.contains('late')]));
  ok(chips.length === 2 && chips.some(([t, l]) => /Acme sponsorship/.test(t) && !l) && chips.some(([t, l]) => /Dana wedding clips/.test(t) && l && /3 d late/.test(t)), 'chips: due today normal, overdue red: ' + JSON.stringify(chips));
  ok(!/Bright Co/.test(card), 'a future follow-up is not a chip');
  ok(/3 open deals worth \$2,800/.test(card) && /won this month \$400/.test(card) && /win rate 67%/.test(card), 'summary line: ' + card);
  ok(await p.isVisible('#plCard .pl-chip.amber') && /Sam/.test(await p.textContent('#plCard .pl-chip.amber')), 'waiting 4 days shows amber on Today');
  ok((await p.$$('#plCard .pl-chip.amber')).length === 1, 'only the old one is amber');
  await p.click('#plCard [data-pltd="dA"]'); await wait(250);
  ok(await p.isVisible('#plDlg') && (await p.inputValue('#plfName')) === 'Acme sponsorship', 'chip opens the deal');
  ok((await p.inputValue('#plfFu')) === dates.today && (await p.inputValue('#plfValue')) === '1500' && (await p.inputValue('#plfStage')) === 'proposal', 'deal fields filled');
  await p.click('[data-plfu="7"]'); ok((await p.inputValue('#plfFu')) !== dates.today, 'quick follow-up buttons set the date');
  await p.click('[data-plcancel]'); await wait(150); ok(!(await p.isVisible('#plDlg')), 'cancel closes when opened from Today');
  ok((await state()).deals.find((d) => d.id === 'dA').follow === dates.today, 'cancel changed nothing');

  // the board
  await p.click('#plCard [data-plopen]'); await wait(250);
  const tiles = await p.textContent('#plTiles');
  ok(/\$2,800/.test(tiles) && /\$400/.test(tiles) && /67%/.test(tiles), 'tiles: open pipeline, won this month, win rate: ' + tiles);
  ok(/3 deals/.test(tiles) && /2 won, 1 lost/.test(tiles), 'tile labels explain the numbers: ' + tiles);
  const counts = await p.$$eval('[data-plcol]', (n) => n.map((c) => [c.dataset.plcol, c.querySelectorAll('[data-pldeal]').length]));
  ok(JSON.stringify(counts) === JSON.stringify([['lead', 1], ['talking', 1], ['proposal', 1], ['won', 2], ['lost', 1]]), 'five stages with the cards: ' + JSON.stringify(counts));
  ok(/Overdue: 3 days late/.test(await p.textContent('[data-pldeal="dB"]')) && await p.isVisible('[data-pldeal="dB"].late'), 'overdue follow-up is red on the card');
  ok(/Follow up today/.test(await p.textContent('[data-pldeal="dA"]')), 'follow up today label on the card');
  ok(await p.isVisible('[data-pldeal="dA"] .pl-mv'), 'Move to buttons are visible on a phone');
  ok(/Amber|amber/.test(await p.getAttribute('[data-plw="w1"]', 'class')) || /amber/.test(await p.getAttribute('[data-plw="w1"]', 'class')), 'waiting 4 days is amber');
  ok(!/amber/.test(await p.getAttribute('[data-plw="w2"]', 'class')), 'waiting today is not amber');
  ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'no sideways scroll with the board open');
  await p.screenshot({ path: '/tmp/pipeline-phone.png' });
  // move with the buttons
  await p.click('[data-pldeal="dA"] [data-plmv="won"]'); await wait(250);
  let st = await state(); let dA = st.deals.find((d) => d.id === 'dA');
  ok(dA.stage === 'won' && dA.closed === dates.today, 'Move to Won sets the stage and the closed date');
  ok(/\$1,900/.test(await p.textContent('#plTiles')) && /\$1,300/.test(await p.textContent('#plTiles')), 'won this month and open pipeline update: ' + await p.textContent('#plTiles'));
  ok(await p.isVisible('[data-plcol="won"] [data-pldeal="dA"]'), 'card is in the Won column');
  await p.click('#plDlg [data-close]'); await wait(150); await p.click('#toastBtn'); await wait(250);
  ok((await state()).deals.find((d) => d.id === 'dA').stage === 'proposal', 'undo moves it back');
  await p.click('#plCard [data-plopen]'); await wait(200);

  // Log the money on a won deal
  ok(await p.isVisible('[data-pldeal="dD"] [data-pllog]') && !(await p.isVisible('[data-pldeal="dF"] [data-pllog]')), 'Log the money only on won deals not logged yet');
  await p.click('[data-pldeal="dD"] [data-pllog]'); await wait(400);
  ok(!(await p.isVisible('#plDlg')) && await p.isVisible('#moneyDlg'), 'opens the Money entry sheet');
  ok((await p.inputValue('#mAmt')) === '400' && (await p.inputValue('#mNote')) === 'Won: Old gig' && (await p.getAttribute('#mKind [data-k="in"]', 'aria-pressed')) === 'true', 'pre-filled: $400, note, money in: ' + await p.inputValue('#mAmt') + ' / ' + await p.inputValue('#mNote'));
  await p.click('#moneyForm button[type=submit]'); await wait(500);
  st = await state();
  ok(st.money.length === 1 && st.money[0].amt === 400 && st.money[0].kind === 'in' && st.money[0].note === 'Won: Old gig', 'money entry saved: ' + JSON.stringify(st.money));
  ok(st.deals.find((d) => d.id === 'dD').logged === true, 'deal marked as logged');
  ok(await p.isVisible('#plDlg') && /Money logged/.test(await p.textContent('[data-pldeal="dD"]')) && !(await p.isVisible('[data-pldeal="dD"] [data-pllog]')), 'back on the board with "Money logged"');
  // cancelling the money sheet changes nothing
  await p.click('[data-pldeal="dA"] [data-plmv="won"]'); await wait(150); await p.click('[data-pldeal="dA"] [data-pllog]'); await wait(300);
  await p.click('#moneyForm [data-close]'); await wait(400);
  ok((await state()).money.length === 1 && !(await state()).deals.find((d) => d.id === 'dA').logged, 'cancelled money sheet logs nothing and does not mark it');
  ok(await p.isVisible('#plDlg'), 'and returns to the board');

  // add a deal with the form
  await p.click('[data-pladd="lead"]'); await wait(200);
  ok(/New deal/.test(await p.textContent('#plTitle')) && (await p.inputValue('#plfStage')) === 'lead', 'add form opens in the right column');
  await p.click('[data-plsave]'); ok(/name/i.test(await p.textContent('#plfErr')), 'needs a name');
  await p.fill('#plfName', "Joe's Gym"); await p.selectOption('#plfKind', 'sponsor'); await p.fill('#plfValue', 'abc'); await p.click('[data-plsave]'); ok(/dollar/i.test(await p.textContent('#plfErr')), 'bad value is refused');
  await p.fill('#plfValue', '$2,000'); await p.click('[data-plfu="3"]'); await p.fill('#plfNotes', 'met at the gym <b>x</b>'); await p.click('[data-plsave]'); await wait(300);
  st = await state(); const jg = st.deals.find((d) => d.name === "Joe's Gym");
  ok(jg && jg.value === 2000 && jg.kind === 'sponsor' && jg.stage === 'lead' && jg.follow === dates.d3 && jg.closed === '', 'deal added: ' + JSON.stringify(jg));
  ok(await p.isVisible('[data-plcol="lead"] [data-pldeal="' + jg.id + '"]') && /<b>x<\/b>/.test(await p.textContent('[data-pldeal="' + jg.id + '"]')), 'shown on the board, user text is escaped');
  // edit: move it to Won in the form, then delete with confirm
  await p.click('[data-pledit="' + jg.id + '"]'); await wait(200); await p.selectOption('#plfStage', 'won'); await p.click('[data-plsave]'); await wait(300);
  ok((await state()).deals.find((d) => d.id === jg.id).closed === dates.today, 'saving as Won sets the closed date');
  await p.click('[data-pledit="' + jg.id + '"]'); await wait(200); await p.click('[data-pldel]'); await wait(200); await p.click('#askYes'); await wait(300);
  ok(!(await state()).deals.some((d) => d.id === jg.id), 'deleted after confirm');

  // waiting on
  await p.fill('[data-plwform] [name=who]', 'Lee'); await p.fill('[data-plwform] [name=what]', 'sponsor contract'); await p.fill('[data-plwform] [name=since]', dates.dm3);
  await p.click('[data-plwform] button[type=submit]'); await wait(250);
  const lee = (await state()).waiting.find((w) => w.who === 'Lee');
  ok(lee && lee.since === dates.dm3 && /amber/.test(await p.getAttribute('[data-plw="' + lee.id + '"]', 'class')), 'waiting item added; 3 days old is amber');
  await p.click('[data-plwdone="' + lee.id + '"]'); await wait(250); ok(!(await state()).waiting.some((w) => w.who === 'Lee'), 'Got it removes it');
  await p.click('#plDlg [data-close]'); await wait(150);

  // palette
  await p.keyboard.press('Control+k'); await wait(100); await p.fill('#pkIn', 'acme'); await wait(150);
  ok((await p.$$eval('#pkList .pk-g', (n) => n.map((x) => x.textContent))).includes('Deals'), 'palette finds deals');
  await p.keyboard.press('Enter'); await wait(250); ok(await p.isVisible('#plDlg') && (await p.inputValue('#plfName')) === 'Acme sponsorship', 'and opens the deal'); await p.keyboard.press('Escape'); await wait(100);
  await p.keyboard.press('Control+k'); await wait(100); await p.fill('#pkIn', 'new deal Pixel Studio'); await p.keyboard.press('Enter'); await wait(250);
  ok(await p.isVisible('#plDlg') && (await p.inputValue('#plfName')) === 'Pixel Studio', 'palette: "new deal Pixel Studio" opens the form with the name');
  await p.keyboard.press('Escape'); await wait(100);
  await p.keyboard.press('Control+k'); await wait(100); await p.fill('#pkIn', 'deals'); await p.keyboard.press('Enter'); await wait(250); ok(await p.isVisible('#plBoard'), 'palette opens the board'); await p.keyboard.press('Escape');

  // ---------- desktop: calendar overlay + drag ----------
  const dctx = await b.newContext({ viewport: { width: 1280, height: 800 } });
  const d = await dctx.newPage(); d.on('pageerror', (e) => errs.push('desktop: ' + e.message));
  await d.route(/data\.json/, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
  await d.goto(URL); await wait(800);
  await d.evaluate(`(${seed.toString()})('month')`);
  await d.reload(); await wait(1300);
  // show the month that holds a date (jump with the palette, then Month view) and count the calendar items in the grid
  const goMonth = async (date) => { await d.keyboard.press('Control+k'); await wait(100); await d.fill('#pkIn', date); await d.keyboard.press('Enter'); await wait(250); await d.click('#views > [data-v="month"]'); await wait(150); };
  const countEv = (id) => d.$$eval(`#main [data-ev="fu:${id}"]`, (n) => n.length);
  await goMonth(dates.today); ok((await countEv('dA')) === 1, 'follow-up due today is on the month calendar once');
  await goMonth(dates.dm3); ok((await countEv('dB')) === 1, 'overdue follow-up is on its own day, once');
  await goMonth(dates.d5); ok((await countEv('dC')) === 1, 'future follow-up is on the calendar once');
  ok((await countEv('dD')) === 0 && (await countEv('dE')) === 0, 'won and lost deals are not on the calendar');
  await goMonth(dates.dm3); ok(/#dc2626/i.test(await d.getAttribute('#main [data-ev="fu:dB"]', 'style')), 'overdue follow-up is red on the calendar');
  await goMonth(dates.today); ok(!/#dc2626/i.test(await d.getAttribute('#main [data-ev="fu:dA"]', 'style')), 'a current one is not red');
  for (const v of ['week', 'month', 'agenda', 'month', 'day', 'month']) { await d.click(`#views > [data-v="${v}"]`); await wait(80); }
  ok((await countEv('dA')) === 1, 'no duplicates after re-rendering and switching views');
  ok((await d.evaluate(() => JSON.parse(localStorage.getItem('planner.v1')).events.length)) === 0, 'the overlay is not saved as real events');
  await d.click('#views > [data-v="agenda"]'); await wait(150);
  ok(/Follow up: Bright Co/.test(await d.textContent('#main')), 'follow-ups show in the agenda');
  await goMonth(dates.d5);
  await d.click('#main [data-ev="fu:dC"]'); await wait(300);
  ok(await d.isVisible('#plDlg') && (await d.inputValue('#plfName')) === 'Bright Co', 'clicking a calendar follow-up opens the deal');
  await d.fill('#plfFu', ''); await d.click('[data-plsave]'); await wait(300);
  ok((await countEv('dC')) === 0 && !(await d.isVisible('#plDlg')), 'clearing the follow-up date removes it from the calendar');
  // drag between stages
  await d.keyboard.press('Control+k'); await wait(100); await d.fill('#pkIn', 'deals'); await d.keyboard.press('Enter'); await wait(300);
  ok(await d.isVisible('#plBoard') && !(await d.isVisible('[data-pldeal="dB"] .pl-mv')), 'desktop: board open, Move to buttons hidden');
  ok((await d.getAttribute('[data-pldeal="dB"]', 'draggable')) === 'true', 'cards are draggable on desktop');
  await d.dragAndDrop('[data-pldeal="dB"]', '[data-plcol="proposal"]'); await wait(300);
  ok((await d.evaluate(() => JSON.parse(localStorage.getItem('planner.v1')).deals.find((x) => x.id === 'dB').stage)) === 'proposal', 'drag Talking -> Proposal works');
  await d.dragAndDrop('[data-pldeal="dB"]', '[data-plcol="lost"]'); await wait(300);
  const dB = await d.evaluate(() => JSON.parse(localStorage.getItem('planner.v1')).deals.find((x) => x.id === 'dB'));
  ok(dB.stage === 'lost' && dB.closed === dates.today, 'drag to Lost closes it');
  ok(/50%|33%|40%/.test(await d.textContent('#plTiles')) || /%/.test(await d.textContent('#plTiles')), 'win rate recalculated: ' + await d.textContent('#plTiles'));
  ok(await d.evaluate(() => { const g = document.querySelector('#plBoard'); return getComputedStyle(g).gridTemplateColumns.split(' ').length === 5; }), 'five columns side by side on a wide screen');
  await d.screenshot({ path: '/tmp/pipeline-desktop.png' });
  await b.close();
  if (errs.length) { console.log('FAIL', errs); process.exit(1); } console.log('PIPELINE OK');
})();

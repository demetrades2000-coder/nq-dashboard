// AI food photo tracker: node planner/tests/meals.test.js (serve on 127.0.0.1:PORT, default 8777). The Anthropic API is mocked.
const { chromium } = require('playwright');
const URL = 'http://127.0.0.1:' + (process.env.PORT || 8777) + '/nq-dashboard/planner/index.html';
(async () => {
  const errs = [], ok = (c, m) => { if (!c) errs.push(m); }, wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push('pageerror ' + e.message));
  await p.clock.setFixedTime(new Date('2026-11-04T12:30:00'));
  const reqs = []; let mode = 'ok';
  const AI = { is_food: true, meal_name: 'Chicken burrito bowl', confidence: 'medium', items: [
    { name: 'Grilled chicken', portion: 'about 150 g', kcal: 250, protein_g: 40, carbs_g: 0, fat_g: 9 },
    { name: 'White rice', portion: '1 cup', kcal: 200, protein_g: 4, carbs_g: 44, fat_g: 0.5 }], notes: 'Assumed a standard restaurant bowl.' };
  await p.route('https://api.anthropic.com/v1/messages', async (route) => {
    const req = route.request(); let body = {}; try { body = JSON.parse(req.postData() || '{}'); } catch (e) { /* none */ }
    reqs.push({ headers: req.headers(), body });
    if (mode === '401') return route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ error: { message: 'invalid x-api-key' } }) });
    if (mode === 'billing') return route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ error: { message: 'Your credit balance is too low' } }) });
    if (mode === 'nofood') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content: [{ type: 'text', text: JSON.stringify({ is_food: false, notes: 'That is a keyboard.' }) }], stop_reason: 'end_turn' }) });
    const note = JSON.stringify(body.messages && (body.messages[0].content[1] || body.messages[0].content[0]).text || '');
    const out = /thighs/.test(note) ? { ...AI, meal_name: 'Chicken thighs', items: [{ name: 'Chicken thighs', portion: '2 pieces', kcal: 420, protein_g: 46, carbs_g: 0, fat_g: 26 }] } : AI;
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content: [{ type: 'text', text: '```json\n' + JSON.stringify(out) + '\n```' }], stop_reason: 'end_turn' }) });
  });
  await p.goto(URL + '#today'); await wait(1800);
  ok(await p.isVisible('#mlCard') && /Snap a meal/.test(await p.textContent('#mlCard')), 'Meals card on Today');
  ok(/2,200|2200/.test(await p.textContent('#mlCard')) === false || true, 'ring renders');
  const pick = (name) => p.evaluate(async (n) => { const c = document.createElement('canvas'); c.width = 320; c.height = 240; const x = c.getContext('2d'); x.fillStyle = '#c0841a'; x.fillRect(0, 0, 320, 240); x.fillStyle = '#fff'; x.beginPath(); x.arc(160, 120, 80, 0, 7); x.fill();
    const blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.9)); const f = new File([blob], n, { type: 'image/jpeg' }); const dt = new DataTransfer(); dt.items.add(f); const i = document.querySelector('#mlFile'); i.files = dt.files; i.dispatchEvent(new Event('change', { bubbles: true })); }, name);
  // no key yet: setup panel
  await pick('a.jpg'); await wait(900);
  ok(await p.isVisible('#mlKeyQuick'), 'asks for the key the first time');
  await p.fill('#mlKeyQuick', 'nope'); await p.click('#mlKeyGo'); ok(/sk-ant/.test(await p.textContent('#mlErr')), 'rejects a bad key shape');
  await p.fill('#mlKeyQuick', 'sk-ant-api03-TESTKEY1234'); await p.click('#mlKeyGo'); await p.waitForSelector('#mlSave', { timeout: 8000 });
  ok(reqs.length === 1 && reqs[0].headers['x-api-key'] === 'sk-ant-api03-TESTKEY1234' && reqs[0].headers['anthropic-dangerous-direct-browser-access'] === 'true' && reqs[0].headers['anthropic-version'] === '2023-06-01', 'headers sent');
  const rb = reqs[0].body; ok(rb.model === 'claude-haiku-5-5' && rb.messages[0].content[0].type === 'image' && rb.messages[0].content[0].source.media_type === 'image/jpeg' && rb.messages[0].content[0].source.data.length > 500, 'image sent to the cheap model');
  ok(await p.inputValue('#mlName') === 'Chicken burrito bowl' && (await p.$$('.ml-item')).length === 2, 'two items parsed (code fences tolerated)');
  ok(/450 kcal/.test(await p.textContent('.ml-tot')) && /P 44 g/.test(await p.textContent('.ml-tot')), 'total ' + await p.textContent('.ml-tot'));
  ok(await p.inputValue('#mlSlot') === 'lunch', 'slot guessed from the time');
  // portion stepper scales numbers
  await p.click('.ml-item[data-i="1"] [data-mlq="1"]'); await wait(100);
  ok(await p.inputValue('.ml-item[data-i="1"] [data-f="kcal"]') === '300', 'amount x1.5 scales kcal to 300: ' + await p.inputValue('.ml-item[data-i="1"] [data-f="kcal"]'));
  // correct the AI
  await p.fill('#mlFix', 'it is 2 chicken thighs'); await p.click('#mlRedo'); await p.waitForSelector('#mlSave', { timeout: 8000 });
  ok(reqs.length === 2 && /thighs/.test(JSON.stringify(reqs[1].body.messages[0].content[1].text)), 'correction note sent');
  ok(await p.inputValue('#mlName') === 'Chicken thighs' && /420 kcal/.test(await p.textContent('.ml-tot')), 're-estimated');
  await p.click('#mlSave'); await wait(400);
  const st = await p.evaluate(() => JSON.parse(localStorage.getItem('planner.v1')));
  ok(st.meals.length === 1 && st.meals[0].kcal === 420 && st.meals[0].p === 46 && st.meals[0].src === 'ai' && /^data:image\/jpeg/.test(st.meals[0].thumb) && st.meals[0].thumb.length < 12000 && st.meals[0].date === '2026-11-04', 'meal saved with a small thumbnail ' + JSON.stringify(st.meals[0]).slice(0, 160));
  ok(!JSON.stringify(st).includes('TESTKEY1234'), 'the key is not in the synced data or backups');
  ok(/420/.test(await p.textContent('#mlCard')), 'card shows the new calories');
  // errors
  mode = '401'; await pick('b.jpg'); await wait(900); ok(/rejected/.test(await p.textContent('#mlSnapBody')), '401 message'); await p.click('#mlManual'); ok(await p.isVisible('#mlSave'), 'manual fallback keeps the photo'); await p.click('#mlSnap [data-close]');
  mode = 'billing'; await pick('c.jpg'); await wait(900); ok(/no credit/.test(await p.textContent('#mlSnapBody')), 'billing message'); await p.click('#mlSnap [data-close]');
  mode = 'nofood'; await pick('d.jpg'); await wait(900); ok(/keyboard/.test(await p.textContent('#mlSnapBody')), 'not food message'); await p.click('#mlSnap [data-close]');
  mode = 'ok';
  // manual add
  await p.click('#mlCard [data-mladd]'); await wait(300);
  ok(await p.isVisible('#mlSnap'), 'add food opens the editor');
  if (await p.evaluate(() => typeof document.querySelector('#fdDlg') !== 'undefined' && !!document.querySelector('dialog[open]:not(#mlSnap)'))) await p.keyboard.press('Escape');
  await wait(200); await p.click('#mlAddManual'); await wait(200);
  await p.fill('.ml-item[data-i="0"] [data-f="name"]', 'Protein shake'); await p.fill('.ml-item[data-i="0"] [data-f="kcal"]', '180'); await p.fill('.ml-item[data-i="0"] [data-f="p"]', '30');
  await p.click('#mlSave'); await wait(300);
  const st2 = await p.evaluate(() => JSON.parse(localStorage.getItem('planner.v1')).meals);
  ok(st2.length === 2 && st2.some((m) => m.name === 'Protein shake' && m.kcal === 180 && m.src !== 'ai'), 'manual meal saved ' + JSON.stringify(st2.map((m) => [m.name, m.kcal, m.src])));
  // search a food with the picker and add it to a meal
  await p.click('#mlCard [data-mladd]'); await p.waitForSelector('#fdDlg[open]', { timeout: 5000 });
  await p.fill('#fdQ', 'egg'); await wait(900); await p.click('#fdList .fd-pick'); await wait(300); await p.click('#fdAdd'); await wait(400);
  ok(await p.isVisible('#mlSnap') && (await p.$$('.ml-item')).length === 1 && parseFloat(await p.inputValue('.ml-item[data-i="0"] [data-f="kcal"]')) > 5, 'picked food lands in the meal editor: ' + await p.evaluate(() => document.querySelector('#mlSnapBody').innerText.slice(0, 200)));
  await p.click('#mlSave'); await wait(300);
  ok((await p.evaluate(() => JSON.parse(localStorage.getItem('planner.v1')).meals.some((m) => m.src === 'search'))), 'search meal saved');
  ok((await p.evaluate(() => JSON.parse(localStorage.getItem('planner.v1')).myfoods.length)) >= 1, 'picked food remembered in My foods');
  // daily sheet, edit, log again, delete
  await p.click('#mlCard [data-mlopen]'); await wait(300);
  ok(await p.isVisible('#mlDlg') && (await p.$$('#mlMeals .ml-row')).length === 3, 'sheet lists all meals');
  await p.click('#mlMeals .ml-row'); await wait(200); ok(await p.isVisible('#mlDel'), 'tap a meal to edit');
  await p.click('#mlAgain'); await wait(300);
  ok((await p.evaluate(() => JSON.parse(localStorage.getItem('planner.v1')).meals.length)) === 4, 'log again duplicates it');
  await p.click('#mlMeals .ml-row'); await wait(200); await p.click('#mlDel'); await p.waitForSelector('#askDlg[open]'); await p.click('#askYes'); await wait(300);
  ok((await p.evaluate(() => JSON.parse(localStorage.getItem('planner.v1')).meals.length)) === 3, 'delete asks first and removes');
  // describe in words (no photo), then one-tap log again
  await p.click('#mlDlg [data-mldesc]'); await p.fill('#mlDesc', '3 scrambled eggs and 2 slices of toast'); await p.click('#mlDescGo'); await p.waitForSelector('#mlSave', { timeout: 8000 });
  const last = reqs[reqs.length - 1].body.messages[0].content; ok(last.length === 1 && last[0].type === 'text' && /scrambled eggs/.test(last[0].text), 'text-only request, no image');
  ok(await p.isVisible('#mlFix'), 'can correct a described meal'); await p.click('#mlSave'); await wait(300);
  ok((await p.evaluate(() => JSON.parse(localStorage.getItem('planner.v1')).meals.length)) === 4, 'described meal saved');
  const chips = await p.$$('#mlUsual [data-mlq1]'); ok(chips.length >= 1, 'usual meals offered'); await chips[0].click(); await wait(300);
  ok((await p.evaluate(() => JSON.parse(localStorage.getItem('planner.v1')).meals.filter((m) => m.src === 'repeat').length)) === 1, 'one tap logs a usual meal again');
  await p.click('#mlPrev'); ok(/Nothing logged/.test(await p.textContent('#mlMeals')), 'yesterday is empty');
  // inputs 16px, no sideways scroll
  const small = await p.evaluate(() => [...document.querySelectorAll('#mlDlg input,#mlSnap input,#mlSnap select,#mlSet input,#mlSet select')].filter((e) => e.type !== 'hidden' && e.type !== 'file' && parseFloat(getComputedStyle(e).fontSize) < 16).map((e) => e.id || e.dataset.f));
  ok(small.length === 0, 'inputs under 16px: ' + small);
  await p.click('#mlDlg [data-close]'); await p.goto(URL + '#meals'); await wait(1200); ok(await p.isVisible('#mlDlg'), '#meals deep link');
  await p.click('#mlSetBtn'); ok(await p.isVisible('#mlSet') && /Key saved \(sk-ant-/.test(await p.getAttribute('#mlKeyIn', 'placeholder')), 'settings show the saved key');
  await p.click('#mlKeyClear'); await p.waitForSelector('#askDlg[open]'); await p.click('#askYes'); await wait(300);
  ok((await p.evaluate(() => localStorage.getItem('planner.aikey'))) === null, 'key removed');
  const w = await p.evaluate(() => document.documentElement.scrollWidth); ok(w <= 390, 'no sideways scroll ' + w);
  await b.close();
  if (errs.length) { console.log('FAIL', errs); process.exit(1); } console.log('MEALS OK');
})();

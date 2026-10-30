// Food database, scanner and picker: PORT=8791 node planner/tests/fooddb.test.js  (serve the site first, see lib-food.js)
// The ZXing fallback test serves the pinned @zxing/library@0.21.3 build from ZXING_FILE (default /tmp/zxing-0.21.3.js; fetch it with curl from
// https://cdn.jsdelivr.net/npm/@zxing/library@0.21.3/umd/index.min.js) instead of the live CDN.
const fs = require('fs');
const { chromium, wait, checker, open, st, mockOff } = require('./lib-food');
(async () => {
  const { ok, done } = checker();
  const b = await chromium.launch({ args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] });
  const F = (p, fn, ...a) => p.evaluate(`(async()=>{const f=window.__food;return (${fn.toString()})(f,...${JSON.stringify(a)})})()`);

  // ---- lookups, parsing, cache, failures
  {
    const { ctx, p, errs } = await open(b); const hits = await mockOff(ctx);
    ok(await F(p, (f) => f.count()) >= 110, 'offline starter list has 110+ foods: ' + await F(p, (f) => f.count()));
    const fo = await F(p, (f) => f.fdLookup('3017620422003'));
    ok(fo && fo.name === 'Hazelnut spread' && fo.brand === 'Acme' && fo.barcode === '3017620422003', 'lookup name, first brand, barcode');
    ok(fo.serving.grams === 15 && fo.serving.label === '15 g' && fo.per100.kcal === 539 && fo.per100.fiber === 3, 'serving and per100');
    ok(fo.perServing.kcal === 81 && fo.perServing.p === 0.9 && fo.perServing.c === 8.6 && fo.perServing.f === 4.6, 'perServing = per100 x 15 g: ' + JSON.stringify(fo.perServing));
    await F(p, (f) => f.fdLookup('3017620422003'));
    ok(hits.product === 1, 'second lookup comes from memory (1 network call): ' + hits.product);
    const c = await p.evaluate(() => JSON.parse(localStorage.getItem('planner.fdcache')));
    ok(c && c['3017620422003'] && c['3017620422003'].food.name === 'Hazelnut spread', 'cached in localStorage planner.fdcache');
    ok(!(await st(p)).fdcache, 'cache is not in the synced state');
    const kj = await F(p, (f) => f.fdLookup('5000000000000'));
    ok(kj && kj.per100.kcal === 400 && kj.serving.grams === 100 && kj.serving.label === '100 g', 'kJ converted (1674 kJ = 400 kcal), 100 g default serving: ' + JSON.stringify(kj && kj.per100));
    ok((await F(p, (f) => f.fdLookup('4006381333931'))) === null, 'unknown barcode -> null');
    ok((await F(p, (f) => f.fdLookup('12'))) === null && (await F(p, (f) => f.fdLookup('abc'))) === null, 'junk input -> null');
    const s = await F(p, (f) => f.fdSearch('zebra'));
    ok(s.length === 2 && s[0].name === 'Zebra granola' && s[0].perServing.kcal === 180 && s[1].per100.kcal === 300, 'search: 2 results, no-kcal/no-name/duplicate dropped, kJ->kcal: ' + JSON.stringify(s.map((x) => [x.name, x.per100.kcal])));
    ok(hits.urls.some((u) => /search_simple=1&action=process&json=1&page_size=20&fields=/.test(u)), 'search url shape');
    ok(hits.urls.some((u) => /fields=code,product_name,brands,nutriments,serving_size,serving_quantity/.test(u)), 'product fields requested');
    ok((await F(p, (f) => f.fdSearch('a'))).length === 0, 'one-letter search -> []');
    ok(!errs.length, 'no page errors ' + errs);
    await ctx.unroute('**/world.openfoodfacts.org/**'); await ctx.route('**/world.openfoodfacts.org/**', (r) => r.abort());
    ok((await F(p, (f) => f.fdLookup('7622210449283'))) === null && (await F(p, (f) => f.fdSearch('cheese'))).length === 0, 'network failure -> null and []');
    await ctx.unroute('**/world.openfoodfacts.org/**'); await ctx.route('**/world.openfoodfacts.org/**', (r) => r.fulfill({ status: 500, body: 'oops' }));
    ok((await F(p, (f) => f.fdLookup('7622210449283'))) === null, 'HTTP 500 -> null');
    await ctx.unroute('**/world.openfoodfacts.org/**'); await ctx.route('**/world.openfoodfacts.org/**', () => { /* never answers */ });
    const pr = p.evaluate(() => window.__food.fdLookup('7622210449283').then((x) => x === null));
    await wait(300); await p.clock.fastForward(8500); ok(await pr, 'a hung request gives up (8 s timeout) with null');
    ok(!(await p.evaluate(() => JSON.parse(localStorage.getItem('planner.fdcache'))['7622210449283'])), 'failures are not cached');
    await ctx.close();
  }

  // ---- offline search, scaling, favorites
  {
    const { ctx, p } = await open(b); await ctx.route('**/world.openfoodfacts.org/**', (r) => r.abort());
    const eg = await F(p, (f) => f.fdLocal('egg'));
    ok(eg.length >= 3 && /^Egg/.test(eg[0].name), 'local search "egg": ' + eg.map((x) => x.name).slice(0, 3));
    ok((await F(p, (f) => f.fdLocal('chiken breast')))[0].name === 'Chicken breast, cooked', 'typo "chiken breast" still finds chicken breast');
    ok((await F(p, (f) => f.fdLocal('Eggs')))[0].name.startsWith('Egg'), 'plural "Eggs"');
    ok((await F(p, (f) => f.fdLocal('pizza'))).length === 2 && (await F(p, (f) => f.fdLocal('zzzzqq'))).length === 0, 'pizza -> 2, nonsense -> 0');
    ok((await F(p, (f) => f.fdLocal(''))).length === 0, 'empty query -> []');
    const ban = (await F(p, (f) => f.fdLocal('banana')))[0];
    ok(ban.serving.grams === 118 && ban.perServing.kcal === 105, 'banana 118 g = 105 kcal');
    const sc = await F(p, (f, b) => f.fdScale(b, { qty: 2 }), ban);
    ok(sc.kcal === 210 && sc.grams === 236 && sc.qty === 2 && sc.p === 2.6 && sc.c === 54.3, 'scale 2 servings: ' + JSON.stringify({ k: sc.kcal, g: sc.grams, p: sc.p, c: sc.c }));
    const sg = await F(p, (f, b) => f.fdScale(b, { grams: 59 }), ban);
    ok(sg.qty === 0.5 && sg.kcal === 53 && sg.grams === 59, 'scale 59 g = half a serving, 53 kcal: ' + JSON.stringify({ q: sg.qty, k: sg.kcal }));
    await F(p, (f, b) => { f.fdTouch(b); f.fdTouch(b); }, ban);
    let s = await st(p); const mine = s.myfoods.find((x) => x.name === 'Banana');
    ok(mine && mine.used === 2 && mine.last > 0 && mine.kcal === 105 && mine.serving === '1 medium (118 g)' && mine.per100.kcal === 89 && mine.fav === false, 'fdTouch creates then counts: ' + JSON.stringify(mine));
    ok(s.myfoods.length === 1, 'no duplicate saved food');
    const apple = (await F(p, (f) => f.fdLocal('apple')))[0];
    await F(p, (f, a) => f.fdToggleFav(a), apple);
    s = await st(p); ok(s.myfoods.find((x) => x.name === 'Apple').fav === true, 'favorite saved (commit) in myfoods');
    ok(s.myfoods.every((x) => x.id && x.name && typeof x.used === 'number'), 'saved items have id, name, used');
    await F(p, (f, a) => f.fdToggleFav(a), apple);
    ok((await st(p)).myfoods.find((x) => x.name === 'Apple').fav === false, 'favorite toggles off');
    await F(p, (f, a) => f.fdToggleFav(a), apple);
    const r = await F(p, (f) => f.fdLocal('ap'));
    ok(r[0].name === 'Apple', 'favorite sorts first for "ap": ' + r.slice(0, 3).map((x) => x.name));
    const sv = await F(p, (f) => f.fdLocal('banana'));
    ok(sv.filter((x) => x.name === 'Banana').length === 1, 'saved food hides the built-in duplicate');
    await ctx.close();
  }

  // ---- the picker UI
  {
    const { ctx, p } = await open(b, { hash: '#find-food' }); const hits = await mockOff(ctx);
    ok(await p.isVisible('#fdDlg'), '#find-food opens the sheet');
    ok(await p.evaluate(() => document.documentElement.scrollWidth) <= 390, 'no sideways scroll at 390');
    ok(await p.evaluate(() => parseFloat(getComputedStyle(document.querySelector('#fdQ')).fontSize)) >= 16, 'search input is 16px');
    ok(/Common foods/.test(await p.textContent('#fdList')), 'empty state offers common foods');
    await p.fill('#fdQ', 'banana'); await wait(100);
    ok(/Banana/.test(await p.textContent('#fdList')), 'local result shows instantly');
    await p.fill('#fdQ', 'zebra'); await p.clock.runFor(500); await wait(300);
    ok(/Online \(Open Food Facts\)/.test(await p.textContent('#fdList')) && /Zebra granola/.test(await p.textContent('#fdList')), 'online results appear after the debounce');
    ok(hits.search === 1, 'one search call (debounced): ' + hits.search);
    await p.fill('#fdQ', 'banana'); await wait(100);
    await p.click('[data-fdi]'); ok(await p.isVisible('#fdAmt'), 'row opens the amount view');
    ok(await p.evaluate(() => parseFloat(getComputedStyle(document.querySelector('#fdAmt')).fontSize)) >= 16, 'amount input is 16px');
    ok(await p.inputValue('#fdAmt') === '1' && /105/.test(await p.textContent('#fdOutBox')), '1 serving = 105 kcal');
    for (let i = 0; i < 4; i++) await p.click('[data-fdstep="1"]');
    ok(await p.inputValue('#fdAmt') === '2' && /210/.test(await p.textContent('#fdOutBox')), 'steps of 0.25: 2 servings = 210 kcal');
    await p.fill('#fdAmt', '0.1'); await p.dispatchEvent('#fdAmt', 'change');
    ok(await p.inputValue('#fdAmt') === '0.25', 'amount clamps to 0.25 minimum');
    await p.fill('#fdAmt', '99'); await p.dispatchEvent('#fdAmt', 'change');
    ok(await p.inputValue('#fdAmt') === '10', 'amount clamps to 10 maximum');
    await p.click('[data-fdm="g"]'); await p.fill('#fdAmt', '100'); await wait(50);
    ok(/89/.test(await p.textContent('#fdOutBox')) && /100 g/.test(await p.textContent('#fdOutSub')), '100 g = 89 kcal: ' + await p.textContent('#fdOutBox'));
    await p.click('#fdDetFav'); ok((await st(p)).myfoods.some((x) => x.name === 'Banana' && x.fav), 'star in the amount view saves a favorite');
    await p.click('#fdAdd'); await wait(200);
    ok(!(await p.isVisible('#fdDlg')), 'Done closes the sheet');
    ok(/Banana: 89 kcal/.test(await p.textContent('#toastMsg')), 'deep link toasts the result: ' + await p.textContent('#toastMsg'));
    await p.evaluate(() => { window.__food.fdPicker({ cta: 'Log it' }); }); await wait(100);
    ok(/Favorites/.test(await p.textContent('#fdList')) && /Banana/.test(await p.textContent('#fdList')), 'favorites section lists Banana');
    await p.click('[data-fdi]'); ok((await p.textContent('#fdAdd')) === 'Log it', 'cta option used'); await p.click('#fdBack');
    ok(await p.isVisible('#fdQ'), 'Back returns to the list');
    await p.keyboard.press('Escape'); await wait(100); ok(!(await p.isVisible('#fdDlg')), 'Escape closes');
    await ctx.close();
  }

  // ---- scanner with a BarcodeDetector stub + Chromium's fake camera
  const stubs = `
    window.__streams = [];
    const gum = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia = async (c) => { window.__gumArg = JSON.stringify(c); const s = await gum(c); window.__streams.push(s); return s; };
    window.BarcodeDetector = class { constructor(o) { window.__bdFormats = o && o.formats; } async detect() { return window.__bdHit ? [{ rawValue: window.__bdHit, format: 'ean_13' }] : []; } };
  `;
  {
    const { ctx, p } = await open(b, { init: stubs, perms: ['camera'] }); await mockOff(ctx);
    await p.evaluate(() => { window.__food.fdPicker({}); });
    await p.click('#fdScanBtn'); await wait(500);
    ok(await p.isVisible('#fdScanDlg') && await p.isVisible('.fd-frame b'), 'scanner opens with viewfinder and scan line');
    ok((await p.evaluate(() => window.__gumArg)).includes('"facingMode":{"ideal":"environment"}'), 'asks for the rear camera: ' + await p.evaluate(() => window.__gumArg));
    ok(await p.evaluate(() => { const v = document.querySelector('#fdVideo'); return v.muted && v.hasAttribute('playsinline'); }), 'video is muted + playsinline');
    ok(await p.evaluate(() => window.__bdFormats.includes('ean_13') && window.__bdFormats.includes('upc_a')), 'BarcodeDetector used with EAN/UPC formats');
    ok(await p.evaluate(() => window.__streams.length === 1 && window.__streams[0].getTracks().every((t) => t.readyState === 'live')), 'stream is live while scanning');
    ok(await p.evaluate(() => document.documentElement.scrollWidth) <= 390, 'no sideways scroll with scanner');
    await p.evaluate(() => { window.__bdHit = '3017620422003'; }); await p.clock.runFor(600); await wait(500);
    ok(!(await p.isVisible('#fdScanDlg')), 'scanner closes on a hit');
    ok(await p.evaluate(() => window.__streams[0].getTracks().every((t) => t.readyState === 'ended')), 'camera stream stopped after a hit');
    await p.waitForSelector('#fdAmt', { timeout: 3000 }); ok(/Hazelnut spread/.test(await p.textContent('#fdBody')), 'barcode -> lookup -> amount view');
    ok(/81/.test(await p.textContent('#fdOutBox')), '1 serving of the scanned food = 81 kcal');
    ok((await st(p)).myfoods.length === 0, 'looking at a food does not save it');
    await p.click('#fdBack'); await p.evaluate(() => { window.__bdHit = ''; }); await p.click('#fdScanBtn'); await wait(400);
    ok(await p.isVisible('#fdScanDlg'), 'scanner reopens'); await p.keyboard.press('Escape'); await wait(200);
    ok(!(await p.isVisible('#fdScanDlg')) && await p.evaluate(() => window.__streams.every((s) => s.getTracks().every((t) => t.readyState === 'ended'))), 'Escape closes the scanner and stops the camera');
    ok(await p.isVisible('#fdDlg'), 'picker still open under the scanner');
    await p.click('#fdScanBtn'); await wait(300);
    await p.fill('#fdScanNum', '3017620422004'); await p.press('#fdScanNum', 'Enter');
    ok(/check/.test(await p.textContent('#fdScanMsg')) && await p.isVisible('#fdScanDlg'), 'bad check digit is refused with a message');
    await p.fill('#fdScanNum', '123'); await p.press('#fdScanNum', 'Enter'); ok(/8 to 14/.test(await p.textContent('#fdScanMsg')), 'too short is refused');
    ok(await p.evaluate(() => parseFloat(getComputedStyle(document.querySelector('#fdScanNum')).fontSize)) >= 16, 'manual input is 16px');
    await p.fill('#fdScanNum', '3017620422003'); await p.press('#fdScanNum', 'Enter'); await p.waitForSelector('#fdAmt', { timeout: 3000 });
    ok(/Hazelnut spread/.test(await p.textContent('#fdBody')), 'typed number -> lookup');
    ok(await p.evaluate(() => window.__streams.every((s) => s.getTracks().every((t) => t.readyState === 'ended'))), 'all streams stopped');
    await ctx.close();
  }

  // ---- no BarcodeDetector: the lazy ZXing build decodes a drawn EAN-13 from a canvas stream
  {
    const zf = process.env.ZXING_FILE || '/tmp/zxing-0.21.3.js';
    if (!fs.existsSync(zf)) console.log('  SKIP ZXing decode test (no ' + zf + ')');
    else {
      const init = `
      delete window.BarcodeDetector;
      const L=['0001101','0011001','0010011','0111101','0100011','0110001','0101111','0111011','0110111','0001011'];
      const R=L.map(s=>s.replace(/./g,c=>c==='0'?'1':'0')), G=R.map(s=>s.split('').reverse().join(''));
      const PAR=['LLLLLL','LLGLGG','LLGGLG','LLGGGL','LGLLGG','LGGLLG','LGGGLL','LGLGLG','LGLGGL','LGGLGL'];
      function ean(code){ let bits='101'; const par=PAR[+code[0]]; for(let i=0;i<6;i++) bits+=(par[i]==='L'?L:G)[+code[i+1]]; bits+='01010'; for(let i=7;i<13;i++) bits+=R[+code[i]]; return bits+'101'; }
      navigator.mediaDevices.getUserMedia = async () => {
        const cv = document.createElement('canvas'); cv.width = 640; cv.height = 360; const x = cv.getContext('2d');
        const bits = ean('3017620422003'), m = 4, w0 = (640 - bits.length * m) / 2;
        const draw = () => { x.fillStyle = '#fff'; x.fillRect(0, 0, 640, 360); x.fillStyle = '#000'; for (let i = 0; i < bits.length; i++) if (bits[i] === '1') x.fillRect(w0 + i * m, 80, m, 200); };
        draw(); setInterval(draw, 100); const s = cv.captureStream(15); (window.__streams = window.__streams || []).push(s); return s;
      };`;
      const { ctx, p } = await open(b, { init, perms: ['camera'], clock: false }); await mockOff(ctx);
      let loads = 0;
      await ctx.route('https://cdn.jsdelivr.net/npm/@zxing/library@0.21.3/umd/index.min.js', (r) => { loads++; r.fulfill({ status: 200, contentType: 'application/javascript', headers: { 'access-control-allow-origin': '*' }, body: fs.readFileSync(zf, 'utf8') }); });
      await p.evaluate(() => { window.__food.fdPicker({}); }); await p.click('#fdScanBtn');
      await p.waitForSelector('#fdAmt', { timeout: 20000 });
      ok(/Hazelnut spread/.test(await p.textContent('#fdBody')), 'ZXing fallback decoded the EAN-13 from video frames (library loaded ' + loads + 'x, with SRI)');
      ok(await p.evaluate(() => window.__streams.every((s) => s.getTracks().every((t) => t.readyState === 'ended'))), 'stream stopped');
      await ctx.close();
    }
  }
  // ---- error messages
  {
    const { ctx, p } = await open(b, { init: `navigator.mediaDevices.getUserMedia = async () => { const e = new Error('no'); e.name = 'NotAllowedError'; throw e; };` });
    await p.evaluate(() => { window.__food.fdScan(); }); await wait(300);
    ok(/permission/i.test(await p.textContent('#fdScanMsg')) && await p.isVisible('#fdScanNum'), 'permission denied: clear message + typed fallback visible: ' + await p.textContent('#fdScanMsg'));
    await p.fill('#fdScanNum', '3017620422003'); await p.press('#fdScanNum', 'Enter'); await wait(200);
    ok(!(await p.isVisible('#fdScanDlg')), 'typed number resolves fdScan');
    await ctx.close();
  }
  {
    const { ctx, p } = await open(b, { init: `Object.defineProperty(window, 'isSecureContext', { value: false });` });
    await p.evaluate(() => { window.__food.fdScan(); }); await wait(200);
    ok(/secure/i.test(await p.textContent('#fdScanMsg')), 'insecure page: clear message: ' + await p.textContent('#fdScanMsg'));
    await p.click('#fdScanX'); await wait(100);
    const r = await p.evaluate(async () => { const pr = window.__food.fdScan(); document.querySelector('#fdScanX').click(); return await pr; });
    ok(r === null, 'closing resolves null');
    await ctx.close();
  }
  {
    const { ctx, p } = await open(b, { init: `delete window.BarcodeDetector;`, perms: ['camera'] });
    await ctx.route('https://cdn.jsdelivr.net/**', (r) => r.abort());
    await p.evaluate(() => { window.__food.fdScan(); }); await wait(1200);
    ok(/could not load|offline/i.test(await p.textContent('#fdScanMsg')), 'scanner library blocked: message: ' + await p.textContent('#fdScanMsg'));
    await ctx.close();
  }
  await b.close(); done('FOODDB');
})();

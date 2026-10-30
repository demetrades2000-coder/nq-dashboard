// Food resolver (fkResolve, USDA, cache, rate limit, sanity): PORT=8793 node planner/tests/fk-resolve.test.js  (serve the site first, see lib-food.js)
const { chromium, wait, checker, open, K, near, mockUsda, mockOff } = require('./lib-fk');
(async () => {
  const { ok, done } = checker();
  const b = await chromium.launch();
  const R = (p, o) => K(p, (k, o) => k.fkResolve(o), o);

  // ---- built-in list answers without any network
  {
    const { ctx, p, errs } = await open(b); const usda = await mockUsda(ctx); const off = await mockOff(ctx);
    let r = await R(p, { name: 'grilled chicken breast', grams: 150 });
    ok(r && r.source === 'kb' && r.conf === 'high' && r.nutrients.kcal === 248 && near(r.nutrients.p, 46.5) && r.grams === 150, 'grilled chicken breast 150 g -> kb, 248 kcal, 46.5 g protein, high: ' + JSON.stringify(r && [r.source, r.conf, r.nutrients.kcal, r.nutrients.p]));
    ok(r.range.kcal === 248 && r.range.low === 228 && r.range.high === 268 && r.range.pct === 8, 'high confidence band is +-8%: ' + JSON.stringify(r.range));
    ok(r.nutrients.fiber === 0 && r.nutrients.na === 111 && near(r.nutrients.sat, 1.5), 'extended nutrients come with it (fiber, sodium, saturated fat): ' + JSON.stringify(r.nutrients));
    const raw = await R(p, { name: 'raw chicken breast', grams: 150 }), cook = await R(p, { name: 'chicken breast cooked', grams: 150 });
    ok(raw.nutrients.kcal === 180 && cook.nutrients.kcal === 248 && /raw/.test(raw.label) && /cooked/.test(cook.label), 'raw (180) vs cooked (248) is chosen from the words');
    const rice = await R(p, { name: 'white rice', portion: '1 cup' });
    ok(rice.grams === 158 && rice.nutrients.kcal === 205 && rice.conf === 'high', '1 cup white rice -> 158 g, 205 kcal: ' + rice.grams + '/' + rice.nutrients.kcal);
    ok(!/Assumed/.test(rice.note) || /cooked/.test(rice.note), 'a note says when cooked was assumed: "' + rice.note + '"');
    const dry = await R(p, { name: 'dry rice', grams: 50 }); ok(dry.nutrients.kcal === 183 && /Rice white, raw/.test(dry.label), '50 g dry rice = 183 kcal: ' + dry.nutrients.kcal);
    const eggs = await R(p, { name: 'eggs', portion: '2 large' }); ok(eggs.grams === 100 && eggs.nutrients.kcal === 143 && near(eggs.nutrients.p, 12.6), '2 large eggs -> 143 kcal / 12.6 g protein');
    const oil = await R(p, { name: 'olive oil', portion: '1 tbsp' }); ok(oil.nutrients.kcal === 119 && oil.grams === 13.5, '1 tbsp olive oil -> 119 kcal');
    const rb = await R(p, { name: 'ribeye steak', grams: 300 }); ok(rb.source === 'kb' && rb.conf === 'medium' && /Typical/.test(rb.note) && rb.range.pct === 15, 'restaurant value is typ: medium confidence, +-15%, note says typical: ' + [rb.conf, rb.note]);
    const nogram = await R(p, { name: 'banana' }); ok(nogram.grams === 118 && nogram.conf === 'medium' && /No amount given/.test(nogram.note), 'no amount -> one typical serving (118 g), confidence drops a step, note says so: ' + [nogram.grams, nogram.conf, nogram.note]);
    const gen = await R(p, { name: 'oatmeal', portion: '2 zorbs' }); ok(gen && gen.grams === 100 && gen.conf === 'medium' && /No amount given/.test(gen.note), 'an unreadable portion falls back to a typical serving and lowers confidence: ' + (gen && [gen.grams, gen.conf, gen.note]));
    ok(usda.hits === 0 && off.search === 0, 'none of those touched the network (usda ' + usda.hits + ', off ' + off.search + ')');
    const blank = await R(p, { name: '   ' }); ok(blank === null, 'empty name -> null');
    const junk = await R(p, null); ok(junk === null, 'null input -> null, no throw');
    const all = await K(p, (k) => k.fkResolveAll([{ name: 'banana', grams: 118 }, { name: 'olive oil', grams: 14 }, { name: '' }]));
    ok(all.length === 3 && all[0].nutrients.kcal === 105 && all[1].nutrients.kcal === 124 && all[2] === null, 'fkResolveAll keeps the order and nulls: ' + all.map((x) => x && x.nutrients.kcal));
    const it = await K(p, (k) => k.fkItem({ ...{ name: 'Banana', label: 'Banana', grams: 118, source: 'kb', conf: 'high', nutrients: { kcal: 105, p: 1.3, c: 26.9, f: 0.4, fiber: 3.1, sugar: 14.4, na: 1, sat: 0.1 } } }));
    ok(it.name === 'Banana' && it.grams === 118 && it.kcal === 105 && it.fiber === 3.1 && it.na === 1 && it.sat === 0.1 && it.src === 'kb', 'fkItem makes a meal item with the extended fields: ' + JSON.stringify(it));
    ok(!errs.length, 'no page errors ' + errs);
    await ctx.close();
  }

  // ---- USDA: URL shape, nutrient ids, state, cache, own key
  {
    const { ctx, p, errs } = await open(b); const usda = await mockUsda(ctx); await ctx.route('**/world.openfoodfacts.org/**', (r) => r.abort());
    let r = await R(p, { name: 'rutabaga', grams: 200 });
    ok(r && r.source === 'usda' && r.conf === 'high' && /Rutabagas, raw/.test(r.note), 'unknown food -> USDA: ' + (r && r.note));
    ok(r.nutrients.kcal === 76 && near(r.nutrients.p, 2.2) && near(r.nutrients.c, 17.2) && near(r.nutrients.fiber, 4.6) && near(r.nutrients.sugar, 8.9) && r.nutrients.na === 24 && near(r.nutrients.sat, 0), '200 g of per-100 values (38 kcal, 1.08 p, 8.62 c, fiber 2.3, sugar 4.46, Na 12): ' + JSON.stringify(r.nutrients));
    const u = new URL(usda.urls[0]);
    ok(u.host === 'api.nal.usda.gov' && u.pathname === '/fdc/v1/foods/search' && u.searchParams.get('query') === 'rutabaga' && u.searchParams.get('dataType') === 'Foundation,SR Legacy' && u.searchParams.get('pageSize') === '5' && u.searchParams.get('api_key') === 'DEMO_KEY', 'request: search, dataType Foundation,SR Legacy, pageSize 5, DEMO_KEY: ' + usda.urls[0]);
    ok(usda.hits === 1, 'one network call');
    let c = await p.evaluate(() => JSON.parse(localStorage.getItem('planner.fkcache')));
    ok(c && c.e && Object.keys(c.e).length === 1 && c.e['rutabaga'].r.length === 2, 'cached in localStorage planner.fkcache by normalized query: ' + Object.keys(c.e));
    const again = await R(p, { name: 'Rutabagas', grams: 100 });
    ok(usda.hits === 1 && again.source === 'usda' && again.nutrients.kcal === 38, 'plural / different case / other grams is a cache hit (no new call): hits ' + usda.hits);
    const st = await K(p, (k) => k.fkStatus()); ok(st.stats.cacheHits === 1 && st.stats.cacheMisses === 1 && st.cacheSize === 1 && st.usda.key === 'demo', 'stats: 1 hit, 1 miss, 1 entry, demo key: ' + JSON.stringify(st.stats));
    ok(!(await p.evaluate(() => localStorage.getItem('planner.v1') || '').then((s) => /fkcache|rutabaga/i.test(s))), 'the cache is not in the synced state');
    const boiled = await R(p, { name: 'boiled rutabaga', grams: 100 }); ok(boiled && /cooked, boiled/.test(boiled.note) && boiled.nutrients.kcal === 35, 'state words pick the cooked USDA entry: ' + (boiled && boiled.note));
    const raw2 = await R(p, { name: 'rutabaga raw', grams: 100 }); ok(raw2 && raw2.nutrients.kcal === 38 && /raw/i.test(raw2.note), 'and the raw one');
    const k2 = await R(p, { name: 'kohlrabi', grams: 100 }); ok(k2 && k2.source === 'usda' && k2.nutrients.kcal === 27, 'Foundation entries without 1008 use energy 2047: ' + (k2 && k2.nutrients.kcal));
    const bogus = await R(p, { name: 'bogus food', grams: 100 }); ok(bogus === null, 'an impossible USDA entry (900 kcal with no macros) is dropped, so nothing credible -> null');
    const ven = await R(p, { name: 'venison', grams: 100 }); ok(ven && ven.source === 'usda' && ven.nutrients.fiber === undefined && ven.nutrients.kcal === 120, 'a nutrient USDA does not give stays absent (fiber): ' + JSON.stringify(ven && ven.nutrients));
    // own key
    await p.evaluate(() => localStorage.setItem('planner.usdakey', ' MYOWNKEY123 '));
    const n0 = usda.hits; await R(p, { name: 'rutabaga cooked soup', grams: 100 }); await R(p, { name: 'kohlrabi leaves', grams: 100 });
    ok(usda.urls.slice(n0).every((x) => new URL(x).searchParams.get('api_key') === 'MYOWNKEY123') && usda.hits > n0, 'a key in planner.usdakey is used (trimmed) instead of DEMO_KEY');
    ok((await K(p, (k) => k.fkStatus())).usda.key === 'own', 'status says own key');
    ok(!errs.length, 'no page errors ' + errs);
    await ctx.close();
  }

  // ---- cache: prune oldest, least recently used kept
  {
    const { ctx, p } = await open(b);
    const res = await K(p, (k) => {
      for (let i = 0; i < 405; i++) k.fkCachePut('food number ' + i, [{ id: 'x' + i, n: 'Food ' + i, dt: 'SR Legacy', v: [1, 0, 0, 0, null, null, null, null] }]);
      return { size: k.fkCacheSize(), first: k.fkCacheGet('food number 0'), fifth: k.fkCacheGet('food number 5'), fourth: k.fkCacheGet('food number 4'), last: k.fkCacheGet('food number 404') };
    });
    ok(res.size === 400 && res.first === null && res.fourth === null && res.fifth !== null && res.last && res.last[0].id === 'x404', 'cache capped at 400: entries 0-4 pruned, 5 and the newest kept: size ' + res.size);
    const res2 = await K(p, (k) => {
      k.fkCacheGet('food number 6'); // use it, so it becomes the newest
      for (let i = 405; i < 410; i++) k.fkCachePut('food number ' + i, [{ id: 'y' + i, n: 'Food', dt: '', v: [1, 0, 0, 0, null, null, null, null] }]);
      return { size: k.fkCacheSize(), six: k.fkCacheGet('food number 6') !== null, seven: k.fkCacheGet('food number 7') };
    });
    ok(res2.size === 400 && res2.six && res2.seven === null, 'a looked-up entry survives pruning, the least recently used one goes: ' + JSON.stringify(res2));
    const key = await K(p, (k) => [k.fkCacheKey('Chicken Breasts'), k.fkCacheKey('breast chicken'), k.fkCacheKey('150 g chicken breast'), k.fkCacheKey('raw chicken breast')]);
    ok(key[0] === key[1] && key[1] === key[2] && key[3] !== key[0], 'cache key ignores case, plural, word order and amounts but keeps the cooking state: ' + key);
    await p.evaluate(() => localStorage.setItem('planner.fkcache', '{not json'));
    ok((await K(p, (k) => [k.fkCacheSize(), k.fkCacheGet('anything')])).join() === '0,', 'a corrupt cache is treated as empty');
    await ctx.close();
  }

  // ---- empty answers: remembered for a day only
  {
    const { ctx, p } = await open(b); const usda = await mockUsda(ctx); await ctx.route('**/world.openfoodfacts.org/**', (r) => r.fulfill({ status: 200, headers: { 'access-control-allow-origin': '*', 'content-type': 'application/json' }, body: JSON.stringify({ products: [] }) }));
    ok((await R(p, { name: 'qwertyuiop gloop', grams: 100 })) === null, 'nothing found anywhere -> null');
    const h1 = usda.hits; await R(p, { name: 'qwertyuiop gloop', grams: 100 }); ok(usda.hits === h1, 'the empty answer is cached (no second call)');
    await p.clock.fastForward(25 * 3600 * 1000); await R(p, { name: 'qwertyuiop gloop', grams: 100 }); ok(usda.hits === h1 + 1, 'but only trusted for a day');
    await ctx.close();
  }

  // ---- rate limit
  {
    const { ctx, p, errs } = await open(b); const usda = await mockUsda(ctx); await ctx.route('**/world.openfoodfacts.org/**', (r) => r.abort());
    usda.mode.limit = true;
    const r = await R(p, { name: 'rutabaga', grams: 100 });
    ok(r === null, '429 -> null, no throw, the caller keeps its own estimate');
    let st = await K(p, (k) => k.fkStatus());
    ok(st.usda.limited && /rate limit reached/i.test(st.usda.message) && /free key/i.test(st.usda.message) && st.usda.until > 0, 'status shows the limit and the "add a free key" message: ' + st.usda.message);
    ok(await p.locator('text=/rate limit reached/i').first().isVisible().catch(() => false), 'a toast tells the person once');
    const h = usda.hits; await R(p, { name: 'kohlrabi', grams: 100 }); await R(p, { name: 'venison', grams: 100 });
    ok(usda.hits === h, 'while limited no further USDA calls are made');
    ok((await R(p, { name: 'banana', grams: 118 })).source === 'kb', 'the built-in list still answers while USDA is limited');
    usda.mode.limit = false; await p.clock.fastForward(3601 * 1000);
    const back = await R(p, { name: 'rutabaga', grams: 100 }); ok(back && back.source === 'usda', 'after an hour USDA is tried again');
    ok(!(await K(p, (k) => k.fkStatus())).usda.limited, 'status is clear again');
    // local counter on the shared demo key: 28 calls an hour pauses without asking
    const { ctx: c2, p: p2 } = await open(b); const u2 = await mockUsda(c2); await c2.route('**/world.openfoodfacts.org/**', (r) => r.abort());
    for (let i = 0; i < 40; i++) await R(p2, { name: 'zq' + 'x'.repeat(i + 1) + ' unknownfood', grams: 100 });
    ok(u2.hits === 28, 'the shared demo key is paused locally after 28 lookups in an hour: ' + u2.hits);
    ok((await K(p2, (k) => k.fkStatus())).usda.limited, 'and the status says so');
    await K(p2, (k) => k.fkSetUsdaKey('FREEKEY')); const h2 = u2.hits; await R(p2, { name: 'rutabaga seed', grams: 100 });
    ok(u2.hits === h2 + 1, 'adding your own key lifts the pause');
    // bad key
    const { ctx: c3, p: p3 } = await open(b); const u3 = await mockUsda(c3); await c3.route('**/world.openfoodfacts.org/**', (r) => r.abort()); u3.mode.bad = true;
    ok((await R(p3, { name: 'rutabaga', grams: 100 })) === null && (await K(p3, (k) => k.fkStatus())).usda.badKey, 'a rejected key -> null and status.badKey');
    ok(!errs.length, 'no page errors ' + errs);
    await ctx.close(); await c2.close(); await c3.close();
  }

  // ---- Open Food Facts, failures, timeouts
  {
    const { ctx, p } = await open(b); const usda = await mockUsda(ctx); const off = await mockOff(ctx);
    const r = await R(p, { name: 'zebra granola', grams: 40 });
    ok(r && r.source === 'off' && r.nutrients.kcal === 180 && r.conf !== 'high' && /Open Food Facts/.test(r.note) && /Stripe Co/.test(r.name), 'packaged food -> Open Food Facts after USDA found nothing: ' + (r && [r.source, r.nutrients.kcal, r.conf, r.name]));
    ok(usda.hits === 1 && off.search === 1, 'USDA first, then OFF');
    const pk = await R(p, { name: 'zebra granola', grams: 40, packaged: true }); ok(pk.source === 'off' && usda.hits === 1, 'packaged: true goes to OFF first (no USDA call needed)');
    const syn = await R(p, { name: 'zebra crackers', grams: 100 }); ok(syn === null, 'an OFF product whose numbers do not add up (kJ-only, 300 kcal vs 420 from its macros) is dropped: ' + (syn && syn.nutrients.kcal));
    await ctx.unroute('**/api.nal.usda.gov/**'); await ctx.route('**/api.nal.usda.gov/**', (rt) => rt.abort());
    ok((await R(p, { name: 'quokka stew', grams: 100 })) === null, 'everything offline -> null, never throws');
    await ctx.unroute('**/api.nal.usda.gov/**'); await ctx.route('**/api.nal.usda.gov/**', () => { /* never answers */ });
    const pr = p.evaluate(() => window.__fk.fkResolve({ name: 'wombat pie', grams: 100 }).then((x) => x === null));
    await wait(300); await p.clock.fastForward(8500); await wait(100); await p.clock.fastForward(8500);
    ok(await pr, 'a hung USDA request gives up after 8 s and the answer is null');
    await ctx.close();
  }

  // ---- sanity flags and error bands
  {
    const { ctx, p } = await open(b);
    const S = (n, o) => K(p, (k, n, o) => k.fkSanity(n, o), n, o);
    ok((await S({ kcal: 165, p: 31, c: 0, f: 3.6 })).length === 0, 'chicken breast per 100 g passes');
    ok((await S({ kcal: 165, p: 31, c: 0, f: 3.6, fiber: 0, sugar: 0, sat: 1 })).length === 0, 'with optional fields passes');
    ok((await S({ kcal: 900, p: 0, c: 0, f: 0 })).join() === 'kcal_mismatch', '900 kcal from nothing: kcal_mismatch: ' + await S({ kcal: 900, p: 0, c: 0, f: 0 }));
    ok((await S({ kcal: 1000, p: 0, c: 0, f: 0 })).join() === 'kcal_mismatch,kcal_too_dense', 'more than 9 kcal per gram is also flagged');
    ok((await S({ kcal: 100, p: 10, c: 10, f: 2 })).length === 0, '100 kcal vs 98 from the macros passes');
    ok((await S({ kcal: 200, p: 10, c: 10, f: 2 })).includes('kcal_mismatch'), 'kcal 200 vs 98 from macros is flagged (over 25%)');
    ok((await S({ kcal: 120, p: 10, c: 10, f: 4 })).length === 0, '120 vs 116 passes');
    ok((await S({ kcal: 300, p: 60, c: 40, f: 20 })).includes('macros_over_weight'), 'more than 100 g of macros per 100 g is flagged');
    ok((await S({ kcal: 100, p: 5, c: 20, f: 0 }, { grams: 20 })).includes('macros_over_weight'), '25 g of macros in a 20 g amount is flagged');
    ok((await S({ kcal: -5, p: 1, c: 1, f: 1 })).includes('negative'), 'negative flagged');
    ok((await S({ kcal: 10, p: -1, c: 1, f: 1 })).includes('negative'), 'negative protein flagged');
    ok((await K(p, (k) => k.fkSanity({ kcal: NaN, p: 1, c: 1, f: 1 }))).includes('not_a_number') && (await S(null)).includes('not_a_number'), 'NaN and null flagged');
    ok((await S({ kcal: 1000, p: 0, c: 0, f: 100, sat: 120 }))[0] !== undefined && (await S({ kcal: 100, p: 1, c: 10, f: 5, fiber: 12 })).includes('fiber_over_carbs'), 'fiber over carbs flagged');
    ok((await S({ kcal: 100, p: 1, c: 10, f: 5, sugar: 12 })).includes('sugar_over_carbs') && (await S({ kcal: 100, p: 1, c: 10, f: 5, sat: 9 })).includes('sat_over_fat'), 'sugar over carbs and sat over fat flagged');
    ok((await S({ kcal: 231, p: 0, c: 0, f: 0, alc: 32 })).length === 0 && (await S({ kcal: 231, p: 0, c: 0, f: 0 })).includes('kcal_mismatch'), 'alcohol grams count 7 kcal each: vodka passes only when its alcohol is given');
    ok((await S({ kcal: 3, p: 0.2, c: 0.3, f: 0 })).length === 0, 'tiny values do not trip the percent rule');
    const rg = await K(p, (k) => [k.fkRange({ kcal: 500 }, 'high'), k.fkRange({ kcal: 500 }, 'medium'), k.fkRange({ kcal: 500 }, 'low'), k.fkRange(250, 'low'), k.fkRange({ kcal: 100 }, 'nonsense'), k.fkRange({}, 'high')]);
    ok(rg[0].low === 460 && rg[0].high === 540 && rg[0].pct === 8, 'high: 500 -> 460-540');
    ok(rg[1].low === 425 && rg[1].high === 575 && rg[1].pct === 15, 'medium: 500 -> 425-575');
    ok(rg[2].low === 350 && rg[2].high === 650 && rg[2].pct === 30, 'low: 500 -> 350-650');
    ok(rg[3].low === 175 && rg[3].high === 325, 'a plain number works: 250 low -> 175-325');
    ok(rg[4].pct === 15 && rg[5].kcal === 0 && rg[5].high === 0, 'unknown confidence reads as medium; no kcal -> 0');
    await ctx.close();
  }
  done('fk-resolve');
  await b.close();
})();

const { chromium } = require('playwright');
(async () => {
  const errs = [], ok = (c, m) => { if (!c) errs.push(m); }, wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://127.0.0.1:8777/nq-dashboard/planner/index.html#help'); await wait(2500);
  ok(await p.isVisible('#helpDlg') && /Quick add/.test(await p.textContent('#helpDlg')) && /Back Tap/.test(await p.textContent('#helpDlg')), '#help opens the sheet');
  const sh = await p.evaluate(() => { const d = document.querySelector('#helpDlg .dlg'); return [d.scrollHeight, d.clientHeight, document.documentElement.scrollWidth]; });
  ok(sh[0] > sh[1] && sh[2] <= 390, 'help scrolls inside the dialog without page overflow ' + sh);
  await p.screenshot({ path: 'shots/help.png' });
  await p.click('#helpDlg [data-close]'); ok(!(await p.isVisible('#helpDlg')), 'closes');
  await p.click('#moreBtn').catch(() => {}); await p.keyboard.press('Escape');
  await p.evaluate(() => document.querySelector('#settings').scrollIntoView()); const btn = p.locator('#helpBtn'); if (await btn.count()) { await p.evaluate(() => document.getElementById('settings').classList.remove('collapsed')); await btn.click(); ok(await p.isVisible('#helpDlg'), 'Help button works'); }
  console.log(errs.length ? 'FAIL\n' + errs.join('\n') : 'HELP OK');
  await b.close();
})().catch((e) => { console.error(e.message.split('\n').slice(0, 4).join('\n')); process.exit(1); });

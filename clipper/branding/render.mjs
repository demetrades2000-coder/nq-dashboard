import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'fs';
const size = +(process.argv[2] || 2048);
const out = process.argv[3] || 'mark.png';
const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: size, height: size } });
page.on('console', m => console.log('console:', m.text()));
page.on('pageerror', e => console.log('pageerror:', e.message));
await page.goto(`http://127.0.0.1:8765/icon-scene.html?size=${size}`);
await page.waitForFunction(() => window.__done === true, null, { timeout: 300000 });
const data = await page.evaluate(() => document.querySelector('canvas').toDataURL('image/png'));
fs.writeFileSync(out, Buffer.from(data.split(',')[1], 'base64'));
await browser.close();
console.log('wrote', out);

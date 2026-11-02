/* 園向け導入ガイドの PDF（guide-start.pdf）を、guide-start.html から作り直す。
   先に python3 -m http.server 8899 を cocoas-dashboard で立てておく。A4（ページの大きさは HTML の @page に従う） */
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const playwright = (() => {
  for (const p of ['playwright', process.env.PLAYWRIGHT_PATH, path.join(ROOT, '..', 'cw-scrape', 'node_modules', 'playwright')]) {
    if (!p) continue; try { return require(p); } catch (e) { /* 次を試す */ }
  }
  throw new Error('playwright が見つかりません。PLAYWRIGHT_PATH で場所を教えてください');
})();
const WEB = process.env.GUIDE_WEB || 'http://localhost:8899';
(async () => {
  const b = await playwright.chromium.launch({ channel: process.env.GUIDE_CHANNEL || 'chrome' });
  const p = await b.newPage();
  await p.goto(WEB + '/guide-start.html', { waitUntil: 'networkidle' });
  await p.waitForTimeout(800);
  await p.pdf({ path: path.join(ROOT, 'guide-start.pdf'), preferCSSPageSize: true, printBackground: true });
  await b.close();
  console.log('[guide] guide-start.pdf を作り直しました');
})().catch(e => { console.error('[guide] 止まりました：', e.message); process.exit(1); });

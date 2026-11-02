/* 運営マニュアル（Claude Docs）の画面写真を撮り直す。使い方は tools/manual/README.md
   ・毎回まっさらな園を申込から作る（架空の名前・test.invalid のメール）
   ・運営のログインは、その場で作った乱数のパスワード。画面にもログにも出さない
   ・初期パスワードは ●● のまま写す（表示は押さない） */
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const API_DIR = process.env.API_DIR || path.join(__dirname, '../../../cocoas-api');
const PW = process.env.PLAYWRIGHT || '/Users/slimshady/cw-scrape/node_modules/playwright';
const { chromium } = require(PW);
const { Client } = require(path.join(API_DIR, 'node_modules/pg'));
const bcrypt = require(path.join(API_DIR, 'node_modules/bcryptjs'));

const API = process.env.API || 'http://localhost:4056';
const WEB = process.env.WEB || 'http://localhost:8899';
const DB = process.env.DB || 'postgres://localhost:5432/cocoas_manual';
const MAIL_LOG = process.env.MAIL_LOG || '';          /* API の標準出力のファイル（確認コードを読む） */
const OUT = process.env.OUT || path.join(process.cwd(), 'manual-shots');
fs.mkdirSync(OUT, { recursive: true });
const log = (...a) => console.log(...a);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const call = (m, u, b, t) => fetch(API + u, { method: m, headers: Object.assign({ 'Content-Type': 'application/json' }, t ? { Authorization: 'Bearer ' + t } : {}), body: b ? JSON.stringify(b) : undefined })
  .then(async r => ({ s: r.status, j: await r.json().catch(() => null) }));

(async () => {
  /* 運営のログイン（毎回作り直す） */
  const admin = { email: 'manual-shots@test.invalid', pw: crypto.randomBytes(12).toString('base64url') };
  const c = new Client({ connectionString: DB }); await c.connect();
  await c.query('DELETE FROM platform_admins WHERE email=$1', [admin.email]);
  await c.query("INSERT INTO platform_admins (email,name,password_hash,must_change) VALUES ($1,'運営 太郎',$2,FALSE)", [admin.email, await bcrypt.hash(admin.pw, 10)]);
  await c.end();
  const tok = (await call('POST', '/admin/login', { email: admin.email, password: admin.pw })).j.token;

  /* 申込（施設2つ） */
  const sfx = Date.now().toString(36).slice(-4);
  const items = [['##', '法人'], ['法人名', '社会福祉法人さくら会'], ['代表者名', '桜井 一郎'], ['法人の住所', '東京都練馬区桜台1-2-3'],
    ['##', '施設1'], ['園・施設名', 'さくら保育園'], ['施設の種別', '認可保育所'], ['所在地', '東京都練馬区桜台1-2-3'], ['定員', '60'],
    ['##', '施設2'], ['園・施設名', 'さくら第二保育園'], ['施設の種別', '小規模保育事業'], ['所在地', '東京都練馬区桜台4-5-6'], ['定員', '19']];
  const ap = await call('POST', '/apply', { corp: '社会福祉法人さくら会', school: 'さくら保育園', plan: 'Standard', startsOn: '2026-12-01',
    person: '桜井 花子', email: 'sakura-' + sfx + '@test.invalid', tel: '03-0000-0000', payload: { items } });
  log('申込', ap.s);

  const b = await chromium.launch({ channel: 'chrome', args: ['--lang=ja-JP'] });
  /* 日付の欄が英語（November 2026）で出ないよう、日本語のブラウザにする */
  const p = await b.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2, locale: 'ja-JP' });
  p.on('pageerror', e => log('ERR', e.message));
  p.on('dialog', d => d.accept());
  await p.addInitScript(a => { localStorage.setItem('adm_api', a); }, API);
  const main = 'main.wrap';
  /* 写真の中の住所は本番の住所に見せる（手元の localhost を写さない）。上の帯は写真に重ならないよう止める */
  const tidy = pg => pg.evaluate(() => {
    if (!document.getElementById('shotCss')) { const st = document.createElement('style'); st.id = 'shotCss'; st.textContent = '.top,.nav{position:static!important}'; document.head.appendChild(st); }
    const fix = t => t.replace(/https?:\/\/localhost:8899\/?/g, 'https://miralink.mirai-wa.com/').replace(/localhost:8899/g, 'miralink.mirai-wa.com');
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let n; while ((n = w.nextNode())) { if (/localhost:8899/.test(n.nodeValue)) n.nodeValue = fix(n.nodeValue); }
    document.querySelectorAll('input').forEach(i => { if (/localhost:8899/.test(i.value)) i.value = fix(i.value); });
  });
  const shot = async (name, sel, opt) => {
    await sleep(500); await tidy(p);
    const el = typeof sel === 'string' ? p.locator(sel).first() : sel;
    await el.screenshot(Object.assign({ path: path.join(OUT, name + '.png') }, opt || {}));
    log('撮った', name);
  };
  const go = async (fn, arg) => { await p.evaluate(fn, arg); await sleep(1500); };

  await p.goto(WEB + '/admin.html'); await sleep(1000);
  await p.fill('#em', admin.email); await p.fill('#pw', admin.pw); await p.click('#go'); await sleep(2000);

  /* 入口 */
  await go(() => nav('wiz'));
  await shot('m-entrance', main);
  /* 申込を確かめる・内容を直す */
  await p.click('[data-wzap]'); await sleep(1500);
  await p.click('#apEdOn'); await sleep(800);
  await shot('m-app-edit', '.wzCard');
  await p.evaluate(() => { APE.on = false; render(); }); await sleep(500);
  /* ステップ2 入力 */
  await p.evaluate(() => { WZ.step = 1; render(); }); await sleep(800);
  await p.fill('#wz_code', 'sakura-' + sfx);
  await shot('m-acct-input', '.wzCard');
  await p.click('#wz_go'); await sleep(3000);
  await shot('m-acct-done', '.wzCard');
  const tid = await p.evaluate(() => openId);

  /* 施設ごとの園（申込の画面） */
  await go(() => nav('apply'));
  await p.click('[data-apopen]'); await sleep(1500);
  await shot('m-sites', p.locator('.card', { hasText: '施設ごとの園' }));

  /* ステップ3 */
  await go(t => nav('wiz', t), tid);
  await p.evaluate(() => { WZ.step = 2; render(); }); await sleep(800);
  await shot('m-terms', '.wzCard');
  await p.click('#wzTerms'); await sleep(2000);

  /* 補助金タブ（記録を1つ） */
  await call('POST', '/admin/tenants/' + tid + '/subsidies', { name: 'ICT化推進事業補助金', authority: '練馬区', status: '申請準備中', fiscalYear: 2026 }, tok);
  await go(t => nav('one', t, 'subsidy'), tid);
  await shot('m-subsidy', main);

  /* ステップ5：まだそろっていないとき */
  await go(t => nav('wiz', t), tid);
  await p.evaluate(() => { WZ.step = 4; render(); }); await sleep(800);
  await shot('m-bill-notyet', '.wzCard');

  /* ステップ4：契約書を送る・中身を見る */
  await p.evaluate(() => { WZ.step = 3; render(); }); await sleep(1000);
  for (const k of ['normal', 'memo']) { await p.click('[data-agk="' + k + '"]'); await sleep(1500); }
  await p.click('[data-doc="normal"]'); await sleep(1500);
  await shot('m-doc', '#docWrap', { });
  await p.evaluate(() => { $('docWrap').style.display = 'none'; });

  /* 園の画面：初回ログイン → ようこそ → 契約書 → 同意の画面 → 支払い方法 */
  const users = (await call('GET', '/admin/tenants/' + tid, null, tok)).j.staff || [];
  const u = users.find(x => x.role === '管理者') || users[0];
  const ipw = (await call('POST', '/admin/tenants/' + tid + '/users/' + u.id + '/initial-password', {}, tok)).j.password;
  const newPw = 'Sk-' + crypto.randomBytes(8).toString('hex');
  const s = await b.newPage({ viewport: { width: 1280, height: 1000 }, deviceScaleFactor: 2, locale: 'ja-JP' });
  s.on('dialog', d => d.accept());
  await s.addInitScript(a => { localStorage.setItem('cocoas_apiBase', JSON.stringify(a)); }, API);
  await s.goto(WEB + '/index.html'); await sleep(1500);
  await s.fill('#slId2', u.login_id); await s.fill('#slPw2', ipw); await s.click('#slGo2');
  await s.waitForFunction(() => !document.getElementById('slGo2'), null, { timeout: 30000 }); await sleep(3000);
  if (await s.$('#pwForceBg')) {
    const cur = await s.$('#pwForceBg #pw_cur'); if (cur) await cur.fill(ipw);
    await s.fill('#pwForceBg #pw_new', newPw); await s.fill('#pwForceBg #pw_new2', newPw);
    await s.click('#pwForceBg .btn-primary'); await sleep(3000);
  }
  if (!(await s.$('#obwBg'))) { await s.evaluate(() => obwOpen()); await sleep(1500); }
  const sshot = async (name, sel) => { await sleep(500); await s.locator(sel).first().screenshot({ path: path.join(OUT, name + '.png') }); log('撮った', name); };
  await sshot('m-welcome', '#obwBg .modal');
  await s.click('#obwBg [data-obwnext]'); await sleep(1200);
  await sshot('m-agree-step', '#obwBg .modal');
  await s.click('#obwBg [data-agopen]'); await sleep(1500);
  await s.evaluate(() => { const bx = document.getElementById('agBody'); bx.scrollTop = bx.scrollHeight; bx.dispatchEvent(new Event('scroll')); }); await sleep(500);
  await s.fill('#agName', '桜井 花子'); await s.fill('#agTitle', '園長');
  await sleep(500); await s.screenshot({ path: path.join(OUT, 'm-agree-modal.png') }); log('撮った', 'm-agree-modal');
  /* 同意（確認コードはAPIのログから） */
  const otpOf = () => { if (!MAIL_LOG) return ''; const L = fs.readFileSync(MAIL_LOG, 'utf8'); const m = [...L.matchAll(/確認コード[^0-9]{0,40}([0-9]{6})/g)]; return m.length ? m[m.length - 1][1] : ''; };
  /* 同意の窓が2枚重なって開くことがある（index.html 側の問題。2026-11-01 に見つけた）。毎回いったん閉じてから開き直す */
  const closeAg = () => s.evaluate(() => { document.querySelectorAll('.modal-bg:not(.obw-bg)').forEach(x => x.remove()); });
  for (let i = 0; i < 3; i++) {
    await closeAg(); await sleep(300);
    if (i > 0) { await s.evaluate(() => { AGR_AT = 0; return new Promise(r => agreeLoad(r)); }); await s.evaluate(() => obwDraw()); await sleep(800); }
    const nb = await s.$('#obwBg [data-agopen]'); if (!nb) break; await nb.click(); await sleep(1500);
    await s.evaluate(() => { const bs = document.querySelectorAll('.modal-bg:not(.obw-bg)'); for (let k = 0; k < bs.length - 1; k++) bs[k].remove(); });
    await s.evaluate(() => { const bx = document.getElementById('agBody'); bx.scrollTop = bx.scrollHeight; bx.dispatchEvent(new Event('scroll')); }); await sleep(500);
    await s.fill('#agName', '桜井 花子'); await s.fill('#agTitle', '園長');
    await s.evaluate(() => { document.querySelectorAll('[data-agchk],#agAuth').forEach(x => { x.checked = true; }); });
    if (await s.$('#agOtp')) { await s.click('#agOtp'); await sleep(1500); await s.fill('#agCode', otpOf()); }
    await s.click('#agGo'); await sleep(2500);
    const left = await s.evaluate(() => { const m = document.getElementById('agMsg'); return m ? m.textContent : ''; });
    if (left) log('同意できなかった：', left);
  }
  await closeAg();
  const nx = await s.$('#obwBg [data-obwnext]'); if (nx) { await nx.click(); await sleep(1500); }
  await sshot('m-pay-step', '#obwBg .modal');

  /* 運営：代理で請求書払い → ステップ4 */
  await p.bringToFront();
  await go(t => { GLB_AT = 0; nav('wiz', t); }, tid);
  await p.evaluate(() => { WZ.step = 3; render(); }); await sleep(1000);
  await p.fill('#wzBillMail', 'keiri-' + sfx + '@test.invalid'); await p.click('#wzInv'); await sleep(2500);
  await p.evaluate(() => { WZ.step = 3; render(); }); await sleep(1000);
  await shot('m-contract-step', '.wzCard');

  /* ステップ5：そろったとき → 課金を始める */
  await p.evaluate(() => { WZ.step = 4; render(); }); await sleep(1000);
  await shot('m-bill-ready', '.wzCard');
  await p.click('#obBill'); await sleep(2500);

  /* ステップ6・7 */
  await p.evaluate(() => { WZ.step = 5; render(); }); await sleep(1000);
  await shot('m-school', '.wzCard');
  await p.evaluate(() => { WZ.step = 6; render(); }); await sleep(1000);
  await shot('m-live', '.wzCard');

  /* 園の画面：別の画面へ移ったときの「もどる」ボタン */
  await s.bringToFront();
  await s.evaluate(() => { if (!document.getElementById('obwBg')) obwOpen(); }); await sleep(1500);
  for (let i = 0; i < 4; i++) { const g = await s.$('#obwBg [data-obwgo]'); if (g) { await g.click(); break; } const n2 = await s.$('#obwBg [data-obwnext]'); if (!n2) break; await n2.click(); await sleep(800); }
  await sleep(2000);
  await s.screenshot({ path: path.join(OUT, 'm-back.png') }); log('撮った', 'm-back');

  /* 請求・未納のときの連絡 */
  await go(() => nav('bill'));
  await p.locator('button', { hasText: 'この月の請求を作る' }).first().click(); await sleep(2500);
  await shot('m-billing', main);
  await go(t => nav('one', t, 'contract'), tid);
  await shot('m-unpaid', p.locator('.card', { hasText: '未納のときの連絡' }).last());

  await b.close();
  log('出力先', OUT);
})().catch(e => { console.error(e); process.exit(1); });

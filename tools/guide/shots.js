/* 園向け導入ガイド（guide-start.html）の画面写真を、いまの画面で撮り直す。
   毎回まっさらな園（園コードは毎回ちがう）を手元の API に作り、園長の目線で手順を進めながら img/guide/ に保存する。
   ★手元の API・手元のデータベースだけで動かす。DATABASE_URL が localhost でなければ止まる（本番に園を作らないため）。
   ★パスワードは毎回その場で作り、画面にもログにも出さない（パスワード欄は ● で写る）。
   使い方は tools/guide/README.md */
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..', '..');
const API_DIR = process.env.COCOAS_API_DIR || path.join(ROOT, '..', 'cocoas-api');
const need = (m) => { try { return require(m); } catch (e) { return require(path.join(API_DIR, 'node_modules', m)); } };
const playwright = (() => {
  for (const p of ['playwright', process.env.PLAYWRIGHT_PATH, path.join(ROOT, '..', 'cw-scrape', 'node_modules', 'playwright')]) {
    if (!p) continue; try { return require(p); } catch (e) { /* 次を試す */ }
  }
  throw new Error('playwright が見つかりません。PLAYWRIGHT_PATH で場所を教えてください');
})();
const { Client } = need('pg');
const bcrypt = need('bcryptjs');

const API = process.env.GUIDE_API || 'http://localhost:4055';
const WEB = process.env.GUIDE_WEB || 'http://localhost:8899';
const DB = process.env.GUIDE_DB || 'postgres://localhost:5432/cocoas_test2';
const OUT = path.join(ROOT, 'img', 'guide');
if (!/@?(localhost|127\.0\.0\.1)[:/]/.test(DB)) throw new Error('手元のデータベース（localhost）でだけ動かします：' + DB);
if (!/^http:\/\/(localhost|127\.0\.0\.1)/.test(API)) throw new Error('手元の API（localhost）でだけ動かします：' + API);

const pw = () => 'G' + crypto.randomBytes(9).toString('base64url');
const log = (...a) => console.log('[guide]', ...a);
async function call(method, url, body, token) {
  const r = await fetch(API + url, { method, headers: Object.assign({ 'content-type': 'application/json' }, token ? { authorization: 'Bearer ' + token } : {}), body: body ? JSON.stringify(body) : undefined });
  let j = {}; try { j = await r.json(); } catch (e) { /* 空 */ }
  if (r.status >= 400) throw new Error(method + ' ' + url + ' → ' + r.status + ' ' + (j.error || ''));
  return j;
}

/* ── 1. まっさらな園を作る（運営の操作は API で） ── */
async function setupSchool(db) {
  const adminMail = 'guide-bot@test.invalid', adminPw = pw();
  await db.query('DELETE FROM platform_admins WHERE email=$1', [adminMail]);
  await db.query("INSERT INTO platform_admins (email,name,password_hash,must_change) VALUES ($1,'ガイド撮影',$2,FALSE)", [adminMail, await bcrypt.hash(adminPw, 10)]);
  const boss = (await call('POST', '/admin/login', { email: adminMail, password: adminPw })).token;
  const code = 'sakura-' + Date.now().toString(36);
  const ap = await db.query(`INSERT INTO applications (corp, school, plan, person, email, payload, status)
    VALUES ('社会福祉法人さくら会','さくら保育園','Standard','園長 桜井','sakura-office@test.invalid','{}'::jsonb,'未対応') RETURNING id`);
  /* ログインIDは写真に写るので、毎回同じ「sakura-admin」にする。前の回の園の同じIDは、手元のデータベースの中で名前を変えて空ける */
  await db.query("UPDATE users SET login_id = login_id || '-old' || id WHERE lower(login_id)='sakura-admin'");
  const opened = await call('POST', '/admin/applications/' + ap.rows[0].id + '/open', { code, name: 'さくら保育園', loginId: 'sakura-admin', adminName: '桜井 園長' }, boss);
  const tid = opened.tenant.id;
  await call('PUT', '/admin/tenants/' + tid + '/contract', { plan: 'standard' }, boss);
  const docs = [];
  for (const kind of ['normal', 'memo']) docs.push((await call('POST', '/admin/tenants/' + tid + '/contracts', { kind, email: 'sakura-office@test.invalid' }, boss)).doc);
  log('園を作りました', code);
  return { boss, tid, code, loginId: opened.loginId, initPw: opened.initialPassword, docs };
}

/* ── 写真の撮り方 ── */
const RED = '4px solid #E0312B';
async function mark(page, sel) {
  await page.evaluate(([s, red]) => { document.querySelectorAll('[data-guide-mark]').forEach(e => { e.style.outline = ''; e.removeAttribute('data-guide-mark'); });
    if (!s) return; const e = typeof s === 'string' ? document.querySelector(s) : null; if (!e) return;
    e.setAttribute('data-guide-mark', '1'); e.style.outline = red; e.style.outlineOffset = '4px'; e.style.borderRadius = e.style.borderRadius || '10px'; }, [sel, RED]);
}
async function shot(page, file, sel, pad) {
  const p = pad == null ? 12 : pad;
  const box = await page.evaluate((s) => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; }, sel);
  if (!box) throw new Error('写す場所が見つかりません：' + sel + '（' + file + '）');
  const vp = page.viewportSize();
  const x = Math.max(0, box.x - p), y = Math.max(0, box.y - p);
  const clip = { x, y, width: Math.min(vp.width - x, box.w + p * 2), height: Math.min(vp.height - y, box.h + p * 2) };
  await page.screenshot({ path: path.join(OUT, file), clip, type: 'jpeg', quality: 88 });
  log('撮りました', file);
}
async function unionShot(page, file, sels, pad) {
  const p = pad == null ? 12 : pad;
  const box = await page.evaluate((ss) => { var x1 = 1e9, y1 = 1e9, x2 = -1e9, y2 = -1e9;
    ss.forEach(function (s) { var e = document.querySelector(s); if (!e) return; var r = e.getBoundingClientRect(); x1 = Math.min(x1, r.left); y1 = Math.min(y1, r.top); x2 = Math.max(x2, r.right); y2 = Math.max(y2, r.bottom); });
    return x2 < 0 ? null : { x: x1, y: y1, w: x2 - x1, h: y2 - y1 }; }, sels);
  if (!box) throw new Error('写す場所が見つかりません：' + sels.join(' ') + '（' + file + '）');
  const vp = page.viewportSize(); const x = Math.max(0, box.x - p), y = Math.max(0, box.y - p);
  await page.screenshot({ path: path.join(OUT, file), clip: { x, y, width: Math.min(vp.width - x, box.w + p * 2), height: Math.min(vp.height - y, box.h + p * 2) }, type: 'jpeg', quality: 88 });
  log('撮りました', file);
}
async function clipShot(page, file, clip) {
  await page.screenshot({ path: path.join(OUT, file), clip, type: 'jpeg', quality: 88 });
  log('撮りました', file);
}
const wait = (page, ms) => page.waitForTimeout(ms || 600);
async function wizTo(page, key) {
  await page.evaluate((k) => { if (!OBW.el) obwOpen(); var L = obwSteps(); for (var i = 0; i < L.length; i++) if (L[i].k === k) OBW.step = i; obwDraw(); }, key);
  await wait(page, 900);
}

(async () => {
  const db = new Client({ connectionString: DB }); await db.connect();
  const S = await setupSchool(db);
  const browser = await playwright.chromium.launch({ channel: process.env.GUIDE_CHANNEL || 'chrome' });
  const page = await browser.newPage({ viewport: { width: 1100, height: 1250 }, deviceScaleFactor: 2, locale: 'ja-JP' });
  page.on('pageerror', e => log('画面のエラー', e.message));
  page.on('dialog', d => d.accept());
  await page.addInitScript((api) => { localStorage.setItem('cocoas_apiBase', JSON.stringify(api)); }, API);

  /* ログイン */
  await page.goto(WEB + '/index.html'); await wait(page, 1500);
  await page.fill('#slId2', S.loginId); await page.fill('#slPw2', S.initPw);
  await mark(page, '#slGo2'); await shot(page, 'g-01-login.jpg', '.sl-box', 16); await mark(page, null);
  await page.click('#slGo2');
  await page.waitForSelector('#pwForceBg', { timeout: 30000 }); await wait(page, 600);
  const newPw = pw();
  await page.fill('#pwForceBg #pw_cur', S.initPw); await page.fill('#pwForceBg #pw_new', newPw); await page.fill('#pwForceBg #pw_new2', newPw);
  await mark(page, '#pwForceBg .btn-primary'); await shot(page, 'g-00-first-password.jpg', '#pwForceBg .modal', 14); await mark(page, null);
  await page.click('#pwForceBg .btn-primary'); await wait(page, 3500);

  /* ようこそ */
  await page.waitForSelector('#obwBg .obw', { timeout: 20000 }); await wizTo(page, 'welcome');
  await mark(page, '#obwBg [data-obwnext]'); await shot(page, 'g-02-welcome.jpg', '#obwBg .obw', 14); await mark(page, null);

  /* 「あとで」で閉じたときの、左下のボタンと右下の丸いボタン（手順が残っているうちに撮る） */
  await page.click('#obwBg [data-obwclose]'); await wait(page, 1200);
  const pill = await page.evaluate(() => { var p = document.getElementById('obwPill'); if (!p) return null; var r = p.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; });
  if (pill) { await mark(page, '#obwPill'); await clipShot(page, 'g-11-pill.jpg', { x: 0, y: Math.max(0, pill.y - 50), width: pill.x + pill.w + 160, height: pill.h + 80 }); await mark(page, null); }
  else log('左下のボタンが出ていないため g-11-pill.jpg はそのまま');
  await mark(page, '#aiFab');
  const fab = await page.evaluate(() => { var r = document.getElementById('aiFab').getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; });
  const fx = Math.max(0, fab.x + fab.w + 12 - 550);
  await clipShot(page, 'g-10-help.jpg', { x: fx, y: Math.max(0, fab.y + fab.h + 12 - 350), width: Math.min(550, page.viewportSize().width - fx), height: 350 });
  await mark(page, null);
  await page.evaluate(() => { obwOpen(); }); await wait(page, 900);

  /* 契約書に同意する */
  await wizTo(page, 'agree');
  await mark(page, '#obwBg [data-agopen]'); await shot(page, 'g-03a-agree-window.jpg', '#obwBg .obw', 14); await mark(page, null);
  await page.click('#obwBg [data-agopen]'); await wait(page, 1500);
  await page.evaluate(() => { var b = document.getElementById('agBody'); b.scrollTop = b.scrollHeight; b.dispatchEvent(new Event('scroll')); });
  await wait(page, 500);
  await page.evaluate(() => { document.querySelectorAll('[data-agchk],#agAuth').forEach(x => { x.checked = true; }); });
  await page.fill('#agName', '桜井 さくら'); await page.fill('#agTitle', '園長');
  await mark(page, '#agGo');
  await unionShot(page, 'g-03c-contract-filled.jpg', ['#agForm', '#agGo'], 14); await mark(page, null);
  await page.click('#agNo'); await wait(page, 400);
  /* 同意そのものは「紙で締結」として運営側で済ませる（メールの確認番号を読まずに進むため） */
  for (const d of S.docs) await call('POST', '/admin/contracts/' + d.id + '/external', { provider: 'ガイド撮影', reason: '画面写真の撮影用（手元のみ）' }, S.boss);
  await page.evaluate(() => new Promise(r => { AGR_AT = 0; agreeLoad(r); setTimeout(r, 3000); })); await wait(page, 500);

  /* 利用料金の支払い方法 */
  await wizTo(page, 'school_pay'); await wait(page, 800);
  await page.evaluate(() => { var i = document.querySelector('#obwPay input[type=email], #obwPay input'); if (i) { i.value = 'jimu@sakura-hoikuen.test.invalid'; } });
  await mark(page, '#spayInv'); await shot(page, 'g-04-pay.jpg', '#obwBg .obw', 14); await mark(page, null);
  await db.query("UPDATE contracts SET pay_method='invoice', billing_email='jimu@sakura-hoikuen.test.invalid' WHERE tenant_id=$1", [S.tid]);

  /* 生徒一覧 */
  await page.evaluate(() => { obwClose(true, true); go('contacts'); }); await wait(page, 1200);
  await page.evaluate(() => { var b = document.getElementById('rosterAdd'); if (!b) { rosterTab = 'list'; go('roster'); } });
  await wait(page, 800);
  await page.evaluate(() => { var c = document.getElementById('rosterAdd').closest('.card'); c.setAttribute('data-guide-box', '1'); c.scrollIntoView({ block: 'start' }); window.scrollBy(0, -80); });
  await mark(page, '#rosterAdd'); await shot(page, 'g-05b-roster.jpg', '[data-guide-box]', 8); await mark(page, null);
  await page.evaluate(() => { document.querySelector('[data-guide-box]').removeAttribute('data-guide-box'); });
  await page.click('#rosterAdd'); await wait(page, 900);
  await page.evaluate(() => {
    var m = document.querySelector('#modalRoot .modal-bg:last-child .modal'); if (!m) return;
    var set = function (ph, v) { var i = [].filter.call(m.querySelectorAll('input'), function (x) { var l = x.closest('.field'); return l && l.textContent.indexOf(ph) > -1; })[0]; if (i) i.value = v; };
    set('保護者名', '田中 健一'); set('お子様のお名前', '田中 ひなた'); set('メール', 'tanaka@test.invalid');
  });
  await shot(page, 'g-05c-add-child.jpg', '#modalRoot .modal-bg:last-child .modal', 10);
  await page.evaluate(() => { document.querySelector('#modalRoot .modal-bg:last-child').remove(); });

  /* 名簿の取り込み */
  const csv = '﻿保護者名,保護者名のふりがな,お子様のお名前,お子様のふりがな,お子様の生年月日,性別,メールアドレス,電話番号,クラス,入園日,通園曜日\r\n'
    + '田中 健一,たなか けんいち,田中 ひなた,たなか ひなた,2022-05-14,女の子,tanaka@test.invalid,090-0000-0001,ひよこ,2026-04-01,月火水木金\r\n'
    + '田中 健一,たなか けんいち,田中 そら,たなか そら,2024-01-20,男の子,tanaka@test.invalid,090-0000-0001,うさぎ,2026-04-01,月火水木金\r\n'
    + '佐藤 美咲,さとう みさき,佐藤 れん,さとう れん,2023-03-02,男の子,sato@test.invalid,090-0000-0002,りす,2026-04-01,月水金\r\n';
  const csvPath = path.join(require('os').tmpdir(), 'guide-roster-' + Date.now() + '.csv'); fs.writeFileSync(csvPath, csv);
  await page.click('#rosterImport'); await wait(page, 800);
  await mark(page, '#riTpl'); await shot(page, 'g-05d-import.jpg', '#modalRoot .modal-bg:last-child .modal', 10); await mark(page, null);
  await page.setInputFiles('#riFile', csvPath); await wait(page, 1500);
  await mark(page, '#riAddCls'); await shot(page, 'g-05f-import-class.jpg', '#riResult > div:first-child', 10); await mark(page, null);
  await page.click('#riAddCls'); await wait(page, 1200);
  await page.evaluate(() => { var g = document.getElementById('riGo'); if (g) g.scrollIntoView({ block: 'end' }); });
  await mark(page, '#riGo'); await unionShot(page, 'g-05e-import-check.jpg', ['#riResult', '#riGo'], 12); await mark(page, null);
  await page.click('#riGo'); await wait(page, 2500); fs.unlinkSync(csvPath);

  /* 職員アカウント */
  await page.evaluate(() => { go('settings'); }); await wait(page, 1200);
  /* 設定の欄は畳んであるので、「職員アカウント」の見出しを開く（案内の窓のボタンと同じ動き） */
  await page.evaluate(() => { var sec = document.querySelector('section[data-page="settings"]') || document;
    var h = [].filter.call(sec.querySelectorAll('h3'), function (z) { return (z.textContent || '').indexOf('職員アカウント') > -1; })[0];
    if (h && h.getAttribute('data-open') === '0') h.click(); });
  await wait(page, 900);
  await page.evaluate(() => { var e = document.getElementById('suId'); if (e) e.scrollIntoView({ block: 'center' }); });
  await page.fill('#suId', 'sakura-tanaka'); await page.fill('#suName', '田中 花子');
  await mark(page, '#suAdd');
  await page.evaluate(() => { var e = document.getElementById('suId').closest('.card'); e.setAttribute('data-guide-box', '1'); e.scrollIntoView({ block: 'start' }); window.scrollBy(0, -100); });
  await shot(page, 'g-06-staff-add.jpg', '[data-guide-box]', 8); await mark(page, null);
  await page.evaluate(() => { document.querySelector('[data-guide-box]').removeAttribute('data-guide-box'); });

  /* 保護者の招待 */
  await page.evaluate(() => { obPrep(['wastore', '保護者アカウント新規発行']); go('wastore'); }); await wait(page, 2500);
  await page.evaluate(() => { var c = document.getElementById('waPaCard'); if (c) c.scrollIntoView({ block: 'start' }); window.scrollBy(0, -70); });
  await mark(page, '#paInvGo'); await shot(page, 'g-06b-parent-account.jpg', '#waPaCard', 8); await mark(page, null);
  const kid = await page.evaluate(() => { var k = enrolled()[0]; return k ? k.id : null; });
  /* 案内の紙の二次元コードと URL は、本番の住所（mirai-wa.com）で写す。手元で撮ると localhost が写るため */
  await page.evaluate(() => { window.waAppUrl = function () { return 'https://mirai-wa.com/?tenant=sakura-hoikuen'; }; });
  await page.evaluate((cid) => { waGuideModal({ cid: cid, email: 'tanaka@test.invalid', pw: 'hajime-2026', title: '発行しました' }); }, kid);
  await wait(page, 1800);
  await mark(page, '#wagPrint'); await shot(page, 'g-06c-guide-sheet.jpg', '#modalRoot .modal-bg:last-child .modal', 10); await mark(page, null);
  await page.evaluate(() => { document.querySelector('#modalRoot .modal-bg:last-child').remove(); });
  await page.click('#paInvGo'); await wait(page, 2500);

  /* 保育料のカード払い */
  await page.evaluate(() => { go('billing'); }); await wait(page, 1500);
  await page.evaluate(() => { var b = document.getElementById('tuiStart'); var c = b && b.closest('.card'); if (c) { c.setAttribute('data-guide-box', '1'); c.scrollIntoView({ block: 'start' }); window.scrollBy(0, -80); } });
  await mark(page, '#tuiStart'); await shot(page, 'g-08-tuition.jpg', '[data-guide-box]', 10); await mark(page, null);

  /* 準備ができました・右下の丸いボタン・左下の「はじめの準備にもどる」 */
  await page.evaluate(() => { go('home'); }); await wait(page, 1500);
  await page.evaluate(() => new Promise(r => { API.call('GET', '/onboarding').then(function (j) { OB_ME = j; r(); }).catch(r); }));
  await wizTo(page, 'done'); await shot(page, 'g-09-done.jpg', '#obwBg .obw', 14);
  await browser.close(); await db.end();
  log('おしまい。続けて node tools/guide/pdf.js で PDF を作り直してください');
})().catch(e => { console.error('[guide] 止まりました：', e.message); process.exit(1); });

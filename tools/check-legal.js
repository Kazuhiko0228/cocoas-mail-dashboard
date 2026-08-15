/* 規約とプライバシーポリシーの本文が、
   parent.html（出どころ）と公開ページ（terms.html / privacy.html）で
   ずれていないかを確かめる。

   条文は parent.html の WA_LEGAL が出どころで、
   公開ページは tools/build-legal.js がそこから作る。
   手で公開ページを直すとずれるので、これで気づけるようにする。 */
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const DIR = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(DIR, 'parent.html'), 'utf8');

function legalOf() {
  const i = html.indexOf('var WA_LEGAL=');
  let d = 0, j = html.indexOf('{', i), k = j;
  for (; k < html.length; k++) {
    const c = html[k];
    if (c === '{') d++;
    else if (c === '}') { d--; if (!d) { k++; break; } }
  }
  const ctx = {};
  vm.createContext(ctx);
  new vm.Script(html.slice(i, k) + ';').runInContext(ctx);
  return ctx.WA_LEGAL;
}

function verOf() {
  const m = html.match(/var WA_TERMS_VER\s*=\s*'([^']*)'/);
  return m ? m[1] : '';
}

/** 公開ページから、見出しと本文を取り出す（タグを外して文字だけ比べる） */
function pageOf(file) {
  const s = fs.readFileSync(path.join(DIR, file), 'utf8');
  /* 目次（nav.toc）にも同じ見出しが li で入っているので、
     本文は section.art の中だけを見る。 */
  const arts = [...s.matchAll(/<section class="art"[^>]*>([\s\S]*?)<\/section>/g)].map(m => m[1]);
  const heads = arts.map(a => strip((a.match(/<h2>([\s\S]*?)<\/h2>/) || [])[1] || ''));
  const items = arts.flatMap(a =>
    [...a.matchAll(/<li>([\s\S]*?)<\/li>/g)].map(m => strip(m[1])));
  const singles = arts.flatMap(a =>
    [...a.matchAll(/<p class="single">([\s\S]*?)<\/p>/g)].map(m => strip(m[1])));
  const ver = (s.match(/版\s*([0-9.a-z-]+)/) || [])[1] || '';
  return { heads, body: items.concat(singles), ver };
}

function strip(t) {
  return t.replace(/<[^>]*>/g, '')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'").replace(/&amp;/g, '&')
    .replace(/\s+/g, '').trim();
}

const L = legalOf();
const ver = verOf();
let ng = 0;

[['terms', 'terms.html'], ['privacy', 'privacy.html']].forEach(([key, file]) => {
  const src = L[key];
  const pg = pageOf(file);
  const srcHeads = src.s.map(x => strip(x.h));
  const srcBody = src.s.flatMap(x => x.b.map(strip));

  console.log('■ ' + src.t + '（' + file + '）');
  if (pg.ver !== ver) { console.log('  ✗ 版がちがいます: 本文 ' + ver + ' / ページ ' + pg.ver); ng++; }
  else console.log('  ✓ 版 ' + ver);

  if (srcHeads.length !== pg.heads.length) {
    console.log('  ✗ 条の数がちがいます: 本文 ' + srcHeads.length + ' / ページ ' + pg.heads.length); ng++;
  } else {
    const bad = srcHeads.filter((h, i) => h !== pg.heads[i]);
    if (bad.length) { console.log('  ✗ 見出しがちがいます: ' + bad.slice(0, 3).join(' / ')); ng++; }
    else console.log('  ✓ 見出し ' + srcHeads.length + '件すべて一致');
  }

  const missing = srcBody.filter(b => !pg.body.includes(b));
  const extra = pg.body.filter(b => !srcBody.includes(b));
  if (missing.length || extra.length) {
    console.log('  ✗ 本文がちがいます（ページに無い ' + missing.length + '件 / 本文に無い ' + extra.length + '件）');
    if (missing[0]) console.log('     ページに無い例: ' + missing[0].slice(0, 60));
    if (extra[0]) console.log('     本文に無い例: ' + extra[0].slice(0, 60));
    ng++;
  } else console.log('  ✓ 本文 ' + srcBody.length + '件すべて一致');
});

if (ng) {
  console.log('\n✗ ' + ng + '件ずれています。node tools/build-legal.js で作り直してください。');
  process.exit(1);
}
console.log('\n✓ 公開ページは、parent.html の本文と一致しています。');

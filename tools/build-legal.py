# -*- coding: utf-8 -*-
"""未来WA の利用規約とプライバシーポリシーを、HPと同じ体裁の公開ページにする。
   本文は parent.html の WA_LEGAL（Vista法務レビュー版）をそのまま使い、書き換えない。"""
import json, html

import subprocess, os
DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# 条文の出どころは parent.html の WA_LEGAL。ここから取り出す。
L = json.loads(subprocess.run(['node', '-e', '''
const fs=require('fs'),vm=require('vm');
const h=fs.readFileSync(process.argv[1],'utf8');
const i=h.indexOf('var WA_LEGAL=');
let d=0,j=h.indexOf('{',i),k=j;
for(;k<h.length;k++){const c=h[k];if(c==='{')d++;else if(c==='}'){d--;if(!d){k++;break;}}}
const ctx={};vm.createContext(ctx);new vm.Script(h.slice(i,k)+';').runInContext(ctx);
process.stdout.write(JSON.stringify(ctx.WA_LEGAL));
''', os.path.join(DIR,'parent.html')], capture_output=True, text=True, check=True).stdout)
import re as _re
VER = (_re.search(r"var WA_TERMS_VER\s*=\s*'([^']*)'",
       open(os.path.join(DIR,'parent.html'), encoding='utf-8').read()).group(1))

HEAD = """<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="icon" type="image/png" href="img/icon_miraiwa.png">
<title>%(title)s｜未来WA</title>
<meta name="description" content="%(desc)s">
<meta name="robots" content="index,follow">
<style>
:root{
  color-scheme: light;
  --ink:#0B1E2D; --ink-2:#123246; --paper:#F5F7F7; --white:#fff;
  --edu:#1B84C4; --edu-deep:#0F5C8C; --muted:#5C6F79; --muted-2:#8A9AA2; --line:#DCE4E6;
  --serif:"Hiragino Mincho ProN","Yu Mincho",YuMincho,"Noto Serif JP","MS PMincho",serif;
  --sans:"Hiragino Kaku Gothic ProN","Yu Gothic",YuGothic,"Noto Sans JP","Hiragino Sans",sans-serif;
}
*{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth}
body{font-family:var(--sans);background:var(--paper);color:var(--ink);line-height:1.95;
  -webkit-font-smoothing:antialiased;font-feature-settings:"palt" 1}
img{max-width:100%%;display:block}
a{color:inherit}
:focus-visible{outline:2px solid var(--edu);outline-offset:3px;border-radius:4px}
.wrap{max-width:820px;margin-inline:auto;padding-inline:24px}
header{background:#fff;border-bottom:1px solid var(--line);position:sticky;top:0;z-index:40}
.hbar{max-width:1320px;margin-inline:auto;display:flex;align-items:center;gap:13px;padding:0 24px;height:66px}
.hbar img{height:24px;width:auto}
.hbar .sep{width:1px;height:18px;background:var(--line)}
.hbar .back{margin-left:auto;font-size:13px;font-weight:600;color:var(--muted);text-decoration:none}
.hbar .back:hover{color:var(--edu)}
.top{background:var(--ink);color:#fff;padding:48px 0 44px}
.eyebrow{font-size:11px;letter-spacing:.2em;font-weight:700;color:#6FC6F0;
  display:flex;align-items:center;gap:10px}
.eyebrow::before{content:"";width:24px;height:1px;background:currentColor;flex:none}
h1{font-family:var(--serif);font-weight:600;font-size:clamp(25px,3.8vw,36px);line-height:1.45;margin-top:16px}
.meta{color:#9FB8C6;font-size:12px;margin-top:16px;line-height:1.9}
.lead{background:#fff;border:1px solid var(--line);border-radius:14px;padding:24px 26px;
  font-size:13.5px;line-height:2.05;color:var(--ink-2);margin-top:-26px;position:relative}
.body{padding:44px 0 72px}
nav.toc{background:#fff;border:1px solid var(--line);border-radius:14px;padding:22px 24px;margin-top:22px}
nav.toc b{font-size:12.5px;font-weight:800;letter-spacing:.04em}
nav.toc ol{margin:13px 0 0;padding:0;list-style:none;columns:2;column-gap:26px}
nav.toc li{font-size:12.8px;line-height:2.1;break-inside:avoid}
nav.toc a{color:var(--edu-deep);text-decoration:none}
nav.toc a:hover{text-decoration:underline}
section.art{margin-top:34px;scroll-margin-top:86px}
section.art h2{font-family:var(--serif);font-weight:600;font-size:19px;line-height:1.5;
  padding-bottom:9px;border-bottom:1.5px solid var(--ink)}
section.art ol{margin:16px 0 0;padding-left:1.5em}
section.art li{font-size:13.5px;line-height:2.05;margin-bottom:9px;color:var(--ink-2)}
section.art p.single{font-size:13.5px;line-height:2.05;margin-top:16px;color:var(--ink-2)}
.biz{margin-top:44px;background:#fff;border:1px solid var(--line);border-radius:14px;padding:24px 26px}
.biz b{font-size:12.5px;font-weight:800}
.biz dl{display:grid;grid-template-columns:120px 1fr;margin-top:13px;row-gap:7px;font-size:13px}
.biz dt{color:var(--muted);font-weight:700}
.biz dd{color:var(--ink-2)}
footer{background:#07161F;color:#8FAAB8;font-size:12px;padding:34px 0;text-align:center;line-height:2}
footer a{color:inherit}
footer a:hover{color:#fff}
.mockbar{background:#FFF3CD;border-bottom:1px solid #EBD9A0;color:#7A5B00;font-size:12px;
  padding:9px 24px;text-align:center;line-height:1.7}
@media(max-width:640px){ nav.toc ol{columns:1} .biz dl{grid-template-columns:1fr;row-gap:2px} }
@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto}}
</style>
</head>
<body>
<div class="mockbar">これは公開前のモックです。本文は法務レビュー版のままですが、【要確定】の箇所が残っています。</div>
<header><div class="hbar">
  <a href="hp.html" style="display:flex;align-items:center;gap:12px">
    <img src="img/logo_edugrow.png" alt="EduGrow"><span class="sep"></span>
    <img src="img/logo_miraiwa.png" alt="未来WA"></a>
  <a class="back" href="hp.html">← サービス紹介にもどる</a>
</div></header>
<div class="top"><div class="wrap">
  <div class="eyebrow">%(kicker)s</div>
  <h1>%(title)s</h1>
  <div class="meta">版 %(ver)s　／　株式会社BIM JAPAN</div>
</div></div>
<div class="body"><div class="wrap">
  <div class="lead">%(desc)s</div>
"""

TAIL = """  <div class="biz">
    <b>事業者</b>
    <dl>
      <dt>商号</dt><dd>株式会社BIM JAPAN</dd>
      <dt>代表者</dt><dd>代表取締役　安田 応彦</dd>
      <dt>所在地</dt><dd>〒901-0155　沖縄県那覇市赤嶺2-11-9　エンゼルハイム小禄赤嶺第３ 601</dd>
      <dt>お問い合わせ</dt><dd>info@bimjapan.jp</dd>
    </dl>
  </div>
</div></div>
<footer><div class="wrap">
  <a href="hp.html">サービス紹介</a>　／　<a href="terms.html">利用規約</a>　／　<a href="privacy.html">プライバシーポリシー</a>　／　<a href="lp.html">お問い合わせ</a><br>
  © 2026 BIM JAPAN Inc.
</div></footer>
</body>
</html>
"""

def build(key, out, kicker, desc_over=None):
    doc = L[key]
    esc = html.escape
    toc = ''.join('<li><a href="#s%d">%s</a></li>' % (i, esc(x['h'])) for i, x in enumerate(doc['s']))
    arts = ''
    for i, x in enumerate(doc['s']):
        b = x['b']
        if len(b) == 1:
            inner = '<p class="single">%s</p>' % esc(b[0])
        else:
            inner = '<ol>%s</ol>' % ''.join('<li>%s</li>' % esc(t) for t in b)
        arts += '<section class="art" id="s%d"><h2>%s</h2>%s</section>\n' % (i, esc(x['h']), inner)
    page = (HEAD % {'title': esc(doc['t']), 'desc': esc(doc['d']),
                    'kicker': kicker, 'ver': VER}
            + '<nav class="toc"><b>目次</b><ol>%s</ol></nav>\n' % toc
            + arts + TAIL)
    open(os.path.join(DIR, out), 'w', encoding='utf-8').write(page)
    print('%s → %s（%d節）' % (doc['t'], out, len(doc['s'])))

build('terms', 'terms.html', 'Terms of Service')
build('privacy', 'privacy.html', 'Privacy Policy')

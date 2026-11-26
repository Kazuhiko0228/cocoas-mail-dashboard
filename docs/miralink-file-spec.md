# Miralink File（旧スクールガイド／ガイダンス資料）実装仕様

出どころ：Remi さんの依頼書「Miralink File 開発依頼書兼運用マニュアル 第2版」（2026-11-26）＋安田さんの決定（2026-11-26）。
この文書は園の画面（index.html）・未来WA（parent.html）・サーバ（cocoas-api）が同じ形を使うための約束です。

## 決まっていること
- 名前は「Miralink File」に統一（画面の題・メニュー・説明・未来WAの入口と見出し）。旧「スクールガイド」「ガイダンス資料」の表記は、同じ機能を指すものはすべて置き換える。
- 公開先：資料ごとに「全家庭／クラスを選ぶ／家庭を1件ずつ選ぶ」。クラスで選んだ資料は、進級・転園でそのお子さまの今のクラスに合わせて自動で変わる（サーバが毎回 contacts の klass で判定するので、画面側で何もしなくてよい）。新しい資料の初めは「全家庭」。
- 編集・公開できるのは 管理者・マネージャー（運営の代理モードも同じ画面を使う）。一般の先生は見る・印刷するだけ。保護者は見る・印刷するだけ。
- 旧ひな型14件（GUIDE_BASE / WA_GUIDE）は、原本が登録されているものだけ引き継ぐ。引き継ぎはサーバの移行が行う（画面は mfile だけを読む）。原本の無いひな型はもう出さない。
- SI 連携：保護者が未来WAで「どの書類を出せばいい？」と聞ける（POST /parent/mfile/ask）。
- オンライン入力・電子提出・課金は作らない。

## 保存の形（state の鍵 `mfile`）
園の帳簿（state）に1つの鍵で持つ。書けるのは 管理者・マネージャー（サーバの KEY_RULES）。

```js
mfile = {
  v: 1,
  docs: [ Doc, ... ]          // 並び順＝表示順
}
Doc = {
  id: 'mf_xxx',               // 'mf_' + Date.now().toString(36) など。英数字と _ - だけ、40字まで
  cat: '手続き',              // 分類。MF_CATS のどれか（自由入力は不可）
  kind: 'form' | 'read',      // form＝記入して出す／read＝読むだけ（提出不要）
  aud: { mode: 'all' | 'class' | 'fam', classes: ['0歳児', ...], kids: ['<園児id>', ...] },
       // class のとき classes を見る。fam のとき kids（園児の id。ごきょうだいはどの子の id でも同じ家庭）を見る
  hidden: false,              // true＝緊急の非公開（保護者に一切出さない。pub は残す）
  pub: Ver | null,            // 公開中の版。保護者に出るのはこれだけ
  draft: Ver | null,          // 編集中の版。保護者には出ない。公開でまとめて pub に入れ替わる
  upd: '2026-11-26T09:00',    // 最後に直した日時（日本時間）
  by: '名前'                  // 最後に直した人
}
Ver = {
  t: '投薬依頼書',            // 書類名（60字まで）
  use: 'どのような時に必要か・誰が対象か',              // 用途（1000字まで）
  submitTo: '担任', submitWhen: 'お薬と一緒に', submitNote: '手渡しで',   // 提出案内（各200字まで）。kind==='read' のときは空
  howto: '記入の手順・間違えやすいところ（改行可）',     // 書き方の案内（2000字まで）
  orig: { key: 'f…', name: 'touyaku.pdf', type: 'application/pdf', size: 123456, pages: 2, at: '2026-11-26' } | null,
        // 原本。key はサーバ /files の鍵（'srv:' を付けない素の鍵）。種類（kind）は 'スクールガイド'（FILE_KIND_GUIDE）で預ける
        // pages は PDF のページ数（画像は 1）
  marks: [ Mark, ... ],       // 赤文字の記入例
  at: '2026-11-26'            // この版を作った日
}
Mark = {
  id: 'm1',                   // 版の中で一意
  pg: 0,                      // ページ（0 始まり）
  x: 0.12, y: 0.30,           // 左上の位置。ページの幅・高さに対する割合（0〜1）。拡大縮小・印刷でずれないように割合で持つ
  w: 0.40,                    // 文字の箱の幅（ページの幅に対する割合）。この幅で折り返す
  fs: 0.022,                  // 文字の大きさ（ページの幅に対する割合）。表示するときは px = fs × 表示しているページの幅
  text: '山田 花子'           // 改行可（white-space:pre-wrap）。300字まで
}
MF_CATS = ['はじめに','毎日のこと','健康・お薬','安全・災害','手続き','園の情報','その他']
```

### 版の決まり（依頼書 8・11・14）
- 編集はいつも draft に対して行う。draft が無いとき「編集する」を押すと pub を深く写して draft にする（新しい資料は pub:null, draft:{…}）。
- 「公開する」：pub = draft、draft = null、hidden = false。前の pub の原本（orig.key）が新しい pub で使われていなければ、保存が終わってから /files から消す（消すのは保存が成功した後。逆にしない）。
- 「原本の登録を解除」：draft.orig = null、draft.marks = []（用途・説明文・公開先は残す）。公開中の版はそのまま。
- 「新しい原本を登録」：draft.orig = 新しいファイル、draft.marks = []（旧版の赤文字を新原本に持ち越さない）。
- 「下書きを捨てる」：draft = null（draft だけが持っていた原本は /files から消す）。
- 「非公開にする」：hidden = true（緊急用）。「公開に戻す」：hidden = false。
- 「この資料を削除」：Doc ごと消す（pub・draft の原本も消す）。原本の解除とは別のボタン・別の確認文にする。
- 公開には pub になる版に t があること。原本が無い資料（閲覧の文だけ）も公開できる。

## 表示（園・保護者で同じ）
- 原本の表示：PDF は pdf.js で1ページずつ canvas に描く。画像はそのまま img。
  - pdf.js は cdnjs の 3.11.174（`https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js`、worker は同じ場所の `pdf.worker.min.js`）を、開いたときに1度だけ読み込む。
  - 描く大きさは表示幅 × devicePixelRatio（上限 2）。
- 記入例：ページの箱（position:relative）の上に、各 Mark を position:absolute; left:x*100%; top:y*100%; width:w*100%; font-size:(fs × 箱の幅)px; color:#D7191C; line-height:1.35; white-space:pre-wrap で重ねる。箱の幅が変わったら font-size を描き直す（ResizeObserver か resize）。
- 「原本」「記入例」の切り替え。初めは「原本」。marks が空の資料は「記入例」ボタンを出さず「記入例はありません」と小さく出す。
- 印刷ボタン：原本の画面に「原本を印刷」（赤文字なし）、記入例の画面に「記入例を印刷」（赤文字つき）。
  - 印刷は、各ページを画像（canvas.toDataURL('image/jpeg',0.92)、幅は 1600px 程度）にして、A4 の印刷用の窓（または iframe）に1ページ1枚で並べ、記入例のときは同じ割合で赤文字を重ねる。ボタンなど画面の部品は入れない。
  - iPhone の Safari がポップアップを止めないよう、窓はボタンを押したその場で開いておき、描き終わってから中身を入れる（parent.html の data-watt の作りと同じ）。
- 原本の中身の取り出し：園は `apiFileGet(key, cb)`（index.html）。保護者は `GET /parent/files/:key`（Authorization: Bearer WAPI.token()）。

## 保護者への渡し方（サーバが絞る。画面は受け取ったものを出すだけ）
GET /parent/state の data.mfile は次の形（hidden・draft・公開先の中身・by は渡らない。公開先に入っていない資料は来ない）：
```js
{ docs: [ { id, cat, kind, t, use, submitTo, submitWhen, submitNote, howto,
            orig: { key, name, type, pages } | null, marks: [Mark...], at } ] }
```
保護者が開ける原本は、ここに出ている orig.key だけ（GET /parent/files/:key）。

## SI（保護者）
POST /parent/mfile/ask  body: { q: '下の子が熱を出して薬を預けたい' }
返り：{ answer: '…', ids: ['mf_…', …] }（ids はそのご家庭に公開されている資料だけ）。
- 断り：{ error, code }。code: 'plan'（園の契約が Standard 未満）／'urgent'（命に関わる→ answer に119などの案内）／'limit'（回数の上限）／'no_key'（SI の設定なし）。
- 画面は、answer を出し、ids の資料をボタンで並べる（押すとその資料が開く）。当てはまる資料が無いときは「園にご確認ください」と、園へのメッセージ（DM）への道を出す。

## 園の画面の注意
- 原本はサーバにつながっているときだけ登録できる（fileKeep が 'loc:' を返したら登録せず「サーバにつながっているときに登録してください」と出す）。mfile に入れる orig.key は 'srv:' を外した素の鍵（fileRefKey）。
- 古い鍵 guide_files / guide_extra は読まない・書かない（サーバの移行が mfile に写す）。SYNC の fileKeyHeld などの古い決まりには触らない。

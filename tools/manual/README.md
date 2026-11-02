# 運営マニュアルの画面写真を撮り直す

運営マニュアル（Claude Docs：https://claude.ai/artifact/T7zjxEpVi2Jh5tK3ZuX5GR ）の写真20枚を、いまの画面で撮ります。
運営画面・園の画面を変えた回に流します。

## 1. 準備（まっさらなDBと、撮影用のAPI）

毎回まっさらなDBにします（前の回の園が「続きから」に並ばないように）。

```bash
dropdb --if-exists cocoas_manual && createdb cocoas_manual
```

```bash
cd ../cocoas-api && DATABASE_URL=postgres://localhost:5432/cocoas_manual node src/migrate.js
```

```bash
cd ../cocoas-api && PORT=4056 MAIL_PROVIDER=log MAIL_FROM=noreply@example.test DATABASE_URL=postgres://localhost:5432/cocoas_manual JWT_SECRET=local-only-manual-secret-0123456789abcdef ALLOW_ORIGINS=http://localhost:8899 PARENT_APP_URL=http://localhost:8899/parent.html node src/server.js > /tmp/api-manual.log 2>&1 &
```

画面は `python3 -m http.server 8899`（このリポジトリの直下で）。

## 2. 撮る

```bash
OUT=/tmp/manual-shots MAIL_LOG=/tmp/api-manual.log node tools/manual/shots.js
```

- 園は毎回、申込（さくら保育園・施設2つ）から作ります。名前は架空、メールは test.invalid
- 運営のログインはその場で乱数で作ります。パスワードは画面にもログにも出しません。初期パスワードは ●● のまま写します
- 写真の中の `localhost:8899` は、本番の住所（miralink.mirai-wa.com）に置き換えて写します
- `MAIL_LOG` は、契約の同意の確認コードを読むために使います

## 3. マニュアルに差し替える

`m-*.png` を Claude Docs のマニュアルにアップロードして、同じ場所の写真と入れ替えます（Claude Code に「運営マニュアルの写真を差し替えて」と頼めば、この手順で行います）。

| ファイル | マニュアルの場所 |
|---|---|
| m-entrance | 入口 |
| m-app-edit | ステップ1 申込を確かめる |
| m-acct-input / m-acct-done | ステップ2（入力・作ったあと） |
| m-sites | 施設ごとの園 |
| m-terms | ステップ3 |
| m-subsidy | 補助金タブ |
| m-doc / m-contract-step / m-agree-modal | ステップ4（中身を見る・ステップ4・同意の画面） |
| m-bill-ready / m-bill-notyet | ステップ5 |
| m-school / m-live | ステップ6・7 |
| m-welcome / m-agree-step / m-pay-step / m-back | 園の側の案内 |
| m-billing / m-unpaid | 毎月の請求・未納のときの連絡 |

「サポート閲覧で上書きする」の写真は、このスクリプトでは撮りません（手で撮ります）。

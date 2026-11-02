# 園向け導入ガイドの写真と PDF を作り直す

`guide-start.html` の画面写真（`img/guide/`）と `guide-start.pdf` を、いまの画面で撮り直します。
画面を変えた回に流して、一緒に push してください。公開先：https://miralink.mirai-wa.com/guide-start.html （.pdf）

1. 手元の API を立てる（cocoas-api で。**手元のデータベースだけ**。本番の値は使わない）

   ```bash
   PORT=4055 MAIL_PROVIDER=log MAIL_FROM=noreply@example.test DATABASE_URL=postgres://localhost:5432/cocoas_test2 JWT_SECRET=local-only-test-secret-0123456789abcdef ALLOW_ORIGINS=http://localhost:8899 node src/server.js
   ```

2. この画面のリポジトリで `python3 -m http.server 8899`
3. `node tools/guide/shots.js` … 毎回まっさらな「さくら保育園」を作り（園コードは毎回ちがう・ログインIDは sakura-admin）、写真を撮って `img/guide/` に上書きします
4. `node tools/guide/pdf.js` … `guide-start.pdf` を作り直します（A4）

- shots.js は `localhost` 以外の API・データベースでは動きません（本番に園を作らないため）
- パスワードはその場で作り、画面にもログにも出しません
- playwright・pg・bcryptjs は、隣の `cocoas-api/node_modules` と `cw-scrape/node_modules` から読みます。場所が違うときは `COCOAS_API_DIR`・`PLAYWRIGHT_PATH` で教えてください
- 写真の枠や赤い囲みは shots.js の `shot`・`unionShot`・`mark` で決めています。ボタンの名前を変えたら、ここの `#id` も合わせてください

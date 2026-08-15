# tools

## 規約とプライバシーポリシー

条文の**出どころは `parent.html` の `WA_LEGAL`** です。
公開ページ（`terms.html` / `privacy.html`）は、そこから作ります。

```bash
python3 tools/build-legal.py   # 公開ページを作り直す
node tools/check-legal.js      # 本文がずれていないか確かめる
```

**公開ページを手で直さないでください。** 直しても次の生成で消えますし、
アプリの中の同意画面（`parent.html`）とずれます。
条文を変えるときは `parent.html` の `WA_LEGAL` を直し、版（`WA_TERMS_VER`）を上げて、
`build-legal.py` を流してください。

`check-legal.js` は、見出し・本文・版の3つを突き合わせます。
ずれていると 1 を返して止まるので、公開前の確認に使えます。

# リポジトリアクセスガイド

このリポジトリは、`src/` を編集起点、`docs/` を公開用出力として運用します。reader-facing な正本は GitHub Pages と `docs/index.md` を基準に確認してください。

## 主要ディレクトリ

```text
cs-visionaries-book/
├── src/                     # 執筆・改稿の起点
│   ├── introduction/
│   ├── chapters/chapter01.md ... chapter12.md
│   └── appendices/appendix-a.md ... appendix-d.md
├── docs/                    # 公開用 Markdown / Jekyll 入力
│   ├── _data/navigation.yml
│   ├── _includes/
│   ├── chapters/
│   ├── appendices/
│   └── index.md
├── scripts/                 # build / conflict check など
├── package.json
└── book-config.json
```

## 正本の扱い

- reader-facing な章立て・導線: `docs/index.md` と GitHub Pages
- 執筆・改稿の起点: `src/`
- 目次や前後導線の編集起点: `scripts/build-simple.js` と `book-config.json`
- `docs/_data/navigation.yml` は generated data として扱い、build 結果を確認する
- `docs/_includes/navigation.html` と `docs/_includes/page-navigation.html` も generated include であり、通常は `templates/` 側を編集起点にする
- book metadata: `book-config.json`
- `docs/_site/` は破棄可能な build artifact であり、編集対象でも正本でもない

path role matrix:

- `src/`: authoring の起点
- `docs/`: reader-facing output
- `docs/_data/navigation.yml`: generated data
- `docs/_includes/navigation.html`, `docs/_includes/page-navigation.html`: generated include
- `docs/_site/`: disposable artifact
- `cs-visionaries-book/`, `cs-visionaries-book-orig/`: legacy / non-canonical

章番号や導線に食い違いがある場合は、まず公開トップページの目次を確認してください。

## 代表的なコマンド

```bash
npm ci
npm run build
npm run build:safe
npm run check-conflicts
npm run lint:light
npm run preview
```

補足:
- `npm run build` は `src/` から `docs/` を更新します。
- `npm run preview` は `docs/` を簡易 preview します。
- Jekyll include や公開導線を厳密に確認する場合は `cd docs && bundle exec jekyll build` を使います。

## 競合検出

Jekyll と Liquid の衝突候補は次で確認します。

```bash
npm run check-conflicts
```

必要なら自動補正を試せます。

```bash
npm run fix-conflicts
```

## 公開範囲と機密情報

このリポジトリでは、テンプレート文書にあるような `*.private.md` や `npm run scan-all` などの一括保護機構を前提にしません。機密情報、未公開メモ、長期利用する秘密情報はリポジトリに置かず、外部 secret 管理やローカル限定ファイルで扱ってください。

最低限の運用方針は次のとおりです。

- 章本文に秘密情報、個人情報、未公開 URL を書かない
- 一時ファイルや作業メモはコミット対象外にする
- 公開導線に関わる変更は `docs/index.md` と該当章・付録の両方で確認する

## よく参照する文書

- `README.md`
- `QUICK-START.md`
- `GITHUB-PAGES-SETUP.md`
- `CONTRIBUTING.md`
- `docs/index.md`

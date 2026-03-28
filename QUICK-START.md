# Quick Start Guide

このリポジトリで現行の公開書籍を更新・確認するための最短手順です。reader-facing な正本は `docs/index.md` と GitHub Pages を基準に確認してください。

## 前提条件

- Node.js 20 以上
- npm
- Ruby / Bundler（Jekyll preview を使う場合）
- Git

## 最短セットアップ

```bash
git clone https://github.com/itdojp/cs-visionaries-book.git
cd cs-visionaries-book
npm ci
```

注記: `npm run setup` / `easy-setup.js` は template 由来の legacy スクリプトであり、この repository の正規導線ではありません。現行 repo では `README.md`、`QUICK-START.md`、`REPOSITORY-ACCESS-GUIDE.md` の手順を基準にしてください。

## ビルドと確認

### 公開用 Markdown を再生成

```bash
npm run build
```

出力先は `docs/` です。現行のソース構成は次のとおりです。

```text
src/
├── introduction/index.md
├── chapters/chapter01.md
├── ...
├── chapters/chapter12.md
└── appendices/appendix-a.md ... appendix-d.md
```

### ローカル preview

簡易 preview:

```bash
npm run preview
```

Jekyll のページ遷移や include を含めて確認する場合は、`docs/` 配下で次を実行します。

```bash
cd docs
bundle exec jekyll build
bundle exec jekyll serve --livereload --baseurl ""
```

## 日常的な更新手順

1. `src/` 側の該当ファイルを編集する
2. `npm run build` で `docs/` を更新する
3. 必要に応じて `cd docs && bundle exec jekyll build` で公開ページ相当を確認する
4. 公開版の目次・章導線は `docs/index.md` を正として確認する

## よく使うコマンド

```bash
npm run build           # docs/ を更新
npm run build:safe      # 競合検出込みの build
npm run check-conflicts # Jekyll conflict を dry-run 検査
npm run lint:light      # src/**/*.md の軽量 lint
```

## 注意点

- reader-facing な章立て・章番号は公開トップページを正とします。テンプレート由来の古い説明が残っている場合でも、`docs/index.md` を優先してください。
- 原稿本文の編集は原則 `src/` を起点に行い、`npm run build` 後に `docs/` 側へ意図どおり反映されたことを確認してください。公開導線に関わる変更は `docs/index.md` と該当章・付録の両方で build 結果を確認します。
- 機密情報や未公開メモはリポジトリに置かないでください。

## 参照先

- 完全ガイド: `README.md`
- リポジトリ構成: `REPOSITORY-ACCESS-GUIDE.md`
- 公開トップ: `https://itdojp.github.io/cs-visionaries-book/`
- フィードバック送信先: GitHub Issues

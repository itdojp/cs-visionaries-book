# GitHub Pages設定ガイド

## 概要

このリポジトリの公開出力先は `docs/` です。reader-facing な正本は GitHub Pages と `docs/index.md` を基準に確認してください。

## 推奨設定：Legacy方式（Deploy from a branch）

### 手順

1. **リポジトリ設定画面を開く**
   - GitHub上でリポジトリに移動
   - `Settings` タブをクリック

2. **Pages設定を開く**
   - 左メニューから `Pages` をクリック

3. **Source設定**
   - `Source` で `Deploy from a branch` を選択
   - `Branch` で `main` を選択
   - `Folder` で `/docs` を選択
   - `Save` をクリック

4. **確認**
   - 数分後に `https://itdojp.github.io/cs-visionaries-book/` でアクセス可能
   - `docs/index.md` の内容が反映されているか確認

### 特徴
- ✅ 設定が簡単
- ✅ 確実に動作
- ✅ エラーが少ない
- ✅ ワンステップでの公開

## 代替設定：GitHub Actions方式

### 手順

1. **リポジトリ設定画面を開く**
   - GitHub上でリポジトリに移動
   - `Settings` タブをクリック

2. **Pages設定を開く**
   - 左メニューから `Pages` をクリック

3. **Source設定**
   - `Source` で `GitHub Actions` を選択

4. **ワークフロー変更**
   ```bash
   # このリポジトリでは Pages は main ブランチの /docs フォルダ公開を前提に運用している
   # GitHub Actions 方式へ切り替える場合は
   # - docs/ を artifact として publish する workflow
   # - Pages の Source を GitHub Actions に変更
   # を同時に整備する
   ```

### 特徴
- ✅ 新しい方式
- ✅ 高度な制御が可能
- ⚠️ 設定がやや複雑
- ⚠️ デバッグが困難

## トラブルシューティング

### 404エラーが発生する場合

1. **ワークフローの実行確認**
   - `Actions` タブで最新のワークフローが成功しているか確認
   - エラーがある場合はログを確認

2. **Pages設定の確認**
   - `Settings > Pages` で正しい設定になっているか確認
   - Source: `Deploy from a branch`
   - Branch: `main`
   - Folder: `/docs`

3. **ファイル構造の確認**
   ```bash
   # docsディレクトリの内容を確認
   ls -la docs/
   
   # index.mdの存在確認
   ls -la docs/index.md
   ```

4. **_config.ymlの確認**
   ```yaml
   # docs/_config.yml
   baseurl: "/[リポジトリ名]"  # 正しいリポジトリ名か確認
   url: "https://[ユーザー名].github.io"  # 正しいユーザー名か確認
   ```

### ビルドが失敗する場合

ローカル検証には Node.js 22.22.2 を使用し、目的に応じて次のいずれか一方を選びます。

1. **ブラウザ不要の verify-only QA**

   コミット済み静的図を検証し、renderer を起動しない経路です。

   ```bash
   export PUPPETEER_SKIP_DOWNLOAD=true
   export STATIC_DIAGRAMS_VERIFY_ONLY=1
   npm ci --omit=optional
   npm run test:light
   ```

2. **実レンダリングと手動 build**

   verify-only 用の環境変数を解除して図を再生成する通常経路です。Puppeteer 25.8.0 が固定するブラウザを通常 `npm ci` で導入します。

   ```bash
   unset PUPPETEER_SKIP_DOWNLOAD
   unset STATIC_DIAGRAMS_VERIFY_ONLY
   npm ci
   npm run render:diagrams
   npm run build
   ```

3. **Jekyll build**

   ```bash
   cd docs && bundle install
   bundle exec jekyll build
   ```

4. **ログの確認**
   - GitHub Actions のログで詳細なエラーメッセージを確認

### サイトが古い内容を表示する場合

1. **キャッシュのクリア**
   - ブラウザのキャッシュをクリア
   - 強制リロード（Ctrl+F5）

2. **GitHub Pages のビルド確認**
   - `Settings > Pages` でビルド状況を確認
   - `Actions` タブで最新のワークフローが完了しているか確認

## 設定方式の比較

| 項目 | Legacy方式 | GitHub Actions方式 |
|------|------------|-------------------|
| **設定の簡単さ** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| **動作の安定性** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **デバッグのしやすさ** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| **カスタマイズ性** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **今後の対応** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |

## 推奨

**このリポジトリの現行運用**: `Deploy from a branch` で `main /docs` を使う

**別方式へ切り替える場合**: GitHub Actions 側で `docs/` artifact を publish する workflow を別途整備する

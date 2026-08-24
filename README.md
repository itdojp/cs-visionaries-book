# デジタル革命の舞台裏（コンピュータサイエンス人物史・技術潮流ガイド）

計算理論、ソフトウェア基盤、Web、検索、SNS、クラウド、現代AI、量子、未来予測まで、現代のデジタル社会を形作った人物と技術潮流をたどる読み物です。人物章とテーマ章を組み合わせ、現代テクノロジーの本質とビジネスへの示唆を整理します。

- 公開トップページ: [cs-visionaries-book](https://itdojp.github.io/cs-visionaries-book/)
- 現行の reader-facing な正式導線は公開トップページを正とします。`docs/index.md` はその公開入力です。
- 原稿本文の編集起点は `src/` です。公開向けの確認は生成後の `docs/` と GitHub Pages を基準に行います。
- `cs-visionaries-book-orig/` は旧原稿アーカイブであり、現行の正本ではありません。
- path role matrix:
  - `src/` = 章・付録・序章の authoring source
  - `templates/index.md` = 公開トップページの authoring source
  - `templates/{layouts,includes,styles,js}/` = 公開UIの authoring source
  - `_config.yml` / `assets/` = Jekyll設定・静的アセットの authoring source
  - `docs/` = `npm run build` で置き換える tracked reader-facing output（直接編集禁止）
  - `docs/_data/navigation.yml` = auto-generated build data
    （手動編集禁止。更新は `npm run build` を再実行）
  - `docs/_site/` = disposable artifact
  - `src/afterword.md` = 現行 `book-config.json` で無効な非公開legacy原稿（公開対象に戻す場合はcontentSections・navigation・トップ導線を同時更新）
  - `cs-visionaries-book/` / `cs-visionaries-book-orig/` = legacy / non-canonical
- シリーズ: [itdojp/it-engineer-knowledge-architecture](https://github.com/itdojp/it-engineer-knowledge-architecture)

`npm run build` は上記 authoring source から `docs/` 全体を再生成します。生成結果を反映した状態でもう一度実行して新たな tracked 差分が出ないことを、ローカル確認と CI の決定性ゲートで保証します。


## ローカル品質チェック

### ブラウザ不要の verify-only QA

コミット済み静的SVGを検証するだけで、新しい図をレンダリングしない経路です。CI と同様に、ブラウザ取得を抑止し、build を verify-only に固定します。

```bash
export PUPPETEER_SKIP_DOWNLOAD=true
export STATIC_DIAGRAMS_VERIFY_ONLY=1

# optional 依存と Puppeteer のブラウザ取得を省いた再現可能なQA依存をインストール
npm ci --omit=optional

# package / Jekyll / 公開ページ metadata の整合性を確認
npm run check:metadata

# optional 依存を除いた high 以上の audit findings を確認
npm run check:security

# 現行 Markdown スタイルを考慮した軽量lintを確認
npm run lint:light

# Markdown lint と簡易ビルドを確認
npm run test:light
```

この経路の `npm run test:light` / `npm run build` は、renderer を起動せず、コミット済み図と `docs/` の同期を検証します。図の新規生成や更新には使用できません。

### 実レンダリング・build・preview

図をレンダリングする `npm run render:diagrams`、通常の `npm run build`、build を内包する `npm run preview` には Chrome が必要です。Puppeteer 25.8.0 が固定するブラウザを postinstall で導入するため、verify-only 用の環境変数を解除して通常インストールします。

```bash
unset PUPPETEER_SKIP_DOWNLOAD
unset STATIC_DIAGRAMS_VERIFY_ONLY
npm ci

npm run render:diagrams
npm run build
npm run preview
```

注: ローカル QA と CI は Node.js 22.22.2、`markdownlint-cli` 0.49.1、Puppeteer 25.8.0 を厳密に使用します。`gray-matter` は互換な `js-yaml` 3 系の修正版を使用します。

## Phase 5 人物・年代・貢献レビューゲート

人物史・技術史を更新する PR では、次を確認して PR 本文に記録します。

- 人物名、年代、所属、著作、受賞、製品名は、一次資料・公式資料・査読論文・歴史研究を優先して確認する。
- 貢献、影響、因果関係は、資料に明記された事実と編集上の解釈を分け、単独人物の功績として過度に単純化しない。
- `cs-visionaries-book-orig/` やネストした `cs-visionaries-book/` は旧アーカイブであり、現行正本や出典の代替として扱わない。
- 生成済み `docs/` と GitHub Pages の表示で、年表、付録C、該当章の記述が矛盾しないことを確認する。
- `GitHub Copilot review` の本文、`inline comment`、`suggestion` を全件確認し、未解決 `review thread` が 0 件であることを完了条件にする。


## 想定読者（抜粋）

- 一般読者（人物の生涯と業績の物語を中心に読みたい方）
- 技術者（技術解説コラムや参考文献も含めて理解を深めたい方）
- 経営者・リーダー（ビジネス教訓や現代への応用を重視したい方）

## フィードバック（誤り指摘・改善提案）

誤字脱字、事実誤認の指摘、改善提案は Issue / PR で受け付けます。

- GitHub Issues: [itdojp/cs-visionaries-book/issues/new/choose](https://github.com/itdojp/cs-visionaries-book/issues/new/choose)
- Email: [knowledge@itdo.jp](mailto:knowledge@itdo.jp)

## ライセンス

本書は Creative Commons BY-NC-SA 4.0 で提供されています。詳細は `LICENSE.md` を参照してください。

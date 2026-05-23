# デジタル革命の舞台裏（コンピュータサイエンス人物史・技術潮流ガイド）

計算理論、ソフトウェア基盤、Web、検索、SNS、クラウド、現代AI、量子、未来予測まで、現代のデジタル社会を形作った人物と技術潮流をたどる読み物です。人物章とテーマ章を組み合わせ、現代テクノロジーの本質とビジネスへの示唆を整理します。

- 公開トップページ: [cs-visionaries-book](https://itdojp.github.io/cs-visionaries-book/)
- 現行の reader-facing な正式導線は公開トップページを正とします。`docs/index.md` はその公開入力です。
- 編集起点は `src/` です。公開向けの確認は `docs/` と GitHub Pages を基準に行います。
- `cs-visionaries-book-orig/` は旧原稿アーカイブであり、現行の正本ではありません。
- path role matrix:
  - `src/` = authoring
  - `docs/` = reader-facing output
  - `docs/_data/navigation.yml` = auto-generated build data
    （手動編集禁止。更新は `npm run build` を再実行）
  - `docs/_site/` = disposable artifact
  - `cs-visionaries-book/` / `cs-visionaries-book-orig/` = legacy / non-canonical
- シリーズ: [itdojp/it-engineer-knowledge-architecture](https://github.com/itdojp/it-engineer-knowledge-architecture)


## Phase 5 人物・年代・貢献レビューゲート

人物史・技術史を更新する PR では、次を確認して PR 本文に記録します。

- 人物名、年代、所属、著作、受賞、製品名は、一次資料・公式資料・査読論文・歴史研究を優先して確認する。
- 貢献、影響、因果関係は、資料に明記された事実と編集上の解釈を分け、単独人物の功績として過度に単純化しない。
- `cs-visionaries-book-orig/` やネストした `cs-visionaries-book/` は旧アーカイブであり、現行正本や出典の代替として扱わない。
- 生成済み `docs/` と GitHub Pages の表示で、年表、付録C、該当章の記述が矛盾しないことを確認する。
- GitHub Copilot review の本文、inline comment、suggestion を全件確認し、未解決 review thread が 0 件であることを完了条件にする。


## 想定読者（抜粋）

- 一般読者（人物の生涯と業績の物語を中心に読みたい方）
- 技術者（技術解説コラムや参考文献も含めて理解を深めたい方）
- 経営者・リーダー（ビジネス教訓や現代への応用を重視したい方）

## フィードバック（誤り指摘・改善提案）

誤字脱字、事実誤認の指摘、改善提案は Issues / PR で受け付けます。

- GitHub Issues: [itdojp/cs-visionaries-book/issues/new/choose](https://github.com/itdojp/cs-visionaries-book/issues/new/choose)
- Email: [knowledge@itdo.jp](mailto:knowledge@itdo.jp)

## ライセンス

本書は Creative Commons BY-NC-SA 4.0 で提供されています。詳細は `LICENSE.md` を参照してください。

---
layout: book
title: "付録D：AI時代形成の統合図（Compute×Data×Algorithm×Productization×Governance）"
---

# 付録D：AI時代形成の統合図（Compute×Data×Algorithm×Productization×Governance）


本書は人物史として章が独立している一方で、読者が「AI時代が“突然”成立したのではなく、複数の基盤が収束して成立した」ことを因果で理解するには、横串の地図が必要になる。

この付録では、AI時代形成を **Compute / Data / Algorithm / Productization（+Distribution） / Governance** の収束として捉え、関連章へ戻るための補助地図を提供する。

注記:
- 本付録は、現行版の人物章・テーマ章を横断して読むための補助地図である。現在の正式な章立てと章題は、トップページの目次を正とする。
- 章の役割分担を確認したい場合は、まずトップページの読み方ガイドと目次を確認し、その後で本付録へ戻ると整理しやすい。
- AI の主導入は第10章であり、本付録はその前後で Web / 検索 / 暗号 / クラウドの章へ戻るための案内として使う。

## 1. 5要素モデル（最小定義）

|要素|最小定義（本書での意味）|典型的な論点|
|---|---|---|
|Compute|学習・推論を成立させる計算資源（GPU、クラウド、分散処理）|コスト、スケール、可観測性、運用|
|Data|学習・評価・運用に必要なデータ基盤（DB、Web、検索、ログ）|品質、偏り、権利、データガバナンス|
|Algorithm|モデルと学習法（深層学習、Transformer、最適化）|性能、汎化、推論、解釈可能性|
|Productization (+Distribution)|プロダクトに落とす仕組み（API、UX、統合、SLO、監視）|提供形態、導入障壁、失敗モード|
|Governance|安全・法令・倫理・監査（規制、セキュリティ、説明責任）|誤用、漏えい、責任分界、規制対応|

## 2. 収束の因果（Mermaid 図）

以下は「どの基盤が揃うと社会実装が加速するか」を示す最小の因果図である（年号の詳細は付録A、一次情報は付録Cを参照）。

```mermaid
flowchart LR
  subgraph Base["基盤（2010s〜）"]
    C["Compute\nGPU/クラウド/分散"]
    D["Data\nWeb/DB/検索/ログ"]
    A["Algorithm\n深層学習/Transformer"]
    P["Productization\nAPI / UX / 運用"]
    G["Governance\n安全/法令/監査"]
  end

  C --> FM["Foundation Models（基盤モデル）"]
  D --> FM
  A --> FM

  FM --> App["生成AIの社会実装（2022〜）\n生成/検索/支援/自動化"]
  P --> App
  G --> App
```

注記:
- **Foundation Models（基盤モデル）**は、巨大モデルを指す“モデルサイズ”の話ではなく、**多用途に転用される学習済みモデル**という性質を指す（モデルの詳細が非公開の場合は、出典に基づき「非公開」と明記する）。
- Mermaid は環境によってレンダリングされないことがある。必要に応じて GitHub の Markdown 表示や Mermaid Live Editor 等で確認する。

## 3. マイルストーン（要素別の最小セット）

付録Aの年表を、5要素モデルで読めるように“要素別”に圧縮した（ここでは代表例のみ）。

|要素|マイルストーン（例）|対応する章・付録（現行公開版の例）|
|---|---|---|
|Compute|クラウド普及、GPU計算資源の一般化、運用基盤の拡張|第9章（クラウド）、第10章（現代AI）|
|Data|Web/検索/SNS の普及とデータ流通の拡大|第6章（Web）、第7章（検索）、第8章（SNS）|
|Algorithm|深層学習の実用化、Transformerの普及、生成AIの社会実装|第10章（現代AI）、付録C（AI 関連文献）|
|Productization|API提供、UX、評価（Evals）とガードレール|第5章（PC/UX）、第9章（クラウド）、第10章（現代AI）|
|Governance|セキュリティ/暗号、規制、監査・責任分界|第2章（暗号）、第10章（現代AI）、付録A/付録C|

現行版の参照先メモ: [Web / インターネット（第6章）](https://itdojp.github.io/cs-visionaries-book/chapters/chapter06/)、[検索（第7章）](https://itdojp.github.io/cs-visionaries-book/chapters/chapter07/)、[SNS（第8章）](https://itdojp.github.io/cs-visionaries-book/chapters/chapter08/)、[クラウド（第9章）](https://itdojp.github.io/cs-visionaries-book/chapters/chapter09/)、[AI（第10章）](https://itdojp.github.io/cs-visionaries-book/chapters/chapter10/) です。章番号で迷った場合は、トップページの目次を正としてください。

## 4. 章→AIスタック対応（本書内マッピング）

本書の人物史を「AI時代形成のどの層に効いたか」で読むための対応表である。各章を“AIの前提条件”として位置付けて読むと、点が線になる。

|章|主題|AI時代形成の要素|接続の要点（1行）|
|---|---|---|---|
|第6章|Web|Data / Distribution|Web は情報公開とリンク構造を標準化し、後の検索・学習データ流通の土台になった|
|第7章|検索|Data / Distribution|検索は情報発見とランキングを実装し、データ活用の入口を大きく変えた|
|第2章|暗号|Governance|暗号と認証は、AIサービスの安全な流通と責任分界の前提になる|
|第5章|PC/UX|Productization|人間が道具として受け入れられる UI/UX は、AI 導入の成否を左右する|
|第9章|クラウド|Compute / Productization|クラウドは学習・推論・配布を支える運用基盤として AI 提供形態に直結する|
|第10章|現代AIの社会実装|Algorithm / Productization / Governance|モデル、評価、規制対応が揃って初めて業務へ定着する|

## 5. 付録Dの使い方（AI時代形成を最短で掴む）

正式な読み順はトップページの読み方ガイドと目次を正とします。本節は、付録Dを起点に読み直すときの補助導線です。

「AI時代の形成」を因果で押さえたい場合は、次の順が最短である。

1. 付録D（本付録）で地図を掴む
2. 付録A（年表）で主要イベントの位置関係を確認する
3. [第10章（現代AIの社会実装）](https://itdojp.github.io/cs-visionaries-book/chapters/chapter10/) を読み、必要に応じて [付録C](https://itdojp.github.io/cs-visionaries-book/appendices/appendix-c/) の AI 文献で技術史を補う
4. データ/運用/ガバナンスの章（[第6章](https://itdojp.github.io/cs-visionaries-book/chapters/chapter06/) / [第7章](https://itdojp.github.io/cs-visionaries-book/chapters/chapter07/) / [第2章](https://itdojp.github.io/cs-visionaries-book/chapters/chapter02/) / [第9章](https://itdojp.github.io/cs-visionaries-book/chapters/chapter09/)）を必要に応じて補完する

注記: 現行公開版では、第10章が AI の主導入です。深層学習の技術史や関連研究は、付録C の文献と関連人物章を併用して追うと位置づけを整理しやすくなります。

### 代表マイルストーン（詳細年表は付録Aを参照）

- **1843年**: エイダ・ラブレスの Note G が、計算機を「記号操作の機械」として捉える視点を示した。
- **1936〜1950年**: チューリングマシンとチューリングテストにより、計算可能性と機械知能の議論が形になった。
- **1971〜1991年**: Intel 4004、PC 普及、Web 公開により、計算資源と情報公開の基盤が一般化した。
- **1998〜2007年**: Google、Facebook、AWS、iPhone が、検索・SNS・クラウド・モバイルの大規模分配を定着させた。
- **2012〜2023年**: AlexNet、AlphaGo、生成AIの普及により、Algorithm / Productization / Governance を同時に扱う現代 AI の段階に入った。

詳細な年号、出来事の並び、補助的な節目を確認したい場合は、まず [付録A](https://itdojp.github.io/cs-visionaries-book/appendices/appendix-a/) を参照してください。本付録では、AI 時代形成を理解するための代表イベントだけを残しています。

この付録は、人物史と技術潮流を AI 時代形成の観点で読み直すための補助地図です。年表や章対応を確認するときは、付録Aとトップページの目次をあわせて参照してください。

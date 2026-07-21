#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const CHECKER = path.join(ROOT, 'scripts/check-glossary-coverage.js');
const TASK_TMP_ROOT = path.join(ROOT, '.codex-local', 'tmp');
const FILES = [
  'quality/glossary-coverage-contract.json',
  'templates/index.md',
  'src/chapters/chapter07.md',
  'src/chapters/chapter10.md',
  'src/appendices/appendix-b.md',
  'src/appendices/appendix-d.md',
  'docs/index.md',
  'docs/chapters/chapter07.md',
  'docs/chapters/chapter10.md',
  'docs/appendices/appendix-b.md',
  'docs/appendices/appendix-d.md'
];

function fixture(base, name) {
  const dir = path.join(base, name);
  for (const relative of FILES) {
    const target = path.join(dir, relative);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(path.join(ROOT, relative), target);
  }
  return dir;
}

function replaceOnce(file, before, after) {
  const text = fs.readFileSync(file, 'utf8');
  if (!text.includes(before)) throw new Error(`fixture marker missing: ${before}`);
  fs.writeFileSync(file, text.replace(before, after), 'utf8');
}

function runNegativeCase(base, name, mutate, expected) {
  const dir = fixture(base, name);
  mutate(dir);
  const result = spawnSync(process.execPath, [CHECKER, '--root', dir], { encoding: 'utf8' });
  const output = `${result.stdout}${result.stderr}`;
  if (result.status === 0) throw new Error(`negative case unexpectedly passed: ${name}`);
  if (!output.includes(expected)) throw new Error(`negative case ${name} missed ${expected}:\n${output}`);
}

function runPositiveCase(base, name, mutate) {
  const dir = fixture(base, name);
  mutate(dir);
  const result = spawnSync(process.execPath, [CHECKER, '--root', dir], { encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`positive case failed: ${name}:\n${result.stdout}${result.stderr}`);
}

function mutateContract(dir, mutate) {
  const file = path.join(dir, 'quality/glossary-coverage-contract.json');
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  mutate(data);
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
}

function main() {
  fs.mkdirSync(TASK_TMP_ROOT, { recursive: true });
  const base = fs.mkdtempSync(path.join(TASK_TMP_ROOT, 'glossary-coverage-'));
  const negativeCases = [
    ['missing-term-heading', dir => replaceOnce(path.join(dir, 'src/appendices/appendix-b.md'), '### ImageNet {#glossary-imagenet}', '**ImageNet**'), 'glossary term heading missing'],
    ['missing-primary-source', dir => replaceOnce(path.join(dir, 'src/appendices/appendix-b.md'), 'https://image-net.org/static_files/papers/imagenet_cvpr09.pdf', 'https://example.invalid/imagenet'), 'glossary marker must occur exactly once'],
    ['chapter07-first-link', dir => replaceOnce(path.join(dir, 'src/chapters/chapter07.md'), "[PageRank]({{ '/appendices/appendix-b/#glossary-pagerank' | relative_url }})", 'PageRank'), 'first reader-facing glossary link mismatch'],
    ['chapter10-imagenet-first-link', dir => replaceOnce(path.join(dir, 'src/chapters/chapter10.md'), "[ImageNet]({{ '/appendices/appendix-b/#glossary-imagenet' | relative_url }})", 'ImageNet'), 'first reader-facing glossary link mismatch'],
    ['chapter10-gpu-first-link', dir => replaceOnce(path.join(dir, 'src/chapters/chapter10.md'), "[GPU]({{ '/appendices/appendix-b/#glossary-gpu' | relative_url }})", 'GPU'), 'first reader-facing glossary link mismatch'],
    ['chapter10-transformer-first-link', dir => replaceOnce(path.join(dir, 'src/chapters/chapter10.md'), "[Transformerアーキテクチャ]({{ '/appendices/appendix-b/#glossary-transformer' | relative_url }})", 'Transformer アーキテクチャ'), 'first reader-facing glossary link mismatch'],
    ['chapter10-mermaid-transformer-first-link', dir => replaceOnce(path.join(dir, 'src/chapters/chapter10.md'), '2017年: Attention Is All You Need発表', '2017年: Transformer'), 'first reader-facing glossary link mismatch'],
    ['appendix-d-first-link', dir => replaceOnce(path.join(dir, 'src/appendices/appendix-d.md'), '[GPU]({{ glossary_gpu_url }})', 'GPU'), 'first reader-facing glossary link mismatch'],
    ['appendix-d-portable-route', dir => replaceOnce(path.join(dir, 'src/appendices/appendix-d.md'), "{% assign glossary_gpu_url = '/appendices/appendix-b/#glossary-gpu' | relative_url %}", "{% assign glossary_gpu_url = 'https://example.invalid/glossary-gpu' %}"), 'glossary marker must occur exactly once'],
    ['appendix-d-pagerank-data-misclassification', dir => {
      const file = path.join(dir, 'src/appendices/appendix-d.md');
      replaceOnce(file, '|Data|学習・評価・運用に必要なデータ基盤（[ImageNet]({{ glossary_imagenet_url }})、DB、Web、検索インデックス、ログ）', '|Data|学習・評価・運用に必要なデータ基盤（[ImageNet]({{ glossary_imagenet_url }})、DB、Web、検索/[PageRank]({{ glossary_pagerank_url }})、ログ）');
      replaceOnce(file, '|Algorithm|モデルと学習法（深層学習、[PageRank]({{ glossary_pagerank_url }})、[Transformer]({{ glossary_transformer_url }})、最適化）', '|Algorithm|モデルと学習法（深層学習、[Transformer]({{ glossary_transformer_url }})、最適化）');
    }, 'glossary marker must occur exactly once'],
    ['missing-backlink', dir => replaceOnce(path.join(dir, 'src/appendices/appendix-b.md'), "- **関連**: [第7章]({{ '/chapters/chapter07/' | relative_url }}) / [付録D]({{ '/appendices/appendix-d/' | relative_url }})", '- **関連**: 第7章 / 付録D'), 'glossary marker must occur exactly once'],
    ['generated-drift', dir => replaceOnce(path.join(dir, 'docs/appendices/appendix-b.md'), '### Transformer {#glossary-transformer}', '### Transformer'), 'glossary term heading missing'],
    ['top-route-missing', dir => replaceOnce(path.join(dir, 'templates/index.md'), "[付録B: 用語解説]({{ '/appendices/appendix-b/' | relative_url }})", '付録B: 用語解説'), 'glossary marker must occur exactly once'],
    ['gpu-misclassified', dir => fs.appendFileSync(path.join(dir, 'src/appendices/appendix-b.md'), '\nGPUはdatasetである。\n'), 'forbidden glossary classification found'],
    ['gpu-japanese-algorithm-misclassified', dir => fs.appendFileSync(path.join(dir, 'src/appendices/appendix-b.md'), '\nGPUはアルゴリズムだ。\n'), 'forbidden glossary classification found'],
    ['gpu-japanese-dataset-misclassified', dir => fs.appendFileSync(path.join(dir, 'src/appendices/appendix-b.md'), '\nGPUはデータセットだ。\n'), 'forbidden glossary classification found'],
    ['imagenet-misclassified', dir => fs.appendFileSync(path.join(dir, 'src/appendices/appendix-b.md'), '\nImageNetはneural network architectureである。\n'), 'forbidden glossary classification found'],
    ['imagenet-japanese-model-misclassified', dir => fs.appendFileSync(path.join(dir, 'src/appendices/appendix-b.md'), '\nImageNetはモデルだ。\n'), 'forbidden glossary classification found'],
    ['imagenet-japanese-architecture-misclassified', dir => fs.appendFileSync(path.join(dir, 'src/appendices/appendix-b.md'), '\nImageNetはアーキテクチャだ。\n'), 'forbidden glossary classification found'],
    ['transformer-misclassified', dir => fs.appendFileSync(path.join(dir, 'src/appendices/appendix-b.md'), '\nTransformerはdatasetである。\n'), 'forbidden glossary classification found'],
    ['transformer-japanese-product-misclassified', dir => fs.appendFileSync(path.join(dir, 'src/appendices/appendix-b.md'), '\nTransformerは製品だ。\n'), 'forbidden glossary classification found'],
    ['pagerank-conflation', dir => fs.appendFileSync(path.join(dir, 'src/appendices/appendix-b.md'), '\nPageRankは現在のGoogle検索の全rankingを処理する。\n'), 'forbidden glossary classification found'],
    ['pagerank-japanese-conflation', dir => fs.appendFileSync(path.join(dir, 'src/appendices/appendix-b.md'), '\nPageRankは現在のGoogle検索全体を順位付けするアルゴリズムだ。\n'), 'forbidden glossary classification found'],
    ['pagerank-stale-fixed-age', dir => replaceOnce(path.join(dir, 'src/chapters/chapter07.md'), '初期PageRankだけで検索結果を説明することはできない。', '26年前に二人の学生が考案したアルゴリズムが、瞬時に数兆のWebページから最適な答えを見つけ出している。'), 'glossary marker must occur exactly once'],
    ['pagerank-direct-ai-lineage', dir => replaceOnce(path.join(dir, 'src/chapters/chapter07.md'), 'PageRankをすべての現代AIの直接的な基盤とみなすことはできない。', 'ラリー・ペイジとセルゲイ・ブリンが1996年に開発したPageRank は、現在のAI技術の基盤ともなっている。'), 'glossary marker must occur exactly once'],
    ['weakened-sources', dir => mutateContract(dir, data => { delete data.sources.appendixD; }), 'glossary source inventory mismatch'],
    ['weakened-generated', dir => mutateContract(dir, data => { delete data.generated.appendixD; }), 'glossary generated inventory mismatch'],
    ['weakened-required', dir => mutateContract(dir, data => { data.required.chapter10.pop(); }), 'glossary required inventory mismatch'],
    ['weakened-terms', dir => mutateContract(dir, data => { data.terms.gpu.required.pop(); }), 'glossary term inventory mismatch'],
    ['weakened-first-links', dir => mutateContract(dir, data => { data.firstLinks.appendixD.pop(); }), 'glossary first-link inventory mismatch'],
    ['weakened-forbidden', dir => mutateContract(dir, data => { data.forbidden.pop(); }), 'glossary forbidden inventory mismatch'],
    ['weakened-patterns', dir => mutateContract(dir, data => { data.forbiddenPatterns.pop(); }), 'glossary forbidden pattern inventory mismatch']
  ];
  const positiveCases = [
    ['reordered-contract-keys', dir => mutateContract(dir, data => {
      data.sources = Object.fromEntries(Object.entries(data.sources).reverse());
      data.generated = Object.fromEntries(Object.entries(data.generated).reverse());
      data.terms = Object.fromEntries(Object.entries(data.terms).reverse());
    })],
    ['pagerank-negation-wa-ke-de-wa-nai', dir => fs.appendFileSync(path.join(dir, 'src/appendices/appendix-b.md'), '\nPageRankは現在のGoogle検索の全rankingを処理するわけではない。\n')],
    ['pagerank-negation-mono-de-wa-nai', dir => fs.appendFileSync(path.join(dir, 'src/appendices/appendix-b.md'), '\nPageRankは現代のGoogle検索の全rankingを処理するものではない。\n')]
  ];

  try {
    for (const [name, mutate, expected] of negativeCases) runNegativeCase(base, name, mutate, expected);
    for (const [name, mutate] of positiveCases) runPositiveCase(base, name, mutate);
    const missingRoot = spawnSync(process.execPath, [CHECKER, '--root'], { encoding: 'utf8' });
    const output = `${missingRoot.stdout}${missingRoot.stderr}`;
    if (missingRoot.status === 0 || !output.includes('missing value for --root')) {
      throw new Error(`missing --root value did not fail fast:\n${output}`);
    }
  } finally {
    fs.rmSync(base, { recursive: true, force: true });
  }

  console.log(`Glossary coverage regression passed: negative ${negativeCases.length}/${negativeCases.length}, positive ${positiveCases.length}/${positiveCases.length}, CLI 1/1`);
}

main();

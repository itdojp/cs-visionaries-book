#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { isDeepStrictEqual } = require('node:util');

const EXPECTED_SOURCES = {
  top: 'templates/index.md',
  chapter07: 'src/chapters/chapter07.md',
  chapter10: 'src/chapters/chapter10.md',
  appendixB: 'src/appendices/appendix-b.md',
  appendixD: 'src/appendices/appendix-d.md'
};
const EXPECTED_GENERATED = {
  top: 'docs/index.md',
  chapter07: 'docs/chapters/chapter07.md',
  chapter10: 'docs/chapters/chapter10.md',
  appendixB: 'docs/appendices/appendix-b.md',
  appendixD: 'docs/appendices/appendix-d.md'
};
const EXPECTED_REQUIRED = {
  top: [
    "用語や略語を確認したい場合は、[付録B: 用語解説]({{ '/appendices/appendix-b/' | relative_url }}) を併用してください。"
  ],
  chapter07: [
    "[PageRank]({{ '/appendices/appendix-b/#glossary-pagerank' | relative_url }})",
    '初期PageRankだけで検索結果を説明することはできない。',
    'PageRankをすべての現代AIの直接的な基盤とみなすことはできない。'
  ],
  chapter10: [
    "[ImageNet]({{ '/appendices/appendix-b/#glossary-imagenet' | relative_url }})",
    "[GPU]({{ '/appendices/appendix-b/#glossary-gpu' | relative_url }})",
    "[Transformerアーキテクチャ]({{ '/appendices/appendix-b/#glossary-transformer' | relative_url }})"
  ],
  appendixB: ['用語・略語の確認は本付録を正とします。'],
  appendixD: [
    "{% assign glossary_gpu_url = '/appendices/appendix-b/#glossary-gpu' | relative_url %}",
    "{% assign glossary_imagenet_url = '/appendices/appendix-b/#glossary-imagenet' | relative_url %}",
    "{% assign glossary_pagerank_url = '/appendices/appendix-b/#glossary-pagerank' | relative_url %}",
    "{% assign glossary_transformer_url = '/appendices/appendix-b/#glossary-transformer' | relative_url %}",
    '[GPU]({{ glossary_gpu_url }})',
    '[ImageNet]({{ glossary_imagenet_url }})',
    '[PageRank]({{ glossary_pagerank_url }})',
    '[Transformer]({{ glossary_transformer_url }})'
  ]
};
const EXPECTED_TERMS = {
  gpu: {
    heading: '### GPU（Graphics Processing Unit） {#glossary-gpu}',
    required: [
      '- **種別**: 多数の演算を並列処理するhardware。algorithmやdatasetではない。',
      'Alex Krizhevsky、Ilya Sutskever、Geoffrey Hintonは、AlexNetの学習で2台のNVIDIA GTX 580 GPUを使った。',
      'GPU自体の発明者ではなく、既存hardwareを深層学習へ活用した側',
      '製品名、性能、memory容量、対応softwareは世代ごとに変わる',
      'https://papers.nips.cc/paper_files/paper/2012/hash/c399862d3b9d6b76c8436e924a68c45b-Abstract.html',
      "- **関連**: [第10章]({{ '/chapters/chapter10/' | relative_url }}) / [付録D]({{ '/appendices/appendix-d/' | relative_url }})"
    ]
  },
  imagenet: {
    heading: '### ImageNet {#glossary-imagenet}',
    required: [
      '- **種別**: WordNetの概念階層に画像を対応づけた大規模image dataset',
      'Alex Krizhevsky、Ilya Sutskever、Geoffrey HintonはImageNetを作ったのではなく',
      'datasetのimage数、class/split、配布状況、competitionの運営状態は版と時点で変わり得る',
      'https://image-net.org/static_files/papers/imagenet_cvpr09.pdf',
      "- **関連**: [第10章]({{ '/chapters/chapter10/' | relative_url }}) / [付録D]({{ '/appendices/appendix-d/' | relative_url }})"
    ]
  },
  pagerank: {
    heading: '### PageRank（ページランク） {#glossary-pagerank}',
    required: [
      '- **種別**: Webを有向link graphとして扱い',
      'Lawrence Page、Sergey Brin、Rajeev Motwani、Terry Winogradが、Stanford InfoLabの技術報告でPageRankを説明した',
      '現代Google検索の全ranking処理と同一ではない',
      '検索serviceが使うranking signal、index規模、実装は時点依存',
      'https://ilpubs.stanford.edu/422/',
      'https://research.google/pubs/the-anatomy-of-a-large-scale-hypertextual-web-search-engine/',
      "- **関連**: [第7章]({{ '/chapters/chapter07/' | relative_url }}) / [付録D]({{ '/appendices/appendix-d/' | relative_url }})"
    ]
  },
  transformer: {
    heading: '### Transformer {#glossary-transformer}',
    required: [
      '- **種別**: self-attentionを中心に系列内の関係を処理するneural network architecture',
      'Ashish VaswaniらGoogleの研究teamが2017年に提示した',
      '第10章のHinton/AlexNetとは別の研究系譜',
      'context長、parameter数、学習data、attention実装など個別modelの仕様は版ごとに変わる',
      'https://papers.nips.cc/paper_files/paper/2017/hash/3f5ee243547dee91fbd053c1c4a845aa-Abstract.html',
      "- **関連**: [第10章]({{ '/chapters/chapter10/' | relative_url }}) / [付録D]({{ '/appendices/appendix-d/' | relative_url }})"
    ]
  }
};
const EXPECTED_FIRST_LINKS = {
  chapter07: [
    { term: 'PageRank', marker: "[PageRank]({{ '/appendices/appendix-b/#glossary-pagerank' | relative_url }})" }
  ],
  chapter10: [
    { term: 'ImageNet', marker: "[ImageNet]({{ '/appendices/appendix-b/#glossary-imagenet' | relative_url }})" },
    { term: 'GPU', marker: "[GPU]({{ '/appendices/appendix-b/#glossary-gpu' | relative_url }})" },
    { term: 'Transformer', marker: "[Transformerアーキテクチャ]({{ '/appendices/appendix-b/#glossary-transformer' | relative_url }})" }
  ],
  appendixD: [
    { term: 'GPU', marker: '[GPU]({{ glossary_gpu_url }})' },
    { term: 'ImageNet', marker: '[ImageNet]({{ glossary_imagenet_url }})' },
    { term: 'PageRank', marker: '[PageRank]({{ glossary_pagerank_url }})' },
    { term: 'Transformer', marker: '[Transformer]({{ glossary_transformer_url }})' }
  ]
};
const EXPECTED_FORBIDDEN = [
  'この夜、「PageRank」アルゴリズムの原型が生まれた',
  '26年前に二人の学生が考案したアルゴリズムが、瞬時に数兆のWebページから最適な答えを見つけ出している',
  'ラリー・ペイジとセルゲイ・ブリンが1996年に開発したPageRank は、現在のAI技術の基盤ともなっている',
  '見つめていた。ImageNet画像認識コンテスト',
  '- **GPU並列計算**：NVIDIA GeForce GTX 580による高速化',
  '### Transformer アーキテクチャの登場',
  '|Compute|学習・推論を成立させる計算資源（GPU、クラウド、分散処理）',
  '|Algorithm|モデルと学習法（深層学習、Transformer、最適化）'
];
const EXPECTED_FORBIDDEN_PATTERNS = [
  { name: 'GPU misclassified as algorithm or dataset', pattern: 'GPU[^\\n。]{0,60}(?:algorithm|アルゴリズム|dataset|データセット)(?:である|だ)(?=。|$)', flags: 'i' },
  { name: 'ImageNet misclassified as model architecture', pattern: 'ImageNet[^\\n。]{0,60}(?:model|モデル|architecture|アーキテクチャ|neural network|ニューラルネットワーク)(?:である|だ)(?=。|$)', flags: 'i' },
  { name: 'Transformer misclassified as dataset or product', pattern: 'Transformer[^\\n。]{0,60}(?:dataset|データセット|製品名?|product)(?:である|だ)(?=。|$)', flags: 'i' },
  { name: 'PageRank conflated with all current Google ranking', pattern: 'PageRank[^\\n。]{0,80}(?:現在|現代)(?:の)?Google検索[^\\n。]{0,50}(?:すべて|全て|全ranking|全体)[^\\n。]{0,30}(?:処理|順位付け)する(?:(?:algorithm|アルゴリズム)(?:である|だ))?(?=。|$)', flags: 'i' }
];

function readJson(file, label, errors) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    errors.push(`invalid ${label}: ${error.message}`);
    return null;
  }
}

function readText(root, relative, errors) {
  try {
    return fs.readFileSync(path.join(root, relative), 'utf8');
  } catch (error) {
    errors.push(`source unavailable: ${relative}: ${error.message}`);
    return '';
  }
}

function stripFenceDelimiters(text) {
  return text.split(/\r?\n/).map(line => /^\s*```/.test(line) ? '' : line).join('\n');
}

function sectionFor(text, heading) {
  const start = text.indexOf(heading);
  if (start < 0) return '';
  const afterHeading = start + heading.length;
  const tail = text.slice(afterHeading);
  const next = tail.search(/\n#{2,3}\s/);
  return next < 0 ? text.slice(start) : text.slice(start, afterHeading + next);
}

function checkMarkers(text, markers, label, errors) {
  if (!Array.isArray(markers) || markers.length === 0 || markers.some(marker => typeof marker !== 'string')) {
    errors.push(`glossary required markers invalid: ${label}`);
    return;
  }
  for (const marker of markers) {
    if (text.split(marker).length - 1 !== 1) {
      errors.push(`glossary marker must occur exactly once: ${label}: ${marker}`);
    }
  }
}

function checkFirstLinks(text, specs, label, errors) {
  const visible = stripFenceDelimiters(text);
  for (const spec of specs || []) {
    const termIndex = visible.indexOf(spec.term);
    const markerIndex = visible.indexOf(spec.marker);
    const markerTermIndex = spec.marker.indexOf(spec.term);
    if (termIndex < 0 || markerIndex < 0 || markerTermIndex < 0 || termIndex !== markerIndex + markerTermIndex) {
      errors.push(`first reader-facing glossary link mismatch: ${label}: ${spec.term}`);
    }
    if (visible.split(spec.marker).length - 1 !== 1) {
      errors.push(`first reader-facing glossary link must occur exactly once: ${label}: ${spec.term}`);
    }
  }
}

function validate(root) {
  const errors = [];
  const contract = readJson(path.join(root, 'quality/glossary-coverage-contract.json'), 'glossary coverage contract', errors);
  if (!contract) return errors;

  if (contract.schemaVersion !== '1.0' || contract.verifiedAt !== '2026-07-21') {
    errors.push('glossary coverage contract version/date mismatch');
  }
  if (!isDeepStrictEqual(contract.sources, EXPECTED_SOURCES)) errors.push('glossary source inventory mismatch');
  if (!isDeepStrictEqual(contract.generated, EXPECTED_GENERATED)) errors.push('glossary generated inventory mismatch');
  if (!isDeepStrictEqual(contract.required, EXPECTED_REQUIRED)) errors.push('glossary required inventory mismatch');
  if (!isDeepStrictEqual(contract.terms, EXPECTED_TERMS)) errors.push('glossary term inventory mismatch');
  if (!isDeepStrictEqual(contract.firstLinks, EXPECTED_FIRST_LINKS)) errors.push('glossary first-link inventory mismatch');
  if (!isDeepStrictEqual(contract.forbidden, EXPECTED_FORBIDDEN)) errors.push('glossary forbidden inventory mismatch');
  if (!isDeepStrictEqual(contract.forbiddenPatterns, EXPECTED_FORBIDDEN_PATTERNS)) {
    errors.push('glossary forbidden pattern inventory mismatch');
  }

  const sourceTexts = {};
  const generatedTexts = {};
  for (const [key, relative] of Object.entries(EXPECTED_SOURCES)) {
    const text = readText(root, relative, errors);
    sourceTexts[key] = text;
    checkMarkers(text, contract.required[key], `source ${key}`, errors);
  }
  for (const [key, relative] of Object.entries(EXPECTED_GENERATED)) {
    const text = readText(root, relative, errors);
    generatedTexts[key] = text;
    checkMarkers(text, contract.required[key], `generated ${key}`, errors);
  }

  for (const [name, spec] of Object.entries(EXPECTED_TERMS)) {
    const sourceSection = sectionFor(sourceTexts.appendixB || '', spec.heading);
    const generatedSection = sectionFor(generatedTexts.appendixB || '', spec.heading);
    if (!sourceSection) errors.push(`glossary term heading missing: source appendixB: ${name}`);
    if (!generatedSection) errors.push(`glossary term heading missing: generated appendixB: ${name}`);
    checkMarkers(sourceSection, spec.required, `source glossary term ${name}`, errors);
    checkMarkers(generatedSection, spec.required, `generated glossary term ${name}`, errors);
  }

  for (const [key, specs] of Object.entries(EXPECTED_FIRST_LINKS)) {
    checkFirstLinks(sourceTexts[key] || '', specs, `source ${key}`, errors);
    checkFirstLinks(generatedTexts[key] || '', specs, `generated ${key}`, errors);
  }

  const allTexts = [...Object.values(sourceTexts), ...Object.values(generatedTexts)];
  for (const forbidden of EXPECTED_FORBIDDEN) {
    if (allTexts.some(text => text.includes(forbidden))) errors.push(`forbidden unlinked glossary claim found: ${forbidden}`);
  }
  for (const entry of EXPECTED_FORBIDDEN_PATTERNS) {
    let expression;
    try {
      expression = new RegExp(entry.pattern, entry.flags);
    } catch (error) {
      errors.push(`invalid glossary forbidden pattern: ${entry.name}: ${error.message}`);
      continue;
    }
    if (allTexts.some(text => expression.test(text))) {
      errors.push(`forbidden glossary classification found: ${entry.name}`);
    }
  }

  return errors;
}

function resolveRoot(argv) {
  const rootArg = argv.indexOf('--root');
  if (rootArg < 0) return path.resolve(__dirname, '..');
  const value = argv[rootArg + 1];
  if (!value || value.startsWith('-')) throw new Error('missing value for --root');
  return path.resolve(value);
}

function main() {
  let root;
  try {
    root = resolveRoot(process.argv.slice(2));
  } catch (error) {
    console.error(error.message);
    process.exit(2);
  }
  const errors = validate(root);
  if (errors.length) {
    errors.forEach(error => console.error(error));
    process.exit(1);
  }
  console.log('Glossary coverage OK: PageRank, ImageNet, GPU, and Transformer');
}

if (require.main === module) main();

module.exports = { resolveRoot, sectionFor, stripFenceDelimiters, validate };

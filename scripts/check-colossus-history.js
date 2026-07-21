#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { isDeepStrictEqual } = require('node:util');

const EXPECTED_SOURCES = {
  chapter02: 'src/chapters/chapter02.md',
  appendixA: 'src/appendices/appendix-a.md',
  appendixB: 'src/appendices/appendix-b.md',
  appendixC: 'src/appendices/appendix-c.md'
};
const EXPECTED_GENERATED = {
  chapter02: 'docs/chapters/chapter02.md',
  appendixA: 'docs/appendices/appendix-a.md',
  appendixB: 'docs/appendices/appendix-b.md',
  appendixC: 'docs/appendices/appendix-c.md'
};
const EXPECTED_REQUIRED = {
  chapter02: [
    '### コロッサスコンピュータとの関わり',
    '1942年まで : Turingery',
    'Tunny通信を読み取り、Lorenz暗号機のchi-wheel設定を推定する統計的検査',
    'switch・plug panel・patch panelで設定できた',
    '限定的programmability',
    'general-purpose computerでも、stored-program computerでもなかった',
    'digital・electronic・programmableという3条件',
    '| Alan Turing | Lorenz暗号に対する統計的手法「Turingery」を考案し、Max Newmanとの議論を通じて機械化の背景に寄与した。Colossusの設計・製作には直接関与していない。 |',
    '| Max Newman / Newmanry | 統計的検査を機械化する問題を整理し、機械を運用する部門Newmanryを率いた。 |',
    '| Tommy Flowers / General Post Office（GPO）team | Newmanryが示した問題と検査を電子回路で処理するColossusを設計・製作した。 |',
    'Turing machineは、algorithmによる計算可能性を分析するための**抽象的な数学model**',
    'Colossusを「Turing machineの直接実装」と位置づけることはできない',
    '[TNMOCのColossus解説](https://www.tnmoc.org/colossus)',
    '[Colossus再建記録](https://www.tnmoc.org/rebuilding-colossus)',
    '[Bletchley ParkのAlan Turing資料](https://bletchleypark.org.uk/wp-content/uploads/record_attachments/1800.pdf)',
    '[Max Newman資料](https://bletchleypark.org.uk/wp-content/uploads/record_attachments/1861.pdf)'
  ],
  appendixA: [
    '**1942〜1944年**',
    'チューリング、Lorenz暗号に対する統計的手法「Turingery」を考案',
    'GC&CS）がMax Newmanの指揮下にNewmanryを正式設置し、統計的検査の機械化を推進',
    'Tommy Flowers率いるGPO teamが設計・製作したTunny暗号解析用の目的特化machine',
    'general-purpose / stored-program computerではなく、チューリングは設計・製作に直接関与していない'
  ],
  appendixB: [
    '**Colossus（コロッサス）**',
    'switch・plug panel・patch panelで検査を設定できる限定的programmability',
    'Colossusなど特定hardwareのarchitectureや設計図を指すものではない'
  ],
  appendixC: [
    '### 2026-07-21 Colossus / Turing audit anchors',
    'https://www.tnmoc.org/colossus',
    'https://www.tnmoc.org/rebuilding-colossus',
    'https://bletchleypark.org.uk/wp-content/uploads/record_attachments/1800.pdf',
    'https://bletchleypark.org.uk/wp-content/uploads/record_attachments/1861.pdf',
    '- Turing, A. M. (1936/1937). "On Computable Numbers, with an Application to the Entscheidungsproblem". https://academic.oup.com/plms/article-pdf/s2-42/1/230/4317544/s2-42-1-230.pdf'
  ]
};
const EXPECTED_FORBIDDEN = [
  '1943年、ドイツ軍はエニグマよりもさらに複雑な暗号システム「ローレンツ暗号」を導入した',
  'コロッサスは、世界初のプログラム可能な電子計算機だった',
  '**処理速度**：1秒間に25,000文字',
  '**プログラム可能**：配線の変更で異なる処理が可能',
  'その理論的基盤となる考え方—プログラム可能な機械という概念—を提供していた',
  'コロッサスは、チューリングマシンの理論を実際の機械として実現した最初の例の一つだった',
  'チューリングも開発に関与'
];
const EXPECTED_FORBIDDEN_PATTERNS = [
  {
    name: 'unqualified Colossus world-first programmable claim',
    pattern: '(?:Colossus|コロッサス)[^\\n。]{0,80}(?:(?:世界(?:で)?初|世界最初|最初|first)(?:の)?)[^\\n。]{0,80}(?:programmable|プログラマブル|プログラム可能)[^\\n。]{0,40}(?:な|の)?(?:electronic|電子)?(?:computer|計算機|machine)',
    flags: 'i'
  },
  {
    name: 'Colossus as a direct Turing-machine realization',
    pattern: '(?:Colossus|コロッサス)[^\\n。]{0,160}(?:Turing machine|チューリングマシン)[^\\n。]{0,100}(?:理論を実際の機械として実現した|直接実装(?:である|した)|実装例(?:である|となった))',
    flags: 'i'
  },
  {
    name: 'Turing as a direct Colossus developer',
    pattern: '(?:Turing|チューリング)[^\\n。]{0,80}(?:Colossus|コロッサス)[^\\n。]{0,80}(?:(?:の)?(?:開発者|設計者)(?:だった|である|だ)|(?:直接開発した|開発を主導した)(?!わけではない|のではない|ものではない|とはいえない|とは言えない))',
    flags: 'i'
  }
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

function validate(root) {
  const errors = [];
  const contract = readJson(path.join(root, 'quality/colossus-history-contract.json'), 'Colossus history contract', errors);
  if (!contract) return errors;

  if (contract.schemaVersion !== '1.0' || contract.verifiedAt !== '2026-07-21') {
    errors.push('Colossus history contract version/date mismatch');
  }
  if (!isDeepStrictEqual(contract.sources, EXPECTED_SOURCES)) errors.push('Colossus source inventory mismatch');
  if (!isDeepStrictEqual(contract.generated, EXPECTED_GENERATED)) errors.push('Colossus generated inventory mismatch');
  if (!isDeepStrictEqual(contract.required, EXPECTED_REQUIRED)) errors.push('Colossus required inventory mismatch');
  if (!isDeepStrictEqual(contract.forbidden, EXPECTED_FORBIDDEN)) errors.push('Colossus forbidden inventory mismatch');
  if (!isDeepStrictEqual(contract.forbiddenPatterns, EXPECTED_FORBIDDEN_PATTERNS)) {
    errors.push('Colossus forbidden pattern inventory mismatch');
  }
  if (!contract.required || typeof contract.required !== 'object' || Array.isArray(contract.required)) {
    errors.push('Colossus required markers must be an object');
    return errors;
  }

  const allTexts = [];
  for (const [key, relative] of Object.entries(EXPECTED_SOURCES)) {
    const content = readText(root, relative, errors);
    allTexts.push(content);
    const markers = contract.required[key];
    if (!Array.isArray(markers) || markers.length === 0 || markers.some(marker => typeof marker !== 'string')) {
      errors.push(`Colossus required markers invalid: ${key}`);
      continue;
    }
    for (const marker of markers) {
      if (content.split(marker).length - 1 !== 1) {
        errors.push(`Colossus marker must occur exactly once: ${key}: ${marker}`);
      }
    }
  }

  for (const [key, relative] of Object.entries(EXPECTED_GENERATED)) {
    const content = readText(root, relative, errors);
    allTexts.push(content);
    for (const marker of contract.required[key] || []) {
      if (content.split(marker).length - 1 !== 1) {
        errors.push(`generated Colossus marker must occur exactly once: ${key}: ${marker}`);
      }
    }
  }

  for (const forbidden of EXPECTED_FORBIDDEN) {
    if (allTexts.some(content => content.includes(forbidden))) {
      errors.push(`forbidden Colossus claim found: ${forbidden}`);
    }
  }
  for (const entry of EXPECTED_FORBIDDEN_PATTERNS) {
    let expression;
    try {
      expression = new RegExp(entry.pattern, entry.flags);
    } catch (error) {
      errors.push(`invalid forbidden Colossus pattern: ${entry.name}: ${error.message}`);
      continue;
    }
    if (allTexts.some(content => expression.test(content))) {
      errors.push(`forbidden Colossus pattern found: ${entry.name}`);
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
  console.log('Colossus history OK: limited programmability, roles, and Turing-machine distinction');
}

if (require.main === module) main();

module.exports = { resolveRoot, validate };

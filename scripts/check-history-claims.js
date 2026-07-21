#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { isDeepStrictEqual } = require('node:util');

const EXPECTED_SOURCES = {
  chapter04: 'src/chapters/chapter04.md',
  introduction: 'src/introduction/index.md',
  appendixA: 'src/appendices/appendix-a.md',
  appendixB: 'src/appendices/appendix-b.md',
  appendixC: 'src/appendices/appendix-c.md',
  timeline: 'src/comprehensive-timeline.md'
};
const EXPECTED_GENERATED = {
  chapter04: 'docs/chapters/chapter04.md',
  introduction: 'docs/introduction/index.md',
  appendixA: 'docs/appendices/appendix-a.md',
  appendixB: 'docs/appendices/appendix-b.md',
  appendixC: 'docs/appendices/appendix-c.md'
};
const EXPECTED_REQUIRED = {
  chapter04: [
    '### 「日本初」を方式と用途で分類する',
    '| ETL Mark I | relay式、完全非同期 | 1952年に試作 |',
    '| ETL Mark II | relay式、完全非同期 | 1955年11月完成 |',
    '| FUJIC | 真空管式、2進3-address | 1956年3月完成・稼働 |',
    '| ETL Mark III | transistor式、stored-program | 1956年7月稼働 |',
    '## 4.2 Intel 4004の共同開発を担った技術者',
    '### 契約と販売権を技術的貢献から分ける',
    '60,000 USDを返還する代わりに',
    'calculator以外の用途へ販売する権利',
    '単一の「性能比」では比較しない',
    '比較では、先に目的と測定条件を固定する',
    'CPUの演算・制御機能をsingle chipへ集積したgeneral-purpose processor',
    '[IPSJ Computer Museum: FUJIC](https://museum.ipsj.or.jp/computer/dawn/0010.html)',
    '[IPSJ Computer Museum: Hiroshi Wada](https://museum.ipsj.or.jp/pioneer/h-wada.html)',
    '[Intel, “The Intel 4004”](https://www.intel.com/content/www/us/en/history/virtual-vault/articles/the-intel-4004.html)',
    '[Intel 4004 50周年資料](https://download.intel.com/newsroom/2021/data-center/4004-infographic.pdf)'
  ],
  introduction: [
    '嶋正利：Busicom側技術者としてIntel 4004を共同開発。高橋秀俊：ETLのtransistor計算機研究を率いた先駆者。'
  ],
  appendixA: [
    'relay式試作機**ETL Mark I**',
    'relay式実用大型機**ETL Mark II**',
    '真空管式**FUJIC**を完成',
    'transistor式**ETL Mark III**を稼働',
    'calculator以外の販売権を再取得'
  ],
  appendixB: [
    'single-chip、general-purpose、commercial releaseなどの分類条件'
  ],
  appendixC: [
    '### 2026-07-21 Japanese computer / Intel 4004 audit anchors',
    'https://museum.ipsj.or.jp/computer/dawn/0005.html',
    'https://museum.ipsj.or.jp/computer/dawn/0009.html',
    'https://museum.ipsj.or.jp/computer/dawn/0010.html',
    'https://museum.ipsj.or.jp/computer/dawn/0011.html',
    'https://museum.ipsj.or.jp/pioneer/h-wada.html',
    'https://www.intel.com/content/www/us/en/history/virtual-vault/articles/the-intel-4004.html',
    'https://download.intel.com/newsroom/2021/data-center/4004-infographic.pdf'
  ],
  timeline: [
    '## ETL・FUJIC・Intel 4004の分類済み節目',
    '| 1956年3月 | FUJIC |',
    '| 1971年5月 | IntelがBusicomとの契約を変更 |'
  ]
};
const EXPECTED_FORBIDDEN = [
  '1954 : FUJIC完成',
  'ETL Mark I (1952) → ETL Mark II (1954) → ETL Mark III (1957)',
  'FUJIC (1954) → 各社独自路線',
  '1954年、富士写真フイルム（現在の富士フイルム）が「FUJIC',
  'ETL Mark I」だった。これは、真空管を使用した',
  '高橋秀俊、ETL Mark I設計開始（日本初の電子計算機研究）',
  '手のひらサイズのチップが、従来の大型コンピュータと同等の処理能力',
  '- **特許**：共同所有',
  '嶋正利・高橋秀俊：マイクロプロセッサの共同開発者',
  'マイクロプロセッサを共同発明した男',
  '世界初のマイクロプロセッサ',
  'この概念を世界で初めて実現した',
  '| 項目 | Intel 4004 (1971) | Apple M3 (2023) | 進化率 |',
  '| 性能/ワット | 基準 | 100万倍以上 | - |'
];
const EXPECTED_FORBIDDEN_PATTERNS = [
  {
    name: 'unqualified Intel 4004 world-first claim',
    pattern: '(?:Intel\\s*4004[^\\n。]{0,100}(?:世界(?:で)?初|世界最初)|(?:世界(?:で)?初|世界最初)[^\\n。]{0,100}Intel\\s*4004|この概念を世界で初めて実現した)',
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

function equalJson(left, right) {
  return isDeepStrictEqual(left, right);
}

function validate(root) {
  const errors = [];
  const contract = readJson(path.join(root, 'quality/history-claims-contract.json'), 'history contract', errors);
  if (!contract) return errors;

  if (contract.schemaVersion !== '1.1' || contract.verifiedAt !== '2026-07-21') {
    errors.push('history contract version/date mismatch');
  }
  if (!equalJson(contract.sources, EXPECTED_SOURCES)) errors.push('history source inventory mismatch');
  if (!equalJson(contract.generated, EXPECTED_GENERATED)) errors.push('history generated inventory mismatch');
  if (!equalJson(contract.required, EXPECTED_REQUIRED)) errors.push('history required inventory mismatch');
  if (!equalJson(contract.forbidden, EXPECTED_FORBIDDEN)) errors.push('history forbidden inventory mismatch');
  if (!equalJson(contract.forbiddenPatterns, EXPECTED_FORBIDDEN_PATTERNS)) {
    errors.push('history forbidden pattern inventory mismatch');
  }
  if (!contract.required || typeof contract.required !== 'object' || Array.isArray(contract.required)) {
    errors.push('history required markers must be an object');
    return errors;
  }

  const sourceTexts = {};
  for (const [key, relative] of Object.entries(EXPECTED_SOURCES)) {
    const text = readText(root, relative, errors);
    sourceTexts[key] = text;
    const markers = contract.required[key];
    if (!Array.isArray(markers) || markers.length === 0 || markers.some(marker => typeof marker !== 'string')) {
      errors.push(`history required markers invalid: ${key}`);
      continue;
    }
    for (const marker of markers) {
      if (text.split(marker).length - 1 !== 1) errors.push(`history marker must occur exactly once: ${key}: ${marker}`);
    }
  }

  for (const [key, relative] of Object.entries(EXPECTED_GENERATED)) {
    const text = readText(root, relative, errors);
    for (const marker of contract.required[key] || []) {
      if (text.split(marker).length - 1 !== 1) errors.push(`generated history marker must occur exactly once: ${key}: ${marker}`);
    }
  }

  const allTexts = [...Object.values(sourceTexts)];
  for (const relative of Object.values(EXPECTED_GENERATED)) allTexts.push(readText(root, relative, errors));
  for (const forbidden of EXPECTED_FORBIDDEN) {
    if (allTexts.some(text => text.includes(forbidden))) errors.push(`forbidden historical claim found: ${forbidden}`);
  }
  for (const entry of EXPECTED_FORBIDDEN_PATTERNS) {
    let expression;
    try {
      expression = new RegExp(entry.pattern, entry.flags);
    } catch (error) {
      errors.push(`invalid forbidden historical pattern: ${entry.name}: ${error.message}`);
      continue;
    }
    if (allTexts.some(text => expression.test(text))) {
      errors.push(`forbidden historical pattern found: ${entry.name}`);
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
  console.log('History claims OK: ETL Mark I/II/III, FUJIC, and Intel 4004 contract history');
}

if (require.main === module) main();

module.exports = { resolveRoot, validate };

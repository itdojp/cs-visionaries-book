#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const CHECKER = path.join(ROOT, 'scripts/check-history-claims.js');
const TASK_TMP_ROOT = path.join(ROOT, '.codex-local', 'tmp');
const FILES = [
  'quality/history-claims-contract.json',
  'src/chapters/chapter04.md',
  'src/introduction/index.md',
  'src/appendices/appendix-a.md',
  'src/appendices/appendix-b.md',
  'src/appendices/appendix-c.md',
  'docs/chapters/chapter04.md',
  'docs/introduction/index.md',
  'docs/appendices/appendix-a.md',
  'docs/appendices/appendix-b.md',
  'docs/appendices/appendix-c.md'
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

function runCase(base, name, mutate, expected) {
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
  if (result.status !== 0) {
    throw new Error(`positive case failed: ${name}:\n${result.stdout}${result.stderr}`);
  }
}

function main() {
  fs.mkdirSync(TASK_TMP_ROOT, { recursive: true });
  const base = fs.mkdtempSync(path.join(TASK_TMP_ROOT, 'history-claims-'));
  const cases = [
    ['missing-source-marker', dir => replaceOnce(path.join(dir, 'src/chapters/chapter04.md'), '### 「日本初」を方式と用途で分類する', '### 初期機種'), 'history marker must occur exactly once'],
    ['forbidden-old-claim', dir => fs.appendFileSync(path.join(dir, 'src/chapters/chapter04.md'), '\n- **特許**：共同所有\n'), 'forbidden historical claim found'],
    ['unqualified-first', dir => fs.appendFileSync(path.join(dir, 'src/chapters/chapter04.md'), '\n世界初のマイクロプロセッサ\n'), 'forbidden historical claim found'],
    ['unqualified-first-variant', dir => fs.appendFileSync(path.join(dir, 'src/chapters/chapter04.md'), '\nIntel 4004はCPU機能を世界で初めて実現した。\n'), 'forbidden historical pattern found'],
    ['scalar-performance-table', dir => fs.appendFileSync(path.join(dir, 'src/chapters/chapter04.md'), '\n| 性能/ワット | 基準 | 100万倍以上 | - |\n'), 'forbidden historical claim found'],
    ['inventorship-heading', dir => fs.appendFileSync(path.join(dir, 'src/chapters/chapter04.md'), '\n## 4.2 マイクロプロセッサを共同発明した男\n'), 'forbidden historical claim found'],
    ['prewar-etl-claim', dir => fs.appendFileSync(path.join(dir, 'src/appendices/appendix-a.md'), '\n高橋秀俊、ETL Mark I設計開始（日本初の電子計算機研究）\n'), 'forbidden historical claim found'],
    ['generated-drift', dir => replaceOnce(path.join(dir, 'docs/appendices/appendix-b.md'), 'single-chip、general-purpose、commercial releaseなどの分類条件', '世界初'), 'generated history marker must occur exactly once'],
    ['weakened-required', dir => {
      const file = path.join(dir, 'quality/history-claims-contract.json');
      const data = JSON.parse(fs.readFileSync(file, 'utf8'));
      data.required.chapter04.pop();
      fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
    }, 'history required inventory mismatch'],
    ['weakened-contract', dir => {
      const file = path.join(dir, 'quality/history-claims-contract.json');
      const data = JSON.parse(fs.readFileSync(file, 'utf8'));
      data.forbidden.pop();
      fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
    }, 'history forbidden inventory mismatch'],
    ['weakened-pattern-contract', dir => {
      const file = path.join(dir, 'quality/history-claims-contract.json');
      const data = JSON.parse(fs.readFileSync(file, 'utf8'));
      data.forbiddenPatterns.pop();
      fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
    }, 'history forbidden pattern inventory mismatch']
  ];
  const positiveCases = [
    ['reordered-contract-keys', dir => {
      const file = path.join(dir, 'quality/history-claims-contract.json');
      const data = JSON.parse(fs.readFileSync(file, 'utf8'));
      data.sources = Object.fromEntries(Object.entries(data.sources).reverse());
      fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
    }]
  ];
  try {
    for (const [name, mutate, expected] of cases) runCase(base, name, mutate, expected);
    for (const [name, mutate] of positiveCases) runPositiveCase(base, name, mutate);

    const missingRoot = spawnSync(process.execPath, [CHECKER, '--root'], { encoding: 'utf8' });
    if (missingRoot.status === 0 || !`${missingRoot.stdout}${missingRoot.stderr}`.includes('missing value for --root')) {
      throw new Error(`missing --root value did not fail fast:\n${missingRoot.stdout}${missingRoot.stderr}`);
    }
  } finally {
    fs.rmSync(base, { recursive: true, force: true });
  }
  console.log(`History claims regression passed: negative ${cases.length}/${cases.length}, positive ${positiveCases.length}/${positiveCases.length}, CLI 1/1`);
}

main();

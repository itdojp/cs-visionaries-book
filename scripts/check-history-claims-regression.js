#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const CHECKER = path.join(ROOT, 'scripts/check-history-claims.js');
const TASK_TMP = path.join(ROOT, '.codex-local', 'tmp', 'history-claims-regression');
const FILES = [
  'quality/history-claims-contract.json',
  'src/chapters/chapter04.md',
  'src/introduction/index.md',
  'src/appendices/appendix-a.md',
  'src/appendices/appendix-b.md',
  'src/appendices/appendix-c.md',
  'src/comprehensive-timeline.md',
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

function main() {
  fs.mkdirSync(TASK_TMP, { recursive: true });
  const base = fs.mkdtempSync(path.join(TASK_TMP, 'run-'));
  const cases = [
    ['missing-source-marker', dir => replaceOnce(path.join(dir, 'src/chapters/chapter04.md'), '### 「日本初」を方式と用途で分類する', '### 初期機種'), 'history marker must occur exactly once'],
    ['forbidden-old-claim', dir => fs.appendFileSync(path.join(dir, 'src/chapters/chapter04.md'), '\n- **特許**：共同所有\n'), 'forbidden historical claim found'],
    ['unqualified-first', dir => fs.appendFileSync(path.join(dir, 'src/chapters/chapter04.md'), '\n世界初のマイクロプロセッサ\n'), 'forbidden historical claim found'],
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
    }, 'history forbidden inventory mismatch']
  ];
  try {
    for (const [name, mutate, expected] of cases) runCase(base, name, mutate, expected);
  } finally {
    fs.rmSync(base, { recursive: true, force: true });
    try {
      fs.rmdirSync(TASK_TMP);
      fs.rmdirSync(path.dirname(TASK_TMP));
    } catch {
      // Preserve shared task-local directories when another process is using them.
    }
  }
  console.log(`History claims regression passed: ${cases.length}/${cases.length}`);
}

main();

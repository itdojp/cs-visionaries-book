#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const CHECKER = path.join(ROOT, 'scripts/check-colossus-history.js');
const TASK_TMP_ROOT = path.join(ROOT, '.codex-local', 'tmp');
const FILES = [
  'quality/colossus-history-contract.json',
  'src/chapters/chapter02.md',
  'src/appendices/appendix-a.md',
  'src/appendices/appendix-b.md',
  'src/appendices/appendix-c.md',
  'docs/chapters/chapter02.md',
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
  if (result.status !== 0) {
    throw new Error(`positive case failed: ${name}:\n${result.stdout}${result.stderr}`);
  }
}

function main() {
  fs.mkdirSync(TASK_TMP_ROOT, { recursive: true });
  const base = fs.mkdtempSync(path.join(TASK_TMP_ROOT, 'colossus-history-'));
  const negativeCases = [
    ['missing-source-marker', dir => replaceOnce(path.join(dir, 'src/chapters/chapter02.md'), '限定的programmability', '設定可能性'), 'Colossus marker must occur exactly once'],
    ['forbidden-old-claim', dir => fs.appendFileSync(path.join(dir, 'src/chapters/chapter02.md'), '\nコロッサスは、世界初のプログラム可能な電子計算機だった。\n'), 'forbidden Colossus claim found'],
    ['unqualified-first-variant', dir => fs.appendFileSync(path.join(dir, 'src/chapters/chapter02.md'), '\nColossusは世界初のprogrammable electronic computerである。\n'), 'forbidden Colossus pattern found'],
    ['first-electronic-digital-order', dir => fs.appendFileSync(path.join(dir, 'src/chapters/chapter02.md'), '\nColossusは最初のelectronic digital programmable computerだった。\n'), 'forbidden Colossus pattern found'],
    ['programmable-japanese-variant', dir => fs.appendFileSync(path.join(dir, 'src/chapters/chapter02.md'), '\nコロッサスは最初のプログラマブル電子計算機だった。\n'), 'forbidden Colossus pattern found'],
    ['world-first-english-variant', dir => fs.appendFileSync(path.join(dir, 'src/chapters/chapter02.md'), '\nColossus was the first programmable electronic digital computer.\n'), 'forbidden Colossus pattern found'],
    ['direct-realization-variant', dir => fs.appendFileSync(path.join(dir, 'src/chapters/chapter02.md'), '\nColossusはTuring machineの直接実装である。\n'), 'forbidden Colossus pattern found'],
    ['direct-developer-variant', dir => fs.appendFileSync(path.join(dir, 'src/chapters/chapter02.md'), '\nTuringはColossusの開発者だった。\n'), 'forbidden Colossus pattern found'],
    ['reverse-developer-english', dir => fs.appendFileSync(path.join(dir, 'src/chapters/chapter02.md'), '\nColossus was directly developed by Turing.\n'), 'forbidden Colossus pattern found'],
    ['reverse-developer-japanese', dir => fs.appendFileSync(path.join(dir, 'src/chapters/chapter02.md'), '\nコロッサスの直接開発者はチューリングだった。\n'), 'forbidden Colossus pattern found'],
    ['reverse-realization', dir => fs.appendFileSync(path.join(dir, 'src/chapters/chapter02.md'), '\nTuring machineをColossusとして直接実装した。\n'), 'forbidden Colossus pattern found'],
    ['english-realization-turing-first', dir => fs.appendFileSync(path.join(dir, 'src/chapters/chapter02.md'), '\nTuring machine was directly implemented as Colossus.\n'), 'forbidden Colossus pattern found'],
    ['english-realization-colossus-first', dir => fs.appendFileSync(path.join(dir, 'src/chapters/chapter02.md'), '\nColossus directly implemented the Turing machine.\n'), 'forbidden Colossus pattern found'],
    ['english-realized-as', dir => fs.appendFileSync(path.join(dir, 'src/chapters/chapter02.md'), '\nThe Turing machine was realized as Colossus.\n'), 'forbidden Colossus pattern found'],
    ['english-direct-implementation', dir => fs.appendFileSync(path.join(dir, 'src/chapters/chapter02.md'), '\nColossus was a direct implementation of the Turing machine.\n'), 'forbidden Colossus pattern found'],
    ['generated-drift', dir => replaceOnce(path.join(dir, 'docs/appendices/appendix-b.md'), '**Colossus（コロッサス）**', '**Colossus**'), 'generated Colossus marker must occur exactly once'],
    ['weakened-required', dir => {
      const file = path.join(dir, 'quality/colossus-history-contract.json');
      const data = JSON.parse(fs.readFileSync(file, 'utf8'));
      data.required.chapter02.pop();
      fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
    }, 'Colossus required inventory mismatch'],
    ['weakened-forbidden', dir => {
      const file = path.join(dir, 'quality/colossus-history-contract.json');
      const data = JSON.parse(fs.readFileSync(file, 'utf8'));
      data.forbidden.pop();
      fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
    }, 'Colossus forbidden inventory mismatch'],
    ['weakened-patterns', dir => {
      const file = path.join(dir, 'quality/colossus-history-contract.json');
      const data = JSON.parse(fs.readFileSync(file, 'utf8'));
      data.forbiddenPatterns.pop();
      fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
    }, 'Colossus forbidden pattern inventory mismatch'],
    ['weakened-generated', dir => {
      const file = path.join(dir, 'quality/colossus-history-contract.json');
      const data = JSON.parse(fs.readFileSync(file, 'utf8'));
      delete data.generated.appendixC;
      fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
    }, 'Colossus generated inventory mismatch']
  ];
  const positiveCases = [
    ['reordered-contract-keys', dir => {
      const file = path.join(dir, 'quality/colossus-history-contract.json');
      const data = JSON.parse(fs.readFileSync(file, 'utf8'));
      data.sources = Object.fromEntries(Object.entries(data.sources).reverse());
      data.generated = Object.fromEntries(Object.entries(data.generated).reverse());
      fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
    }],
    ['negated-developer-claim', dir => {
      fs.appendFileSync(path.join(dir, 'src/chapters/chapter02.md'), '\nTuringはColossusを直接開発したわけではない。\n');
    }],
    ['negated-world-first-claims', dir => {
      fs.appendFileSync(path.join(dir, 'src/chapters/chapter02.md'), '\nコロッサスは最初のプログラマブル電子計算機ではない。\n');
      fs.appendFileSync(path.join(dir, 'src/chapters/chapter02.md'), '\nColossus was not the first programmable electronic computer.\n');
    }],
    ['negated-reverse-role-claims', dir => {
      fs.appendFileSync(path.join(dir, 'src/chapters/chapter02.md'), '\nColossus was not directly developed by Turing.\n');
      fs.appendFileSync(path.join(dir, 'src/chapters/chapter02.md'), '\nコロッサスの直接開発者はチューリングではない。\n');
      fs.appendFileSync(path.join(dir, 'src/chapters/chapter02.md'), '\nTuring machineをColossusとして直接実装したわけではない。\n');
    }],
    ['negated-english-realization-claims', dir => {
      fs.appendFileSync(path.join(dir, 'src/chapters/chapter02.md'), '\nTuring machine was not directly implemented as Colossus.\n');
      fs.appendFileSync(path.join(dir, 'src/chapters/chapter02.md'), '\nColossus did not directly implement the Turing machine.\n');
      fs.appendFileSync(path.join(dir, 'src/chapters/chapter02.md'), '\nColossus was not a direct implementation of the Turing machine.\n');
    }]
  ];

  try {
    for (const [name, mutate, expected] of negativeCases) runNegativeCase(base, name, mutate, expected);
    for (const [name, mutate] of positiveCases) runPositiveCase(base, name, mutate);

    const missingRoot = spawnSync(process.execPath, [CHECKER, '--root'], { encoding: 'utf8' });
    const missingRootOutput = `${missingRoot.stdout}${missingRoot.stderr}`;
    if (missingRoot.status === 0 || !missingRootOutput.includes('missing value for --root')) {
      throw new Error(`missing --root value did not fail fast:\n${missingRootOutput}`);
    }
  } finally {
    fs.rmSync(base, { recursive: true, force: true });
  }

  console.log(`Colossus history regression passed: negative ${negativeCases.length}/${negativeCases.length}, positive ${positiveCases.length}/${positiveCases.length}, CLI 1/1`);
}

main();

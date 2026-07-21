#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { checkStaticDiagrams } = require('./check-static-diagrams');

const ROOT = path.resolve(__dirname, '..');
const TEMP_ROOT = path.join(ROOT, '.codex-local', 'tmp', 'static-diagram-regression');

function copyFixture(destination) {
  fs.mkdirSync(destination, { recursive: true });
  for (const value of ['package.json', 'package-lock.json', '.puppeteerrc.cjs', 'diagrams', 'assets/images/diagrams', 'src/chapters/chapter10.md', 'src/appendices/appendix-d.md', 'docs/chapters/chapter10.md', 'docs/appendices/appendix-d.md', 'docs/assets/images/diagrams', 'scripts/build-simple.js', 'scripts/render-mermaid-diagrams.js', '.github/workflows/book-qa.yml', '.github/workflows/build.yml']) {
    const source = path.join(ROOT, value);
    const target = path.join(destination, value);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.cpSync(source, target, { recursive: true });
  }
}

function replaceOnce(file, before, after) {
  const content = fs.readFileSync(file, 'utf8');
  if (!content.includes(before)) throw new Error(`regression fixture marker missing: ${before}`);
  fs.writeFileSync(file, content.replace(before, after), 'utf8');
}

function replaceTagText(file, tag, value) {
  const content = fs.readFileSync(file, 'utf8');
  const pattern = new RegExp(`(<${tag}\\b[^>]*>)[\\s\\S]*?(<\\/${tag}>)`);
  if (!pattern.test(content)) throw new Error(`regression fixture tag missing: ${tag}`);
  fs.writeFileSync(file, content.replace(pattern, `$1${value}$2`), 'utf8');
}

const tests = [
  ['raw-mermaid-source', dir => fs.appendFileSync(path.join(dir, 'src/chapters/chapter10.md'), '\n```mermaid\ngraph LR\n```\n')],
  ['raw-mermaid-docs', dir => fs.appendFileSync(path.join(dir, 'docs/appendices/appendix-d.md'), '\n```mermaid\ngraph LR\n```\n')],
  ['missing-source-svg', dir => fs.unlinkSync(path.join(dir, 'assets/images/diagrams/neural-network-layer-flow.svg'))],
  ['missing-docs-svg', dir => fs.unlinkSync(path.join(dir, 'docs/assets/images/diagrams/neural-network-layer-flow.svg'))],
  ['missing-title', dir => replaceOnce(path.join(dir, 'assets/images/diagrams/hinton-ai-history-timeline.svg'), '<title', '<metadata')],
  ['missing-description', dir => replaceOnce(path.join(dir, 'assets/images/diagrams/hinton-ai-history-timeline.svg'), '<desc', '<metadata')],
  ['missing-aria', dir => replaceOnce(path.join(dir, 'assets/images/diagrams/hinton-ai-history-timeline.svg'), 'aria-labelledby=', 'data-labelled-by=')],
  ['wrong-referenced-title', dir => {
    replaceTagText(path.join(dir, 'assets/images/diagrams/hinton-ai-history-timeline.svg'), 'title', '誤ったタイトル');
    replaceTagText(path.join(dir, 'docs/assets/images/diagrams/hinton-ai-history-timeline.svg'), 'title', '誤ったタイトル');
  }],
  ['wrong-referenced-description', dir => {
    replaceTagText(path.join(dir, 'assets/images/diagrams/hinton-ai-history-timeline.svg'), 'desc', '誤った説明');
    replaceTagText(path.join(dir, 'docs/assets/images/diagrams/hinton-ai-history-timeline.svg'), 'desc', '誤った説明');
  }],
  ['active-script', dir => replaceOnce(path.join(dir, 'assets/images/diagrams/hinton-ai-history-timeline.svg'), '</svg>', '<script>alert(1)</script></svg>')],
  ['external-reference', dir => replaceOnce(path.join(dir, 'assets/images/diagrams/hinton-ai-history-timeline.svg'), '</svg>', '<image href="https://example.invalid/x.png"/></svg>')],
  ['relative-external-reference', dir => replaceOnce(path.join(dir, 'assets/images/diagrams/hinton-ai-history-timeline.svg'), '</svg>', '<image href="untracked.png"/></svg>')],
  ['foreign-object', dir => replaceOnce(path.join(dir, 'assets/images/diagrams/hinton-ai-history-timeline.svg'), '</svg>', '<foreignObject/></svg>')],
  ['source-docs-drift', dir => fs.appendFileSync(path.join(dir, 'docs/assets/images/diagrams/hinton-ai-history-timeline.svg'), '\n<!-- drift -->\n')],
  ['missing-source-link', dir => replaceOnce(path.join(dir, 'src/chapters/chapter10.md'), '/assets/images/diagrams/neural-network-layer-flow.svg', '/assets/images/diagrams/missing.svg')],
  ['missing-docs-alternative', dir => replaceOnce(path.join(dir, 'docs/appendices/appendix-d.md'), '### 図の代替説明：5要素が社会実装へ収束する流れ', '### 代替説明を削除')],
  ['unexpected-definition', dir => fs.writeFileSync(path.join(dir, 'diagrams/mermaid/unexpected.mmd'), 'flowchart LR\nA-->B\n')],
  ['unexpected-source-svg', dir => fs.writeFileSync(path.join(dir, 'assets/images/diagrams/unexpected.svg'), '<svg/>')],
  ['unexpected-docs-svg', dir => fs.writeFileSync(path.join(dir, 'docs/assets/images/diagrams/unexpected.svg'), '<svg/>')],
  ['mutable-package-pin', dir => replaceOnce(path.join(dir, 'package.json'), '"@mermaid-js/mermaid-cli": "11.16.0"', '"@mermaid-js/mermaid-cli": "^11.16.0"')],
  ['mutable-puppeteer-pin', dir => replaceOnce(path.join(dir, 'package.json'), '"puppeteer": "24.43.1"', '"puppeteer": "^24.43.1"')],
  ['unsafe-config', dir => replaceOnce(path.join(dir, 'diagrams/mermaid-config.json'), '"securityLevel": "strict"', '"securityLevel": "loose"')],
  ['disabled-sandbox', dir => replaceOnce(path.join(dir, 'diagrams/puppeteer-config.json'), '"--no-first-run"', '"--no-sandbox"')],
  ['extra-browser-argument', dir => replaceOnce(path.join(dir, 'diagrams/puppeteer-config.json'), '"--no-first-run"', '"--no-first-run",\n    "--disable-web-security"')],
  ['missing-build-wiring', dir => replaceOnce(path.join(dir, 'scripts/build-simple.js'), 'renderStaticDiagrams();', '// removed')],
  ['missing-book-qa-wiring', dir => replaceOnce(path.join(dir, '.github/workflows/book-qa.yml'), 'npm run check:static-diagrams && ', '')],
  ['missing-book-qa-untracked-gate', dir => replaceOnce(path.join(dir, '.github/workflows/book-qa.yml'), 'git status --porcelain --untracked-files=all -- assets/images/diagrams docs', 'git status --porcelain -- docs')],
  ['missing-build-preflight', dir => replaceOnce(path.join(dir, '.github/workflows/build.yml'), 'npm run check:static-diagrams && npm run check:static-diagrams-regression', 'echo diagram-checks-removed')],
  ['weakened-sync-gate', dir => replaceOnce(path.join(dir, '.github/workflows/book-qa.yml'), 'git diff --exit-code -- assets/images/diagrams docs', 'git diff --exit-code -- docs')]
];

let passed = 0;
try {
  fs.rmSync(TEMP_ROOT, { recursive: true, force: true });
  fs.mkdirSync(TEMP_ROOT, { recursive: true });

  const positive = path.join(TEMP_ROOT, 'positive');
  copyFixture(positive);
  checkStaticDiagrams(positive);

  for (const [name, mutate] of tests) {
    const fixture = path.join(TEMP_ROOT, name);
    copyFixture(fixture);
    mutate(fixture);
    let failed = false;
    try {
      checkStaticDiagrams(fixture);
    } catch {
      failed = true;
    }
    if (!failed) throw new Error(`regression case did not fail closed: ${name}`);
    passed += 1;
  }
  console.log(`Static diagram regression OK: ${passed}/${tests.length} negative, 1/1 positive`);
} finally {
  fs.rmSync(TEMP_ROOT, { recursive: true, force: true });
}

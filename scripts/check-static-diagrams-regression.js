#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { checkStaticDiagrams, computeRenderProvenance: computeCheckedProvenance } = require('./check-static-diagrams');
const { computeRenderProvenance: computeRenderedProvenance, ensureAccessibleSvg, FORBIDDEN_BROWSER_SELECTION_ENV, validateBrowserSelectionEnvironment } = require('./render-mermaid-diagrams');

const ROOT = path.resolve(__dirname, '..');
const TEMP_ROOT = path.join(ROOT, '.codex-local', 'tmp', 'static-diagram-regression');

function copyFixture(destination) {
  fs.mkdirSync(destination, { recursive: true });
  for (const value of ['package.json', 'package-simple.json', 'package-lock.json', '.npmrc', '.puppeteerrc.cjs', 'diagrams', 'assets/images/diagrams', 'src/chapters/chapter10.md', 'src/appendices/appendix-d.md', 'docs/chapters/chapter10.md', 'docs/appendices/appendix-d.md', 'docs/assets/images/diagrams', 'scripts/build-simple.js', 'scripts/render-mermaid-diagrams.js', '.github/workflows/book-qa.yml', '.github/workflows/build.yml', 'templates/github-workflows/build-legacy.yml', 'templates/github-workflows/build-actions.yml']) {
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
  ['source-render-drift', dir => replaceOnce(path.join(dir, 'diagrams/mermaid/neural-network-layer-flow.mmd'), 'I1[入力1]', 'I1[変更された入力1]')],
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
  ['mutable-puppeteer-pin', dir => replaceOnce(path.join(dir, 'package.json'), '"puppeteer": "25.8.0"', '"puppeteer": "^25.8.0"')],
  ['manifest-runtime-node-drift', dir => replaceOnce(path.join(dir, 'diagrams/manifest.json'), '"node": "22.22.2"', '"node": "22"')],
  ['manifest-runtime-puppeteer-drift', dir => replaceOnce(path.join(dir, 'diagrams/manifest.json'), '"puppeteer": "25.8.0"', '"puppeteer": "25"')],
  ['manifest-runtime-browser-drift', dir => replaceOnce(path.join(dir, 'diagrams/manifest.json'), '"browserRevision": "chrome@152.0.7977.42"', '"browserRevision": "latest"')],
  ['manifest-runtime-unknown-key', dir => replaceOnce(path.join(dir, 'diagrams/manifest.json'), '"browserRevision": "chrome@152.0.7977.42"', '"browserRevision": "chrome@152.0.7977.42",\n      "channel": "stable"')],
  ['package-node-engine-drift', dir => replaceOnce(path.join(dir, 'package.json'), '"node": "22.22.2"', '"node": ">=22.0.0"')],
  ['simple-package-node-engine-drift', dir => replaceOnce(path.join(dir, 'package-simple.json'), '"node": "22.22.2"', '"node": ">=22.0.0"')],
  ['lockfile-node-engine-drift', dir => replaceOnce(path.join(dir, 'package-lock.json'), '"node": "22.22.2"', '"node": ">=22.0.0"')],
  ['weakened-security-threshold', dir => replaceOnce(path.join(dir, 'package.json'), 'npm audit --omit=optional --audit-level=high', 'npm audit --omit=optional --audit-level=critical')],
  ['build-node-version-drift', dir => replaceOnce(path.join(dir, '.github/workflows/build.yml'), "node-version: '22.22.2'", "node-version: '22'")],
  ['book-qa-node-version-drift', dir => replaceOnce(path.join(dir, '.github/workflows/book-qa.yml'), "node-version: '22.22.2'", "node-version: '22'")],
  ['extra-build-job-node-version-drift', dir => fs.appendFileSync(path.join(dir, '.github/workflows/build.yml'), "\n  incompatible-runtime-fixture:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/setup-node@v6\n        with:\n          node-version: '20'\n")],
  ['disabled-engine-strict', dir => replaceOnce(path.join(dir, '.npmrc'), 'engine-strict=true', 'engine-strict=false')],
  ['missing-npmrc', dir => fs.unlinkSync(path.join(dir, '.npmrc'))],
  ['legacy-template-node-version-drift', dir => replaceOnce(path.join(dir, 'templates/github-workflows/build-legacy.yml'), "node-version: '22.22.2'", "node-version: '20'")],
  ['actions-template-node-version-drift', dir => replaceOnce(path.join(dir, 'templates/github-workflows/build-actions.yml'), "node-version: '22.22.2'", "node-version: '20'")],
  ['unsafe-config', dir => replaceOnce(path.join(dir, 'diagrams/mermaid-config.json'), '"securityLevel": "strict"', '"securityLevel": "loose"')],
  ['disabled-sandbox', dir => replaceOnce(path.join(dir, 'diagrams/puppeteer-config.json'), '"--no-first-run"', '"--no-sandbox"')],
  ['extra-browser-argument', dir => replaceOnce(path.join(dir, 'diagrams/puppeteer-config.json'), '"--no-first-run"', '"--no-first-run",\n    "--disable-web-security"')],
  ['browser-executable-config-override', dir => replaceOnce(path.join(dir, 'diagrams/puppeteer-config.json'), '"headless": true,', '"headless": true,\n  "executablePath": "/synthetic/browser",')],
  ['missing-build-wiring', dir => replaceOnce(path.join(dir, 'scripts/build-simple.js'), 'renderStaticDiagrams();', '// removed')],
  ['missing-book-qa-wiring', dir => replaceOnce(path.join(dir, '.github/workflows/book-qa.yml'), 'npm run check:static-diagrams && ', '')],
  ['missing-book-qa-untracked-gate', dir => replaceOnce(path.join(dir, '.github/workflows/book-qa.yml'), 'git status --porcelain --untracked-files=all -- assets/images/diagrams docs', 'git status --porcelain -- docs')],
  ['missing-build-preflight', dir => replaceOnce(path.join(dir, '.github/workflows/build.yml'), 'npm run check:static-diagrams && npm run check:static-diagrams-regression', 'echo diagram-checks-removed')],
  ['missing-ci-verify-only', dir => replaceOnce(path.join(dir, '.github/workflows/build.yml'), "STATIC_DIAGRAMS_VERIFY_ONLY: '1'", "STATIC_DIAGRAMS_VERIFY_ONLY: '0'")],
  ['external-puppeteer-cache', dir => replaceOnce(path.join(dir, '.puppeteerrc.cjs'), "'.codex-local', 'cache', 'puppeteer'", "'outside-workspace', 'puppeteer'")],
  ['repository-puppeteer-executable-override', dir => replaceOnce(path.join(dir, '.puppeteerrc.cjs'), "cacheDirectory: path.join(__dirname, '.codex-local', 'cache', 'puppeteer')", "cacheDirectory: path.join(__dirname, '.codex-local', 'cache', 'puppeteer'),\n  executablePath: '/synthetic/browser'")],
  ['repository-puppeteer-browser-override', dir => replaceOnce(path.join(dir, '.puppeteerrc.cjs'), "cacheDirectory: path.join(__dirname, '.codex-local', 'cache', 'puppeteer')", "cacheDirectory: path.join(__dirname, '.codex-local', 'cache', 'puppeteer'),\n  defaultBrowser: 'firefox'")],
  ['alternate-puppeteer-config', dir => {
    const file = path.join(dir, '.config/puppeteer.config.cjs');
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, "module.exports = { executablePath: '/synthetic/browser' };\n", 'utf8');
  }],
  ['alternate-esm-puppeteer-config', dir => fs.writeFileSync(path.join(dir, '.puppeteerrc.mjs'), "export default { executablePath: '/synthetic/browser' };\n", 'utf8')],
  ['missing-repository-puppeteer-config', dir => fs.unlinkSync(path.join(dir, '.puppeteerrc.cjs'))],
  ['package-puppeteer-config', dir => {
    const file = path.join(dir, 'package.json');
    const value = JSON.parse(fs.readFileSync(file, 'utf8'));
    value.puppeteer = { executablePath: '/synthetic/browser' };
    fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  }],
  ['missing-browser-selection-gate', dir => replaceOnce(path.join(dir, 'scripts/render-mermaid-diagrams.js'), 'validateBrowserSelectionEnvironment();', '// browser selection gate removed')],
  ['missing-renderer-runtime-validation', dir => replaceOnce(path.join(dir, 'scripts/render-mermaid-diagrams.js'), 'validateRendererRuntime(manifest, packageJson);', '// runtime validation removed')],
  ['weakened-sync-gate', dir => replaceOnce(path.join(dir, '.github/workflows/book-qa.yml'), 'git diff --exit-code -- assets/images/diagrams docs', 'git diff --exit-code -- docs')]
];

let passed = 0;
try {
  fs.rmSync(TEMP_ROOT, { recursive: true, force: true });
  fs.mkdirSync(TEMP_ROOT, { recursive: true });

  const positive = path.join(TEMP_ROOT, 'positive');
  copyFixture(positive);
  checkStaticDiagrams(positive);
  const manifest = JSON.parse(fs.readFileSync(path.join(positive, 'diagrams/manifest.json'), 'utf8'));
  const diagram = manifest.diagrams[0];
  const definition = fs.readFileSync(path.join(positive, diagram.source), 'utf8');
  const mermaidConfig = fs.readFileSync(path.join(positive, manifest.renderer.config), 'utf8');
  const puppeteerConfig = fs.readFileSync(path.join(positive, manifest.renderer.puppeteerConfig), 'utf8');
  const checkedProvenance = computeCheckedProvenance(manifest, diagram, definition, mermaidConfig, puppeteerConfig);
  const renderedProvenance = computeRenderedProvenance(manifest, diagram, definition, mermaidConfig, puppeteerConfig);
  const changedRuntimeManifest = JSON.parse(JSON.stringify(manifest));
  changedRuntimeManifest.renderer.runtime.puppeteer = 'fixture-drift';
  const changedRuntimeProvenance = computeCheckedProvenance(changedRuntimeManifest, diagram, definition, mermaidConfig, puppeteerConfig);
  if (checkedProvenance.renderContractSha256 !== renderedProvenance.renderContractSha256 ||
      checkedProvenance.renderContractSha256 === changedRuntimeProvenance.renderContractSha256) {
    throw new Error('renderer and checker must share runtime-bound render provenance');
  }
  for (const variable of FORBIDDEN_BROWSER_SELECTION_ENV) {
    let browserOverrideRejected = false;
    try {
      validateBrowserSelectionEnvironment({ [variable]: 'synthetic-override' });
    } catch {
      browserOverrideRejected = true;
    }
    if (!browserOverrideRejected) throw new Error(`browser selection override must be rejected: ${variable}`);
  }
  const normalized = ensureAccessibleSvg(
    '<svg aria-roledescription="flowchart"><title>題名</title><desc id="existing-description">説明</desc></svg>',
    { id: 'fixture', title: '題名', description: '説明' }
  );
  if (!/<title id="diagram-fixture-title">題名<\/title>/.test(normalized) ||
      !/aria-labelledby="diagram-fixture-title"/.test(normalized) ||
      !/aria-describedby="existing-description"/.test(normalized)) {
    throw new Error('accessibility normalization positive case failed');
  }

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

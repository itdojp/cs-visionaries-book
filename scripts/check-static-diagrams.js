#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DEFAULT_ROOT = path.resolve(__dirname, '..');
const EXPECTED_VERSION = '11.16.0';
const EXPECTED_PACKAGE = '@mermaid-js/mermaid-cli';
const EXPECTED_PUPPETEER_VERSION = '25.8.0';
const EXPECTED_NODE_VERSION = '22.22.2';
const EXPECTED_BROWSER_REVISION = 'chrome@152.0.7977.42';
const EXPECTED_SECURITY_COMMAND = 'npm audit --omit=optional --audit-level=high';
const EXPECTED_DIAGRAMS = [
  ['hinton-ai-history-timeline', 'diagrams/mermaid/hinton-ai-history-timeline.mmd', 'assets/images/diagrams/hinton-ai-history-timeline.svg', 'src/chapters/chapter10.md'],
  ['neural-network-layer-flow', 'diagrams/mermaid/neural-network-layer-flow.mmd', 'assets/images/diagrams/neural-network-layer-flow.svg', 'src/chapters/chapter10.md'],
  ['traditional-ai-vs-deep-learning', 'diagrams/mermaid/traditional-ai-vs-deep-learning.mmd', 'assets/images/diagrams/traditional-ai-vs-deep-learning.svg', 'src/chapters/chapter10.md'],
  ['ai-convergence-five-elements', 'diagrams/mermaid/ai-convergence-five-elements.mmd', 'assets/images/diagrams/ai-convergence-five-elements.svg', 'src/appendices/appendix-d.md']
];
const EXPECTED_PUPPETEER_ARGS = [
  '--disable-background-networking',
  '--disable-component-update',
  '--disable-default-apps',
  '--disable-domain-reliability',
  '--disable-sync',
  '--metrics-recording-only',
  '--no-first-run'
];

class StaticDiagramError extends Error {}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function computeRenderProvenance(manifest, diagram, definition, mermaidConfig, puppeteerConfig) {
  return {
    sourceSha256: sha256(definition),
    renderContractSha256: sha256(JSON.stringify({
      renderer: manifest.renderer,
      diagram,
      definition,
      mermaidConfig,
      puppeteerConfig
    }))
  };
}

function listFiles(directory, suffix) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true })
    .filter(entry => entry.isFile() && entry.name.endsWith(suffix))
    .map(entry => path.join(directory, entry.name).replace(/\\/g, '/'))
    .sort();
}

function count(content, needle) {
  return content.split(needle).length - 1;
}

function workflowNodeVersions(content) {
  return [...content.matchAll(/^\s*node-version:\s*['"]?([^'"\s#]+)['"]?\s*(?:#.*)?$/gm)]
    .map(match => match[1]);
}

function relative(root, file) {
  return path.relative(root, file).replace(/\\/g, '/');
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function referencedElementText(svg, tag, id) {
  if (!id || /\s/.test(id)) return null;
  const match = svg.match(new RegExp(`<${tag}\\b(?=[^>]*\\bid=["']${escapeRegex(id)}["'])[^>]*>([\\s\\S]*?)<\\/${tag}>`));
  return match ? match[1].trim() : null;
}

function assertSafeRelative(root, value, label, failures) {
  if (typeof value !== 'string' || path.isAbsolute(value)) {
    failures.push(`${label} must be a repository-relative path`);
    return null;
  }
  const resolved = path.resolve(root, value);
  if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`)) {
    failures.push(`${label} escapes repository root: ${value}`);
    return null;
  }
  return resolved;
}

function verifySvg(svg, diagram, label, failures, provenance) {
  const checks = [
    [/<svg\b/, 'svg root'],
    [/aria-labelledby=/, 'aria-labelledby'],
    [/aria-describedby=/, 'aria-describedby'],
    [/aria-roledescription=/, 'aria-roledescription'],
    [/<title\b[^>]*>[\s\S]*?<\/title>/, 'accessible title'],
    [/<desc\b[^>]*>[\s\S]*?<\/desc>/, 'accessible description']
  ];
  for (const [pattern, name] of checks) {
    if (!pattern.test(svg)) failures.push(`${label}: missing ${name}`);
  }
  if ((svg.match(/<title\b/g) || []).length !== 1) failures.push(`${label}: expected exactly one title`);
  if ((svg.match(/<desc\b/g) || []).length !== 1) failures.push(`${label}: expected exactly one description`);
  const labelled = svg.match(/aria-labelledby=["']([^"']+)["']/)?.[1];
  const described = svg.match(/aria-describedby=["']([^"']+)["']/)?.[1];
  if (referencedElementText(svg, 'title', labelled) !== diagram.title) failures.push(`${label}: aria-labelledby target text mismatch`);
  if (referencedElementText(svg, 'desc', described) !== diagram.description) failures.push(`${label}: aria-describedby target text mismatch`);
  if (!provenance || !svg.includes(`data-source-sha256="${provenance.sourceSha256}"`)) failures.push(`${label}: source provenance mismatch`);
  if (!provenance || !svg.includes(`data-render-contract-sha256="${provenance.renderContractSha256}"`)) failures.push(`${label}: render contract provenance mismatch`);
  if (/<script\b|<iframe\b|<object\b|<embed\b|\son[a-z]+\s*=|javascript:|@import/i.test(svg)) failures.push(`${label}: unsafe active content`);
  const hrefs = [...svg.matchAll(/(?:href|xlink:href)\s*=\s*["']([^"']+)["']/gi)].map(match => match[1].trim());
  if (hrefs.some(value => !value.startsWith('#'))) failures.push(`${label}: external resource reference`);
  const styleUrls = [...svg.matchAll(/url\(\s*["']?([^)'"\s]+)["']?\s*\)/gi)].map(match => match[1].trim());
  if (styleUrls.some(value => !value.startsWith('#'))) failures.push(`${label}: external style resource`);
  if (/<foreignObject\b/i.test(svg)) failures.push(`${label}: foreignObject is forbidden`);
}

function resolveHtml(siteRoot, document) {
  const route = document
    .replace(/^src\//, '')
    .replace(/\.md$/, '');
  const candidates = [
    path.join(siteRoot, route, 'index.html'),
    path.join(siteRoot, `${route}.html`)
  ];
  return candidates.find(candidate => fs.existsSync(candidate));
}

function checkStaticDiagrams(root = DEFAULT_ROOT, options = {}) {
  root = path.resolve(root);
  const failures = [];
  const manifestPath = path.join(root, 'diagrams', 'manifest.json');
  if (!fs.existsSync(manifestPath)) throw new StaticDiagramError('static diagram manifest is missing');
  const manifest = readJson(manifestPath);

  if (manifest.schemaVersion !== '1.0') failures.push('manifest schemaVersion must be 1.0');
  if (manifest.renderer?.package !== EXPECTED_PACKAGE) failures.push(`renderer package must be ${EXPECTED_PACKAGE}`);
  if (manifest.renderer?.version !== EXPECTED_VERSION) failures.push(`renderer version must be ${EXPECTED_VERSION}`);
  if (manifest.renderer?.config !== 'diagrams/mermaid-config.json') failures.push('renderer config path mismatch');
  if (manifest.renderer?.puppeteerConfig !== 'diagrams/puppeteer-config.json') failures.push('Puppeteer config path mismatch');
  if (manifest.renderer?.runtime?.node !== EXPECTED_NODE_VERSION) failures.push(`renderer runtime Node must be exactly ${EXPECTED_NODE_VERSION}`);
  if (manifest.renderer?.runtime?.puppeteer !== EXPECTED_PUPPETEER_VERSION) failures.push(`renderer runtime Puppeteer must be exactly ${EXPECTED_PUPPETEER_VERSION}`);
  if (manifest.renderer?.runtime?.browserRevision !== EXPECTED_BROWSER_REVISION) failures.push(`renderer browser revision must be exactly ${EXPECTED_BROWSER_REVISION}`);
  if (!Array.isArray(manifest.diagrams) || manifest.diagrams.length !== 4) failures.push('manifest must define exactly 4 active diagrams');

  const diagrams = Array.isArray(manifest.diagrams) ? manifest.diagrams : [];
  const ids = diagrams.map(item => item.id);
  if (new Set(ids).size !== ids.length) failures.push('diagram ids must be unique');
  for (const [id, source, output, document] of EXPECTED_DIAGRAMS) {
    const diagram = diagrams.find(item => item.id === id);
    if (!diagram || diagram.source !== source || diagram.output !== output || diagram.publicPath !== `/${output}` || diagram.document !== document) failures.push(`manifest path contract mismatch: ${id}`);
  }
  const documents = new Set(diagrams.map(item => item.document));
  const expectedDocuments = ['src/appendices/appendix-d.md', 'src/chapters/chapter10.md'];
  if (JSON.stringify([...documents].sort()) !== JSON.stringify(expectedDocuments)) {
    failures.push(`active documents must be exactly ${expectedDocuments.join(', ')}`);
  }

  const packageJson = readJson(path.join(root, 'package.json'));
  const packageSimple = readJson(path.join(root, 'package-simple.json'));
  const packageLock = readJson(path.join(root, 'package-lock.json'));
  const npmConfigLines = fs.readFileSync(path.join(root, '.npmrc'), 'utf8')
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#') && !line.startsWith(';'));
  const engineStrictEntries = npmConfigLines
    .map(line => line.match(/^engine-strict\s*=\s*(\S+)\s*$/))
    .filter(Boolean);
  if (engineStrictEntries.length !== 1 || engineStrictEntries[0][1].toLowerCase() !== 'true') failures.push('.npmrc must enable engine-strict exactly once');
  if (packageJson.engines?.node !== EXPECTED_NODE_VERSION) failures.push(`package.json Node engine must be exactly ${EXPECTED_NODE_VERSION}`);
  if (packageSimple.engines?.node !== EXPECTED_NODE_VERSION) failures.push(`package-simple.json Node engine must be exactly ${EXPECTED_NODE_VERSION}`);
  if (packageLock.packages?.['']?.engines?.node !== EXPECTED_NODE_VERSION) failures.push(`lockfile root Node engine must be exactly ${EXPECTED_NODE_VERSION}`);
  if (packageJson.scripts?.['check:security'] !== EXPECTED_SECURITY_COMMAND) failures.push(`check:security must be exactly: ${EXPECTED_SECURITY_COMMAND}`);
  if (packageJson.devDependencies?.[EXPECTED_PACKAGE] !== EXPECTED_VERSION) failures.push('Mermaid CLI devDependency must use the audited exact version');
  if (packageJson.devDependencies?.puppeteer !== EXPECTED_PUPPETEER_VERSION) failures.push('Puppeteer devDependency must use the audited exact Node 22-compatible version');
  if (packageLock.packages?.['']?.devDependencies?.[EXPECTED_PACKAGE] !== EXPECTED_VERSION) failures.push('lockfile root Mermaid CLI pin mismatch');
  if (packageLock.packages?.['']?.devDependencies?.puppeteer !== EXPECTED_PUPPETEER_VERSION) failures.push('lockfile root Puppeteer pin mismatch');
  if (packageLock.packages?.[`node_modules/${EXPECTED_PACKAGE}`]?.version !== EXPECTED_VERSION) failures.push('lockfile installed Mermaid CLI version mismatch');
  if (packageLock.packages?.['node_modules/puppeteer']?.version !== EXPECTED_PUPPETEER_VERSION) failures.push('lockfile installed Puppeteer version mismatch');
  if (manifest.renderer?.runtime?.node !== packageJson.engines?.node) failures.push('renderer runtime Node must match package.json engine');
  if (manifest.renderer?.runtime?.puppeteer !== packageJson.devDependencies?.puppeteer) failures.push('renderer runtime Puppeteer must match package.json pin');
  if (packageJson.scripts?.['render:diagrams'] !== 'node scripts/render-mermaid-diagrams.js') failures.push('render:diagrams script mismatch');
  if (!packageJson.scripts?.['test:light']?.includes('check:static-diagrams') || !packageJson.scripts?.['test:light']?.includes('check:static-diagrams-regression')) {
    failures.push('test:light must run static diagram checks');
  }

  const configPath = assertSafeRelative(root, manifest.renderer?.config, 'renderer config', failures);
  const puppeteerConfigPath = assertSafeRelative(root, manifest.renderer?.puppeteerConfig, 'Puppeteer config', failures);
  let mermaidConfigContent = '';
  let puppeteerConfigContent = '';
  if (configPath && fs.existsSync(configPath)) {
    mermaidConfigContent = fs.readFileSync(configPath, 'utf8');
    const config = readJson(configPath);
    if (config.securityLevel !== 'strict') failures.push('Mermaid securityLevel must be strict');
    if (config.deterministicIds !== true || typeof config.deterministicIDSeed !== 'string') failures.push('Mermaid deterministic IDs must be enabled with a seed');
    if (config.htmlLabels !== false) failures.push('Mermaid htmlLabels must be disabled');
  } else if (configPath) {
    failures.push('renderer config is missing');
  }
  if (puppeteerConfigPath && fs.existsSync(puppeteerConfigPath)) {
    puppeteerConfigContent = fs.readFileSync(puppeteerConfigPath, 'utf8');
    const puppeteerConfig = readJson(puppeteerConfigPath);
    if (Object.keys(puppeteerConfig).sort().join(',') !== 'args,headless') failures.push('Puppeteer config may contain only headless and args');
    if (puppeteerConfig.headless !== true) failures.push('Puppeteer must run headless');
    const args = Array.isArray(puppeteerConfig.args) ? puppeteerConfig.args : [];
    if (JSON.stringify(args) !== JSON.stringify(EXPECTED_PUPPETEER_ARGS)) failures.push('Puppeteer arguments must match the audited sandbox-preserving set');
  } else if (puppeteerConfigPath) failures.push('Puppeteer config is missing');
  const puppeteerRc = path.join(root, '.puppeteerrc.cjs');
  if (!fs.existsSync(puppeteerRc)) failures.push('Puppeteer cache config is missing');
  else {
    try {
      delete require.cache[require.resolve(puppeteerRc)];
      const puppeteerRepositoryConfig = require(puppeteerRc);
      if (!puppeteerRepositoryConfig || typeof puppeteerRepositoryConfig !== 'object' || Array.isArray(puppeteerRepositoryConfig) ||
          Object.keys(puppeteerRepositoryConfig).join(',') !== 'cacheDirectory') {
        failures.push('repository Puppeteer config may contain only cacheDirectory');
      }
      const configured = puppeteerRepositoryConfig?.cacheDirectory;
      const expected = path.join(root, '.codex-local', 'cache', 'puppeteer');
      if (path.resolve(configured || '') !== expected) failures.push('Puppeteer cache must remain inside the checkout');
    } catch (error) {
      failures.push(`Puppeteer cache config cannot be loaded: ${error.message}`);
    }
  }

  const expectedSources = [];
  const expectedOutputs = [];
  const expectedPublicOutputs = [];
  for (const diagram of diagrams) {
    const requiredStrings = ['id', 'source', 'output', 'publicPath', 'title', 'description', 'document', 'alternativeMarker'];
    for (const field of requiredStrings) {
      if (typeof diagram[field] !== 'string' || !diagram[field].trim()) failures.push(`${diagram.id || 'diagram'}: ${field} must be a non-empty string`);
    }
    const source = assertSafeRelative(root, diagram.source, `${diagram.id} source`, failures);
    const output = assertSafeRelative(root, diagram.output, `${diagram.id} output`, failures);
    const document = assertSafeRelative(root, diagram.document, `${diagram.id} document`, failures);
    const publicOutputValue = typeof diagram.output === 'string' ? `docs/${diagram.output}` : '';
    const publicOutput = assertSafeRelative(root, publicOutputValue, `${diagram.id} public output`, failures);
    if (source) expectedSources.push(relative(root, source));
    if (output) expectedOutputs.push(relative(root, output));
    if (publicOutput) expectedPublicOutputs.push(relative(root, publicOutput));
    if (diagram.publicPath !== `/${diagram.output}`) failures.push(`${diagram.id}: publicPath must match output`);

    let definition = '';
    let provenance = null;
    if (source && fs.existsSync(source)) {
      definition = fs.readFileSync(source, 'utf8');
      if (!definition.includes(`accTitle: ${diagram.title}`)) failures.push(`${diagram.id}: source accTitle mismatch`);
      if (!definition.includes(`accDescr: ${diagram.description}`)) failures.push(`${diagram.id}: source accDescr mismatch`);
      provenance = computeRenderProvenance(manifest, diagram, definition, mermaidConfigContent, puppeteerConfigContent);
    } else if (source) failures.push(`${diagram.id}: source definition is missing`);

    if (output && fs.existsSync(output)) {
      const svg = fs.readFileSync(output, 'utf8');
      verifySvg(svg, diagram, diagram.output, failures, provenance);
      if (publicOutput && fs.existsSync(publicOutput)) {
        if (!fs.readFileSync(output).equals(fs.readFileSync(publicOutput))) failures.push(`${diagram.id}: source and docs SVG differ`);
      } else if (publicOutput) failures.push(`${diagram.id}: docs SVG is missing`);
    } else if (output) failures.push(`${diagram.id}: generated SVG is missing`);

    for (const file of [document, document && path.join(root, `docs/${relative(root, document).replace(/^src\//, '')}`)]) {
      if (!file || !fs.existsSync(file)) {
        if (file) failures.push(`${diagram.id}: document is missing: ${relative(root, file)}`);
        continue;
      }
      const content = fs.readFileSync(file, 'utf8');
      if (count(content, diagram.publicPath) !== 1) failures.push(`${diagram.id}: ${relative(root, file)} must link the SVG exactly once`);
      if (count(content, diagram.alternativeMarker) !== 1) failures.push(`${diagram.id}: ${relative(root, file)} must contain the alternative marker exactly once`);
    }
  }

  const actualSources = listFiles(path.join(root, 'diagrams', 'mermaid'), '.mmd').map(file => relative(root, file));
  const actualOutputs = listFiles(path.join(root, 'assets', 'images', 'diagrams'), '.svg').map(file => relative(root, file));
  const actualPublicOutputs = listFiles(path.join(root, 'docs', 'assets', 'images', 'diagrams'), '.svg').map(file => relative(root, file));
  for (const [label, actual, expected] of [
    ['Mermaid source inventory', actualSources, expectedSources.sort()],
    ['source SVG inventory', actualOutputs, expectedOutputs.sort()],
    ['docs SVG inventory', actualPublicOutputs, expectedPublicOutputs.sort()]
  ]) {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) failures.push(`${label} mismatch: ${actual.join(', ')}`);
  }

  for (const document of expectedDocuments) {
    for (const value of [document, `docs/${document.replace(/^src\//, '')}`]) {
      const file = path.join(root, value);
      if (!fs.existsSync(file)) {
        failures.push(`active document is missing: ${value}`);
        continue;
      }
      if (/^```mermaid\s*$/m.test(fs.readFileSync(file, 'utf8'))) failures.push(`${value}: raw Mermaid block is forbidden`);
    }
  }

  const buildScript = fs.readFileSync(path.join(root, 'scripts', 'build-simple.js'), 'utf8');
  const importIndex = buildScript.indexOf("require('./render-mermaid-diagrams')");
  const renderIndex = buildScript.indexOf('renderStaticDiagrams();');
  const publicIndex = buildScript.indexOf('await this.createPublicDirectory();');
  if (importIndex < 0 || renderIndex < 0 || publicIndex < 0 || renderIndex > publicIndex) failures.push('build must render static diagrams before recreating docs');
  if (!buildScript.includes("process.env.STATIC_DIAGRAMS_VERIFY_ONLY === '1'") || !buildScript.includes('checkStaticDiagrams(process.cwd());')) failures.push('build must support browser-free committed artifact verification');

  const renderer = fs.readFileSync(path.join(root, 'scripts', 'render-mermaid-diagrams.js'), 'utf8');
  for (const marker of ['--svgId', '--quiet', '--puppeteerConfigFile', 'browserEnvironment', 'sensitiveName', 'ensureAccessibleSvg', 'validateDefinition', 'validateRendererConfigs', 'validateBrowserSelectionEnvironment', 'validateRepositoryPuppeteerConfig();', 'validateRendererRuntime(manifest, packageJson);', 'PUPPETEER_EXECUTABLE_PATH', 'PUPPETEER_REVISIONS', 'process.versions.node', 'verifySvg', 'foreignObject', 'external resource reference']) {
    if (!renderer.includes(marker)) failures.push(`renderer safety marker is missing: ${marker}`);
  }
  if (count(renderer, 'validateBrowserSelectionEnvironment();') !== 2) failures.push('renderer must reject browser selection overrides before validation and launch');

  const bookQa = fs.readFileSync(path.join(root, '.github', 'workflows', 'book-qa.yml'), 'utf8');
  const buildWorkflow = fs.readFileSync(path.join(root, '.github', 'workflows', 'build.yml'), 'utf8');
  const legacyWorkflowTemplate = fs.readFileSync(path.join(root, 'templates', 'github-workflows', 'build-legacy.yml'), 'utf8');
  const actionsWorkflowTemplate = fs.readFileSync(path.join(root, 'templates', 'github-workflows', 'build-actions.yml'), 'utf8');
  if (!bookQa.includes('npm run check:static-diagrams && npm run check:static-diagrams-regression')) failures.push('Book QA must run both static diagram checks in order');
  if (!bookQa.includes('node scripts/check-static-diagrams.js --site-dir _site')) failures.push('Book QA must inspect built HTML');
  if (!bookQa.includes('git diff --exit-code -- assets/images/diagrams docs')) failures.push('Book QA must verify source SVG and docs synchronization');
  if (!bookQa.includes('git status --porcelain --untracked-files=all -- assets/images/diagrams docs')) failures.push('Book QA must reject untracked generated outputs');
  if (!buildWorkflow.includes('npm run check:static-diagrams && npm run check:static-diagrams-regression')) failures.push('Build workflow must validate diagram inputs before rendering');
  if (count(buildWorkflow, 'git diff --exit-code -- assets/images/diagrams docs') < 2) failures.push('Build workflow must verify diagram determinism twice');
  for (const [label, workflow] of [['Book QA', bookQa], ['Build', buildWorkflow]]) {
    const versions = workflowNodeVersions(workflow);
    if (versions.length === 0 || versions.some(version => version !== EXPECTED_NODE_VERSION)) failures.push(`${label} must use Node ${EXPECTED_NODE_VERSION} for every setup-node job`);
    if (!workflow.includes("PUPPETEER_SKIP_DOWNLOAD: 'true'") || !workflow.includes("STATIC_DIAGRAMS_VERIFY_ONLY: '1'")) failures.push(`${label} must verify committed diagrams without launching Chromium`);
  }
  for (const [label, workflow] of [['Legacy workflow template', legacyWorkflowTemplate], ['Actions workflow template', actionsWorkflowTemplate]]) {
    const versions = workflowNodeVersions(workflow);
    if (versions.length === 0 || versions.some(version => version !== EXPECTED_NODE_VERSION)) failures.push(`${label} must use Node ${EXPECTED_NODE_VERSION} for every setup-node job`);
  }

  if (options.siteDir) {
    const siteRoot = path.resolve(root, options.siteDir);
    if (!siteRoot.startsWith(`${root}${path.sep}`) || !fs.existsSync(siteRoot)) failures.push('site directory must exist inside the repository');
    else {
      for (const document of expectedDocuments) {
        const htmlFile = resolveHtml(siteRoot, document);
        if (!htmlFile) {
          failures.push(`built HTML missing for ${document}`);
          continue;
        }
        const html = fs.readFileSync(htmlFile, 'utf8');
        if (/<code\b[^>]*class=["'][^"']*language-mermaid|class=["'][^"']*\bmermaid\b/i.test(html)) {
          failures.push(`${relative(root, htmlFile)}: raw Mermaid HTML is forbidden`);
        }
        for (const diagram of diagrams.filter(item => item.document === document)) {
          if (count(html, path.basename(diagram.output)) !== 1) failures.push(`${relative(root, htmlFile)}: expected one reference to ${path.basename(diagram.output)}`);
        }
      }
      for (const diagram of diagrams) {
        const publishedSvg = path.join(siteRoot, diagram.output);
        if (!fs.existsSync(publishedSvg)) failures.push(`built site SVG is missing: ${relative(root, publishedSvg)}`);
        else {
          const definition = fs.readFileSync(path.join(root, diagram.source), 'utf8');
          const provenance = computeRenderProvenance(manifest, diagram, definition, mermaidConfigContent, puppeteerConfigContent);
          verifySvg(fs.readFileSync(publishedSvg, 'utf8'), diagram, relative(root, publishedSvg), failures, provenance);
        }
      }
    }
  }

  if (failures.length) throw new StaticDiagramError(`Static diagram contract failed:\n- ${failures.join('\n- ')}`);
  return { diagrams: diagrams.length, documents: expectedDocuments.length, siteChecked: Boolean(options.siteDir) };
}

if (require.main === module) {
  try {
    const siteArgument = process.argv.indexOf('--site-dir');
    const siteDir = siteArgument >= 0 ? process.argv[siteArgument + 1] : undefined;
    if (siteArgument >= 0 && !siteDir) throw new StaticDiagramError('--site-dir requires a path');
    const result = checkStaticDiagrams(DEFAULT_ROOT, { siteDir });
    console.log(`Static diagram contract OK: ${result.diagrams} diagrams, ${result.documents} target documents${result.siteChecked ? ', target built HTML checked' : ''}`);
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

module.exports = { checkStaticDiagrams, computeRenderProvenance, referencedElementText, StaticDiagramError, verifySvg };

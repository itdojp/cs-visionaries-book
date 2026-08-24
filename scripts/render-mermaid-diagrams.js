#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const MANIFEST_PATH = path.join(ROOT, 'diagrams', 'manifest.json');
const EXPECTED_RUNTIME = Object.freeze({
  node: '22.22.2',
  puppeteer: '25.8.0',
  browserRevision: 'chrome@152.0.7977.42'
});
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

function readManifest() {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
  if (manifest.schemaVersion !== '1.0' || !Array.isArray(manifest.diagrams) || manifest.diagrams.length !== 4) {
    throw new Error('static diagram manifest must use schema 1.0 and define exactly 4 diagrams');
  }
  if (manifest.renderer?.package !== '@mermaid-js/mermaid-cli' || manifest.renderer?.version !== '11.16.0' ||
      manifest.renderer?.config !== 'diagrams/mermaid-config.json' || manifest.renderer?.puppeteerConfig !== 'diagrams/puppeteer-config.json') {
    throw new Error('static diagram renderer contract mismatch');
  }
  const runtime = manifest.renderer?.runtime;
  if (!runtime || Object.keys(runtime).sort().join(',') !== Object.keys(EXPECTED_RUNTIME).sort().join(',') ||
      Object.entries(EXPECTED_RUNTIME).some(([key, value]) => runtime[key] !== value)) {
    throw new Error('static diagram renderer runtime contract mismatch');
  }
  for (const [id, source, output, document] of EXPECTED_DIAGRAMS) {
    const diagram = manifest.diagrams.find(item => item.id === id);
    if (!diagram || diagram.source !== source || diagram.output !== output || diagram.publicPath !== `/${output}` || diagram.document !== document) {
      throw new Error(`static diagram manifest path contract mismatch: ${id}`);
    }
  }
  return manifest;
}

function validateRendererConfigs(configPath, puppeteerConfigPath) {
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  if (config.securityLevel !== 'strict' || config.deterministicIds !== true ||
      typeof config.deterministicIDSeed !== 'string' || config.htmlLabels !== false) {
    throw new Error('Mermaid renderer security and determinism config mismatch');
  }
  const puppeteerConfig = JSON.parse(fs.readFileSync(puppeteerConfigPath, 'utf8'));
  if (puppeteerConfig.headless !== true || JSON.stringify(puppeteerConfig.args) !== JSON.stringify(EXPECTED_PUPPETEER_ARGS)) {
    throw new Error('Puppeteer config must use the audited sandbox-preserving argument set');
  }
}

function validateRendererRuntime(manifest, packageJson) {
  const installedPuppeteer = require('puppeteer/package.json').version;
  const { PUPPETEER_REVISIONS } = require('puppeteer-core/internal/revisions.js');
  const actual = {
    node: process.versions.node,
    puppeteer: installedPuppeteer,
    browserRevision: `chrome@${PUPPETEER_REVISIONS.chrome}`
  };
  if (Object.entries(actual).some(([key, value]) => manifest.renderer.runtime[key] !== value)) {
    throw new Error(`renderer runtime differs from manifest: ${JSON.stringify(actual)}`);
  }
  if (packageJson.engines?.node !== actual.node || packageJson.devDependencies?.puppeteer !== actual.puppeteer) {
    throw new Error('renderer runtime differs from package contract');
  }
}

function assertInsideRoot(relative, label) {
  if (typeof relative !== 'string' || path.isAbsolute(relative)) {
    throw new Error(`${label} must be a repository-relative path`);
  }
  const resolved = path.resolve(ROOT, relative);
  if (resolved !== ROOT && !resolved.startsWith(`${ROOT}${path.sep}`)) {
    throw new Error(`${label} escapes repository root: ${relative}`);
  }
  return resolved;
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
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

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function referencedElementText(svg, tag, id) {
  if (!id || /\s/.test(id)) return null;
  const match = svg.match(new RegExp(`<${tag}\\b(?=[^>]*\\bid=["']${escapeRegex(id)}["'])[^>]*>([\\s\\S]*?)<\\/${tag}>`));
  return match ? match[1].trim() : null;
}

function ensureAccessibleSvg(svg, diagram) {
  const ensureElement = (tag, fallbackId, text) => {
    const pattern = new RegExp(`<${tag}\\b([^>]*)>([\\s\\S]*?)<\\/${tag}>`);
    const match = svg.match(pattern);
    if (!match) {
      svg = svg.replace(/(<svg\b[^>]*>)/, `$1<${tag} id="${fallbackId}">${escapeXml(text)}</${tag}>`);
      return fallbackId;
    }
    const idMatch = match[1].match(/\bid=["']([^"']+)["']/);
    if (idMatch && idMatch[1] && !/\s/.test(idMatch[1])) return idMatch[1];
    const attributes = /\bid=["'][^"']*["']/.test(match[1])
      ? match[1].replace(/\bid=["'][^"']*["']/, `id="${fallbackId}"`)
      : `${match[1]} id="${fallbackId}"`;
    svg = svg.replace(pattern, `<${tag}${attributes}>$2</${tag}>`);
    return fallbackId;
  };
  const setRootAttribute = (name, value) => {
    const pattern = new RegExp(`(<svg\\b[^>]*?)\\s${name}=["'][^"']*["']`);
    svg = pattern.test(svg)
      ? svg.replace(pattern, `$1 ${name}="${value}"`)
      : svg.replace(/<svg\b/, `<svg ${name}="${value}"`);
  };

  const titleId = ensureElement('title', `diagram-${diagram.id}-title`, diagram.title);
  const descriptionId = ensureElement('desc', `diagram-${diagram.id}-description`, diagram.description);
  setRootAttribute('aria-labelledby', titleId);
  setRootAttribute('aria-describedby', descriptionId);
  return svg;
}

function ensureRenderProvenance(svg, provenance) {
  return svg.replace(/<svg\b/, `<svg data-source-sha256="${provenance.sourceSha256}" data-render-contract-sha256="${provenance.renderContractSha256}"`);
}

function validateDefinition(definition, diagram) {
  const failures = [];
  if (Buffer.byteLength(definition, 'utf8') > 50 * 1024) failures.push('definition exceeds 50 KiB');
  if (definition.split(/\r?\n/).length > 100) failures.push('definition exceeds 100 lines');
  if (definition.includes('\0')) failures.push('NUL byte');
  if (!definition.includes(`accTitle: ${diagram.title}`)) failures.push('accTitle mismatch');
  if (!definition.includes(`accDescr: ${diagram.description}`)) failures.push('accDescr mismatch');
  if (/https?:|data:|javascript:|file:|\/\/|@import|url\s*\(|^\s*click\b|%%\s*\{/im.test(definition)) failures.push('network, active, or configuration directive');
  const withoutLineBreaks = definition.replace(/<br\s*\/?\s*>/gi, '');
  if (/</.test(withoutLineBreaks)) failures.push('HTML markup other than br');
  if (failures.length) throw new Error(`${diagram.id} source definition failed: ${failures.join(', ')}`);
}

function browserEnvironment() {
  const sensitiveName = /(?:TOKEN|SECRET|PASSWORD|CREDENTIAL|API_KEY|AUTH|COOKIE|SESSION|THREAD|CODEX|BRAVE)/i;
  return Object.fromEntries(Object.entries(process.env).filter(([key]) => !sensitiveName.test(key)));
}

function verifySvg(svg, diagram, provenance) {
  const failures = [];
  if (!svg.includes('<svg')) failures.push('svg root');
  if (!svg.includes('aria-labelledby=')) failures.push('aria-labelledby');
  if (!svg.includes('aria-describedby=')) failures.push('aria-describedby');
  if (!svg.includes('aria-roledescription=')) failures.push('aria-roledescription');
  if ((svg.match(/<title\b/g) || []).length !== 1) failures.push('exactly one accessible title');
  if ((svg.match(/<desc\b/g) || []).length !== 1) failures.push('exactly one accessible description');
  const labelled = svg.match(/aria-labelledby=["']([^"']+)["']/)?.[1];
  const described = svg.match(/aria-describedby=["']([^"']+)["']/)?.[1];
  if (referencedElementText(svg, 'title', labelled) !== diagram.title) failures.push('aria-labelledby target text');
  if (referencedElementText(svg, 'desc', described) !== diagram.description) failures.push('aria-describedby target text');
  if (!provenance || !svg.includes(`data-source-sha256="${provenance.sourceSha256}"`)) failures.push('source provenance');
  if (!provenance || !svg.includes(`data-render-contract-sha256="${provenance.renderContractSha256}"`)) failures.push('render contract provenance');
  if (/<script\b|<iframe\b|<object\b|<embed\b|\son[a-z]+\s*=|javascript:|@import/i.test(svg)) failures.push('unsafe active content');
  const hrefs = [...svg.matchAll(/(?:href|xlink:href)\s*=\s*["']([^"']+)["']/gi)].map(match => match[1].trim());
  if (hrefs.some(value => !value.startsWith('#'))) failures.push('external resource reference');
  const styleUrls = [...svg.matchAll(/url\(\s*["']?([^)'"\s]+)["']?\s*\)/gi)].map(match => match[1].trim());
  if (styleUrls.some(value => !value.startsWith('#'))) failures.push('external style resource');
  if (/<foreignObject\b/i.test(svg)) failures.push('foreignObject');
  if (failures.length) throw new Error(`${diagram.id} generated SVG failed: ${failures.join(', ')}`);
}

function renderAll() {
  const manifest = readManifest();
  const packageJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  const pinned = packageJson.devDependencies?.[manifest.renderer.package];
  if (pinned !== manifest.renderer.version) {
    throw new Error(`${manifest.renderer.package} must be pinned to ${manifest.renderer.version}; found ${pinned || 'missing'}`);
  }
  validateRendererRuntime(manifest, packageJson);

  const config = assertInsideRoot(manifest.renderer.config, 'renderer config');
  const puppeteerConfig = assertInsideRoot(manifest.renderer.puppeteerConfig, 'Puppeteer config');
  validateRendererConfigs(config, puppeteerConfig);
  const mermaidConfigContent = fs.readFileSync(config, 'utf8');
  const puppeteerConfigContent = fs.readFileSync(puppeteerConfig, 'utf8');
  const executable = path.join(ROOT, 'node_modules', '@mermaid-js', 'mermaid-cli', 'src', 'cli.js');
  if (!fs.existsSync(executable)) throw new Error('Mermaid CLI is unavailable; run npm ci first');
  for (const diagram of manifest.diagrams) {
    const source = assertInsideRoot(diagram.source, `${diagram.id} source`);
    const output = assertInsideRoot(diagram.output, `${diagram.id} output`);
    const definition = fs.readFileSync(source, 'utf8');
    validateDefinition(definition, diagram);
    const provenance = computeRenderProvenance(manifest, diagram, definition, mermaidConfigContent, puppeteerConfigContent);
    fs.mkdirSync(path.dirname(output), { recursive: true });

    const result = spawnSync(process.execPath, [executable,
      '--input', source,
      '--output', output,
      '--configFile', config,
      '--puppeteerConfigFile', puppeteerConfig,
      '--backgroundColor', 'transparent',
      '--svgId', `diagram-${diagram.id}`,
      '--quiet'
    ], {
      cwd: ROOT,
      encoding: 'utf8',
      env: browserEnvironment()
    });

    if (result.status !== 0) {
      const details = `${result.stdout || ''}${result.stderr || ''}`.trim();
      throw new Error(`Mermaid render failed for ${diagram.id}: ${details || `exit ${result.status}`}`);
    }
    const accessibleSvg = ensureAccessibleSvg(fs.readFileSync(output, 'utf8'), diagram);
    const verifiedSvg = ensureRenderProvenance(accessibleSvg, provenance);
    verifySvg(verifiedSvg, diagram, provenance);
    fs.writeFileSync(output, verifiedSvg, 'utf8');
    console.log(`Rendered ${diagram.source} -> ${diagram.output}`);
  }
}

if (require.main === module) {
  try {
    renderAll();
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

module.exports = { assertInsideRoot, browserEnvironment, computeRenderProvenance, ensureAccessibleSvg, ensureRenderProvenance, readManifest, referencedElementText, renderAll, validateDefinition, validateRendererConfigs, validateRendererRuntime, verifySvg };

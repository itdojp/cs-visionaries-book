#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = process.cwd();
const errors = [];

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
  } catch (error) {
    errors.push(`${file}: JSONを読み込めません: ${error.message}`);
    return null;
  }
}

function readText(file) {
  try {
    return fs.readFileSync(path.join(root, file), 'utf8');
  } catch (error) {
    errors.push(`${file}: ファイルを読み込めません: ${error.message}`);
    return '';
  }
}

function stripYamlScalar(value) {
  return String(value).trim().replace(/\s+#.*$/, '').replace(/^['"]|['"]$/g, '');
}

function parseSimpleYaml(text) {
  const data = {};
  const lines = text.split(/\r?\n/);
  let currentKey = null;

  for (const line of lines) {
    if (!line.trim() || line.trimStart().startsWith('#')) {
      continue;
    }

    const nestedMatch = line.match(/^\s{2}([A-Za-z0-9_-]+):\s*(.*)$/);
    if (nestedMatch && currentKey) {
      if (!data[currentKey] || typeof data[currentKey] !== 'object') {
        data[currentKey] = {};
      }
      data[currentKey][nestedMatch[1]] = stripYamlScalar(nestedMatch[2]);
      continue;
    }

    const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!match) {
      continue;
    }

    currentKey = match[1];
    data[currentKey] = match[2] === '' ? {} : stripYamlScalar(match[2]);
  }

  return data;
}

function parseFrontMatter(file) {
  const text = readText(file);
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) {
    errors.push(`${file}: front matterが見つかりません`);
    return {};
  }
  return parseSimpleYaml(match[1]);
}

function repoInfoFromUrl(url) {
  const normalized = String(url || '').replace(/^git\+/, '').replace(/\/$/, '');
  const match = normalized.match(/github\.com[:/]([^/]+)\/([^/]+)$/);
  if (!match) {
    errors.push(`repository.urlからowner/repoを抽出できません: ${url}`);
    return { owner: '', name: '' };
  }
  return {
    owner: match[1],
    name: match[2].replace(/\.git$/, ''),
  };
}

function expectEqual(label, actual, expected) {
  if (actual !== expected) {
    errors.push(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function expectPackage(file, pkg, expected) {
  if (!pkg) return;
  expectEqual(`${file}.name`, pkg.name, expected.name);
  expectEqual(`${file}.version`, pkg.version, expected.version);
  expectEqual(`${file}.description`, pkg.description, expected.description);
  expectEqual(`${file}.author`, pkg.author, expected.author);
  expectEqual(`${file}.license`, pkg.license, expected.license);
  expectEqual(`${file}.homepage`, pkg.homepage, expected.homepage);
  expectEqual(`${file}.repository.type`, pkg.repository && pkg.repository.type, 'git');
  expectEqual(`${file}.repository.url`, pkg.repository && pkg.repository.url, expected.repositoryUrl);
  expectEqual(`${file}.bugs.url`, pkg.bugs && pkg.bugs.url, expected.bugsUrl);
  expectEqual(`${file}.scripts.check:metadata`, pkg.scripts && pkg.scripts['check:metadata'], 'node scripts/check-metadata-consistency.js');
}

const bookConfig = readJson('book-config.json');
const pkg = readJson('package.json');
const simplePkg = readJson('package-simple.json');
const lock = readJson('package-lock.json');
const rootConfig = parseSimpleYaml(readText('_config.yml'));
const docsConfig = parseSimpleYaml(readText('docs/_config.yml'));
const indexFrontMatter = parseFrontMatter('docs/index.md');

if (bookConfig) {
  const book = bookConfig.book || {};
  const repoUrl = (book.repository && book.repository.url) || (bookConfig.repository && bookConfig.repository.url);
  const repo = repoInfoFromUrl(repoUrl);
  const pagesUrl = `https://${repo.owner}.github.io/${repo.name}/`;
  const expected = {
    name: repo.name,
    version: book.version,
    description: book.description,
    author: book.author && book.author.name,
    license: book.license || bookConfig.license,
    homepage: pagesUrl,
    repositoryUrl: `git+https://github.com/${repo.owner}/${repo.name}.git`,
    bugsUrl: `https://github.com/${repo.owner}/${repo.name}/issues`,
  };

  expectPackage('package.json', pkg, expected);
  expectPackage('package-simple.json', simplePkg, expected);

  if (lock) {
    expectEqual('package-lock.json.name', lock.name, expected.name);
    expectEqual('package-lock.json.version', lock.version, expected.version);
    expectEqual('package-lock.json.packages[""].name', lock.packages && lock.packages[''] && lock.packages[''].name, expected.name);
    expectEqual('package-lock.json.packages[""].version', lock.packages && lock.packages[''] && lock.packages[''].version, expected.version);
    expectEqual('package-lock.json.packages[""].license', lock.packages && lock.packages[''] && lock.packages[''].license, expected.license);
  }

  expectEqual('_config.yml.title', rootConfig.title, book.title);
  expectEqual('_config.yml.description', rootConfig.description, expected.description);
  expectEqual('_config.yml.author.name', rootConfig.author && rootConfig.author.name, expected.author);
  expectEqual('_config.yml.version', rootConfig.version, expected.version);
  expectEqual('_config.yml.baseurl', rootConfig.baseurl, `/${repo.name}`);
  expectEqual('_config.yml.url', rootConfig.url, `https://${repo.owner}.github.io`);
  expectEqual('_config.yml.repository.github', rootConfig.repository && rootConfig.repository.github, `${repo.owner}/${repo.name}`);

  expectEqual('docs/_config.yml.title', docsConfig.title, book.title);
  expectEqual('docs/_config.yml.description', docsConfig.description, expected.description);
  expectEqual('docs/_config.yml.author', docsConfig.author, expected.author);
  expectEqual('docs/_config.yml.version', docsConfig.version, expected.version);
  expectEqual('docs/_config.yml.baseurl', docsConfig.baseurl, `/${repo.name}`);
  expectEqual('docs/_config.yml.url', docsConfig.url, `https://${repo.owner}.github.io`);
  expectEqual('docs/_config.yml.repository.github', docsConfig.repository && docsConfig.repository.github, `${repo.owner}/${repo.name}`);

  expectEqual('docs/index.md.title', indexFrontMatter.title, book.title);
  expectEqual('docs/index.md.description', indexFrontMatter.description, expected.description);
  expectEqual('docs/index.md.author', indexFrontMatter.author, expected.author);
  expectEqual('docs/index.md.version', indexFrontMatter.version, expected.version);
}

if (errors.length) {
  console.error('Metadata consistency check failed:');
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log('Metadata consistency check passed.');

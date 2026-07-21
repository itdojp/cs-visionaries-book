const path = require('path');

module.exports = {
  // Keep downloaded browser artifacts inside this checkout. The directory is
  // ignored via .codex-local/ and is recreated by npm ci in CI.
  cacheDirectory: path.join(__dirname, '.codex-local', 'cache', 'puppeteer')
};

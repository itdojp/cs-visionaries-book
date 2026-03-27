# Template Integration Checklist

> ⚠️ **Note**: This checklist targets the single-repository book template workflow (build output published via GitHub Pages).
> ⚠️ **Legacy / 参考のみ**: この文書は template 由来の移行チェックリストです。現行 repo の reader-facing な正本や運用手順の確認には使わず、`README.md`、`QUICK-START.md`、`REPOSITORY-ACCESS-GUIDE.md`、`docs/index.md` を優先してください。

Use this checklist to track your template integration progress.

## 📋 Integration Status

Copy this section to your book project's README.md to track integration progress:

```markdown
**Template Status**: ✅ book-publishing-template latest version integrated  
**Last Updated**: YYYY-MM-DD  
```

## ✅ Core Integration Steps

- [ ] **GitHub Actions**: Latest workflow configurations
  - [ ] Build and deploy workflow (.github/workflows/build.yml)
  - [ ] GitHub Pages enabled (Settings > Pages)
  - [ ] No tokens required - simplified deployment
  
- [ ] **Build System**: Simplified build with content filtering
  - [ ] Simple build script (`scripts/build-simple.js`)
  - [ ] Automatic draft filtering (*.draft.md)
  - [ ] Private content filtering (<!-- private: -->)
  - [ ] Output to docs/ folder for GitHub Pages
  
- [ ] **Configuration**: Basic book configuration
  - [ ] Book configuration (`book-config.json`)
  - [ ] Easy setup completed (`node easy-setup.js`)
  - [ ] package.json configured
  
- [ ] **Documentation**: Quick start guides
  - [ ] QUICK-START.md reviewed
  - [ ] README.md customized for your book
  - [ ] Basic content structure created
  
- [ ] **Security**: Content protection
  - [ ] Private content filtering verified
  - [ ] Repository visibility set (Private/Public)
  - [ ] .gitignore properly configured

## 📝 Additional Recommended Steps

- [ ] Test build process locally (`npm run build`)
- [ ] Test local preview (`npm run preview`)
- [ ] Verify draft filtering works
- [ ] Review and customize content structure
- [ ] Update book metadata in `book-config.json`

## 🚀 Post-Integration

- [ ] First successful deployment completed
- [ ] GitHub Pages site accessible
- [ ] Content validation passing
- [ ] Team trained on new workflow

## 📖 Template Usage Example

Add this to your book project's README.md:

```markdown
# Your Book Title

Your book description here.

**Template Status**: ✅ book-publishing-template latest version integrated  
**Last Updated**: YYYY-MM-DD

## Template Integration Complete

✅ **GitHub Actions**: Simple automated deployment  
✅ **Build System**: Fast, lightweight build with content filtering  
✅ **Configuration**: Easy setup with interactive wizard  
✅ **Documentation**: Quick start guides  
✅ **Security**: Automatic private content protection  

## Quick Start

Follow the [Quick Start](QUICK-START.md) to begin writing.
```

## 📚 Documentation References

- [Quick Start](QUICK-START.md) - Quick local development and preview setup
- [Template Guide](book-template-guide.md) - Template overview (features, structure, and general usage)
- [GitHub Pages Setup](GITHUB-PAGES-SETUP.md) - GitHub Pages deployment and setup
- [Changelog](CHANGELOG.md) - Template updates and integration tracking

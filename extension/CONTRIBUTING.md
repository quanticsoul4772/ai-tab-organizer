# Contributing to AI Tab Organizer

## Development Workflow

### Before Committing

Run these commands to ensure code quality:

```bash
# 1. Format code
npm run format

# 2. Run linter
npm run lint

# 3. Check TypeScript types (IMPORTANT!)
npm run type-check

# 4. Run tests
npm test
```

### Pre-commit Hooks

This project uses Husky and lint-staged for automated checks:

**Automatic checks on commit:**
- ✅ ESLint (with auto-fix)
- ✅ Prettier formatting
- ✅ Conventional commit message format

**Manual checks (run before committing):**
- ⚠️ TypeScript type checking (`npm run type-check`)
- ⚠️ Tests (`npm test`)

> **Note**: TypeScript type checking is not automated in pre-commit hooks due to 300+ pre-existing type errors in test files. We're working on fixing these incrementally. Please ensure your changes don't introduce new type errors by running `npm run type-check` manually.

### Build and Test

```bash
# Build the extension
npm run build

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

### Code Quality Standards

1. **TypeScript**: All new code should be properly typed (no `any` types unless absolutely necessary)
2. **ESLint**: Code must pass linting with 0 errors
3. **Prettier**: Code must be formatted according to `.prettierrc.json`
4. **Tests**: New features should include tests
5. **Commits**: Follow [Conventional Commits](https://www.conventionalcommits.org/) format

### Common Commands

```bash
# Start development server
npm run dev

# Fix linting issues
npm run lint:fix

# Check formatting without fixing
npm run format:check
```

## Project Structure

```
extension/
├── src/
│   ├── components/     # React components
│   ├── services/       # Business logic
│   ├── types/          # TypeScript type definitions
│   ├── utils/          # Utility functions
│   ├── schemas/        # Zod validation schemas
│   └── popup.tsx       # Main entry point
├── public/
│   ├── manifest.json   # Chrome extension manifest
│   ├── background.js   # Background service worker
│   └── content-extractor.js  # Content extraction script
└── dist/              # Build output (gitignored)
```

## Troubleshooting

### TypeScript Errors

If you see TypeScript errors, check:
1. Are you using the correct import paths? (`@components`, `@services`, `@types`, etc.)
2. Are you using `chrome.tabs.Tab` instead of custom Tab interfaces?
3. Are you properly typing error catches? (`error instanceof Error`)

### Build Errors

If the build fails:
1. Delete `node_modules` and `package-lock.json`
2. Run `npm install`
3. Try building again with `npm run build`

### Test Failures

If tests fail:
1. Ensure you're in the `extension/` directory
2. Check that all dependencies are installed
3. Clear test cache: `npx vitest run --clearCache`

# Development Guide

This guide covers everything you need to know to develop and contribute to AI Tab Organizer.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Initial Setup](#initial-setup)
- [Development Workflow](#development-workflow)
- [Project Structure](#project-structure)
- [Code Style](#code-style)
- [Testing](#testing)
- [Debugging](#debugging)
- [Building](#building)
- [Common Tasks](#common-tasks)

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js**: v18 or higher ([Download](https://nodejs.org/))
- **npm**: v9 or higher (comes with Node.js)
- **Git**: For version control ([Download](https://git-scm.com/))
- **Chrome**: Latest version for testing

Verify installations:

```bash
node --version  # Should be v18+
npm --version   # Should be v9+
git --version   # Any recent version
```

## Initial Setup

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/ai-tab-organizer.git
cd ai-tab-organizer
```

### 2. Install Dependencies

```bash
cd extension
npm install
```

This will install all dependencies defined in `package.json`.

### 3. Get API Key

You'll need a Claude API key for testing:

1. Visit [Anthropic Console](https://console.anthropic.com)
2. Sign up or log in
3. Generate an API key
4. Keep it secure (never commit it!)

### 4. Build the Extension

```bash
npm run build
```

### 5. Load Extension in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top-right corner)
3. Click "Load unpacked"
4. Select the `extension/dist` folder
5. The extension should now appear in your toolbar

## Development Workflow

### Development Mode

For active development with file watching:

```bash
npm run dev
```

This starts Vite in watch mode. Changes to source files will trigger rebuilds, but you'll need to manually reload the extension in Chrome.

### Reload Extension

After making changes:

1. Go to `chrome://extensions/`
2. Click the reload icon on your extension card
3. Or use keyboard shortcut: `Ctrl+R` (Windows/Linux) or `Cmd+R` (Mac) while focused on extensions page

### Quick Reload Workflow

For faster iteration:

1. Make code changes
2. Wait for `npm run dev` to rebuild (~500ms)
3. Go to extension popup and close/reopen it
   - For popup changes: Just close and reopen
   - For background worker changes: Reload extension

## Project Structure

```
extension/
├── src/
│   ├── components/       # React UI components
│   ├── services/         # Business logic & API calls
│   ├── types/            # TypeScript type definitions
│   ├── utils/            # Helper functions
│   ├── popup.tsx         # Main React entry point
│   └── popup.css         # Global styles
├── background.js         # Background service worker
├── manifest.json         # Chrome extension manifest
├── popup.html            # Extension popup HTML
├── vite.config.ts       # Vite build configuration
├── tsconfig.json        # TypeScript configuration
└── package.json         # Dependencies & scripts
```

### Import Paths

Use path aliases for cleaner imports:

```typescript
// Good (with path aliases)
import { Tab } from '@types';
import { storage } from '@utils/storage';
import { claudeApi } from '@services/claudeApi';
import { TabList } from '@components/TabList';

// Avoid (relative paths)
import { Tab } from '../types';
import { storage } from '../utils/storage';
```

Path aliases are configured in:
- `tsconfig.json` - For TypeScript
- `vite.config.ts` - For Vite bundler

## Code Style

### TypeScript

- Use strict mode (enabled in `tsconfig.json`)
- Always define types for function parameters and returns
- Use interfaces for object shapes
- Avoid `any` type

```typescript
// Good
interface TabProps {
  tabs: Tab[];
  onTabClick: (tabId: number) => void;
}

function handleTab(tab: Tab): void {
  console.log(tab.title);
}

// Avoid
function handleTab(tab: any) {
  console.log(tab.title);
}
```

### React Components

- Use functional components with hooks
- Extract reusable components
- Use TypeScript interfaces for props
- Add JSDoc comments for complex components

```typescript
interface SettingsPanelProps {
  apiKey: string;
  onApiKeyChange: (key: string) => void;
  onSave: () => void;
}

/**
 * Settings panel component for API key configuration
 */
export function SettingsPanel({
  apiKey,
  onApiKeyChange,
  onSave
}: SettingsPanelProps) {
  return (
    // Component JSX
  );
}
```

### Naming Conventions

- **Components**: PascalCase (`SettingsPanel`, `TabList`)
- **Files**: Match component name (`SettingsPanel.tsx`)
- **Functions**: camelCase (`handleTabClick`, `loadApiKey`)
- **Constants**: UPPER_SNAKE_CASE (`API_CONFIG`, `MAX_RETRIES`)
- **Interfaces**: PascalCase (`Tab`, `CategoryResponse`)

### File Organization

- One component per file
- Group related utilities in service files
- Export from index files when appropriate
- Keep files under 200 lines

## Testing

### Manual Testing

1. **Build the extension**
   ```bash
   npm run build
   ```

2. **Test scenarios:**
   - Open 10-15 tabs across different categories
   - Click extension icon
   - Enter API key (first time)
   - Verify tabs are categorized correctly
   - Test tab switching (click tab)
   - Test tab closing (click X)
   - Test settings (click settings icon)

3. **Error scenarios:**
   - Invalid API key
   - Network offline
   - Empty tabs
   - 100+ tabs (performance)

### Console Debugging

#### Popup Console

```bash
1. Right-click extension popup
2. Select "Inspect"
3. Check Console tab for errors
```

#### Background Worker Console

```bash
1. Go to chrome://extensions/
2. Find your extension
3. Click "Inspect views: service worker"
4. Check Console tab
```

### Testing API Changes

1. Modify `background.js`
2. Rebuild: `npm run build`
3. Reload extension in Chrome
4. Test categorization
5. Check background console for logs

## Debugging

### Common Issues

#### Extension Not Loading

```bash
# Check build output
npm run build

# Verify dist/ folder exists
ls -la extension/dist/

# Check for errors in chrome://extensions/
```

#### Popup Not Opening

```bash
# Check manifest.json is copied
ls extension/dist/manifest.json

# Check popup.html exists
ls extension/dist/popup.html

# Inspect popup for errors
Right-click popup → Inspect
```

#### Categorization Fails

```bash
# Check background worker console
chrome://extensions/ → Inspect service worker

# Common issues:
- Invalid API key
- Network error
- Rate limit exceeded
```

### Debug Logging

Add console logs for debugging:

```typescript
// Popup (popup.tsx)
console.log('[Popup] Tabs loaded:', tabs.length);
console.log('[Popup] Categorization result:', categorized);
console.error('[Popup] Error:', error);

// Background (background.js)
console.log('[BG] API request started');
console.log('[BG] Response received:', data);
console.error('[BG] API error:', error);
```

### Chrome DevTools Tips

1. **Network Tab**: Monitor API calls
2. **Application Tab**: View `chrome.storage.local`
3. **Sources Tab**: Set breakpoints in code
4. **Performance Tab**: Profile extension performance

## Building

### Development Build

```bash
npm run dev
```

- Fast rebuild (~500ms)
- Includes source maps
- Optimized for debugging

### Production Build

```bash
npm run build
```

- Minified & optimized
- No source maps
- Smaller bundle size
- Ready for distribution

### Build Output

```
dist/
├── popup.html              # Extension popup
├── manifest.json           # Extension manifest
├── background.js           # Service worker
└── assets/
    ├── popup-[hash].js     # Bundled React app (~146 KB)
    └── popup-[hash].css    # Bundled styles (~3 KB)
```

## Common Tasks

### Adding a New Component

1. **Create component file**
   ```bash
   touch extension/src/components/MyComponent.tsx
   ```

2. **Define component**
   ```typescript
   import React from 'react';

   interface MyComponentProps {
     // Props definition
   }

   export function MyComponent({ }: MyComponentProps) {
     return (
       // JSX
     );
   }
   ```

3. **Import and use**
   ```typescript
   import { MyComponent } from '@components/MyComponent';
   ```

### Adding a New Service

1. **Create service file**
   ```bash
   touch extension/src/services/myService.ts
   ```

2. **Define service**
   ```typescript
   export const myService = {
     async doSomething(): Promise<void> {
       // Implementation
     }
   };
   ```

3. **Import and use**
   ```typescript
   import { myService } from '@services/myService';
   ```

### Adding a New Type

1. **Edit types file**
   ```bash
   # Add to extension/src/types/index.ts
   ```

2. **Define interface**
   ```typescript
   export interface MyType {
     id: number;
     name: string;
   }
   ```

3. **Import and use**
   ```typescript
   import type { MyType } from '@types';
   ```

### Modifying the Background Worker

1. **Edit background.js**
   ```bash
   # Edit extension/background.js
   ```

2. **Rebuild**
   ```bash
   npm run build
   ```

3. **Reload extension**
   ```bash
   # chrome://extensions/ → Reload button
   ```

4. **Test changes**
   ```bash
   # Inspect service worker console
   ```

### Updating Dependencies

```bash
# Check for outdated packages
npm outdated

# Update specific package
npm update package-name

# Update all packages (careful!)
npm update

# Install new dependency
npm install package-name

# Install dev dependency
npm install -D package-name
```

### Modifying Manifest

1. **Edit manifest.json**
   ```bash
   # Edit extension/manifest.json
   ```

2. **Rebuild**
   ```bash
   npm run build
   ```

3. **Reload extension**
   - Chrome will prompt to accept new permissions if changed

### Changing API Configuration

1. **Edit background.js**
   ```javascript
   const API_CONFIG = {
     MODEL: 'claude-3-5-sonnet-20241022',  // Change model
     TIMEOUT_MS: 30000,                    // Change timeout
     MAX_RETRIES: 2,                       // Change retries
   };
   ```

2. **Rebuild and test**

## Performance Tips

### Bundle Size Optimization

- Import only what you need
- Use dynamic imports for large dependencies
- Check bundle analysis: `npm run build -- --mode=analyze`

### React Performance

- Use `React.memo()` for expensive components
- Avoid inline function definitions in props
- Use `useCallback` and `useMemo` appropriately

### API Optimization

- Batch requests when possible
- Implement caching for repeated queries
- Use exponential backoff for retries

## Git Workflow

### Branch Strategy

```bash
# Create feature branch
git checkout -b feature/my-feature

# Make changes and commit
git add .
git commit -m "Add my feature"

# Push to remote
git push origin feature/my-feature

# Create pull request on GitHub
```

### Commit Messages

Follow conventional commits:

```bash
feat: add tab grouping support
fix: resolve categorization timeout issue
docs: update DEVELOPMENT.md
refactor: extract storage logic to utils
test: add unit tests for claudeApi
chore: update dependencies
```

## Resources

### Documentation

- [Chrome Extension API](https://developer.chrome.com/docs/extensions/reference/)
- [React Documentation](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Vite Guide](https://vitejs.dev/guide/)
- [Anthropic API Docs](https://docs.anthropic.com/)

### Tools

- [Chrome Extension DevTools](https://chrome.google.com/webstore/detail/chrome-extension-source-v/jifpbeccnghkjeaalbbjmodiffmgedin)
- [React DevTools](https://chrome.google.com/webstore/detail/react-developer-tools/fmkadmapgofadopljbjfkapdkoienihi)
- [TypeScript Playground](https://www.typescriptlang.org/play)

### Community

- [GitHub Discussions](https://github.com/yourusername/ai-tab-organizer/discussions)
- [GitHub Issues](https://github.com/yourusername/ai-tab-organizer/issues)

## Getting Help

If you encounter issues:

1. Check this documentation
2. Search [existing issues](https://github.com/yourusername/ai-tab-organizer/issues)
3. Check console for errors
4. Create a new issue with:
   - Clear description
   - Steps to reproduce
   - Error messages
   - Environment info

## Next Steps

- Read [ARCHITECTURE.md](ARCHITECTURE.md) for system design
- Read [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidelines
- Check [GitHub Issues](https://github.com/yourusername/ai-tab-organizer/issues) for tasks to work on

Happy coding!

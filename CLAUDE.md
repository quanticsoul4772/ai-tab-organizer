# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI Tab Organizer is a Chrome browser extension that automatically categorizes open tabs using Claude AI. The project has two components:

1. **Extension** (primary): Chrome extension with React UI that works standalone using Claude API
2. **Backend** (legacy/optional): Express server originally planned for MCP integration (currently unused)

**Critical Architecture Note**: The extension operates **standalone** by calling the Anthropic API directly from the browser via a background service worker. The backend server is not actively used in the current workflow but remains for potential future MCP integration.

## Development Commands

### Extension Development

```bash
# Install dependencies
cd extension
npm install

# Build for production (creates extension/dist/)
npm run build

# Development mode with hot reload
npm run dev

# Run tests with Vitest
npm test

# Watch mode for tests
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test path/to/test.test.ts
```

After building, load the extension in Chrome:
1. Navigate to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `extension/dist` folder

### Backend (Optional - Currently Unused)

```bash
cd backend
npm install
npm start        # Production on port 3000
npm run dev      # Development with auto-restart
```

Health check: `http://localhost:3000/health`

## Build System Architecture

**Bundler**: Vite 5.x with custom plugin for Chrome extension support

**Custom Vite Plugin** (`extension/vite.config.ts:10-28`):
- Copies `manifest.json`, `background.js`, and `content-extractor.js` to `dist/` after build
- Required because Chrome extensions need these files at specific locations
- Runs in `closeBundle` hook to ensure copying happens after Vite finishes

**Path Aliases** (configured in both `vite.config.ts` and `tsconfig.json`):
- `@components/*` → `src/components/*`
- `@services/*` → `src/services/*`
- `@types` → `src/types`
- `@utils/*` → `src/utils/*`

**Build Output** (`extension/dist/`):
- `popup.html` - Entry point
- `manifest.json` - Extension manifest (copied)
- `background.js` - Service worker (copied)
- `content-extractor.js` - Content extraction script (copied)
- `assets/popup-[hash].js` - Bundled React app
- `assets/popup-[hash].css` - Bundled styles

## Chrome Extension Architecture

### Three-Component System

**1. Popup UI** (`popup.html` + `popup.tsx`):
- React 18 application with TypeScript
- Five view modes: Search, Categories, Jira, Duplicates, Sessions
- Communicates with background worker via `chrome.runtime.sendMessage()`
- Cannot make fetch() requests directly (Chrome security restriction)

**2. Background Service Worker** (`background.js`):
- Runs in separate execution context (Manifest v3 requirement)
- Handles all API calls to Anthropic Claude
- Implements retry logic (max 2 retries with exponential backoff)
- Timeout: 30 seconds per request with AbortController
- Auto-indexes tabs on create/update/remove events for search feature
- Listens for messages: `categorize`, `summarizeTab`, `summarizeCategory`, `extractContent`

**3. Content Extractor** (`content-extractor.js`):
- Injected into tab pages by background worker via `chrome.scripting.executeScript()`
- Extracts page content: headings, text, meta descriptions
- Runs in page context (can access DOM)
- Used for tab summaries and content-aware search

### Communication Pattern

```
Popup (popup.tsx)
    ↓ chrome.runtime.sendMessage({action, ...params})
Background Worker (background.js)
    ↓ fetch() with AbortController timeout
Anthropic Claude API (claude-3-5-sonnet-20241022)
    ↓ JSON response
Background Worker processes response
    ↓ chrome.runtime.sendMessage response
Popup receives data and updates UI
```

### Extension Manifest Permissions

```json
{
  "manifest_version": 3,
  "permissions": [
    "tabs",        // Read tab information (titles, URLs)
    "storage",     // Store API key and settings in chrome.storage.local
    "scripting",   // Execute content-extractor.js in tab pages
    "activeTab"    // Interact with current active tab
  ],
  "host_permissions": [
    "https://api.anthropic.com/*",  // Call Anthropic API from background
    "<all_urls>"                     // Access content from any website for extraction
  ]
}
```

## Key Architectural Patterns

### Pattern 1: Service Worker for API Calls
- Chrome extensions can't make fetch() from popup context (CSP restrictions)
- Solution: Background service worker acts as proxy
- All API calls route through `background.js` which has `host_permissions`

### Pattern 2: Token Optimization
- Sends tab **indices** instead of full tab objects to Claude API
- Example: `[0, 1, 2]` instead of `[{id, url, title}, ...]`
- Reduces token usage by ~70% for large tab sets
- Background worker maintains index-to-tab mapping

### Pattern 3: Tab Indexing for Performance
- Background worker auto-indexes tabs with content on creation/update
- Stores: tab ID, title, URL, content hash, first 5000 chars
- Index expires after 24 hours or if URL changes
- Enables instant client-side search without API calls

### Pattern 4: Storage-Based Configuration
- API key stored in `chrome.storage.local` (encrypted by Chrome)
- Summary cache with TTL to reduce API calls
- Jira settings persistence across sessions
- Sessions stored with metadata (tab count, Jira tickets, workspace categories)
- Group collapse states persist across browser restarts

### Pattern 5: Event-Driven Tab Management
- Listeners on `chrome.tabs.onCreated`, `onUpdated`, `onRemoved`
- Listeners on `chrome.runtime.onStartup`, `onInstalled`
- Staggered delays prevent overwhelming browser with concurrent operations

## Service Layer Architecture

All business logic is in `extension/src/services/`:

**Core Services**:
- `claudeApi.ts` - API wrapper, sends messages to background worker
- `tabManager.ts` - Tab operations (`getAllTabs`, `switchToTab`, `closeTab`)
- `sessionManager.ts` - Session save/restore with workspace detection
- `summaryService.ts` - Content summarization with TTL caching
- `searchService.ts` - Full-text search in indexed tabs
- `duplicateDetectionService.ts` - URL/content/semantic duplicate detection

**Jira Integration** (`services/jira/` folder):
- `urlParser.ts` - Parse Jira/Confluence URLs (Cloud, Server, Data Center)
- `titleParser.ts` - Extract issue keys, summaries, status from titles
- `jiraSearchEnhancer.ts` - Pattern matching for "ENG-123", "eng 123", "123"
- `atlassianDetectionService.ts` - Group tickets by project, sort by number

**Test Coverage**:
- 788 passing tests with 71% code coverage
- Components: TabSearch, DuplicateDetection, CategoryView, TabList, SettingsPanel, and more
- Services: Jira, search, summary, session management
- Utils: storage, groupDefaults, indicators, tabManager
- Performance tests validate under 1ms for 100 tabs, under 1s for 1000 tabs
- Run with `npm test` from `extension/` directory

## Component Structure

**Main Component**: `popup.tsx` (290 lines)
- Manages app state: tabs, categories, loading, errors
- Renders different views based on `currentView` state
- Handles API key validation and storage

**Sub-components** (`src/components/`):
- `CategoryView.tsx` - Display categorized tabs with summaries
- `TabSearch.tsx` - Search interface with Jira pattern support
- `DuplicateDetection.tsx` - Find duplicate tabs (URL/content/semantic)
- `JiraView.tsx` - Jira-specific organization by project
- `SessionsView.tsx` - Session management with workspace filtering
- `SettingsPanel.tsx` - Configuration UI (API key, Jira mode)
- `CategorySummaryCard.tsx` - Category-level summaries
- `SummaryCard.tsx` - Individual tab summaries
- `TabList.tsx` - Reusable tab list renderer

## Session Management Architecture

**Purpose**: Save and restore browser sessions with workspace-aware organization

**Key Components**:
- `sessionManager.ts` (`extension/src/services/sessionManager.ts:1-331`)
- `SessionsView.tsx` (`extension/src/components/SessionsView.tsx`)
- `session.ts` types (`extension/src/types/session.ts`)

**Core Functionality**:

1. **Session Save** (`saveCurrentSession`):
   - Captures all open tabs via `chrome.tabs.query({})`
   - Converts to `SessionTab` objects (URL, title, pinned, groupId)
   - Uses `AtlassianDetectionService` to detect Jira tickets
   - Extracts workspace categories (Jira project keys)
   - Stores in `chrome.storage.local` with metadata

2. **Session Restore** (`restoreSession`):
   - Retrieves session from storage by ID
   - Optional: Closes existing tabs (keeps pinned)
   - Opens all session tabs via `chrome.tabs.create()`
   - Updates last modified timestamp

3. **Workspace Detection**:
   - Uses existing Jira detection service
   - Extracts unique Jira ticket keys (e.g., "ENG-123", "APPS-456")
   - Groups by project key (e.g., "ENG", "APPS")
   - Stores as `categories` array in session metadata

4. **Import/Export**:
   - Export format: JSON with version, timestamp, session data
   - Import: Validates format, generates new IDs to avoid conflicts
   - File naming: `session-name-timestamp.json` or `sessions-backup-timestamp.json`

**Storage Schema**:
```typescript
{
  sessions: {
    "session_123_abc": {
      id: string,
      name: string,
      description?: string,
      created: number,
      lastModified: number,
      tabs: SessionTab[],
      metadata: {
        tabCount: number,
        jiraTickets?: string[],
        categories?: string[]
      }
    }
  }
}
```

**UI Features** (SessionsView.tsx):
- Workspace filter pills (e.g., "APPS (3)", "ENG (5)")
- Session cards with workspace badges
- Import/Export buttons
- Keyboard shortcuts
- Restore modes (add to current / replace all)
- Inline rename and delete

**Keyboard Shortcuts**:
- Cmd/Ctrl + S: Save current session
- Cmd/Ctrl + E: Export all sessions
- Cmd/Ctrl + I: Import sessions
- Escape: Close dialogs

## Data Flow for Tab Categorization

1. User opens extension popup → `popup.tsx` loads
2. Extension queries all Chrome tabs via `chrome.tabs.query({})`
3. Check for API key in `chrome.storage.local`
4. If Jira Smart Mode enabled: Extract Jira/Confluence tabs via `atlassianDetectionService`
5. Send remaining tabs to background worker: `chrome.runtime.sendMessage({action: 'categorize', tabs, apiKey})`
6. Background worker formats tabs for Claude API (uses indices for token optimization)
7. Background worker calls `https://api.anthropic.com/v1/messages` with retry logic
8. Claude returns JSON: `{"Development": [0, 2], "Work": [1, 3], ...}`
9. Background worker maps indices back to full Tab objects
10. Popup receives categorized tabs and renders `CategoryView`

## API Integration Details

**Anthropic API Configuration**:
- Base URL: `https://api.anthropic.com/v1/messages`
- Model: `claude-3-5-sonnet-20241022`
- Authentication: `x-api-key` header
- CORS header: `anthropic-dangerous-direct-browser-access: true` (required for browser)
- Timeout: 30 seconds with AbortController
- Retry logic: Max 2 retries with exponential backoff (1s, 2s)

**Message Format**:
```javascript
{
  model: "claude-3-5-sonnet-20241022",
  max_tokens: 1024,
  messages: [{
    role: "user",
    content: "Categorize these tabs: ..."
  }]
}
```

## Testing

**Framework**: Vitest 3.2.4

**Test Location**: `extension/src/services/jira/__tests__/`

**Test Files**:

Jira Services:
- `urlParser.test.ts` - 24 tests for URL parsing
- `titleParser.test.ts` - 41 tests for title parsing
- `jiraSearchEnhancer.test.ts` - 30 tests for search patterns
- `atlassianDetectionService.test.ts` - 20 tests for detection/grouping
- `performance.test.ts` - 8 tests for performance benchmarks

Utils:
- `storage.test.ts` - 15 tests for storage layer
- `groupDefaults.test.ts` - 8 tests for smart collapse logic
- `indicators.test.ts` - 13 tests for visual indicators
- `tabManager.test.ts` - 3 tests for tab operations

**Running Tests**:
```bash
cd extension
npm test                          # Run all tests once
npm run test:watch                # Watch mode for development
npm run test:coverage             # Generate coverage report
npm test indicators.test.ts       # Run specific test file
```

## Debugging

**Background Worker Console**:
- Right-click extension icon → "Inspect" or "Manage Extension" → "Inspect views: background page"
- Shows API calls, errors, retry attempts

**Popup Console**:
- Right-click popup → "Inspect"
- Shows React component lifecycle, state changes

**Common Issues**:

*Extension not loading*:
- Verify `npm run build` completed successfully
- Check `extension/dist/manifest.json` exists
- Look for errors in `chrome://extensions/` page

*Categorization fails*:
- Check background worker console for API errors
- Verify API key is valid in chrome.storage.local
- Check for CORS/network errors
- Verify Anthropic account has available credits

*Tab indexing not working*:
- Check background worker console for extraction errors
- Verify `content-extractor.js` copied to dist/
- Check for CSP restrictions on specific domains

## Current vs. Future Architecture

**Current (v0.1)**:
```
Extension Popup → Background Worker → Anthropic API (standalone)
```

**Future (planned)**:
```
Extension Popup → Backend Server → MCP unified-thinking tool → Anthropic API
```

The backend server exists for this future integration but is not currently part of the active workflow. All development should focus on the extension component.

## Tech Stack Summary

**Extension**:
- React 18.2.0 + TypeScript 5.3.0
- Vite 5.0.0 (bundler)
- Tailwind CSS 3.3.6 + PostCSS 8.4.32
- Vitest 3.2.4 (testing)
- Chrome Extension API (Manifest V3)
- Anthropic Claude API (claude-3-5-sonnet-20241022)

**Backend** (unused):
- Node.js with ES modules
- Express 4.18.2
- @modelcontextprotocol/sdk 0.5.0

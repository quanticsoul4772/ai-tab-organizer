# AI Tab Organizer

A Chrome browser extension that automatically categorizes open tabs using Claude AI.

![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![React](https://img.shields.io/badge/React-18-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## Overview

AI Tab Organizer helps you manage browser tab overload by automatically grouping tabs into categories like Work, Development, Shopping, Social, and more. It includes specialized support for Jira and Confluence, powerful search capabilities, and duplicate detection.

**Version**: 0.1.0
**Status**: Active Development

## Features

### Core Capabilities
- Automatic tab categorization using Claude AI
- Session management with workspace awareness
- Collapsible category groups with smart defaults
- Visual status indicators with activity tracking
- Visual density modes (compact, normal, spacious)
- Tab search with content-aware indexing
- Duplicate tab detection (URL, content, semantic)
- AI-powered tab and category summaries
- Real-time tab management (switch, close, organize)
- Privacy-first design (API key stored locally)

### Visual Status Indicators
- Color-coded activity dots for each tab
  - Green: Active (accessed within last 5 minutes)
  - Yellow: Idle (5-30 minutes since last access)
  - Red: Forgotten (30+ minutes of inactivity)
  - Gray: Suspended (tab discarded by Chrome to save memory)
- Badge overlays for additional context
  - Pinned indicator for pinned tabs
  - Duplicate count for multiple instances
  - Jira status badges showing ticket state as plain text (e.g., "Closed", "In Progress", "To Do")
- Persistent activity tracking across browser sessions
- Real-time updates as tabs are accessed

### Jira and Confluence Integration
- Auto-grouping of Jira tickets by project
- Confluence pages grouped by space
- Smart search patterns (ENG-123, eng 123, or just 123)
- Plain text status badges extracted from Jira pages (Blocked, In Progress, Closed, To Do, etc.)
- Automatic status extraction from Jira Cloud, Server, and Data Center
- Ticket sorting by number
- Works with Cloud, Server, and Data Center versions
- High performance (100 tabs in under 100ms)

### Session Management
- **Save and restore** - Capture browser state as named sessions
- **Workspace awareness** - Auto-detects Jira projects in sessions
- **Workspace filtering** - Filter sessions by project (e.g., "APPS", "ENG")
- **Import/Export** - Backup sessions to JSON files
- **Keyboard shortcuts**:
  - `Cmd/Ctrl + S` - Save current session
  - `Cmd/Ctrl + E` - Export all sessions
  - `Cmd/Ctrl + I` - Import sessions
- **Session actions**:
  - Restore (adds to current tabs)
  - Replace (closes current tabs first)
  - Export individual sessions
  - Rename and delete sessions
- **Metadata tracking** - Tab count, Jira tickets, workspace badges
- **Persistent storage** - Sessions saved in chrome.storage.local

### Category Group Management
- **Collapsible groups** - Click headers to collapse/expand categories
- **Smart defaults** - Auto-collapse small groups (≤2 tabs), auto-expand large groups (≥5 tabs)
- **Persistent state** - Groups remember collapsed/expanded state across sessions
- **Bulk actions**:
  - Collapse All / Expand All controls
  - Close All tabs in a category (with confirmation)
  - Bookmark All tabs to organized folders
- **Keyboard shortcuts**:
  - `Cmd/Ctrl + Left Arrow` - Collapse All
  - `Cmd/Ctrl + Right Arrow` - Expand All
- **Visual feedback** - Blue border highlights active groups
- **Smooth animations** - 0.2s animated transitions

### Search and Organization
- Full-text search across tab titles and content
- Content extraction from tab pages
- Auto-indexing with 24-hour cache
- Pattern matching for Jira tickets
- Project-based filtering

### Performance
- Handles 200+ tabs efficiently
- Virtual scrolling for smooth rendering
- Smart caching reduces API calls
- Background indexing does not block UI
- Memory optimized (under 100MB)

## Installation

### Prerequisites
- Chrome 88 or newer (or Chromium-based browser)
- Anthropic Claude API key ([Get one here](https://console.anthropic.com))

### From Source

1. Clone the repository
   ```bash
   git clone https://github.com/yourusername/ai-tab-organizer.git
   cd ai-tab-organizer/extension
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Build the extension
   ```bash
   npm run build
   ```

4. Load in Chrome
   - Navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top-right)
   - Click "Load unpacked"
   - Select the `extension/dist` folder

5. Configure API key
   - Click the extension icon
   - Enter your Claude API key in settings
   - Start organizing your tabs

## Usage

### Basic Workflow

1. Click the extension icon to open the popup
2. Extension automatically categorizes all open tabs
3. Click category headers to collapse/expand groups
4. Navigate through categories to find tabs
5. Click any tab to switch to it
6. Use group actions (Close All, Bookmark All) to manage categories
7. Use search to find specific tabs quickly

### Navigation Modes

Five view modes available:
- **Search**: Find tabs by content
- **Categories**: AI-organized groups
- **Jira**: Project-based ticket grouping
- **Duplicates**: Identify and manage duplicates
- **Sessions**: Save and restore browser sessions

### Density Modes

Choose how tabs are displayed:
- **Compact** (32px): Favicon and truncated title, shows 15-20 tabs
- **Normal** (48px): Favicon, title, and domain, shows 10-12 tabs
- **Spacious** (64px): Full title, URL, and timestamp, shows 6-8 tabs

Density auto-selects based on tab count but can be manually adjusted.

### Search Patterns

Multiple search formats supported:
- **Exact ticket**: ENG-123 or eng-123
- **Partial match**: eng 123 (with space)
- **Number only**: 123 (finds tickets ending in 123)
- **Project filter**: ENG (shows all ENG-* tickets)
- **Text search**: login bug (searches titles and content)

## Project Structure

```
ai-tab-organizer/
├── extension/                 # Main extension codebase
│   ├── src/
│   │   ├── components/       # React UI components
│   │   │   ├── shared/       # Reusable components
│   │   │   ├── CategoryView.tsx
│   │   │   ├── TabSearch.tsx
│   │   │   ├── JiraView.tsx
│   │   │   ├── SessionsView.tsx
│   │   │   └── DuplicateDetection.tsx
│   │   ├── services/         # Business logic
│   │   │   ├── claudeApi.ts
│   │   │   ├── tabManager.ts
│   │   │   ├── sessionManager.ts
│   │   │   ├── searchService.ts
│   │   │   ├── summaryService.ts
│   │   │   └── jira/         # Jira-specific services
│   │   ├── hooks/            # Custom React hooks
│   │   ├── types/            # TypeScript definitions
│   │   ├── utils/            # Helper functions
│   │   └── popup.tsx         # Main entry point
│   ├── background.js         # Service worker
│   ├── content-extractor.js  # Content extraction
│   ├── manifest.json         # Extension manifest
│   ├── vite.config.ts        # Build configuration
│   └── package.json
├── docs/
├── ARCHITECTURE.md           # Architecture documentation
├── CONTRIBUTING.md           # Contribution guidelines
├── DEVELOPMENT.md            # Developer setup guide
├── ROADMAP.md                # Feature roadmap
├── CHANGELOG.md              # Version history
└── README.md                 # This file
```

## Architecture

The extension uses a three-component architecture:

### 1. Popup UI (popup.tsx)
- React application with TypeScript
- Five view modes (search, categories, Jira, duplicates, sessions)
- Communicates with background worker via `chrome.runtime.sendMessage()`
- Cannot make fetch requests directly (Chrome security)

### 2. Background Service Worker (background.js)
- Runs in separate execution context (Manifest v3)
- Handles all API calls to Anthropic Claude
- Implements retry logic (max 2 retries, exponential backoff)
- 30-second timeout per request with AbortController
- Auto-indexes tabs for search feature
- Listens for tab events (create, update, remove)

### 3. Content Extractor (content-extractor.js)
- Injected into tab pages via `chrome.scripting.executeScript()`
- Extracts page content (headings, text, meta descriptions)
- Runs in page context (can access DOM)
- Used for summaries and content-aware search

### Communication Flow

```
Popup -> chrome.runtime.sendMessage() -> Background Worker
Background Worker -> fetch() with AbortController -> Anthropic API
Background Worker -> response -> Popup updates UI
```

### Key Design Patterns

1. **Service Worker for API Calls**: Background worker acts as proxy to bypass popup CSP restrictions
2. **Token Optimization**: Sends tab indices instead of full objects to reduce API usage by 70%
3. **Tab Indexing**: Auto-indexes tabs with content for instant client-side search
4. **Storage-Based Config**: API key and settings stored in `chrome.storage.local`
5. **Event-Driven Management**: Listeners on tab create/update/remove events

See [ARCHITECTURE.md](ARCHITECTURE.md) for detailed architecture documentation.

## Development

### Quick Start

```bash
# Install dependencies
cd extension
npm install

# Development mode with hot reload
npm run dev

# Build for production
npm run build

# Run tests
npm test

# Watch mode for tests
npm run test:watch
```

### Testing

- 788 passing tests with 71% code coverage
- Comprehensive unit and integration tests
- Performance benchmarks included
- Run with `npm test` from extension directory

See [DEVELOPMENT.md](DEVELOPMENT.md) for detailed development guidelines.

## Configuration

### Extension Permissions

```json
{
  "permissions": ["tabs", "storage", "scripting", "activeTab", "bookmarks"],
  "host_permissions": [
    "https://api.anthropic.com/*",
    "<all_urls>"
  ]
}
```

**Permissions explained:**
- `tabs` - Read tab information and manage tabs
- `storage` - Store API key, settings, and group states locally
- `scripting` - Inject content extractors for summaries
- `activeTab` - Interact with currently active tab
- `bookmarks` - Create bookmark folders for "Bookmark All" feature
- `host_permissions` - Call Anthropic API and extract content from any site

### API Configuration

- **Model**: claude-3-5-sonnet-20241022
- **Timeout**: 30 seconds
- **Max Retries**: 2 attempts
- **Retry Delay**: 1 second with exponential backoff
- **Token Optimization**: Uses tab indices instead of full objects

### Storage

- API key: `chrome.storage.local`
- Settings: `chrome.storage.local`
- Summary cache: 24-hour TTL
- Tab index: 24-hour expiration
- Activity tracking: Persistent across sessions
- Group collapse states: Persistent across sessions
- Sessions: Stored in `chrome.storage.local` with metadata

## Privacy and Security

- API keys stored locally in Chrome (encrypted by Chrome)
- No telemetry or analytics
- Direct API communication with Anthropic
- No data passes through external servers
- Content extraction happens locally in browser
- Cache stored locally with configurable TTL
- No persistent logging of tab data

## Browser Support

- Chrome 88+
- Edge 88+ (Chromium-based)
- Brave
- Opera
- Other Chromium-based browsers

## Troubleshooting

### Extension not loading
- Verify `npm run build` completed successfully
- Check `extension/dist/manifest.json` exists
- Look for errors in `chrome://extensions/` page

### Categorization fails
- Check background worker console: Right-click extension icon -> Inspect
- Verify API key is valid in chrome.storage.local
- Check for network errors
- Verify Anthropic account has available credits

### Tab indexing not working
- Check background worker console for extraction errors
- Verify `content-extractor.js` copied to dist/
- Check for Content Security Policy restrictions on specific domains

### Jira tabs not detected
- Extension supports Cloud, Server, and Data Center
- URL must contain `/browse/` or `/projects/`
- Custom domains supported if they match the pattern
- Tab title helps but is not required

### Search not finding tabs
- Extension only searches currently open tabs
- Index expires after 24 hours or if URL changes
- Pattern matching is case-insensitive for tickets
- Project filtering requires uppercase (ENG, not eng)

### Performance issues
- Expected: 100 tabs in under 100ms
- Expected: 1000 tabs in under 1 second
- If slower, try closing unused tabs or reloading extension
- Check Chrome Task Manager for memory usage

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

1. Fork the repository
2. Create a feature branch
3. Make your changes with tests
4. Ensure all tests pass
5. Submit a pull request

## Tech Stack

- React 18.2.0
- TypeScript 5.3.0
- Vite 5.0.0 (build system)
- Tailwind CSS 3.3.6
- Vitest 3.2.4 (testing)
- Chrome Extension Manifest V3
- Anthropic Claude API (claude-3-5-sonnet-20241022)

## License

MIT License - See [LICENSE](LICENSE) for details.

## Acknowledgments

- Powered by [Anthropic Claude](https://www.anthropic.com/)
- Built with [Vite](https://vitejs.dev/)
- UI framework: [React](https://react.dev/)
- Testing: [Vitest](https://vitest.dev/)

## Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/ai-tab-organizer/issues)
- **Documentation**: See docs folder
- **Development**: See [DEVELOPMENT.md](DEVELOPMENT.md)
- **Contributing**: See [CONTRIBUTING.md](CONTRIBUTING.md)

---

Note: This extension requires a Claude API key from Anthropic. API usage is subject to Anthropic's pricing and terms of service.

# Architecture Documentation

## Overview

AI Tab Organizer is a Chrome extension built with React, TypeScript, and Vite that uses Claude AI to intelligently categorize browser tabs. The extension includes specialized Jira/Confluence integration for developers working with Atlassian tools.

## System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Chrome Browser                        │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌─────────────────┐         ┌────────────────────┐    │
│  │   Popup UI      │         │  Background Worker │    │
│  │   (React App)   │◄───────►│  (Service Worker)  │    │
│  │                 │         │                    │    │
│  │  - Categories   │ Message │  - API Handler     │    │
│  │  - Search       │ Passing │  - Retry Logic     │    │
│  │  - Jira View    │         │  - Error Handling  │    │
│  │  - Duplicates   │         │                    │    │
│  └─────────────────┘         └────────────────────┘    │
│         ▲                              │                 │
│         │                              │                 │
│         │ chrome.tabs API              │ fetch()         │
│         │ chrome.storage API           │                 │
│         │                              ▼                 │
│         │                    ┌────────────────────┐    │
│         └────────────────────│  Anthropic API     │    │
│                              │  (Claude 3.5)      │    │
│                              └────────────────────┘    │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

## High-Level Architecture

### Extension Components

1. **Popup UI (React)** - Main user interface with multiple views
2. **Background Worker** - Service worker for API communication
3. **Chrome APIs** - Tab management and storage
4. **Anthropic API** - AI-powered categorization

### Key Features

- **AI Categorization**: Claude API categorizes tabs into Work, Research, Shopping, etc.
- **Jira Integration**: Detection and grouping of Jira tickets by project
- **Pattern Search**: Search with Jira pattern matching (ENG-123, eng 123)
- **Duplicate Detection**: Content-based duplicate finding
- **Content Extraction**: Title and URL extraction from tabs

## Directory Structure

```
extension/
├── src/
│   ├── components/              # React UI Components
│   │   ├── CategoryView.tsx     # Main tab categorization view
│   │   ├── SettingsPanel.tsx    # Settings and configuration
│   │   ├── TabSearch.tsx        # Search interface
│   │   ├── DuplicateDetection.tsx  # Duplicate finder
│   │   └── JiraView.tsx         # Jira-specific view
│   │
│   ├── services/                # Business Logic Layer
│   │   ├── claudeApi.ts         # Claude API communication
│   │   ├── tabManager.ts        # Tab operations
│   │   ├── searchService.ts     # Search functionality
│   │   ├── duplicateService.ts  # Duplicate detection
│   │   ├── summaryService.ts    # Tab summarization
│   │   └── jira/                # Jira-specific services
│   │       ├── urlParser.ts           # Parse Jira URLs
│   │       ├── titleParser.ts         # Extract ticket info from titles
│   │       ├── jiraSearchEnhancer.ts  # Enhanced Jira search
│   │       └── atlassianDetectionService.ts  # Detect/group Jira tabs
│   │
│   ├── types/                   # TypeScript Definitions
│   │   ├── index.ts             # Core types
│   │   ├── search.ts            # Search types
│   │   └── jira.ts              # Jira types
│   │
│   ├── utils/                   # Utility Functions
│   │   └── storage.ts           # Chrome storage wrapper
│   │
│   ├── popup.tsx                # Main React entry point
│   └── popup.css                # Global styles
│
├── background.js                # Background service worker
├── manifest.json                # Chrome extension manifest
├── popup.html                   # Extension popup HTML
└── vite.config.ts              # Build configuration
```

## Data Flow

### Tab Categorization Flow

```
1. User opens extension
   ↓
2. Popup queries all tabs (chrome.tabs.query)
   ↓
3. Check for API key (chrome.storage.local)
   ↓
4. If API key exists:
   ├─→ Check if Jira Smart Mode enabled
   │   ├─→ Extract Jira/Confluence tabs
   │   └─→ Group by project/space
   ↓
   ├─→ Send remaining tabs to background worker
   │   ↓
   │   Background worker calls Claude API
   │   ↓
   │   Claude returns category mapping
   │   ↓
   └─→ Popup renders categorized tabs
```

### Jira Search Flow

```
User enters search query
   ↓
Check if query matches Jira pattern:
   ├─→ "ENG-123" → Exact ticket search
   ├─→ "ENG" → Project filter
   └─→ "login bug" → Text search
   ↓
Search through open tabs (client-side, no API calls)
   ↓
Return scored results instantly (<50ms for 100 tabs)
```

## Key Modules

### Jira Integration

The Jira integration provides specialized handling for Atlassian products:

#### URL Parser (`urlParser.ts`)
- Detects Jira Cloud, Server, and Data Center URLs
- Extracts project key and ticket number
- Supports Confluence space detection

#### Title Parser (`titleParser.ts`)
- Parses ticket numbers from titles
- Extracts ticket summary
- Detects status (To Do, In Progress, In Review, Done, Blocked)

#### Search Enhancer (`jiraSearchEnhancer.ts`)
- Pattern matching for ticket formats
- Project filtering
- Text search in summaries
- Performance: <1ms for 100 tabs

#### Detection Service (`atlassianDetectionService.ts`)
- Groups tickets by project
- Sorts tickets by number
- Calculates project statistics

### Search Service

Hybrid search approach:

1. **Jira Pattern Detection**: Check for ticket patterns first
2. **Client-Side Search**: Results for Jira queries
3. **AI Ranking**: Fall back to Claude API for complex queries
4. **Caching**: Results cached to reduce API calls

### Duplicate Detection

Content-based duplicate detection:

- Extracts meaningful content from URLs
- Fuzzy title matching
- Groups similar tabs
- Handles query parameters intelligently

## Performance

### Benchmarks

| Operation | Tab Count | Time | Memory |
|-----------|-----------|------|--------|
| Jira Detection | 100 | <1ms | minimal |
| Jira Grouping | 100 | <1ms | minimal |
| Jira Search (exact) | 100 | <1ms | minimal |
| Jira Search (project) | 200 | <1ms | minimal |
| All Operations | 1000 | <4ms | <1MB |

### Optimization Strategies

1. **Client-Side Jira Search**: No API calls for Jira patterns
2. **Lazy Loading**: Components loaded on demand
3. **React Memoization**: Prevent unnecessary re-renders
4. **Efficient Algorithms**: Linear time complexity for searches
5. **Caching**: Search and summary results cached

## Extension Manifest

```json
{
  "manifest_version": 3,
  "name": "AI Tab Organizer",
  "version": "0.1.0",
  "permissions": [
    "tabs",      // Read tab information
    "storage"    // Store settings locally
  ],
  "host_permissions": [
    "https://api.anthropic.com/*"  // Call Claude API
  ]
}
```

## Build System

### Vite Configuration

- **React Plugin**: JSX transformation
- **TypeScript**: Type checking and compilation
- **Path Aliases**: Clean imports with @ prefix
- **Custom Plugin**: Copies manifest and background worker

### Build Output

```
dist/
├── popup.html              # Extension popup
├── manifest.json           # Extension manifest (copied)
├── background.js           # Service worker (copied)
└── assets/
    ├── popup-[hash].js     # Bundled React app (~193 KB)
    └── popup-[hash].css    # Bundled styles (~17 KB)
```

## Testing

### Test Suite

- **Unit Tests**: 123 tests across 5 test files
- **Performance Tests**: Stress testing with 1000+ tabs
- **Edge Case Tests**: Null/undefined handling, missing data

### Test Files

```
src/services/jira/__tests__/
├── urlParser.test.ts               # URL parsing (24 tests)
├── titleParser.test.ts             # Title parsing (41 tests)
├── jiraSearchEnhancer.test.ts      # Search (30 tests)
├── atlassianDetectionService.test.ts  # Detection (20 tests)
└── performance.test.ts             # Performance (8 tests)
```

## Security

### API Key Storage
- Stored in `chrome.storage.local` (encrypted by Chrome)
- Never transmitted except to Anthropic API
- No server-side storage

### Data Privacy
- Tab data sent only to Anthropic API (opt-in)
- Jira search runs client-side (no external calls)
- No analytics or telemetry
- No third-party data sharing

## Future Considerations

### Planned Features

1. **Custom Categories**: User-defined categorization rules
2. **Jira API Integration**: Fetch real-time ticket data
3. **Sprint Grouping**: Group by active sprints
4. **Export/Import**: Tab session management
5. **Keyboard Shortcuts**: Quick navigation

### Scalability

- Tab caching for reduced API calls
- Incremental updates for changed tabs only
- Background sync for periodic re-categorization
- Web Worker for heavy computations

---

For development setup, see [DEVELOPMENT.md](DEVELOPMENT.md).
For contribution guidelines, see [CONTRIBUTING.md](CONTRIBUTING.md).

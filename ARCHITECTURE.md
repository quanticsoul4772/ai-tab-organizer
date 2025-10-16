# Architecture Documentation

## Overview

AI Tab Organizer is a Chrome extension built with React, TypeScript, and Vite that uses Claude AI to categorize browser tabs. The architecture follows a modular design with clear separation of concerns.

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
│  │  - Components   │ Message │  - API Handler     │    │
│  │  - Services     │ Passing │  - Retry Logic     │    │
│  │  - State Mgmt   │         │  - Error Handling  │    │
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

## Directory Structure

```
extension/
├── src/
│   ├── components/              # React UI Components
│   │   ├── CategoryView.tsx     # Displays categorized tabs
│   │   ├── SettingsPanel.tsx    # API key configuration
│   │   └── TabList.tsx          # Individual tab rendering
│   │
│   ├── services/                # Business Logic Layer
│   │   ├── claudeApi.ts         # Claude API communication
│   │   └── tabManager.ts        # Tab operations wrapper
│   │
│   ├── types/                   # TypeScript Type Definitions
│   │   └── index.ts             # Shared interfaces
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
├── vite.config.ts              # Build configuration
└── tsconfig.json               # TypeScript configuration
```

## Component Architecture

### 1. Popup UI (React Application)

The main UI is a React application that runs in the extension popup.

#### Component Hierarchy

```
Popup (Main Component)
├── SettingsPanel (Conditional)
│   ├── Input (API Key)
│   └── Button (Save)
│
└── CategoryView
    └── [Category Groups]
        └── TabList
            └── [Tab Items]
                ├── Favicon
                ├── Tab Info (Click to switch)
                └── Close Button
```

#### State Management

```typescript
// Main application state
interface PopupState {
  tabs: Tab[];              // All browser tabs
  categorized: CategorizedTabs;  // Tabs grouped by category
  loading: boolean;         // Loading state
  apiKey: string;          // User's API key
  showSettings: boolean;   // Settings panel visibility
  error: string;           // Error messages
}
```

### 2. Background Service Worker

The background worker handles all API communication and implements robust error handling.

```javascript
// Request Flow
chrome.runtime.onMessage
  ↓
categorizeTabs()
  ↓
Retry Loop (0-2 attempts)
  ↓
fetchWithTimeout() → Anthropic API
  ↓
parseApiResponse()
  ↓
Return categories or throw error
```

## Data Flow

### Tab Categorization Flow

```
1. User opens extension
   ↓
2. Popup queries all tabs (chrome.tabs.query)
   ↓
3. Popup checks for API key (chrome.storage.local)
   ↓
4. If API key exists:
   ├─→ Send message to background worker
   │   ↓
   │   Background worker calls Claude API
   │   ↓
   │   Claude returns category mapping
   │   ↓
   │   Background sends response to popup
   │   ↓
   └─→ Popup renders categorized tabs

5. If no API key:
   └─→ Show settings panel
```

### API Communication Flow

```
Popup                Background Worker           Anthropic API
  │                         │                         │
  ├─ sendMessage() ────────►│                         │
  │  {action, tabs, key}    │                         │
  │                         │                         │
  │                         ├─ POST /v1/messages ────►│
  │                         │  {model, messages}      │
  │                         │                         │
  │                         │◄────── Response ────────┤
  │                         │  {content: [{text}]}    │
  │                         │                         │
  │◄─── sendResponse() ────┤                         │
  │  {success, data}        │                         │
  │                         │                         │
```

## Module Details

### Components Layer

#### CategoryView.tsx
- **Purpose**: Renders categorized tabs in expandable groups
- **Props**: `categorizedTabs`, `onTabClick`, `onTabClose`
- **Responsibilities**: Layout and organization of tab categories

#### TabList.tsx
- **Purpose**: Renders individual tabs with favicon and actions
- **Props**: `tabs`, `onTabClick`, `onTabClose`
- **Responsibilities**: Individual tab display and interaction

#### SettingsPanel.tsx
- **Purpose**: API key configuration interface
- **Props**: `apiKey`, `onApiKeyChange`, `onSave`
- **Responsibilities**: API key input and persistence

### Services Layer

#### claudeApi.ts
```typescript
export const claudeApi = {
  async categorizeTabs(tabs: Tab[], apiKey: string): Promise<CategoryResponse>
}
```
- **Purpose**: Abstraction layer for Claude API communication
- **Handles**: Message passing to background worker
- **Returns**: Parsed category mappings

#### tabManager.ts
```typescript
export const tabManager = {
  async getAllTabs(): Promise<Tab[]>
  async switchToTab(tabId: number): Promise<void>
  async closeTab(tabId: number): Promise<void>
}
```
- **Purpose**: Wrapper for Chrome tabs API
- **Handles**: All tab-related operations

### Utils Layer

#### storage.ts
```typescript
export const storage = {
  async getApiKey(): Promise<string | null>
  async setApiKey(apiKey: string): Promise<void>
  async clearApiKey(): Promise<void>
}
```
- **Purpose**: Abstraction for Chrome storage API
- **Handles**: Persistent API key storage

### Types Layer

#### index.ts
```typescript
export interface Tab { id, title, url, favIconUrl? }
export interface CategorizedTabs { [category: string]: Tab[] }
export interface CategoryResponse { [category: string]: number[] }
export interface BackgroundMessage { action, tabs, apiKey }
export interface BackgroundResponse { success, data?, error? }
```

## Background Worker Details

### API Configuration

```javascript
const API_CONFIG = {
  BASE_URL: 'https://api.anthropic.com/v1/messages',
  MODEL: 'claude-3-5-sonnet-20241022',
  MAX_TOKENS: 1024,
  VERSION: '2023-06-01',
  TIMEOUT_MS: 30000,      // 30 seconds
  MAX_RETRIES: 2,         // Up to 3 total attempts
  RETRY_DELAY_MS: 1000,   // Initial delay, increases exponentially
};
```

### Error Handling Strategy

1. **Timeout Handling**: 30-second timeout using AbortController
2. **Retry Logic**: Exponential backoff (1s, 2s delays)
3. **Auth Errors**: No retry on 401/403
4. **Rate Limits**: Retry on 429/5xx errors
5. **Validation**: Response structure validation before parsing

### Retry Flow

```javascript
for (attempt = 0; attempt <= MAX_RETRIES; attempt++) {
  try {
    if (attempt > 0) {
      await sleep(RETRY_DELAY_MS * attempt);  // Exponential backoff
    }

    response = await fetchWithTimeout(url, options, TIMEOUT_MS);

    if (!response.ok) {
      if (isAuthError(response.status)) {
        throw error;  // Don't retry auth errors
      }
      continue;  // Retry other errors
    }

    return parseApiResponse(response);
  } catch (error) {
    if (attempt === MAX_RETRIES) {
      throw error;  // Final attempt failed
    }
  }
}
```

## Build System

### Vite Configuration

```typescript
export default defineConfig({
  plugins: [
    react(),                    // React support
    copyExtensionFilesPlugin()  // Copy manifest & background.js
  ],
  resolve: {
    alias: {                    // Path aliases
      '@components': './src/components',
      '@services': './src/services',
      '@types': './src/types',
      '@utils': './src/utils',
    },
  },
  build: {
    outDir: 'dist',            // Output to dist/
    rollupOptions: {
      input: {
        popup: './popup.html'   // Entry point
      },
    }
  }
});
```

### Build Output

```
dist/
├── popup.html              # Extension popup
├── manifest.json           # Extension manifest (copied)
├── background.js           # Service worker (copied)
└── assets/
    ├── popup-[hash].js     # Bundled React app
    └── popup-[hash].css    # Bundled styles
```

## Extension Manifest

```json
{
  "manifest_version": 3,
  "name": "AI Tab Organizer",
  "version": "0.1.0",
  "permissions": [
    "tabs",      // Read tab information
    "storage"    // Store API key locally
  ],
  "host_permissions": [
    "https://api.anthropic.com/*"  // Call Claude API
  ],
  "action": {
    "default_popup": "popup.html"
  },
  "background": {
    "service_worker": "background.js"
  }
}
```

## Security Considerations

### API Key Storage
- Stored in `chrome.storage.local` (encrypted by Chrome)
- Never transmitted except to Anthropic API
- No server-side storage

### Content Security Policy
- Extension manifest v3 enforces strict CSP
- No eval() or inline scripts
- External API calls require host_permissions

### Data Privacy
- Tab titles/URLs sent only to Anthropic API
- No analytics or telemetry
- No third-party data sharing

## Performance Considerations

### Optimization Strategies

1. **Lazy Loading**: Components loaded on demand
2. **React Memoization**: Prevent unnecessary re-renders
3. **Efficient State Updates**: Batch state changes
4. **API Optimization**:
   - Send only tab index, title, URL (not full objects)
   - Request JSON-only responses
   - Timeout after 30 seconds

### Bundle Size

- **Popup JS**: ~146 KB (~47 KB gzipped)
- **Popup CSS**: ~3 KB (~1 KB gzipped)
- **Total**: ~149 KB (~48 KB gzipped)

## Extension Lifecycle

```
Installation
  ↓
Background worker initialized
  ↓
User clicks extension icon
  ↓
Popup opens (popup.html)
  ↓
React app mounts
  ↓
Load tabs & API key
  ↓
If API key exists: categorize tabs
  ↓
Display categorized tabs
  ↓
User interacts (switch/close tabs)
  ↓
Popup closes (state lost)
  ↓
Next click: Repeat from "Popup opens"
```

## Future Architecture Considerations

### Scalability

1. **Tab Caching**: Cache categorizations to reduce API calls
2. **Incremental Updates**: Only categorize new tabs
3. **Background Sync**: Periodic re-categorization
4. **Custom Categories**: User-defined category rules

### Extension Points

1. **Plugin System**: Custom categorization rules
2. **Export/Import**: Tab session management
3. **Sync Service**: Multi-device synchronization
4. **Analytics Dashboard**: Tab usage insights

## Testing Strategy

### Unit Tests
- Component rendering tests (React Testing Library)
- Service layer tests (Jest)
- Utility function tests

### Integration Tests
- Popup ↔ Background worker communication
- Chrome API mocking
- End-to-end tab categorization flow

### Manual Testing
- Load extension in Chrome
- Test with various tab counts (5, 50, 100+)
- Test error scenarios (invalid API key, network failure)
- Test edge cases (no tabs, duplicate tabs)

## Debugging

### Chrome DevTools

1. **Popup Console**: Right-click popup → Inspect
2. **Background Worker Console**: chrome://extensions → "Inspect" link
3. **Network Tab**: Monitor API calls
4. **Storage Tab**: View chrome.storage.local

### Logging Strategy

```javascript
// Background worker
console.log('[BG] API call started');
console.error('[BG] API error:', error);

// Popup
console.log('[Popup] Categorization complete');
console.error('[Popup] Failed to load tabs:', error);
```

## Dependencies

### Runtime Dependencies
- `react@18.x` - UI framework
- `react-dom@18.x` - React DOM renderer

### Build Dependencies
- `vite@5.x` - Build tool
- `@vitejs/plugin-react` - Vite React plugin
- `typescript@5.x` - Type checking
- `@types/chrome` - Chrome API types

### Chrome APIs Used
- `chrome.tabs` - Tab management
- `chrome.storage.local` - Persistent storage
- `chrome.runtime` - Message passing

---

For implementation details, see the source code. For development setup, see [DEVELOPMENT.md](DEVELOPMENT.md).

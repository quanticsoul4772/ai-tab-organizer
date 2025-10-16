# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI Tab Organizer is a Chrome browser extension that automatically categorizes open tabs using AI. The project has two components:

1. **Extension** (primary): Chrome extension with React UI that can work standalone using Claude API
2. **Backend** (legacy/optional): Express server originally planned for MCP integration (currently not used by extension)

**Important Architecture Note**: Despite having a backend folder, the extension currently operates **standalone** by calling the Anthropic API directly from the browser (using the background service worker). The backend server is not actively used in the current workflow but remains in the codebase for potential future MCP integration.

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
```

After building, load the extension in Chrome:
1. Navigate to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `extension/dist` folder

### Backend (Optional - Currently Unused)

```bash
# Install dependencies
cd backend
npm install

# Start server on port 3000
npm start

# Development mode with auto-restart
npm run dev
```

Health check: `http://localhost:3000/health`

## Architecture

### Extension Structure

**Entry Points:**
- `popup.html` - Main UI popup
- `popup.tsx` - React component for popup UI
- `background.js` - Service worker that handles API calls to Anthropic

**Build Process:**
- Vite bundles the React app from `popup.tsx` → `dist/assets/popup-*.js`
- Custom Vite plugin copies `manifest.json` and `background.js` to `dist/`
- Output is a complete Chrome extension in `extension/dist/`

**Data Flow:**
1. User opens extension popup → `popup.tsx` loads
2. Extension queries all Chrome tabs via `chrome.tabs.query()`
3. Popup sends message to `background.js` with tab data + API key
4. Background worker calls Anthropic API with tab information
5. Claude categorizes tabs and returns JSON mapping of categories to tab indices
6. Popup renders categorized tabs in UI

**Key Implementation Details:**
- API key stored in `chrome.storage.local` (never hardcoded)
- Background worker required because Chrome extensions can't fetch() from popup context directly
- Uses `chrome.runtime.sendMessage()` for popup ↔ background communication
- Tab indices used (instead of full tab objects) to minimize API token usage

### Backend Structure (Legacy)

Simple Express server with:
- `/health` - Health check endpoint
- `/api/categorize` - Tab categorization (basic keyword matching)
- Currently uses simple keyword-based categorization
- Originally planned for MCP tool integration (not yet implemented)

**Note**: The extension does NOT currently communicate with this backend. It makes direct API calls to Anthropic.

## Extension Manifest (manifest.json)

```json
{
  "manifest_version": 3,
  "permissions": ["tabs", "storage"],
  "host_permissions": ["https://api.anthropic.com/*"],
  "action": { "default_popup": "popup.html" },
  "background": { "service_worker": "background.js" }
}
```

- `tabs` permission: Read open tabs
- `storage` permission: Store API key locally
- `host_permissions`: Allow fetch to Anthropic API from background worker
- `service_worker`: Background script runs in separate context for API calls

## Key Files

- `extension/src/popup.tsx` - Main React UI component with categorization logic
- `extension/background.js` - Service worker that calls Anthropic API
- `extension/vite.config.ts` - Build configuration with custom plugin for copying extension files
- `extension/manifest.json` - Chrome extension manifest (v3)
- `backend/server.js` - Express server (currently unused by extension)

## Tech Stack

**Extension:**
- React 18 + TypeScript
- Vite (bundler)
- Chrome Extension API (Manifest V3)
- Anthropic Claude API (called directly from background worker)

**Backend:**
- Node.js with ES modules (`"type": "module"`)
- Express 4.x
- CORS enabled
- dotenv for configuration

## Testing the Extension

1. Build: `cd extension && npm run build`
2. Load unpacked extension from `extension/dist/`
3. Open multiple tabs (10-15 recommended)
4. Click extension icon in Chrome toolbar
5. On first launch, enter Claude API key in settings
6. Extension will categorize tabs into: Development, Work, Shopping, Social, Entertainment, Research, Other

## Troubleshooting

**Extension not loading:**
- Verify `npm run build` completed successfully
- Check that `dist/manifest.json` exists
- Look for errors in `chrome://extensions/` page

**Categorization fails:**
- Check background worker console: Right-click extension icon → Inspect → Console tab
- Verify API key is valid (stored in chrome.storage.local)
- Check for CORS/network errors in background worker console

**Popup won't open:**
- Check popup console: Right-click popup → Inspect
- Verify all files copied to dist/ folder

## Current vs. Future Architecture

**Current (v0.1)**: Extension → Background Worker → Anthropic API (standalone)

**Future (planned)**: Extension → Backend Server → MCP unified-thinking tool → Anthropic API

The backend server exists for this future integration but is not currently part of the active workflow.

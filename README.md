# AI Tab Organizer

A Chrome browser extension that categorizes open tabs using Claude AI.

![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![React](https://img.shields.io/badge/React-18-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## Features

### Core Features
- **AI Categorization**: Uses Claude AI to group tabs into categories
- **Automatic Sorting**: Sorts tabs into Work, Research, Shopping, Social, Entertainment, Development, News, and Other
- **One-Click Organization**: Click the extension icon to organize all open tabs
- **Tab Management**: Switch to any tab or close tabs directly from the organized view
- **Privacy-First**: API key stored locally, tabs processed in real-time
- **Fast & Lightweight**: Built with React and optimized for performance

### Jira/Confluence Integration
- **Jira Grouping**: Groups Jira tickets by project (ENG, DESIGN, etc.)
- **Confluence Organization**: Groups Confluence pages by space
- **Pattern Search**: Search for tickets with patterns like "ENG-123", "eng 123", or just "123"
- **Project Filtering**: Type "ENG" to see all ENG-* tickets
- **Status Indicators**: Visual status badges (To Do, In Progress, In Review, Done, Blocked)
- **Ticket Sorting**: Tickets sorted by number within each project
- **Performance**: Handles 100+ tabs in <100ms, 1000+ tabs in <1 second
- **Works with all Jira/Confluence**: Cloud, Server, and Data Center supported

## Screenshots

```
┌─────────────────────────────────┐
│  AI Tab Organizer      Settings │
├─────────────────────────────────┤
│  15 tabs open                   │
│                                  │
│  Work (4)                        │
│  ├─ Gmail                        │
│  ├─ Google Calendar             │
│  ├─ Slack                        │
│  └─ Notion                       │
│                                  │
│  Development (3)                 │
│  ├─ GitHub                       │
│  ├─ Stack Overflow              │
│  └─ VS Code Docs                │
│                                  │
│  Shopping (2)                    │
│  ├─ Amazon                       │
│  └─ eBay                         │
└─────────────────────────────────┘
```

## Installation

### From Source

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/ai-tab-organizer.git
   cd ai-tab-organizer/extension
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Build the extension**
   ```bash
   npm run build
   ```

4. **Load in Chrome**
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top-right)
   - Click "Load unpacked"
   - Select the `extension/dist` folder

### Get API Key

1. Visit [Anthropic Console](https://console.anthropic.com)
2. Create an account or sign in
3. Generate an API key
4. Open the extension and enter your API key in settings

## Usage

### Basic Usage

1. **Open the extension**: Click the extension icon in your Chrome toolbar
2. **First-time setup**: Enter your Claude API key when prompted
3. **Categorization**: The extension will categorize all open tabs
4. **Navigate tabs**: Click any tab in the list to switch to it
5. **Close tabs**: Click the X button to close unwanted tabs
6. **Update settings**: Click the settings icon to change your API key

### Jira/Confluence Features

#### Viewing Jira Tabs
1. Click the "Jira" tab in the extension
2. See all Jira tickets grouped by project (ENG, DESIGN, etc.)
3. Tickets show status badges and are sorted by number
4. Click any ticket to switch to that tab

#### Searching for Jira Tickets
1. Click the "Search" tab
2. Enter search patterns:
   - **Exact ticket**: "ENG-123" or "eng-123" (case-insensitive)
   - **Partial ticket**: "eng 123" (with space)
   - **Just number**: "123" (finds ticket ending in 123)
   - **Project filter**: "ENG" (shows all ENG-* tickets)
   - **Text search**: "login bug" (searches ticket summaries)
3. Results show instant matches with no API calls

#### Settings
- Toggle "Enable Jira Mode" in settings
- When enabled, Jira tickets are grouped by project
- When disabled, Jira tabs use standard categorization
- Search enhancements work regardless of this setting

## Project Structure

```
ai-tab-organizer/
├── extension/                 # Chrome extension source
│   ├── src/
│   │   ├── components/       # React components
│   │   │   ├── CategoryView.tsx
│   │   │   ├── SettingsPanel.tsx
│   │   │   └── TabList.tsx
│   │   ├── services/         # Business logic
│   │   │   ├── claudeApi.ts
│   │   │   └── tabManager.ts
│   │   ├── types/            # TypeScript definitions
│   │   │   └── index.ts
│   │   ├── utils/            # Helper functions
│   │   │   └── storage.ts
│   │   ├── popup.tsx         # Main entry point
│   │   └── popup.css         # Styles
│   ├── background.js         # Service worker
│   ├── manifest.json         # Extension manifest
│   ├── popup.html            # Extension popup
│   ├── vite.config.ts        # Build configuration
│   └── package.json
├── backend/                   # Optional backend (legacy)
└── README.md
```

## Development

See [DEVELOPMENT.md](DEVELOPMENT.md) for detailed development setup and guidelines.

### Quick Start

```bash
# Development mode with hot reload
cd extension
npm run dev

# Build for production
npm run build

# The built extension will be in extension/dist/
```

## Architecture

The extension consists of two main parts:

1. **Extension Frontend** (React + TypeScript)
   - Popup UI for displaying categorized tabs
   - React components for modular UI
   - TypeScript for type safety

2. **Background Service Worker** (JavaScript)
   - Handles API calls to Anthropic Claude
   - Implements retry logic and error handling
   - Manages tab categorization

See [ARCHITECTURE.md](ARCHITECTURE.md) for detailed architecture documentation.

## Configuration

### Extension Manifest (manifest.json)

```json
{
  "manifest_version": 3,
  "permissions": ["tabs", "storage"],
  "host_permissions": ["https://api.anthropic.com/*"]
}
```

### API Configuration (background.js)

- **Model**: Claude 3.5 Sonnet
- **Timeout**: 30 seconds
- **Max Retries**: 2 attempts
- **Retry Delay**: 1 second (exponential backoff)

## Privacy & Security

- **Local Storage**: API keys are stored locally using `chrome.storage.local`
- **No Data Collection**: No telemetry or analytics
- **Direct API Calls**: Extension communicates directly with Anthropic API
- **No Third-Party Servers**: No data passes through external servers

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Extension**: Chrome Extension Manifest V3
- **AI**: Anthropic Claude 3.5 Sonnet
- **Build Tool**: Vite
- **Styling**: CSS

## Browser Support

- Chrome 88+
- Edge 88+ (Chromium-based)
- Brave
- Other Chromium-based browsers

## Troubleshooting

### Extension not loading
- Verify `npm run build` completed successfully
- Check that `extension/dist/` folder exists
- Look for errors in `chrome://extensions/`

### Categorization fails
- Verify your API key is valid
- Check background worker console: Right-click extension icon → "Inspect"
- Ensure you have an active internet connection
- Check API rate limits on your Anthropic account

### Popup won't open
- Check popup console: Right-click popup → "Inspect"
- Verify all files were copied to dist/
- Reload the extension from `chrome://extensions/`

### Jira/Confluence Issues

#### Jira tabs not detected
- **Check URL format**: Extension supports:
  - Cloud: `https://*.atlassian.net/browse/PROJECT-123`
  - Server: `https://jira.company.com/browse/PROJECT-123`
  - Projects view: `/projects/PROJECT/issues/PROJECT-123`
- **Custom domain**: If using a custom Jira domain, it must contain `/browse/` in the URL
- **Verify tab title**: While not required, tab titles with `[PROJECT-123]` format work best

#### Search not finding tickets
- **Uppercase for projects**: Type "ENG" not "eng" to filter by project
- **Exact ticket format**: For exact matches, use "ENG-123" or "eng-123"
- **Number search**: Typing just "123" searches for tickets ending in that number
- **Check tabs are open**: Extension only searches currently open tabs

#### Performance issues
- **Expected performance**:
  - 100 tabs: <100ms
  - 500 tabs: <500ms
  - 1000 tabs: <1 second
- **If slower**: Try closing unused tabs or reloading the extension

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Roadmap

### Completed
- [x] Jira/Confluence grouping
- [x] Ticket search with patterns
- [x] Status indicators
- [x] Performance optimization (1000+ tabs)
- [x] Duplicate detection
- [x] Tab content extraction

### Planned
- [ ] Custom category creation
- [ ] Tab grouping integration
- [ ] Keyboard shortcuts
- [ ] Export/import tab sessions
- [ ] Filtering options
- [ ] Jira API integration (fetch ticket details)
- [ ] Sprint-based grouping
- [ ] Multi-language support
- [ ] Firefox support
- [ ] Safari support

## License

MIT License - feel free to use this project for personal or commercial use.

## Acknowledgments

- Powered by [Anthropic Claude](https://www.anthropic.com/)
- Built with [Vite](https://vitejs.dev/)
- UI components built with [React](https://react.dev/)

## Support

For issues, bugs, or feature requests, please check the GitHub repository or contact the maintainers.

---

**Note**: This extension requires a Claude API key from Anthropic. API usage is subject to Anthropic's pricing and terms of service.

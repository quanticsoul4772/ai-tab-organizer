# AI Tab Organizer

A Chrome browser extension that automatically categorizes your open tabs using Claude AI. Keep your browser organized with intelligent, AI-powered tab management.

![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![React](https://img.shields.io/badge/React-18-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## Features

- **AI-Powered Categorization**: Uses Claude AI to intelligently group tabs into categories
- **Smart Categories**: Automatically sorts tabs into Work, Research, Shopping, Social, Entertainment, Development, News, and Other
- **One-Click Organization**: Click the extension icon to instantly organize all open tabs
- **Tab Management**: Switch to any tab or close tabs directly from the organized view
- **Privacy-First**: API key stored locally, tabs processed in real-time
- **Fast & Lightweight**: Built with React and optimized for performance

## Screenshots

```
┌─────────────────────────────────┐
│  🗂️ AI Tab Organizer        ⚙️  │
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

1. **Open the extension**: Click the extension icon in your Chrome toolbar
2. **First-time setup**: Enter your Claude API key when prompted
3. **Auto-categorization**: The extension will automatically categorize all open tabs
4. **Navigate tabs**: Click any tab in the list to switch to it
5. **Close tabs**: Click the ✕ button to close unwanted tabs
6. **Update settings**: Click the ⚙️ icon to change your API key

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

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Roadmap

- [ ] Custom category creation
- [ ] Tab grouping integration
- [ ] Keyboard shortcuts
- [ ] Export/import tab sessions
- [ ] Advanced filtering options
- [ ] Multi-language support
- [ ] Firefox support
- [ ] Safari support

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Powered by [Anthropic Claude](https://www.anthropic.com/)
- Built with [Vite](https://vitejs.dev/)
- UI components built with [React](https://react.dev/)

## Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/ai-tab-organizer/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/ai-tab-organizer/discussions)
- **Email**: your.email@example.com

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history and updates.

---

**Note**: This extension requires a Claude API key from Anthropic. API usage is subject to Anthropic's pricing and terms of service.

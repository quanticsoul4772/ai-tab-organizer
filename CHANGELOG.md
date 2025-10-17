# Changelog

All notable changes to AI Tab Organizer will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed
- Improved favicon fallback handling using SVG placeholder instead of missing PNG
- Removed invalid `resetAfterIndex()` and `scrollToItem()` calls from custom react-window List

### Removed
- Backend server component (unused, can be restored from git history)

## [0.1.0] - 2025-10-16

### Added
- AI-powered tab categorization using Claude AI (claude-3-5-sonnet-20241022)
- Background service worker for API calls with retry logic
- Content extraction from tab pages for enhanced search
- Tab search with auto-indexing (24-hour cache)
- Jira/Confluence integration with smart URL and title parsing
- Duplicate detection (URL-based, content-based, and semantic)
- Tab summaries with TTL caching
- Category summaries for grouped tabs
- Settings panel for API key and Jira configuration
- Error boundary for graceful error handling
- 123 comprehensive unit tests for Jira services
- Performance benchmarks for Jira detection (<1ms for 100 tabs)
- Visual density modes (compact/normal/spacious) with persistence
- DensityToggle component with three UI modes
- Keyboard navigation support via useKeyboardNav hook

### Technical Details
- Chrome Extension Manifest v3
- React 18.2.0 + TypeScript 5.3.0
- Vite 5.0.0 build system
- Tailwind CSS 3.3.6 for styling
- Custom react-window integration for virtual scrolling
- Direct Anthropic API integration (no backend required)
- Token optimization using tab indices instead of full objects
- Staggered tab indexing to prevent browser overload

### Architecture
- Three-component system: Popup UI, Background Worker, Content Extractor
- Service layer pattern for business logic
- Chrome storage for API key and settings persistence
- Event-driven tab management with Chrome tabs API

## [0.0.1] - 2025-10-15

### Added
- Initial project setup
- Basic popup UI
- Chrome extension manifest
- README and documentation

---

## Release Notes

### Version 0.1.0 Highlights

**Core Features:**
- Automatically categorizes your open tabs using Claude AI
- Search through all tabs with content-aware indexing
- Detect and manage duplicate tabs
- Special Jira/Confluence integration for developers
- Generate AI summaries of individual tabs or entire categories

**Performance:**
- Handles 200+ tabs efficiently
- <1 second categorization for typical tab counts
- Smart caching reduces API calls
- Background indexing doesn't block UI

**Developer Experience:**
- Comprehensive test coverage (123 tests)
- TypeScript strict mode
- Performance monitoring utilities
- Detailed technical documentation

**Privacy:**
- API key stored locally in Chrome
- No data sent to external servers (except Anthropic)
- Content extraction happens locally in browser
- Cache stored locally with configurable TTL

[Unreleased]: https://github.com/yourusername/ai-tab-organizer/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/yourusername/ai-tab-organizer/releases/tag/v0.1.0
[0.0.1]: https://github.com/yourusername/ai-tab-organizer/releases/tag/v0.0.1

# AI Tab Organizer Roadmap

## Version 0.1.0 - Current Release ✅

**Status**: Released
**Date**: 2025-10-16

### Features
- ✅ AI-powered tab categorization using Claude API
- ✅ Background service worker for API calls
- ✅ Content extraction from tab pages
- ✅ Tab search with auto-indexing
- ✅ Jira/Confluence integration with smart detection
- ✅ Duplicate detection (URL, content, semantic)
- ✅ Tab and category summaries with caching
- ✅ 123 unit tests for Jira services

### Architecture
- Chrome Extension (Manifest v3)
- React 18 + TypeScript 5
- Vite build system
- Direct Anthropic API integration
- Standalone operation (no backend required)

---

## Version 0.2.0 - UI Improvements (In Planning)

**Status**: Planning
**Estimated Effort**: 3-4 weeks
**Priority**: High

### Phase 1: Virtual Scrolling & Performance (P0)
- [ ] React-window virtual scrolling for 200+ tabs
- [ ] Performance monitoring utilities
- [ ] Memory optimization (<100MB target)
- [ ] Render performance budget (<200ms for 100 tabs)

**Target**: 60fps scrolling, <200ms initial render

### Phase 2: Keyboard Navigation (P0)
- [ ] Arrow key navigation (Up/Down)
- [ ] Enter to switch tab, Delete to close
- [ ] Ctrl/Cmd+K for search
- [ ] Chrome command API integration
- [ ] Visual focus indicators

**Target**: <16ms response time, WCAG 2.1 AA compliant

### Phase 3: Visual Density Modes (P0)
- [ ] Compact mode (32px items, 15-20 visible)
- [ ] Normal mode (48px items, 10-12 visible)
- [ ] Spacious mode (64px items, 6-8 visible)
- [ ] User preference persistence
- [ ] Auto-selection based on tab count

**Target**: Smooth transitions, instant mode switching

### Phase 4: Collapsible Category Groups (P1)
- [ ] Expand/collapse categories
- [ ] State persistence across sessions
- [ ] Keyboard shortcuts (Space, Ctrl+C/E)
- [ ] Collapse/expand all actions

**Target**: <50ms toggle performance

### Phase 5: Side Panel Mode (P0)
- [ ] Chrome 114+ side panel support
- [ ] Shared component library (popup + side panel)
- [ ] State synchronization between views
- [ ] Graceful fallback for Chrome <114

**Target**: Both entry points fully functional

### Phase 6: Smart Filter Chips (P1)
- [ ] Quick filters (All, Active, Pinned, Audible, Duplicates)
- [ ] Multiple active filters
- [ ] Filter count indicators
- [ ] ARIA accessibility

**Target**: <100ms filter operations

### Phase 7: Visual Status Indicators (P2)
- [ ] Active, pinned, audible indicators
- [ ] Duplicate tab badges
- [ ] Last accessed tracking
- [ ] Optional memory usage (requires 'processes' permission)

**Target**: Non-intrusive, accessible indicators

### Phase 8: Quick Actions Menu (P2)
- [ ] Multi-select with Shift+Click
- [ ] Bulk actions (close, bookmark, new window)
- [ ] Keyboard multi-select (Shift+Enter)
- [ ] Quick actions toolbar

**Target**: Efficient bulk operations

### Performance Budget
| Metric | Target | Max |
|--------|--------|-----|
| Initial Render (100 tabs) | <200ms | 300ms |
| Filter Operation | <100ms | 150ms |
| Category Toggle | <50ms | 100ms |
| Keyboard Response | <16ms | 32ms |
| Extension Memory | <100MB | 150MB |
| Scroll FPS | 60fps | 50fps |

### Accessibility Goals
- WCAG 2.1 Level AA compliance
- Full keyboard navigation
- Screen reader support
- 4.5:1 minimum color contrast
- ARIA labels and live regions

---

## Version 0.3.0 - Advanced Features (Future)

**Status**: Conceptual
**Priority**: Medium

### Potential Features
- [ ] Custom category definitions
- [ ] Jira API direct integration (not just URL parsing)
- [ ] Sprint-based grouping
- [ ] Session management (save/restore tab groups)
- [ ] Tab analytics (usage patterns, time tracking)
- [ ] Export/import tab collections
- [ ] Cross-device sync (Chrome sync API)
- [ ] Dark mode theme
- [ ] Customizable keyboard shortcuts
- [ ] Tab thumbnails (optional, memory permitting)

### Infrastructure
- [ ] Telemetry/analytics (opt-in)
- [ ] Error reporting
- [ ] User feedback system
- [ ] A/B testing framework

---

## Version 1.0.0 - Public Release (Future)

**Status**: Long-term Goal
**Requirements**:
- All v0.2.0 features stable
- 90%+ test coverage
- Chrome Web Store listing
- Comprehensive documentation
- User onboarding flow
- Privacy policy
- Terms of service

---

## Deferred/Out of Scope

### Backend Server (Removed)
- Originally planned for MCP integration
- Removed in v0.1.0 cleanup (2025-10-16)
- Extension operates standalone via Anthropic API
- Can be restored from git history if needed

### Tab Thumbnails
- High memory cost (10-50KB per thumbnail)
- Would exceed 150MB memory budget
- Deferred to v0.3.0+ with optional toggle

### Real-time Collaboration
- Complexity too high for current scope
- Requires backend infrastructure
- Consider for v2.0+

---

## Contributing to Roadmap

See [CONTRIBUTING.md](CONTRIBUTING.md) for how to propose new features or changes to the roadmap.

**Roadmap maintained by**: Development team
**Last updated**: 2025-10-16
**Next review**: After v0.2.0 Phase 1 completion

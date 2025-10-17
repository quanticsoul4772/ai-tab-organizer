# AI Tab Organizer - UI Improvements Technical Specification

**Status**: Planning Document - Not Yet Implemented

This document describes planned UI improvements for version 0.2.0. For current implemented features, see README.md and ARCHITECTURE.md.

**Version**: 2.0
**Date**: 2025-10-16
**Implementation Status**: 0% (Planning Phase)
**Estimated Effort**: 3-4 weeks (1 developer)

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Performance Requirements](#performance-requirements)
3. [Implementation Roadmap](#implementation-roadmap)
4. [Feature Specifications](#feature-specifications)
5. [Architecture Updates](#architecture-updates)
6. [Testing Strategy](#testing-strategy)
7. [Accessibility Compliance](#accessibility-compliance)
8. [Risk Mitigation](#risk-mitigation)
9. [Success Metrics](#success-metrics)

---

## Executive Summary

### Goals

Transform AI Tab Organizer from a basic popup extension into a scalable, power-user-friendly tab management solution capable of handling 50-200+ tabs efficiently.

### Key Changes from Original Plan

1. **Virtual scrolling moved to Week 1** (critical for performance)
2. **Revised priority order** (keyboard → density → collapsible → side panel)
3. **Added accessibility requirements** for each feature
4. **Defined performance budgets** with specific metrics
5. **Added tab metadata infrastructure** specification
6. **Created component library architecture** for code reuse
7. **Comprehensive testing strategy** with coverage targets

### Target Users

- **Power Users** (100-200+ tabs): Developers, researchers, multi-taskers
- **Casual Users** (20-50 tabs): General browsing, shopping, research
- **Keyboard-First Users**: Users who prefer keyboard navigation

---

## Performance Requirements

### Performance Budget

All features must meet these targets:

| Metric | Target | Max Acceptable | Test Scenario |
|--------|--------|----------------|---------------|
| **Initial Render** | <200ms | 300ms | 100 tabs, cold start |
| **Filter Operation** | <100ms | 150ms | Search with 200 tabs |
| **Category Expand/Collapse** | <50ms | 100ms | 10 tabs in category |
| **Keyboard Navigation** | <16ms | 32ms | Arrow key press (60fps) |
| **Extension Memory** | <100MB | 150MB | 200 tabs indexed |
| **Scroll FPS** | 60fps | 50fps | Virtual scroll with 200 tabs |
| **Tab Index Update** | <500ms | 1s | Content extraction per tab |

### Performance Testing

**Tools**:
- Chrome DevTools Performance profiler
- React DevTools Profiler
- Lighthouse extension performance audit

**Test Cases**:
```typescript
describe('Performance', () => {
  it('should render 100 tabs in <200ms', async () => {
    const start = performance.now();
    render(<CategoryView tabs={generate100Tabs()} />);
    const duration = performance.now() - start;
    expect(duration).toBeLessThan(200);
  });

  it('should filter 200 tabs in <100ms', async () => {
    const tabs = generate200Tabs();
    const start = performance.now();
    const filtered = filterTabs(tabs, 'development');
    const duration = performance.now() - start;
    expect(duration).toBeLessThan(100);
  });

  it('should maintain 60fps during scroll', async () => {
    const metrics = await measureScrollPerformance();
    expect(metrics.avgFps).toBeGreaterThan(60);
  });
});
```

### Memory Budget

**Limits**:
- Tab index cache: Max 50MB (10,000 chars per tab × 200 tabs)
- Summary cache: Max 10MB (5KB per summary × 200 tabs)
- React component tree: Max 30MB
- Background worker: Max 10MB

**Monitoring**:
```typescript
// extension/src/utils/performance.ts
export async function checkMemoryUsage() {
  if ('memory' in performance) {
    const memory = (performance as any).memory;
    const usedMB = memory.usedJSHeapSize / 1048576;

    if (usedMB > 100) {
      console.warn(`Memory usage high: ${usedMB.toFixed(2)}MB`);
      // Clear old caches
      await clearExpiredCaches();
    }
  }
}
```

---

## Implementation Roadmap

### Phase 1: Virtual Scrolling & Performance Setup

**Priority**: P0 (CRITICAL)
**Dependencies**: None

**Implementation**:

1. Install react-window:
```bash
cd extension
npm install react-window @types/react-window
```

2. Create VirtualTabList component:
```typescript
// extension/src/components/shared/VirtualTabList.tsx
import { FixedSizeList as List } from 'react-window';
import { Tab } from '@types';

interface VirtualTabListProps {
  tabs: Tab[];
  density: 'compact' | 'comfortable' | 'spacious';
  onTabClick: (tab: Tab) => void;
  onTabClose: (tabId: number) => void;
}

const ITEM_SIZES = {
  compact: 32,
  comfortable: 48,
  spacious: 64,
};

export function VirtualTabList({ tabs, density, onTabClick, onTabClose }: VirtualTabListProps) {
  const itemSize = ITEM_SIZES[density];

  return (
    <List
      height={600}
      itemCount={tabs.length}
      itemSize={itemSize}
      width="100%"
      overscanCount={5} // Render 5 extra items for smooth scrolling
    >
      {({ index, style }) => (
        <TabItem
          tab={tabs[index]}
          style={style}
          onClick={() => onTabClick(tabs[index])}
          onClose={() => onTabClose(tabs[index].id)}
        />
      )}
    </List>
  );
}
```

3. Memoize TabItem for performance:
```typescript
// extension/src/components/shared/TabItem.tsx
import { memo } from 'react';

interface TabItemProps {
  tab: Tab;
  style: React.CSSProperties;
  onClick: () => void;
  onClose: () => void;
}

export const TabItem = memo(function TabItem({ tab, style, onClick, onClose }: TabItemProps) {
  return (
    <div
      style={style}
      className="tab-item flex items-center gap-2 px-3 py-2 hover:bg-gray-100"
    >
      <img
        src={tab.favIconUrl || 'default-icon.png'}
        alt=""
        className="w-4 h-4"
        loading="lazy"
      />
      <span className="flex-1 truncate" onClick={onClick}>
        {tab.title}
      </span>
      <button
        onClick={onClose}
        className="text-gray-400 hover:text-red-500"
        aria-label={`Close ${tab.title}`}
      >
        ×
      </button>
    </div>
  );
}, (prev, next) => {
  // Only re-render if tab data changed
  return prev.tab.id === next.tab.id &&
         prev.tab.title === next.tab.title &&
         prev.tab.url === next.tab.url;
});
```

4. Add performance monitoring:
```typescript
// extension/src/utils/performance.ts
export class PerformanceMonitor {
  private metrics: Map<string, number[]> = new Map();

  measure(name: string, fn: () => void | Promise<void>) {
    const start = performance.now();
    const result = fn();

    if (result instanceof Promise) {
      return result.finally(() => {
        this.recordMetric(name, performance.now() - start);
      });
    }

    this.recordMetric(name, performance.now() - start);
    return result;
  }

  private recordMetric(name: string, duration: number) {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    this.metrics.get(name)!.push(duration);

    // Warn if exceeds budget
    const budgets: Record<string, number> = {
      'initial-render': 200,
      'filter-operation': 100,
      'category-toggle': 50,
    };

    if (budgets[name] && duration > budgets[name]) {
      console.warn(`⚠️ ${name} exceeded budget: ${duration.toFixed(2)}ms > ${budgets[name]}ms`);
    }
  }

  getStats(name: string) {
    const values = this.metrics.get(name) || [];
    if (values.length === 0) return null;

    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const max = Math.max(...values);
    const min = Math.min(...values);

    return { avg, max, min, count: values.length };
  }
}

export const perfMonitor = new PerformanceMonitor();
```

**Success Criteria**:
- ✅ 200+ tabs render in <200ms
- ✅ Scroll at 60fps steady
- ✅ Memory usage <100MB

---

### Phase 2: Keyboard Navigation

**Priority**: P0
**Dependencies**: None

**Manifest Updates**:
```json
{
  "commands": {
    "_execute_action": {
      "suggested_key": {
        "default": "Alt+T",
        "mac": "Alt+T"
      },
      "description": "Open tab organizer"
    },
    "open-search": {
      "suggested_key": {
        "default": "Ctrl+K",
        "mac": "Command+K"
      },
      "description": "Focus search"
    },
    "next-tab": {
      "suggested_key": {
        "default": "Ctrl+Down",
        "mac": "Command+Down"
      },
      "description": "Select next tab"
    },
    "prev-tab": {
      "suggested_key": {
        "default": "Ctrl+Up",
        "mac": "Command+Up"
      },
      "description": "Select previous tab"
    },
    "switch-to-selected": {
      "suggested_key": {
        "default": "Enter"
      },
      "description": "Switch to selected tab"
    },
    "close-selected": {
      "suggested_key": {
        "default": "Ctrl+W",
        "mac": "Command+W"
      },
      "description": "Close selected tab"
    }
  }
}
```

**Implementation**:
```typescript
// extension/src/hooks/useKeyboardNavigation.ts
import { useEffect, useState, useCallback } from 'react';
import { Tab } from '@types';

interface UseKeyboardNavigationProps {
  tabs: Tab[];
  onTabSwitch: (tab: Tab) => void;
  onTabClose: (tabId: number) => void;
}

export function useKeyboardNavigation({
  tabs,
  onTabSwitch,
  onTabClose
}: UseKeyboardNavigationProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [searchFocused, setSearchFocused] = useState(false);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Don't interfere when user is typing in search
    if (searchFocused) {
      if (e.key === 'Escape') {
        setSearchFocused(false);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, tabs.length - 1));
        break;

      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
        break;

      case 'Enter':
        e.preventDefault();
        if (tabs[selectedIndex]) {
          onTabSwitch(tabs[selectedIndex]);
        }
        break;

      case 'Delete':
      case 'Backspace':
        e.preventDefault();
        if (tabs[selectedIndex]) {
          onTabClose(tabs[selectedIndex].id);
        }
        break;

      case 'k':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          setSearchFocused(true);
        }
        break;

      case '/':
        e.preventDefault();
        setSearchFocused(true);
        break;
    }
  }, [tabs, selectedIndex, searchFocused, onTabSwitch, onTabClose]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Listen for Chrome command events
  useEffect(() => {
    chrome.commands.onCommand.addListener((command) => {
      switch (command) {
        case 'open-search':
          setSearchFocused(true);
          break;
        case 'next-tab':
          setSelectedIndex(prev => Math.min(prev + 1, tabs.length - 1));
          break;
        case 'prev-tab':
          setSelectedIndex(prev => Math.max(prev - 1, 0));
          break;
        case 'switch-to-selected':
          if (tabs[selectedIndex]) {
            onTabSwitch(tabs[selectedIndex]);
          }
          break;
        case 'close-selected':
          if (tabs[selectedIndex]) {
            onTabClose(tabs[selectedIndex].id);
          }
          break;
      }
    });
  }, [tabs, selectedIndex, onTabSwitch, onTabClose]);

  return {
    selectedIndex,
    setSelectedIndex,
    searchFocused,
    setSearchFocused,
  };
}
```

**Accessibility**:
```typescript
// Add to TabItem component
<div
  role="option"
  aria-selected={isSelected}
  aria-label={`${tab.title} - ${tab.url}`}
  tabIndex={isSelected ? 0 : -1}
  className={`tab-item ${isSelected ? 'bg-blue-50 ring-2 ring-blue-500' : ''}`}
>
```

**Success Criteria**:
- ✅ All keyboard shortcuts work
- ✅ No conflicts with Chrome/OS shortcuts
- ✅ ARIA attributes present
- ✅ Visual focus indicator
- ✅ <16ms response time (60fps)

---

### Phase 3: Visual Density Modes

**Priority**: P0
**Dependencies**: Phase 1 (Virtual scrolling)

**Storage Schema**:
```typescript
// extension/src/types/settings.ts
export interface Settings {
  apiKey: string;
  jiraMode: boolean;
  density: 'compact' | 'comfortable' | 'spacious';
  theme: 'light' | 'dark' | 'system';
}
```

**Implementation**:
```typescript
// extension/src/contexts/DensityContext.tsx
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Density = 'compact' | 'comfortable' | 'spacious';

interface DensityContextValue {
  density: Density;
  setDensity: (density: Density) => void;
}

const DensityContext = createContext<DensityContextValue | null>(null);

export function DensityProvider({ children }: { children: ReactNode }) {
  const [density, setDensityState] = useState<Density>('comfortable');

  useEffect(() => {
    // Load from storage
    chrome.storage.local.get(['density'], (result) => {
      if (result.density) {
        setDensityState(result.density);
      }
    });
  }, []);

  const setDensity = (newDensity: Density) => {
    setDensityState(newDensity);
    chrome.storage.local.set({ density: newDensity });
  };

  return (
    <DensityContext.Provider value={{ density, setDensity }}>
      {children}
    </DensityContext.Provider>
  );
}

export function useDensity() {
  const context = useContext(DensityContext);
  if (!context) {
    throw new Error('useDensity must be used within DensityProvider');
  }
  return context;
}
```

**CSS Variables**:
```css
/* extension/src/styles/density.css */
:root {
  /* Compact */
  --density-compact-item-height: 32px;
  --density-compact-icon-size: 14px;
  --density-compact-font-size: 13px;
  --density-compact-padding: 8px;
  --density-compact-gap: 4px;

  /* Comfortable (default) */
  --density-comfortable-item-height: 48px;
  --density-comfortable-icon-size: 16px;
  --density-comfortable-font-size: 14px;
  --density-comfortable-padding: 12px;
  --density-comfortable-gap: 8px;

  /* Spacious */
  --density-spacious-item-height: 64px;
  --density-spacious-icon-size: 20px;
  --density-spacious-font-size: 15px;
  --density-spacious-padding: 16px;
  --density-spacious-gap: 12px;
}

.density-compact {
  --item-height: var(--density-compact-item-height);
  --icon-size: var(--density-compact-icon-size);
  --font-size: var(--density-compact-font-size);
  --padding: var(--density-compact-padding);
  --gap: var(--density-compact-gap);
}

.density-comfortable {
  --item-height: var(--density-comfortable-item-height);
  --icon-size: var(--density-comfortable-icon-size);
  --font-size: var(--density-comfortable-font-size);
  --padding: var(--density-comfortable-padding);
  --gap: var(--density-comfortable-gap);
}

.density-spacious {
  --item-height: var(--density-spacious-item-height);
  --icon-size: var(--density-spacious-icon-size);
  --font-size: var(--density-spacious-font-size);
  --padding: var(--density-spacious-padding);
  --gap: var(--density-spacious-gap);
}
```

**Density Controls**:
```typescript
// extension/src/components/DensityControls.tsx
import { useDensity } from '@contexts/DensityContext';

export function DensityControls() {
  const { density, setDensity } = useDensity();

  return (
    <div className="flex gap-2" role="radiogroup" aria-label="Display density">
      <button
        role="radio"
        aria-checked={density === 'compact'}
        aria-label="Compact density"
        onClick={() => setDensity('compact')}
        className={`px-3 py-1 rounded ${density === 'compact' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
      >
        Compact
      </button>
      <button
        role="radio"
        aria-checked={density === 'comfortable'}
        aria-label="Comfortable density"
        onClick={() => setDensity('comfortable')}
        className={`px-3 py-1 rounded ${density === 'comfortable' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
      >
        Comfortable
      </button>
      <button
        role="radio"
        aria-checked={density === 'spacious'}
        aria-label="Spacious density"
        onClick={() => setDensity('spacious')}
        className={`px-3 py-1 rounded ${density === 'spacious' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
      >
        Spacious
      </button>
    </div>
  );
}
```

**Success Criteria**:
- ✅ Three density modes work correctly
- ✅ Settings persist across sessions
- ✅ Virtual scroll adjusts item height
- ✅ Smooth transition between modes

---

### Phase 4: Collapsible Groups

**Priority**: P1
**Dependencies**: Phase 3 (Density modes)

**State Management**:
```typescript
// extension/src/types/category.ts
export interface CategoryState {
  name: string;
  tabs: Tab[];
  collapsed: boolean;
  summary?: string;
}

// extension/src/hooks/useCollapsibleCategories.ts
import { useState, useEffect } from 'react';

export function useCollapsibleCategories(categories: string[]) {
  const [collapsedState, setCollapsedState] = useState<Record<string, boolean>>({});

  useEffect(() => {
    // Load from storage
    chrome.storage.local.get(['collapsedCategories'], (result) => {
      if (result.collapsedCategories) {
        setCollapsedState(result.collapsedCategories);
      }
    });
  }, []);

  const toggleCategory = (categoryName: string) => {
    const newState = {
      ...collapsedState,
      [categoryName]: !collapsedState[categoryName],
    };
    setCollapsedState(newState);
    chrome.storage.local.set({ collapsedCategories: newState });
  };

  const collapseAll = () => {
    const newState = categories.reduce((acc, cat) => ({ ...acc, [cat]: true }), {});
    setCollapsedState(newState);
    chrome.storage.local.set({ collapsedCategories: newState });
  };

  const expandAll = () => {
    setCollapsedState({});
    chrome.storage.local.set({ collapsedCategories: {} });
  };

  return {
    collapsedState,
    toggleCategory,
    collapseAll,
    expandAll,
  };
}
```

**Component**:
```typescript
// extension/src/components/shared/CategoryHeader.tsx
interface CategoryHeaderProps {
  name: string;
  count: number;
  collapsed: boolean;
  onToggle: () => void;
}

export function CategoryHeader({ name, count, collapsed, onToggle }: CategoryHeaderProps) {
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center gap-2 px-3 py-2 bg-gray-50 hover:bg-gray-100"
      aria-expanded={!collapsed}
      aria-controls={`category-${name}`}
      aria-label={`${collapsed ? 'Expand' : 'Collapse'} ${name} category with ${count} tabs`}
    >
      <svg
        className={`w-4 h-4 transition-transform ${collapsed ? '' : 'rotate-90'}`}
        fill="currentColor"
        viewBox="0 0 20 20"
        aria-hidden="true"
      >
        <path d="M6 6L14 10L6 14V6Z" />
      </svg>
      <span className="font-semibold">{name}</span>
      <span className="text-sm text-gray-500">({count})</span>
      <div className="ml-auto flex gap-1">
        <kbd className="px-1 py-0.5 text-xs bg-white border rounded">Space</kbd>
      </div>
    </button>
  );
}
```

**Keyboard Support**:
```typescript
// Add to useKeyboardNavigation hook
case 'Space':
  e.preventDefault();
  // Toggle category if focused
  const currentTab = tabs[selectedIndex];
  const category = getCategoryForTab(currentTab);
  if (category) {
    toggleCategory(category);
  }
  break;

case 'c':
  if (e.ctrlKey || e.metaKey) {
    e.preventDefault();
    collapseAll();
  }
  break;

case 'e':
  if (e.ctrlKey || e.metaKey) {
    e.preventDefault();
    expandAll();
  }
  break;
```

**Success Criteria**:
- ✅ Categories collapse/expand smoothly
- ✅ State persists across sessions
- ✅ Keyboard shortcuts work
- ✅ ARIA attributes correct
- ✅ Collapse/expand in <50ms

---

### Phase 5: Side Panel Mode

**Priority**: P0
**Dependencies**: Phases 1-4

**Manifest Updates**:
```json
{
  "side_panel": {
    "default_path": "sidepanel.html"
  },
  "permissions": ["sidePanel"]
}
```

**Feature Detection**:
```typescript
// extension/src/utils/features.ts
export async function detectFeatures() {
  return {
    sidePanel: 'sidePanel' in chrome,
    processes: await chrome.permissions.contains({ permissions: ['processes'] }),
    commands: 'commands' in chrome,
  };
}

export async function canUseSidePanel(): Promise<boolean> {
  if (!('sidePanel' in chrome)) {
    console.warn('Side panel API not available (requires Chrome 114+)');
    return false;
  }
  return true;
}
```

**Component Library Structure**:
```
extension/src/
├── components/
│   ├── shared/              # Shared between popup and side panel
│   │   ├── VirtualTabList.tsx
│   │   ├── TabItem.tsx
│   │   ├── CategoryHeader.tsx
│   │   ├── FilterChips.tsx
│   │   ├── SearchBar.tsx
│   │   └── DensityControls.tsx
│   ├── popup/               # Popup-specific
│   │   └── PopupHeader.tsx
│   └── sidepanel/           # Side panel-specific
│       └── SidePanelHeader.tsx
├── contexts/
│   ├── TabContext.tsx       # Shared tab state
│   ├── DensityContext.tsx   # Density preference
│   └── SettingsContext.tsx  # Settings
├── hooks/
│   ├── useKeyboardNavigation.ts
│   ├── useCollapsibleCategories.ts
│   └── useTabs.ts
├── popup.tsx                # Popup entry point
└── sidepanel.tsx            # Side panel entry point (NEW)
```

**Shared State Management**:
```typescript
// extension/src/contexts/TabContext.tsx
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Tab, CategoryState } from '@types';

interface TabContextValue {
  tabs: Tab[];
  categories: CategoryState[];
  loading: boolean;
  error: string | null;
  refreshTabs: () => Promise<void>;
}

const TabContext = createContext<TabContextValue | null>(null);

export function TabProvider({ children }: { children: ReactNode }) {
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [categories, setCategories] = useState<CategoryState[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshTabs = async () => {
    setLoading(true);
    setError(null);

    try {
      const allTabs = await chrome.tabs.query({});
      setTabs(allTabs);

      // Categorize tabs
      const categorized = await categorizeTabs(allTabs);
      setCategories(categorized);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tabs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshTabs();

    // Listen for tab changes
    const handleTabUpdate = () => refreshTabs();
    chrome.tabs.onCreated.addListener(handleTabUpdate);
    chrome.tabs.onRemoved.addListener(handleTabUpdate);
    chrome.tabs.onUpdated.addListener(handleTabUpdate);

    return () => {
      chrome.tabs.onCreated.removeListener(handleTabUpdate);
      chrome.tabs.onRemoved.removeListener(handleTabUpdate);
      chrome.tabs.onUpdated.removeListener(handleTabUpdate);
    };
  }, []);

  return (
    <TabContext.Provider value={{ tabs, categories, loading, error, refreshTabs }}>
      {children}
    </TabContext.Provider>
  );
}

export function useTabs() {
  const context = useContext(TabContext);
  if (!context) {
    throw new Error('useTabs must be used within TabProvider');
  }
  return context;
}
```

**Side Panel Entry Point**:
```typescript
// extension/src/sidepanel.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { TabProvider } from '@contexts/TabContext';
import { DensityProvider } from '@contexts/DensityContext';
import { SettingsProvider } from '@contexts/SettingsContext';
import { SidePanelApp } from './components/sidepanel/SidePanelApp';
import './styles/index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <SettingsProvider>
      <DensityProvider>
        <TabProvider>
          <SidePanelApp />
        </TabProvider>
      </DensityProvider>
    </SettingsProvider>
  </React.StrictMode>
);
```

**Side Panel HTML**:
```html
<!-- extension/sidepanel.html -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>AI Tab Organizer</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/sidepanel.tsx"></script>
</body>
</html>
```

**Vite Configuration Update**:
```typescript
// extension/vite.config.ts
export default defineConfig({
  // ... existing config
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'popup.html'),
        sidepanel: resolve(__dirname, 'sidepanel.html'), // NEW
      },
    }
  }
});
```

**Custom Vite Plugin Update**:
```typescript
{
  name: 'copy-extension-files',
  closeBundle() {
    if (!existsSync('dist')) {
      mkdirSync('dist', { recursive: true });
    }

    // Copy manifest.json
    copyFileSync('manifest.json', 'dist/manifest.json');

    // Copy background.js
    copyFileSync('background.js', 'dist/background.js');

    // Copy content-extractor.js
    copyFileSync('content-extractor.js', 'dist/content-extractor.js');

    console.log('✅ Extension files copied to dist/');
  }
}
```

**Success Criteria**:
- ✅ Side panel opens correctly
- ✅ All features work in side panel
- ✅ State syncs between popup and side panel
- ✅ Graceful fallback for Chrome <114
- ✅ Both entry points build correctly

---

### Phase 6: Smart Filter Chips

**Priority**: P1
**Dependencies**: Phase 4 (Categories)

**Implementation**:
```typescript
// extension/src/types/filter.ts
export type FilterType =
  | 'all'
  | 'active'
  | 'pinned'
  | 'duplicates'
  | 'audible'
  | 'unread'
  | 'memory-high';

export interface Filter {
  type: FilterType;
  label: string;
  icon: string;
  count: number;
  active: boolean;
}

// extension/src/hooks/useFilters.ts
import { useMemo, useState } from 'react';
import { Tab } from '@types';

export function useFilters(tabs: Tab[]) {
  const [activeFilters, setActiveFilters] = useState<Set<FilterType>>(new Set(['all']));

  const filters: Filter[] = useMemo(() => {
    const activeTabs = tabs.filter(t => t.active);
    const pinnedTabs = tabs.filter(t => t.pinned);
    const audibleTabs = tabs.filter(t => t.audible);
    const duplicates = findDuplicates(tabs);

    return [
      { type: 'all', label: 'All Tabs', icon: '📋', count: tabs.length, active: activeFilters.has('all') },
      { type: 'active', label: 'Active', icon: '✓', count: activeTabs.length, active: activeFilters.has('active') },
      { type: 'pinned', label: 'Pinned', icon: '📌', count: pinnedTabs.length, active: activeFilters.has('pinned') },
      { type: 'audible', label: 'Playing', icon: '🔊', count: audibleTabs.length, active: activeFilters.has('audible') },
      { type: 'duplicates', label: 'Duplicates', icon: '👥', count: duplicates.length, active: activeFilters.has('duplicates') },
    ];
  }, [tabs, activeFilters]);

  const filteredTabs = useMemo(() => {
    if (activeFilters.has('all') || activeFilters.size === 0) {
      return tabs;
    }

    return tabs.filter(tab => {
      if (activeFilters.has('active') && tab.active) return true;
      if (activeFilters.has('pinned') && tab.pinned) return true;
      if (activeFilters.has('audible') && tab.audible) return true;
      if (activeFilters.has('duplicates') && isDuplicate(tab, tabs)) return true;
      return false;
    });
  }, [tabs, activeFilters]);

  const toggleFilter = (type: FilterType) => {
    setActiveFilters(prev => {
      const next = new Set(prev);

      if (type === 'all') {
        return new Set(['all']);
      }

      next.delete('all');

      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }

      if (next.size === 0) {
        next.add('all');
      }

      return next;
    });
  };

  return {
    filters,
    filteredTabs,
    activeFilters,
    toggleFilter,
  };
}
```

**Component**:
```typescript
// extension/src/components/shared/FilterChips.tsx
interface FilterChipsProps {
  filters: Filter[];
  onToggle: (type: FilterType) => void;
}

export function FilterChips({ filters, onToggle }: FilterChipsProps) {
  return (
    <div
      className="flex flex-wrap gap-2 p-3 border-b"
      role="toolbar"
      aria-label="Tab filters"
    >
      {filters.map(filter => (
        <button
          key={filter.type}
          onClick={() => onToggle(filter.type)}
          className={`
            flex items-center gap-1 px-3 py-1 rounded-full text-sm transition-colors
            ${filter.active
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }
          `}
          aria-pressed={filter.active}
          aria-label={`Filter by ${filter.label}, ${filter.count} tabs`}
        >
          <span aria-hidden="true">{filter.icon}</span>
          <span>{filter.label}</span>
          <span className="font-semibold">{filter.count}</span>
        </button>
      ))}
    </div>
  );
}
```

**Success Criteria**:
- ✅ Filters work correctly
- ✅ Multiple filters can be active
- ✅ Filter in <100ms
- ✅ ARIA attributes present

---

### Phase 7: Visual Status Indicators (Basic)

**Priority**: P2
**Dependencies**: Tab metadata infrastructure

**Tab Metadata Infrastructure**:
```typescript
// extension/background.js - Add to existing file

// Track last accessed time
const tabAccessTimes = new Map();

chrome.tabs.onActivated.addListener(({ tabId }) => {
  tabAccessTimes.set(tabId, Date.now());
});

chrome.tabs.onRemoved.addListener((tabId) => {
  tabAccessTimes.delete(tabId);
});

// Add to message listener
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getTabMetadata') {
    const { tabId } = request;
    const metadata = {
      lastAccessed: tabAccessTimes.get(tabId) || Date.now(),
      // Memory info requires 'processes' permission
      // memory: await getTabMemory(tabId),
    };
    sendResponse(metadata);
  }
});

// Optional: Get memory usage (requires 'processes' permission)
async function getTabMemory(tabId) {
  try {
    const tab = await chrome.tabs.get(tabId);
    if (!tab.windowId) return null;

    // This requires 'processes' permission in manifest
    const processes = await chrome.processes.getProcessInfo([tab.id], true);
    // ... process memory calculation
    return null; // Simplified for now
  } catch (err) {
    return null;
  }
}
```

**Status Indicators** (Start Simple):
```typescript
// extension/src/components/shared/TabStatusIndicators.tsx
interface TabStatusIndicatorsProps {
  tab: Tab;
  showMemory?: boolean;
}

export function TabStatusIndicators({ tab, showMemory = false }: TabStatusIndicatorsProps) {
  return (
    <div className="flex items-center gap-1" aria-label="Tab status">
      {/* Active indicator */}
      {tab.active && (
        <span
          className="w-2 h-2 bg-green-500 rounded-full"
          title="Active tab"
          aria-label="Active"
        />
      )}

      {/* Pinned indicator */}
      {tab.pinned && (
        <span
          className="text-xs"
          title="Pinned tab"
          aria-label="Pinned"
        >
          📌
        </span>
      )}

      {/* Audible indicator */}
      {tab.audible && (
        <span
          className="text-xs animate-pulse"
          title="Playing audio"
          aria-label="Playing audio"
        >
          🔊
        </span>
      )}

      {/* Duplicate indicator */}
      {isDuplicate(tab) && (
        <span
          className="text-xs text-yellow-600"
          title="Duplicate tab"
          aria-label="Duplicate"
        >
          👥
        </span>
      )}

      {/* Memory indicator - Phase 2 */}
      {showMemory && (
        <span
          className="text-xs px-1 bg-red-100 text-red-700 rounded"
          title="High memory usage"
        >
          High
        </span>
      )}
    </div>
  );
}
```

**Success Criteria**:
- ✅ Basic indicators work (active, pinned, audible, duplicate)
- ✅ Performance not impacted
- ✅ Accessible with screen readers

---

### Phase 8: Quick Actions Menu

**Priority**: P2
**Dependencies**: Multi-select state

**Implementation** (Without Thumbnails):
```typescript
// extension/src/hooks/useMultiSelect.ts
import { useState, useCallback } from 'react';
import { Tab } from '@types';

export function useMultiSelect(tabs: Tab[]) {
  const [selectedTabIds, setSelectedTabIds] = useState<Set<number>>(new Set());

  const toggleSelect = useCallback((tabId: number, multiSelect: boolean = false) => {
    setSelectedTabIds(prev => {
      const next = new Set(prev);

      if (!multiSelect) {
        // Single select mode
        next.clear();
        next.add(tabId);
      } else {
        // Multi select mode
        if (next.has(tabId)) {
          next.delete(tabId);
        } else {
          next.add(tabId);
        }
      }

      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedTabIds(new Set(tabs.map(t => t.id)));
  }, [tabs]);

  const clearSelection = useCallback(() => {
    setSelectedTabIds(new Set());
  }, []);

  const selectedTabs = tabs.filter(t => selectedTabIds.has(t.id));

  return {
    selectedTabIds,
    selectedTabs,
    toggleSelect,
    selectAll,
    clearSelection,
  };
}
```

**Quick Actions Component**:
```typescript
// extension/src/components/shared/QuickActionsMenu.tsx
interface QuickActionsMenuProps {
  selectedTabs: Tab[];
  onClose: () => void;
  onMoveToNewWindow: () => void;
  onBookmark: () => void;
  onCloseAll: () => void;
}

export function QuickActionsMenu({
  selectedTabs,
  onClose,
  onMoveToNewWindow,
  onBookmark,
  onCloseAll,
}: QuickActionsMenuProps) {
  const count = selectedTabs.length;

  if (count === 0) return null;

  return (
    <div
      className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-white shadow-lg rounded-lg p-4 border-2 border-gray-200"
      role="dialog"
      aria-label={`Quick actions for ${count} selected tabs`}
    >
      <div className="flex items-center gap-4">
        <span className="font-semibold">{count} selected</span>

        <button
          onClick={onMoveToNewWindow}
          className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
          aria-label="Move to new window"
        >
          🪟 New Window
        </button>

        <button
          onClick={onBookmark}
          className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
          aria-label="Bookmark all"
        >
          ⭐ Bookmark
        </button>

        <button
          onClick={onCloseAll}
          className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
          aria-label="Close all"
        >
          ✕ Close All
        </button>

        <button
          onClick={onClose}
          className="ml-auto text-gray-500 hover:text-gray-700"
          aria-label="Cancel"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
```

**Keyboard Support for Multi-Select**:
```typescript
// Add to useKeyboardNavigation
case 'a':
  if (e.ctrlKey || e.metaKey) {
    e.preventDefault();
    selectAll();
  }
  break;

case 'Escape':
  e.preventDefault();
  clearSelection();
  break;

case 'Enter':
  if (e.shiftKey) {
    e.preventDefault();
    // Toggle multi-select for current item
    toggleSelect(tabs[selectedIndex].id, true);
  } else {
    // Normal Enter switches to tab
    onTabSwitch(tabs[selectedIndex]);
  }
  break;
```

**Success Criteria**:
- ✅ Multi-select works with Shift+Click and Shift+Enter
- ✅ Quick actions menu appears for selected tabs
- ✅ All actions work correctly
- ✅ Keyboard accessible

---

## Architecture Updates

### Directory Structure (Final)

```
extension/
├── src/
│   ├── components/
│   │   ├── shared/              # Shared components
│   │   │   ├── VirtualTabList.tsx
│   │   │   ├── TabItem.tsx
│   │   │   ├── CategoryHeader.tsx
│   │   │   ├── FilterChips.tsx
│   │   │   ├── SearchBar.tsx
│   │   │   ├── DensityControls.tsx
│   │   │   ├── TabStatusIndicators.tsx
│   │   │   └── QuickActionsMenu.tsx
│   │   ├── popup/               # Popup-specific
│   │   │   └── PopupHeader.tsx
│   │   ├── sidepanel/           # Side panel-specific
│   │   │   ├── SidePanelApp.tsx
│   │   │   └── SidePanelHeader.tsx
│   │   └── (existing components)
│   │       ├── CategoryView.tsx
│   │       ├── TabSearch.tsx
│   │       ├── DuplicateDetection.tsx
│   │       ├── JiraView.tsx
│   │       └── SettingsPanel.tsx
│   ├── contexts/                # React Context for state
│   │   ├── TabContext.tsx
│   │   ├── DensityContext.tsx
│   │   └── SettingsContext.tsx
│   ├── hooks/                   # Custom hooks
│   │   ├── useKeyboardNavigation.ts
│   │   ├── useCollapsibleCategories.ts
│   │   ├── useFilters.ts
│   │   ├── useMultiSelect.ts
│   │   └── useTabs.ts
│   ├── services/                # Existing services
│   │   ├── claudeApi.ts
│   │   ├── tabManager.ts
│   │   ├── searchService.ts
│   │   ├── summaryService.ts
│   │   └── jira/
│   ├── types/                   # TypeScript types
│   │   ├── index.ts
│   │   ├── filter.ts
│   │   ├── settings.ts
│   │   └── category.ts
│   ├── utils/                   # Utilities
│   │   ├── performance.ts       # NEW
│   │   ├── features.ts          # NEW
│   │   └── storage.ts
│   ├── styles/                  # Styles
│   │   ├── index.css
│   │   └── density.css          # NEW
│   ├── popup.tsx                # Popup entry
│   └── sidepanel.tsx            # Side panel entry (NEW)
├── background.js                # Background worker
├── content-extractor.js         # Content script
├── manifest.json                # Extension manifest
├── popup.html                   # Popup HTML
├── sidepanel.html               # Side panel HTML (NEW)
├── vite.config.ts               # Build config
├── tsconfig.json                # TypeScript config
└── package.json                 # Dependencies
```

### Manifest Updates (Final)

```json
{
  "manifest_version": 3,
  "name": "AI Tab Organizer",
  "version": "0.2.0",
  "description": "AI-powered tab organization with smart filtering and keyboard navigation",

  "permissions": [
    "tabs",
    "storage",
    "scripting",
    "activeTab",
    "sidePanel"
  ],

  "optional_permissions": [
    "processes"
  ],

  "host_permissions": [
    "https://api.anthropic.com/*",
    "<all_urls>"
  ],

  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },

  "side_panel": {
    "default_path": "sidepanel.html"
  },

  "background": {
    "service_worker": "background.js"
  },

  "commands": {
    "_execute_action": {
      "suggested_key": {
        "default": "Alt+T",
        "mac": "Alt+T"
      },
      "description": "Open tab organizer"
    },
    "open-search": {
      "suggested_key": {
        "default": "Ctrl+K",
        "mac": "Command+K"
      },
      "description": "Focus search"
    },
    "next-tab": {
      "suggested_key": {
        "default": "Ctrl+Down",
        "mac": "Command+Down"
      },
      "description": "Select next tab"
    },
    "prev-tab": {
      "suggested_key": {
        "default": "Ctrl+Up",
        "mac": "Command+Up"
      },
      "description": "Select previous tab"
    },
    "switch-to-selected": {
      "suggested_key": {
        "default": "Enter"
      },
      "description": "Switch to selected tab"
    },
    "close-selected": {
      "suggested_key": {
        "default": "Ctrl+W",
        "mac": "Command+W"
      },
      "description": "Close selected tab"
    }
  },

  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

### Dependencies (package.json updates)

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-window": "^1.8.10"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@types/react-window": "^1.8.8",
    "@types/chrome": "^0.0.254",
    "@vitejs/plugin-react": "^4.2.0",
    "typescript": "^5.3.0",
    "vite": "^5.0.0",
    "vitest": "^3.2.4",
    "tailwindcss": "^3.3.6",
    "postcss": "^8.4.32",
    "autoprefixer": "^10.4.16"
  }
}
```

---

## Testing Strategy

### Unit Tests

**Coverage Target**: 80% for core services and hooks

**Test Files to Create**:

```typescript
// extension/src/hooks/__tests__/useKeyboardNavigation.test.ts
import { renderHook, act } from '@testing-library/react';
import { useKeyboardNavigation } from '../useKeyboardNavigation';

describe('useKeyboardNavigation', () => {
  const mockTabs = [
    { id: 1, title: 'Tab 1', url: 'https://example1.com' },
    { id: 2, title: 'Tab 2', url: 'https://example2.com' },
  ];

  it('should move selection down on ArrowDown', () => {
    const { result } = renderHook(() =>
      useKeyboardNavigation({
        tabs: mockTabs,
        onTabSwitch: jest.fn(),
        onTabClose: jest.fn()
      })
    );

    act(() => {
      const event = new KeyboardEvent('keydown', { key: 'ArrowDown' });
      window.dispatchEvent(event);
    });

    expect(result.current.selectedIndex).toBe(1);
  });

  it('should switch to tab on Enter', () => {
    const onTabSwitch = jest.fn();
    const { result } = renderHook(() =>
      useKeyboardNavigation({
        tabs: mockTabs,
        onTabSwitch,
        onTabClose: jest.fn()
      })
    );

    act(() => {
      const event = new KeyboardEvent('keydown', { key: 'Enter' });
      window.dispatchEvent(event);
    });

    expect(onTabSwitch).toHaveBeenCalledWith(mockTabs[0]);
  });
});
```

```typescript
// extension/src/hooks/__tests__/useFilters.test.ts
import { renderHook, act } from '@testing-library/react';
import { useFilters } from '../useFilters';

describe('useFilters', () => {
  const mockTabs = [
    { id: 1, title: 'Tab 1', pinned: true, active: false },
    { id: 2, title: 'Tab 2', pinned: false, active: true },
    { id: 3, title: 'Tab 3', pinned: false, active: false, audible: true },
  ];

  it('should return all tabs when "all" filter active', () => {
    const { result } = renderHook(() => useFilters(mockTabs));
    expect(result.current.filteredTabs).toHaveLength(3);
  });

  it('should filter pinned tabs', () => {
    const { result } = renderHook(() => useFilters(mockTabs));

    act(() => {
      result.current.toggleFilter('pinned');
    });

    expect(result.current.filteredTabs).toHaveLength(1);
    expect(result.current.filteredTabs[0].id).toBe(1);
  });

  it('should handle multiple active filters', () => {
    const { result } = renderHook(() => useFilters(mockTabs));

    act(() => {
      result.current.toggleFilter('pinned');
      result.current.toggleFilter('active');
    });

    expect(result.current.filteredTabs).toHaveLength(2);
  });
});
```

```typescript
// extension/src/utils/__tests__/performance.test.ts
import { PerformanceMonitor } from '../performance';

describe('PerformanceMonitor', () => {
  let monitor: PerformanceMonitor;

  beforeEach(() => {
    monitor = new PerformanceMonitor();
  });

  it('should record performance metrics', () => {
    monitor.measure('test', () => {
      // Simulate work
      for (let i = 0; i < 1000; i++) {}
    });

    const stats = monitor.getStats('test');
    expect(stats).not.toBeNull();
    expect(stats!.count).toBe(1);
  });

  it('should warn if exceeds budget', () => {
    const warnSpy = jest.spyOn(console, 'warn');

    monitor.measure('initial-render', () => {
      // Simulate slow operation
      const start = Date.now();
      while (Date.now() - start < 300) {}
    });

    expect(warnSpy).toHaveBeenCalled();
  });
});
```

### Integration Tests

**Test Scenarios**:

1. **Complete Categorization Flow**:
   - Load extension → Query tabs → Categorize → Render
   - Validate: All tabs categorized, no errors, <500ms

2. **Keyboard Navigation Flow**:
   - Open extension → Press ArrowDown × 3 → Press Enter
   - Validate: Correct tab activated

3. **Filter + Search Flow**:
   - Apply filter → Enter search query → View results
   - Validate: Results correct, performance <100ms

4. **Multi-Select Flow**:
   - Shift+Click multiple tabs → Open quick actions → Close all
   - Validate: All selected tabs closed

### E2E Tests (Optional - Playwright)

```typescript
// extension/tests/e2e/keyboard-navigation.spec.ts
import { test, expect } from '@playwright/test';

test('keyboard navigation works end-to-end', async ({ page }) => {
  // Load extension
  await page.goto('chrome://extensions');

  // Open popup
  await page.click('[data-testid="extension-icon"]');

  // Wait for tabs to load
  await page.waitForSelector('[data-testid="tab-list"]');

  // Press ArrowDown
  await page.keyboard.press('ArrowDown');

  // Verify selection moved
  const selected = await page.locator('.tab-item-selected');
  expect(await selected.textContent()).toContain('Tab 2');

  // Press Enter
  await page.keyboard.press('Enter');

  // Verify tab switched
  // ... validation
});
```

### Performance Tests

```typescript
// extension/src/__tests__/performance.bench.ts
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { VirtualTabList } from '@components/shared/VirtualTabList';
import { generateTabs } from './utils';

describe('Performance Benchmarks', () => {
  it('should render 100 tabs in <200ms', () => {
    const tabs = generateTabs(100);

    const start = performance.now();
    render(<VirtualTabList tabs={tabs} density="comfortable" />);
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(200);
  });

  it('should render 500 tabs in <500ms', () => {
    const tabs = generateTabs(500);

    const start = performance.now();
    render(<VirtualTabList tabs={tabs} density="compact" />);
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(500);
  });

  it('should filter 200 tabs in <100ms', () => {
    const tabs = generateTabs(200);

    const start = performance.now();
    const filtered = tabs.filter(t => t.title.includes('test'));
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(100);
  });
});
```

---

## Accessibility Compliance

### WCAG 2.1 AA Requirements

**Target Compliance**: WCAG 2.1 Level AA

### Required Implementation

#### 1. Keyboard Navigation

**Requirements**:
- All interactive elements accessible via keyboard
- Visible focus indicators
- Logical tab order
- No keyboard traps

**Implementation**:
```typescript
// Focus management
const [focusedIndex, setFocusedIndex] = useState(0);

useEffect(() => {
  const focusedElement = document.querySelector(`[data-index="${focusedIndex}"]`);
  if (focusedElement instanceof HTMLElement) {
    focusedElement.focus();
  }
}, [focusedIndex]);
```

```css
/* Visible focus indicators */
.tab-item:focus-visible {
  outline: 2px solid #2563eb;
  outline-offset: 2px;
}

.button:focus-visible {
  outline: 2px solid #2563eb;
  outline-offset: 2px;
}
```

#### 2. Screen Reader Support

**Requirements**:
- ARIA labels for all interactive elements
- ARIA live regions for dynamic content
- Semantic HTML structure
- Alt text for images

**Implementation**:
```typescript
// ARIA live region for announcements
<div
  role="status"
  aria-live="polite"
  aria-atomic="true"
  className="sr-only"
>
  {announcement}
</div>

// Announce tab count changes
useEffect(() => {
  setAnnouncement(`${tabs.length} tabs loaded`);
}, [tabs.length]);

// Announce filter changes
useEffect(() => {
  if (activeFilters.size > 0) {
    setAnnouncement(`Filtered to ${filteredTabs.length} tabs`);
  }
}, [filteredTabs.length]);
```

```typescript
// Semantic structure
<nav aria-label="Tab categories">
  <ul role="list">
    {categories.map(category => (
      <li key={category.name}>
        <button
          aria-expanded={!category.collapsed}
          aria-controls={`category-${category.name}`}
          aria-label={`${category.name} category, ${category.tabs.length} tabs`}
        >
          {category.name}
        </button>
        <ul
          id={`category-${category.name}`}
          role="list"
          aria-label={`${category.name} tabs`}
        >
          {category.tabs.map(tab => (
            <li role="listitem">
              <TabItem tab={tab} />
            </li>
          ))}
        </ul>
      </li>
    ))}
  </ul>
</nav>
```

#### 3. Color Contrast

**Requirements**:
- Text contrast ratio ≥ 4.5:1 (normal text)
- Text contrast ratio ≥ 3:1 (large text)
- UI component contrast ratio ≥ 3:1

**Color Palette** (WCAG AA Compliant):
```css
:root {
  /* Text colors */
  --text-primary: #1f2937;      /* 16.1:1 on white */
  --text-secondary: #4b5563;    /* 8.6:1 on white */
  --text-disabled: #9ca3af;     /* 3.5:1 on white */

  /* Background colors */
  --bg-primary: #ffffff;
  --bg-secondary: #f3f4f6;
  --bg-hover: #e5e7eb;

  /* Accent colors */
  --accent-primary: #2563eb;    /* 4.6:1 on white */
  --accent-hover: #1d4ed8;      /* 6.3:1 on white */

  /* Status colors */
  --success: #059669;           /* 4.5:1 on white */
  --warning: #d97706;           /* 4.5:1 on white */
  --error: #dc2626;             /* 5.9:1 on white */
}
```

#### 4. Text Alternatives

**Requirements**:
- Alt text for all images
- Labels for form controls
- Descriptive button text

**Implementation**:
```typescript
// Image alt text
<img
  src={tab.favIconUrl}
  alt={`${tab.title} favicon`}
  onError={(e) => {
    e.currentTarget.src = '/default-icon.png';
    e.currentTarget.alt = 'Default favicon';
  }}
/>

// Form labels
<label htmlFor="search-input" className="sr-only">
  Search tabs
</label>
<input
  id="search-input"
  type="text"
  placeholder="Search tabs..."
  aria-label="Search tabs"
/>

// Descriptive buttons
<button aria-label={`Close ${tab.title}`}>
  <span aria-hidden="true">×</span>
</button>
```

### Accessibility Testing

**Tools**:
- Chrome DevTools Lighthouse (Accessibility audit)
- axe DevTools extension
- NVDA/JAWS screen reader testing
- Keyboard-only navigation testing

**Test Checklist**:
- [ ] All interactive elements keyboard accessible
- [ ] Visible focus indicators on all elements
- [ ] Screen reader announces all content correctly
- [ ] Color contrast meets WCAG AA (4.5:1)
- [ ] No keyboard traps
- [ ] Logical tab order
- [ ] ARIA labels present and correct
- [ ] Dynamic content announced to screen readers

---

## Risk Mitigation

### High Priority Risks

#### 1. Performance Degradation with 200+ Tabs

**Risk**: React re-renders cause lag, defeating the purpose of improvements

**Probability**: High
**Impact**: High

**Mitigation Strategy**:
1. **Virtual Scrolling** (Week 1, Days 1-2)
   - Implement react-window immediately
   - Test with 500+ tabs
   - Target: 60fps steady scroll

2. **React Optimization**:
   - Use React.memo() for TabItem
   - Implement proper key props
   - Use useMemo/useCallback for expensive operations
   - Profile with React DevTools

3. **Lazy Loading**:
   - Load tab metadata on-demand
   - Defer favicon loading
   - Use IntersectionObserver for off-screen items

4. **Performance Monitoring**:
   - Add PerformanceMonitor utility
   - Track render times
   - Alert on budget violations

**Success Criteria**:
- Initial render <200ms (100 tabs)
- Scroll at 60fps (200+ tabs)
- Memory usage <100MB

---

#### 2. Tab Metadata Not Available

**Risk**: Chrome doesn't expose memory usage or last accessed time natively

**Probability**: Medium
**Impact**: Medium (limits Visual Status Indicators feature)

**Mitigation Strategy**:
1. **Manual Tracking**:
   - Track last accessed in background worker
   - Store in Map structure
   - Persist to chrome.storage (optional)

2. **Optional Permissions**:
   - Request 'processes' permission for memory
   - Graceful fallback if denied
   - Feature detection

3. **Simplified Indicators First**:
   - Phase 1: Active, pinned, audible, duplicates
   - Phase 2: Memory, last accessed (if possible)

4. **User Education**:
   - Explain permission benefits
   - Optional opt-in flow
   - Clear privacy messaging

**Success Criteria**:
- Basic indicators work without optional permissions
- Advanced indicators available with opt-in
- No errors if permissions denied

---

#### 3. Side Panel API Adoption

**Risk**: Side Panel API requires Chrome 114+ (May 2023), ~5% users on older versions

**Probability**: Low
**Impact**: Low (feature unavailable for minority of users)

**Mitigation Strategy**:
1. **Feature Detection**:
```typescript
export async function canUseSidePanel(): Promise<boolean> {
  if (!('sidePanel' in chrome)) {
    return false;
  }
  return true;
}
```

2. **Graceful Fallback**:
   - Detect browser version on load
   - Show "popup only" mode for Chrome <114
   - Clear messaging in settings

3. **User Communication**:
```typescript
if (!await canUseSidePanel()) {
  showNotification({
    type: 'info',
    message: 'Side panel requires Chrome 114+. Using popup mode.',
    action: { label: 'Learn More', url: 'https://...' }
  });
}
```

4. **Analytics** (Optional):
   - Track browser version distribution
   - Measure side panel adoption rate

**Success Criteria**:
- Feature detection works correctly
- Popup mode fully functional
- No errors on Chrome <114
- Clear communication to users

---

### Medium Priority Risks

#### 4. Keyboard Shortcut Conflicts

**Risk**: Chosen shortcuts conflict with Chrome/OS/other extensions

**Probability**: Medium
**Impact**: Low (frustrating UX, shortcuts don't work)

**Mitigation Strategy**:
1. **Use Chrome's suggested_key**:
   - Allows user customization
   - Chrome detects conflicts
   - User can change in chrome://extensions/shortcuts

2. **Provide Alternatives**:
   - Multiple ways to access features
   - Document shortcuts in help
   - Visual indicators (e.g., "Press / to search")

3. **Conflict Documentation**:
```typescript
// Help tooltip
const shortcutConflicts = [
  { key: 'Ctrl+K', conflicts: ['Chrome address bar'] },
  { key: 'Ctrl+W', conflicts: ['Close tab'] },
];
```

4. **Testing**:
   - Test on Windows, Mac, Linux
   - Test with popular extensions
   - Provide feedback in UI

**Success Criteria**:
- All shortcuts use suggested_key
- User can customize in Chrome settings
- Alternative access methods available
- Conflicts documented

---

#### 5. Build Complexity

**Risk**: Multiple entry points (popup, side panel) complicate build

**Probability**: Medium
**Impact**: Medium (slower iteration, harder maintenance)

**Mitigation Strategy**:
1. **Vite Multi-Page Config**:
```typescript
build: {
  rollupOptions: {
    input: {
      popup: resolve(__dirname, 'popup.html'),
      sidepanel: resolve(__dirname, 'sidepanel.html'),
    },
  }
}
```

2. **Shared Component Library**:
   - Create `components/shared/` directory
   - Import from both entry points
   - Single source of truth

3. **Automated Testing**:
   - Test both builds
   - Validate file outputs
   - CI/CD pipeline

4. **Clear Documentation**:
   - Document build process in CLAUDE.md
   - Provide troubleshooting guide
   - Common issues FAQ

**Success Criteria**:
- Both entry points build correctly
- No code duplication
- Hot reload works for both
- Build time <10 seconds

---

#### 6. State Synchronization

**Risk**: Popup and side panel can be open simultaneously with different states

**Probability**: Low
**Impact**: Medium (confusing UX, data inconsistency)

**Mitigation Strategy**:
1. **Single Source of Truth**:
   - Use chrome.storage for shared state
   - Listen for storage changes
   - Update both views

2. **Message Broadcasting**:
```typescript
// When state changes in popup
chrome.storage.local.set({ density: 'compact' });

// Listen in side panel
chrome.storage.onChanged.addListener((changes) => {
  if (changes.density) {
    setDensity(changes.density.newValue);
  }
});
```

3. **Context API**:
   - Use React Context for each entry point
   - Sync with chrome.storage
   - Automatic updates

4. **Testing**:
   - Open both popup and side panel
   - Change settings in one
   - Verify updates in other

**Success Criteria**:
- State syncs within 100ms
- No data loss
- No race conditions
- Consistent UI

---

## Success Metrics

### User Experience Metrics

**Target Improvements**:

| Metric | Current | Target | How to Measure |
|--------|---------|--------|----------------|
| **Time to find tab** | 15s | 3s | User testing, task completion time |
| **Tabs organized** | Manual | Automatic | Automatic categorization enabled |
| **Keyboard usage** | 0% | 40% | Track keyboard shortcut usage |
| **User satisfaction** | N/A | 4.5/5 | Post-feature survey |
| **Daily active users** | Baseline | +30% | Extension analytics |

### Performance Metrics

**Target Performance**:

| Operation | Target | Max | Test Method |
|-----------|--------|-----|-------------|
| Initial render (100 tabs) | <200ms | 300ms | Chrome DevTools Performance |
| Filter operation | <100ms | 150ms | Automated tests |
| Category toggle | <50ms | 100ms | Automated tests |
| Keyboard response | <16ms | 32ms | 60fps target |
| Memory usage | <100MB | 150MB | Chrome Task Manager |
| Scroll FPS | 60fps | 50fps | Performance profiler |

### Technical Metrics

**Code Quality**:

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Test coverage | 80% | Vitest coverage report |
| TypeScript strict mode | 100% | tsc --noEmit |
| Lighthouse score | 95+ | Chrome DevTools Lighthouse |
| Accessibility score | 95+ | axe DevTools |
| Bundle size | <500KB | Vite build output |

### Adoption Metrics

**Feature Usage** (Track after 1 month):

| Feature | Target Adoption | How to Measure |
|---------|----------------|----------------|
| Side panel mode | 60% | localStorage flag |
| Keyboard shortcuts | 40% | Event listeners |
| Density modes | 70% | Storage setting |
| Collapsible groups | 80% | Storage setting |
| Smart filters | 50% | Filter toggle events |

---

## Appendix

### Glossary

- **Virtual Scrolling**: Technique that only renders visible items in a large list
- **Side Panel**: Chrome 114+ API for persistent extension UI in sidebar
- **Density Mode**: UI scale (compact/comfortable/spacious)
- **Filter Chips**: Quick filter buttons (active, pinned, etc.)
- **Quick Actions**: Multi-select actions (close all, bookmark, etc.)

### References

- [Chrome Extension API Docs](https://developer.chrome.com/docs/extensions/reference/)
- [Chrome Side Panel API](https://developer.chrome.com/docs/extensions/reference/sidePanel/)
- [React Window](https://react-window.vercel.app/)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Chrome Keyboard Shortcuts](https://support.google.com/chrome/answer/157179)

### Change Log

**v2.0** (2025-10-16):
- Added virtual scrolling as Week 1 priority
- Revised implementation order
- Added performance budgets
- Added accessibility requirements
- Added tab metadata infrastructure
- Added component library architecture
- Added comprehensive testing strategy

**v1.0** (2025-10-15):
- Initial plan

---

**Document Status**: ✅ Ready for Implementation
**Last Updated**: 2025-10-16
**Next Review**: After Week 1 completion

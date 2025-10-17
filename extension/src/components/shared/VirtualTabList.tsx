import { List } from 'react-window';
import { useRef, useEffect, memo, useCallback, Profiler } from 'react';
import type { ProfilerOnRenderCallback } from 'react';
import { TabItem } from './TabItem';
import { useKeyboardNav } from '../../hooks/useKeyboardNav';
import { perfMonitor } from '../../utils/performance';
import type { DensityMode, DensityConfig } from '../../types/density';
import { DENSITY_CONFIGS } from '../../types/density';

interface VirtualTabListProps {
  tabs: chrome.tabs.Tab[];
  densityMode?: DensityMode;
  onTabClick: (tab: chrome.tabs.Tab) => void;
  onTabClose: (tabId: number) => void;
  selectedIndex?: number;
  height?: number;
  keyboardNavEnabled?: boolean;
}

interface RowProps {
  index: number;
  style: React.CSSProperties;
  tabs: chrome.tabs.Tab[];
  onTabClick: (tab: chrome.tabs.Tab) => void;
  onTabClose: (tabId: number) => void;
  selectedIndex: number;
  densityConfig: DensityConfig;
}

const Row = memo(({ index, style, tabs, onTabClick, onTabClose, selectedIndex, densityConfig }: RowProps) => {
  const tab = tabs[index];

  // Safety check - skip rendering if tab is undefined
  if (!tab || !tab.id) {
    return <div style={style} />;
  }

  // Memoize callbacks to prevent TabItem re-renders
  const handleClick = useCallback(() => {
    onTabClick(tab);
  }, [tab, onTabClick]);

  const handleClose = useCallback(() => {
    onTabClose(tab.id!);
  }, [tab.id, onTabClose]);

  return (
    <TabItem
      tab={tab}
      style={style}
      onClick={handleClick}
      onClose={handleClose}
      isSelected={index === selectedIndex}
      densityConfig={densityConfig}
    />
  );
}, (prev, next) => {
  // Only re-render if the relevant data changed
  return prev.index === next.index &&
         prev.selectedIndex === next.selectedIndex &&
         prev.tabs[prev.index]?.id === next.tabs[next.index]?.id &&
         prev.densityConfig.mode === next.densityConfig.mode;
});

export function VirtualTabList({
  tabs,
  densityMode = 'normal',
  onTabClick,
  onTabClose,
  selectedIndex: externalSelectedIndex,
  height = 500,
  keyboardNavEnabled = true
}: VirtualTabListProps) {
  const densityConfig = DENSITY_CONFIGS[densityMode];
  const itemSize = densityConfig.itemHeight;

  console.log('VirtualTabList rendered with densityMode:', densityMode, 'itemSize:', itemSize, 'config:', densityConfig);

  const listRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Use keyboard navigation hook
  const { selectedIndex, setSelectedIndex } = useKeyboardNav({
    itemCount: tabs.length,
    onSelect: (index) => {
      const tab = tabs[index];
      if (tab) {
        onTabClick(tab);
      }
    },
    onClose: (index) => {
      const tab = tabs[index];
      if (tab && tab.id) {
        onTabClose(tab.id);
      }
    },
    enabled: keyboardNavEnabled,
    containerRef
  });

  // Sync with external selected index if provided
  useEffect(() => {
    if (externalSelectedIndex !== undefined && externalSelectedIndex >= 0) {
      setSelectedIndex(externalSelectedIndex);
    }
  }, [externalSelectedIndex, setSelectedIndex]);

  // Log when keyboard nav is ready (no focus needed for document listeners)
  useEffect(() => {
    if (keyboardNavEnabled && tabs.length > 0) {
      console.log('VirtualTabList keyboard nav ready for', tabs.length, 'tabs');
    }
  }, [keyboardNavEnabled, tabs.length]);

  // Profiler callback to measure render performance
  const onRender: ProfilerOnRenderCallback = useCallback((
    id,
    phase,
    actualDuration,
    baseDuration,
    startTime,
    commitTime
  ) => {
    console.log(`VirtualTabList ${phase}: ${actualDuration.toFixed(2)}ms (${tabs.length} tabs)`);

    // Record in performance monitor
    if (phase === 'mount') {
      perfMonitor.measure('initial-render', () => actualDuration);
    } else {
      perfMonitor.measure('list-update', () => actualDuration);
    }

    // Log stats periodically
    const stats = perfMonitor.getStats(phase === 'mount' ? 'initial-render' : 'list-update');
    if (stats && stats.count % 5 === 0) {
      console.log(`${phase} stats: avg=${stats.avg.toFixed(2)}ms, max=${stats.max.toFixed(2)}ms, min=${stats.min.toFixed(2)}ms (${stats.count} renders)`);
    }
  }, [tabs.length]);

  if (tabs.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        No tabs to display
      </div>
    );
  }

  return (
    <Profiler id="VirtualTabList" onRender={onRender}>
      <div
        ref={containerRef}
        role="listbox"
        aria-label="Tab list"
        tabIndex={0}
        style={{ outline: 'none' }}
        onFocus={() => {
          console.log('VirtualTabList container focused');
        }}
        onKeyDown={(e) => {
          console.log('Key pressed in container:', e.key);
        }}
      >
        <List
          key={`list-${densityMode}-${itemSize}`}
          listRef={listRef}
          defaultHeight={height}
          rowCount={tabs.length}
          rowHeight={itemSize}
          rowComponent={Row}
          rowProps={{
            tabs,
            onTabClick,
            onTabClose,
            selectedIndex,
            densityConfig
          }}
          style={{ width: '100%' }}
          overscanCount={5}
        />
      </div>
    </Profiler>
  );
}

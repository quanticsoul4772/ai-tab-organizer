import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CategoryView } from '../CategoryView';
import type { CategorizedTabs, Tab, TabSummary, CategorySummary } from '../../types';
import * as storage from '../../utils/storage';

// Mock dependencies
vi.mock('../../utils/storage', () => ({
  storage: {
    getGroupStates: vi.fn(),
    setGroupState: vi.fn(),
  },
}));

vi.mock('../../utils/groupDefaults', () => ({
  getDefaultCollapseState: vi.fn(() => false),
}));

vi.mock('../TabList', () => ({
  TabList: ({ tabs, onTabClick, onTabClose, densityMode }: any) => (
    <div data-testid="tab-list" data-density={densityMode}>
      {tabs.map((tab: Tab) => (
        <div key={tab.id} data-testid={`tab-${tab.id}`}>
          <span onClick={() => onTabClick(tab.id)}>{tab.title}</span>
          <button onClick={() => onTabClose(tab.id)}>Close</button>
        </div>
      ))}
    </div>
  ),
}));

vi.mock('../CategorySummaryCard', () => ({
  CategorySummaryCard: ({ summary, onClose }: any) => (
    <div data-testid="category-summary-card">
      <div>{summary.summary}</div>
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

vi.mock('../shared/GroupHeader', () => ({
  GroupHeader: ({
    categoryName,
    tabCount,
    isCollapsed,
    onToggle,
    onSummarize,
    isLoadingSummary,
    onCloseAll,
    onBookmarkAll,
  }: any) => (
    <div data-testid={`group-header-${categoryName}`}>
      <button onClick={onToggle}>
        {isCollapsed ? 'Expand' : 'Collapse'} {categoryName} ({tabCount})
      </button>
      {onSummarize && (
        <button onClick={onSummarize} disabled={isLoadingSummary}>
          {isLoadingSummary ? 'Loading...' : 'Summarize'}
        </button>
      )}
      <button onClick={onCloseAll}>Close All</button>
      <button onClick={onBookmarkAll}>Bookmark All</button>
    </div>
  ),
}));

describe('CategoryView', () => {
  const mockTabs: Tab[] = [
    {
      id: 1,
      title: 'React Docs',
      url: 'https://react.dev',
      index: 0,
      pinned: false,
      highlighted: false,
      windowId: 1,
      active: false,
      incognito: false,
      selected: false,
      discarded: false,
      autoDiscardable: true,
      groupId: -1,
    },
    {
      id: 2,
      title: 'Vue Docs',
      url: 'https://vuejs.org',
      index: 1,
      pinned: false,
      highlighted: false,
      windowId: 1,
      active: false,
      incognito: false,
      selected: false,
      discarded: false,
      autoDiscardable: true,
      groupId: -1,
    },
    {
      id: 3,
      title: 'GitHub',
      url: 'https://github.com',
      index: 2,
      pinned: false,
      highlighted: false,
      windowId: 1,
      active: false,
      incognito: false,
      selected: false,
      discarded: false,
      autoDiscardable: true,
      groupId: -1,
    },
  ];

  const mockCategorizedTabs: CategorizedTabs = {
    Development: [mockTabs[0], mockTabs[1]],
    Work: [mockTabs[2]],
  };

  const mockOnTabClick = vi.fn();
  const mockOnTabClose = vi.fn();
  const mockOnTabSummaryRequest = vi.fn();
  const mockOnCategorySummaryRequest = vi.fn();

  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    // Mock storage responses
    vi.mocked(storage.storage.getGroupStates).mockResolvedValue({});
    vi.mocked(storage.storage.setGroupState).mockResolvedValue(undefined);

    // Mock chrome.tabs.remove
    vi.mocked(chrome.tabs.remove).mockResolvedValue(undefined);

    // Mock chrome.bookmarks
    global.chrome.bookmarks = {
      create: vi.fn().mockImplementation(({ parentId, title, url }) => {
        if (!parentId && !url) {
          // Creating folder
          return Promise.resolve({ id: 'folder-123', title });
        }
        // Creating bookmark
        return Promise.resolve({ id: 'bookmark-456', parentId, title, url });
      }),
    } as any;

    // Mock window.alert
    global.alert = vi.fn();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  describe('Rendering', () => {
    it('should render all categories', () => {
      render(
        <CategoryView
          categorizedTabs={mockCategorizedTabs}
          onTabClick={mockOnTabClick}
          onTabClose={mockOnTabClose}
        />
      );

      expect(screen.getByTestId('group-header-Development')).toBeInTheDocument();
      expect(screen.getByTestId('group-header-Work')).toBeInTheDocument();
    });

    it('should render tab lists for each category', () => {
      render(
        <CategoryView
          categorizedTabs={mockCategorizedTabs}
          onTabClick={mockOnTabClick}
          onTabClose={mockOnTabClose}
        />
      );

      const tabLists = screen.getAllByTestId('tab-list');
      expect(tabLists).toHaveLength(2);
    });

    it('should render collapse/expand all buttons when multiple groups', () => {
      render(
        <CategoryView
          categorizedTabs={mockCategorizedTabs}
          onTabClick={mockOnTabClick}
          onTabClose={mockOnTabClose}
        />
      );

      expect(screen.getByText('Collapse All')).toBeInTheDocument();
      expect(screen.getByText('Expand All')).toBeInTheDocument();
    });

    it('should not render collapse/expand all buttons with single group', () => {
      const singleGroupTabs: CategorizedTabs = {
        Development: mockTabs,
      };

      render(
        <CategoryView
          categorizedTabs={singleGroupTabs}
          onTabClick={mockOnTabClick}
          onTabClose={mockOnTabClose}
        />
      );

      expect(screen.queryByText('Collapse All')).not.toBeInTheDocument();
      expect(screen.queryByText('Expand All')).not.toBeInTheDocument();
    });

    it('should pass density mode to tab lists', () => {
      render(
        <CategoryView
          categorizedTabs={mockCategorizedTabs}
          onTabClick={mockOnTabClick}
          onTabClose={mockOnTabClose}
          densityMode="compact"
        />
      );

      const tabLists = screen.getAllByTestId('tab-list');
      tabLists.forEach(list => {
        expect(list).toHaveAttribute('data-density', 'compact');
      });
    });

    it('should log density mode on render', () => {
      render(
        <CategoryView
          categorizedTabs={mockCategorizedTabs}
          onTabClick={mockOnTabClick}
          onTabClose={mockOnTabClose}
          densityMode="spacious"
        />
      );

      expect(consoleLogSpy).toHaveBeenCalledWith(
        'CategoryView rendered with densityMode:',
        'spacious'
      );
    });
  });

  describe('Group State Management', () => {
    it('should load group states from storage on mount', async () => {
      vi.mocked(storage.storage.getGroupStates).mockResolvedValue({
        Development: true,
        Work: false,
      });

      render(
        <CategoryView
          categorizedTabs={mockCategorizedTabs}
          onTabClick={mockOnTabClick}
          onTabClose={mockOnTabClose}
        />
      );

      await waitFor(() => {
        expect(storage.storage.getGroupStates).toHaveBeenCalled();
      });
    });

    it('should toggle group collapse state', async () => {
      render(
        <CategoryView
          categorizedTabs={mockCategorizedTabs}
          onTabClick={mockOnTabClick}
          onTabClose={mockOnTabClose}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Collapse Development/)).toBeInTheDocument();
      });

      const toggleButton = screen.getByText(/Collapse Development/);
      fireEvent.click(toggleButton);

      await waitFor(() => {
        expect(storage.storage.setGroupState).toHaveBeenCalledWith('Development', true);
      });
    });

    it('should collapse all groups when Collapse All clicked', async () => {
      render(
        <CategoryView
          categorizedTabs={mockCategorizedTabs}
          onTabClick={mockOnTabClick}
          onTabClose={mockOnTabClose}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Collapse All')).toBeInTheDocument();
      });

      const collapseAllButton = screen.getByText('Collapse All');
      fireEvent.click(collapseAllButton);

      await waitFor(() => {
        expect(storage.storage.setGroupState).toHaveBeenCalledWith('Development', true);
        expect(storage.storage.setGroupState).toHaveBeenCalledWith('Work', true);
      });
    });

    it('should expand all groups when Expand All clicked', async () => {
      vi.mocked(storage.storage.getGroupStates).mockResolvedValue({
        Development: true,
        Work: true,
      });

      render(
        <CategoryView
          categorizedTabs={mockCategorizedTabs}
          onTabClick={mockOnTabClick}
          onTabClose={mockOnTabClose}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Expand All')).toBeInTheDocument();
      });

      const expandAllButton = screen.getByText('Expand All');
      fireEvent.click(expandAllButton);

      await waitFor(() => {
        expect(storage.storage.setGroupState).toHaveBeenCalledWith('Development', false);
        expect(storage.storage.setGroupState).toHaveBeenCalledWith('Work', false);
      });
    });
  });

  describe('Keyboard Shortcuts', () => {
    it('should collapse all on Cmd+Left Arrow', async () => {
      render(
        <CategoryView
          categorizedTabs={mockCategorizedTabs}
          onTabClick={mockOnTabClick}
          onTabClose={mockOnTabClose}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Collapse All')).toBeInTheDocument();
      });

      fireEvent.keyDown(document, { key: 'ArrowLeft', metaKey: true });

      await waitFor(() => {
        expect(storage.storage.setGroupState).toHaveBeenCalledWith('Development', true);
        expect(storage.storage.setGroupState).toHaveBeenCalledWith('Work', true);
      });
    });

    it('should expand all on Cmd+Right Arrow', async () => {
      render(
        <CategoryView
          categorizedTabs={mockCategorizedTabs}
          onTabClick={mockOnTabClick}
          onTabClose={mockOnTabClose}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Expand All')).toBeInTheDocument();
      });

      fireEvent.keyDown(document, { key: 'ArrowRight', metaKey: true });

      await waitFor(() => {
        expect(storage.storage.setGroupState).toHaveBeenCalledWith('Development', false);
        expect(storage.storage.setGroupState).toHaveBeenCalledWith('Work', false);
      });
    });

    it('should collapse all on Ctrl+Left Arrow', async () => {
      render(
        <CategoryView
          categorizedTabs={mockCategorizedTabs}
          onTabClick={mockOnTabClick}
          onTabClose={mockOnTabClose}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Collapse All')).toBeInTheDocument();
      });

      fireEvent.keyDown(document, { key: 'ArrowLeft', ctrlKey: true });

      await waitFor(() => {
        expect(storage.storage.setGroupState).toHaveBeenCalled();
      });
    });

    it('should expand all on Ctrl+Right Arrow', async () => {
      render(
        <CategoryView
          categorizedTabs={mockCategorizedTabs}
          onTabClick={mockOnTabClick}
          onTabClose={mockOnTabClose}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Expand All')).toBeInTheDocument();
      });

      fireEvent.keyDown(document, { key: 'ArrowRight', ctrlKey: true });

      await waitFor(() => {
        expect(storage.storage.setGroupState).toHaveBeenCalled();
      });
    });
  });

  describe('Category Summary', () => {
    const mockCategorySummary: CategorySummary = {
      category: 'Development',
      tabCount: 2,
      summary: 'React and Vue documentation',
      generatedAt: Date.now(),
    };

    it('should request category summary when Summarize clicked', async () => {
      mockOnCategorySummaryRequest.mockResolvedValue(mockCategorySummary);

      render(
        <CategoryView
          categorizedTabs={mockCategorizedTabs}
          onTabClick={mockOnTabClick}
          onTabClose={mockOnTabClose}
          onCategorySummaryRequest={mockOnCategorySummaryRequest}
          summariesEnabled={true}
        />
      );

      await waitFor(() => {
        // Only Development has 2 tabs, so only 1 Summarize button (Work has 1 tab)
        expect(screen.getByText('Summarize')).toBeInTheDocument();
      });

      const summarizeButton = screen.getByText('Summarize');
      fireEvent.click(summarizeButton);

      await waitFor(() => {
        expect(mockOnCategorySummaryRequest).toHaveBeenCalledWith('Development', [
          mockTabs[0],
          mockTabs[1],
        ]);
      });
    });

    it('should display category summary card', async () => {
      mockOnCategorySummaryRequest.mockResolvedValue(mockCategorySummary);

      render(
        <CategoryView
          categorizedTabs={mockCategorizedTabs}
          onTabClick={mockOnTabClick}
          onTabClose={mockOnTabClose}
          onCategorySummaryRequest={mockOnCategorySummaryRequest}
          summariesEnabled={true}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Summarize')).toBeInTheDocument();
      });

      const summarizeButton = screen.getByText('Summarize');
      fireEvent.click(summarizeButton);

      await waitFor(() => {
        expect(screen.getByTestId('category-summary-card')).toBeInTheDocument();
        expect(screen.getByText('React and Vue documentation')).toBeInTheDocument();
      });
    });

    it('should close category summary when Close clicked', async () => {
      mockOnCategorySummaryRequest.mockResolvedValue(mockCategorySummary);

      render(
        <CategoryView
          categorizedTabs={mockCategorizedTabs}
          onTabClick={mockOnTabClick}
          onTabClose={mockOnTabClose}
          onCategorySummaryRequest={mockOnCategorySummaryRequest}
          summariesEnabled={true}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Summarize')).toBeInTheDocument();
      });

      const summarizeButton = screen.getByText('Summarize');
      fireEvent.click(summarizeButton);

      await waitFor(() => {
        expect(screen.getByTestId('category-summary-card')).toBeInTheDocument();
      });

      // Close button in the category summary card
      const summaryCard = screen.getByTestId('category-summary-card');
      const closeButton = summaryCard.querySelector('button');
      fireEvent.click(closeButton!);

      await waitFor(() => {
        expect(screen.queryByTestId('category-summary-card')).not.toBeInTheDocument();
      });
    });

    it('should display error when summary fails', async () => {
      mockOnCategorySummaryRequest.mockRejectedValue(new Error('API error'));

      render(
        <CategoryView
          categorizedTabs={mockCategorizedTabs}
          onTabClick={mockOnTabClick}
          onTabClose={mockOnTabClose}
          onCategorySummaryRequest={mockOnCategorySummaryRequest}
          summariesEnabled={true}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Summarize')).toBeInTheDocument();
      });

      const summarizeButton = screen.getByText('Summarize');
      fireEvent.click(summarizeButton);

      await waitFor(() => {
        // Error message may be rendered in multiple places
        const errorMessages = screen.getAllByText('API error');
        expect(errorMessages.length).toBeGreaterThan(0);
      });
    });

    it('should handle non-Error exceptions', async () => {
      mockOnCategorySummaryRequest.mockRejectedValue('String error');

      render(
        <CategoryView
          categorizedTabs={mockCategorizedTabs}
          onTabClick={mockOnTabClick}
          onTabClose={mockOnTabClose}
          onCategorySummaryRequest={mockOnCategorySummaryRequest}
          summariesEnabled={true}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Summarize')).toBeInTheDocument();
      });

      const summarizeButton = screen.getByText('Summarize');
      fireEvent.click(summarizeButton);

      await waitFor(() => {
        const errorMessages = screen.getAllByText('Failed to generate summary');
        expect(errorMessages.length).toBeGreaterThan(0);
      });
    });

    it('should clear error when ✕ clicked', async () => {
      mockOnCategorySummaryRequest.mockRejectedValue(new Error('Test error'));

      const { container } = render(
        <CategoryView
          categorizedTabs={mockCategorizedTabs}
          onTabClick={mockOnTabClick}
          onTabClose={mockOnTabClose}
          onCategorySummaryRequest={mockOnCategorySummaryRequest}
          summariesEnabled={true}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Summarize')).toBeInTheDocument();
      });

      const summarizeButton = screen.getByText('Summarize');
      fireEvent.click(summarizeButton);

      await waitFor(() => {
        const errorMessages = screen.getAllByText('Test error');
        expect(errorMessages.length).toBeGreaterThan(0);
      });

      const errorCloseButton = container.querySelector('.error-close-btn');
      fireEvent.click(errorCloseButton!);

      await waitFor(() => {
        expect(screen.queryByText('Test error')).not.toBeInTheDocument();
      });
    });

    it('should not render Summarize button when summariesEnabled is false', () => {
      render(
        <CategoryView
          categorizedTabs={mockCategorizedTabs}
          onTabClick={mockOnTabClick}
          onTabClose={mockOnTabClose}
          onCategorySummaryRequest={mockOnCategorySummaryRequest}
          summariesEnabled={false}
        />
      );

      expect(screen.queryByText('Summarize')).not.toBeInTheDocument();
    });

    it('should not render Summarize button when onCategorySummaryRequest not provided', () => {
      render(
        <CategoryView
          categorizedTabs={mockCategorizedTabs}
          onTabClick={mockOnTabClick}
          onTabClose={mockOnTabClose}
          summariesEnabled={true}
        />
      );

      expect(screen.queryByText('Summarize')).not.toBeInTheDocument();
    });
  });

  describe('Tab Actions', () => {
    it('should call onTabClick when tab clicked', async () => {
      render(
        <CategoryView
          categorizedTabs={mockCategorizedTabs}
          onTabClick={mockOnTabClick}
          onTabClose={mockOnTabClose}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('React Docs')).toBeInTheDocument();
      });

      const tab = screen.getByText('React Docs');
      fireEvent.click(tab);

      expect(mockOnTabClick).toHaveBeenCalledWith(1);
    });

    it('should call onTabClose when tab closed', async () => {
      render(
        <CategoryView
          categorizedTabs={mockCategorizedTabs}
          onTabClick={mockOnTabClick}
          onTabClose={mockOnTabClose}
        />
      );

      await waitFor(() => {
        // 3 tabs each have a Close button in TabList mock
        expect(screen.getAllByText('Close')).toHaveLength(3);
      });

      const closeButtons = screen.getAllByText('Close');
      fireEvent.click(closeButtons[0]);

      expect(mockOnTabClose).toHaveBeenCalledWith(1);
    });
  });

  describe('Close All Tabs', () => {
    it('should close all tabs in category', async () => {
      render(
        <CategoryView
          categorizedTabs={mockCategorizedTabs}
          onTabClick={mockOnTabClick}
          onTabClose={mockOnTabClose}
        />
      );

      await waitFor(() => {
        expect(screen.getAllByText('Close All')).toHaveLength(2);
      });

      const closeAllButtons = screen.getAllByText('Close All');
      fireEvent.click(closeAllButtons[0]); // Close Development tabs

      await waitFor(() => {
        expect(chrome.tabs.remove).toHaveBeenCalledWith(1);
        expect(chrome.tabs.remove).toHaveBeenCalledWith(2);
        expect(mockOnTabClose).toHaveBeenCalledWith(1);
        expect(mockOnTabClose).toHaveBeenCalledWith(2);
      });
    });
  });

  describe('Bookmark All Tabs', () => {
    it('should bookmark all tabs in category', async () => {
      render(
        <CategoryView
          categorizedTabs={mockCategorizedTabs}
          onTabClick={mockOnTabClick}
          onTabClose={mockOnTabClose}
        />
      );

      await waitFor(() => {
        expect(screen.getAllByText('Bookmark All')).toHaveLength(2);
      });

      const bookmarkAllButtons = screen.getAllByText('Bookmark All');
      fireEvent.click(bookmarkAllButtons[0]); // Bookmark Development tabs

      await waitFor(() => {
        expect(chrome.bookmarks.create).toHaveBeenCalledWith(
          expect.objectContaining({
            title: expect.stringContaining('Development'),
          })
        );
        expect(chrome.bookmarks.create).toHaveBeenCalledWith(
          expect.objectContaining({
            parentId: 'folder-123',
            title: 'React Docs',
            url: 'https://react.dev',
          })
        );
        expect(chrome.bookmarks.create).toHaveBeenCalledWith(
          expect.objectContaining({
            parentId: 'folder-123',
            title: 'Vue Docs',
            url: 'https://vuejs.org',
          })
        );
      });
    });

    it('should show alert after bookmarking', async () => {
      render(
        <CategoryView
          categorizedTabs={mockCategorizedTabs}
          onTabClick={mockOnTabClick}
          onTabClose={mockOnTabClose}
        />
      );

      await waitFor(() => {
        expect(screen.getAllByText('Bookmark All')).toHaveLength(2);
      });

      const bookmarkAllButtons = screen.getAllByText('Bookmark All');
      fireEvent.click(bookmarkAllButtons[0]);

      await waitFor(() => {
        expect(global.alert).toHaveBeenCalledWith(
          expect.stringContaining('Bookmarked 2 tabs to folder')
        );
      });
    });
  });

  describe('Activity Indicator', () => {
    it('should render category element', async () => {
      const { container } = render(
        <CategoryView
          categorizedTabs={mockCategorizedTabs}
          onTabClick={mockOnTabClick}
          onTabClose={mockOnTabClose}
        />
      );

      await waitFor(() => {
        const category = container.querySelector('.category');
        expect(category).toBeInTheDocument();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty categories object', () => {
      const { container } = render(
        <CategoryView
          categorizedTabs={{}}
          onTabClick={mockOnTabClick}
          onTabClose={mockOnTabClose}
        />
      );

      expect(container.querySelector('.categories')).toBeInTheDocument();
    });

    it('should handle category with single tab', async () => {
      const singleTabCategory: CategorizedTabs = {
        Work: [mockTabs[2]],
      };

      render(
        <CategoryView
          categorizedTabs={singleTabCategory}
          onTabClick={mockOnTabClick}
          onTabClose={mockOnTabClose}
          onCategorySummaryRequest={mockOnCategorySummaryRequest}
          summariesEnabled={true}
        />
      );

      await waitFor(() => {
        // Single-tab categories shouldn't show Summarize button
        expect(screen.queryByText('Summarize')).not.toBeInTheDocument();
      });
    });
  });
});

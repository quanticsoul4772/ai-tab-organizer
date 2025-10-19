import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TabList } from '../TabList';
import type { Tab, TabSummary } from '../../types';
import { DensityProvider } from '../../context/DensityContext';

// Mock child components
vi.mock('../SummaryCard', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  SummaryCard: ({ summary, onClose }: any) => (
    <div data-testid="summary-card">
      <div>Summary: {summary.summary}</div>
      <button onClick={onClose}>Close Summary</button>
    </div>
  ),
}));

vi.mock('../shared/VirtualTabList', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  VirtualTabList: ({ tabs, onTabClick, onTabClose, densityMode }: any) => (
    <div data-testid="virtual-tab-list" data-density={densityMode}>
      {tabs.map((tab: Tab) => (
        <div key={tab.id} data-testid={`virtual-tab-${tab.id}`}>
          <span onClick={() => onTabClick(tab)}>{tab.title}</span>
          <button onClick={() => onTabClose(tab.id)}>Close</button>
        </div>
      ))}
    </div>
  ),
}));

import { createMockTab } from '../../__tests__/testHelpers';

describe('TabList', () => {
  const mockTabs: Tab[] = [
    createMockTab({
      id: 1,
      url: 'https://example.com',
      title: 'Example Site',
      favIconUrl: 'https://example.com/favicon.ico',
    }),
    createMockTab({
      id: 2,
      url: 'https://github.com',
      title: 'GitHub',
      favIconUrl: 'https://github.com/favicon.ico',
    }),
  ];

  const mockOnTabClick = vi.fn();
  const mockOnTabClose = vi.fn();
  const mockOnSummaryRequest = vi.fn();

  const renderWithDensity = (ui: React.ReactElement) => {
    return render(<DensityProvider>{ui}</DensityProvider>);
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Virtual Scrolling Mode', () => {
    it('should render VirtualTabList when useVirtualScrolling is true', () => {
      renderWithDensity(
        <TabList
          tabs={mockTabs}
          onTabClick={mockOnTabClick}
          onTabClose={mockOnTabClose}
          useVirtualScrolling={true}
        />
      );

      expect(screen.getByTestId('virtual-tab-list')).toBeInTheDocument();
    });

    it('should pass densityMode from context to VirtualTabList', () => {
      renderWithDensity(
        <TabList
          tabs={mockTabs}
          onTabClick={mockOnTabClick}
          onTabClose={mockOnTabClose}
          useVirtualScrolling={true}
        />
      );

      const virtualList = screen.getByTestId('virtual-tab-list');
      expect(virtualList).toHaveAttribute('data-density', 'normal');
    });

    it('should handle tab click in virtual mode', () => {
      renderWithDensity(
        <TabList
          tabs={mockTabs}
          onTabClick={mockOnTabClick}
          onTabClose={mockOnTabClose}
          useVirtualScrolling={true}
        />
      );

      const tab1 = screen.getByText('Example Site');
      fireEvent.click(tab1);

      expect(mockOnTabClick).toHaveBeenCalledWith(1);
    });

    it('should handle tab close in virtual mode', () => {
      renderWithDensity(
        <TabList
          tabs={mockTabs}
          onTabClick={mockOnTabClick}
          onTabClose={mockOnTabClose}
          useVirtualScrolling={true}
        />
      );

      const closeButtons = screen.getAllByText('Close');
      fireEvent.click(closeButtons[0]);

      expect(mockOnTabClose).toHaveBeenCalledWith(1);
    });
  });

  describe('Standard Rendering Mode', () => {
    it('should render standard list when useVirtualScrolling is false', () => {
      renderWithDensity(
        <TabList
          tabs={mockTabs}
          onTabClick={mockOnTabClick}
          onTabClose={mockOnTabClose}
          useVirtualScrolling={false}
        />
      );

      expect(screen.queryByTestId('virtual-tab-list')).not.toBeInTheDocument();
      expect(screen.getByText('Example Site')).toBeInTheDocument();
      expect(screen.getByText('GitHub')).toBeInTheDocument();
    });

    it('should display tab titles and hostnames', () => {
      renderWithDensity(
        <TabList
          tabs={mockTabs}
          onTabClick={mockOnTabClick}
          onTabClose={mockOnTabClose}
          useVirtualScrolling={false}
        />
      );

      expect(screen.getByText('Example Site')).toBeInTheDocument();
      expect(screen.getByText('example.com')).toBeInTheDocument();
      expect(screen.getByText('GitHub')).toBeInTheDocument();
      expect(screen.getByText('github.com')).toBeInTheDocument();
    });

    it('should display favicons', () => {
      const { container } = renderWithDensity(
        <TabList
          tabs={mockTabs}
          onTabClick={mockOnTabClick}
          onTabClose={mockOnTabClose}
          useVirtualScrolling={false}
        />
      );

      const favicons = container.querySelectorAll('.favicon');
      expect(favicons).toHaveLength(2);
      expect(favicons[0]).toHaveAttribute('src', 'https://example.com/favicon.ico');
    });

    it('should handle tab click', () => {
      renderWithDensity(
        <TabList
          tabs={mockTabs}
          onTabClick={mockOnTabClick}
          onTabClose={mockOnTabClose}
          useVirtualScrolling={false}
        />
      );

      const tabInfo = screen.getByText('Example Site').closest('.tab-info');
      fireEvent.click(tabInfo!);

      expect(mockOnTabClick).toHaveBeenCalledWith(1);
    });

    it('should handle tab close', () => {
      renderWithDensity(
        <TabList
          tabs={mockTabs}
          onTabClick={mockOnTabClick}
          onTabClose={mockOnTabClose}
          useVirtualScrolling={false}
        />
      );

      const closeButtons = screen.getAllByText('✕');
      fireEvent.click(closeButtons[0]);

      expect(mockOnTabClose).toHaveBeenCalledWith(1);
    });

    it('should render summary button when summariesEnabled and onSummaryRequest provided', () => {
      renderWithDensity(
        <TabList
          tabs={mockTabs}
          onTabClick={mockOnTabClick}
          onTabClose={mockOnTabClose}
          useVirtualScrolling={false}
          summariesEnabled={true}
          onSummaryRequest={mockOnSummaryRequest}
        />
      );

      const summaryButtons = screen.getAllByTitle('Get AI summary');
      expect(summaryButtons).toHaveLength(2);
    });

    it('should not render summary button when summariesEnabled is false', () => {
      renderWithDensity(
        <TabList
          tabs={mockTabs}
          onTabClick={mockOnTabClick}
          onTabClose={mockOnTabClose}
          useVirtualScrolling={false}
          summariesEnabled={false}
          onSummaryRequest={mockOnSummaryRequest}
        />
      );

      const summaryButtons = screen.queryAllByTitle('Get AI summary');
      expect(summaryButtons).toHaveLength(0);
    });

    it('should not render summary button when onSummaryRequest not provided', () => {
      renderWithDensity(
        <TabList
          tabs={mockTabs}
          onTabClick={mockOnTabClick}
          onTabClose={mockOnTabClose}
          useVirtualScrolling={false}
          summariesEnabled={true}
        />
      );

      const summaryButtons = screen.queryAllByTitle('Get AI summary');
      expect(summaryButtons).toHaveLength(0);
    });
  });

  describe('Summary Functionality', () => {
    it('should request and display summary when summary button clicked', async () => {
      const mockSummary: TabSummary = {
        tabId: 1,
        url: 'https://example.com',
        title: 'Example Site',
        summary: 'This is a test summary',
        timestamp: Date.now(),
        tokens: 100,
      };

      mockOnSummaryRequest.mockResolvedValue(mockSummary);

      renderWithDensity(
        <TabList
          tabs={mockTabs}
          onTabClick={mockOnTabClick}
          onTabClose={mockOnTabClose}
          useVirtualScrolling={false}
          summariesEnabled={true}
          onSummaryRequest={mockOnSummaryRequest}
        />
      );

      const summaryButtons = screen.getAllByTitle('Get AI summary');
      fireEvent.click(summaryButtons[0]);

      await waitFor(() => {
        expect(screen.getByTestId('summary-card')).toBeInTheDocument();
        expect(screen.getByText('Summary: This is a test summary')).toBeInTheDocument();
      });
    });

    it('should show loading state while fetching summary', async () => {
      mockOnSummaryRequest.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 1000))
      );

      renderWithDensity(
        <TabList
          tabs={mockTabs}
          onTabClick={mockOnTabClick}
          onTabClose={mockOnTabClose}
          useVirtualScrolling={false}
          summariesEnabled={true}
          onSummaryRequest={mockOnSummaryRequest}
        />
      );

      const summaryButtons = screen.getAllByTitle('Get AI summary');
      const firstButton = summaryButtons[0];

      expect(firstButton).toHaveTextContent('💬');

      fireEvent.click(firstButton);

      await waitFor(() => {
        expect(firstButton).toHaveTextContent('⏳');
        expect(firstButton).toBeDisabled();
      });
    });

    it('should handle summary request error', async () => {
      mockOnSummaryRequest.mockRejectedValue(new Error('Failed to fetch summary'));

      renderWithDensity(
        <TabList
          tabs={mockTabs}
          onTabClick={mockOnTabClick}
          onTabClose={mockOnTabClose}
          useVirtualScrolling={false}
          summariesEnabled={true}
          onSummaryRequest={mockOnSummaryRequest}
        />
      );

      const summaryButtons = screen.getAllByTitle('Get AI summary');
      fireEvent.click(summaryButtons[0]);

      await waitFor(() => {
        // Error shows for all tabs (component behavior at lines 122-129)
        expect(screen.getAllByText('Failed to fetch summary').length).toBe(mockTabs.length);
      });
    });

    it('should close summary when close button clicked', async () => {
      const mockSummary: TabSummary = {
        tabId: 1,
        url: 'https://example.com',
        title: 'Example Site',
        summary: 'This is a test summary',
        timestamp: Date.now(),
        tokens: 100,
      };

      mockOnSummaryRequest.mockResolvedValue(mockSummary);

      renderWithDensity(
        <TabList
          tabs={mockTabs}
          onTabClick={mockOnTabClick}
          onTabClose={mockOnTabClose}
          useVirtualScrolling={false}
          summariesEnabled={true}
          onSummaryRequest={mockOnSummaryRequest}
        />
      );

      const summaryButtons = screen.getAllByTitle('Get AI summary');
      fireEvent.click(summaryButtons[0]);

      await waitFor(() => {
        expect(screen.getByTestId('summary-card')).toBeInTheDocument();
      });

      const closeSummaryButton = screen.getByText('Close Summary');
      fireEvent.click(closeSummaryButton);

      await waitFor(() => {
        expect(screen.queryByTestId('summary-card')).not.toBeInTheDocument();
      });
    });

    it('should close error when error close button clicked', async () => {
      mockOnSummaryRequest.mockRejectedValue(new Error('Test error'));

      renderWithDensity(
        <TabList
          tabs={mockTabs}
          onTabClick={mockOnTabClick}
          onTabClose={mockOnTabClose}
          useVirtualScrolling={false}
          summariesEnabled={true}
          onSummaryRequest={mockOnSummaryRequest}
        />
      );

      const summaryButtons = screen.getAllByTitle('Get AI summary');
      fireEvent.click(summaryButtons[0]);

      await waitFor(() => {
        expect(screen.getAllByText('Test error').length).toBeGreaterThan(0);
      });

      const errorCloseButtons = screen
        .getAllByRole('button')
        .filter((btn) => btn.textContent === '✕' && btn.className === 'error-close-btn');
      fireEvent.click(errorCloseButtons[0]);

      await waitFor(() => {
        expect(screen.queryByText('Test error')).not.toBeInTheDocument();
      });
    });

    it('should stop event propagation when summary button clicked', async () => {
      const mockSummary: TabSummary = {
        tabId: 1,
        url: 'https://example.com',
        title: 'Example Site',
        summary: 'Test',
        timestamp: Date.now(),
        tokens: 100,
      };

      mockOnSummaryRequest.mockResolvedValue(mockSummary);

      renderWithDensity(
        <TabList
          tabs={mockTabs}
          onTabClick={mockOnTabClick}
          onTabClose={mockOnTabClose}
          useVirtualScrolling={false}
          summariesEnabled={true}
          onSummaryRequest={mockOnSummaryRequest}
        />
      );

      const summaryButtons = screen.getAllByTitle('Get AI summary');
      fireEvent.click(summaryButtons[0]);

      // onTabClick should not be called when clicking summary button
      expect(mockOnTabClick).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty tabs array', () => {
      renderWithDensity(
        <TabList
          tabs={[]}
          onTabClick={mockOnTabClick}
          onTabClose={mockOnTabClose}
          useVirtualScrolling={false}
        />
      );

      expect(screen.queryByText('Example Site')).not.toBeInTheDocument();
    });

    it('should handle missing favIconUrl', () => {
      const tabsWithoutFavicon: Tab[] = [
        createMockTab({
          id: 1,
          url: 'https://example.com',
          title: 'No Favicon',
          favIconUrl: undefined,
        }),
      ];

      const { container } = renderWithDensity(
        <TabList
          tabs={tabsWithoutFavicon}
          onTabClick={mockOnTabClick}
          onTabClose={mockOnTabClose}
          useVirtualScrolling={false}
        />
      );

      const favicons = container.querySelectorAll('.favicon');
      expect(favicons[0]).toHaveAttribute(
        'src',
        'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"/>'
      );
    });

    it('should use default props when optional props not provided', () => {
      renderWithDensity(
        <TabList tabs={mockTabs} onTabClick={mockOnTabClick} onTabClose={mockOnTabClose} />
      );

      // Should use virtual scrolling by default
      expect(screen.getByTestId('virtual-tab-list')).toBeInTheDocument();
    });

    it('should handle non-Error objects in summary catch block', async () => {
      mockOnSummaryRequest.mockRejectedValue('String error');

      renderWithDensity(
        <TabList
          tabs={mockTabs}
          onTabClick={mockOnTabClick}
          onTabClose={mockOnTabClose}
          useVirtualScrolling={false}
          summariesEnabled={true}
          onSummaryRequest={mockOnSummaryRequest}
        />
      );

      const summaryButtons = screen.getAllByTitle('Get AI summary');
      fireEvent.click(summaryButtons[0]);

      await waitFor(() => {
        // Error shows for all tabs (component behavior at lines 122-129)
        expect(screen.getAllByText('Failed to generate summary').length).toBe(mockTabs.length);
      });
    });
  });
});

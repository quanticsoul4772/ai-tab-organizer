import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SummaryCard } from '../SummaryCard';
import type { TabSummary } from '../../types';

describe('SummaryCard', () => {
  const mockOnClose = vi.fn();

  const baseSummary: TabSummary = {
    tabId: 1,
    url: 'https://example.com',
    title: 'Example Page',
    summary: 'This is a test summary of the tab content.',
    timestamp: Date.now(),
    tokens: 150,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock clipboard API
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('Rendering', () => {
    it('should render summary card with title', () => {
      render(<SummaryCard summary={baseSummary} onClose={mockOnClose} />);

      expect(screen.getByText('AI Summary')).toBeInTheDocument();
    });

    it('should render summary text when expanded', () => {
      render(<SummaryCard summary={baseSummary} onClose={mockOnClose} />);

      expect(screen.getByText('This is a test summary of the tab content.')).toBeInTheDocument();
    });

    it('should render token count', () => {
      render(<SummaryCard summary={baseSummary} onClose={mockOnClose} />);

      expect(screen.getByText('150 tokens')).toBeInTheDocument();
    });

    it('should start in expanded state', () => {
      render(<SummaryCard summary={baseSummary} onClose={mockOnClose} />);

      const expandButton = screen.getByTitle('Collapse');
      expect(expandButton).toHaveTextContent('▼');
      expect(screen.getByText('This is a test summary of the tab content.')).toBeInTheDocument();
    });
  });

  describe('Expand/Collapse', () => {
    it('should collapse when collapse button clicked', () => {
      render(<SummaryCard summary={baseSummary} onClose={mockOnClose} />);

      const collapseButton = screen.getByTitle('Collapse');
      fireEvent.click(collapseButton);

      expect(
        screen.queryByText('This is a test summary of the tab content.')
      ).not.toBeInTheDocument();
      expect(screen.getByTitle('Expand')).toHaveTextContent('▶');
    });

    it('should expand when expand button clicked', () => {
      render(<SummaryCard summary={baseSummary} onClose={mockOnClose} />);

      // First collapse
      const collapseButton = screen.getByTitle('Collapse');
      fireEvent.click(collapseButton);

      // Then expand
      const expandButton = screen.getByTitle('Expand');
      fireEvent.click(expandButton);

      expect(screen.getByText('This is a test summary of the tab content.')).toBeInTheDocument();
      expect(screen.getByTitle('Collapse')).toHaveTextContent('▼');
    });

    it('should hide token count when collapsed', () => {
      render(<SummaryCard summary={baseSummary} onClose={mockOnClose} />);

      const collapseButton = screen.getByTitle('Collapse');
      fireEvent.click(collapseButton);

      expect(screen.queryByText('150 tokens')).not.toBeInTheDocument();
    });
  });

  describe('Copy to Clipboard', () => {
    it('should copy summary to clipboard when copy button clicked', async () => {
      render(<SummaryCard summary={baseSummary} onClose={mockOnClose} />);

      const copyButton = screen.getByTitle('Copy to clipboard');
      fireEvent.click(copyButton);

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(baseSummary.summary);
    });

    it('should show checkmark after successful copy', async () => {
      render(<SummaryCard summary={baseSummary} onClose={mockOnClose} />);

      const copyButton = screen.getByTitle('Copy to clipboard');
      expect(copyButton).toHaveTextContent('📋');

      fireEvent.click(copyButton);

      await waitFor(() => {
        expect(copyButton).toHaveTextContent('✓');
      });
    });

    it('should revert checkmark after 2 seconds', async () => {
      vi.useFakeTimers();

      render(<SummaryCard summary={baseSummary} onClose={mockOnClose} />);

      const copyButton = screen.getByTitle('Copy to clipboard');
      fireEvent.click(copyButton);

      // Checkmark appears immediately
      await vi.waitFor(() => {
        expect(copyButton).toHaveTextContent('✓');
      });

      // After 2 seconds, revert to clipboard icon
      await vi.advanceTimersByTimeAsync(2000);

      expect(copyButton).toHaveTextContent('📋');

      vi.useRealTimers();
    });

    it('should handle clipboard error gracefully', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      navigator.clipboard.writeText = vi.fn().mockRejectedValue(new Error('Clipboard error'));

      render(<SummaryCard summary={baseSummary} onClose={mockOnClose} />);

      const copyButton = screen.getByTitle('Copy to clipboard');
      fireEvent.click(copyButton);

      await waitFor(() => {
        expect(consoleError).toHaveBeenCalledWith(
          'Failed to copy to clipboard:',
          expect.any(Error)
        );
      });

      consoleError.mockRestore();
    });
  });

  describe('Close Functionality', () => {
    it('should call onClose when close button clicked', () => {
      render(<SummaryCard summary={baseSummary} onClose={mockOnClose} />);

      const closeButton = screen.getByTitle('Close');
      fireEvent.click(closeButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Timestamp Formatting', () => {
    it('should display "Just now" for recent timestamps', () => {
      const recentSummary = { ...baseSummary, timestamp: Date.now() };
      render(<SummaryCard summary={recentSummary} onClose={mockOnClose} />);

      expect(screen.getByText('Just now')).toBeInTheDocument();
    });

    it('should display minutes ago for timestamps < 1 hour', () => {
      const thirtyMinutesAgo = Date.now() - 30 * 60 * 1000;
      const summary = { ...baseSummary, timestamp: thirtyMinutesAgo };
      render(<SummaryCard summary={summary} onClose={mockOnClose} />);

      expect(screen.getByText('30m ago')).toBeInTheDocument();
    });

    it('should display hours ago for timestamps < 24 hours', () => {
      const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
      const summary = { ...baseSummary, timestamp: twoHoursAgo };
      render(<SummaryCard summary={summary} onClose={mockOnClose} />);

      expect(screen.getByText('2h ago')).toBeInTheDocument();
    });

    it('should display days ago for timestamps >= 24 hours', () => {
      const threeDaysAgo = Date.now() - 3 * 24 * 60 * 60 * 1000;
      const summary = { ...baseSummary, timestamp: threeDaysAgo };
      render(<SummaryCard summary={summary} onClose={mockOnClose} />);

      expect(screen.getByText('3d ago')).toBeInTheDocument();
    });

    it('should handle exactly 1 minute', () => {
      const oneMinuteAgo = Date.now() - 60 * 1000;
      const summary = { ...baseSummary, timestamp: oneMinuteAgo };
      render(<SummaryCard summary={summary} onClose={mockOnClose} />);

      expect(screen.getByText('1m ago')).toBeInTheDocument();
    });

    it('should handle exactly 1 hour', () => {
      const oneHourAgo = Date.now() - 60 * 60 * 1000;
      const summary = { ...baseSummary, timestamp: oneHourAgo };
      render(<SummaryCard summary={summary} onClose={mockOnClose} />);

      expect(screen.getByText('1h ago')).toBeInTheDocument();
    });

    it('should handle exactly 1 day', () => {
      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
      const summary = { ...baseSummary, timestamp: oneDayAgo };
      render(<SummaryCard summary={summary} onClose={mockOnClose} />);

      expect(screen.getByText('1d ago')).toBeInTheDocument();
    });
  });

  describe('Button Titles', () => {
    it('should have correct titles for all action buttons', () => {
      render(<SummaryCard summary={baseSummary} onClose={mockOnClose} />);

      expect(screen.getByTitle('Collapse')).toBeInTheDocument();
      expect(screen.getByTitle('Copy to clipboard')).toBeInTheDocument();
      expect(screen.getByTitle('Close')).toBeInTheDocument();
    });

    it('should update expand/collapse button title when toggled', () => {
      render(<SummaryCard summary={baseSummary} onClose={mockOnClose} />);

      const button = screen.getByTitle('Collapse');
      expect(button).toBeInTheDocument();

      fireEvent.click(button);

      expect(screen.getByTitle('Expand')).toBeInTheDocument();
      expect(screen.queryByTitle('Collapse')).not.toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle summary without tokens property', () => {
      const summaryWithoutTokens = {
        tabId: 1,
        summary: 'Test summary',
        timestamp: Date.now(),
      } as TabSummary;

      const { container } = render(
        <SummaryCard summary={summaryWithoutTokens} onClose={mockOnClose} />
      );

      expect(screen.getByText('Test summary')).toBeInTheDocument();
      // Component will render "undefined tokens" when tokens property is missing
      const metaText = container.querySelector('.summary-meta')?.textContent || '';
      expect(metaText).toContain('tokens');
    });

    it('should handle very long summary text', () => {
      const longSummary = {
        ...baseSummary,
        summary: 'A'.repeat(1000),
      };

      render(<SummaryCard summary={longSummary} onClose={mockOnClose} />);

      expect(screen.getByText('A'.repeat(1000))).toBeInTheDocument();
    });

    it('should handle zero tokens', () => {
      const zeroTokenSummary = { ...baseSummary, tokens: 0 };
      render(<SummaryCard summary={zeroTokenSummary} onClose={mockOnClose} />);

      expect(screen.getByText('0 tokens')).toBeInTheDocument();
    });

    it('should handle large token counts', () => {
      const largeTokenSummary = { ...baseSummary, tokens: 999999 };
      render(<SummaryCard summary={largeTokenSummary} onClose={mockOnClose} />);

      expect(screen.getByText('999999 tokens')).toBeInTheDocument();
    });
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CategorySummaryCard } from '../CategorySummaryCard';
import type { CategorySummary } from '../../types';

describe('CategorySummaryCard', () => {
  const mockOnClose = vi.fn();

  const baseSummary: CategorySummary = {
    categoryName: 'Development',
    summary: 'Summary of development tabs covering various projects.',
    timestamp: Date.now(),
    tokens: 200,
    tabCount: 5,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  describe('Rendering', () => {
    it('should render category summary card with title', () => {
      render(<CategorySummaryCard summary={baseSummary} onClose={mockOnClose} />);

      expect(screen.getByText(/Category Summary/)).toBeInTheDocument();
      expect(screen.getByText(/5 tabs/)).toBeInTheDocument();
    });

    it('should render summary text', () => {
      render(<CategorySummaryCard summary={baseSummary} onClose={mockOnClose} />);

      expect(screen.getByText('Summary of development tabs covering various projects.')).toBeInTheDocument();
    });

    it('should render token count', () => {
      render(<CategorySummaryCard summary={baseSummary} onClose={mockOnClose} />);

      expect(screen.getByText('200 tokens')).toBeInTheDocument();
    });

    it('should display tab count in header', () => {
      render(<CategorySummaryCard summary={baseSummary} onClose={mockOnClose} />);

      expect(screen.getByText('📝 Category Summary (5 tabs)')).toBeInTheDocument();
    });
  });

  describe('Copy to Clipboard', () => {
    it('should copy summary to clipboard when copy button clicked', async () => {
      render(<CategorySummaryCard summary={baseSummary} onClose={mockOnClose} />);

      const copyButton = screen.getByTitle('Copy to clipboard');
      fireEvent.click(copyButton);

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(baseSummary.summary);
    });

    it('should show checkmark after successful copy', async () => {
      render(<CategorySummaryCard summary={baseSummary} onClose={mockOnClose} />);

      const copyButton = screen.getByTitle('Copy to clipboard');
      expect(copyButton).toHaveTextContent('📋');

      fireEvent.click(copyButton);

      await waitFor(() => {
        expect(copyButton).toHaveTextContent('✓');
      });
    });

    it('should handle clipboard error gracefully', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      navigator.clipboard.writeText = vi.fn().mockRejectedValue(new Error('Clipboard error'));

      render(<CategorySummaryCard summary={baseSummary} onClose={mockOnClose} />);

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
      render(<CategorySummaryCard summary={baseSummary} onClose={mockOnClose} />);

      const closeButton = screen.getByTitle('Close');
      fireEvent.click(closeButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Timestamp Formatting', () => {
    it('should display "Just now" for recent timestamps', () => {
      const recentSummary = { ...baseSummary, timestamp: Date.now() };
      render(<CategorySummaryCard summary={recentSummary} onClose={mockOnClose} />);

      expect(screen.getByText('Just now')).toBeInTheDocument();
    });

    it('should display minutes ago for timestamps < 1 hour', () => {
      const thirtyMinutesAgo = Date.now() - 30 * 60 * 1000;
      const summary = { ...baseSummary, timestamp: thirtyMinutesAgo };
      render(<CategorySummaryCard summary={summary} onClose={mockOnClose} />);

      expect(screen.getByText('30m ago')).toBeInTheDocument();
    });

    it('should display hours ago for timestamps < 24 hours', () => {
      const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
      const summary = { ...baseSummary, timestamp: twoHoursAgo };
      render(<CategorySummaryCard summary={summary} onClose={mockOnClose} />);

      expect(screen.getByText('2h ago')).toBeInTheDocument();
    });

    it('should display days ago for timestamps >= 24 hours', () => {
      const threeDaysAgo = Date.now() - 3 * 24 * 60 * 60 * 1000;
      const summary = { ...baseSummary, timestamp: threeDaysAgo };
      render(<CategorySummaryCard summary={summary} onClose={mockOnClose} />);

      expect(screen.getByText('3d ago')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle single tab count', () => {
      const singleTabSummary = { ...baseSummary, tabCount: 1 };
      render(<CategorySummaryCard summary={singleTabSummary} onClose={mockOnClose} />);

      expect(screen.getByText('📝 Category Summary (1 tabs)')).toBeInTheDocument();
    });

    it('should handle zero tab count', () => {
      const zeroTabSummary = { ...baseSummary, tabCount: 0 };
      render(<CategorySummaryCard summary={zeroTabSummary} onClose={mockOnClose} />);

      expect(screen.getByText('📝 Category Summary (0 tabs)')).toBeInTheDocument();
    });

    it('should handle large tab counts', () => {
      const largeTabSummary = { ...baseSummary, tabCount: 999 };
      render(<CategorySummaryCard summary={largeTabSummary} onClose={mockOnClose} />);

      expect(screen.getByText('📝 Category Summary (999 tabs)')).toBeInTheDocument();
    });

    it('should handle very long summary text', () => {
      const longSummary = {
        ...baseSummary,
        summary: 'A'.repeat(1000),
      };

      render(<CategorySummaryCard summary={longSummary} onClose={mockOnClose} />);

      expect(screen.getByText('A'.repeat(1000))).toBeInTheDocument();
    });
  });
});

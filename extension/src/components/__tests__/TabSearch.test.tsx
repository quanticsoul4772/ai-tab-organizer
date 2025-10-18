import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TabSearch } from '../features/search/TabSearch';
import * as searchService from '../../services/searchService';
import * as storageUtils from '../../utils/storage';

// Mock dependencies
vi.mock('../../services/searchService');
vi.mock('../../utils/storage');
vi.mock('../../hooks/useDebounce', () => ({
  useDebounce: (value: string) => value, // Return immediately for testing
}));

describe('TabSearch', () => {
  const mockSearchResults = [
    {
      tab: {
        id: 1,
        title: 'React Documentation',
        url: 'https://react.dev/docs',
      },
      relevanceScore: 0.95,
      matchedFields: ['title', 'content'],
      highlights: ['React', 'documentation'],
      matchReason: 'Exact title match',
    },
    {
      tab: {
        id: 2,
        title: 'ENG-123: Fix login bug',
        url: 'https://jira.example.com/browse/ENG-123',
      },
      relevanceScore: 0.88,
      matchedFields: ['jira-ticket', 'title'],
      highlights: [],
      matchReason: 'Jira ticket match',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock storage.getApiKey
    vi.mocked(storageUtils.storage.getApiKey).mockResolvedValue('test-api-key');

    // Mock searchTabs
    vi.mocked(searchService.searchTabs).mockResolvedValue(mockSearchResults);

    // Mock switchToTab and closeTab
    vi.mocked(searchService.switchToTab).mockResolvedValue(undefined);
    vi.mocked(searchService.closeTab).mockResolvedValue(undefined);

    // Mock window.close
    global.window.close = vi.fn();
  });

  describe('Rendering', () => {
    it('should render search input', () => {
      render(<TabSearch />);

      const input = screen.getByPlaceholderText(/Search tabs/i);
      expect(input).toBeInTheDocument();
    });

    it('should render search button', () => {
      render(<TabSearch />);

      const button = screen.getByRole('button', { name: /🔍/i });
      expect(button).toBeInTheDocument();
    });

    it('should autofocus search input', () => {
      render(<TabSearch />);

      const input = screen.getByPlaceholderText(/Search tabs/i);
      expect(input).toHaveFocus();
    });
  });

  describe('Search Functionality', () => {
    it('should perform search when typing', async () => {
      render(<TabSearch />);

      const input = screen.getByPlaceholderText(/Search tabs/i);
      fireEvent.change(input, { target: { value: 'react' } });

      await waitFor(() => {
        expect(searchService.searchTabs).toHaveBeenCalledWith('react', 'test-api-key');
      });
    });

    it('should display search results', async () => {
      render(<TabSearch />);

      const input = screen.getByPlaceholderText(/Search tabs/i);
      fireEvent.change(input, { target: { value: 'react' } });

      await waitFor(() => {
        expect(screen.getByText('React Documentation')).toBeInTheDocument();
        // Check for Jira ticket number and summary (displayed separately)
        expect(screen.getByText('ENG-123')).toBeInTheDocument();
        expect(screen.getByText('Fix login bug')).toBeInTheDocument();
      });
    });

    it('should show results count', async () => {
      render(<TabSearch />);

      const input = screen.getByPlaceholderText(/Search tabs/i);
      fireEvent.change(input, { target: { value: 'react' } });

      await waitFor(() => {
        expect(screen.getByText('Found 2 tabs')).toBeInTheDocument();
      });
    });

    it('should handle singular tab count', async () => {
      vi.mocked(searchService.searchTabs).mockResolvedValue([mockSearchResults[0]]);

      render(<TabSearch />);

      const input = screen.getByPlaceholderText(/Search tabs/i);
      fireEvent.change(input, { target: { value: 'react' } });

      await waitFor(() => {
        expect(screen.getByText('Found 1 tab')).toBeInTheDocument();
      });
    });

    it('should clear results when query is empty', async () => {
      render(<TabSearch />);

      const input = screen.getByPlaceholderText(/Search tabs/i);

      // First search
      fireEvent.change(input, { target: { value: 'react' } });
      await waitFor(() => {
        expect(screen.getByText('React Documentation')).toBeInTheDocument();
      });

      // Clear input
      fireEvent.change(input, { target: { value: '' } });

      await waitFor(() => {
        expect(screen.queryByText('React Documentation')).not.toBeInTheDocument();
      });
    });

    it('should search immediately on Enter key', async () => {
      render(<TabSearch />);

      const input = screen.getByPlaceholderText(/Search tabs/i);
      fireEvent.change(input, { target: { value: 'test query' } });

      vi.clearAllMocks();

      fireEvent.keyPress(input, { key: 'Enter', code: 'Enter' });

      await waitFor(() => {
        expect(searchService.searchTabs).toHaveBeenCalledWith('test query', 'test-api-key');
      });
    });

    it('should not search on Enter with empty query', () => {
      render(<TabSearch />);

      const input = screen.getByPlaceholderText(/Search tabs/i);
      fireEvent.keyPress(input, { key: 'Enter', code: 'Enter' });

      expect(searchService.searchTabs).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should display error when API key is missing', async () => {
      vi.mocked(storageUtils.storage.getApiKey).mockResolvedValue(null);

      render(<TabSearch />);

      const input = screen.getByPlaceholderText(/Search tabs/i);
      fireEvent.change(input, { target: { value: 'test' } });

      await waitFor(() => {
        expect(screen.getByText(/API key not configured/i)).toBeInTheDocument();
      });
    });

    it('should display error when search fails', async () => {
      vi.mocked(searchService.searchTabs).mockRejectedValue(new Error('Network error'));

      render(<TabSearch />);

      const input = screen.getByPlaceholderText(/Search tabs/i);
      fireEvent.change(input, { target: { value: 'test' } });

      await waitFor(() => {
        expect(screen.getByText(/Network error/i)).toBeInTheDocument();
      });
    });

    it('should handle non-Error exceptions', async () => {
      vi.mocked(searchService.searchTabs).mockRejectedValue('String error');

      render(<TabSearch />);

      const input = screen.getByPlaceholderText(/Search tabs/i);
      fireEvent.change(input, { target: { value: 'test' } });

      await waitFor(() => {
        expect(screen.getByText(/Search failed/i)).toBeInTheDocument();
      });
    });

    it('should clear error when new search starts', async () => {
      vi.mocked(searchService.searchTabs).mockRejectedValueOnce(new Error('Error'));

      render(<TabSearch />);

      const input = screen.getByPlaceholderText(/Search tabs/i);
      fireEvent.change(input, { target: { value: 'test' } });

      await waitFor(() => {
        expect(screen.getByText(/Error/i)).toBeInTheDocument();
      });

      // New search
      vi.mocked(searchService.searchTabs).mockResolvedValue(mockSearchResults);
      fireEvent.change(input, { target: { value: 'new search' } });

      await waitFor(() => {
        expect(screen.queryByText(/Error/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Loading State', () => {
    it('should show loading indicator during search', async () => {
      vi.mocked(searchService.searchTabs).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve([]), 100))
      );

      render(<TabSearch />);

      const input = screen.getByPlaceholderText(/Search tabs/i);
      fireEvent.change(input, { target: { value: 'test' } });

      // Should show loading
      await waitFor(() => {
        const button = screen.getByRole('button');
        expect(button).toHaveTextContent('🔄');
      });
    });

    it('should disable search button while searching', async () => {
      vi.mocked(searchService.searchTabs).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve([]), 100))
      );

      render(<TabSearch />);

      const input = screen.getByPlaceholderText(/Search tabs/i);
      fireEvent.change(input, { target: { value: 'test' } });

      await waitFor(() => {
        const button = screen.getByRole('button');
        expect(button).toBeDisabled();
      });
    });

    it('should disable search button when query is empty', () => {
      render(<TabSearch />);

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });
  });

  describe('No Results', () => {
    it('should show no results message', async () => {
      vi.mocked(searchService.searchTabs).mockResolvedValue([]);

      render(<TabSearch />);

      const input = screen.getByPlaceholderText(/Search tabs/i);
      fireEvent.change(input, { target: { value: 'nonexistent' } });

      await waitFor(() => {
        expect(screen.getByText(/No tabs found matching "nonexistent"/i)).toBeInTheDocument();
      });
    });

    it('should not show no results while searching', async () => {
      vi.mocked(searchService.searchTabs).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve([]), 100))
      );

      render(<TabSearch />);

      const input = screen.getByPlaceholderText(/Search tabs/i);
      fireEvent.change(input, { target: { value: 'test' } });

      // Should not show "no results" while loading
      expect(screen.queryByText(/No tabs found/i)).not.toBeInTheDocument();
    });

    it('should not show no results when there is an error', async () => {
      vi.mocked(searchService.searchTabs).mockRejectedValue(new Error('Error'));

      render(<TabSearch />);

      const input = screen.getByPlaceholderText(/Search tabs/i);
      fireEvent.change(input, { target: { value: 'test' } });

      await waitFor(() => {
        expect(screen.getByText(/Error/i)).toBeInTheDocument();
      });

      expect(screen.queryByText(/No tabs found/i)).not.toBeInTheDocument();
    });
  });

  describe('Tab Actions', () => {
    it('should switch to tab when Switch button clicked', async () => {
      render(<TabSearch />);

      const input = screen.getByPlaceholderText(/Search tabs/i);
      fireEvent.change(input, { target: { value: 'react' } });

      await waitFor(() => {
        expect(screen.getByText('React Documentation')).toBeInTheDocument();
      });

      const switchButtons = screen.getAllByText('Switch');
      fireEvent.click(switchButtons[0]);

      await waitFor(() => {
        expect(searchService.switchToTab).toHaveBeenCalledWith(1);
        expect(window.close).toHaveBeenCalled();
      });
    });

    it('should close tab when close button clicked', async () => {
      render(<TabSearch />);

      const input = screen.getByPlaceholderText(/Search tabs/i);
      fireEvent.change(input, { target: { value: 'react' } });

      await waitFor(() => {
        expect(screen.getByText('React Documentation')).toBeInTheDocument();
      });

      const closeButtons = screen.getAllByText('✕');
      fireEvent.click(closeButtons[0]);

      await waitFor(() => {
        expect(searchService.closeTab).toHaveBeenCalledWith(1);
      });
    });

    it('should remove tab from results after closing', async () => {
      render(<TabSearch />);

      const input = screen.getByPlaceholderText(/Search tabs/i);
      fireEvent.change(input, { target: { value: 'react' } });

      await waitFor(() => {
        expect(screen.getByText('React Documentation')).toBeInTheDocument();
      });

      const closeButtons = screen.getAllByText('✕');
      fireEvent.click(closeButtons[0]);

      await waitFor(() => {
        expect(screen.queryByText('React Documentation')).not.toBeInTheDocument();
        expect(screen.getByText('Found 1 tab')).toBeInTheDocument();
      });
    });
  });

  describe('Search Result Display', () => {
    it('should display relevance percentage', async () => {
      render(<TabSearch />);

      const input = screen.getByPlaceholderText(/Search tabs/i);
      fireEvent.change(input, { target: { value: 'react' } });

      await waitFor(() => {
        expect(screen.getByText('95%')).toBeInTheDocument();
        expect(screen.getByText('88%')).toBeInTheDocument();
      });
    });

    it('should display matched fields for non-Jira results', async () => {
      render(<TabSearch />);

      const input = screen.getByPlaceholderText(/Search tabs/i);
      fireEvent.change(input, { target: { value: 'react' } });

      await waitFor(() => {
        expect(screen.getByText(/Matched:/i)).toBeInTheDocument();
        expect(screen.getByText('title')).toBeInTheDocument();
        expect(screen.getByText('content')).toBeInTheDocument();
      });
    });

    it('should display highlights for non-Jira results', async () => {
      render(<TabSearch />);

      const input = screen.getByPlaceholderText(/Search tabs/i);
      fireEvent.change(input, { target: { value: 'react' } });

      await waitFor(() => {
        expect(screen.getByText(/"React"/i)).toBeInTheDocument();
        expect(screen.getByText(/"documentation"/i)).toBeInTheDocument();
      });
    });

    it('should display match reason when provided', async () => {
      render(<TabSearch />);

      const input = screen.getByPlaceholderText(/Search tabs/i);
      fireEvent.change(input, { target: { value: 'react' } });

      await waitFor(() => {
        expect(screen.getByText(/Exact title match/i)).toBeInTheDocument();
      });
    });

    it('should display Jira badge for Jira results', async () => {
      render(<TabSearch />);

      const input = screen.getByPlaceholderText(/Search tabs/i);
      fireEvent.change(input, { target: { value: 'ENG' } });

      await waitFor(() => {
        expect(screen.getByText(/🎫 JIRA/i)).toBeInTheDocument();
      });
    });

    it('should display tab URL', async () => {
      render(<TabSearch />);

      const input = screen.getByPlaceholderText(/Search tabs/i);
      fireEvent.change(input, { target: { value: 'react' } });

      await waitFor(() => {
        expect(screen.getByText('https://react.dev/docs')).toBeInTheDocument();
      });
    });

    it('should handle tabs without title', async () => {
      const resultWithoutTitle = [{
        ...mockSearchResults[0],
        tab: { ...mockSearchResults[0].tab, title: undefined },
      }];

      vi.mocked(searchService.searchTabs).mockResolvedValue(resultWithoutTitle);

      render(<TabSearch />);

      const input = screen.getByPlaceholderText(/Search tabs/i);
      fireEvent.change(input, { target: { value: 'test' } });

      await waitFor(() => {
        expect(screen.getByText('Untitled')).toBeInTheDocument();
      });
    });
  });

  describe('Relevance Color', () => {
    it('should use green for high relevance', async () => {
      render(<TabSearch />);

      const input = screen.getByPlaceholderText(/Search tabs/i);
      fireEvent.change(input, { target: { value: 'react' } });

      await waitFor(() => {
        const bars = document.querySelectorAll('.relevance-bar');
        expect(bars[0]).toHaveStyle({ backgroundColor: '#4ade80' });
      });
    });

    it('should use yellow for medium relevance', async () => {
      const mediumResult = [{
        ...mockSearchResults[0],
        relevanceScore: 0.65,
      }];

      vi.mocked(searchService.searchTabs).mockResolvedValue(mediumResult);

      render(<TabSearch />);

      const input = screen.getByPlaceholderText(/Search tabs/i);
      fireEvent.change(input, { target: { value: 'test' } });

      await waitFor(() => {
        const bars = document.querySelectorAll('.relevance-bar');
        expect(bars[0]).toHaveStyle({ backgroundColor: '#fbbf24' });
      });
    });
  });
});

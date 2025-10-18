import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GroupHeader } from '../GroupHeader';

// Mock window.confirm
global.confirm = vi.fn();

describe('GroupHeader', () => {
  const mockOnToggle = vi.fn();
  const mockOnSummarize = vi.fn();
  const mockOnCloseAll = vi.fn();
  const mockOnBookmarkAll = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(global.confirm).mockReturnValue(true);
  });

  describe('Rendering', () => {
    it('should render category name and tab count', () => {
      render(
        <GroupHeader
          categoryId="dev"
          categoryName="Development"
          tabCount={5}
          isCollapsed={false}
          onToggle={mockOnToggle}
        />
      );

      expect(screen.getByText(/Development \(5\)/)).toBeInTheDocument();
    });

    it('should render collapse arrow', () => {
      const { container } = render(
        <GroupHeader
          categoryId="dev"
          categoryName="Development"
          tabCount={5}
          isCollapsed={false}
          onToggle={mockOnToggle}
        />
      );

      expect(container.textContent).toContain('▶');
    });

    it('should rotate arrow when collapsed', () => {
      const { container } = render(
        <GroupHeader
          categoryId="dev"
          categoryName="Development"
          tabCount={5}
          isCollapsed={true}
          onToggle={mockOnToggle}
        />
      );

      const arrow = container.querySelector('span[style*="transform"]');
      expect(arrow).toHaveStyle({ transform: 'rotate(0deg)' });
    });

    it('should rotate arrow when expanded', () => {
      const { container } = render(
        <GroupHeader
          categoryId="dev"
          categoryName="Development"
          tabCount={5}
          isCollapsed={false}
          onToggle={mockOnToggle}
        />
      );

      const arrow = container.querySelector('span[style*="transform"]');
      expect(arrow).toHaveStyle({ transform: 'rotate(90deg)' });
    });

    it('should display memory usage when provided', () => {
      render(
        <GroupHeader
          categoryId="dev"
          categoryName="Development"
          tabCount={5}
          isCollapsed={false}
          onToggle={mockOnToggle}
          memoryUsage={52428800} // 50MB in bytes
        />
      );

      expect(screen.getByText(/50MB/)).toBeInTheDocument();
    });

    it('should not display memory usage when not provided', () => {
      render(
        <GroupHeader
          categoryId="dev"
          categoryName="Development"
          tabCount={5}
          isCollapsed={false}
          onToggle={mockOnToggle}
        />
      );

      expect(screen.queryByText(/MB/)).not.toBeInTheDocument();
    });
  });

  describe('Toggle Functionality', () => {
    it('should call onToggle when header clicked', () => {
      render(
        <GroupHeader
          categoryId="dev"
          categoryName="Development"
          tabCount={5}
          isCollapsed={false}
          onToggle={mockOnToggle}
        />
      );

      const header = screen.getByText(/Development/).closest('.category-header');
      fireEvent.click(header!);

      expect(mockOnToggle).toHaveBeenCalledTimes(1);
    });
  });

  describe('Summarize Button', () => {
    it('should render summarize button when summariesEnabled and onSummarize provided', () => {
      render(
        <GroupHeader
          categoryId="dev"
          categoryName="Development"
          tabCount={5}
          isCollapsed={false}
          onToggle={mockOnToggle}
          onSummarize={mockOnSummarize}
          summariesEnabled={true}
        />
      );

      expect(screen.getByText('📝 Summarize')).toBeInTheDocument();
    });

    it('should not render summarize button when summariesEnabled is false', () => {
      render(
        <GroupHeader
          categoryId="dev"
          categoryName="Development"
          tabCount={5}
          isCollapsed={false}
          onToggle={mockOnToggle}
          onSummarize={mockOnSummarize}
          summariesEnabled={false}
        />
      );

      expect(screen.queryByText('📝 Summarize')).not.toBeInTheDocument();
    });

    it('should not render summarize button when onSummarize not provided', () => {
      render(
        <GroupHeader
          categoryId="dev"
          categoryName="Development"
          tabCount={5}
          isCollapsed={false}
          onToggle={mockOnToggle}
          summariesEnabled={true}
        />
      );

      expect(screen.queryByText('📝 Summarize')).not.toBeInTheDocument();
    });

    it('should not render summarize button when tabCount is 1', () => {
      render(
        <GroupHeader
          categoryId="dev"
          categoryName="Development"
          tabCount={1}
          isCollapsed={false}
          onToggle={mockOnToggle}
          onSummarize={mockOnSummarize}
          summariesEnabled={true}
        />
      );

      expect(screen.queryByText('📝 Summarize')).not.toBeInTheDocument();
    });

    it('should call onSummarize when summarize button clicked', () => {
      render(
        <GroupHeader
          categoryId="dev"
          categoryName="Development"
          tabCount={5}
          isCollapsed={false}
          onToggle={mockOnToggle}
          onSummarize={mockOnSummarize}
          summariesEnabled={true}
        />
      );

      const button = screen.getByText('📝 Summarize');
      fireEvent.click(button);

      expect(mockOnSummarize).toHaveBeenCalledTimes(1);
      expect(mockOnToggle).not.toHaveBeenCalled(); // Should not toggle
    });

    it('should show loading state when isLoadingSummary is true', () => {
      render(
        <GroupHeader
          categoryId="dev"
          categoryName="Development"
          tabCount={5}
          isCollapsed={false}
          onToggle={mockOnToggle}
          onSummarize={mockOnSummarize}
          isLoadingSummary={true}
          summariesEnabled={true}
        />
      );

      expect(screen.getByText('⏳ Summarizing...')).toBeInTheDocument();
    });

    it('should disable button when loading', () => {
      render(
        <GroupHeader
          categoryId="dev"
          categoryName="Development"
          tabCount={5}
          isCollapsed={false}
          onToggle={mockOnToggle}
          onSummarize={mockOnSummarize}
          isLoadingSummary={true}
          summariesEnabled={true}
        />
      );

      const button = screen.getByText('⏳ Summarizing...');
      expect(button).toBeDisabled();
    });

    it('should stop event propagation when summarize clicked', () => {
      render(
        <GroupHeader
          categoryId="dev"
          categoryName="Development"
          tabCount={5}
          isCollapsed={false}
          onToggle={mockOnToggle}
          onSummarize={mockOnSummarize}
          summariesEnabled={true}
        />
      );

      const button = screen.getByText('📝 Summarize');
      fireEvent.click(button);

      expect(mockOnSummarize).toHaveBeenCalledTimes(1);
      expect(mockOnToggle).not.toHaveBeenCalled();
    });
  });

  describe('Close All Button', () => {
    it('should render close all button when onCloseAll provided', () => {
      render(
        <GroupHeader
          categoryId="dev"
          categoryName="Development"
          tabCount={5}
          isCollapsed={false}
          onToggle={mockOnToggle}
          onCloseAll={mockOnCloseAll}
        />
      );

      expect(screen.getByText('✕ Close All')).toBeInTheDocument();
    });

    it('should not render close all button when onCloseAll not provided', () => {
      render(
        <GroupHeader
          categoryId="dev"
          categoryName="Development"
          tabCount={5}
          isCollapsed={false}
          onToggle={mockOnToggle}
        />
      );

      expect(screen.queryByText('✕ Close All')).not.toBeInTheDocument();
    });

    it('should show confirmation dialog when close all clicked', () => {
      render(
        <GroupHeader
          categoryId="dev"
          categoryName="Development"
          tabCount={5}
          isCollapsed={false}
          onToggle={mockOnToggle}
          onCloseAll={mockOnCloseAll}
        />
      );

      const button = screen.getByText('✕ Close All');
      fireEvent.click(button);

      expect(global.confirm).toHaveBeenCalledWith('Close all 5 tabs in "Development"?');
    });

    it('should call onCloseAll when confirmed', () => {
      vi.mocked(global.confirm).mockReturnValue(true);

      render(
        <GroupHeader
          categoryId="dev"
          categoryName="Development"
          tabCount={5}
          isCollapsed={false}
          onToggle={mockOnToggle}
          onCloseAll={mockOnCloseAll}
        />
      );

      const button = screen.getByText('✕ Close All');
      fireEvent.click(button);

      expect(mockOnCloseAll).toHaveBeenCalledTimes(1);
    });

    it('should not call onCloseAll when cancelled', () => {
      vi.mocked(global.confirm).mockReturnValue(false);

      render(
        <GroupHeader
          categoryId="dev"
          categoryName="Development"
          tabCount={5}
          isCollapsed={false}
          onToggle={mockOnToggle}
          onCloseAll={mockOnCloseAll}
        />
      );

      const button = screen.getByText('✕ Close All');
      fireEvent.click(button);

      expect(mockOnCloseAll).not.toHaveBeenCalled();
    });

    it('should stop event propagation when close all clicked', () => {
      render(
        <GroupHeader
          categoryId="dev"
          categoryName="Development"
          tabCount={5}
          isCollapsed={false}
          onToggle={mockOnToggle}
          onCloseAll={mockOnCloseAll}
        />
      );

      const button = screen.getByText('✕ Close All');
      fireEvent.click(button);

      expect(mockOnToggle).not.toHaveBeenCalled();
    });
  });

  describe('Bookmark All Button', () => {
    it('should render bookmark all button when onBookmarkAll provided', () => {
      render(
        <GroupHeader
          categoryId="dev"
          categoryName="Development"
          tabCount={5}
          isCollapsed={false}
          onToggle={mockOnToggle}
          onBookmarkAll={mockOnBookmarkAll}
        />
      );

      expect(screen.getByText('★ Bookmark All')).toBeInTheDocument();
    });

    it('should not render bookmark all button when onBookmarkAll not provided', () => {
      render(
        <GroupHeader
          categoryId="dev"
          categoryName="Development"
          tabCount={5}
          isCollapsed={false}
          onToggle={mockOnToggle}
        />
      );

      expect(screen.queryByText('★ Bookmark All')).not.toBeInTheDocument();
    });

    it('should call onBookmarkAll when clicked', () => {
      render(
        <GroupHeader
          categoryId="dev"
          categoryName="Development"
          tabCount={5}
          isCollapsed={false}
          onToggle={mockOnToggle}
          onBookmarkAll={mockOnBookmarkAll}
        />
      );

      const button = screen.getByText('★ Bookmark All');
      fireEvent.click(button);

      expect(mockOnBookmarkAll).toHaveBeenCalledTimes(1);
    });

    it('should stop event propagation when bookmark all clicked', () => {
      render(
        <GroupHeader
          categoryId="dev"
          categoryName="Development"
          tabCount={5}
          isCollapsed={false}
          onToggle={mockOnToggle}
          onBookmarkAll={mockOnBookmarkAll}
        />
      );

      const button = screen.getByText('★ Bookmark All');
      fireEvent.click(button);

      expect(mockOnToggle).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero tab count', () => {
      render(
        <GroupHeader
          categoryId="dev"
          categoryName="Development"
          tabCount={0}
          isCollapsed={false}
          onToggle={mockOnToggle}
        />
      );

      expect(screen.getByText(/Development \(0\)/)).toBeInTheDocument();
    });

    it('should handle large tab counts', () => {
      render(
        <GroupHeader
          categoryId="dev"
          categoryName="Development"
          tabCount={999}
          isCollapsed={false}
          onToggle={mockOnToggle}
        />
      );

      expect(screen.getByText(/Development \(999\)/)).toBeInTheDocument();
    });

    it('should handle very large memory usage', () => {
      render(
        <GroupHeader
          categoryId="dev"
          categoryName="Development"
          tabCount={5}
          isCollapsed={false}
          onToggle={mockOnToggle}
          memoryUsage={1073741824} // 1GB in bytes
        />
      );

      expect(screen.getByText(/1024MB/)).toBeInTheDocument();
    });

    it('should render all buttons simultaneously', () => {
      render(
        <GroupHeader
          categoryId="dev"
          categoryName="Development"
          tabCount={5}
          isCollapsed={false}
          onToggle={mockOnToggle}
          onSummarize={mockOnSummarize}
          onCloseAll={mockOnCloseAll}
          onBookmarkAll={mockOnBookmarkAll}
          summariesEnabled={true}
        />
      );

      expect(screen.getByText('📝 Summarize')).toBeInTheDocument();
      expect(screen.getByText('✕ Close All')).toBeInTheDocument();
      expect(screen.getByText('★ Bookmark All')).toBeInTheDocument();
    });
  });
});

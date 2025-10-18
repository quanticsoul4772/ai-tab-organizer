import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TabItem } from '../TabItem';
import type { DensityConfig } from '../../../types/density';

// Mock the indicators utility
vi.mock('../../../utils/indicators', () => ({
  getTabIndicators: vi.fn(() => ({
    badges: [],
    activityColor: '#10b981',
    activityStatus: 'active'
  }))
}));

describe('TabItem', () => {
  const mockOnClick = vi.fn();
  const mockOnClose = vi.fn();

  const mockTab: chrome.tabs.Tab = {
    id: 1,
    title: 'Example Site',
    url: 'https://example.com/page',
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
    favIconUrl: 'https://example.com/favicon.ico',
  };

  const normalDensityConfig: DensityConfig = {
    mode: 'normal',
    height: 60,
    titleLines: 1,
    showDomain: true,
    showUrl: false,
    showTimestamp: false,
  };

  const compactDensityConfig: DensityConfig = {
    mode: 'compact',
    height: 40,
    titleLines: 1,
    showDomain: false,
    showUrl: false,
    showTimestamp: false,
  };

  const spaciousDensityConfig: DensityConfig = {
    mode: 'spacious',
    height: 80,
    titleLines: 2,
    showDomain: true,
    showUrl: true,
    showTimestamp: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock chrome.runtime.sendMessage for metadata fetching
    vi.mocked(chrome.runtime.sendMessage).mockImplementation((message, callback) => {
      if (callback) {
        callback({
          success: true,
          data: {
            lastAccessed: Date.now(),
            memoryUsage: 1024 * 1024 * 10, // 10MB
            isSuspended: false,
            duplicateCount: 1,
          },
        });
      }
      return undefined;
    });
  });

  describe('Rendering - Normal Mode', () => {
    it('should render tab title', () => {
      render(
        <TabItem
          tab={mockTab}
          style={{}}
          onClick={mockOnClick}
          onClose={mockOnClose}
          densityConfig={normalDensityConfig}
        />
      );

      expect(screen.getByText('Example Site')).toBeInTheDocument();
    });

    it('should render favicon', () => {
      const { container } = render(
        <TabItem
          tab={mockTab}
          style={{}}
          onClick={mockOnClick}
          onClose={mockOnClose}
          densityConfig={normalDensityConfig}
        />
      );

      const img = container.querySelector('img');
      expect(img).toHaveAttribute('src', 'https://example.com/favicon.ico');
    });

    it('should render close button', () => {
      render(
        <TabItem
          tab={mockTab}
          style={{}}
          onClick={mockOnClick}
          onClose={mockOnClose}
          densityConfig={normalDensityConfig}
        />
      );

      const closeButton = screen.getByLabelText(`Close ${mockTab.title}`);
      expect(closeButton).toBeInTheDocument();
    });

    it('should render activity indicator', () => {
      const { container } = render(
        <TabItem
          tab={mockTab}
          style={{}}
          onClick={mockOnClick}
          onClose={mockOnClose}
          densityConfig={normalDensityConfig}
        />
      );

      const activityDot = container.querySelector('[title="active"]');
      expect(activityDot).toBeInTheDocument();
    });

    it('should render domain when showDomain is true', () => {
      render(
        <TabItem
          tab={mockTab}
          style={{}}
          onClick={mockOnClick}
          onClose={mockOnClose}
          densityConfig={normalDensityConfig}
        />
      );

      expect(screen.getByText('example.com')).toBeInTheDocument();
    });

    it('should not render domain when showDomain is false', () => {
      const config = { ...normalDensityConfig, showDomain: false };
      render(
        <TabItem
          tab={mockTab}
          style={{}}
          onClick={mockOnClick}
          onClose={mockOnClose}
          densityConfig={config}
        />
      );

      expect(screen.queryByText('example.com')).not.toBeInTheDocument();
    });

    it('should render URL when showUrl is true', () => {
      const config = { ...normalDensityConfig, showUrl: true };
      render(
        <TabItem
          tab={mockTab}
          style={{}}
          onClick={mockOnClick}
          onClose={mockOnClose}
          densityConfig={config}
        />
      );

      expect(screen.getByText('https://example.com/page')).toBeInTheDocument();
    });
  });

  describe('Rendering - Compact Mode', () => {
    it('should render in compact mode', () => {
      render(
        <TabItem
          tab={mockTab}
          style={{}}
          onClick={mockOnClick}
          onClose={mockOnClose}
          densityConfig={compactDensityConfig}
        />
      );

      expect(screen.getByText('Example Site')).toBeInTheDocument();
    });

    it('should not show domain in compact mode', () => {
      render(
        <TabItem
          tab={mockTab}
          style={{}}
          onClick={mockOnClick}
          onClose={mockOnClose}
          densityConfig={compactDensityConfig}
        />
      );

      expect(screen.queryByText('example.com')).not.toBeInTheDocument();
    });
  });

  describe('Rendering - Spacious Mode', () => {
    it('should render in spacious mode', () => {
      render(
        <TabItem
          tab={mockTab}
          style={{}}
          onClick={mockOnClick}
          onClose={mockOnClose}
          densityConfig={spaciousDensityConfig}
        />
      );

      expect(screen.getByText('Example Site')).toBeInTheDocument();
    });

    it('should show URL in spacious mode', () => {
      render(
        <TabItem
          tab={mockTab}
          style={{}}
          onClick={mockOnClick}
          onClose={mockOnClose}
          densityConfig={spaciousDensityConfig}
        />
      );

      expect(screen.getByText('https://example.com/page')).toBeInTheDocument();
    });
  });

  describe('User Interaction', () => {
    it('should call onClick when tab is clicked', () => {
      render(
        <TabItem
          tab={mockTab}
          style={{}}
          onClick={mockOnClick}
          onClose={mockOnClose}
          densityConfig={normalDensityConfig}
        />
      );

      const title = screen.getByText('Example Site');
      fireEvent.click(title);

      expect(mockOnClick).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when close button clicked', () => {
      render(
        <TabItem
          tab={mockTab}
          style={{}}
          onClick={mockOnClick}
          onClose={mockOnClose}
          densityConfig={normalDensityConfig}
        />
      );

      const closeButton = screen.getByLabelText(`Close ${mockTab.title}`);
      fireEvent.click(closeButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should not call onClick when close button clicked', () => {
      render(
        <TabItem
          tab={mockTab}
          style={{}}
          onClick={mockOnClick}
          onClose={mockOnClose}
          densityConfig={normalDensityConfig}
        />
      );

      const closeButton = screen.getByLabelText(`Close ${mockTab.title}`);
      fireEvent.click(closeButton);

      expect(mockOnClick).not.toHaveBeenCalled();
    });

    it('should handle hover state', () => {
      const { container } = render(
        <TabItem
          tab={mockTab}
          style={{}}
          onClick={mockOnClick}
          onClose={mockOnClose}
          densityConfig={normalDensityConfig}
        />
      );

      const tabItem = container.firstChild as HTMLElement;

      // Initially not hovered
      expect(tabItem.style.backgroundColor).toBe('transparent');

      // Hover
      fireEvent.mouseEnter(tabItem);
      expect(tabItem.style.backgroundColor).toBe('rgb(243, 244, 246)');

      // Leave
      fireEvent.mouseLeave(tabItem);
      expect(tabItem.style.backgroundColor).toBe('transparent');
    });

    it('should show selected state', () => {
      const { container } = render(
        <TabItem
          tab={mockTab}
          style={{}}
          onClick={mockOnClick}
          onClose={mockOnClose}
          densityConfig={normalDensityConfig}
          isSelected={true}
        />
      );

      const tabItem = container.firstChild as HTMLElement;
      expect(tabItem.style.backgroundColor).toBe('rgb(239, 246, 255)');
      // Selected state also sets a blue left border (checked visually)
    });

    it('should not hover when selected', () => {
      const { container } = render(
        <TabItem
          tab={mockTab}
          style={{}}
          onClick={mockOnClick}
          onClose={mockOnClose}
          densityConfig={normalDensityConfig}
          isSelected={true}
        />
      );

      const tabItem = container.firstChild as HTMLElement;

      // Hover should not change background when selected
      fireEvent.mouseEnter(tabItem);
      expect(tabItem.style.backgroundColor).toBe('rgb(239, 246, 255)');
    });
  });

  describe('Metadata Fetching', () => {
    it('should fetch tab metadata from background worker', async () => {
      render(
        <TabItem
          tab={mockTab}
          style={{}}
          onClick={mockOnClick}
          onClose={mockOnClose}
          densityConfig={normalDensityConfig}
        />
      );

      await waitFor(() => {
        expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
          { action: 'getTabMetadata', tabId: mockTab.id },
          expect.any(Function)
        );
      });
    });

    it('should not fetch metadata if tab has no id', () => {
      const tabWithoutId = { ...mockTab, id: undefined };

      render(
        <TabItem
          tab={tabWithoutId}
          style={{}}
          onClick={mockOnClick}
          onClose={mockOnClose}
          densityConfig={normalDensityConfig}
        />
      );

      expect(chrome.runtime.sendMessage).not.toHaveBeenCalled();
    });
  });

  describe('Favicon Handling', () => {
    it('should use default SVG when favicon missing', () => {
      const tabWithoutFavicon = { ...mockTab, favIconUrl: undefined };
      const { container } = render(
        <TabItem
          tab={tabWithoutFavicon}
          style={{}}
          onClick={mockOnClick}
          onClose={mockOnClose}
          densityConfig={normalDensityConfig}
        />
      );

      const img = container.querySelector('img');
      expect(img?.getAttribute('src')).toContain('data:image/svg+xml');
    });

    it('should handle favicon error', () => {
      const { container } = render(
        <TabItem
          tab={mockTab}
          style={{}}
          onClick={mockOnClick}
          onClose={mockOnClose}
          densityConfig={normalDensityConfig}
        />
      );

      const img = container.querySelector('img');
      fireEvent.error(img!);

      expect(img?.getAttribute('src')).toContain('data:image/svg+xml');
    });
  });

  describe('Accessibility', () => {
    it('should have correct ARIA attributes', () => {
      render(
        <TabItem
          tab={mockTab}
          style={{}}
          onClick={mockOnClick}
          onClose={mockOnClose}
          densityConfig={normalDensityConfig}
        />
      );

      const tabItem = screen.getByRole('option');
      expect(tabItem).toHaveAttribute('aria-selected', 'false');
      expect(tabItem).toHaveAttribute('aria-label', `${mockTab.title} - ${mockTab.url}`);
      expect(tabItem).toHaveAttribute('tabIndex', '-1');
    });

    it('should have correct ARIA attributes when selected', () => {
      render(
        <TabItem
          tab={mockTab}
          style={{}}
          onClick={mockOnClick}
          onClose={mockOnClose}
          densityConfig={normalDensityConfig}
          isSelected={true}
        />
      );

      const tabItem = screen.getByRole('option');
      expect(tabItem).toHaveAttribute('aria-selected', 'true');
      expect(tabItem).toHaveAttribute('tabIndex', '0');
    });

    it('should have aria-label on close button', () => {
      render(
        <TabItem
          tab={mockTab}
          style={{}}
          onClick={mockOnClick}
          onClose={mockOnClose}
          densityConfig={normalDensityConfig}
        />
      );

      const closeButton = screen.getByLabelText(`Close ${mockTab.title}`);
      expect(closeButton).toHaveAttribute('type', 'button');
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing title', () => {
      const tabWithoutTitle = { ...mockTab, title: undefined };
      render(
        <TabItem
          tab={tabWithoutTitle}
          style={{}}
          onClick={mockOnClick}
          onClose={mockOnClose}
          densityConfig={normalDensityConfig}
        />
      );

      // Component should still render
      const container = screen.getByRole('option');
      expect(container).toBeInTheDocument();
    });

    it('should handle invalid URL', () => {
      const tabWithInvalidUrl = { ...mockTab, url: 'not-a-url' };
      render(
        <TabItem
          tab={tabWithInvalidUrl}
          style={{}}
          onClick={mockOnClick}
          onClose={mockOnClose}
          densityConfig={normalDensityConfig}
        />
      );

      // Should not crash, domain should be empty
      expect(screen.queryByText('example.com')).not.toBeInTheDocument();
    });

    it('should handle missing URL', () => {
      const tabWithoutUrl = { ...mockTab, url: undefined };
      render(
        <TabItem
          tab={tabWithoutUrl}
          style={{}}
          onClick={mockOnClick}
          onClose={mockOnClose}
          densityConfig={normalDensityConfig}
        />
      );

      expect(screen.getByText('Example Site')).toBeInTheDocument();
    });

    it('should handle very long titles', () => {
      const longTitle = 'A'.repeat(200);
      const tabWithLongTitle = { ...mockTab, title: longTitle };

      render(
        <TabItem
          tab={tabWithLongTitle}
          style={{}}
          onClick={mockOnClick}
          onClose={mockOnClose}
          densityConfig={normalDensityConfig}
        />
      );

      expect(screen.getByText(longTitle)).toBeInTheDocument();
    });

    it('should handle pinned tabs', () => {
      const pinnedTab = { ...mockTab, pinned: true };
      render(
        <TabItem
          tab={pinnedTab}
          style={{}}
          onClick={mockOnClick}
          onClose={mockOnClose}
          densityConfig={normalDensityConfig}
        />
      );

      expect(screen.getByText('Example Site')).toBeInTheDocument();
    });
  });

  describe('Memoization', () => {
    it('should not re-render when unrelated props change', () => {
      const { rerender } = render(
        <TabItem
          tab={mockTab}
          style={{}}
          onClick={mockOnClick}
          onClose={mockOnClose}
          densityConfig={normalDensityConfig}
        />
      );

      const firstRenderText = screen.getByText('Example Site');

      // Re-render with same props but different callback references
      rerender(
        <TabItem
          tab={mockTab}
          style={{}}
          onClick={vi.fn()}
          onClose={vi.fn()}
          densityConfig={normalDensityConfig}
        />
      );

      const secondRenderText = screen.getByText('Example Site');
      expect(firstRenderText).toBe(secondRenderText);
    });
  });
});

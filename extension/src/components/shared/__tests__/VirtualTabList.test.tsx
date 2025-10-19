import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { VirtualTabList } from '../VirtualTabList';

// Mock dependencies
vi.mock('../../hooks/useKeyboardNav', () => ({
  useKeyboardNav: () => ({
    selectedIndex: 0,
    setSelectedIndex: vi.fn(),
  }),
}));

vi.mock('../../../utils/performance', () => ({
  perfMonitor: {
    measure: vi.fn(),
    getStats: vi.fn(() => null),
  },
}));

describe('VirtualTabList', () => {
  const mockOnTabClick = vi.fn();
  const mockOnTabClose = vi.fn();

  const mockTabs: chrome.tabs.Tab[] = [
    {
      id: 1,
      title: 'Tab 1',
      url: 'https://example1.com',
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
      title: 'Tab 2',
      url: 'https://example2.com',
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
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render empty state when no tabs', () => {
      render(<VirtualTabList tabs={[]} onTabClick={mockOnTabClick} onTabClose={mockOnTabClose} />);

      expect(screen.getByText('No tabs to display')).toBeInTheDocument();
    });

    it('should render with tabs', () => {
      const { container } = render(
        <VirtualTabList tabs={mockTabs} onTabClick={mockOnTabClick} onTabClose={mockOnTabClose} />
      );

      // Should render the list container
      expect(container.querySelector('[role="listbox"]')).toBeInTheDocument();
    });

    it('should have correct ARIA attributes', () => {
      render(
        <VirtualTabList tabs={mockTabs} onTabClick={mockOnTabClick} onTabClose={mockOnTabClose} />
      );

      const listbox = screen.getByRole('listbox');
      expect(listbox).toHaveAttribute('aria-label', 'Tab list');
      expect(listbox).toHaveAttribute('tabIndex', '0');
    });
  });

  describe('Density Modes', () => {
    it('should render in normal mode by default', () => {
      render(
        <VirtualTabList tabs={mockTabs} onTabClick={mockOnTabClick} onTabClose={mockOnTabClose} />
      );

      const listbox = screen.getByRole('listbox');
      expect(listbox).toBeInTheDocument();
    });

    it('should render in compact mode', () => {
      render(
        <VirtualTabList
          tabs={mockTabs}
          densityMode="compact"
          onTabClick={mockOnTabClick}
          onTabClose={mockOnTabClose}
        />
      );

      const listbox = screen.getByRole('listbox');
      expect(listbox).toBeInTheDocument();
    });

    it('should render in spacious mode', () => {
      render(
        <VirtualTabList
          tabs={mockTabs}
          densityMode="spacious"
          onTabClick={mockOnTabClick}
          onTabClose={mockOnTabClose}
        />
      );

      const listbox = screen.getByRole('listbox');
      expect(listbox).toBeInTheDocument();
    });
  });

  describe('Props', () => {
    it('should accept custom height', () => {
      render(
        <VirtualTabList
          tabs={mockTabs}
          height={600}
          onTabClick={mockOnTabClick}
          onTabClose={mockOnTabClose}
        />
      );

      const listbox = screen.getByRole('listbox');
      expect(listbox).toBeInTheDocument();
    });

    it('should accept selectedIndex', () => {
      render(
        <VirtualTabList
          tabs={mockTabs}
          selectedIndex={1}
          onTabClick={mockOnTabClick}
          onTabClose={mockOnTabClose}
        />
      );

      const listbox = screen.getByRole('listbox');
      expect(listbox).toBeInTheDocument();
    });

    it('should accept keyboardNavEnabled prop', () => {
      render(
        <VirtualTabList
          tabs={mockTabs}
          keyboardNavEnabled={false}
          onTabClick={mockOnTabClick}
          onTabClose={mockOnTabClose}
        />
      );

      const listbox = screen.getByRole('listbox');
      expect(listbox).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle single tab', () => {
      render(
        <VirtualTabList
          tabs={[mockTabs[0]]}
          onTabClick={mockOnTabClick}
          onTabClose={mockOnTabClose}
        />
      );

      const listbox = screen.getByRole('listbox');
      expect(listbox).toBeInTheDocument();
    });

    it('should handle large number of tabs', () => {
      const manyTabs = Array.from({ length: 100 }, (_, i) => ({
        ...mockTabs[0],
        id: i + 1,
        title: `Tab ${i + 1}`,
      }));

      render(
        <VirtualTabList tabs={manyTabs} onTabClick={mockOnTabClick} onTabClose={mockOnTabClose} />
      );

      const listbox = screen.getByRole('listbox');
      expect(listbox).toBeInTheDocument();
    });
  });
});

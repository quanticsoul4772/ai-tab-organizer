import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { JiraView } from '../JiraView';

// Mock Chrome APIs
const mockChrome = {
  tabs: {
    query: vi.fn(),
    update: vi.fn(),
    get: vi.fn(),
    remove: vi.fn(),
  },
  windows: {
    update: vi.fn(),
  },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(global as any).chrome = mockChrome;

describe('JiraView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Loading State', () => {
    it('shows loading state initially', () => {
      mockChrome.tabs.query.mockImplementation(() => new Promise(() => {})); // Never resolves

      render(<JiraView />);

      expect(screen.getByText('Loading Atlassian tabs...')).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('shows empty state when no Atlassian tabs', async () => {
      mockChrome.tabs.query.mockResolvedValue([
        { id: 1, title: 'Google', url: 'https://google.com' },
      ]);

      render(<JiraView />);

      await waitFor(() => {
        expect(screen.getByText('No Atlassian tabs found')).toBeInTheDocument();
      });
    });
  });

  describe('Jira Tabs', () => {
    beforeEach(() => {
      mockChrome.tabs.query.mockResolvedValue([
        {
          id: 1,
          title: 'ENG-123: Fix bug',
          url: 'https://company.atlassian.net/browse/ENG-123',
          favIconUrl: 'https://icon.png',
        },
        {
          id: 2,
          title: 'ENG-456: Add feature',
          url: 'https://company.atlassian.net/browse/ENG-456',
          favIconUrl: 'https://icon.png',
        },
        {
          id: 3,
          title: 'APPS-789: Update docs',
          url: 'https://company.atlassian.net/browse/APPS-789',
          favIconUrl: 'https://icon.png',
        },
      ]);
    });

    it('renders Jira tabs grouped by project', async () => {
      render(<JiraView />);

      await waitFor(() => {
        const projectNames = screen.getAllByText(/ENG|APPS/);
        expect(projectNames.length).toBeGreaterThanOrEqual(2);
      });
    });

    it('shows tab count for each project', async () => {
      render(<JiraView />);

      await waitFor(() => {
        // Check for Jira tab button showing total count
        expect(screen.getByText(/Jira \(3\)/)).toBeInTheDocument();
      });
    });

    it('auto-expands when only 1-2 projects', async () => {
      render(<JiraView />);

      await waitFor(() => {
        // With 2 projects, should auto-expand both
        expect(screen.getByText('ENG-123')).toBeInTheDocument();
        expect(screen.getByText('APPS-789')).toBeInTheDocument();
      });
    });

    it('toggles project expansion on click', async () => {
      mockChrome.tabs.query.mockResolvedValue([
        {
          id: 1,
          title: 'ENG-123: Fix bug',
          url: 'https://company.atlassian.net/browse/ENG-123',
        },
        {
          id: 2,
          title: 'APPS-456: Feature',
          url: 'https://company.atlassian.net/browse/APPS-456',
        },
        {
          id: 3,
          title: 'PROJ-789: Update',
          url: 'https://company.atlassian.net/browse/PROJ-789',
        },
      ]);

      render(<JiraView />);

      await waitFor(() => {
        const engHeader = screen.getByText(/ENG/);
        expect(engHeader).toBeInTheDocument();
      });

      // Should not be auto-expanded with 3 projects
      expect(screen.queryByText('ENG-123')).not.toBeInTheDocument();

      // Click to expand
      const engHeader = screen.getByText(/ENG/);
      fireEvent.click(engHeader);

      await waitFor(() => {
        expect(screen.getByText('ENG-123')).toBeInTheDocument();
      });
    });

    it('opens tab when clicked', async () => {
      mockChrome.tabs.update.mockResolvedValue({});
      mockChrome.tabs.get.mockResolvedValue({ id: 1, windowId: 5 });
      mockChrome.windows.update.mockResolvedValue({});

      render(<JiraView />);

      await waitFor(() => {
        expect(screen.getByText('ENG-123')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('ENG-123'));

      await waitFor(() => {
        expect(mockChrome.tabs.update).toHaveBeenCalledWith(1, { active: true });
        expect(mockChrome.windows.update).toHaveBeenCalledWith(5, { focused: true });
      });
    });

    it('closes tab when close button clicked', async () => {
      mockChrome.tabs.remove.mockResolvedValue(undefined);

      render(<JiraView />);

      await waitFor(() => {
        const closeButtons = screen.getAllByTitle('Close tab');
        expect(closeButtons.length).toBeGreaterThan(0);
      });

      const firstCloseButton = screen.getAllByTitle('Close tab')[0];
      fireEvent.click(firstCloseButton);

      await waitFor(() => {
        expect(mockChrome.tabs.remove).toHaveBeenCalled();
      });
    });
  });

  describe('Search Functionality', () => {
    beforeEach(() => {
      mockChrome.tabs.query.mockResolvedValue([
        {
          id: 1,
          title: 'ENG-123: Fix login bug',
          url: 'https://company.atlassian.net/browse/ENG-123',
        },
        {
          id: 2,
          title: 'ENG-456: Add auth feature',
          url: 'https://company.atlassian.net/browse/ENG-456',
        },
        {
          id: 3,
          title: 'APPS-789: Update documentation',
          url: 'https://company.atlassian.net/browse/APPS-789',
        },
      ]);
    });

    it('filters Jira tabs by search query', async () => {
      render(<JiraView />);

      await waitFor(() => {
        expect(screen.getByText('ENG-123')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/search/i);
      fireEvent.change(searchInput, { target: { value: 'login' } });

      await waitFor(() => {
        expect(screen.getByText('ENG-123')).toBeInTheDocument();
        expect(screen.queryByText('ENG-456')).not.toBeInTheDocument();
      });
    });

    it('searches by ticket number', async () => {
      render(<JiraView />);

      await waitFor(() => {
        expect(screen.getByText('ENG-123')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/search/i);
      fireEvent.change(searchInput, { target: { value: '456' } });

      await waitFor(() => {
        expect(screen.getByText('ENG-456')).toBeInTheDocument();
        expect(screen.queryByText('ENG-123')).not.toBeInTheDocument();
      });
    });

    it('searches by project key', async () => {
      render(<JiraView />);

      await waitFor(() => {
        expect(screen.getByText('ENG-123')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/search/i);
      fireEvent.change(searchInput, { target: { value: 'APPS' } });

      await waitFor(() => {
        expect(screen.getByText('APPS-789')).toBeInTheDocument();
        expect(screen.queryByText('ENG-123')).not.toBeInTheDocument();
      });
    });
  });

  describe('Tab Switching', () => {
    beforeEach(() => {
      mockChrome.tabs.query.mockResolvedValue([
        {
          id: 1,
          title: 'ENG-123: Fix bug',
          url: 'https://company.atlassian.net/browse/ENG-123',
        },
        {
          id: 2,
          title: 'Project Overview',
          url: 'https://company.atlassian.net/wiki/spaces/PROJ/overview',
        },
      ]);
    });

    it('switches to Confluence tab', async () => {
      render(<JiraView />);

      await waitFor(() => {
        expect(screen.getByText(/Jira \(/)).toBeInTheDocument();
      });

      const confluenceButton = screen.getByText(/Confluence \(/);
      fireEvent.click(confluenceButton);

      await waitFor(() => {
        const spaces = screen.getAllByText(/PROJ/);
        expect(spaces.length).toBeGreaterThan(0);
      });
    });

    it('shows Jira stats on Jira tab', async () => {
      render(<JiraView />);

      await waitFor(() => {
        // Check that Jira ticket content is displayed
        expect(screen.getByText('ENG-123')).toBeInTheDocument();
      });

      // Verify "Jira tickets" text appears in stats section
      const statsText = screen.getByText(/Jira tickets/i);
      expect(statsText).toBeInTheDocument();
    });

    it('shows Confluence stats on Confluence tab', async () => {
      render(<JiraView />);

      await waitFor(() => {
        const confluenceButton = screen.getByText(/Confluence \(/);
        fireEvent.click(confluenceButton);
      });

      await waitFor(() => {
        // Check for Confluence content is displayed
        const spaces = screen.getAllByText(/PROJ/);
        expect(spaces.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Error Handling', () => {
    it('shows error state when loading fails', async () => {
      mockChrome.tabs.query.mockRejectedValue(new Error('Failed to load'));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      render(<JiraView />);

      await waitFor(() => {
        expect(screen.getByText('Failed to load Atlassian tabs')).toBeInTheDocument();
      });

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('handles tab open error gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      mockChrome.tabs.query.mockResolvedValue([
        {
          id: 1,
          title: 'ENG-123: Fix bug',
          url: 'https://company.atlassian.net/browse/ENG-123',
        },
        {
          id: 2,
          title: 'ENG-456: Add feature',
          url: 'https://company.atlassian.net/browse/ENG-456',
        },
      ]);
      mockChrome.tabs.update.mockRejectedValue(new Error('Tab not found'));

      render(<JiraView />);

      await waitFor(() => {
        expect(screen.getByText('ENG-123')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('ENG-123'));

      // Should not crash
      await waitFor(() => {
        expect(mockChrome.tabs.update).toHaveBeenCalled();
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Confluence Tabs', () => {
    beforeEach(() => {
      mockChrome.tabs.query.mockResolvedValue([
        {
          id: 1,
          title: 'Project Overview',
          url: 'https://company.atlassian.net/wiki/spaces/PROJ/overview',
        },
        {
          id: 2,
          title: 'API Documentation',
          url: 'https://company.atlassian.net/wiki/spaces/PROJ/pages/123/API',
        },
        {
          id: 3,
          title: 'Team Space',
          url: 'https://company.atlassian.net/wiki/spaces/TEAM/overview',
        },
      ]);
    });

    it('renders Confluence pages grouped by space', async () => {
      render(<JiraView />);

      await waitFor(() => {
        const confluenceButton = screen.getByText(/Confluence \(/);
        fireEvent.click(confluenceButton);
      });

      await waitFor(() => {
        const spaces = screen.getAllByText(/PROJ|TEAM/);
        expect(spaces.length).toBeGreaterThanOrEqual(2);
      });
    });

    it('toggles space expansion', async () => {
      mockChrome.tabs.query.mockResolvedValue([
        {
          id: 1,
          title: 'Page 1',
          url: 'https://company.atlassian.net/wiki/spaces/PROJ/pages/1',
        },
        {
          id: 2,
          title: 'Page 2',
          url: 'https://company.atlassian.net/wiki/spaces/ENG/pages/2',
        },
        {
          id: 3,
          title: 'Page 3',
          url: 'https://company.atlassian.net/wiki/spaces/APPS/pages/3',
        },
      ]);

      render(<JiraView />);

      await waitFor(() => {
        const confluenceButton = screen.getByText(/Confluence \(/);
        fireEvent.click(confluenceButton);
      });

      await waitFor(() => {
        const spaces = screen.getAllByText(/PROJ|ENG|APPS/);
        expect(spaces.length).toBeGreaterThanOrEqual(1);
      });

      // Should not be auto-expanded with 3 spaces
      expect(screen.queryByText('Page 1')).not.toBeInTheDocument();

      // Click to expand first space - click on PROJ text
      const projHeader = screen.getAllByText('PROJ')[0];
      fireEvent.click(projHeader);

      await waitFor(() => {
        expect(screen.getByText('Page 1')).toBeInTheDocument();
      });
    });
  });
});

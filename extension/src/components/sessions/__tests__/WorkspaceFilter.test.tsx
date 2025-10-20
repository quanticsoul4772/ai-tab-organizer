import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WorkspaceFilter } from '../WorkspaceFilter';
import type { SessionListItem } from '../../../types/session';

const mockSessions: SessionListItem[] = [
  {
    id: 'session-1',
    name: 'Session 1',
    created: 1234567890,
    lastModified: 1234567890,
    tabCount: 5,
    categories: ['ENG', 'APPS'],
  },
  {
    id: 'session-2',
    name: 'Session 2',
    created: 1234567890,
    lastModified: 1234567890,
    tabCount: 3,
    categories: ['ENG'],
  },
  {
    id: 'session-3',
    name: 'Session 3',
    created: 1234567890,
    lastModified: 1234567890,
    tabCount: 2,
    categories: ['APPS'],
  },
];

describe('WorkspaceFilter', () => {
  describe('Rendering', () => {
    it('renders nothing when no workspaces', () => {
      const { container } = render(
        <WorkspaceFilter
          workspaces={[]}
          selectedWorkspace={null}
          allSessions={mockSessions}
          onSelectWorkspace={vi.fn()}
        />
      );

      expect(container.firstChild).toBeNull();
    });

    it('renders workspace filter when workspaces exist', () => {
      render(
        <WorkspaceFilter
          workspaces={['ENG', 'APPS']}
          selectedWorkspace={null}
          allSessions={mockSessions}
          onSelectWorkspace={vi.fn()}
        />
      );

      expect(screen.getByText('Workspaces:')).toBeInTheDocument();
    });

    it('renders All button with total count', () => {
      render(
        <WorkspaceFilter
          workspaces={['ENG', 'APPS']}
          selectedWorkspace={null}
          allSessions={mockSessions}
          onSelectWorkspace={vi.fn()}
        />
      );

      expect(screen.getByText('All (3)')).toBeInTheDocument();
    });

    it('renders workspace buttons with counts', () => {
      render(
        <WorkspaceFilter
          workspaces={['ENG', 'APPS']}
          selectedWorkspace={null}
          allSessions={mockSessions}
          onSelectWorkspace={vi.fn()}
        />
      );

      expect(screen.getByText('ENG (2)')).toBeInTheDocument();
      expect(screen.getByText('APPS (2)')).toBeInTheDocument();
    });

    it('renders all workspace buttons', () => {
      render(
        <WorkspaceFilter
          workspaces={['ENG', 'APPS', 'PROJ']}
          selectedWorkspace={null}
          allSessions={mockSessions}
          onSelectWorkspace={vi.fn()}
        />
      );

      expect(screen.getByText(/ENG/)).toBeInTheDocument();
      expect(screen.getByText(/APPS/)).toBeInTheDocument();
      expect(screen.getByText(/PROJ/)).toBeInTheDocument();
    });
  });

  describe('Selection State', () => {
    it('shows All button when selectedWorkspace is null', () => {
      render(
        <WorkspaceFilter
          workspaces={['ENG', 'APPS']}
          selectedWorkspace={null}
          allSessions={mockSessions}
          onSelectWorkspace={vi.fn()}
        />
      );

      const allButton = screen.getByText('All (3)');
      expect(allButton).toBeInTheDocument();
    });

    it('shows selected workspace button', () => {
      render(
        <WorkspaceFilter
          workspaces={['ENG', 'APPS']}
          selectedWorkspace="ENG"
          allSessions={mockSessions}
          onSelectWorkspace={vi.fn()}
        />
      );

      const engButton = screen.getByText('ENG (2)');
      expect(engButton).toBeInTheDocument();
    });

    it('shows non-selected workspace', () => {
      render(
        <WorkspaceFilter
          workspaces={['ENG', 'APPS']}
          selectedWorkspace="ENG"
          allSessions={mockSessions}
          onSelectWorkspace={vi.fn()}
        />
      );

      const appsButton = screen.getByText('APPS (2)');
      expect(appsButton).toBeInTheDocument();
    });
  });

  describe('User Interaction', () => {
    it('calls onSelectWorkspace with null when All button clicked', () => {
      const onSelectWorkspace = vi.fn();

      render(
        <WorkspaceFilter
          workspaces={['ENG', 'APPS']}
          selectedWorkspace="ENG"
          allSessions={mockSessions}
          onSelectWorkspace={onSelectWorkspace}
        />
      );

      fireEvent.click(screen.getByText('All (3)'));
      expect(onSelectWorkspace).toHaveBeenCalledWith(null);
    });

    it('calls onSelectWorkspace with workspace name when workspace button clicked', () => {
      const onSelectWorkspace = vi.fn();

      render(
        <WorkspaceFilter
          workspaces={['ENG', 'APPS']}
          selectedWorkspace={null}
          allSessions={mockSessions}
          onSelectWorkspace={onSelectWorkspace}
        />
      );

      fireEvent.click(screen.getByText('ENG (2)'));
      expect(onSelectWorkspace).toHaveBeenCalledWith('ENG');
    });

    it('handles clicking different workspaces', () => {
      const onSelectWorkspace = vi.fn();

      render(
        <WorkspaceFilter
          workspaces={['ENG', 'APPS']}
          selectedWorkspace="ENG"
          allSessions={mockSessions}
          onSelectWorkspace={onSelectWorkspace}
        />
      );

      fireEvent.click(screen.getByText('APPS (2)'));
      expect(onSelectWorkspace).toHaveBeenCalledWith('APPS');
    });
  });

  describe('Workspace Counting', () => {
    it('correctly counts sessions with multiple categories', () => {
      render(
        <WorkspaceFilter
          workspaces={['ENG', 'APPS']}
          selectedWorkspace={null}
          allSessions={mockSessions}
          onSelectWorkspace={vi.fn()}
        />
      );

      // Session 1 has both ENG and APPS, Session 2 has ENG, so ENG count is 2
      expect(screen.getByText('ENG (2)')).toBeInTheDocument();
      // Session 1 has both ENG and APPS, Session 3 has APPS, so APPS count is 2
      expect(screen.getByText('APPS (2)')).toBeInTheDocument();
    });

    it('shows 0 count for workspaces with no sessions', () => {
      render(
        <WorkspaceFilter
          workspaces={['PROJ']}
          selectedWorkspace={null}
          allSessions={mockSessions}
          onSelectWorkspace={vi.fn()}
        />
      );

      expect(screen.getByText('PROJ (0)')).toBeInTheDocument();
    });

    it('handles sessions without categories', () => {
      const sessionsWithoutCategories: SessionListItem[] = [
        {
          id: 'session-1',
          name: 'Session 1',
          created: 1234567890,
          lastModified: 1234567890,
          tabCount: 5,
          categories: undefined,
        },
      ];

      render(
        <WorkspaceFilter
          workspaces={['ENG']}
          selectedWorkspace={null}
          allSessions={sessionsWithoutCategories}
          onSelectWorkspace={vi.fn()}
        />
      );

      expect(screen.getByText('ENG (0)')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles empty sessions array', () => {
      render(
        <WorkspaceFilter
          workspaces={['ENG']}
          selectedWorkspace={null}
          allSessions={[]}
          onSelectWorkspace={vi.fn()}
        />
      );

      expect(screen.getByText('All (0)')).toBeInTheDocument();
      expect(screen.getByText('ENG (0)')).toBeInTheDocument();
    });

    it('handles single workspace', () => {
      render(
        <WorkspaceFilter
          workspaces={['ENG']}
          selectedWorkspace={null}
          allSessions={mockSessions}
          onSelectWorkspace={vi.fn()}
        />
      );

      expect(screen.getByText(/ENG/)).toBeInTheDocument();
      expect(screen.queryByText(/APPS/)).toBeNull();
    });

    it('handles many workspaces', () => {
      const manyWorkspaces = ['ENG', 'APPS', 'PROJ', 'INFRA', 'OPS'];

      render(
        <WorkspaceFilter
          workspaces={manyWorkspaces}
          selectedWorkspace={null}
          allSessions={mockSessions}
          onSelectWorkspace={vi.fn()}
        />
      );

      manyWorkspaces.forEach((workspace) => {
        expect(screen.getByText(new RegExp(workspace))).toBeInTheDocument();
      });
    });
  });
});

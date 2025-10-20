import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SessionCard } from '../SessionCard';
import type { SessionListItem } from '../../../types/session';

const mockSession: SessionListItem = {
  id: 'session-1',
  name: 'Test Session',
  description: 'Test description',
  created: 1234567890,
  lastModified: 1234567890,
  tabCount: 5,
  jiraTickets: ['ENG-123', 'ENG-456'],
  categories: ['ENG', 'APPS'],
  preview: 'Tab 1, Tab 2, Tab 3',
};

const mockFormatDate = vi.fn((_timestamp: number) => '2024-01-15');

describe('SessionCard', () => {
  describe('Display Mode', () => {
    it('renders session name', () => {
      render(
        <SessionCard
          session={mockSession}
          isEditing={false}
          editName=""
          onEditNameChange={vi.fn()}
          onStartEdit={vi.fn()}
          onSaveEdit={vi.fn()}
          onCancelEdit={vi.fn()}
          onRestore={vi.fn()}
          onExport={vi.fn()}
          onDelete={vi.fn()}
          formatDate={mockFormatDate}
        />
      );

      expect(screen.getByText('Test Session')).toBeInTheDocument();
    });

    it('renders description', () => {
      render(
        <SessionCard
          session={mockSession}
          isEditing={false}
          editName=""
          onEditNameChange={vi.fn()}
          onStartEdit={vi.fn()}
          onSaveEdit={vi.fn()}
          onCancelEdit={vi.fn()}
          onRestore={vi.fn()}
          onExport={vi.fn()}
          onDelete={vi.fn()}
          formatDate={mockFormatDate}
        />
      );

      expect(screen.getByText('Test description')).toBeInTheDocument();
    });

    it('renders tab count', () => {
      render(
        <SessionCard
          session={mockSession}
          isEditing={false}
          editName=""
          onEditNameChange={vi.fn()}
          onStartEdit={vi.fn()}
          onSaveEdit={vi.fn()}
          onCancelEdit={vi.fn()}
          onRestore={vi.fn()}
          onExport={vi.fn()}
          onDelete={vi.fn()}
          formatDate={mockFormatDate}
        />
      );

      expect(screen.getByText('5 tabs')).toBeInTheDocument();
    });

    it('renders Jira ticket count', () => {
      render(
        <SessionCard
          session={mockSession}
          isEditing={false}
          editName=""
          onEditNameChange={vi.fn()}
          onStartEdit={vi.fn()}
          onSaveEdit={vi.fn()}
          onCancelEdit={vi.fn()}
          onRestore={vi.fn()}
          onExport={vi.fn()}
          onDelete={vi.fn()}
          formatDate={mockFormatDate}
        />
      );

      expect(screen.getByText('2 Jira tickets')).toBeInTheDocument();
    });

    it('renders workspace badges', () => {
      render(
        <SessionCard
          session={mockSession}
          isEditing={false}
          editName=""
          onEditNameChange={vi.fn()}
          onStartEdit={vi.fn()}
          onSaveEdit={vi.fn()}
          onCancelEdit={vi.fn()}
          onRestore={vi.fn()}
          onExport={vi.fn()}
          onDelete={vi.fn()}
          formatDate={mockFormatDate}
        />
      );

      expect(screen.getByText('ENG')).toBeInTheDocument();
      expect(screen.getByText('APPS')).toBeInTheDocument();
    });

    it('renders preview', () => {
      render(
        <SessionCard
          session={mockSession}
          isEditing={false}
          editName=""
          onEditNameChange={vi.fn()}
          onStartEdit={vi.fn()}
          onSaveEdit={vi.fn()}
          onCancelEdit={vi.fn()}
          onRestore={vi.fn()}
          onExport={vi.fn()}
          onDelete={vi.fn()}
          formatDate={mockFormatDate}
        />
      );

      expect(screen.getByText('Tab 1, Tab 2, Tab 3')).toBeInTheDocument();
    });

    it('calls formatDate with lastModified', () => {
      const formatDate = vi.fn((_timestamp: number) => '2024-01-15');

      render(
        <SessionCard
          session={mockSession}
          isEditing={false}
          editName=""
          onEditNameChange={vi.fn()}
          onStartEdit={vi.fn()}
          onSaveEdit={vi.fn()}
          onCancelEdit={vi.fn()}
          onRestore={vi.fn()}
          onExport={vi.fn()}
          onDelete={vi.fn()}
          formatDate={formatDate}
        />
      );

      expect(formatDate).toHaveBeenCalledWith(1234567890);
    });
  });

  describe('Edit Mode', () => {
    it('renders edit input when isEditing is true', () => {
      render(
        <SessionCard
          session={mockSession}
          isEditing={true}
          editName="New Name"
          onEditNameChange={vi.fn()}
          onStartEdit={vi.fn()}
          onSaveEdit={vi.fn()}
          onCancelEdit={vi.fn()}
          onRestore={vi.fn()}
          onExport={vi.fn()}
          onDelete={vi.fn()}
          formatDate={mockFormatDate}
        />
      );

      const input = screen.getByRole('textbox');
      expect(input).toBeInTheDocument();
      expect(input).toHaveValue('New Name');
    });

    it('calls onEditNameChange when input changes', () => {
      const onEditNameChange = vi.fn();

      render(
        <SessionCard
          session={mockSession}
          isEditing={true}
          editName="New Name"
          onEditNameChange={onEditNameChange}
          onStartEdit={vi.fn()}
          onSaveEdit={vi.fn()}
          onCancelEdit={vi.fn()}
          onRestore={vi.fn()}
          onExport={vi.fn()}
          onDelete={vi.fn()}
          formatDate={mockFormatDate}
        />
      );

      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'Updated Name' } });

      expect(onEditNameChange).toHaveBeenCalledWith('Updated Name');
    });

    it('calls onSaveEdit when save button clicked', () => {
      const onSaveEdit = vi.fn();

      render(
        <SessionCard
          session={mockSession}
          isEditing={true}
          editName="New Name"
          onEditNameChange={vi.fn()}
          onStartEdit={vi.fn()}
          onSaveEdit={onSaveEdit}
          onCancelEdit={vi.fn()}
          onRestore={vi.fn()}
          onExport={vi.fn()}
          onDelete={vi.fn()}
          formatDate={mockFormatDate}
        />
      );

      fireEvent.click(screen.getByText('✓'));
      expect(onSaveEdit).toHaveBeenCalled();
    });

    it('calls onCancelEdit when cancel button clicked', () => {
      const onCancelEdit = vi.fn();

      render(
        <SessionCard
          session={mockSession}
          isEditing={true}
          editName="New Name"
          onEditNameChange={vi.fn()}
          onStartEdit={vi.fn()}
          onSaveEdit={vi.fn()}
          onCancelEdit={onCancelEdit}
          onRestore={vi.fn()}
          onExport={vi.fn()}
          onDelete={vi.fn()}
          formatDate={mockFormatDate}
        />
      );

      fireEvent.click(screen.getByText('✕'));
      expect(onCancelEdit).toHaveBeenCalled();
    });

    it('calls onSaveEdit when Enter is pressed', () => {
      const onSaveEdit = vi.fn();

      render(
        <SessionCard
          session={mockSession}
          isEditing={true}
          editName="New Name"
          onEditNameChange={vi.fn()}
          onStartEdit={vi.fn()}
          onSaveEdit={onSaveEdit}
          onCancelEdit={vi.fn()}
          onRestore={vi.fn()}
          onExport={vi.fn()}
          onDelete={vi.fn()}
          formatDate={mockFormatDate}
        />
      );

      const input = screen.getByRole('textbox');
      fireEvent.keyPress(input, { key: 'Enter', code: 'Enter', charCode: 13 });

      expect(onSaveEdit).toHaveBeenCalled();
    });
  });

  describe('Actions', () => {
    it('calls onStartEdit when edit button clicked', () => {
      const onStartEdit = vi.fn();

      render(
        <SessionCard
          session={mockSession}
          isEditing={false}
          editName=""
          onEditNameChange={vi.fn()}
          onStartEdit={onStartEdit}
          onSaveEdit={vi.fn()}
          onCancelEdit={vi.fn()}
          onRestore={vi.fn()}
          onExport={vi.fn()}
          onDelete={vi.fn()}
          formatDate={mockFormatDate}
        />
      );

      fireEvent.click(screen.getByTitle('Rename session'));
      expect(onStartEdit).toHaveBeenCalled();
    });

    it('calls onRestore with false when Restore button clicked', () => {
      const onRestore = vi.fn();

      render(
        <SessionCard
          session={mockSession}
          isEditing={false}
          editName=""
          onEditNameChange={vi.fn()}
          onStartEdit={vi.fn()}
          onSaveEdit={vi.fn()}
          onCancelEdit={vi.fn()}
          onRestore={onRestore}
          onExport={vi.fn()}
          onDelete={vi.fn()}
          formatDate={mockFormatDate}
        />
      );

      fireEvent.click(screen.getByText('Restore'));
      expect(onRestore).toHaveBeenCalledWith(false);
    });

    it('calls onRestore with true when Replace button clicked', () => {
      const onRestore = vi.fn();

      render(
        <SessionCard
          session={mockSession}
          isEditing={false}
          editName=""
          onEditNameChange={vi.fn()}
          onStartEdit={vi.fn()}
          onSaveEdit={vi.fn()}
          onCancelEdit={vi.fn()}
          onRestore={onRestore}
          onExport={vi.fn()}
          onDelete={vi.fn()}
          formatDate={mockFormatDate}
        />
      );

      fireEvent.click(screen.getByText('Replace'));
      expect(onRestore).toHaveBeenCalledWith(true);
    });

    it('calls onExport when Export button clicked', () => {
      const onExport = vi.fn();

      render(
        <SessionCard
          session={mockSession}
          isEditing={false}
          editName=""
          onEditNameChange={vi.fn()}
          onStartEdit={vi.fn()}
          onSaveEdit={vi.fn()}
          onCancelEdit={vi.fn()}
          onRestore={vi.fn()}
          onExport={onExport}
          onDelete={vi.fn()}
          formatDate={mockFormatDate}
        />
      );

      fireEvent.click(screen.getByText('Export'));
      expect(onExport).toHaveBeenCalled();
    });

    it('calls onDelete when Delete button clicked', () => {
      const onDelete = vi.fn();

      render(
        <SessionCard
          session={mockSession}
          isEditing={false}
          editName=""
          onEditNameChange={vi.fn()}
          onStartEdit={vi.fn()}
          onSaveEdit={vi.fn()}
          onCancelEdit={vi.fn()}
          onRestore={vi.fn()}
          onExport={vi.fn()}
          onDelete={onDelete}
          formatDate={mockFormatDate}
        />
      );

      fireEvent.click(screen.getByText('Delete'));
      expect(onDelete).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('renders without description', () => {
      const sessionWithoutDesc = { ...mockSession, description: undefined };

      render(
        <SessionCard
          session={sessionWithoutDesc}
          isEditing={false}
          editName=""
          onEditNameChange={vi.fn()}
          onStartEdit={vi.fn()}
          onSaveEdit={vi.fn()}
          onCancelEdit={vi.fn()}
          onRestore={vi.fn()}
          onExport={vi.fn()}
          onDelete={vi.fn()}
          formatDate={mockFormatDate}
        />
      );

      expect(screen.queryByText('Test description')).not.toBeInTheDocument();
    });

    it('renders without Jira tickets', () => {
      const sessionWithoutJira = { ...mockSession, jiraTickets: undefined };

      render(
        <SessionCard
          session={sessionWithoutJira}
          isEditing={false}
          editName=""
          onEditNameChange={vi.fn()}
          onStartEdit={vi.fn()}
          onSaveEdit={vi.fn()}
          onCancelEdit={vi.fn()}
          onRestore={vi.fn()}
          onExport={vi.fn()}
          onDelete={vi.fn()}
          formatDate={mockFormatDate}
        />
      );

      expect(screen.queryByText(/Jira tickets/)).not.toBeInTheDocument();
    });

    it('renders without categories', () => {
      const sessionWithoutCategories = { ...mockSession, categories: undefined };

      render(
        <SessionCard
          session={sessionWithoutCategories}
          isEditing={false}
          editName=""
          onEditNameChange={vi.fn()}
          onStartEdit={vi.fn()}
          onSaveEdit={vi.fn()}
          onCancelEdit={vi.fn()}
          onRestore={vi.fn()}
          onExport={vi.fn()}
          onDelete={vi.fn()}
          formatDate={mockFormatDate}
        />
      );

      expect(screen.queryByText('ENG')).not.toBeInTheDocument();
    });

    it('renders without preview', () => {
      const sessionWithoutPreview = { ...mockSession, preview: undefined };

      render(
        <SessionCard
          session={sessionWithoutPreview}
          isEditing={false}
          editName=""
          onEditNameChange={vi.fn()}
          onStartEdit={vi.fn()}
          onSaveEdit={vi.fn()}
          onCancelEdit={vi.fn()}
          onRestore={vi.fn()}
          onExport={vi.fn()}
          onDelete={vi.fn()}
          formatDate={mockFormatDate}
        />
      );

      expect(screen.queryByText('Tab 1, Tab 2, Tab 3')).not.toBeInTheDocument();
    });
  });
});

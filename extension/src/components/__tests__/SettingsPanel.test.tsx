import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SettingsPanel } from '../SettingsPanel';
import type { SummarySettings, JiraSettings } from '../../types';

describe('SettingsPanel', () => {
  const mockOnApiKeyChange = vi.fn();
  const mockOnSummarySettingsChange = vi.fn();
  const mockOnJiraSettingsChange = vi.fn();
  const mockOnSave = vi.fn();
  const mockOnClearCache = vi.fn();

  const defaultSummarySettings: SummarySettings = {
    enabled: true,
    cacheDuration: 24,
  };

  const defaultJiraSettings: JiraSettings = {
    smartMode: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render settings panel with all sections', () => {
      render(
        <SettingsPanel
          apiKey=""
          onApiKeyChange={mockOnApiKeyChange}
          summarySettings={defaultSummarySettings}
          onSummarySettingsChange={mockOnSummarySettingsChange}
          jiraSettings={defaultJiraSettings}
          onJiraSettingsChange={mockOnJiraSettingsChange}
          onSave={mockOnSave}
          onClearCache={mockOnClearCache}
        />
      );

      expect(screen.getByText('Settings')).toBeInTheDocument();
      expect(screen.getByText('API Configuration')).toBeInTheDocument();
      expect(screen.getByText('Summary Features')).toBeInTheDocument();
      expect(screen.getByText('Jira/Confluence Integration')).toBeInTheDocument();
    });

    it('should display API key input', () => {
      render(
        <SettingsPanel
          apiKey="sk-ant-test123"
          onApiKeyChange={mockOnApiKeyChange}
          summarySettings={defaultSummarySettings}
          onSummarySettingsChange={mockOnSummarySettingsChange}
          jiraSettings={defaultJiraSettings}
          onJiraSettingsChange={mockOnJiraSettingsChange}
          onSave={mockOnSave}
          onClearCache={mockOnClearCache}
        />
      );

      const apiInput = screen.getByPlaceholderText('sk-ant-...');
      expect(apiInput).toHaveValue('sk-ant-test123');
      expect(apiInput).toHaveAttribute('type', 'password');
    });

    it('should display Anthropic console link', () => {
      render(
        <SettingsPanel
          apiKey=""
          onApiKeyChange={mockOnApiKeyChange}
          summarySettings={defaultSummarySettings}
          onSummarySettingsChange={mockOnSummarySettingsChange}
          jiraSettings={defaultJiraSettings}
          onJiraSettingsChange={mockOnJiraSettingsChange}
          onSave={mockOnSave}
          onClearCache={mockOnClearCache}
        />
      );

      const link = screen.getByText('console.anthropic.com');
      expect(link).toHaveAttribute('href', 'https://console.anthropic.com');
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('should display summary settings', () => {
      render(
        <SettingsPanel
          apiKey=""
          onApiKeyChange={mockOnApiKeyChange}
          summarySettings={defaultSummarySettings}
          onSummarySettingsChange={mockOnSummarySettingsChange}
          jiraSettings={defaultJiraSettings}
          onJiraSettingsChange={mockOnJiraSettingsChange}
          onSave={mockOnSave}
          onClearCache={mockOnClearCache}
        />
      );

      expect(screen.getByText('Enable AI-powered tab and category summaries')).toBeInTheDocument();
      expect(screen.getByLabelText('Cache Duration (hours):')).toBeInTheDocument();
      expect(screen.getByText('Clear Summary Cache')).toBeInTheDocument();
    });

    it('should display Jira settings', () => {
      render(
        <SettingsPanel
          apiKey=""
          onApiKeyChange={mockOnApiKeyChange}
          summarySettings={defaultSummarySettings}
          onSummarySettingsChange={mockOnSummarySettingsChange}
          jiraSettings={defaultJiraSettings}
          onJiraSettingsChange={mockOnJiraSettingsChange}
          onSave={mockOnSave}
          onClearCache={mockOnClearCache}
        />
      );

      expect(screen.getByText('Enable Jira Mode')).toBeInTheDocument();
      expect(screen.getByText(/Groups Jira tickets by project/)).toBeInTheDocument();
    });
  });

  describe('API Key Management', () => {
    it('should call onApiKeyChange when API key input changes', () => {
      render(
        <SettingsPanel
          apiKey=""
          onApiKeyChange={mockOnApiKeyChange}
          summarySettings={defaultSummarySettings}
          onSummarySettingsChange={mockOnSummarySettingsChange}
          jiraSettings={defaultJiraSettings}
          onJiraSettingsChange={mockOnJiraSettingsChange}
          onSave={mockOnSave}
          onClearCache={mockOnClearCache}
        />
      );

      const apiInput = screen.getByPlaceholderText('sk-ant-...');
      fireEvent.change(apiInput, { target: { value: 'sk-ant-newkey' } });

      expect(mockOnApiKeyChange).toHaveBeenCalledWith('sk-ant-newkey');
    });
  });

  describe('Summary Settings', () => {
    it('should toggle summary enabled state', () => {
      render(
        <SettingsPanel
          apiKey=""
          onApiKeyChange={mockOnApiKeyChange}
          summarySettings={defaultSummarySettings}
          onSummarySettingsChange={mockOnSummarySettingsChange}
          jiraSettings={defaultJiraSettings}
          onJiraSettingsChange={mockOnJiraSettingsChange}
          onSave={mockOnSave}
          onClearCache={mockOnClearCache}
        />
      );

      const checkbox = screen.getByRole('checkbox', { name: /Enable AI-powered tab/ });
      expect(checkbox).toBeChecked();

      fireEvent.click(checkbox);

      expect(mockOnSummarySettingsChange).toHaveBeenCalledWith({
        ...defaultSummarySettings,
        enabled: false,
      });
    });

    it('should update cache duration', () => {
      render(
        <SettingsPanel
          apiKey=""
          onApiKeyChange={mockOnApiKeyChange}
          summarySettings={defaultSummarySettings}
          onSummarySettingsChange={mockOnSummarySettingsChange}
          jiraSettings={defaultJiraSettings}
          onJiraSettingsChange={mockOnJiraSettingsChange}
          onSave={mockOnSave}
          onClearCache={mockOnClearCache}
        />
      );

      const cacheInput = screen.getByLabelText('Cache Duration (hours):');
      fireEvent.change(cacheInput, { target: { value: '48' } });

      expect(mockOnSummarySettingsChange).toHaveBeenCalledWith({
        ...defaultSummarySettings,
        cacheDuration: 48,
      });
    });

    it('should handle invalid cache duration input', () => {
      render(
        <SettingsPanel
          apiKey=""
          onApiKeyChange={mockOnApiKeyChange}
          summarySettings={defaultSummarySettings}
          onSummarySettingsChange={mockOnSummarySettingsChange}
          jiraSettings={defaultJiraSettings}
          onJiraSettingsChange={mockOnJiraSettingsChange}
          onSave={mockOnSave}
          onClearCache={mockOnClearCache}
        />
      );

      const cacheInput = screen.getByLabelText('Cache Duration (hours):');
      fireEvent.change(cacheInput, { target: { value: 'invalid' } });

      expect(mockOnSummarySettingsChange).toHaveBeenCalledWith({
        ...defaultSummarySettings,
        cacheDuration: 24, // Fallback to 24
      });
    });

    it('should display cache duration in help text', () => {
      render(
        <SettingsPanel
          apiKey=""
          onApiKeyChange={mockOnApiKeyChange}
          summarySettings={{ enabled: true, cacheDuration: 72 }}
          onSummarySettingsChange={mockOnSummarySettingsChange}
          jiraSettings={defaultJiraSettings}
          onJiraSettingsChange={mockOnJiraSettingsChange}
          onSave={mockOnSave}
          onClearCache={mockOnClearCache}
        />
      );

      expect(
        screen.getByText('Summaries are cached for 72 hours to reduce API usage')
      ).toBeInTheDocument();
    });

    it('should call onClearCache when clear cache button clicked', () => {
      render(
        <SettingsPanel
          apiKey=""
          onApiKeyChange={mockOnApiKeyChange}
          summarySettings={defaultSummarySettings}
          onSummarySettingsChange={mockOnSummarySettingsChange}
          jiraSettings={defaultJiraSettings}
          onJiraSettingsChange={mockOnJiraSettingsChange}
          onSave={mockOnSave}
          onClearCache={mockOnClearCache}
        />
      );

      const clearButton = screen.getByText('Clear Summary Cache');
      fireEvent.click(clearButton);

      expect(mockOnClearCache).toHaveBeenCalledTimes(1);
    });

    it('should enforce min and max on cache duration input', () => {
      render(
        <SettingsPanel
          apiKey=""
          onApiKeyChange={mockOnApiKeyChange}
          summarySettings={defaultSummarySettings}
          onSummarySettingsChange={mockOnSummarySettingsChange}
          jiraSettings={defaultJiraSettings}
          onJiraSettingsChange={mockOnJiraSettingsChange}
          onSave={mockOnSave}
          onClearCache={mockOnClearCache}
        />
      );

      const cacheInput = screen.getByLabelText('Cache Duration (hours):') as HTMLInputElement;
      expect(cacheInput).toHaveAttribute('min', '1');
      expect(cacheInput).toHaveAttribute('max', '168');
    });
  });

  describe('Jira Settings', () => {
    it('should toggle Jira smart mode', () => {
      render(
        <SettingsPanel
          apiKey=""
          onApiKeyChange={mockOnApiKeyChange}
          summarySettings={defaultSummarySettings}
          onSummarySettingsChange={mockOnSummarySettingsChange}
          jiraSettings={defaultJiraSettings}
          onJiraSettingsChange={mockOnJiraSettingsChange}
          onSave={mockOnSave}
          onClearCache={mockOnClearCache}
        />
      );

      const checkbox = screen.getByRole('checkbox', { name: /Enable Jira Mode/ });
      expect(checkbox).not.toBeChecked();

      fireEvent.click(checkbox);

      expect(mockOnJiraSettingsChange).toHaveBeenCalledWith({
        ...defaultJiraSettings,
        smartMode: true,
      });
    });

    it('should display Jira mode when enabled', () => {
      render(
        <SettingsPanel
          apiKey=""
          onApiKeyChange={mockOnApiKeyChange}
          summarySettings={defaultSummarySettings}
          onSummarySettingsChange={mockOnSummarySettingsChange}
          jiraSettings={{ smartMode: true }}
          onJiraSettingsChange={mockOnJiraSettingsChange}
          onSave={mockOnSave}
          onClearCache={mockOnClearCache}
        />
      );

      const checkbox = screen.getByRole('checkbox', { name: /Enable Jira Mode/ });
      expect(checkbox).toBeChecked();
    });
  });

  describe('Save Functionality', () => {
    it('should call onSave when save button clicked', () => {
      render(
        <SettingsPanel
          apiKey="sk-ant-test"
          onApiKeyChange={mockOnApiKeyChange}
          summarySettings={defaultSummarySettings}
          onSummarySettingsChange={mockOnSummarySettingsChange}
          jiraSettings={defaultJiraSettings}
          onJiraSettingsChange={mockOnJiraSettingsChange}
          onSave={mockOnSave}
          onClearCache={mockOnClearCache}
        />
      );

      const saveButton = screen.getByText('Save Settings');
      fireEvent.click(saveButton);

      expect(mockOnSave).toHaveBeenCalledTimes(1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty API key', () => {
      render(
        <SettingsPanel
          apiKey=""
          onApiKeyChange={mockOnApiKeyChange}
          summarySettings={defaultSummarySettings}
          onSummarySettingsChange={mockOnSummarySettingsChange}
          jiraSettings={defaultJiraSettings}
          onJiraSettingsChange={mockOnJiraSettingsChange}
          onSave={mockOnSave}
          onClearCache={mockOnClearCache}
        />
      );

      const apiInput = screen.getByPlaceholderText('sk-ant-...');
      expect(apiInput).toHaveValue('');
    });

    it('should handle disabled summary settings', () => {
      render(
        <SettingsPanel
          apiKey=""
          onApiKeyChange={mockOnApiKeyChange}
          summarySettings={{ enabled: false, cacheDuration: 24 }}
          onSummarySettingsChange={mockOnSummarySettingsChange}
          jiraSettings={defaultJiraSettings}
          onJiraSettingsChange={mockOnJiraSettingsChange}
          onSave={mockOnSave}
          onClearCache={mockOnClearCache}
        />
      );

      const checkbox = screen.getByRole('checkbox', { name: /Enable AI-powered tab/ });
      expect(checkbox).not.toBeChecked();
    });

    it('should render with custom cache duration', () => {
      render(
        <SettingsPanel
          apiKey=""
          onApiKeyChange={mockOnApiKeyChange}
          summarySettings={{ enabled: true, cacheDuration: 168 }}
          onSummarySettingsChange={mockOnSummarySettingsChange}
          jiraSettings={defaultJiraSettings}
          onJiraSettingsChange={mockOnJiraSettingsChange}
          onSave={mockOnSave}
          onClearCache={mockOnClearCache}
        />
      );

      const cacheInput = screen.getByLabelText('Cache Duration (hours):') as HTMLInputElement;
      expect(cacheInput.value).toBe('168');
    });
  });
});

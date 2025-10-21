import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SettingsPanel } from '../SettingsPanel';
import type { SummarySettings, JiraSettings } from '../../types';
import type { ProviderSettings } from '../../utils/storage';
import { AIProvider } from '../../providers/base/types';

describe('SettingsPanel', () => {
  const mockOnApiKeyChange = vi.fn();
  const mockOnProviderSettingsChange = vi.fn();
  const mockOnSummarySettingsChange = vi.fn();
  const mockOnJiraSettingsChange = vi.fn();
  const mockOnSave = vi.fn();
  const mockOnClearCache = vi.fn();

  const defaultProviderSettings: ProviderSettings = {
    provider: AIProvider.ANTHROPIC,
    model: 'claude-3-5-sonnet-20241022',
  };

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
          providerSettings={defaultProviderSettings}
          onProviderSettingsChange={mockOnProviderSettingsChange}
          summarySettings={defaultSummarySettings}
          onSummarySettingsChange={mockOnSummarySettingsChange}
          jiraSettings={defaultJiraSettings}
          onJiraSettingsChange={mockOnJiraSettingsChange}
          onSave={mockOnSave}
          onClearCache={mockOnClearCache}
        />
      );

      expect(screen.getByText('Settings')).toBeInTheDocument();
      expect(screen.getByText('AI Provider Configuration')).toBeInTheDocument();
      expect(screen.getByText('Summary Features')).toBeInTheDocument();
      expect(screen.getByText('Jira/Confluence Integration')).toBeInTheDocument();
    });

    it('should display API key input', () => {
      render(
        <SettingsPanel
          apiKey="sk-ant-test123"
          onApiKeyChange={mockOnApiKeyChange}
          providerSettings={defaultProviderSettings}
          onProviderSettingsChange={mockOnProviderSettingsChange}
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
          providerSettings={defaultProviderSettings}
          onProviderSettingsChange={mockOnProviderSettingsChange}
          summarySettings={defaultSummarySettings}
          onSummarySettingsChange={mockOnSummarySettingsChange}
          jiraSettings={defaultJiraSettings}
          onJiraSettingsChange={mockOnJiraSettingsChange}
          onSave={mockOnSave}
          onClearCache={mockOnClearCache}
        />
      );

      const link = screen.getByText('https://console.anthropic.com');
      expect(link).toHaveAttribute('href', 'https://console.anthropic.com');
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('should display summary settings', () => {
      render(
        <SettingsPanel
          apiKey=""
          onApiKeyChange={mockOnApiKeyChange}
          providerSettings={defaultProviderSettings}
          onProviderSettingsChange={mockOnProviderSettingsChange}
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
          providerSettings={defaultProviderSettings}
          onProviderSettingsChange={mockOnProviderSettingsChange}
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
          providerSettings={defaultProviderSettings}
          onProviderSettingsChange={mockOnProviderSettingsChange}
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
          providerSettings={defaultProviderSettings}
          onProviderSettingsChange={mockOnProviderSettingsChange}
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
          providerSettings={defaultProviderSettings}
          onProviderSettingsChange={mockOnProviderSettingsChange}
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
          providerSettings={defaultProviderSettings}
          onProviderSettingsChange={mockOnProviderSettingsChange}
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
          providerSettings={defaultProviderSettings}
          onProviderSettingsChange={mockOnProviderSettingsChange}
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
          providerSettings={defaultProviderSettings}
          onProviderSettingsChange={mockOnProviderSettingsChange}
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
          providerSettings={defaultProviderSettings}
          onProviderSettingsChange={mockOnProviderSettingsChange}
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
          providerSettings={defaultProviderSettings}
          onProviderSettingsChange={mockOnProviderSettingsChange}
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
          providerSettings={defaultProviderSettings}
          onProviderSettingsChange={mockOnProviderSettingsChange}
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
          providerSettings={defaultProviderSettings}
          onProviderSettingsChange={mockOnProviderSettingsChange}
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

  describe('Provider Selection', () => {
    it('should render provider selection dropdown', () => {
      render(
        <SettingsPanel
          apiKey=""
          onApiKeyChange={mockOnApiKeyChange}
          providerSettings={defaultProviderSettings}
          onProviderSettingsChange={mockOnProviderSettingsChange}
          summarySettings={defaultSummarySettings}
          onSummarySettingsChange={mockOnSummarySettingsChange}
          jiraSettings={defaultJiraSettings}
          onJiraSettingsChange={mockOnJiraSettingsChange}
          onSave={mockOnSave}
          onClearCache={mockOnClearCache}
        />
      );

      const providerSelect = screen.getByLabelText('AI Provider:');
      expect(providerSelect).toBeInTheDocument();
      expect(providerSelect).toHaveValue(AIProvider.ANTHROPIC);
    });

    it('should call onProviderSettingsChange when provider changes', () => {
      render(
        <SettingsPanel
          apiKey=""
          onApiKeyChange={mockOnApiKeyChange}
          providerSettings={defaultProviderSettings}
          onProviderSettingsChange={mockOnProviderSettingsChange}
          summarySettings={defaultSummarySettings}
          onSummarySettingsChange={mockOnSummarySettingsChange}
          jiraSettings={defaultJiraSettings}
          onJiraSettingsChange={mockOnJiraSettingsChange}
          onSave={mockOnSave}
          onClearCache={mockOnClearCache}
        />
      );

      const providerSelect = screen.getByLabelText('AI Provider:');
      fireEvent.change(providerSelect, { target: { value: AIProvider.OPENAI } });

      expect(mockOnProviderSettingsChange).toHaveBeenCalledWith({
        provider: AIProvider.OPENAI,
        model: 'gpt-4o', // First model for OpenAI
      });
    });

    it('should change to Google provider and default to Gemini model', () => {
      render(
        <SettingsPanel
          apiKey=""
          onApiKeyChange={mockOnApiKeyChange}
          providerSettings={defaultProviderSettings}
          onProviderSettingsChange={mockOnProviderSettingsChange}
          summarySettings={defaultSummarySettings}
          onSummarySettingsChange={mockOnSummarySettingsChange}
          jiraSettings={defaultJiraSettings}
          onJiraSettingsChange={mockOnJiraSettingsChange}
          onSave={mockOnSave}
          onClearCache={mockOnClearCache}
        />
      );

      const providerSelect = screen.getByLabelText('AI Provider:');
      fireEvent.change(providerSelect, { target: { value: AIProvider.GOOGLE } });

      expect(mockOnProviderSettingsChange).toHaveBeenCalledWith({
        provider: AIProvider.GOOGLE,
        model: 'gemini-2.0-flash-exp', // First model for Google
      });
    });

    it('should display all provider options', () => {
      render(
        <SettingsPanel
          apiKey=""
          onApiKeyChange={mockOnApiKeyChange}
          providerSettings={defaultProviderSettings}
          onProviderSettingsChange={mockOnProviderSettingsChange}
          summarySettings={defaultSummarySettings}
          onSummarySettingsChange={mockOnSummarySettingsChange}
          jiraSettings={defaultJiraSettings}
          onJiraSettingsChange={mockOnJiraSettingsChange}
          onSave={mockOnSave}
          onClearCache={mockOnClearCache}
        />
      );

      expect(screen.getByText('Anthropic Claude')).toBeInTheDocument();
      expect(screen.getByText('OpenAI GPT')).toBeInTheDocument();
      expect(screen.getByText('Google Gemini')).toBeInTheDocument();
    });
  });

  describe('Model Selection', () => {
    it('should render model selection dropdown', () => {
      render(
        <SettingsPanel
          apiKey=""
          onApiKeyChange={mockOnApiKeyChange}
          providerSettings={defaultProviderSettings}
          onProviderSettingsChange={mockOnProviderSettingsChange}
          summarySettings={defaultSummarySettings}
          onSummarySettingsChange={mockOnSummarySettingsChange}
          jiraSettings={defaultJiraSettings}
          onJiraSettingsChange={mockOnJiraSettingsChange}
          onSave={mockOnSave}
          onClearCache={mockOnClearCache}
        />
      );

      const modelSelect = screen.getByLabelText('Model:');
      expect(modelSelect).toBeInTheDocument();
      expect(modelSelect).toHaveValue('claude-3-5-sonnet-20241022');
    });

    it('should call onProviderSettingsChange when model changes', () => {
      render(
        <SettingsPanel
          apiKey=""
          onApiKeyChange={mockOnApiKeyChange}
          providerSettings={defaultProviderSettings}
          onProviderSettingsChange={mockOnProviderSettingsChange}
          summarySettings={defaultSummarySettings}
          onSummarySettingsChange={mockOnSummarySettingsChange}
          jiraSettings={defaultJiraSettings}
          onJiraSettingsChange={mockOnJiraSettingsChange}
          onSave={mockOnSave}
          onClearCache={mockOnClearCache}
        />
      );

      const modelSelect = screen.getByLabelText('Model:');
      fireEvent.change(modelSelect, { target: { value: 'claude-3-5-haiku-20241022' } });

      expect(mockOnProviderSettingsChange).toHaveBeenCalledWith({
        provider: AIProvider.ANTHROPIC,
        model: 'claude-3-5-haiku-20241022',
      });
    });

    it('should display correct models for OpenAI provider', () => {
      render(
        <SettingsPanel
          apiKey=""
          onApiKeyChange={mockOnApiKeyChange}
          providerSettings={{ provider: AIProvider.OPENAI, model: 'gpt-4o' }}
          onProviderSettingsChange={mockOnProviderSettingsChange}
          summarySettings={defaultSummarySettings}
          onSummarySettingsChange={mockOnSummarySettingsChange}
          jiraSettings={defaultJiraSettings}
          onJiraSettingsChange={mockOnJiraSettingsChange}
          onSave={mockOnSave}
          onClearCache={mockOnClearCache}
        />
      );

      expect(screen.getByText(/GPT-4o \(Recommended\)/)).toBeInTheDocument();
      expect(screen.getByText(/GPT-4o Mini/)).toBeInTheDocument();
    });

    it('should display correct model for Google provider', () => {
      render(
        <SettingsPanel
          apiKey=""
          onApiKeyChange={mockOnApiKeyChange}
          providerSettings={{
            provider: AIProvider.GOOGLE,
            model: 'gemini-2.0-flash-exp',
          }}
          onProviderSettingsChange={mockOnProviderSettingsChange}
          summarySettings={defaultSummarySettings}
          onSummarySettingsChange={mockOnSummarySettingsChange}
          jiraSettings={defaultJiraSettings}
          onJiraSettingsChange={mockOnJiraSettingsChange}
          onSave={mockOnSave}
          onClearCache={mockOnClearCache}
        />
      );

      expect(screen.getByText(/Gemini 2.0 Flash/)).toBeInTheDocument();
    });
  });

  describe('API Key Validation', () => {
    it('should show error for invalid Anthropic API key format', () => {
      render(
        <SettingsPanel
          apiKey="invalid-key"
          onApiKeyChange={mockOnApiKeyChange}
          providerSettings={defaultProviderSettings}
          onProviderSettingsChange={mockOnProviderSettingsChange}
          summarySettings={defaultSummarySettings}
          onSummarySettingsChange={mockOnSummarySettingsChange}
          jiraSettings={defaultJiraSettings}
          onJiraSettingsChange={mockOnJiraSettingsChange}
          onSave={mockOnSave}
          onClearCache={mockOnClearCache}
        />
      );

      const apiInput = screen.getByPlaceholderText('sk-ant-...');
      expect(apiInput).toHaveClass('invalid');
      expect(apiInput).toHaveAttribute('aria-invalid', 'true');
      expect(screen.getByText(/Invalid API key format/)).toBeInTheDocument();
    });

    it('should not show error for valid Anthropic API key format', () => {
      render(
        <SettingsPanel
          apiKey="sk-ant-valid123"
          onApiKeyChange={mockOnApiKeyChange}
          providerSettings={defaultProviderSettings}
          onProviderSettingsChange={mockOnProviderSettingsChange}
          summarySettings={defaultSummarySettings}
          onSummarySettingsChange={mockOnSummarySettingsChange}
          jiraSettings={defaultJiraSettings}
          onJiraSettingsChange={mockOnJiraSettingsChange}
          onSave={mockOnSave}
          onClearCache={mockOnClearCache}
        />
      );

      const apiInput = screen.getByPlaceholderText('sk-ant-...');
      expect(apiInput).not.toHaveClass('invalid');
      expect(apiInput).toHaveAttribute('aria-invalid', 'false');
      expect(screen.queryByText(/Invalid API key format/)).not.toBeInTheDocument();
    });

    it('should validate OpenAI API key format', () => {
      render(
        <SettingsPanel
          apiKey="sk-test123"
          onApiKeyChange={mockOnApiKeyChange}
          providerSettings={{ provider: AIProvider.OPENAI, model: 'gpt-4o' }}
          onProviderSettingsChange={mockOnProviderSettingsChange}
          summarySettings={defaultSummarySettings}
          onSummarySettingsChange={mockOnSummarySettingsChange}
          jiraSettings={defaultJiraSettings}
          onJiraSettingsChange={mockOnJiraSettingsChange}
          onSave={mockOnSave}
          onClearCache={mockOnClearCache}
        />
      );

      const apiInput = screen.getByPlaceholderText('sk-proj-...');
      expect(apiInput).not.toHaveClass('invalid');
    });

    it('should show error for invalid OpenAI API key format', () => {
      render(
        <SettingsPanel
          apiKey="invalid-key"
          onApiKeyChange={mockOnApiKeyChange}
          providerSettings={{ provider: AIProvider.OPENAI, model: 'gpt-4o' }}
          onProviderSettingsChange={mockOnProviderSettingsChange}
          summarySettings={defaultSummarySettings}
          onSummarySettingsChange={mockOnSummarySettingsChange}
          jiraSettings={defaultJiraSettings}
          onJiraSettingsChange={mockOnJiraSettingsChange}
          onSave={mockOnSave}
          onClearCache={mockOnClearCache}
        />
      );

      const apiInput = screen.getByPlaceholderText('sk-proj-...');
      expect(apiInput).toHaveClass('invalid');
      expect(screen.getByText(/Invalid API key format/)).toBeInTheDocument();
    });

    it('should validate Google API key format', () => {
      render(
        <SettingsPanel
          apiKey="AIzaTest123"
          onApiKeyChange={mockOnApiKeyChange}
          providerSettings={{
            provider: AIProvider.GOOGLE,
            model: 'gemini-2.0-flash-exp',
          }}
          onProviderSettingsChange={mockOnProviderSettingsChange}
          summarySettings={defaultSummarySettings}
          onSummarySettingsChange={mockOnSummarySettingsChange}
          jiraSettings={defaultJiraSettings}
          onJiraSettingsChange={mockOnJiraSettingsChange}
          onSave={mockOnSave}
          onClearCache={mockOnClearCache}
        />
      );

      const apiInput = screen.getByPlaceholderText('AIza...');
      expect(apiInput).not.toHaveClass('invalid');
    });

    it('should show error for invalid Google API key format', () => {
      render(
        <SettingsPanel
          apiKey="invalid-key"
          onApiKeyChange={mockOnApiKeyChange}
          providerSettings={{
            provider: AIProvider.GOOGLE,
            model: 'gemini-2.0-flash-exp',
          }}
          onProviderSettingsChange={mockOnProviderSettingsChange}
          summarySettings={defaultSummarySettings}
          onSummarySettingsChange={mockOnSummarySettingsChange}
          jiraSettings={defaultJiraSettings}
          onJiraSettingsChange={mockOnJiraSettingsChange}
          onSave={mockOnSave}
          onClearCache={mockOnClearCache}
        />
      );

      const apiInput = screen.getByPlaceholderText('AIza...');
      expect(apiInput).toHaveClass('invalid');
      expect(screen.getByText(/Invalid API key format/)).toBeInTheDocument();
    });

    it('should not show error for empty API key', () => {
      render(
        <SettingsPanel
          apiKey=""
          onApiKeyChange={mockOnApiKeyChange}
          providerSettings={defaultProviderSettings}
          onProviderSettingsChange={mockOnProviderSettingsChange}
          summarySettings={defaultSummarySettings}
          onSummarySettingsChange={mockOnSummarySettingsChange}
          jiraSettings={defaultJiraSettings}
          onJiraSettingsChange={mockOnJiraSettingsChange}
          onSave={mockOnSave}
          onClearCache={mockOnClearCache}
        />
      );

      const apiInput = screen.getByPlaceholderText('sk-ant-...');
      expect(apiInput).not.toHaveClass('invalid');
      expect(screen.queryByText(/Invalid API key format/)).not.toBeInTheDocument();
    });
  });

  describe('Provider-Specific UI', () => {
    it('should display Anthropic description and console URL', () => {
      render(
        <SettingsPanel
          apiKey=""
          onApiKeyChange={mockOnApiKeyChange}
          providerSettings={defaultProviderSettings}
          onProviderSettingsChange={mockOnProviderSettingsChange}
          summarySettings={defaultSummarySettings}
          onSummarySettingsChange={mockOnSummarySettingsChange}
          jiraSettings={defaultJiraSettings}
          onJiraSettingsChange={mockOnJiraSettingsChange}
          onSave={mockOnSave}
          onClearCache={mockOnClearCache}
        />
      );

      expect(screen.getByText(/Claude 3.5 Sonnet excels at complex reasoning/)).toBeInTheDocument();
      expect(screen.getByText('https://console.anthropic.com')).toBeInTheDocument();
    });

    it('should display OpenAI description and console URL', () => {
      render(
        <SettingsPanel
          apiKey=""
          onApiKeyChange={mockOnApiKeyChange}
          providerSettings={{ provider: AIProvider.OPENAI, model: 'gpt-4o' }}
          onProviderSettingsChange={mockOnProviderSettingsChange}
          summarySettings={defaultSummarySettings}
          onSummarySettingsChange={mockOnSummarySettingsChange}
          jiraSettings={defaultJiraSettings}
          onJiraSettingsChange={mockOnJiraSettingsChange}
          onSave={mockOnSave}
          onClearCache={mockOnClearCache}
        />
      );

      expect(
        screen.getByText(/GPT-4o offers strong performance with multimodal capabilities/)
      ).toBeInTheDocument();
      expect(screen.getByText('https://platform.openai.com/api-keys')).toBeInTheDocument();
    });

    it('should display Google description and console URL', () => {
      render(
        <SettingsPanel
          apiKey=""
          onApiKeyChange={mockOnApiKeyChange}
          providerSettings={{
            provider: AIProvider.GOOGLE,
            model: 'gemini-2.0-flash-exp',
          }}
          onProviderSettingsChange={mockOnProviderSettingsChange}
          summarySettings={defaultSummarySettings}
          onSummarySettingsChange={mockOnSummarySettingsChange}
          jiraSettings={defaultJiraSettings}
          onJiraSettingsChange={mockOnJiraSettingsChange}
          onSave={mockOnSave}
          onClearCache={mockOnClearCache}
        />
      );

      expect(
        screen.getByText(/Gemini 1.5 Pro features a massive 1M token context window/)
      ).toBeInTheDocument();
      expect(screen.getByText('https://aistudio.google.com/apikey')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty API key', () => {
      render(
        <SettingsPanel
          apiKey=""
          onApiKeyChange={mockOnApiKeyChange}
          providerSettings={defaultProviderSettings}
          onProviderSettingsChange={mockOnProviderSettingsChange}
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
          providerSettings={defaultProviderSettings}
          onProviderSettingsChange={mockOnProviderSettingsChange}
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
          providerSettings={defaultProviderSettings}
          onProviderSettingsChange={mockOnProviderSettingsChange}
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

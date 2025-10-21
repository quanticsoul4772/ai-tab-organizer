import type { SummarySettings, JiraSettings } from '../types';
import type { ProviderSettings } from '../utils/storage';
import { AIProvider } from '../providers/base/types';
import {
  getProviderOptions,
  getModelsForProvider,
  PROVIDER_INFO,
  validateApiKey,
} from '../constants/providers';

interface SettingsPanelProps {
  apiKey: string;
  onApiKeyChange: (key: string) => void;
  providerSettings: ProviderSettings;
  onProviderSettingsChange: (settings: ProviderSettings) => void;
  summarySettings: SummarySettings;
  onSummarySettingsChange: (settings: SummarySettings) => void;
  jiraSettings: JiraSettings;
  onJiraSettingsChange: (settings: JiraSettings) => void;
  onSave: () => void;
  onClearCache: () => void;
}

/**
 * Settings panel component for API key and summary configuration
 */
export function SettingsPanel({
  apiKey,
  onApiKeyChange,
  providerSettings,
  onProviderSettingsChange,
  summarySettings,
  onSummarySettingsChange,
  jiraSettings,
  onJiraSettingsChange,
  onSave,
  onClearCache,
}: SettingsPanelProps) {
  const providerInfo = PROVIDER_INFO[providerSettings.provider];
  const modelOptions = getModelsForProvider(providerSettings.provider);

  const handleProviderChange = (newProvider: AIProvider) => {
    // When provider changes, reset to the first available model for that provider
    const newModels = getModelsForProvider(newProvider);
    onProviderSettingsChange({
      provider: newProvider,
      model: newModels[0]?.value || '',
    });
  };

  const handleModelChange = (newModel: string) => {
    onProviderSettingsChange({
      ...providerSettings,
      model: newModel,
    });
  };

  // Validate API key format for current provider
  const isValidApiKeyFormat = apiKey ? validateApiKey(providerSettings.provider, apiKey) : true;

  return (
    <div className="settings">
      <h2>Settings</h2>

      <div className="settings-section">
        <h3>AI Provider Configuration</h3>

        <div className="settings-field">
          <label htmlFor="provider">AI Provider:</label>
          <select
            id="provider"
            value={providerSettings.provider}
            onChange={(e) => handleProviderChange(e.target.value as AIProvider)}
            className="settings-select"
          >
            {getProviderOptions().map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <p className="settings-help">{providerInfo.description}</p>
        </div>

        <div className="settings-field">
          <label htmlFor="model">Model:</label>
          <select
            id="model"
            value={providerSettings.model}
            onChange={(e) => handleModelChange(e.target.value)}
            className="settings-select"
          >
            {modelOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="settings-field">
          <label htmlFor="apiKey">API Key:</label>
          <input
            id="apiKey"
            type="password"
            value={apiKey}
            onChange={(e) => onApiKeyChange(e.target.value)}
            placeholder={providerInfo.apiKeyPlaceholder}
            className={`api-input ${!isValidApiKeyFormat ? 'invalid' : ''}`}
            aria-invalid={!isValidApiKeyFormat}
          />
          {!isValidApiKeyFormat && (
            <p className="error-message">
              Invalid API key format for {providerInfo.name}. Expected format:{' '}
              {providerInfo.apiKeyPlaceholder}
            </p>
          )}
          <p className="help">
            Get your API key from{' '}
            <a href={providerInfo.consoleUrl} target="_blank" rel="noopener noreferrer">
              {providerInfo.consoleUrl}
            </a>
          </p>
        </div>
      </div>

      <div className="settings-section">
        <h3>Summary Features</h3>
        <label className="settings-toggle">
          <input
            type="checkbox"
            checked={summarySettings.enabled}
            onChange={(e) =>
              onSummarySettingsChange({ ...summarySettings, enabled: e.target.checked })
            }
          />
          <span>Enable AI-powered tab and category summaries</span>
        </label>

        <div className="settings-field">
          <label htmlFor="cacheDuration">Cache Duration (hours):</label>
          <input
            id="cacheDuration"
            type="number"
            min="1"
            max="168"
            value={summarySettings.cacheDuration}
            onChange={(e) =>
              onSummarySettingsChange({
                ...summarySettings,
                cacheDuration: parseInt(e.target.value) || 24,
              })
            }
            className="settings-number-input"
          />
          <p className="settings-help">
            Summaries are cached for {summarySettings.cacheDuration} hours to reduce API usage
          </p>
        </div>

        <button onClick={onClearCache} className="clear-cache-btn">
          Clear Summary Cache
        </button>
      </div>

      <div className="settings-section">
        <h3>Jira/Confluence Integration</h3>
        <label className="settings-toggle">
          <input
            type="checkbox"
            checked={jiraSettings.smartMode}
            onChange={(e) => onJiraSettingsChange({ ...jiraSettings, smartMode: e.target.checked })}
          />
          <span>Enable Jira Mode</span>
        </label>
        <p className="settings-help">
          Groups Jira tickets by project and Confluence pages by space. Search supports ticket
          patterns like "ENG-123" or "eng 123". Works with Atlassian Cloud, Server, and Data Center.
        </p>
      </div>

      <button onClick={onSave} className="save-btn">
        Save Settings
      </button>
    </div>
  );
}

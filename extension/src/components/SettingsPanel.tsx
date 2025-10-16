import React from 'react';
import type { SummarySettings, JiraSettings } from '../types';

interface SettingsPanelProps {
  apiKey: string;
  onApiKeyChange: (key: string) => void;
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
  summarySettings,
  onSummarySettingsChange,
  jiraSettings,
  onJiraSettingsChange,
  onSave,
  onClearCache,
}: SettingsPanelProps) {
  return (
    <div className="settings">
      <h2>Settings</h2>

      <div className="settings-section">
        <h3>API Configuration</h3>
        <p>Enter your Claude API key to enable AI categorization:</p>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => onApiKeyChange(e.target.value)}
          placeholder="sk-ant-..."
          className="api-input"
        />
        <p className="help">
          Get your API key from{' '}
          <a href="https://console.anthropic.com" target="_blank" rel="noopener noreferrer">
            console.anthropic.com
          </a>
        </p>
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
            onChange={(e) =>
              onJiraSettingsChange({ ...jiraSettings, smartMode: e.target.checked })
            }
          />
          <span>Enable Jira Mode</span>
        </label>
        <p className="settings-help">
          Groups Jira tickets by project and Confluence pages by space.
          Search supports ticket patterns like "ENG-123" or "eng 123".
          Works with Atlassian Cloud, Server, and Data Center.
        </p>
      </div>

      <button onClick={onSave} className="save-btn">
        Save Settings
      </button>
    </div>
  );
}

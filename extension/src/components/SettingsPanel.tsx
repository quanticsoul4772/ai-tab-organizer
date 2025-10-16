import React from 'react';

interface SettingsPanelProps {
  apiKey: string;
  onApiKeyChange: (key: string) => void;
  onSave: () => void;
}

/**
 * Settings panel component for API key configuration
 */
export function SettingsPanel({ apiKey, onApiKeyChange, onSave }: SettingsPanelProps) {
  return (
    <div className="settings">
      <h2>⚙️ Settings</h2>
      <p>Enter your Claude API key to enable AI categorization:</p>
      <input
        type="password"
        value={apiKey}
        onChange={(e) => onApiKeyChange(e.target.value)}
        placeholder="sk-ant-..."
        className="api-input"
      />
      <button onClick={onSave} className="save-btn">
        Save & Categorize
      </button>
      <p className="help">
        Get your API key from{' '}
        <a href="https://console.anthropic.com" target="_blank" rel="noopener noreferrer">
          console.anthropic.com
        </a>
      </p>
    </div>
  );
}

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { storage } from '../core/browserApi';

export interface SummarySettings {
  enabled: boolean;
  cacheEnabled: boolean;
  cacheTTL: number;
}

export interface JiraSettings {
  smartModeEnabled: boolean;
}

interface SettingsContextType {
  apiKey: string;
  setApiKey: (key: string) => void;
  summarySettings: SummarySettings;
  setSummarySettings: (settings: SummarySettings) => void;
  jiraSettings: JiraSettings;
  setJiraSettings: (settings: JiraSettings) => void;
  saveSettings: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

interface SettingsProviderProps {
  children: ReactNode;
}

const DEFAULT_SUMMARY_SETTINGS: SummarySettings = {
  enabled: true,
  cacheEnabled: true,
  cacheTTL: 3600000,
};

const DEFAULT_JIRA_SETTINGS: JiraSettings = {
  smartModeEnabled: false,
};

export function SettingsProvider({ children }: SettingsProviderProps) {
  const [apiKey, setApiKey] = useState<string>('');
  const [summarySettings, setSummarySettings] = useState<SummarySettings>(DEFAULT_SUMMARY_SETTINGS);
  const [jiraSettings, setJiraSettings] = useState<JiraSettings>(DEFAULT_JIRA_SETTINGS);

  useEffect(() => {
    const loadSettings = async () => {
      const [loadedApiKey, loadedSummarySettings, loadedJiraSettings] = await Promise.all([
        storage.get<string>('apiKey', ''),
        storage.get<SummarySettings>('summarySettings', DEFAULT_SUMMARY_SETTINGS),
        storage.get<JiraSettings>('jiraSettings', DEFAULT_JIRA_SETTINGS),
      ]);

      setApiKey(loadedApiKey);
      setSummarySettings(loadedSummarySettings);
      setJiraSettings(loadedJiraSettings);
    };

    loadSettings();
  }, []);

  const saveSettings = async () => {
    await Promise.all([
      storage.set('apiKey', apiKey),
      storage.set('summarySettings', summarySettings),
      storage.set('jiraSettings', jiraSettings),
    ]);
  };

  return (
    <SettingsContext.Provider
      value={{
        apiKey,
        setApiKey,
        summarySettings,
        setSummarySettings,
        jiraSettings,
        setJiraSettings,
        saveSettings,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within SettingsProvider');
  }
  return context;
}

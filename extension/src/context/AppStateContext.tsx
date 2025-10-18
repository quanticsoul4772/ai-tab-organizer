import { createContext, useContext, useState, ReactNode } from 'react';

export type ViewType = 'categories' | 'search' | 'jira' | 'duplicates' | 'sessions';

interface AppStateContextType {
  loading: boolean;
  setLoading: (loading: boolean) => void;
  error: string | null;
  setError: (error: string | null) => void;
  activeView: ViewType;
  setActiveView: (view: ViewType) => void;
  showSettings: boolean;
  setShowSettings: (show: boolean) => void;
}

const AppStateContext = createContext<AppStateContextType | undefined>(undefined);

interface AppStateProviderProps {
  children: ReactNode;
}

export function AppStateProvider({ children }: AppStateProviderProps) {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<ViewType>('categories');
  const [showSettings, setShowSettings] = useState<boolean>(false);

  return (
    <AppStateContext.Provider
      value={{
        loading,
        setLoading,
        error,
        setError,
        activeView,
        setActiveView,
        showSettings,
        setShowSettings,
      }}
    >
      {children}
    </AppStateContext.Provider>
  );
}

export function useAppState() {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error('useAppState must be used within AppStateProvider');
  }
  return context;
}

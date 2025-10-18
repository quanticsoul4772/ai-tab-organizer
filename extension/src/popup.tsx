import React, { lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import './popup.css';

import { DensityProvider } from './context/DensityContext';
import { SettingsProvider } from './context/SettingsContext';
import { AppStateProvider } from './context/AppStateContext';
import { usePopupState } from './hooks/usePopupState';
import { SettingsPanel } from './components/SettingsPanel';
import { CategoryView } from './components/features/categories/CategoryView';
import { ErrorBoundary } from './components/ErrorBoundary';
import { PopupHeader } from './components/layout/PopupHeader';
import { PopupNavigation } from './components/layout/PopupNavigation';
import './components/TabSearch.css';
import './components/DuplicateDetection.css';
import './components/JiraView.css';

// Lazy load heavy components
const TabSearch = lazy(() => import('./components/features/search/TabSearch'));
const DuplicateDetection = lazy(() => import('./components/features/duplicates/DuplicateDetection'));
const JiraView = lazy(() => import('./components/features/jira/JiraView'));
const SessionsView = lazy(() => import('./components/features/sessions/SessionsView'));

function Popup() {
  const {
    tabs,
    categorized,
    loading,
    apiKey,
    activeView,
    showSettings,
    error,
    summarySettings,
    jiraSettings,
    densityMode,
    setApiKey,
    setActiveView,
    setShowSettings,
    setError,
    setSummarySettings,
    setJiraSettings,
    handleDensityChange,
    saveSettings,
    handleClearCache,
    handleTabClick,
    handleTabClose,
    handleTabSummaryRequest,
    handleCategorySummaryRequest,
  } = usePopupState();

  // Render settings panel if shown
  if (showSettings) {
    return (
      <SettingsPanel
        apiKey={apiKey}
        onApiKeyChange={setApiKey}
        summarySettings={summarySettings}
        onSummarySettingsChange={setSummarySettings}
        jiraSettings={jiraSettings}
        onJiraSettingsChange={setJiraSettings}
        onSave={saveSettings}
        onClearCache={handleClearCache}
      />
    );
  }

  // Render loading state
  if (loading) {
    return <div className="loading">AI is organizing your tabs...</div>;
  }

  // Render main popup with navigation
  return (
    <div className="popup">
      <PopupHeader onShowSettings={() => setShowSettings(true)} />

      <PopupNavigation
        activeView={activeView as any}
        onViewChange={setActiveView as any}
      />

      {activeView === 'categories' && (
        <ErrorBoundary fallback={<div className="error">Failed to load categories view. Try refreshing.</div>}>
          <>
            <div className="stats">{tabs.length} tabs open</div>
            {error && <div className="error">{error}</div>}
            <CategoryView
              categorizedTabs={categorized}
              onTabClick={handleTabClick}
              onTabClose={handleTabClose}
              onTabSummaryRequest={handleTabSummaryRequest}
              onCategorySummaryRequest={handleCategorySummaryRequest}
              summariesEnabled={summarySettings.enabled}
            />
          </>
        </ErrorBoundary>
      )}

      {activeView === 'search' && (
        <ErrorBoundary fallback={<div className="error">Search failed to load. Try refreshing.</div>}>
          <Suspense fallback={<div className="loading">Loading search...</div>}>
            <TabSearch />
          </Suspense>
        </ErrorBoundary>
      )}

      {activeView === 'jira' && (
        <ErrorBoundary fallback={<div className="error">Jira view failed to load. Try refreshing.</div>}>
          <Suspense fallback={<div className="loading">Loading Jira view...</div>}>
            <JiraView />
          </Suspense>
        </ErrorBoundary>
      )}

      {activeView === 'duplicates' && (
        <ErrorBoundary fallback={<div className="error">Duplicate detection failed to load. Try refreshing.</div>}>
          <Suspense fallback={<div className="loading">Loading duplicate detection...</div>}>
            <DuplicateDetection />
          </Suspense>
        </ErrorBoundary>
      )}

      {activeView === 'sessions' && (
        <ErrorBoundary fallback={<div className="error">Sessions view failed to load. Try refreshing.</div>}>
          <Suspense fallback={<div className="loading">Loading sessions...</div>}>
            <SessionsView onError={setError} />
          </Suspense>
        </ErrorBoundary>
      )}
    </div>
  );
}

const root = createRoot(document.getElementById('root')!);
root.render(
  <SettingsProvider>
    <AppStateProvider>
      <DensityProvider>
        <Popup />
      </DensityProvider>
    </AppStateProvider>
  </SettingsProvider>
);

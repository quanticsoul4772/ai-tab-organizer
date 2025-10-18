import React from 'react';
import { useSessionManagement } from '../../../hooks/useSessionManagement';
import { SessionsHeader } from '../../sessions/SessionsHeader';
import { WorkspaceFilter } from '../../sessions/WorkspaceFilter';
import { SaveSessionDialog } from '../../sessions/SaveSessionDialog';
import { ImportSessionDialog } from '../../sessions/ImportSessionDialog';
import { SessionCard } from '../../sessions/SessionCard';

interface SessionsViewProps {
  onError: (error: string) => void;
}

export function SessionsView({ onError }: SessionsViewProps) {
  const {
    sessions,
    workspaces,
    selectedWorkspace,
    isLoading,
    showSaveDialog,
    newSessionName,
    newSessionDescription,
    isSaving,
    editingSessionId,
    editName,
    showImportDialog,
    importData,
    isImporting,
    setSelectedWorkspace,
    setShowSaveDialog,
    setNewSessionName,
    setNewSessionDescription,
    setEditingSessionId,
    setEditName,
    setShowImportDialog,
    setImportData,
    handleSaveSession,
    handleRestoreSession,
    handleDeleteSession,
    handleRenameSession,
    handleExportSession,
    handleExportAll,
    handleImport,
    handleImportFile,
    formatDate,
    allSessions,
  } = useSessionManagement({ onError });

  if (isLoading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: '#9ca3af' }}>
        Loading sessions...
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <SessionsHeader
        sessionsCount={sessions.length}
        onSave={() => setShowSaveDialog(true)}
        onImport={handleImportFile}
        onExportAll={handleExportAll}
      />

      <WorkspaceFilter
        workspaces={workspaces}
        selectedWorkspace={selectedWorkspace}
        allSessions={allSessions}
        onSelectWorkspace={setSelectedWorkspace}
      />

      <ImportSessionDialog
        show={showImportDialog}
        importData={importData}
        isImporting={isImporting}
        onDataChange={setImportData}
        onImport={handleImport}
        onCancel={() => {
          setShowImportDialog(false);
          setImportData('');
        }}
      />

      <SaveSessionDialog
        show={showSaveDialog}
        sessionName={newSessionName}
        sessionDescription={newSessionDescription}
        isSaving={isSaving}
        onNameChange={setNewSessionName}
        onDescriptionChange={setNewSessionDescription}
        onSave={handleSaveSession}
        onCancel={() => {
          setShowSaveDialog(false);
          setNewSessionName('');
          setNewSessionDescription('');
        }}
      />

      {/* Sessions List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        {sessions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#9ca3af' }}>
            <p style={{ fontSize: '14px', marginBottom: '8px' }}>No sessions saved yet</p>
            <p style={{ fontSize: '12px' }}>Click "Save Current" to save your open tabs</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {sessions.map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                isEditing={editingSessionId === session.id}
                editName={editName}
                onEditNameChange={setEditName}
                onStartEdit={() => {
                  setEditingSessionId(session.id);
                  setEditName(session.name);
                }}
                onSaveEdit={() => handleRenameSession(session.id)}
                onCancelEdit={() => {
                  setEditingSessionId(null);
                  setEditName('');
                }}
                onRestore={(closeExisting) => handleRestoreSession(session.id, closeExisting)}
                onExport={() => handleExportSession(session.id, session.name)}
                onDelete={() => handleDeleteSession(session.id, session.name)}
                formatDate={formatDate}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default SessionsView;

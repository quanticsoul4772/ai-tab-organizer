import React, { useState, useEffect } from 'react';
import type { SessionListItem } from '../types/session';
import { sessionManager } from '../services/sessionManager';

interface SessionsViewProps {
  onError: (error: string) => void;
}

export function SessionsView({ onError }: SessionsViewProps) {
  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const [allSessions, setAllSessions] = useState<SessionListItem[]>([]);
  const [workspaces, setWorkspaces] = useState<string[]>([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [newSessionName, setNewSessionName] = useState('');
  const [newSessionDescription, setNewSessionDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importData, setImportData] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
    loadSessions();
  }, []);

  useEffect(() => {
    filterSessions();
  }, [selectedWorkspace, allSessions]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + S: Save current session
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        setShowSaveDialog(true);
      }

      // Cmd/Ctrl + E: Export all sessions
      if ((e.metaKey || e.ctrlKey) && e.key === 'e' && sessions.length > 0) {
        e.preventDefault();
        handleExportAll();
      }

      // Cmd/Ctrl + I: Import sessions
      if ((e.metaKey || e.ctrlKey) && e.key === 'i') {
        e.preventDefault();
        handleImportFile();
      }

      // Escape: Close dialogs
      if (e.key === 'Escape') {
        setShowSaveDialog(false);
        setShowImportDialog(false);
        setEditingSessionId(null);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [sessions.length]);

  const loadSessions = async () => {
    try {
      setIsLoading(true);
      const loadedSessions = await sessionManager.getAllSessions();
      // Sort by last modified (newest first)
      loadedSessions.sort((a, b) => b.lastModified - a.lastModified);
      setAllSessions(loadedSessions);

      // Load available workspaces
      const allWorkspaces = await sessionManager.getAllWorkspaces();
      setWorkspaces(allWorkspaces);
    } catch (error) {
      onError('Failed to load sessions: ' + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const filterSessions = () => {
    if (!selectedWorkspace) {
      setSessions(allSessions);
    } else {
      const filtered = allSessions.filter(s =>
        s.categories && s.categories.includes(selectedWorkspace)
      );
      setSessions(filtered);
    }
  };

  const handleSaveSession = async () => {
    if (!newSessionName.trim()) {
      onError('Please enter a session name');
      return;
    }

    try {
      setIsSaving(true);
      await sessionManager.saveCurrentSession(
        newSessionName.trim(),
        newSessionDescription.trim() || undefined
      );
      setShowSaveDialog(false);
      setNewSessionName('');
      setNewSessionDescription('');
      await loadSessions();
    } catch (error) {
      onError('Failed to save session: ' + (error as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRestoreSession = async (sessionId: string, closeExisting: boolean) => {
    try {
      await sessionManager.restoreSession(sessionId, closeExisting);
      window.close(); // Close popup after restoring
    } catch (error) {
      onError('Failed to restore session: ' + (error as Error).message);
    }
  };

  const handleDeleteSession = async (sessionId: string, sessionName: string) => {
    if (!confirm(`Delete session "${sessionName}"?`)) return;

    try {
      await sessionManager.deleteSession(sessionId);
      await loadSessions();
    } catch (error) {
      onError('Failed to delete session: ' + (error as Error).message);
    }
  };

  const handleRenameSession = async (sessionId: string) => {
    if (!editName.trim()) {
      onError('Please enter a new name');
      return;
    }

    try {
      await sessionManager.updateSession(sessionId, { name: editName.trim() });
      setEditingSessionId(null);
      setEditName('');
      await loadSessions();
    } catch (error) {
      onError('Failed to rename session: ' + (error as Error).message);
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const handleExportSession = async (sessionId: string, sessionName: string) => {
    try {
      const jsonData = await sessionManager.exportSession(sessionId);
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `session-${sessionName.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      onError('Failed to export session: ' + (error as Error).message);
    }
  };

  const handleExportAll = async () => {
    try {
      const jsonData = await sessionManager.exportAllSessions();
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sessions-backup-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      onError('Failed to export sessions: ' + (error as Error).message);
    }
  };

  const handleImport = async () => {
    if (!importData.trim()) {
      onError('Please paste JSON data to import');
      return;
    }

    try {
      setIsImporting(true);
      const imported = await sessionManager.importSessions(importData);
      setShowImportDialog(false);
      setImportData('');
      await loadSessions();
      alert(`Successfully imported ${imported.length} session(s)`);
    } catch (error) {
      onError('Failed to import: ' + (error as Error).message);
    } finally {
      setIsImporting(false);
    }
  };

  const handleImportFile = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        setImportData(text);
        setShowImportDialog(true);
      } catch (error) {
        onError('Failed to read file: ' + (error as Error).message);
      }
    };
    input.click();
  };

  if (isLoading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: '#9ca3af' }}>
        Loading sessions...
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div
        style={{
          padding: '16px',
          borderBottom: '1px solid #374151',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 600, margin: 0, color: '#f3f4f6' }}>
            Sessions
          </h2>
          <p style={{ fontSize: '12px', color: '#9ca3af', margin: '4px 0 0 0' }}>
            Save and restore your browser sessions
          </p>
          <p style={{ fontSize: '10px', color: '#6b7280', margin: '4px 0 0 0', fontStyle: 'italic' }}>
            Shortcuts: ⌘S Save, ⌘E Export, ⌘I Import
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={handleImportFile}
            style={{
              padding: '8px 12px',
              backgroundColor: '#374151',
              color: '#f3f4f6',
              border: '1px solid #4b5563',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 500,
            }}
            title="Import sessions from file"
          >
            Import
          </button>
          {sessions.length > 0 && (
            <button
              onClick={handleExportAll}
              style={{
                padding: '8px 12px',
                backgroundColor: '#374151',
                color: '#f3f4f6',
                border: '1px solid #4b5563',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 500,
              }}
              title="Export all sessions"
            >
              Export All
            </button>
          )}
          <button
            onClick={() => setShowSaveDialog(true)}
            style={{
              padding: '8px 16px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 500,
            }}
          >
            + Save Current
          </button>
        </div>
      </div>

      {/* Workspace Filter */}
      {workspaces.length > 0 && (
        <div
          style={{
            padding: '12px 16px',
            borderBottom: '1px solid #374151',
            display: 'flex',
            gap: '8px',
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          <span style={{ fontSize: '12px', color: '#9ca3af', fontWeight: 500 }}>
            Workspaces:
          </span>
          <button
            onClick={() => setSelectedWorkspace(null)}
            style={{
              padding: '4px 10px',
              backgroundColor: selectedWorkspace === null ? '#3b82f6' : '#374151',
              color: selectedWorkspace === null ? 'white' : '#9ca3af',
              border: '1px solid #4b5563',
              borderRadius: '12px',
              cursor: 'pointer',
              fontSize: '11px',
              fontWeight: 500,
            }}
          >
            All ({allSessions.length})
          </button>
          {workspaces.map((workspace) => (
            <button
              key={workspace}
              onClick={() => setSelectedWorkspace(workspace)}
              style={{
                padding: '4px 10px',
                backgroundColor: selectedWorkspace === workspace ? '#3b82f6' : '#374151',
                color: selectedWorkspace === workspace ? 'white' : '#9ca3af',
                border: '1px solid #4b5563',
                borderRadius: '12px',
                cursor: 'pointer',
                fontSize: '11px',
                fontWeight: 500,
              }}
            >
              {workspace} ({allSessions.filter(s => s.categories?.includes(workspace)).length})
            </button>
          ))}
        </div>
      )}

      {/* Import Dialog */}
      {showImportDialog && (
        <div
          style={{
            padding: '16px',
            backgroundColor: '#1f2937',
            borderBottom: '1px solid #374151',
          }}
        >
          <h3 style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 12px 0', color: '#f3f4f6' }}>
            Import Sessions
          </h3>
          <p style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '12px' }}>
            Paste JSON data from an exported session file:
          </p>
          <textarea
            placeholder="Paste JSON data here..."
            value={importData}
            onChange={(e) => setImportData(e.target.value)}
            autoFocus
            style={{
              width: '100%',
              minHeight: '120px',
              padding: '8px',
              marginBottom: '12px',
              backgroundColor: '#374151',
              border: '1px solid #4b5563',
              borderRadius: '4px',
              color: '#f3f4f6',
              fontSize: '12px',
              fontFamily: 'monospace',
              resize: 'vertical',
            }}
          />
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button
              onClick={() => {
                setShowImportDialog(false);
                setImportData('');
              }}
              style={{
                padding: '6px 12px',
                backgroundColor: '#374151',
                color: '#f3f4f6',
                border: '1px solid #4b5563',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={isImporting || !importData.trim()}
              style={{
                padding: '6px 12px',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: isImporting || !importData.trim() ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                opacity: isImporting || !importData.trim() ? 0.5 : 1,
              }}
            >
              {isImporting ? 'Importing...' : 'Import'}
            </button>
          </div>
        </div>
      )}

      {/* Save Dialog */}
      {showSaveDialog && (
        <div
          style={{
            padding: '16px',
            backgroundColor: '#1f2937',
            borderBottom: '1px solid #374151',
          }}
        >
          <h3 style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 12px 0', color: '#f3f4f6' }}>
            Save Current Session
          </h3>
          <input
            type="text"
            placeholder="Session name (required)"
            value={newSessionName}
            onChange={(e) => setNewSessionName(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSaveSession()}
            autoFocus
            style={{
              width: '100%',
              padding: '8px',
              marginBottom: '8px',
              backgroundColor: '#374151',
              border: '1px solid #4b5563',
              borderRadius: '4px',
              color: '#f3f4f6',
              fontSize: '14px',
            }}
          />
          <input
            type="text"
            placeholder="Description (optional)"
            value={newSessionDescription}
            onChange={(e) => setNewSessionDescription(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSaveSession()}
            style={{
              width: '100%',
              padding: '8px',
              marginBottom: '12px',
              backgroundColor: '#374151',
              border: '1px solid #4b5563',
              borderRadius: '4px',
              color: '#f3f4f6',
              fontSize: '14px',
            }}
          />
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button
              onClick={() => {
                setShowSaveDialog(false);
                setNewSessionName('');
                setNewSessionDescription('');
              }}
              style={{
                padding: '6px 12px',
                backgroundColor: '#374151',
                color: '#f3f4f6',
                border: '1px solid #4b5563',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSaveSession}
              disabled={isSaving || !newSessionName.trim()}
              style={{
                padding: '6px 12px',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: isSaving || !newSessionName.trim() ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                opacity: isSaving || !newSessionName.trim() ? 0.5 : 1,
              }}
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      )}

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
              <div
                key={session.id}
                style={{
                  padding: '12px',
                  backgroundColor: '#1f2937',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                }}
              >
                {/* Session Header */}
                <div style={{ marginBottom: '8px' }}>
                  {editingSessionId === session.id ? (
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleRenameSession(session.id)}
                        autoFocus
                        style={{
                          flex: 1,
                          padding: '6px 8px',
                          backgroundColor: '#374151',
                          border: '1px solid #4b5563',
                          borderRadius: '4px',
                          color: '#f3f4f6',
                          fontSize: '14px',
                        }}
                      />
                      <button
                        onClick={() => handleRenameSession(session.id)}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: '#3b82f6',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px',
                        }}
                      >
                        ✓
                      </button>
                      <button
                        onClick={() => {
                          setEditingSessionId(null);
                          setEditName('');
                        }}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: '#374151',
                          color: '#f3f4f6',
                          border: '1px solid #4b5563',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px',
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                      <div style={{ flex: 1 }}>
                        <h3
                          style={{
                            fontSize: '14px',
                            fontWeight: 600,
                            color: '#f3f4f6',
                            margin: '0 0 4px 0',
                          }}
                        >
                          {session.name}
                        </h3>
                        {session.description && (
                          <p
                            style={{
                              fontSize: '12px',
                              color: '#9ca3af',
                              margin: '0 0 8px 0',
                            }}
                          >
                            {session.description}
                          </p>
                        )}
                        <div
                          style={{
                            display: 'flex',
                            gap: '12px',
                            fontSize: '11px',
                            color: '#6b7280',
                            marginBottom: '8px',
                          }}
                        >
                          <span>{session.tabCount} tabs</span>
                          <span>•</span>
                          <span>{formatDate(session.lastModified)}</span>
                          {session.jiraTickets && session.jiraTickets.length > 0 && (
                            <>
                              <span>•</span>
                              <span>{session.jiraTickets.length} Jira tickets</span>
                            </>
                          )}
                        </div>
                        {/* Workspace Badges */}
                        {session.categories && session.categories.length > 0 && (
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            {session.categories.map((category) => (
                              <span
                                key={category}
                                style={{
                                  padding: '2px 8px',
                                  backgroundColor: '#1e40af',
                                  color: '#93c5fd',
                                  borderRadius: '10px',
                                  fontSize: '10px',
                                  fontWeight: 600,
                                }}
                              >
                                {category}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => {
                          setEditingSessionId(session.id);
                          setEditName(session.name);
                        }}
                        style={{
                          padding: '4px 8px',
                          backgroundColor: 'transparent',
                          color: '#9ca3af',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '12px',
                        }}
                        title="Rename session"
                      >
                        ✎
                      </button>
                    </div>
                  )}
                </div>

                {/* Tab Preview */}
                {session.preview && (
                  <div
                    style={{
                      fontSize: '11px',
                      color: '#6b7280',
                      marginBottom: '12px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {session.preview}
                  </div>
                )}

                {/* Actions */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                  <button
                    onClick={() => handleRestoreSession(session.id, false)}
                    style={{
                      flex: 1,
                      padding: '6px 12px',
                      backgroundColor: '#3b82f6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12px',
                    }}
                  >
                    Restore
                  </button>
                  <button
                    onClick={() => handleRestoreSession(session.id, true)}
                    style={{
                      flex: 1,
                      padding: '6px 12px',
                      backgroundColor: '#374151',
                      color: '#f3f4f6',
                      border: '1px solid #4b5563',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12px',
                    }}
                    title="Replace current tabs with this session"
                  >
                    Replace
                  </button>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => handleExportSession(session.id, session.name)}
                    style={{
                      flex: 1,
                      padding: '6px 12px',
                      backgroundColor: '#374151',
                      color: '#f3f4f6',
                      border: '1px solid #4b5563',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '11px',
                    }}
                    title="Export this session to JSON file"
                  >
                    Export
                  </button>
                  <button
                    onClick={() => handleDeleteSession(session.id, session.name)}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: '#ef4444',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '11px',
                    }}
                    title="Delete session"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

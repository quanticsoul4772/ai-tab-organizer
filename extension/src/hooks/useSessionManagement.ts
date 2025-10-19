import { useState, useEffect } from 'react';
import type { SessionListItem } from '../types/session';
import { sessionManager } from '../services/sessionManager';

interface UseSessionManagementOptions {
  onError: (error: string) => void;
}

/**
 * Custom hook to manage browser sessions
 *
 * Provides:
 * - Session loading and filtering by workspace
 * - Session CRUD operations (create, restore, delete, rename)
 * - Import/export functionality
 * - Keyboard shortcuts (Cmd/Ctrl + S, E, I, Escape)
 * - Dialog state management
 * - Workspace filtering
 *
 * @param options - Configuration options
 * @returns Object containing session state and handlers
 */
export function useSessionManagement({ onError }: UseSessionManagementOptions) {
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
      const filtered = allSessions.filter(
        (s) => s.categories && s.categories.includes(selectedWorkspace)
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

  return {
    // State
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

    // Setters
    setSelectedWorkspace,
    setShowSaveDialog,
    setNewSessionName,
    setNewSessionDescription,
    setEditingSessionId,
    setEditName,
    setShowImportDialog,
    setImportData,

    // Handlers
    loadSessions,
    handleSaveSession,
    handleRestoreSession,
    handleDeleteSession,
    handleRenameSession,
    handleExportSession,
    handleExportAll,
    handleImport,
    handleImportFile,
    formatDate,
  };
}

import React from 'react';
import type { SessionListItem } from '../../types/session';

interface WorkspaceFilterProps {
  workspaces: string[];
  selectedWorkspace: string | null;
  allSessions: SessionListItem[];
  onSelectWorkspace: (workspace: string | null) => void;
}

export function WorkspaceFilter({
  workspaces,
  selectedWorkspace,
  allSessions,
  onSelectWorkspace,
}: WorkspaceFilterProps) {
  if (workspaces.length === 0) {
    return null;
  }

  return (
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
      <span style={{ fontSize: '12px', color: '#9ca3af', fontWeight: 500 }}>Workspaces:</span>
      <button
        onClick={() => onSelectWorkspace(null)}
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
          onClick={() => onSelectWorkspace(workspace)}
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
          {workspace} ({allSessions.filter((s) => s.categories?.includes(workspace)).length})
        </button>
      ))}
    </div>
  );
}

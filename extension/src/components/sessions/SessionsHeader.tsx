import React from 'react';

interface SessionsHeaderProps {
  sessionsCount: number;
  onSave: () => void;
  onImport: () => void;
  onExportAll: () => void;
}

export function SessionsHeader({
  sessionsCount,
  onSave,
  onImport,
  onExportAll,
}: SessionsHeaderProps) {
  return (
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
        <h2 style={{ fontSize: '18px', fontWeight: 600, margin: 0, color: '#f3f4f6' }}>Sessions</h2>
        <p style={{ fontSize: '12px', color: '#9ca3af', margin: '4px 0 0 0' }}>
          Save and restore your browser sessions
        </p>
        <p style={{ fontSize: '10px', color: '#6b7280', margin: '4px 0 0 0', fontStyle: 'italic' }}>
          Shortcuts: ⌘S Save, ⌘E Export, ⌘I Import
        </p>
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={onImport}
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
        {sessionsCount > 0 && (
          <button
            onClick={onExportAll}
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
          onClick={onSave}
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
  );
}

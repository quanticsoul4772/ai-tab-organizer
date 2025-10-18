import React from 'react';
import type { SessionListItem } from '../../types/session';

interface SessionCardProps {
  session: SessionListItem;
  isEditing: boolean;
  editName: string;
  onEditNameChange: (name: string) => void;
  onStartEdit: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onRestore: (closeExisting: boolean) => void;
  onExport: () => void;
  onDelete: () => void;
  formatDate: (timestamp: number) => string;
}

export function SessionCard({
  session,
  isEditing,
  editName,
  onEditNameChange,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onRestore,
  onExport,
  onDelete,
  formatDate,
}: SessionCardProps) {
  return (
    <div
      style={{
        padding: '12px',
        backgroundColor: '#1f2937',
        border: '1px solid #374151',
        borderRadius: '8px',
      }}
    >
      {/* Session Header */}
      <div style={{ marginBottom: '8px' }}>
        {isEditing ? (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input
              type="text"
              value={editName}
              onChange={(e) => onEditNameChange(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && onSaveEdit()}
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
              onClick={onSaveEdit}
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
              onClick={onCancelEdit}
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
              onClick={onStartEdit}
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
          onClick={() => onRestore(false)}
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
          onClick={() => onRestore(true)}
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
          onClick={onExport}
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
          onClick={onDelete}
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
  );
}

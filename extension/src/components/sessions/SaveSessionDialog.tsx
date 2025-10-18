import React from 'react';

interface SaveSessionDialogProps {
  show: boolean;
  sessionName: string;
  sessionDescription: string;
  isSaving: boolean;
  onNameChange: (name: string) => void;
  onDescriptionChange: (description: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

export function SaveSessionDialog({
  show,
  sessionName,
  sessionDescription,
  isSaving,
  onNameChange,
  onDescriptionChange,
  onSave,
  onCancel,
}: SaveSessionDialogProps) {
  if (!show) return null;

  return (
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
        value={sessionName}
        onChange={(e) => onNameChange(e.target.value)}
        onKeyPress={(e) => e.key === 'Enter' && onSave()}
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
        value={sessionDescription}
        onChange={(e) => onDescriptionChange(e.target.value)}
        onKeyPress={(e) => e.key === 'Enter' && onSave()}
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
          onClick={onCancel}
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
          onClick={onSave}
          disabled={isSaving || !sessionName.trim()}
          style={{
            padding: '6px 12px',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isSaving || !sessionName.trim() ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            opacity: isSaving || !sessionName.trim() ? 0.5 : 1,
          }}
        >
          {isSaving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  );
}

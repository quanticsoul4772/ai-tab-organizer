import React from 'react';

interface DialogProps {
  show: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  footer?: React.ReactNode;
}

/**
 * Reusable dialog component with header and footer
 */
export function Dialog({ show, title, children, onClose, footer }: DialogProps) {
  if (!show) return null;

  return (
    <div
      style={{
        padding: '16px',
        backgroundColor: '#1f2937',
        borderBottom: '1px solid #374151',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '12px',
        }}
      >
        <h3 style={{ fontSize: '14px', fontWeight: 600, margin: 0, color: '#f3f4f6' }}>{title}</h3>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: '#9ca3af',
            cursor: 'pointer',
            fontSize: '18px',
            padding: '0 4px',
          }}
          aria-label="Close dialog"
        >
          ✕
        </button>
      </div>
      <div>{children}</div>
      {footer && <div style={{ marginTop: '12px' }}>{footer}</div>}
    </div>
  );
}

interface DialogActionsProps {
  children: React.ReactNode;
}

export function DialogActions({ children }: DialogActionsProps) {
  return <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>{children}</div>;
}

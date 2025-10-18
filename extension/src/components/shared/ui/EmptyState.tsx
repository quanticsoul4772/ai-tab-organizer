import React from 'react';

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: string;
  action?: React.ReactNode;
}

/**
 * Reusable empty state component for when there's no data to display
 */
export function EmptyState({ title, description, icon, action }: EmptyStateProps) {
  return (
    <div
      style={{
        textAlign: 'center',
        padding: '40px 20px',
        color: '#9ca3af',
      }}
    >
      {icon && (
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>
          {icon}
        </div>
      )}
      <p style={{ fontSize: '14px', marginBottom: '8px', fontWeight: 500 }}>
        {title}
      </p>
      {description && (
        <p style={{ fontSize: '12px', marginBottom: action ? '16px' : 0 }}>
          {description}
        </p>
      )}
      {action && <div style={{ marginTop: '16px' }}>{action}</div>}
    </div>
  );
}

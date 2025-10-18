import React from 'react';

type BadgeVariant = 'primary' | 'secondary' | 'success' | 'warning' | 'jira';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  style?: React.CSSProperties;
}

/**
 * Reusable badge component for categories, workspaces, and status indicators
 */
export function Badge({ children, variant = 'secondary', style }: BadgeProps) {
  const variantStyles: Record<BadgeVariant, React.CSSProperties> = {
    primary: {
      backgroundColor: '#3b82f6',
      color: 'white',
    },
    secondary: {
      backgroundColor: '#374151',
      color: '#9ca3af',
    },
    success: {
      backgroundColor: '#10b981',
      color: 'white',
    },
    warning: {
      backgroundColor: '#f59e0b',
      color: 'white',
    },
    jira: {
      backgroundColor: '#1e40af',
      color: '#93c5fd',
    },
  };

  const baseStyle: React.CSSProperties = {
    padding: '2px 8px',
    borderRadius: '10px',
    fontSize: '10px',
    fontWeight: 600,
    display: 'inline-block',
    ...variantStyles[variant],
    ...style,
  };

  return <span style={baseStyle}>{children}</span>;
}

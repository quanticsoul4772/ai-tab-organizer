import React from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
type ButtonSize = 'small' | 'medium' | 'large';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: React.ReactNode;
}

/**
 * Reusable button component with variants and sizes
 */
export function Button({
  variant = 'primary',
  size = 'medium',
  children,
  disabled,
  ...props
}: ButtonProps) {
  const baseStyle: React.CSSProperties = {
    border: 'none',
    borderRadius: '6px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontWeight: 500,
    transition: 'all 0.2s',
    opacity: disabled ? 0.5 : 1,
  };

  const variantStyles: Record<ButtonVariant, React.CSSProperties> = {
    primary: {
      backgroundColor: '#3b82f6',
      color: 'white',
    },
    secondary: {
      backgroundColor: '#374151',
      color: '#f3f4f6',
      border: '1px solid #4b5563',
    },
    danger: {
      backgroundColor: '#ef4444',
      color: 'white',
    },
    ghost: {
      backgroundColor: 'transparent',
      color: '#9ca3af',
    },
  };

  const sizeStyles: Record<ButtonSize, React.CSSProperties> = {
    small: {
      padding: '4px 8px',
      fontSize: '11px',
    },
    medium: {
      padding: '6px 12px',
      fontSize: '13px',
    },
    large: {
      padding: '8px 16px',
      fontSize: '14px',
    },
  };

  return (
    <button
      style={{
        ...baseStyle,
        ...variantStyles[variant],
        ...sizeStyles[size],
      }}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}

import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

/**
 * Reusable input component with optional label and error
 */
export function Input({ label, error, style, ...props }: InputProps) {
  const baseStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px',
    backgroundColor: '#374151',
    border: error ? '1px solid #ef4444' : '1px solid #4b5563',
    borderRadius: '4px',
    color: '#f3f4f6',
    fontSize: '14px',
    ...style,
  };

  return (
    <div style={{ marginBottom: '8px' }}>
      {label && (
        <label style={{ display: 'block', fontSize: '12px', color: '#9ca3af', marginBottom: '4px' }}>
          {label}
        </label>
      )}
      <input style={baseStyle} {...props} />
      {error && (
        <p style={{ fontSize: '11px', color: '#ef4444', marginTop: '4px', margin: 0 }}>
          {error}
        </p>
      )}
    </div>
  );
}

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export function TextArea({ label, error, style, ...props }: TextAreaProps) {
  const baseStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px',
    backgroundColor: '#374151',
    border: error ? '1px solid #ef4444' : '1px solid #4b5563',
    borderRadius: '4px',
    color: '#f3f4f6',
    fontSize: '12px',
    fontFamily: 'monospace',
    resize: 'vertical',
    ...style,
  };

  return (
    <div style={{ marginBottom: '8px' }}>
      {label && (
        <label style={{ display: 'block', fontSize: '12px', color: '#9ca3af', marginBottom: '4px' }}>
          {label}
        </label>
      )}
      <textarea style={baseStyle} {...props} />
      {error && (
        <p style={{ fontSize: '11px', color: '#ef4444', marginTop: '4px', margin: 0 }}>
          {error}
        </p>
      )}
    </div>
  );
}

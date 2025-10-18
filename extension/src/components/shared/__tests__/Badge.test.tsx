import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge } from '../ui/Badge';

describe('Badge', () => {
  it('should render children', () => {
    render(<Badge>Test Badge</Badge>);
    expect(screen.getByText('Test Badge')).toBeInTheDocument();
  });

  it('should apply secondary variant by default', () => {
    render(<Badge>Default</Badge>);
    const badge = screen.getByText('Default');
    expect(badge).toHaveStyle({ backgroundColor: '#374151', color: '#9ca3af' });
  });

  it('should apply primary variant', () => {
    render(<Badge variant="primary">Primary</Badge>);
    const badge = screen.getByText('Primary');
    expect(badge).toHaveStyle({ backgroundColor: '#3b82f6' });
    expect(badge).toHaveStyle({ color: 'rgb(255, 255, 255)' });
  });

  it('should apply success variant', () => {
    render(<Badge variant="success">Success</Badge>);
    const badge = screen.getByText('Success');
    expect(badge).toHaveStyle({ backgroundColor: '#10b981' });
    expect(badge).toHaveStyle({ color: 'rgb(255, 255, 255)' });
  });

  it('should apply warning variant', () => {
    render(<Badge variant="warning">Warning</Badge>);
    const badge = screen.getByText('Warning');
    expect(badge).toHaveStyle({ backgroundColor: '#f59e0b' });
    expect(badge).toHaveStyle({ color: 'rgb(255, 255, 255)' });
  });

  it('should apply jira variant', () => {
    render(<Badge variant="jira">JIRA-123</Badge>);
    const badge = screen.getByText('JIRA-123');
    expect(badge).toHaveStyle({ backgroundColor: '#1e40af', color: '#93c5fd' });
  });

  it('should have base styles', () => {
    render(<Badge>Base</Badge>);
    const badge = screen.getByText('Base');
    expect(badge).toHaveStyle({
      padding: '2px 8px',
      borderRadius: '10px',
      fontSize: '10px',
      fontWeight: 600,
    });
  });

  it('should accept custom styles', () => {
    render(<Badge style={{ marginLeft: '10px' }}>Custom</Badge>);
    const badge = screen.getByText('Custom');
    expect(badge).toHaveStyle({ marginLeft: '10px' });
  });

  it('should render as inline element', () => {
    render(<Badge>Inline</Badge>);
    const badge = screen.getByText('Inline');
    expect(badge).toHaveStyle({ display: 'inline-block' });
  });
});

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EmptyState } from '../ui/EmptyState';
import { Button } from '../ui/Button';

describe('EmptyState', () => {
  it('should render title', () => {
    render(<EmptyState title="No data available" />);
    expect(screen.getByText('No data available')).toBeInTheDocument();
  });

  it('should render description when provided', () => {
    render(<EmptyState title="No sessions" description="Click 'Save Current' to save your tabs" />);
    expect(screen.getByText('No sessions')).toBeInTheDocument();
    expect(screen.getByText("Click 'Save Current' to save your tabs")).toBeInTheDocument();
  });

  it('should render icon when provided', () => {
    render(<EmptyState title="Empty" icon="📭" />);
    expect(screen.getByText('📭')).toBeInTheDocument();
  });

  it('should render action button when provided', () => {
    render(<EmptyState title="No data" action={<Button>Create New</Button>} />);
    expect(screen.getByText('Create New')).toBeInTheDocument();
  });

  it('should render all elements together', () => {
    render(
      <EmptyState
        title="No results found"
        description="Try a different search query"
        icon="🔍"
        action={<Button>Clear Search</Button>}
      />
    );
    expect(screen.getByText('No results found')).toBeInTheDocument();
    expect(screen.getByText('Try a different search query')).toBeInTheDocument();
    expect(screen.getByText('🔍')).toBeInTheDocument();
    expect(screen.getByText('Clear Search')).toBeInTheDocument();
  });

  it('should have centered text alignment', () => {
    const { container } = render(<EmptyState title="Empty" />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveStyle({ textAlign: 'center' });
  });

  it('should have proper padding', () => {
    const { container } = render(<EmptyState title="Empty" />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveStyle({ padding: '40px 20px' });
  });

  it('should have muted text color', () => {
    const { container } = render(<EmptyState title="Empty" />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveStyle({ color: '#9ca3af' });
  });
});

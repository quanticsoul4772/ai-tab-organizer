import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '../ui/Button';

describe('Button', () => {
  it('should render children', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('should apply primary variant by default', () => {
    render(<Button>Primary</Button>);
    const button = screen.getByText('Primary');
    expect(button).toHaveStyle({ backgroundColor: '#3b82f6' });
    expect(button).toHaveStyle({ color: 'rgb(255, 255, 255)' });
  });

  it('should apply secondary variant', () => {
    render(<Button variant="secondary">Secondary</Button>);
    const button = screen.getByText('Secondary');
    expect(button).toHaveStyle({ backgroundColor: '#374151' });
    expect(button).toHaveStyle({ color: '#f3f4f6' });
  });

  it('should apply danger variant', () => {
    render(<Button variant="danger">Delete</Button>);
    const button = screen.getByText('Delete');
    expect(button).toHaveStyle({ backgroundColor: '#ef4444' });
    expect(button).toHaveStyle({ color: 'rgb(255, 255, 255)' });
  });

  it('should apply ghost variant', () => {
    render(<Button variant="ghost">Ghost</Button>);
    const button = screen.getByText('Ghost');
    // Note: jsdom doesn't always compute 'transparent' backgroundColor correctly
    expect(button).toHaveStyle({ color: '#9ca3af' });
  });

  it('should apply small size', () => {
    render(<Button size="small">Small</Button>);
    const button = screen.getByText('Small');
    expect(button).toHaveStyle({ padding: '4px 8px', fontSize: '11px' });
  });

  it('should apply medium size by default', () => {
    render(<Button>Medium</Button>);
    const button = screen.getByText('Medium');
    expect(button).toHaveStyle({ padding: '6px 12px', fontSize: '13px' });
  });

  it('should apply large size', () => {
    render(<Button size="large">Large</Button>);
    const button = screen.getByText('Large');
    expect(button).toHaveStyle({ padding: '8px 16px', fontSize: '14px' });
  });

  it('should handle click events', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();

    render(<Button onClick={handleClick}>Click</Button>);

    await user.click(screen.getByText('Click'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should be disabled when disabled prop is true', () => {
    render(<Button disabled>Disabled</Button>);
    const button = screen.getByText('Disabled');
    expect(button).toBeDisabled();
    expect(button).toHaveStyle({ opacity: 0.5, cursor: 'not-allowed' });
  });

  it('should not trigger click when disabled', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();

    render(
      <Button disabled onClick={handleClick}>
        Disabled
      </Button>
    );

    await user.click(screen.getByText('Disabled'));
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('should pass through additional props', () => {
    render(<Button title="Tooltip text">With Title</Button>);
    const button = screen.getByText('With Title');
    expect(button).toHaveAttribute('title', 'Tooltip text');
  });

  it('should support type attribute', () => {
    render(<Button type="submit">Submit</Button>);
    const button = screen.getByText('Submit');
    expect(button).toHaveAttribute('type', 'submit');
  });
});

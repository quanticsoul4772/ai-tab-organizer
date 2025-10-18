import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Input, TextArea } from '../ui/Input';

describe('Input', () => {
  it('should render input element', () => {
    render(<Input placeholder="Enter text" />);
    expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument();
  });

  it('should render label when provided', () => {
    render(<Input label="Username" placeholder="Enter username" />);
    expect(screen.getByText('Username')).toBeInTheDocument();
  });

  it('should render error message when provided', () => {
    render(<Input error="This field is required" />);
    expect(screen.getByText('This field is required')).toBeInTheDocument();
  });

  it('should apply error border when error is present', () => {
    render(<Input error="Error" />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveStyle({ border: '1px solid #ef4444' });
  });

  it('should handle value changes', async () => {
    const handleChange = vi.fn();
    const user = userEvent.setup();

    render(<Input onChange={handleChange} />);

    const input = screen.getByRole('textbox');
    await user.type(input, 'test');

    expect(handleChange).toHaveBeenCalled();
  });

  it('should support all input types', () => {
    const { container } = render(<Input type="password" />);
    const input = container.querySelector('input[type="password"]');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('type', 'password');
  });

  it('should pass through additional props', () => {
    render(<Input disabled required />);
    const input = screen.getByRole('textbox');
    expect(input).toBeDisabled();
    expect(input).toBeRequired();
  });

  it('should accept custom styles', () => {
    render(<Input style={{ width: '200px' }} />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveStyle({ width: '200px' });
  });
});

describe('TextArea', () => {
  it('should render textarea element', () => {
    render(<TextArea placeholder="Enter description" />);
    expect(screen.getByPlaceholderText('Enter description')).toBeInTheDocument();
  });

  it('should render label when provided', () => {
    render(<TextArea label="Description" />);
    expect(screen.getByText('Description')).toBeInTheDocument();
  });

  it('should render error message when provided', () => {
    render(<TextArea error="Description is required" />);
    expect(screen.getByText('Description is required')).toBeInTheDocument();
  });

  it('should apply error border when error is present', () => {
    render(<TextArea error="Error" />);
    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveStyle({ border: '1px solid #ef4444' });
  });

  it('should handle value changes', async () => {
    const handleChange = vi.fn();
    const user = userEvent.setup();

    render(<TextArea onChange={handleChange} />);

    const textarea = screen.getByRole('textbox');
    await user.type(textarea, 'test');

    expect(handleChange).toHaveBeenCalled();
  });

  it('should support rows attribute', () => {
    render(<TextArea rows={5} />);
    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveAttribute('rows', '5');
  });

  it('should have monospace font family', () => {
    render(<TextArea />);
    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveStyle({ fontFamily: 'monospace' });
  });

  it('should support vertical resize', () => {
    render(<TextArea />);
    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveStyle({ resize: 'vertical' });
  });
});

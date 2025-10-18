import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DensityToggle } from '../DensityToggle';
import type { DensityMode } from '../../types/density';

describe('DensityToggle', () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render all three density mode buttons', () => {
      render(<DensityToggle currentMode="normal" onChange={mockOnChange} />);

      expect(screen.getByTitle('Compact')).toBeInTheDocument();
      expect(screen.getByTitle('Normal')).toBeInTheDocument();
      expect(screen.getByTitle('Spacious')).toBeInTheDocument();
    });

    it('should display correct icons for each mode', () => {
      render(<DensityToggle currentMode="normal" onChange={mockOnChange} />);

      expect(screen.getByTitle('Compact')).toHaveTextContent('⊟');
      expect(screen.getByTitle('Normal')).toHaveTextContent('☰');
      expect(screen.getByTitle('Spacious')).toHaveTextContent('≡');
    });

    it('should set aria-label for accessibility', () => {
      render(<DensityToggle currentMode="normal" onChange={mockOnChange} />);

      expect(screen.getByLabelText('Compact')).toBeInTheDocument();
      expect(screen.getByLabelText('Normal')).toBeInTheDocument();
      expect(screen.getByLabelText('Spacious')).toBeInTheDocument();
    });
  });

  describe('Active State', () => {
    it('should mark compact mode as active', () => {
      render(<DensityToggle currentMode="compact" onChange={mockOnChange} />);

      const compactBtn = screen.getByTitle('Compact');
      const normalBtn = screen.getByTitle('Normal');
      const spaciousBtn = screen.getByTitle('Spacious');

      expect(compactBtn).toHaveClass('active');
      expect(normalBtn).not.toHaveClass('active');
      expect(spaciousBtn).not.toHaveClass('active');
    });

    it('should mark normal mode as active', () => {
      render(<DensityToggle currentMode="normal" onChange={mockOnChange} />);

      const compactBtn = screen.getByTitle('Compact');
      const normalBtn = screen.getByTitle('Normal');
      const spaciousBtn = screen.getByTitle('Spacious');

      expect(compactBtn).not.toHaveClass('active');
      expect(normalBtn).toHaveClass('active');
      expect(spaciousBtn).not.toHaveClass('active');
    });

    it('should mark spacious mode as active', () => {
      render(<DensityToggle currentMode="spacious" onChange={mockOnChange} />);

      const compactBtn = screen.getByTitle('Compact');
      const normalBtn = screen.getByTitle('Normal');
      const spaciousBtn = screen.getByTitle('Spacious');

      expect(compactBtn).not.toHaveClass('active');
      expect(normalBtn).not.toHaveClass('active');
      expect(spaciousBtn).toHaveClass('active');
    });

    it('should apply density-btn class to all buttons', () => {
      render(<DensityToggle currentMode="normal" onChange={mockOnChange} />);

      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toHaveClass('density-btn');
      });
    });
  });

  describe('User Interaction', () => {
    it('should call onChange with compact mode when compact button clicked', () => {
      render(<DensityToggle currentMode="normal" onChange={mockOnChange} />);

      const compactBtn = screen.getByTitle('Compact');
      fireEvent.click(compactBtn);

      expect(mockOnChange).toHaveBeenCalledWith('compact');
      expect(mockOnChange).toHaveBeenCalledTimes(1);
    });

    it('should call onChange with normal mode when normal button clicked', () => {
      render(<DensityToggle currentMode="compact" onChange={mockOnChange} />);

      const normalBtn = screen.getByTitle('Normal');
      fireEvent.click(normalBtn);

      expect(mockOnChange).toHaveBeenCalledWith('normal');
      expect(mockOnChange).toHaveBeenCalledTimes(1);
    });

    it('should call onChange with spacious mode when spacious button clicked', () => {
      render(<DensityToggle currentMode="normal" onChange={mockOnChange} />);

      const spaciousBtn = screen.getByTitle('Spacious');
      fireEvent.click(spaciousBtn);

      expect(mockOnChange).toHaveBeenCalledWith('spacious');
      expect(mockOnChange).toHaveBeenCalledTimes(1);
    });

    it('should allow clicking the currently active mode', () => {
      render(<DensityToggle currentMode="normal" onChange={mockOnChange} />);

      const normalBtn = screen.getByTitle('Normal');
      fireEvent.click(normalBtn);

      expect(mockOnChange).toHaveBeenCalledWith('normal');
    });

    it('should handle multiple clicks', () => {
      render(<DensityToggle currentMode="normal" onChange={mockOnChange} />);

      const compactBtn = screen.getByTitle('Compact');
      const spaciousBtn = screen.getByTitle('Spacious');

      fireEvent.click(compactBtn);
      fireEvent.click(spaciousBtn);
      fireEvent.click(compactBtn);

      expect(mockOnChange).toHaveBeenCalledTimes(3);
      expect(mockOnChange).toHaveBeenNthCalledWith(1, 'compact');
      expect(mockOnChange).toHaveBeenNthCalledWith(2, 'spacious');
      expect(mockOnChange).toHaveBeenNthCalledWith(3, 'compact');
    });
  });

  describe('Edge Cases', () => {
    it('should handle mode changes via props', () => {
      const { rerender } = render(<DensityToggle currentMode="compact" onChange={mockOnChange} />);

      expect(screen.getByTitle('Compact')).toHaveClass('active');

      rerender(<DensityToggle currentMode="spacious" onChange={mockOnChange} />);

      expect(screen.getByTitle('Compact')).not.toHaveClass('active');
      expect(screen.getByTitle('Spacious')).toHaveClass('active');
    });

    it('should maintain button order', () => {
      render(<DensityToggle currentMode="normal" onChange={mockOnChange} />);

      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(3);
      expect(buttons[0]).toHaveAttribute('title', 'Compact');
      expect(buttons[1]).toHaveAttribute('title', 'Normal');
      expect(buttons[2]).toHaveAttribute('title', 'Spacious');
    });
  });
});

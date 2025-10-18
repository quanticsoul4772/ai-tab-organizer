import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ErrorBoundary } from '../ErrorBoundary';

// Component that throws an error
function ThrowError({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('Test error message');
  }
  return <div>No error</div>;
}

describe('ErrorBoundary', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('Normal Rendering', () => {
    it('should render children when no error', () => {
      render(
        <ErrorBoundary>
          <div>Test content</div>
        </ErrorBoundary>
      );

      expect(screen.getByText('Test content')).toBeInTheDocument();
    });

    it('should not show error UI when no error', () => {
      render(
        <ErrorBoundary>
          <div>Test content</div>
        </ErrorBoundary>
      );

      expect(screen.queryByText('⚠️ Something went wrong')).not.toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should catch errors and display fallback UI', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('⚠️ Something went wrong')).toBeInTheDocument();
      expect(screen.getByText('The application encountered an error.')).toBeInTheDocument();
    });

    it('should display error message in details', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Error details')).toBeInTheDocument();
      expect(screen.getByText('Test error message')).toBeInTheDocument();
    });

    it('should log error to console', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      // ErrorBoundary logs the error via console.error
      // React also logs errors in development mode
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('should call onError callback when provided', () => {
      const mockOnError = vi.fn();

      render(
        <ErrorBoundary onError={mockOnError}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(mockOnError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.any(Object)
      );
    });

    it('should not call onError when no error occurs', () => {
      const mockOnError = vi.fn();

      render(
        <ErrorBoundary onError={mockOnError}>
          <div>No error</div>
        </ErrorBoundary>
      );

      expect(mockOnError).not.toHaveBeenCalled();
    });
  });

  describe('Custom Fallback', () => {
    it('should render custom fallback when provided', () => {
      const customFallback = <div>Custom error message</div>;

      render(
        <ErrorBoundary fallback={customFallback}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Custom error message')).toBeInTheDocument();
      expect(screen.queryByText('⚠️ Something went wrong')).not.toBeInTheDocument();
    });

    it('should not render custom fallback when no error', () => {
      const customFallback = <div>Custom error message</div>;

      render(
        <ErrorBoundary fallback={customFallback}>
          <div>Normal content</div>
        </ErrorBoundary>
      );

      expect(screen.queryByText('Custom error message')).not.toBeInTheDocument();
      expect(screen.getByText('Normal content')).toBeInTheDocument();
    });
  });

  describe('Reset Functionality', () => {
    it('should render reset button', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Try Again')).toBeInTheDocument();
    });

    it('should reset error state when reset button clicked', () => {
      const { rerender } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('⚠️ Something went wrong')).toBeInTheDocument();

      const resetButton = screen.getByText('Try Again');
      resetButton.click();

      // Re-render with non-throwing component after reset
      rerender(
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      );

      expect(screen.queryByText('⚠️ Something went wrong')).not.toBeInTheDocument();
      expect(screen.getByText('No error')).toBeInTheDocument();
    });
  });

  describe('Error Details', () => {
    it('should render details element for error message', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const details = screen.getByText('Error details').closest('details');
      expect(details).toBeInTheDocument();
    });

    it('should not render error details when error is null', () => {
      // This tests the conditional rendering of error details
      // Though in normal flow, error is always set when hasError is true
      render(
        <ErrorBoundary>
          <div>No error</div>
        </ErrorBoundary>
      );

      expect(screen.queryByText('Error details')).not.toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle errors in nested components', () => {
      render(
        <ErrorBoundary>
          <div>
            <div>
              <ThrowError shouldThrow={true} />
            </div>
          </div>
        </ErrorBoundary>
      );

      expect(screen.getByText('⚠️ Something went wrong')).toBeInTheDocument();
    });

    it('should handle multiple children', () => {
      render(
        <ErrorBoundary>
          <div>First child</div>
          <div>Second child</div>
        </ErrorBoundary>
      );

      expect(screen.getByText('First child')).toBeInTheDocument();
      expect(screen.getByText('Second child')).toBeInTheDocument();
    });

    it('should catch errors with different error messages', () => {
      function CustomError() {
        throw new Error('Custom error message');
      }

      render(
        <ErrorBoundary>
          <CustomError />
        </ErrorBoundary>
      );

      expect(screen.getByText('Custom error message')).toBeInTheDocument();
    });
  });
});

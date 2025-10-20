import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Dialog, DialogActions } from '../Dialog';

describe('Dialog', () => {
  describe('Rendering', () => {
    it('renders nothing when show is false', () => {
      const { container } = render(
        <Dialog show={false} title="Test" onClose={vi.fn()}>
          Content
        </Dialog>
      );

      expect(container.firstChild).toBeNull();
    });

    it('renders dialog when show is true', () => {
      render(
        <Dialog show={true} title="Test Dialog" onClose={vi.fn()}>
          Content
        </Dialog>
      );

      expect(screen.getByText('Test Dialog')).toBeInTheDocument();
      expect(screen.getByText('Content')).toBeInTheDocument();
    });

    it('renders title', () => {
      render(
        <Dialog show={true} title="My Title" onClose={vi.fn()}>
          Content
        </Dialog>
      );

      expect(screen.getByText('My Title')).toBeInTheDocument();
    });

    it('renders children', () => {
      render(
        <Dialog show={true} title="Title" onClose={vi.fn()}>
          <div>Child content</div>
          <div>More content</div>
        </Dialog>
      );

      expect(screen.getByText('Child content')).toBeInTheDocument();
      expect(screen.getByText('More content')).toBeInTheDocument();
    });

    it('renders close button', () => {
      render(
        <Dialog show={true} title="Title" onClose={vi.fn()}>
          Content
        </Dialog>
      );

      expect(screen.getByLabelText('Close dialog')).toBeInTheDocument();
      expect(screen.getByText('✕')).toBeInTheDocument();
    });

    it('renders footer when provided', () => {
      render(
        <Dialog show={true} title="Title" onClose={vi.fn()} footer={<div>Footer content</div>}>
          Content
        </Dialog>
      );

      expect(screen.getByText('Footer content')).toBeInTheDocument();
    });

    it('does not render footer when not provided', () => {
      render(
        <Dialog show={true} title="Title" onClose={vi.fn()}>
          Content
        </Dialog>
      );

      expect(screen.queryByText('Footer content')).not.toBeInTheDocument();
    });
  });

  describe('User Interaction', () => {
    it('calls onClose when close button is clicked', () => {
      const onClose = vi.fn();

      render(
        <Dialog show={true} title="Title" onClose={onClose}>
          Content
        </Dialog>
      );

      fireEvent.click(screen.getByLabelText('Close dialog'));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when X is clicked', () => {
      const onClose = vi.fn();

      render(
        <Dialog show={true} title="Title" onClose={onClose}>
          Content
        </Dialog>
      );

      fireEvent.click(screen.getByText('✕'));
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Edge Cases', () => {
    it('handles empty children', () => {
      render(
        <Dialog show={true} title="Title" onClose={vi.fn()}>
          {null}
        </Dialog>
      );

      expect(screen.getByText('Title')).toBeInTheDocument();
    });

    it('handles complex footer', () => {
      render(
        <Dialog
          show={true}
          title="Title"
          onClose={vi.fn()}
          footer={
            <div>
              <button>Cancel</button>
              <button>Save</button>
            </div>
          }
        >
          Content
        </Dialog>
      );

      expect(screen.getByText('Cancel')).toBeInTheDocument();
      expect(screen.getByText('Save')).toBeInTheDocument();
    });

    it('handles showing and hiding', () => {
      const { rerender } = render(
        <Dialog show={false} title="Title" onClose={vi.fn()}>
          Content
        </Dialog>
      );

      expect(screen.queryByText('Title')).not.toBeInTheDocument();

      rerender(
        <Dialog show={true} title="Title" onClose={vi.fn()}>
          Content
        </Dialog>
      );

      expect(screen.getByText('Title')).toBeInTheDocument();
    });
  });
});

describe('DialogActions', () => {
  it('renders children', () => {
    render(
      <DialogActions>
        <button>Action 1</button>
        <button>Action 2</button>
      </DialogActions>
    );

    expect(screen.getByText('Action 1')).toBeInTheDocument();
    expect(screen.getByText('Action 2')).toBeInTheDocument();
  });

  it('renders single child', () => {
    render(
      <DialogActions>
        <button>Single action</button>
      </DialogActions>
    );

    expect(screen.getByText('Single action')).toBeInTheDocument();
  });

  it('renders complex children', () => {
    render(
      <DialogActions>
        <div>
          <span>Text</span>
          <button>Button</button>
        </div>
      </DialogActions>
    );

    expect(screen.getByText('Text')).toBeInTheDocument();
    expect(screen.getByText('Button')).toBeInTheDocument();
  });
});

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PopupHeader } from '../PopupHeader';
import { DensityProvider } from '../../../context/DensityContext';

const renderWithProvider = (ui: React.ReactElement) => {
  return render(<DensityProvider>{ui}</DensityProvider>);
};

describe('PopupHeader', () => {
  describe('Rendering', () => {
    it('renders app title', () => {
      renderWithProvider(<PopupHeader onShowSettings={vi.fn()} />);
      expect(screen.getByText('AI Tab Organizer')).toBeInTheDocument();
    });

    it('renders density toggle', () => {
      const { container } = renderWithProvider(<PopupHeader onShowSettings={vi.fn()} />);
      // DensityToggle should render - check for density-btn class
      const densityButtons = container.querySelectorAll('.density-btn');
      expect(densityButtons.length).toBeGreaterThanOrEqual(3);
    });

    it('renders settings button', () => {
      renderWithProvider(<PopupHeader onShowSettings={vi.fn()} />);
      expect(screen.getByTitle('Settings')).toBeInTheDocument();
      expect(screen.getByText('⚙️')).toBeInTheDocument();
    });
  });

  describe('User Interaction', () => {
    it('calls onShowSettings when settings button is clicked', () => {
      const onShowSettings = vi.fn();
      renderWithProvider(<PopupHeader onShowSettings={onShowSettings} />);

      fireEvent.click(screen.getByTitle('Settings'));
      expect(onShowSettings).toHaveBeenCalledTimes(1);
    });

    it('allows density mode changes', () => {
      const { container } = renderWithProvider(<PopupHeader onShowSettings={vi.fn()} />);

      // Get density buttons
      const densityButtons = container.querySelectorAll('.density-btn');
      expect(densityButtons.length).toBeGreaterThanOrEqual(3);

      // Click buttons - should not error
      fireEvent.click(densityButtons[0]);
      fireEvent.click(densityButtons[2]);
    });
  });

  describe('Integration', () => {
    it('integrates with DensityProvider', () => {
      const { container } = renderWithProvider(<PopupHeader onShowSettings={vi.fn()} />);

      // Density toggle should be functional
      const densityButtons = container.querySelectorAll('.density-btn');
      expect(densityButtons.length).toBeGreaterThanOrEqual(3);
    });
  });
});

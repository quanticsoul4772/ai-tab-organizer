import React from 'react';
import { DensityMode } from '../types/density';

interface DensityToggleProps {
  currentMode: DensityMode;
  onChange: (mode: DensityMode) => void;
}

export const DensityToggle: React.FC<DensityToggleProps> = ({ currentMode, onChange }) => {
  console.log('DensityToggle rendered, currentMode:', currentMode);

  const modes: { mode: DensityMode; label: string; icon: string }[] = [
    { mode: 'compact', label: 'Compact', icon: '⊟' },
    { mode: 'normal', label: 'Normal', icon: '☰' },
    { mode: 'spacious', label: 'Spacious', icon: '≡' }
  ];

  const handleClick = (mode: DensityMode) => {
    console.log('DensityToggle button clicked:', mode);
    onChange(mode);
  };

  return (
    <div className="density-toggle">
      {modes.map(({ mode, label, icon }) => (
        <button
          key={mode}
          onClick={() => handleClick(mode)}
          className={`density-btn ${currentMode === mode ? 'active' : ''}`}
          title={label}
          aria-label={label}
        >
          {icon}
        </button>
      ))}
    </div>
  );
};

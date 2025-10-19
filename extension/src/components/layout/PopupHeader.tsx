import { DensityToggle } from '../DensityToggle';
import { useDensity } from '../../context/DensityContext';

interface PopupHeaderProps {
  onShowSettings: () => void;
}

export function PopupHeader({ onShowSettings }: PopupHeaderProps) {
  const { densityMode, setDensityMode } = useDensity();

  return (
    <div className="header">
      <h1>AI Tab Organizer</h1>
      <DensityToggle currentMode={densityMode} onChange={setDensityMode} />
      <button onClick={onShowSettings} className="settings-btn" title="Settings">
        ⚙️
      </button>
    </div>
  );
}

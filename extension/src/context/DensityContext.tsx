import { createContext, useContext, useState, ReactNode } from 'react';
import type { DensityMode } from '../types/density';

interface DensityContextType {
  densityMode: DensityMode;
  setDensityMode: (mode: DensityMode) => void;
}

const DensityContext = createContext<DensityContextType | undefined>(undefined);

interface DensityProviderProps {
  children: ReactNode;
}

export function DensityProvider({ children }: DensityProviderProps) {
  const [densityMode, setDensityMode] = useState<DensityMode>('normal');

  return (
    <DensityContext.Provider value={{ densityMode, setDensityMode }}>
      {children}
    </DensityContext.Provider>
  );
}

export function useDensity() {
  const context = useContext(DensityContext);
  if (!context) {
    throw new Error('useDensity must be used within DensityProvider');
  }
  return context;
}

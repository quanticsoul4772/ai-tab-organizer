export type DensityMode = 'compact' | 'normal' | 'spacious';

export interface DensityConfig {
  mode: DensityMode;
  itemHeight: number;
  showDomain: boolean;
  showUrl: boolean;
  showTimestamp: boolean;
  titleLines: number;
}

export const DENSITY_CONFIGS: Record<DensityMode, DensityConfig> = {
  compact: {
    mode: 'compact',
    itemHeight: 32,
    showDomain: false,
    showUrl: false,
    showTimestamp: false,
    titleLines: 1,
  },
  normal: {
    mode: 'normal',
    itemHeight: 48,
    showDomain: true,
    showUrl: false,
    showTimestamp: false,
    titleLines: 2,
  },
  spacious: {
    mode: 'spacious',
    itemHeight: 64,
    showDomain: false,
    showUrl: true,
    showTimestamp: true,
    titleLines: 3,
  },
};

/**
 * Auto-select density mode based on tab count
 * - >50 tabs → compact
 * - 20-50 tabs → normal
 * - <20 tabs → spacious
 */
export function getAutoSelectedDensity(tabCount: number): DensityMode {
  if (tabCount > 50) return 'compact';
  if (tabCount >= 20) return 'normal';
  return 'spacious';
}

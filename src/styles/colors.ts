export type ThemeMode = 'light' | 'dark';

export interface AppPalette {
  mode: ThemeMode;
  textPrimary: string;
  textSecondary: string;
  bgLayout: string;
  bgContainer: string;
  headerBg: string;
  siderBg: string;
  menuText: string;
  menuTextSecondary: string;
  menuTextSelected: string;
  menuItemSelectedBg: string;
  borderColor: string;
  shadowColor: string;
  iconColor: string;
  iconColorActive: string;
}

export const lightPalette: AppPalette = {
  mode: 'light',
  textPrimary: '#1f2329',
  textSecondary: '#4b5563',
  bgLayout: '#f5f7fa',
  bgContainer: '#ffffff',
  headerBg: '#ffffff',
  siderBg: '#ffffff',
  menuText: '#1f2329',
  menuTextSecondary: '#6b7280',
  menuTextSelected: '#0f62fe',
  menuItemSelectedBg: '#e8f2ff',
  borderColor: '#e5e7eb',
  shadowColor: 'rgba(15, 24, 40, 0.08)',
  iconColor: 'rgba(0, 0, 0, 0.45)',
  iconColorActive: '#0f62fe',
};

export const darkPalette: AppPalette = {
  mode: 'dark',
  textPrimary: '#e6f1ff',
  textSecondary: 'rgba(229, 234, 244, 0.65)',
  bgLayout: '#0f111a',
  bgContainer: '#141414',
  headerBg: '#141414',
  siderBg: '#1f1f1f',
  menuText: '#d3d7de',
  menuTextSecondary: 'rgba(211, 215, 222, 0.65)',
  menuTextSelected: '#ffffff',
  menuItemSelectedBg: 'rgba(15, 98, 254, 0.25)',
  borderColor: 'rgba(255, 255, 255, 0.12)',
  shadowColor: 'rgba(0, 0, 0, 0.35)',
  iconColor: 'rgba(255, 255, 255, 0.65)',
  iconColorActive: '#3d8bfd',
};

export const getPalette = (mode: ThemeMode): AppPalette =>
  mode === 'dark' ? darkPalette : lightPalette;

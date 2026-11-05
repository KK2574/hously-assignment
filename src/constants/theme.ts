export interface ThemeColors {
  background: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  text: string;
  textMuted: string;
  primary: string;
  primaryText: string;
  primarySoft: string;
  accent: string;
  danger: string;
  dangerSoft: string;
  success: string;
  successSoft: string;
  warning: string;
  warningSoft: string;
  overlay: string;
  shadow: string;
}

export const lightColors: ThemeColors = {
  background: '#F4F6FA',
  surface: '#FFFFFF',
  surfaceAlt: '#EEF2F8',
  border: '#E1E6EF',
  text: '#0B1F44',
  textMuted: '#64708A',
  primary: '#1565D8',
  primaryText: '#FFFFFF',
  primarySoft: '#E6EFFD',
  accent: '#F5B700',
  danger: '#DC2626',
  dangerSoft: '#FDECEC',
  success: '#16A34A',
  successSoft: '#E5F6EC',
  warning: '#D97706',
  warningSoft: '#FDF1DC',
  overlay: 'rgba(11, 31, 68, 0.5)',
  shadow: '#0B1F44',
};

export const darkColors: ThemeColors = {
  background: '#0A1220',
  surface: '#121C2E',
  surfaceAlt: '#1A2740',
  border: '#24334F',
  text: '#EAF0FB',
  textMuted: '#93A1BC',
  primary: '#4B8DF8',
  primaryText: '#FFFFFF',
  primarySoft: '#16284A',
  accent: '#F5B700',
  danger: '#F26D6D',
  dangerSoft: '#3A1B1F',
  success: '#34C26B',
  successSoft: '#123222',
  warning: '#F0A93B',
  warningSoft: '#3A2A10',
  overlay: 'rgba(0, 0, 0, 0.65)',
  shadow: '#000000',
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 8, md: 12, lg: 16, pill: 999 } as const;
export const fontSize = { xs: 11, sm: 13, md: 15, lg: 17, xl: 22, xxl: 28 } as const;

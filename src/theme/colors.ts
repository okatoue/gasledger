export interface Colors {
  primary: string;
  primaryLight: string;
  primaryDark: string;
  primaryBg: string;
  secondary: string;
  secondaryLight: string;
  background: string;
  surface: string;
  surfaceSecondary: string;
  text: string;
  textSecondary: string;
  textTertiary: string;
  border: string;
  error: string;
  warning: string;
  success: string;
  white: string;
  black: string;
}

export const lightColors: Colors = {
  primary: '#2563EB',
  primaryLight: '#60A5FA',
  primaryDark: '#1D4ED8',
  primaryBg: '#EFF6FF',
  secondary: '#10B981',
  secondaryLight: '#6EE7B7',
  background: '#F9FAFB',
  surface: '#FFFFFF',
  surfaceSecondary: '#F3F4F6',
  text: '#111827',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
  border: '#E5E7EB',
  error: '#EF4444',
  warning: '#F59E0B',
  success: '#10B981',
  white: '#FFFFFF',
  black: '#000000',
};

export const darkColors: Colors = {
  primary: '#3B82F6',
  primaryLight: '#60A5FA',
  primaryDark: '#2563EB',
  primaryBg: '#1E3A5F',
  secondary: '#34D399',
  secondaryLight: '#6EE7B7',
  background: '#0F172A',
  surface: '#1E293B',
  surfaceSecondary: '#334155',
  text: '#F1F5F9',
  textSecondary: '#94A3B8',
  textTertiary: '#64748B',
  border: '#334155',
  error: '#EF4444',
  warning: '#FBBF24',
  success: '#34D399',
  white: '#FFFFFF',
  black: '#000000',
};

// Backward compat — existing static imports still work during migration
export const colors = lightColors;

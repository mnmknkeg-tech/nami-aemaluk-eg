import { DesignTokens } from '../../types/builder';

export const defaultDesignTokens: DesignTokens = {
  colors: {
    primary: '#1d4ed8', // Royal Blue
    primaryHover: '#1e40af',
    secondary: '#0f172a', // Deep Slate
    accent: '#06b6d4', // Modern Cyan/Teal
    background: '#ffffff',
    surface: '#f8fafc',
    textPrimary: '#0f172a',
    textSecondary: '#475569',
    textMuted: '#94a3b8',
    border: '#e2e8f0',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
  },
  typography: {
    fontHeading: 'Tajawal, sans-serif',
    fontBody: 'Cairo, sans-serif',
    scaleRatio: 1.25,
    baseFontSize: '16px',
  },
  radius: {
    sm: '6px',
    md: '10px',
    lg: '16px',
    xl: '24px',
    full: '9999px',
  },
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.08), 0 2px 4px -1px rgba(0, 0, 0, 0.04)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -2px rgba(0, 0, 0, 0.03)',
    glow: '0 0 20px rgba(29, 78, 216, 0.25)',
  },
  spacingUnit: 4,
};

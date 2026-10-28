/**
 * App colors for light and dark mode.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#0F172A',
    background: '#FFFFFF',
    backgroundElement: '#F1F5F4',
    backgroundSelected: '#E2E8E6',
    textSecondary: '#64748B',
    border: '#E2E8F0',
    tint: '#16A34A',
    onTint: '#FFFFFF',
    track: '#E2E8F0',
    protein: '#3B82F6',
    fat: '#F59E0B',
    carbs: '#A855F7',
    water: '#0EA5E9',
    danger: '#DC2626',
  },
  dark: {
    text: '#F8FAFC',
    background: '#0B0F0E',
    backgroundElement: '#18201E',
    backgroundSelected: '#24302D',
    textSecondary: '#94A3B8',
    border: '#24302D',
    tint: '#22C55E',
    onTint: '#04120A',
    track: '#2A3533',
    protein: '#60A5FA',
    fat: '#FBBF24',
    carbs: '#C084FC',
    water: '#38BDF8',
    danger: '#F87171',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radius = 16;

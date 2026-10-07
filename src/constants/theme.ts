/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * These derive from DesignSystem to ensure theme consistency.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';
import { DesignSystem } from './design-system';

export const Colors = {
  light: {
    text: DesignSystem.colors.light.text,
    background: DesignSystem.colors.light.surface,
    backgroundElement: DesignSystem.colors.light.surfaceVariant,
    backgroundSelected: DesignSystem.colors.light.surfaceAlt,
    textSecondary: DesignSystem.colors.light.textSecondary,
  },
  dark: {
    text: DesignSystem.colors.dark.text,
    background: DesignSystem.colors.dark.surface,
    backgroundElement: DesignSystem.colors.dark.surfaceVariant,
    backgroundSelected: DesignSystem.colors.dark.surfaceAlt,
    textSecondary: DesignSystem.colors.dark.textSecondary,
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

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;

import { Platform, StyleSheet, Text, type TextProps } from 'react-native';

import { Fonts, ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedTextProps = TextProps & {
  type?: 'default' | 'title' | 'small' | 'smallBold' | 'subtitle' | 'link' | 'linkPrimary' | 'code' | 'titleSmall' | 'titleMedium' | 'titleLarge' | 'bodySmall' | 'bodyMedium' | 'bodyLarge' | 'labelSmall' | 'labelMedium' | 'labelLarge';
  themeColor?: ThemeColor;
};

export function ThemedText({ style, type = 'default', themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();

  return (
    <Text
      style={[
        { color: theme[themeColor ?? 'text'] },
        type === 'default' && styles.default,
        type === 'title' && styles.title,
        type === 'small' && styles.small,
        type === 'smallBold' && styles.smallBold,
        type === 'subtitle' && styles.subtitle,
        type === 'link' && styles.link,
        type === 'linkPrimary' && styles.linkPrimary,
        type === 'code' && styles.code,
        type === 'titleSmall' && styles.titleSmall,
        type === 'titleMedium' && styles.titleMedium,
        type === 'titleLarge' && styles.titleLarge,
        type === 'bodySmall' && styles.bodySmall,
        type === 'bodyMedium' && styles.bodyMedium,
        type === 'bodyLarge' && styles.bodyLarge,
        type === 'labelSmall' && styles.labelSmall,
        type === 'labelMedium' && styles.labelMedium,
        type === 'labelLarge' && styles.labelLarge,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  small: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: 500,
  },
  smallBold: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: 700,
  },
  default: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: 500,
  },
  title: {
    fontSize: 48,
    fontWeight: 600,
    lineHeight: 52,
  },
  subtitle: {
    fontSize: 32,
    lineHeight: 44,
    fontWeight: 600,
  },
  link: {
    lineHeight: 30,
    fontSize: 14,
  },
  linkPrimary: {
    lineHeight: 30,
    fontSize: 14,
    color: '#3c87f7',
  },
  code: {
    fontFamily: Fonts.mono,
    fontWeight: Platform.select({ android: 700 }) ?? 500,
    fontSize: 12,
  },
  titleSmall: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: 600,
  },
  titleMedium: {
    fontSize: 18,
    lineHeight: 26,
    fontWeight: 600,
  },
  titleLarge: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: 600,
  },
  bodySmall: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: 500,
  },
  bodyMedium: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: 500,
  },
  bodyLarge: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: 500,
  },
  labelSmall: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: 600,
  },
  labelMedium: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: 600,
  },
  labelLarge: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: 600,
  },
});

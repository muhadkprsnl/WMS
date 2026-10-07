import { StyleSheet, Text, type TextProps } from 'react-native';

export type ShareCardTextProps = TextProps & {
  type?: 'bodySmall' | 'titleSmall';
};

/**
 * Text component for shareable card content.
 *
 * Uses plain React Native Text (not ThemedText) to prevent
 * app theme colors from overriding explicit share card colors.
 * Share cards must be readable on their white/light background
 * regardless of app dark mode.
 */
export function ShareCardText({ style, type = 'bodySmall', ...rest }: ShareCardTextProps) {
  return (
    <Text
      style={[
        type === 'bodySmall' && styles.bodySmall,
        type === 'titleSmall' && styles.titleSmall,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  bodySmall: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
  },
  titleSmall: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600',
  },
});

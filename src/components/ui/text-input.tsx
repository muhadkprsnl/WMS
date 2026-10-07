import {
  TextInput as RNTextInput,
  View,
  TextInputProps as RNTextInputProps,
  useColorScheme,
} from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { DesignSystem } from '@/constants/design-system';

interface TextInputProps extends Omit<RNTextInputProps, 'placeholderTextColor'> {
  label?: string;
  error?: string;
  hint?: string;
  containerStyle?: any;
}

export function TextInput({
  label,
  error,
  hint,
  containerStyle,
  style,
  editable = true,
  ...rest
}: TextInputProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = isDark ? DesignSystem.colors.dark : DesignSystem.colors.light;

  return (
    <View style={containerStyle}>
      {label && (
        <ThemedText type="labelMedium" style={{ marginBottom: DesignSystem.spacing.xs }}>
          {label}
        </ThemedText>
      )}
      <RNTextInput
        editable={editable}
        style={[
          {
            height: DesignSystem.touchTargets.comfortable,
            paddingHorizontal: DesignSystem.spacing.md,
            paddingVertical: DesignSystem.spacing.sm,
            borderWidth: 1,
            borderColor: error ? colors.error : colors.border,
            borderRadius: DesignSystem.borderRadius.md,
            backgroundColor: isDark ? DesignSystem.colors.dark.surfaceVariant : DesignSystem.colors.light.surfaceAlt,
            color: colors.text,
            fontSize: 14,
            fontWeight: '500',
          },
          !editable && { opacity: 0.5 },
          style,
        ]}
        placeholderTextColor={colors.textSecondary}
        {...rest}
      />
      {error && (
        <ThemedText
          style={{
            color: colors.error,
            marginTop: DesignSystem.spacing.xs,
            fontSize: 12,
          }}>
          {error}
        </ThemedText>
      )}
      {hint && !error && (
        <ThemedText
          themeColor="textSecondary"
          style={{
            marginTop: DesignSystem.spacing.xs,
            fontSize: 12,
          }}>
          {hint}
        </ThemedText>
      )}
    </View>
  );
}

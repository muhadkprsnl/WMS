import {
  Pressable,
  View,
  ViewProps,
  ActivityIndicator,
  useColorScheme,
} from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { DesignSystem } from '@/constants/design-system';
import { useColors } from '@/hooks/use-colors';

type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends Omit<ViewProps, 'children'> {
  onPress: () => void;
  children: string | React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  testID?: string;
}

export function Button({
  onPress,
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  fullWidth = false,
  icon,
  testID,
  style,
  ...rest
}: ButtonProps) {
  const colorScheme = useColorScheme();
  const themeColors = DesignSystem.colors[colorScheme === 'dark' ? 'dark' : 'light'];

  const colorMap = {
    primary: {
      bg: themeColors.primary,
      text: themeColors.onPrimary,
      pressed: themeColors.primaryDark,
    },
    secondary: {
      bg: themeColors.surfaceAlt,
      text: themeColors.text,
      pressed: themeColors.border,
    },
    tertiary: {
      bg: 'transparent',
      text: themeColors.primary,
      pressed: themeColors.overlayLight,
    },
    danger: {
      bg: themeColors.error,
      text: themeColors.onError,
      pressed: themeColors.primaryDark,
    },
  };

  const sizeMap = {
    sm: {
      height: 36,
      paddingHorizontal: DesignSystem.spacing.sm,
      fontSize: 12,
    },
    md: {
      height: 44,
      paddingHorizontal: DesignSystem.spacing.md,
      fontSize: 14,
    },
    lg: {
      height: 56,
      paddingHorizontal: DesignSystem.spacing.lg,
      fontSize: 16,
    },
  };

  const colors = colorMap[variant];
  const sizeConfig = sizeMap[size];
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      testID={testID}
      accessible={true}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled }}>
      {({ pressed }) => (
        <View
          style={[
            {
              height: sizeConfig.height,
              paddingHorizontal: sizeConfig.paddingHorizontal,
              borderRadius: DesignSystem.borderRadius.md,
              backgroundColor: pressed ? colors.pressed : colors.bg,
              justifyContent: 'center',
              alignItems: 'center',
              flexDirection: 'row',
              gap: DesignSystem.spacing.sm,
              opacity: isDisabled ? 0.5 : 1,
              width: fullWidth ? '100%' : 'auto',
              ...(variant !== 'tertiary' && DesignSystem.elevation.sm),
            },
            style,
          ]}
          {...rest}>
          {loading ? (
            <ActivityIndicator color={colors.text} size="small" />
          ) : (
            <>
              {icon}
              {typeof children === 'string' ? (
                <ThemedText
                  type="labelMedium"
                  style={{
                    color: colors.text,
                    fontSize: sizeConfig.fontSize,
                  }}>
                  {children}
                </ThemedText>
              ) : (
                children
              )}
            </>
          )}
        </View>
      )}
    </Pressable>
  );
}

export function PrimaryButton(props: Omit<ButtonProps, 'variant'>) {
  return <Button {...props} variant="primary" />;
}

export function SecondaryButton(props: Omit<ButtonProps, 'variant'>) {
  return <Button {...props} variant="secondary" />;
}

export function TertiaryButton(props: Omit<ButtonProps, 'variant'>) {
  return <Button {...props} variant="tertiary" />;
}

export function DangerButton(props: Omit<ButtonProps, 'variant'>) {
  return <Button {...props} variant="danger" />;
}

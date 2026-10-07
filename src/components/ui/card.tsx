import { View, ViewProps, useColorScheme } from 'react-native';
import { DesignSystem } from '@/constants/design-system';

interface CardProps extends ViewProps {
  children: React.ReactNode;
  elevated?: boolean;
}

export function Card({ children, elevated = true, style, ...rest }: CardProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <View
      style={[
        {
          backgroundColor: isDark ? DesignSystem.colors.dark.surfaceVariant : DesignSystem.colors.light.surface,
          borderRadius: DesignSystem.borderRadius.lg,
          padding: DesignSystem.spacing.md,
          ...(elevated ? DesignSystem.elevation.sm : DesignSystem.elevation.none),
        },
        style,
      ]}
      {...rest}>
      {children}
    </View>
  );
}

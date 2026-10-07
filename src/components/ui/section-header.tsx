import { View, ViewProps } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { DesignSystem } from '@/constants/design-system';

interface SectionHeaderProps extends ViewProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export function SectionHeader({ title, subtitle, action, style, ...rest }: SectionHeaderProps) {
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingHorizontal: DesignSystem.spacing.md,
          paddingVertical: DesignSystem.spacing.md,
        },
        style,
      ]}
      {...rest}>
      <View style={{ flex: 1 }}>
        <ThemedText type="titleMedium">{title}</ThemedText>
        {subtitle && (
          <ThemedText
            themeColor="textSecondary"
            type="bodySmall"
            style={{ marginTop: DesignSystem.spacing.xs }}>
            {subtitle}
          </ThemedText>
        )}
      </View>
      {action && <View style={{ marginLeft: DesignSystem.spacing.md }}>{action}</View>}
    </View>
  );
}

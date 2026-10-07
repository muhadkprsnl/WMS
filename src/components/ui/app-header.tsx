import { View, Pressable } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { DesignSystem } from '@/constants/design-system';

export interface AppHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  onBack?: () => void;
}

export function AppHeader({ title, subtitle, action, onBack }: AppHeaderProps) {
  return (
    // Use spacing.lg for top padding since Screen now applies the safe area top inset
    <View style={{ paddingHorizontal: DesignSystem.spacing.md, paddingTop: DesignSystem.spacing.lg }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        {onBack && (
          <Pressable
            onPress={onBack}
            hitSlop={8}
            style={{
              width: DesignSystem.touchTargets.min,
              height: DesignSystem.touchTargets.min,
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: DesignSystem.spacing.sm,
            }}
          >
            <ThemedText style={{ fontSize: 20, fontWeight: '600' }}>←</ThemedText>
          </Pressable>
        )}
        <View style={{ flex: 1 }}>
          <ThemedText type="titleMedium">{title}</ThemedText>
          {subtitle && (
            <ThemedText
              themeColor="textSecondary"
              type="bodySmall"
              style={{ marginTop: DesignSystem.spacing.xs }}
            >
              {subtitle}
            </ThemedText>
          )}
        </View>
        {action && <View style={{ marginLeft: DesignSystem.spacing.md }}>{action}</View>}
      </View>
    </View>
  );
}

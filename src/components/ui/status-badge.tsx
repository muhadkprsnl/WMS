import { View, ViewProps, useColorScheme } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { DesignSystem } from '@/constants/design-system';

type StatusType = 'paid' | 'pending' | 'partial' | 'advance' | 'success' | 'warning' | 'error' | 'info';

interface StatusBadgeProps extends ViewProps {
  status: StatusType;
  children: string;
}

export function StatusBadge({ status, children, style, ...rest }: StatusBadgeProps) {
  const colorScheme = useColorScheme();
  const colors = DesignSystem.colors[colorScheme === 'dark' ? 'dark' : 'light'];

  const statusMap = {
    paid: { bg: colors.success, text: colors.onSuccess },
    pending: { bg: colors.warning, text: colors.onWarning },
    partial: { bg: colors.info, text: colors.onInfo },
    advance: { bg: colors.primary, text: colors.onPrimary },
    success: { bg: colors.success, text: colors.onSuccess },
    warning: { bg: colors.warning, text: colors.onWarning },
    error: { bg: colors.error, text: colors.onError },
    info: { bg: colors.info, text: colors.onInfo },
  };

  const config = statusMap[status];

  return (
    <View
      style={[
        {
          backgroundColor: config.bg,
          borderRadius: DesignSystem.borderRadius.full,
          paddingVertical: DesignSystem.spacing.xs,
          paddingHorizontal: DesignSystem.spacing.sm,
          alignSelf: 'flex-start',
        },
        style,
      ]}
      {...rest}>
      <ThemedText
        type="labelSmall"
        style={{
          color: config.text,
          fontSize: 11,
        }}>
        {children}
      </ThemedText>
    </View>
  );
}

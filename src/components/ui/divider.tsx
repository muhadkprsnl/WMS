import { View, ViewProps, useColorScheme } from 'react-native';
import { DesignSystem } from '@/constants/design-system';

interface DividerProps extends ViewProps {
  vertical?: boolean;
}

export function Divider({ vertical = false, style, ...rest }: DividerProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const borderColor = isDark ? DesignSystem.colors.dark.border : DesignSystem.colors.light.border;

  return (
    <View
      style={[
        vertical
          ? {
              width: 1,
              height: '100%',
              backgroundColor: borderColor,
            }
          : {
              height: 1,
              width: '100%',
              backgroundColor: borderColor,
            },
        style,
      ]}
      {...rest}
    />
  );
}

import { SafeAreaView as RNSafeAreaView } from 'react-native-safe-area-context';
import { ScrollView, View, ViewProps, useColorScheme } from 'react-native';
import { DesignSystem } from '@/constants/design-system';

interface ScreenProps extends ViewProps {
  scrollable?: boolean;
  children: React.ReactNode;
  edges?: ('top' | 'right' | 'bottom' | 'left')[];
}

export function Screen({
  scrollable = true,
  children,
  edges = ['top', 'right', 'left', 'bottom'],
  style,
  ...rest
}: ScreenProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const backgroundColor = isDark ? DesignSystem.colors.dark.surface : DesignSystem.colors.light.surface;

  const content = (
    <View
      style={[
        {
          flex: 1,
          backgroundColor,
        },
        style,
      ]}
      {...rest}>
      {children}
    </View>
  );

  if (scrollable) {
    return (
      <RNSafeAreaView style={{ flex: 1, backgroundColor }} edges={edges}>
        <ScrollView
          scrollEnabled={true}
          contentContainerStyle={{ flexGrow: 1 }}
          bounces={false}>
          {content}
        </ScrollView>
      </RNSafeAreaView>
    );
  }

  return (
    <RNSafeAreaView style={{ flex: 1, backgroundColor }} edges={edges}>
      {content}
    </RNSafeAreaView>
  );
}

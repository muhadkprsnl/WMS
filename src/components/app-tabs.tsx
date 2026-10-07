import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useColorScheme } from 'react-native';

import { Colors } from '@/constants/theme';

export default function AppTabs() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];

  return (
    <NativeTabs
      backgroundColor={colors.background}
      indicatorColor={colors.backgroundElement}
      labelStyle={{ selected: { color: colors.text } }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={require('@/assets/images/tabIcons/home.png')}
          renderingMode="template"
          md="home"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="members">
        <NativeTabs.Trigger.Label>Members</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          md="group"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="water">
        <NativeTabs.Trigger.Label>Water</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          md="water_drop"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="more">
        <NativeTabs.Trigger.Label>More</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          md="more_horiz"
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

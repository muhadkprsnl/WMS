import { View } from 'react-native';
import { router } from 'expo-router';
import { Screen, AppHeader, Card, PrimaryButton, Divider } from '@/components/ui';
import { ThemedText } from '@/components/themed-text';
import { DesignSystem } from '@/constants/design-system';

export default function MoreScreen() {
  return (
    <Screen>
      <AppHeader title="More" />
      <View style={{ paddingHorizontal: DesignSystem.spacing.md, paddingTop: DesignSystem.spacing.lg }}>
        <Card style={{ gap: DesignSystem.spacing.md, marginTop: DesignSystem.spacing.lg }}>
          <View>
            <ThemedText type="titleSmall">Collection Management</ThemedText>
            <ThemedText type="bodySmall" themeColor="textSecondary" style={{ marginTop: DesignSystem.spacing.xs }}>
              View collector balances and manage handovers
            </ThemedText>
          </View>
          <PrimaryButton onPress={() => router.push('/collection-dashboard')} fullWidth>
            Manage Collection
          </PrimaryButton>

          <Divider style={{ marginVertical: DesignSystem.spacing.md }} />

          <View>
            <ThemedText type="titleSmall">History</ThemedText>
            <ThemedText type="bodySmall" themeColor="textSecondary" style={{ marginTop: DesignSystem.spacing.xs }}>
              View all transactions
            </ThemedText>
          </View>
          <PrimaryButton onPress={() => router.push('/history')} fullWidth>
            View History
          </PrimaryButton>

          <Divider style={{ marginVertical: DesignSystem.spacing.md }} />

          <View>
            <ThemedText type="titleSmall">Payments</ThemedText>
            <ThemedText type="bodySmall" themeColor="textSecondary" style={{ marginTop: DesignSystem.spacing.xs }}>
              View all member payments by month
            </ThemedText>
          </View>
          <PrimaryButton onPress={() => router.push('/payments')} fullWidth>
            View Payments
          </PrimaryButton>

          <Divider style={{ marginVertical: DesignSystem.spacing.md }} />

          <View>
            <ThemedText type="titleSmall">Statistics</ThemedText>
            <ThemedText type="bodySmall" themeColor="textSecondary" style={{ marginTop: DesignSystem.spacing.xs }}>
              Payment trends and collector performance
            </ThemedText>
          </View>
          <PrimaryButton onPress={() => router.push('/payment-stats')} fullWidth>
            View Statistics
          </PrimaryButton>

          <Divider style={{ marginVertical: DesignSystem.spacing.md }} />

          <View>
            <ThemedText type="titleSmall">Settings</ThemedText>
            <ThemedText type="bodySmall" themeColor="textSecondary" style={{ marginTop: DesignSystem.spacing.xs }}>
              Configure app values
            </ThemedText>
          </View>
          <PrimaryButton onPress={() => router.push('/water-settings')} fullWidth>
            Go to Settings
          </PrimaryButton>
        </Card>
      </View>
    </Screen>
  );
}

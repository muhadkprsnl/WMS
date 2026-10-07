import { useState, useCallback } from 'react';
import { View, ScrollView, Alert } from 'react-native';
import { useFocusEffect, useLocalSearchParams, router } from 'expo-router';
import { Screen, Card, LoadingState, ErrorState, PrimaryButton, AppHeader } from '@/components/ui';
import { PaymentForm, PaymentFormValues } from '@/components/forms/payment-form';
import { getMemberById, getSettings } from '@/database';
import { recordPayment } from '@/services/paymentAllocationService';
import { DesignSystem } from '@/constants/design-system';
import { useColors } from '@/hooks/use-colors';
import { ThemedText } from '@/components/themed-text';
import { Member, Settings } from '@/types/database';

export default function RecordPaymentScreen() {
  const { id, month } = useLocalSearchParams();
  const memberId = typeof id === 'string' ? parseInt(id, 10) : 0;

  const colors = useColors();

  // Determine default payment date based on the month context
  // If called from Members tab with a selected month that's not today, default to 1st of that month
  // Otherwise, default to today (existing behavior)
  const getDefaultPaymentDate = (): string => {
    const today = new Date().toISOString().split('T')[0];
    const currentMonth = today.slice(0, 7);

    // Validate month param is in YYYY-MM format
    if (typeof month === 'string' && /^\d{4}-\d{2}$/.test(month)) {
      // If month is different from current month, use 1st of that month
      if (month !== currentMonth) {
        console.log(`[RecordPayment] Defaulting payment date to 1st of selected month: ${month}-01`);
        return `${month}-01`;
      }
    }

    // Default to today (current month or no month passed)
    return today;
  };

  const [member, setMember] = useState<Member | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadMember = useCallback(async () => {
    if (!memberId) return;

    try {
      setLoading(true);
      const [loaded, appSettings] = await Promise.all([
        getMemberById(memberId),
        getSettings(),
      ]);
      if (!loaded) {
        setError('Member not found');
      } else {
        setMember(loaded);
        setSettings(appSettings);
        setError(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load member');
    } finally {
      setLoading(false);
    }
  }, [memberId]);

  useFocusEffect(
    useCallback(() => {
      loadMember();
    }, [loadMember])
  );

  const handleSubmit = async (values: PaymentFormValues) => {
    if (!member) return;

    try {
      const amount = parseFloat(values.amount);
      // Convert AED to fils (minor units)
      const amountInFils = Math.round(amount * 100);

      await recordPayment(
        member.id,
        amountInFils,
        values.paymentDate,
        values.paymentMode,
        values.collectorId ? parseInt(values.collectorId, 10) : undefined,
        undefined, // screenshot_uri
        values.notes || undefined
      );

      Alert.alert('Success', `Payment of AED ${amount.toFixed(2)} recorded for ${member.name}`, [
        {
          text: 'OK',
          onPress: () => {
            router.back();
          },
        },
      ]);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to record payment';
      Alert.alert('Error', message);
    }
  };

  if (loading) {
    return (
      <Screen>
        <LoadingState message="Loading member..." />
      </Screen>
    );
  }

  if (error || !member) {
    return (
      <Screen>
        <ErrorState
          title="Error"
          description={error || 'Member not found'}
          action={<PrimaryButton onPress={() => router.back()}>Go Back</PrimaryButton>}
        />
      </Screen>
    );
  }

  return (
    <Screen scrollable>
      <AppHeader title="Record Payment" />
      <ScrollView>
        <View style={{ paddingHorizontal: DesignSystem.spacing.md, paddingVertical: DesignSystem.spacing.lg }}>
          <Card style={{ marginBottom: DesignSystem.spacing.lg }}>
            <View style={{ paddingBottom: DesignSystem.spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border }}>
              <ThemedText type="bodySmall" themeColor="textSecondary">
                For: {member.name}
              </ThemedText>
              {member.phone && (
                <ThemedText type="bodySmall" themeColor="textSecondary" style={{ marginTop: DesignSystem.spacing.xs }}>
                  {member.phone}
                </ThemedText>
              )}
            </View>

            <View style={{ paddingTop: DesignSystem.spacing.md }}>
              <PaymentForm
                onSubmit={handleSubmit}
                memberId={member.id}
                submitLabel="Record Payment"
                initialValues={{
                  amount: settings ? (settings.monthly_contribution / 100).toFixed(2) : '',
                  paymentDate: getDefaultPaymentDate(),
                }}
              />
            </View>
          </Card>

          <ThemedText
            type="bodySmall"
            themeColor="textSecondary"
            style={{ textAlign: 'center' }}
          >
            Payment will be recorded with today's timestamp.
          </ThemedText>
        </View>
      </ScrollView>
    </Screen>
  );
}

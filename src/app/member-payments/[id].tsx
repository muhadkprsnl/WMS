import { useCallback, useState } from 'react';
import { View, FlatList } from 'react-native';
import { useFocusEffect, useLocalSearchParams, router } from 'expo-router';
import { Screen, Card, LoadingState, ErrorState, PrimaryButton, EmptyState, AppHeader } from '@/components/ui';
import { ThemedText } from '@/components/themed-text';
import { getMemberById, getPaymentsByMember } from '@/database';
import { DesignSystem } from '@/constants/design-system';
import { useColors } from '@/hooks/use-colors';
import { Member, Payment } from '@/types/database';

export default function MemberPaymentsScreen() {
  const { id } = useLocalSearchParams();
  const memberId = typeof id === 'string' ? parseInt(id, 10) : 0;

  const colors = useColors();

  const [member, setMember] = useState<Member | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!memberId) return;

    try {
      setLoading(true);
      const [memberData, paymentsData] = await Promise.all([
        getMemberById(memberId),
        getPaymentsByMember(memberId),
      ]);

      if (!memberData) {
        setError('Member not found');
      } else {
        setMember(memberData);
        setPayments(paymentsData);
        setError(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load payments');
    } finally {
      setLoading(false);
    }
  }, [memberId]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const formatAmount = (fils: number) => {
    const aed = fils / 100;
    return `AED ${aed.toFixed(2)}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getPaymentModeLabel = (mode: string) => {
    const modes: Record<string, string> = {
      cash: 'Cash',
      bank_transfer: 'Bank Transfer',
      google_pay: 'Google Pay',
      other: 'Other',
    };
    return modes[mode] || mode;
  };

  const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0);

  if (loading) {
    return (
      <Screen>
        <LoadingState message="Loading payments..." />
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
    <Screen scrollable={false}>
      <AppHeader title={member?.name || 'Member Payments'} />
      <View style={{ paddingHorizontal: DesignSystem.spacing.md, paddingTop: DesignSystem.spacing.lg }}>
        <Card style={{ marginBottom: DesignSystem.spacing.lg }}>
          <View style={{ marginBottom: DesignSystem.spacing.md, paddingBottom: DesignSystem.spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border }}>
            {member.phone && (
              <ThemedText type="bodySmall" themeColor="textSecondary" style={{ marginTop: DesignSystem.spacing.xs }}>
                {member.phone}
              </ThemedText>
            )}
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View>
              <ThemedText type="bodySmall" themeColor="textSecondary">
                Total Paid
              </ThemedText>
              <ThemedText type="titleLarge" style={{ marginTop: DesignSystem.spacing.xs }}>
                {formatAmount(totalAmount)}
              </ThemedText>
            </View>

            <PrimaryButton
              onPress={() => router.push({ pathname: '/record-payment/[id]', params: { id: member.id.toString() } })}
              size="sm"
            >
              + Record
            </PrimaryButton>
          </View>
        </Card>
      </View>

      <View
        style={{
          paddingHorizontal: DesignSystem.spacing.md,
          marginBottom: DesignSystem.spacing.md,
        }}
      >
        <ThemedText type="titleSmall">Payment History</ThemedText>
      </View>

      {payments.length === 0 ? (
        <View style={{ paddingHorizontal: DesignSystem.spacing.md, flex: 1 }}>
          <EmptyState
            title="No Payments"
            description="No payments recorded for this member yet"
            action={
              <PrimaryButton
                onPress={() => router.push({ pathname: '/record-payment/[id]', params: { id: member.id.toString() } })}
              >
                Record First Payment
              </PrimaryButton>
            }
          />
        </View>
      ) : (
        <FlatList
          data={payments}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <Card
              style={{
                marginHorizontal: DesignSystem.spacing.md,
                marginVertical: DesignSystem.spacing.sm,
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ flex: 1 }}>
                  <ThemedText type="titleSmall">{formatAmount(item.amount)}</ThemedText>
                  <ThemedText
                    type="bodySmall"
                    themeColor="textSecondary"
                    style={{ marginTop: DesignSystem.spacing.xs }}
                  >
                    {formatDate(item.payment_date)} • {getPaymentModeLabel(item.payment_mode)}
                  </ThemedText>
                  {item.notes && (
                    <ThemedText
                      type="bodySmall"
                      themeColor="textSecondary"
                      style={{ marginTop: DesignSystem.spacing.xs }}
                    >
                      {item.notes}
                    </ThemedText>
                  )}
                </View>
              </View>
            </Card>
          )}
          scrollEnabled={true}
          contentContainerStyle={{
            paddingVertical: DesignSystem.spacing.md,
            paddingBottom: DesignSystem.spacing.lg,
          }}
        />
      )}
    </Screen>
  );
}

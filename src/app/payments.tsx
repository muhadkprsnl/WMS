import { useCallback, useState } from 'react';
import { View, FlatList, Pressable, useColorScheme } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Screen, EmptyState, Card, LoadingState, ErrorState, PrimaryButton, AppHeader } from '@/components/ui';
import { ThemedText } from '@/components/themed-text';
import { getPaymentsByMonth, getActiveMembers, getActiveCollectors } from '@/database';
import { DesignSystem } from '@/constants/design-system';
import { Payment, Member, Collector } from '@/types/database';

interface PaymentWithDetails extends Payment {
  memberName?: string;
  collectorName?: string;
}

const MONTHS = Array.from({ length: 12 }, (_, i) => {
  const date = new Date();
  date.setMonth(date.getMonth() - i);
  return date.toISOString().split('T')[0].substring(0, 7);
});

export default function PaymentsScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const primaryColor = isDark ? DesignSystem.colors.dark.primary : DesignSystem.colors.light.primary;

  const [selectedMonth, setSelectedMonth] = useState(MONTHS[0]);
  const [payments, setPayments] = useState<PaymentWithDetails[]>([]);
  const [members, setMembers] = useState<Map<number, string>>(new Map());
  const [collectors, setCollectors] = useState<Map<number, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [paymentsData, membersData, collectorsData] = await Promise.all([
        getPaymentsByMonth(selectedMonth),
        getActiveMembers(),
        getActiveCollectors(),
      ]);

      // Create lookup maps
      const memberMap = new Map(membersData.map((m) => [m.id, m.name]));
      const collectorMap = new Map(collectorsData.map((c) => [c.id, c.name]));

      setMembers(memberMap);
      setCollectors(collectorMap);

      // Enrich payment data with member/collector names
      const enriched = paymentsData.map((p) => ({
        ...p,
        memberName: memberMap.get(p.member_id),
        collectorName: p.collected_by ? collectorMap.get(p.collected_by) : undefined,
      }));

      setPayments(enriched);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load payments');
    } finally {
      setLoading(false);
    }
  }, [selectedMonth]);

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
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getPaymentModeLabel = (mode: string) => {
    const modes: Record<string, string> = {
      cash: '💵',
      bank_transfer: '🏦',
      google_pay: '📱',
      other: '📋',
    };
    return modes[mode] || mode;
  };

  const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0);
  const monthDate = new Date(selectedMonth + '-01');
  const monthLabel = monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  if (loading && payments.length === 0) {
    return (
      <Screen>
        <LoadingState message="Loading payments..." />
      </Screen>
    );
  }

  return (
    <Screen scrollable={false}>
      <AppHeader title="All Payments" />
      {/* Month Selector */}
      <View style={{ paddingHorizontal: DesignSystem.spacing.md, paddingTop: DesignSystem.spacing.lg }}>
        <ThemedText type="titleSmall" style={{ marginBottom: DesignSystem.spacing.md }}>
          Select Month
        </ThemedText>
        <View style={{ flexDirection: 'row', gap: DesignSystem.spacing.sm, marginBottom: DesignSystem.spacing.lg }}>
          {MONTHS.slice(0, 6).map((month) => (
            <Pressable
              key={month}
              onPress={() => setSelectedMonth(month)}
              style={{
                padding: DesignSystem.spacing.sm,
                paddingHorizontal: DesignSystem.spacing.md,
                borderRadius: DesignSystem.spacing.sm,
                backgroundColor:
                  selectedMonth === month
                    ? primaryColor
                    : DesignSystem.colors.light.border,
              }}
            >
              <ThemedText
                type="bodySmall"
                style={{
                  color: selectedMonth === month ? '#FFFFFF' : DesignSystem.colors.light.text,
                  fontWeight: selectedMonth === month ? '600' : '400',
                }}
              >
                {new Date(month + '-01').toLocaleDateString('en-US', { month: 'short' })}
              </ThemedText>
            </Pressable>
          ))}
        </View>
      </View>

      {error && (
        <View style={{ paddingHorizontal: DesignSystem.spacing.md, paddingTop: DesignSystem.spacing.lg }}>
          <ErrorState
            title="Error"
            description={error}
            action={<PrimaryButton onPress={loadData}>Retry</PrimaryButton>}
          />
        </View>
      )}

      {!error && payments.length === 0 ? (
        <View style={{ paddingHorizontal: DesignSystem.spacing.md, paddingTop: DesignSystem.spacing.lg, flex: 1 }}>
          <EmptyState
            title="No Payments"
            description={`No payments recorded for ${monthLabel}`}
          />
        </View>
      ) : (
        <>
          {/* Summary Card */}
          <View style={{ paddingHorizontal: DesignSystem.spacing.md, marginBottom: DesignSystem.spacing.lg }}>
            <Card>
              <View>
                <ThemedText type="bodySmall" themeColor="textSecondary">
                  {monthLabel} Total
                </ThemedText>
                <ThemedText type="titleLarge" style={{ marginTop: DesignSystem.spacing.sm }}>
                  {formatAmount(totalAmount)}
                </ThemedText>
                <ThemedText type="bodySmall" themeColor="textSecondary" style={{ marginTop: DesignSystem.spacing.sm }}>
                  {payments.length} payment{payments.length !== 1 ? 's' : ''}
                </ThemedText>
              </View>
            </Card>
          </View>

          {/* Payment List */}
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
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: DesignSystem.spacing.sm }}>
                      <ThemedText type="titleSmall">{item.memberName}</ThemedText>
                      <ThemedText type="bodySmall" themeColor="textSecondary">
                        {getPaymentModeLabel(item.payment_mode)}
                      </ThemedText>
                    </View>
                    <ThemedText
                      type="bodySmall"
                      themeColor="textSecondary"
                      style={{ marginTop: DesignSystem.spacing.xs }}
                    >
                      {formatDate(item.payment_date)}
                      {item.collectorName && ` • ${item.collectorName}`}
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
                  <ThemedText type="titleSmall" style={{ fontWeight: '600', marginLeft: DesignSystem.spacing.md }}>
                    {formatAmount(item.amount)}
                  </ThemedText>
                </View>
              </Card>
            )}
            scrollEnabled={true}
            contentContainerStyle={{
              paddingVertical: DesignSystem.spacing.md,
              paddingBottom: DesignSystem.spacing.lg,
            }}
          />
        </>
      )}
    </Screen>
  );
}

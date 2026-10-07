import { useCallback, useState } from 'react';
import { View, FlatList, Pressable } from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { Screen, Card, LoadingState, ErrorState, PrimaryButton, EmptyState, AppHeader } from '@/components/ui';
import { ThemedText } from '@/components/themed-text';
import { getWaterPurchasesWithCollectorByMonth } from '@/database';
import { getMonthlyWaterSummary } from '@/services/waterPurchaseService';
import { DesignSystem } from '@/constants/design-system';
import type { WaterPurchaseWithCollector } from '@/database/queries/water';

export default function WaterScreen() {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  });

  const [purchases, setPurchases] = useState<WaterPurchaseWithCollector[]>([]);
  const [monthlyExpense, setMonthlyExpense] = useState(0);
  const [monthlyWholesaleCanes, setMonthlyWholesaleCanes] = useState(0);
  const [monthlyWholesaleExpense, setMonthlyWholesaleExpense] = useState(0);
  const [monthlyRetailCanes, setMonthlyRetailCanes] = useState(0);
  const [monthlyRetailExpense, setMonthlyRetailExpense] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [purchasesData, summaryData] = await Promise.all([
        getWaterPurchasesWithCollectorByMonth(selectedMonth),
        getMonthlyWaterSummary(selectedMonth),
      ]);

      setPurchases(purchasesData);
      setMonthlyExpense(summaryData.totalExpense);
      setMonthlyWholesaleCanes(summaryData.wholesale.canes);
      setMonthlyWholesaleExpense(summaryData.wholesale.expense);
      setMonthlyRetailCanes(summaryData.retail.canes);
      setMonthlyRetailExpense(summaryData.retail.expense);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load water data');
    } finally {
      setLoading(false);
    }
  }, [selectedMonth]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const shiftMonth = (month: string, delta: number): string => {
    const [year, monthNum] = month.split('-').map(Number);
    const date = new Date(year, monthNum - 1, 1);
    date.setMonth(date.getMonth() + delta);
    const newYear = date.getFullYear();
    const newMonth = String(date.getMonth() + 1).padStart(2, '0');
    return `${newYear}-${newMonth}`;
  };

  const formatMonth = (month: string): string => {
    const [year, monthNum] = month.split('-').map(Number);
    const date = new Date(year, monthNum - 1, 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const formatAmount = (fils: number) => {
    const aed = fils / 100;
    return `AED ${aed.toFixed(2)}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const getPurchaseTypeLabel = (type: string) => {
    return type === 'wholesale' ? '🏭 Wholesale' : '🛒 Retail';
  };

  if (loading && purchases.length === 0) {
    return (
      <Screen>
        <LoadingState message="Loading water data..." />
      </Screen>
    );
  }

  return (
    <Screen scrollable={false}>
      <AppHeader
        title="Water"
        action={
          <PrimaryButton
            onPress={() => router.push('/water-settings')}
            size="sm"
          >
            Settings
          </PrimaryButton>
        }
      />

      <FlatList
        data={purchases}
        keyExtractor={(item) => item.id.toString()}
        ListHeaderComponent={
          <View style={{ paddingHorizontal: DesignSystem.spacing.md, paddingTop: DesignSystem.spacing.lg, paddingBottom: DesignSystem.spacing.md }}>
            {/* Month Selector */}
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: DesignSystem.spacing.sm,
                paddingVertical: DesignSystem.spacing.xs,
              }}
            >
              <Pressable
                onPress={() => setSelectedMonth(shiftMonth(selectedMonth, -1))}
                hitSlop={8}
                style={{
                  width: DesignSystem.touchTargets.min,
                  height: DesignSystem.touchTargets.min,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <ThemedText style={{ fontSize: 20, fontWeight: '600' }}>‹</ThemedText>
              </Pressable>

              <ThemedText type="titleSmall" style={{ fontWeight: '600' }}>
                {formatMonth(selectedMonth)}
              </ThemedText>

              <Pressable
                onPress={() => setSelectedMonth(shiftMonth(selectedMonth, 1))}
                hitSlop={8}
                style={{
                  width: DesignSystem.touchTargets.min,
                  height: DesignSystem.touchTargets.min,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <ThemedText style={{ fontSize: 20, fontWeight: '600' }}>›</ThemedText>
              </Pressable>
            </View>

            {error ? (
              <ErrorState
                title="Error"
                description={error}
                action={<PrimaryButton onPress={loadData}>Retry</PrimaryButton>}
              />
            ) : (
              <>
                {/* Monthly Summary Card */}
                <Card style={{ marginBottom: DesignSystem.spacing.lg }}>
                  <ThemedText type="titleSmall" style={{ fontWeight: '600', marginBottom: DesignSystem.spacing.md, textTransform: 'uppercase' }}>
                    {formatMonth(selectedMonth)}
                  </ThemedText>

                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      marginBottom: DesignSystem.spacing.lg,
                      paddingBottom: DesignSystem.spacing.lg,
                      borderBottomWidth: 1,
                      borderBottomColor: DesignSystem.colors.light.border,
                    }}
                  >
                    <View>
                      <ThemedText type="bodySmall" themeColor="textSecondary">
                        Total Expense
                      </ThemedText>
                      <ThemedText type="titleSmall" style={{ marginTop: DesignSystem.spacing.xs, fontWeight: '600' }}>
                        {formatAmount(monthlyExpense)}
                      </ThemedText>
                    </View>
                    <View>
                      <ThemedText type="bodySmall" themeColor="textSecondary" style={{ textAlign: 'right' }}>
                        Canes Replaced
                      </ThemedText>
                      <ThemedText type="titleSmall" style={{ marginTop: DesignSystem.spacing.xs, fontWeight: '600', textAlign: 'right' }}>
                        {Math.round(monthlyWholesaleCanes + monthlyRetailCanes)}
                      </ThemedText>
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', gap: DesignSystem.spacing.lg }}>
                    <View style={{ flex: 1 }}>
                      <ThemedText type="bodySmall" themeColor="textSecondary">
                        🏭 Wholesale
                      </ThemedText>
                      <ThemedText type="titleSmall" style={{ marginTop: DesignSystem.spacing.xs, fontWeight: '600' }}>
                        {Math.round(monthlyWholesaleCanes)} canes
                      </ThemedText>
                      <ThemedText type="bodySmall" themeColor="textSecondary" style={{ marginTop: DesignSystem.spacing.xs }}>
                        {formatAmount(monthlyWholesaleExpense)}
                      </ThemedText>
                    </View>
                    <View style={{ flex: 1 }}>
                      <ThemedText type="bodySmall" themeColor="textSecondary">
                        🛒 Retail
                      </ThemedText>
                      <ThemedText type="titleSmall" style={{ marginTop: DesignSystem.spacing.xs, fontWeight: '600' }}>
                        {Math.round(monthlyRetailCanes)} canes
                      </ThemedText>
                      <ThemedText type="bodySmall" themeColor="textSecondary" style={{ marginTop: DesignSystem.spacing.xs }}>
                        {formatAmount(monthlyRetailExpense)}
                      </ThemedText>
                    </View>
                  </View>
                </Card>

                {/* Purchase History Header */}
                {purchases.length > 0 && (
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: DesignSystem.spacing.md }}>
                    <ThemedText type="bodySmall" style={{ fontWeight: '600', textTransform: 'uppercase' }}>
                      Purchase History
                    </ThemedText>
                    <PrimaryButton
                      onPress={() => router.push('/water-purchase-form')}
                      size="sm"
                    >
                      + Add Purchase
                    </PrimaryButton>
                  </View>
                )}
              </>
            )}
          </View>
        }
        renderItem={({ item }) => (
          <Card
            style={{
              marginHorizontal: DesignSystem.spacing.md,
              marginVertical: DesignSystem.spacing.sm,
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={{ flex: 1 }}>
                <ThemedText type="bodySmall" themeColor="textSecondary">
                  {formatDate(item.purchase_date)}
                </ThemedText>
                <ThemedText type="titleSmall" style={{ marginTop: DesignSystem.spacing.xs, fontWeight: '600' }}>
                  {getPurchaseTypeLabel(item.purchase_type)}
                </ThemedText>
                {item.collector_name && (
                  <ThemedText type="bodySmall" themeColor="textSecondary" style={{ marginTop: DesignSystem.spacing.xs }}>
                    Paid by: {item.collector_name}
                  </ThemedText>
                )}
                <ThemedText
                  type="bodySmall"
                  themeColor="textSecondary"
                  style={{ marginTop: DesignSystem.spacing.xs }}
                >
                  {Math.round(item.quantity)} Canes × AED {(item.unit_price / 100).toFixed(2)}
                </ThemedText>
                {item.notes && (
                  <ThemedText
                    type="bodySmall"
                    themeColor="textSecondary"
                    style={{ marginTop: DesignSystem.spacing.xs, maxWidth: 200 }}
                    numberOfLines={2}
                  >
                    {item.notes}
                  </ThemedText>
                )}
                <ThemedText type="titleSmall" style={{ marginTop: DesignSystem.spacing.md, fontWeight: '600' }}>
                  {formatAmount(item.total_amount)}
                </ThemedText>
              </View>
              <Pressable
                onPress={() => router.push({ pathname: '/water-purchase-form', params: { id: item.id.toString() } })}
                style={{
                  paddingLeft: DesignSystem.spacing.lg,
                  justifyContent: 'center',
                  minWidth: 60,
                  alignItems: 'flex-end',
                }}
              >
                <ThemedText type="bodySmall" style={{ color: DesignSystem.colors.light.primary, fontWeight: '600' }}>
                  Edit
                </ThemedText>
              </Pressable>
            </View>
          </Card>
        )}
        ListEmptyComponent={
          !error ? (
            <View style={{ paddingHorizontal: DesignSystem.spacing.md, paddingVertical: DesignSystem.spacing.lg }}>
              <EmptyState
                title="No Water Purchases"
                description={`No water purchases recorded for ${formatMonth(selectedMonth)}`}
                action={
                  <PrimaryButton onPress={() => router.push('/water-purchase-form')}>
                    + Add Purchase
                  </PrimaryButton>
                }
              />
            </View>
          ) : null
        }
        scrollEnabled={true}
        contentContainerStyle={{
          paddingVertical: DesignSystem.spacing.md,
          paddingBottom: DesignSystem.spacing.lg,
        }}
      />
    </Screen>
  );
}

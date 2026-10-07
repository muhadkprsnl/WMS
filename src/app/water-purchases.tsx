import { useCallback, useState } from 'react';
import { View, FlatList } from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { Screen, Card, LoadingState, ErrorState, PrimaryButton, EmptyState, AppHeader } from '@/components/ui';
import { ThemedText } from '@/components/themed-text';
import { getWaterPurchases, getTotalWaterExpense, getTotalWaterQuantity } from '@/database';
import { DesignSystem } from '@/constants/design-system';
import { WaterPurchase } from '@/types/database';

export default function WaterPurchasesScreen() {
  const [purchases, setPurchases] = useState<WaterPurchase[]>([]);
  const [totalExpense, setTotalExpense] = useState(0);
  const [totalQuantity, setTotalQuantity] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [purchasesData, expenseData, quantityData] = await Promise.all([
        getWaterPurchases(),
        getTotalWaterExpense(),
        getTotalWaterQuantity(),
      ]);

      setPurchases(purchasesData);
      setTotalExpense(expenseData);
      setTotalQuantity(quantityData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load water purchases');
    } finally {
      setLoading(false);
    }
  }, []);

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

  const getPurchaseTypeLabel = (type: string) => {
    return type === 'wholesale' ? '🏭 Wholesale' : '🛒 Retail';
  };

  if (loading && purchases.length === 0) {
    return (
      <Screen>
        <LoadingState message="Loading water purchases..." />
      </Screen>
    );
  }

  return (
    <Screen scrollable={false}>
      <AppHeader title="Water Purchases" />
      {/* Summary Cards */}
      <View style={{ paddingHorizontal: DesignSystem.spacing.md, paddingTop: DesignSystem.spacing.lg }}>
        <View style={{ flexDirection: 'row', gap: DesignSystem.spacing.md, marginBottom: DesignSystem.spacing.lg }}>
          <Card style={{ flex: 1 }}>
            <ThemedText type="bodySmall" themeColor="textSecondary">
              Total Expense
            </ThemedText>
            <ThemedText type="titleMedium" style={{ marginTop: DesignSystem.spacing.xs }}>
              {formatAmount(totalExpense)}
            </ThemedText>
          </Card>

          <Card style={{ flex: 1 }}>
            <ThemedText type="bodySmall" themeColor="textSecondary">
              Total Quantity
            </ThemedText>
            <ThemedText type="titleMedium" style={{ marginTop: DesignSystem.spacing.xs }}>
              {totalQuantity.toFixed(0)} units
            </ThemedText>
          </Card>
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

      {!error && purchases.length === 0 ? (
        <View style={{ paddingHorizontal: DesignSystem.spacing.md, paddingTop: DesignSystem.spacing.lg, flex: 1 }}>
          <EmptyState
            title="No Water Purchases"
            description="Track water purchases to manage expenses"
            action={
              <PrimaryButton onPress={() => router.push('/water-purchase-form')}>
                Record First Purchase
              </PrimaryButton>
            }
          />
        </View>
      ) : (
        <>
          <View
            style={{
              paddingHorizontal: DesignSystem.spacing.md,
              marginBottom: DesignSystem.spacing.md,
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <ThemedText type="titleSmall">Purchase History</ThemedText>
            <PrimaryButton
              onPress={() => router.push('/water-purchase-form')}
              size="sm"
            >
              + Add
            </PrimaryButton>
          </View>

          <FlatList
            data={purchases}
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
                      <ThemedText type="titleSmall">{getPurchaseTypeLabel(item.purchase_type)}</ThemedText>
                    </View>
                    <ThemedText
                      type="bodySmall"
                      themeColor="textSecondary"
                      style={{ marginTop: DesignSystem.spacing.xs }}
                    >
                      {item.quantity.toFixed(2)} units @ AED {(item.unit_price / 100).toFixed(2)}
                    </ThemedText>
                    <ThemedText
                      type="bodySmall"
                      themeColor="textSecondary"
                      style={{ marginTop: DesignSystem.spacing.xs }}
                    >
                      {formatDate(item.purchase_date)}
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
                    {formatAmount(item.total_amount)}
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

import { useCallback, useState, useRef } from 'react';
import { View, FlatList, Pressable, Alert, useColorScheme } from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import ViewShot from 'react-native-view-shot';
import { Screen, Card, LoadingState, ErrorState, PrimaryButton, EmptyState, AppHeader } from '@/components/ui';
import { ThemedText } from '@/components/themed-text';
import { MonthlyWaterBillCard } from '@/components/monthly-water-bill-card';
import {
  getActiveMembers,
  getAllocationsByMonth,
  getTotalWaterExpenseByMonth,
  getWaterPurchasesByMonth,
  getCollectorStats,
  getActiveCollectors,
  getAllTransactions,
} from '@/database';
import { calculateMonthlyBalance, getMonthlyWaterBill, type MonthlyWaterBill } from '@/services/monthlyBalanceService';
import { shareDashboardSummary } from '@/services/dashboardShareService';
import { DesignSystem } from '@/constants/design-system';
import { useColors } from '@/hooks/use-colors';

interface DashboardData {
  month: string;
  waterBill: MonthlyWaterBill;
  expectedContributions: number;
  activeMembers: number;
  paidMembers: number;
  totalWaterQuantity: number;
  wholesaleQuantity: number;
  retailQuantity: number;
  totalHeld: number;
  activeCollectors: number;
  recentTransactions: any[];
}

export default function HomeScreen() {
  const colors = useColors();
  const colorScheme = useColorScheme();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);

  // Month selector state for Water Bill card
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [selectedWaterBill, setSelectedWaterBill] = useState<MonthlyWaterBill | null>(null);
  const [billLoading, setBillLoading] = useState(false);
  const requestIdRef = useRef(0);

  const shareRef = useRef(null);
  const currentMonth = new Date().toISOString().slice(0, 7);

  // Helper to shift month by delta (handles year boundaries)
  const shiftMonth = (month: string, delta: number): string => {
    const [yearStr, monthStr] = month.split('-');
    let year = parseInt(yearStr, 10);
    let monthNum = parseInt(monthStr, 10) + delta;

    while (monthNum > 12) {
      monthNum -= 12;
      year += 1;
    }
    while (monthNum < 1) {
      monthNum += 12;
      year -= 1;
    }

    return `${year}-${String(monthNum).padStart(2, '0')}`;
  };

  // Load water bill for the selected month
  const loadWaterBill = useCallback(async () => {
    const monthToLoad = selectedMonth || currentMonth;
    const requestId = ++requestIdRef.current;

    try {
      setBillLoading(true);
      const waterBill = await getMonthlyWaterBill(monthToLoad);

      // Discard stale responses
      if (requestId === requestIdRef.current) {
        setSelectedWaterBill(waterBill);
      }
    } catch (err) {
      console.error('Failed to load water bill:', err);
      // Keep previous bill on error, don't show alert
    } finally {
      if (requestId === requestIdRef.current) {
        setBillLoading(false);
      }
    }
  }, [selectedMonth, currentMonth]);

  useFocusEffect(
    useCallback(() => {
      // Initialize selectedMonth on first load
      if (!selectedMonth) {
        setSelectedMonth(currentMonth);
      }
    }, [selectedMonth, currentMonth])
  );

  useFocusEffect(
    useCallback(() => {
      loadWaterBill();
    }, [loadWaterBill])
  );

  const handleShareSummary = useCallback(async () => {
    if (!dashboardData || isSharing || billLoading) return;

    try {
      setIsSharing(true);

      // Capture the visible water bill card
      if (!shareRef.current) {
        Alert.alert('Error', 'Water bill card not ready. Please try again.');
        return;
      }

      const imageUri = await (shareRef.current as any)?.capture?.();

      if (!imageUri) {
        Alert.alert('Error', 'Failed to capture bill image. Please try again.');
        return;
      }

      const billToShare = selectedWaterBill ?? dashboardData.waterBill;
      await shareDashboardSummary(imageUri, billToShare.month);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to share bill';
      console.error('Share error:', err);
      Alert.alert('Share Error', message);
    } finally {
      setIsSharing(false);
    }
  }, [dashboardData, isSharing, billLoading, selectedWaterBill]);

  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Get water bill data (includes all balance calculations)
      const waterBill = await getMonthlyWaterBill(currentMonth);

      // Get members and allocations
      const activeMembers = await getActiveMembers();
      const allocations = await getAllocationsByMonth(currentMonth);

      // Get water data for quantity breakdown
      const purchases = await getWaterPurchasesByMonth(currentMonth);
      const totalQuantity = purchases.reduce((sum, p) => sum + p.quantity, 0);
      const wholesaleQuantity = purchases
        .filter((p) => p.purchase_type === 'wholesale')
        .reduce((sum, p) => sum + p.quantity, 0);
      const retailQuantity = purchases
        .filter((p) => p.purchase_type === 'retail')
        .reduce((sum, p) => sum + p.quantity, 0);

      // Get collection data
      const collectors = await getActiveCollectors();
      let totalHeld = 0;
      for (const collector of collectors) {
        const stats = await getCollectorStats(collector.id);
        totalHeld += stats.currentHolding;
      }

      // Get recent transactions
      const transactions = await getAllTransactions(10, 0);

      // Get actual paid members count (from transactions in current month)
      const paidMembers = activeMembers.length > 0
        ? Math.min(activeMembers.length, allocations.length)
        : 0;

      setDashboardData({
        month: currentMonth,
        waterBill,
        expectedContributions: waterBill.collection > 0
          ? Math.ceil((waterBill.collection / (activeMembers.length || 1)) * (activeMembers.length || 1))
          : (activeMembers.length || 0) * 1500,
        activeMembers: activeMembers.length,
        paidMembers,
        totalWaterQuantity: totalQuantity,
        wholesaleQuantity,
        retailQuantity,
        totalHeld,
        activeCollectors: collectors.length,
        recentTransactions: transactions,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, [currentMonth]);

  useFocusEffect(
    useCallback(() => {
      loadDashboardData();
    }, [loadDashboardData])
  );

  const formatAmount = (fils: number) => {
    const aed = fils / 100;
    return `AED ${aed.toFixed(2)}`;
  };

  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
  };

  if (loading && !dashboardData) {
    return (
      <Screen>
        <LoadingState message="Loading dashboard..." />
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen>
        <View style={{ paddingHorizontal: DesignSystem.spacing.md, paddingTop: DesignSystem.spacing.lg }}>
          <ErrorState
            title="Error"
            description={error}
            action={<PrimaryButton onPress={loadDashboardData}>Retry</PrimaryButton>}
          />
        </View>
      </Screen>
    );
  }

  if (!dashboardData) {
    return (
      <Screen>
        <View style={{ paddingHorizontal: DesignSystem.spacing.md, paddingTop: DesignSystem.spacing.lg }}>
          <EmptyState
            title="No Data"
            description="Add members and payments to see the dashboard"
            action={<PrimaryButton onPress={() => router.push('/members')}>Add Members</PrimaryButton>}
          />
        </View>
      </Screen>
    );
  }

  return (
    <Screen scrollable={false}>
      <AppHeader
        title="Water Fund"
        subtitle={formatMonth(dashboardData.month)}
      />
      <FlatList
        data={[dashboardData]}
        keyExtractor={() => 'dashboard'}
        renderItem={() => (
          <View style={{ paddingHorizontal: DesignSystem.spacing.md, paddingTop: DesignSystem.spacing.lg }}>
            {/* Water Bill Card - Shareable */}
            <Card style={{ marginBottom: DesignSystem.spacing.lg, padding: 0, overflow: 'hidden' }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: DesignSystem.spacing.md, paddingVertical: DesignSystem.spacing.sm, backgroundColor: colors.surface }}>
                {/* Left group: Previous button, Month label, Next button */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: DesignSystem.spacing.md }}>
                  {/* Previous month button */}
                  <Pressable
                    onPress={() => setSelectedMonth(shiftMonth(selectedMonth, -1))}
                    disabled={billLoading}
                    accessibilityRole="button"
                    accessibilityLabel="Previous month"
                    style={{ minWidth: 44, minHeight: 44, justifyContent: 'center', alignItems: 'center' }}
                  >
                    <ThemedText type="bodySmall" style={{ fontWeight: '600', color: colors.primary }}>
                      ‹
                    </ThemedText>
                  </Pressable>

                  {/* Month label */}
                  <ThemedText type="bodySmall" style={{ fontWeight: '600', color: colors.primary, minWidth: 100, textAlign: 'center' }}>
                    {formatMonth(selectedMonth || currentMonth)}
                  </ThemedText>

                  {/* Next month button */}
                  <Pressable
                    onPress={() => setSelectedMonth(shiftMonth(selectedMonth, 1))}
                    disabled={billLoading}
                    accessibilityRole="button"
                    accessibilityLabel="Next month"
                    style={{ minWidth: 44, minHeight: 44, justifyContent: 'center', alignItems: 'center' }}
                  >
                    <ThemedText type="bodySmall" style={{ fontWeight: '600', color: colors.primary }}>
                      ›
                    </ThemedText>
                  </Pressable>
                </View>

                {/* Share button - right aligned */}
                <Pressable
                  onPress={handleShareSummary}
                  disabled={isSharing || billLoading}
                  style={{ opacity: isSharing || billLoading ? 0.5 : 1 }}
                >
                  <ThemedText type="bodySmall" style={{ color: colors.primary, fontWeight: '600' }}>
                    {isSharing ? 'Sharing...' : 'Share'}
                  </ThemedText>
                </Pressable>
              </View>
              <ViewShot
                ref={shareRef}
                options={{
                  format: 'jpg',
                  quality: 0.7,
                  width: 600,
                }}
              >
                <MonthlyWaterBillCard
                  key={colorScheme}
                  data={selectedWaterBill ?? dashboardData.waterBill}
                  memberCount={dashboardData.activeMembers}
                />
              </ViewShot>
            </Card>

            {/* Contributions Card */}
            <Card style={{ marginBottom: DesignSystem.spacing.lg }}>
              <ThemedText type="titleSmall" style={{ marginBottom: DesignSystem.spacing.md }}>
                Contributions
              </ThemedText>

              <View style={{ gap: DesignSystem.spacing.md }}>
                <View>
                  <ThemedText type="bodySmall" themeColor="textSecondary">
                    Collected vs Expected
                  </ThemedText>
                  <ThemedText type="titleMedium" style={{ marginTop: DesignSystem.spacing.xs, fontWeight: '600' }}>
                    {formatAmount(dashboardData.waterBill.collection)} / {formatAmount(dashboardData.expectedContributions)}
                  </ThemedText>
                </View>

                <View
                  style={{
                    paddingVertical: DesignSystem.spacing.sm,
                    paddingHorizontal: DesignSystem.spacing.md,
                    backgroundColor: colors.surface,
                    borderRadius: DesignSystem.spacing.sm,
                  }}
                >
                  <ThemedText type="bodySmall" themeColor="textSecondary" style={{ marginBottom: DesignSystem.spacing.xs }}>
                    Members
                  </ThemedText>
                  <ThemedText type="titleSmall" style={{ fontWeight: '600' }}>
                    {dashboardData.paidMembers} / {dashboardData.activeMembers} Paid
                  </ThemedText>
                </View>
              </View>
            </Card>

            {/* Water Card */}
            <Card style={{ marginBottom: DesignSystem.spacing.lg }}>
              <ThemedText type="titleSmall" style={{ marginBottom: DesignSystem.spacing.md }}>
                Water Purchases
              </ThemedText>

              <View style={{ gap: DesignSystem.spacing.md }}>
                <View>
                  <ThemedText type="bodySmall" themeColor="textSecondary">
                    Total Expenses
                  </ThemedText>
                  <ThemedText type="titleMedium" style={{ marginTop: DesignSystem.spacing.xs, fontWeight: '600' }}>
                    {formatAmount(dashboardData.waterBill.totalWater)}
                  </ThemedText>
                </View>

                <View>
                  <ThemedText type="bodySmall" themeColor="textSecondary">
                    Canes Purchased
                  </ThemedText>
                  <ThemedText type="titleSmall" style={{ marginTop: DesignSystem.spacing.xs, fontWeight: '600' }}>
                    {dashboardData.totalWaterQuantity}
                  </ThemedText>
                  <View
                    style={{
                      marginTop: DesignSystem.spacing.sm,
                      paddingVertical: DesignSystem.spacing.xs,
                      gap: DesignSystem.spacing.xs,
                    }}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <ThemedText type="bodySmall" themeColor="textSecondary">
                        Wholesale
                      </ThemedText>
                      <ThemedText type="bodySmall" style={{ fontWeight: '600' }}>
                        {dashboardData.wholesaleQuantity}
                      </ThemedText>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <ThemedText type="bodySmall" themeColor="textSecondary">
                        Retail
                      </ThemedText>
                      <ThemedText type="bodySmall" style={{ fontWeight: '600' }}>
                        {dashboardData.retailQuantity}
                      </ThemedText>
                    </View>
                  </View>
                </View>
              </View>
            </Card>

            {/* Collection Card */}
            {dashboardData.activeCollectors > 0 && (
              <Card style={{ marginBottom: DesignSystem.spacing.lg }}>
                <ThemedText type="titleSmall" style={{ marginBottom: DesignSystem.spacing.md }}>
                  Collection Status
                </ThemedText>

                <View style={{ gap: DesignSystem.spacing.md }}>
                  <View>
                    <ThemedText type="bodySmall" themeColor="textSecondary">
                      Total Currently Held
                    </ThemedText>
                    <ThemedText type="titleMedium" style={{ marginTop: DesignSystem.spacing.xs, fontWeight: '600' }}>
                      {formatAmount(dashboardData.totalHeld)}
                    </ThemedText>
                  </View>

                  <View
                    style={{
                      paddingVertical: DesignSystem.spacing.sm,
                      paddingHorizontal: DesignSystem.spacing.md,
                      backgroundColor: colors.surface,
                      borderRadius: DesignSystem.spacing.sm,
                    }}
                  >
                    <ThemedText type="bodySmall" themeColor="textSecondary">
                      Active Collectors
                    </ThemedText>
                    <ThemedText type="titleSmall" style={{ marginTop: DesignSystem.spacing.xs, fontWeight: '600' }}>
                      {dashboardData.activeCollectors}
                    </ThemedText>
                  </View>
                </View>
              </Card>
            )}

            {/* Recent Activity */}
            {dashboardData.recentTransactions.length > 0 && (
              <Card style={{ marginBottom: DesignSystem.spacing.lg }}>
                <View style={{ marginBottom: DesignSystem.spacing.md, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <ThemedText type="titleSmall">Recent Activity</ThemedText>
                  <Pressable onPress={() => router.push('/history')}>
                    <ThemedText type="bodySmall" style={{ color: colors.primary }}>
                      View All
                    </ThemedText>
                  </Pressable>
                </View>

                <View style={{ gap: DesignSystem.spacing.sm }}>
                  {dashboardData.recentTransactions.slice(0, 5).map((tx) => (
                    <View
                      key={`${tx.type}-${tx.id}`}
                      style={{
                        paddingVertical: DesignSystem.spacing.sm,
                        paddingHorizontal: DesignSystem.spacing.md,
                        backgroundColor: colors.surface,
                        borderRadius: DesignSystem.spacing.sm,
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <ThemedText type="bodySmall" numberOfLines={1}>
                          {tx.description}
                        </ThemedText>
                        <ThemedText type="bodySmall" themeColor="textSecondary" style={{ marginTop: DesignSystem.spacing.xs }}>
                          {new Date(tx.date).toLocaleDateString()}
                        </ThemedText>
                      </View>
                      <ThemedText type="bodySmall" style={{ fontWeight: '600', marginLeft: DesignSystem.spacing.md }}>
                        {formatAmount(tx.amount)}
                      </ThemedText>
                    </View>
                  ))}
                </View>
              </Card>
            )}

            <View style={{ height: DesignSystem.spacing.lg }} />
            </View>
        )}
        scrollEnabled={true}
        contentContainerStyle={{ paddingBottom: DesignSystem.spacing.lg }}
      />
    </Screen>
  );
}

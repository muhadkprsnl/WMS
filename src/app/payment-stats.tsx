import { useCallback, useState } from 'react';
import { View, ScrollView } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Screen, Card, LoadingState, ErrorState, PrimaryButton, AppHeader } from '@/components/ui';
import { ThemedText } from '@/components/themed-text';
import { getPaymentsByMonth, getAllMembers, getActiveCollectors } from '@/database';
import { DesignSystem } from '@/constants/design-system';

interface PaymentStat {
  month: string;
  total: number;
  count: number;
}

interface CollectorStat {
  name: string;
  collected: number;
  count: number;
}

export default function PaymentStatsScreen() {
  const [stats, setStats] = useState<PaymentStat[]>([]);
  const [collectorStats, setCollectorStats] = useState<CollectorStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    try {
      setLoading(true);

      // Get last 6 months of data
      const months = Array.from({ length: 6 }, (_, i) => {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        return date.toISOString().split('T')[0].substring(0, 7);
      }).reverse();

      const allPaymentStats: PaymentStat[] = [];
      const collectorMap = new Map<number, { name: string; collected: number; count: number }>();

      const collectors = await getActiveCollectors();
      collectors.forEach((c) => {
        collectorMap.set(c.id, { name: c.name, collected: 0, count: 0 });
      });

      // Load all months
      for (const month of months) {
        const payments = await getPaymentsByMonth(month);
        allPaymentStats.push({
          month,
          total: payments.reduce((sum, p) => sum + p.amount, 0),
          count: payments.length,
        });

        // Aggregate collector stats
        payments.forEach((p) => {
          if (p.collected_by && collectorMap.has(p.collected_by)) {
            const stat = collectorMap.get(p.collected_by)!;
            stat.collected += p.amount;
            stat.count += 1;
          }
        });
      }

      setStats(allPaymentStats);
      setCollectorStats(
        Array.from(collectorMap.values())
          .filter((s) => s.count > 0)
          .sort((a, b) => b.collected - a.collected)
      );
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load stats');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadStats();
    }, [loadStats])
  );

  const formatAmount = (fils: number) => {
    const aed = fils / 100;
    return `AED ${aed.toFixed(2)}`;
  };

  const formatMonth = (monthStr: string) => {
    const date = new Date(monthStr + '-01');
    return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  };

  if (loading) {
    return (
      <Screen>
        <LoadingState message="Loading payment statistics..." />
      </Screen>
    );
  }

  return (
    <Screen scrollable>
      <AppHeader title="Payment Statistics" />
      <ScrollView>
        <View style={{ paddingHorizontal: DesignSystem.spacing.md, paddingVertical: DesignSystem.spacing.lg }}>
          {error && (
            <Card style={{ backgroundColor: DesignSystem.colors.light.error, marginBottom: DesignSystem.spacing.lg }}>
              <ThemedText style={{ color: '#FFFFFF' }}>{error}</ThemedText>
              <PrimaryButton
                onPress={loadStats}
                style={{ marginTop: DesignSystem.spacing.md }}
              >
                Retry
              </PrimaryButton>
            </Card>
          )}

          {/* Overall Stats */}

          <Card style={{ marginBottom: DesignSystem.spacing.lg }}>
            <View style={{ gap: DesignSystem.spacing.lg }}>
              {stats.length > 0 && (
                <>
                  <View>
                    <ThemedText type="bodySmall" themeColor="textSecondary">
                      Total This Year
                    </ThemedText>
                    <ThemedText type="titleLarge" style={{ marginTop: DesignSystem.spacing.sm }}>
                      {formatAmount(stats.reduce((sum, s) => sum + s.total, 0))}
                    </ThemedText>
                  </View>

                  <View
                    style={{
                      borderTopWidth: 1,
                      borderTopColor: DesignSystem.colors.light.border,
                      paddingTop: DesignSystem.spacing.md,
                    }}
                  >
                    <ThemedText type="bodySmall" themeColor="textSecondary">
                      Average Per Month
                    </ThemedText>
                    <ThemedText type="titleMedium" style={{ marginTop: DesignSystem.spacing.sm }}>
                      {formatAmount(
                        Math.round(stats.reduce((sum, s) => sum + s.total, 0) / stats.length)
                      )}
                    </ThemedText>
                  </View>

                  <View
                    style={{
                      borderTopWidth: 1,
                      borderTopColor: DesignSystem.colors.light.border,
                      paddingTop: DesignSystem.spacing.md,
                    }}
                  >
                    <ThemedText type="bodySmall" themeColor="textSecondary">
                      Total Payments
                    </ThemedText>
                    <ThemedText type="titleMedium" style={{ marginTop: DesignSystem.spacing.sm }}>
                      {stats.reduce((sum, s) => sum + s.count, 0)}
                    </ThemedText>
                  </View>
                </>
              )}
            </View>
          </Card>

          {/* Monthly Trend */}
          {stats.length > 0 && (
            <>
              <ThemedText type="titleMedium" style={{ marginBottom: DesignSystem.spacing.lg }}>
                Monthly Breakdown
              </ThemedText>

              {stats.map((stat) => (
                <Card
                  key={stat.month}
                  style={{
                    marginBottom: DesignSystem.spacing.md,
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <View>
                    <ThemedText type="titleSmall">{formatMonth(stat.month)}</ThemedText>
                    <ThemedText type="bodySmall" themeColor="textSecondary">
                      {stat.count} payment{stat.count !== 1 ? 's' : ''}
                    </ThemedText>
                  </View>
                  <ThemedText type="titleSmall" style={{ fontWeight: '600' }}>
                    {formatAmount(stat.total)}
                  </ThemedText>
                </Card>
              ))}
            </>
          )}

          {/* Collector Stats */}
          {collectorStats.length > 0 && (
            <>
              <ThemedText type="titleMedium" style={{ marginBottom: DesignSystem.spacing.lg, marginTop: DesignSystem.spacing.lg }}>
                Top Collectors
              </ThemedText>

              {collectorStats.slice(0, 5).map((collector) => (
                <Card
                  key={collector.name}
                  style={{
                    marginBottom: DesignSystem.spacing.md,
                  }}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <View style={{ flex: 1 }}>
                      <ThemedText type="titleSmall">{collector.name}</ThemedText>
                      <ThemedText type="bodySmall" themeColor="textSecondary" style={{ marginTop: DesignSystem.spacing.xs }}>
                        {collector.count} payment{collector.count !== 1 ? 's' : ''}
                      </ThemedText>
                    </View>
                    <ThemedText type="titleSmall" style={{ fontWeight: '600', marginLeft: DesignSystem.spacing.md }}>
                      {formatAmount(collector.collected)}
                    </ThemedText>
                  </View>
                </Card>
              ))}
            </>
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}

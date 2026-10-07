import { useCallback, useState } from 'react';
import { View, FlatList, ScrollView, Pressable } from 'react-native';
import { useFocusEffect, useLocalSearchParams, router } from 'expo-router';
import { Screen, EmptyState, Card, LoadingState, ErrorState, PrimaryButton, AppHeader } from '@/components/ui';
import { ThemedText } from '@/components/themed-text';
import { getCollectorById, getCollectorTransactions, getCollectorBalance, TransactionRecord } from '@/database';
import { DesignSystem } from '@/constants/design-system';
import { Collector } from '@/types/database';
import { PeriodFilter } from '@/components/period-filter';
import { PeriodPreset, getPeriodDateRange, getPeriodLabel, filterTransactions, TransactionCategory, TRANSACTION_CATEGORIES } from '@/utils/period-filter';

export default function CollectorDetailScreen() {
  const { id } = useLocalSearchParams();
  const collectorId = typeof id === 'string' ? parseInt(id, 10) : 0;

  const [collector, setCollector] = useState<Collector | null>(null);
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Period filter state (default all_time for history)
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>('all_time');
  const [customFromDate, setCustomFromDate] = useState('');
  const [customToDate, setCustomToDate] = useState('');

  // Category filter state
  const [selectedCategory, setSelectedCategory] = useState<TransactionCategory>('all');

  const loadData = useCallback(async () => {
    if (!collectorId) return;

    try {
      setLoading(true);
      const [collectorData, transactionsData, balanceData] = await Promise.all([
        getCollectorById(collectorId),
        getCollectorTransactions(collectorId),
        getCollectorBalance(collectorId),
      ]);

      setCollector(collectorData);
      setTransactions(transactionsData);
      setBalance(balanceData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load collector details');
    } finally {
      setLoading(false);
    }
  }, [collectorId]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const formatAmount = (fils: number) => {
    const aed = fils / 100;
    return `AED ${aed.toFixed(2)}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'payment':
        return DesignSystem.colors.light.success;
      case 'water_payment':
        return DesignSystem.colors.light.error;
      case 'handover_received':
        return DesignSystem.colors.light.success;
      case 'handover_sent':
        return DesignSystem.colors.light.error;
      default:
        return DesignSystem.colors.light.text;
    }
  };

  // Apply filters to transactions
  const dateRange = getPeriodDateRange(periodPreset, customFromDate, customToDate);
  const filteredTransactions = filterTransactions(transactions, dateRange, selectedCategory);

  const handleFilterChange = (preset: PeriodPreset, fromDate: string, toDate: string) => {
    setPeriodPreset(preset);
    setCustomFromDate(fromDate);
    setCustomToDate(toDate);
  };

  // Get active filter label
  const periodLabel = getPeriodLabel(periodPreset, customFromDate, customToDate);
  const categoryLabel = selectedCategory === 'all' ? '' : TRANSACTION_CATEGORIES.find((c) => c.value === selectedCategory)?.label || '';
  const filterLabel = categoryLabel ? `${periodLabel} · ${categoryLabel}` : periodLabel;

  if (loading) {
    return (
      <Screen>
        <LoadingState message="Loading collector details..." />
      </Screen>
    );
  }

  if (error || !collector) {
    return (
      <Screen>
        <ErrorState
          title="Error"
          description={error || 'Collector not found'}
          action={<PrimaryButton onPress={() => router.back()}>Go Back</PrimaryButton>}
        />
      </Screen>
    );
  }

  return (
    <Screen scrollable={false}>
      <AppHeader title="Collector" />
      {/* Collector Info & Balance */}
      <View style={{ paddingHorizontal: DesignSystem.spacing.md, paddingTop: DesignSystem.spacing.lg }}>
        <Card style={{ marginBottom: DesignSystem.spacing.lg }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: DesignSystem.spacing.md }}>
            <View style={{ flex: 1 }}>
              <ThemedText type="titleMedium">{collector.name}</ThemedText>
              {collector.notes && (
                <ThemedText
                  type="bodySmall"
                  themeColor="textSecondary"
                  style={{ marginTop: DesignSystem.spacing.sm }}
                >
                  {collector.notes}
                </ThemedText>
              )}
            </View>
            <View style={{ flexDirection: 'row', gap: DesignSystem.spacing.md, marginLeft: DesignSystem.spacing.md }}>
              <PrimaryButton
                onPress={() => router.push({ pathname: '/handover-form', params: { from_collector_id: collector.id.toString() } })}
                size="sm"
              >
                Handover
              </PrimaryButton>
              <PrimaryButton
                onPress={() => router.push({ pathname: '/edit-collector/[id]', params: { id: collector.id.toString() } })}
                size="sm"
              >
                Edit
              </PrimaryButton>
            </View>
          </View>

          <View
            style={{
              borderTopWidth: 1,
              borderTopColor: DesignSystem.colors.light.border,
              marginTop: DesignSystem.spacing.md,
              paddingTop: DesignSystem.spacing.md,
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
            }}
          >
            <View>
              <ThemedText type="bodySmall" themeColor="textSecondary">
                Current Holding
              </ThemedText>
              <ThemedText type="titleLarge" style={{ marginTop: DesignSystem.spacing.xs }}>
                {formatAmount(balance)}
              </ThemedText>
            </View>
            <PrimaryButton
              onPress={() => router.push({ pathname: '/settlement-form', params: { collector_id: collector.id.toString(), month: new Date().toISOString().slice(0, 7) } })}
              size="sm"
            >
              Settle Month
            </PrimaryButton>
          </View>
        </Card>
      </View>

      {/* Period Filter */}
      <PeriodFilter
        preset={periodPreset}
        customFromDate={customFromDate}
        customToDate={customToDate}
        onChange={handleFilterChange}
      />

      {/* Category Filter - Horizontal Scroll */}
      {transactions.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ paddingHorizontal: DesignSystem.spacing.md, paddingVertical: DesignSystem.spacing.sm }}
          contentContainerStyle={{ gap: DesignSystem.spacing.sm }}
        >
          {TRANSACTION_CATEGORIES.map((category) => (
            <Pressable
              key={category.value}
              onPress={() => setSelectedCategory(category.value)}
              style={{
                paddingHorizontal: DesignSystem.spacing.md,
                paddingVertical: DesignSystem.spacing.sm,
                borderRadius: DesignSystem.borderRadius.lg,
                backgroundColor:
                  selectedCategory === category.value
                    ? DesignSystem.colors.light.primary
                    : DesignSystem.colors.light.surface,
                borderWidth: 1,
                borderColor:
                  selectedCategory === category.value
                    ? DesignSystem.colors.light.primary
                    : DesignSystem.colors.light.border,
              }}
            >
              <ThemedText
                type="bodySmall"
                style={{
                  color: selectedCategory === category.value ? '#fff' : DesignSystem.colors.light.text,
                  fontWeight: selectedCategory === category.value ? '600' : '400',
                }}
              >
                {category.label}
              </ThemedText>
            </Pressable>
          ))}
        </ScrollView>
      )}

      {/* Transactions Header */}
      <View
        style={{
          paddingHorizontal: DesignSystem.spacing.md,
          marginBottom: DesignSystem.spacing.md,
        }}
      >
        <ThemedText type="titleSmall">Transaction History</ThemedText>
        {transactions.length > 0 && (
          <ThemedText type="bodySmall" themeColor="textSecondary" style={{ marginTop: DesignSystem.spacing.xs }}>
            {filterLabel}
          </ThemedText>
        )}
      </View>

      {transactions.length === 0 ? (
        <View style={{ paddingHorizontal: DesignSystem.spacing.md, flex: 1 }}>
          <EmptyState title="No Transactions" description="This collector has no transactions yet" />
        </View>
      ) : filteredTransactions.length === 0 ? (
        <View style={{ paddingHorizontal: DesignSystem.spacing.md, flex: 1 }}>
          <EmptyState
            title="No Transactions"
            description="No transactions match these filters"
            action={
              <PrimaryButton
                onPress={() => {
                  setPeriodPreset('all_time');
                  setSelectedCategory('all');
                  setCustomFromDate('');
                  setCustomToDate('');
                }}
              >
                Clear Filters
              </PrimaryButton>
            }
          />
        </View>
      ) : (
        <FlatList
          data={filteredTransactions}
          keyExtractor={(item, index) => `${item.type}-${item.id}-${index}`}
          renderItem={({ item }) => (
            <Card
              style={{
                marginHorizontal: DesignSystem.spacing.md,
                marginVertical: DesignSystem.spacing.sm,
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ flex: 1 }}>
                  <ThemedText type="titleSmall">{item.description}</ThemedText>
                  <ThemedText
                    type="bodySmall"
                    themeColor="textSecondary"
                    style={{ marginTop: DesignSystem.spacing.xs }}
                  >
                    {formatDate(item.date)}
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
                <View style={{ marginLeft: DesignSystem.spacing.md, alignItems: 'flex-end' }}>
                  <ThemedText
                    type="titleSmall"
                    style={{ color: getTransactionColor(item.type), fontWeight: '600' }}
                  >
                    {formatAmount(item.amount)}
                  </ThemedText>
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

import { useCallback, useState } from 'react';
import { View, FlatList } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Screen, EmptyState, Card, LoadingState, ErrorState, PrimaryButton, AppHeader } from '@/components/ui';
import { ThemedText } from '@/components/themed-text';
import { getAllTransactions, TransactionRecord } from '@/database';
import { DesignSystem } from '@/constants/design-system';

export default function HistoryScreen() {
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const loadTransactions = useCallback(async () => {
    try {
      setLoading(true);
      const loaded = await getAllTransactions(50, 0);
      setTransactions(loaded);
      setHasMore(loaded.length >= 50);
      setOffset(50);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load transaction history');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return;

    try {
      const more = await getAllTransactions(50, offset);
      if (more.length > 0) {
        setTransactions((prev) => [...prev, ...more]);
        setHasMore(more.length >= 50);
        setOffset((prev) => prev + 50);
      } else {
        setHasMore(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load more transactions');
    }
  }, [hasMore, loading, offset]);

  useFocusEffect(
    useCallback(() => {
      loadTransactions();
    }, [loadTransactions])
  );

  const formatAmount = (fils: number) => {
    const aed = fils / 100;
    return `AED ${aed.toFixed(2)}`;
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
      case 'handover':
      case 'handover_sent':
      case 'handover_received':
        return DesignSystem.colors.light.warning;
      default:
        return DesignSystem.colors.light.text;
    }
  };

  if (loading && transactions.length === 0) {
    return (
      <Screen>
        <LoadingState message="Loading transaction history..." />
      </Screen>
    );
  }

  return (
    <Screen scrollable={false}>
      <AppHeader title="Transaction History" />
      {error && (
        <View style={{ paddingHorizontal: DesignSystem.spacing.md, paddingTop: DesignSystem.spacing.lg }}>
          <ErrorState
            title="Error"
            description={error}
            action={<PrimaryButton onPress={loadTransactions}>Retry</PrimaryButton>}
          />
        </View>
      )}

      {!error && transactions.length === 0 ? (
        <View style={{ paddingHorizontal: DesignSystem.spacing.md, paddingTop: DesignSystem.spacing.lg, flex: 1 }}>
          <EmptyState
            title="No Transactions"
            description="Transaction history will appear here"
          />
        </View>
      ) : (
        <FlatList
          data={transactions}
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
                    {item.collectorName} • {formatDate(item.date)}
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
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            hasMore && transactions.length > 0 ? (
              <View style={{ paddingVertical: DesignSystem.spacing.lg }}>
                <LoadingState message="Loading more..." />
              </View>
            ) : null
          }
        />
      )}
    </Screen>
  );
}

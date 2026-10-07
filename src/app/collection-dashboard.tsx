import { useCallback, useState } from 'react';
import { View, FlatList, Modal, Alert } from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { Screen, Card, LoadingState, ErrorState, PrimaryButton, EmptyState, AppHeader, DateField } from '@/components/ui';
import { ThemedText } from '@/components/themed-text';
import { getActiveCollectors, getCollectorStats, getCollectorPeriodStats, createCollector } from '@/database';
import { DesignSystem } from '@/constants/design-system';
import { Collector } from '@/types/database';
import { CollectorForm, CollectorFormValues } from '@/components/forms/collector-form';

// Local date formatting helpers (same as in DateField)
const formatLocalDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseLocalDate = (dateString: string): Date | null => {
  if (!dateString || typeof dateString !== 'string') return null;
  const [year, month, day] = dateString.split('-').map(Number);
  if (!year || !month || !day || month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }
  return date;
};

interface CollectorInfo extends Collector {
  collected: number;
  waterPaid: number;
  handedOver: number;
  received: number;
  currentHolding: number;
}

type PeriodPreset = 'this_month' | 'last_month' | 'last_3_months' | 'this_year' | 'all_time' | 'custom';

interface DateRange {
  from: string; // YYYY-MM-DD
  to: string;   // YYYY-MM-DD
}

export default function CollectionDashboardScreen() {
  const [collectors, setCollectors] = useState<CollectorInfo[]>([]);
  const [totals, setTotals] = useState({
    collected: 0,
    waterPaid: 0,
    handedOver: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddCollectorModal, setShowAddCollectorModal] = useState(false);
  const [creatingCollector, setCreatingCollector] = useState(false);

  // Period filter state (active)
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>('this_month');
  const [customFromDate, setCustomFromDate] = useState<string>(formatLocalDate(new Date()));
  const [customToDate, setCustomToDate] = useState<string>(formatLocalDate(new Date()));

  // Period filter modal state (draft values for custom date range only)
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [draftCustomFromDate, setDraftCustomFromDate] = useState<string>(formatLocalDate(new Date()));
  const [draftCustomToDate, setDraftCustomToDate] = useState<string>(formatLocalDate(new Date()));
  const [customModalError, setCustomModalError] = useState<string | null>(null);

  // Preset filter dropdown state
  const [showPresetDropdown, setShowPresetDropdown] = useState(false);

  // Helper to get date range from preset (using local dates, not UTC)
  const getPeriodDateRange = useCallback((preset: PeriodPreset, from?: string, to?: string): DateRange | null => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();

    switch (preset) {
      case 'this_month': {
        const start = new Date(currentYear, currentMonth, 1);
        const end = new Date();
        return {
          from: formatLocalDate(start),
          to: formatLocalDate(end),
        };
      }
      case 'last_month': {
        const start = new Date(currentYear, currentMonth - 1, 1);
        const end = new Date(currentYear, currentMonth, 0);
        return {
          from: formatLocalDate(start),
          to: formatLocalDate(end),
        };
      }
      case 'last_3_months': {
        const start = new Date(currentYear, currentMonth - 2, 1);
        const end = new Date();
        return {
          from: formatLocalDate(start),
          to: formatLocalDate(end),
        };
      }
      case 'this_year': {
        const start = new Date(currentYear, 0, 1);
        const end = new Date();
        return {
          from: formatLocalDate(start),
          to: formatLocalDate(end),
        };
      }
      case 'all_time':
        return null; // null means no date filter
      case 'custom':
        if (from && to) {
          if (from > to) {
            return null;
          }
          return { from, to };
        }
        return null;
      default:
        return null;
    }
  }, []);

  // Helper to format period label with real month/date names
  const getPeriodLabel = useCallback((): string => {
    if (periodPreset === 'custom') {
      if (!customFromDate || !customToDate || customFromDate > customToDate) {
        return 'Invalid date range';
      }
      const fromDate = parseLocalDate(customFromDate);
      const toDate = parseLocalDate(customToDate);
      if (!fromDate || !toDate) return 'Invalid date range';

      const fromDay = fromDate.getDate();
      const monthFormatter = new Intl.DateTimeFormat('en-US', { month: 'short' });
      const fullFormatter = new Intl.DateTimeFormat('en-US', { day: 'numeric', month: 'short', year: 'numeric' });

      if (fromDate.getMonth() === toDate.getMonth() && fromDate.getFullYear() === toDate.getFullYear()) {
        // Same month: "01 - 15 Oct 2026"
        return `${fromDay} - ${fullFormatter.format(toDate)}`;
      } else {
        // Different months: "01 Oct - 15 Nov 2026"
        return `${fromDay} ${monthFormatter.format(fromDate)} - ${fullFormatter.format(toDate)}`;
      }
    }

    const today = new Date();
    const currentYear = today.getFullYear();
    const monthFormatter = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' });
    const monthOnlyFormatter = new Intl.DateTimeFormat('en-US', { month: 'long' });

    if (periodPreset === 'this_month') {
      return monthFormatter.format(today);
    }
    if (periodPreset === 'last_month') {
      const lastMonth = new Date(currentYear, today.getMonth() - 1, 1);
      return monthFormatter.format(lastMonth);
    }
    if (periodPreset === 'last_3_months') {
      const start = new Date(currentYear, today.getMonth() - 2, 1);
      const startMonth = monthOnlyFormatter.format(start);
      const endMonth = monthOnlyFormatter.format(today);
      const endYear = today.getFullYear();
      return `${startMonth} - ${endMonth} ${endYear}`;
    }
    if (periodPreset === 'this_year') {
      return currentYear.toString();
    }
    return 'All Time';
  }, [periodPreset, customFromDate, customToDate]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      const activeCollectors = await getActiveCollectors();
      const periodRange = getPeriodDateRange(periodPreset, customFromDate, customToDate);

      let totalCollected = 0;
      let totalWaterPaid = 0;
      let totalHandedOver = 0;

      const enriched = await Promise.all(
        activeCollectors.map(async (collector) => {
          // Get all-time stats for currentHolding
          const allTimeStats = await getCollectorStats(collector.id);

          // Get period stats for the four breakdown rows
          const periodStats = await getCollectorPeriodStats(
            collector.id,
            periodRange?.from,
            periodRange?.to
          );

          totalCollected += periodStats.totalCollected;
          totalWaterPaid += periodStats.totalWaterPaid;
          totalHandedOver += periodStats.totalHandedOver;

          return {
            ...collector,
            collected: periodStats.totalCollected,
            waterPaid: periodStats.totalWaterPaid,
            handedOver: periodStats.totalHandedOver,
            received: periodStats.totalReceived,
            currentHolding: allTimeStats.currentHolding,
          };
        })
      );

      setCollectors(enriched);
      setTotals({
        collected: totalCollected,
        waterPaid: totalWaterPaid,
        handedOver: totalHandedOver,
      });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load collection data');
    } finally {
      setLoading(false);
    }
  }, [periodPreset, customFromDate, customToDate, getPeriodDateRange]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );


  const formatAmount = (fils: number) => {
    const aed = fils / 100;
    return `AED ${aed.toFixed(2)}`;
  };

  const handleApplyPreset = (preset: PeriodPreset) => {
    setPeriodPreset(preset);
    setShowPresetDropdown(false);
  };

  const handleOpenCustomModal = () => {
    setDraftCustomFromDate(customFromDate);
    setDraftCustomToDate(customToDate);
    setCustomModalError(null);
    setShowCustomModal(true);
  };

  const handleApplyCustom = () => {
    // Validate custom date range
    if (!draftCustomFromDate || !draftCustomToDate) {
      setCustomModalError('Please select both start and end dates');
      return;
    }
    if (draftCustomFromDate > draftCustomToDate) {
      setCustomModalError('Start date must be before end date');
      return;
    }

    // Apply the custom filter
    setPeriodPreset('custom');
    setCustomFromDate(draftCustomFromDate);
    setCustomToDate(draftCustomToDate);
    setShowCustomModal(false);
    setCustomModalError(null);
  };

  const handleAddCollector = async (values: CollectorFormValues) => {
    try {
      setCreatingCollector(true);
      await createCollector(values.name, values.notes || undefined);
      Alert.alert('Success', `Collector "${values.name}" created successfully`);
      setShowAddCollectorModal(false);
      loadData();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create collector';
      if (message.includes('UNIQUE constraint failed')) {
        Alert.alert('Error', 'A collector with this name already exists');
      } else {
        Alert.alert('Error', message);
      }
    } finally {
      setCreatingCollector(false);
    }
  };

  if (loading && collectors.length === 0) {
    return (
      <Screen>
        <LoadingState message="Loading collection data..." />
      </Screen>
    );
  }

  return (
    <Screen scrollable={false}>
      <AppHeader title="Collection Management" />

      {/* Filter Buttons */}
      <View style={{ paddingHorizontal: DesignSystem.spacing.md, paddingTop: DesignSystem.spacing.md, paddingBottom: DesignSystem.spacing.sm, flexDirection: 'row', gap: DesignSystem.spacing.md }}>
        <View style={{ flex: 1 }}>
          <PrimaryButton
            onPress={() => setShowPresetDropdown(true)}
            size="sm"
            fullWidth
          >
            Filter
          </PrimaryButton>
        </View>
        <View style={{ flex: 1 }}>
          <PrimaryButton
            onPress={handleOpenCustomModal}
            size="sm"
            fullWidth
          >
            Custom
          </PrimaryButton>
        </View>
      </View>

      {/* Overall Summary */}
      <View style={{ paddingHorizontal: DesignSystem.spacing.md }}>
        <Card style={{ marginBottom: DesignSystem.spacing.lg }}>
          <ThemedText type="titleSmall" style={{ marginBottom: DesignSystem.spacing.sm }}>
            Summary
          </ThemedText>
          <ThemedText type="bodySmall" themeColor="textSecondary" style={{ marginBottom: DesignSystem.spacing.md }}>
            {getPeriodLabel()}
          </ThemedText>

          <View style={{ gap: DesignSystem.spacing.md }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <ThemedText type="bodySmall" themeColor="textSecondary">
                Total Collected
              </ThemedText>
              <ThemedText type="titleSmall" style={{ fontWeight: '600' }}>
                {formatAmount(totals.collected)}
              </ThemedText>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <ThemedText type="bodySmall" themeColor="textSecondary">
                Total Water Paid
              </ThemedText>
              <ThemedText type="titleSmall" style={{ fontWeight: '600' }}>
                {formatAmount(totals.waterPaid)}
              </ThemedText>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <ThemedText type="bodySmall" themeColor="textSecondary">
                Total Handed Over
              </ThemedText>
              <ThemedText type="titleSmall" style={{ fontWeight: '600' }}>
                {formatAmount(totals.handedOver)}
              </ThemedText>
            </View>

            {collectors.length > 0 && (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingTop: DesignSystem.spacing.md, borderTopWidth: 1, borderTopColor: DesignSystem.colors.light.border }}>
                <ThemedText type="bodySmall" themeColor="textSecondary">
                  Total Currently Held
                </ThemedText>
                <ThemedText type="titleSmall" style={{ fontWeight: '600' }}>
                  {formatAmount(collectors.reduce((sum, c) => sum + c.currentHolding, 0))}
                </ThemedText>
              </View>
            )}
          </View>
        </Card>
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

      {!error && collectors.length === 0 ? (
        <View style={{ paddingHorizontal: DesignSystem.spacing.md, paddingTop: DesignSystem.spacing.lg, flex: 1 }}>
          <EmptyState
            title="No Active Collectors"
            description="Add collectors to track money collection"
            action={<PrimaryButton onPress={() => setShowAddCollectorModal(true)}>Add Collector</PrimaryButton>}
          />
        </View>
      ) : (
        <>
          <View style={{ paddingHorizontal: DesignSystem.spacing.md, marginBottom: DesignSystem.spacing.md, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <ThemedText type="titleSmall">Collectors</ThemedText>
            <PrimaryButton onPress={() => setShowAddCollectorModal(true)} size="sm">
              Add Collector
            </PrimaryButton>
          </View>

          <FlatList
            data={collectors}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <Card
                style={{
                  marginHorizontal: DesignSystem.spacing.md,
                  marginVertical: DesignSystem.spacing.sm,
                }}
              >
                <View style={{ marginBottom: DesignSystem.spacing.md }}>
                  <ThemedText type="titleSmall">{item.name}</ThemedText>
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

                <View style={{ gap: DesignSystem.spacing.sm, marginBottom: DesignSystem.spacing.md, paddingBottom: DesignSystem.spacing.md, borderBottomWidth: 1, borderBottomColor: DesignSystem.colors.light.border }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <ThemedText type="bodySmall">Collected</ThemedText>
                    <ThemedText type="bodySmall" style={{ fontWeight: '600' }} numberOfLines={1}>
                      {formatAmount(item.collected)}
                    </ThemedText>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <ThemedText type="bodySmall">Water Paid</ThemedText>
                    <ThemedText type="bodySmall" style={{ fontWeight: '600' }} numberOfLines={1}>
                      {formatAmount(item.waterPaid)}
                    </ThemedText>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <ThemedText type="bodySmall">Given Away</ThemedText>
                    <ThemedText type="bodySmall" style={{ fontWeight: '600' }} numberOfLines={1}>
                      {formatAmount(item.handedOver)}
                    </ThemedText>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <ThemedText type="bodySmall">Received</ThemedText>
                    <ThemedText type="bodySmall" style={{ fontWeight: '600' }} numberOfLines={1}>
                      {formatAmount(item.received)}
                    </ThemedText>
                  </View>
                </View>

                <View style={{ marginBottom: DesignSystem.spacing.md }}>
                  <ThemedText type="bodySmall" themeColor="textSecondary">
                    Current Holding
                  </ThemedText>
                  <ThemedText
                    type="titleMedium"
                    style={{ marginTop: DesignSystem.spacing.xs, fontWeight: '600' }}
                  >
                    {formatAmount(item.currentHolding)}
                  </ThemedText>
                </View>

                <View>
                  <PrimaryButton
                    onPress={() => router.push({ pathname: '/collector-detail/[id]', params: { id: item.id.toString() } })}
                    fullWidth
                  >
                    View Details
                  </PrimaryButton>
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

      {/* Preset Filter Modal */}
      <Modal
        visible={showPresetDropdown}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPresetDropdown(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', paddingHorizontal: DesignSystem.spacing.lg }}>
          <Card>
            <ThemedText type="titleSmall" style={{ marginBottom: DesignSystem.spacing.lg }}>
              Select Period
            </ThemedText>

            <View style={{ gap: DesignSystem.spacing.sm }}>
              {[
                { label: 'This Month', value: 'this_month' as PeriodPreset },
                { label: 'Last Month', value: 'last_month' as PeriodPreset },
                { label: 'Last 3 Months', value: 'last_3_months' as PeriodPreset },
                { label: 'This Year', value: 'this_year' as PeriodPreset },
                { label: 'All Time', value: 'all_time' as PeriodPreset },
              ].map((option) => (
                <PrimaryButton
                  key={option.value}
                  onPress={() => {
                    handleApplyPreset(option.value);
                    setShowPresetDropdown(false);
                  }}
                  style={{
                    backgroundColor: periodPreset === option.value
                      ? DesignSystem.colors.light.primary
                      : DesignSystem.colors.light.surface,
                  }}
                >
                  <ThemedText
                    style={{
                      color: periodPreset === option.value
                        ? '#fff'
                        : DesignSystem.colors.light.text,
                    }}
                  >
                    {option.label}
                  </ThemedText>
                </PrimaryButton>
              ))}
            </View>

            <PrimaryButton
              onPress={() => setShowPresetDropdown(false)}
              style={{ backgroundColor: DesignSystem.colors.light.border, marginTop: DesignSystem.spacing.md }}
            >
              <ThemedText style={{ color: DesignSystem.colors.light.text }}>Close</ThemedText>
            </PrimaryButton>
          </Card>
        </View>
      </Modal>

      {/* Custom Date Range Modal */}
      <Modal
        visible={showCustomModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCustomModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', paddingHorizontal: DesignSystem.spacing.lg }}>
          <Card style={{ maxHeight: '80%' }}>
            <ThemedText type="titleSmall" style={{ marginBottom: DesignSystem.spacing.lg }}>
              Custom Date Range
            </ThemedText>

            <DateField
              label="From Date"
              value={draftCustomFromDate}
              onChange={setDraftCustomFromDate}
              containerStyle={{ marginBottom: DesignSystem.spacing.md }}
            />
            <DateField
              label="To Date"
              value={draftCustomToDate}
              onChange={setDraftCustomToDate}
              containerStyle={{ marginBottom: DesignSystem.spacing.md }}
            />

            {customModalError && (
              <ThemedText type="bodySmall" style={{ color: DesignSystem.colors.light.error, marginBottom: DesignSystem.spacing.md }}>
                {customModalError}
              </ThemedText>
            )}

            <View style={{ flexDirection: 'row', gap: DesignSystem.spacing.md, justifyContent: 'flex-end' }}>
              <PrimaryButton
                onPress={() => setShowCustomModal(false)}
                style={{ backgroundColor: DesignSystem.colors.light.border }}
              >
                <ThemedText style={{ color: DesignSystem.colors.light.text }}>Cancel</ThemedText>
              </PrimaryButton>
              <PrimaryButton onPress={handleApplyCustom}>
                Apply
              </PrimaryButton>
            </View>
          </Card>
        </View>
      </Modal>

      {/* Add Collector Modal */}
      <Modal
        visible={showAddCollectorModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAddCollectorModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', paddingHorizontal: DesignSystem.spacing.lg }}>
          <Card>
            <ThemedText type="titleSmall" style={{ marginBottom: DesignSystem.spacing.lg }}>
              Add Collector
            </ThemedText>

            <CollectorForm
              onSubmit={async (values) => {
                await handleAddCollector(values);
              }}
              loading={creatingCollector}
              submitLabel="Create Collector"
            />

            <PrimaryButton
              onPress={() => setShowAddCollectorModal(false)}
              style={{ backgroundColor: DesignSystem.colors.light.border, marginTop: DesignSystem.spacing.md }}
            >
              <ThemedText style={{ color: DesignSystem.colors.light.text }}>Cancel</ThemedText>
            </PrimaryButton>
          </Card>
        </View>
      </Modal>
    </Screen>
  );
}

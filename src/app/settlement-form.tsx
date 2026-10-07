import { useState, useCallback } from 'react';
import { View, ScrollView, Alert } from 'react-native';
import { useFocusEffect, useLocalSearchParams, router } from 'expo-router';
import { Screen, Card, PrimaryButton, LoadingState, TextInput, AppHeader, DateField } from '@/components/ui';
import { ThemedText } from '@/components/themed-text';
import { getCollectorById, getCollectorBalance } from '@/database';
import { recordSettlement } from '@/services/settlementService';
import { DesignSystem } from '@/constants/design-system';
import { Collector } from '@/types/database';

export default function SettlementFormScreen() {
  const { collector_id, month } = useLocalSearchParams();
  const collectorId = typeof collector_id === 'string' ? parseInt(collector_id, 10) : 0;
  const selectedMonth = typeof month === 'string' ? month : new Date().toISOString().slice(0, 7);

  const [collector, setCollector] = useState<Collector | null>(null);
  const [currentHolding, setCurrentHolding] = useState(0);
  const [waterPayment, setWaterPayment] = useState('');
  const [handover, setHandover] = useState('');
  const [returned, setReturned] = useState('');
  const [other, setOther] = useState('');
  const [settlementDate, setSettlementDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      if (collectorId > 0) {
        const collectorData = await getCollectorById(collectorId);
        if (collectorData) {
          setCollector(collectorData);
          const balance = await getCollectorBalance(collectorId);
          setCurrentHolding(balance);
        }
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [collectorId]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const waterPaymentFils = waterPayment ? Math.round(parseFloat(waterPayment) * 100) : 0;
  const handoverFils = handover ? Math.round(parseFloat(handover) * 100) : 0;
  const returnedFils = returned ? Math.round(parseFloat(returned) * 100) : 0;
  const otherFils = other ? Math.round(parseFloat(other) * 100) : 0;
  const totalAccounted = waterPaymentFils + handoverFils + returnedFils + otherFils;
  const unaccounted = currentHolding - totalAccounted;

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      setError(null);

      if (unaccounted !== 0) {
        const aed = Math.abs(unaccounted / 100).toFixed(2);
        if (unaccounted > 0) {
          Alert.alert('Error', `AED ${aed} is still unaccounted for.`);
        } else {
          Alert.alert('Error', `You have AED ${aed} more than the current holding.`);
        }
        setSubmitting(false);
        return;
      }

      await recordSettlement(
        collectorId,
        selectedMonth,
        settlementDate,
        {
          waterPaymentAmount: waterPaymentFils,
          handoverAmount: handoverFils,
          returnedAmount: returnedFils,
          otherAmount: otherFils,
        },
        notes || undefined
      );

      Alert.alert('Success', 'Settlement recorded successfully', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to record settlement';
      setError(message);
      Alert.alert('Error', message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Screen>
        <LoadingState message="Loading collector data..." />
      </Screen>
    );
  }

  return (
    <Screen scrollable>
      <AppHeader title="Month-End Settlement" />
      <ScrollView>
        <View style={{ paddingHorizontal: DesignSystem.spacing.md, paddingVertical: DesignSystem.spacing.lg }}>
          <Card style={{ marginBottom: DesignSystem.spacing.lg }}>

            {error && (
              <View style={{ backgroundColor: DesignSystem.colors.light.error, padding: DesignSystem.spacing.md, borderRadius: DesignSystem.spacing.sm, marginBottom: DesignSystem.spacing.lg }}>
                <ThemedText style={{ color: '#FFFFFF' }}>{error}</ThemedText>
              </View>
            )}

            {collector && (
              <>
                {/* Collector Info */}
                <Card style={{ marginBottom: DesignSystem.spacing.lg, backgroundColor: DesignSystem.colors.light.surface }}>
                  <ThemedText type="bodySmall" themeColor="textSecondary">
                    Collector
                  </ThemedText>
                  <ThemedText type="titleSmall" style={{ marginTop: DesignSystem.spacing.xs }}>
                    {collector.name}
                  </ThemedText>
                </Card>

                {/* Current Holding */}
                <Card style={{ marginBottom: DesignSystem.spacing.lg, backgroundColor: DesignSystem.colors.light.surface, borderWidth: 2, borderColor: DesignSystem.colors.light.primary }}>
                  <ThemedText type="bodySmall" themeColor="textSecondary">
                    Current Holding
                  </ThemedText>
                  <ThemedText type="titleLarge" style={{ marginTop: DesignSystem.spacing.xs, fontWeight: '600' }}>
                    AED {(currentHolding / 100).toFixed(2)}
                  </ThemedText>
                  <ThemedText type="bodySmall" themeColor="textSecondary" style={{ marginTop: DesignSystem.spacing.sm }}>
                    Month: {selectedMonth}
                  </ThemedText>
                </Card>

                {/* Settlement Methods */}
                <ThemedText type="titleSmall" style={{ marginBottom: DesignSystem.spacing.md }}>
                  Account for Money
                </ThemedText>

                <TextInput
                  label="Water Payment (AED)"
                  value={waterPayment}
                  onChangeText={setWaterPayment}
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                  containerStyle={{ marginBottom: DesignSystem.spacing.md }}
                />

                <TextInput
                  label="Handover to Another Collector (AED)"
                  value={handover}
                  onChangeText={setHandover}
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                  containerStyle={{ marginBottom: DesignSystem.spacing.md }}
                />

                <TextInput
                  label="Returned / Deposited (AED)"
                  value={returned}
                  onChangeText={setReturned}
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                  containerStyle={{ marginBottom: DesignSystem.spacing.md }}
                />

                <TextInput
                  label="Other (AED)"
                  value={other}
                  onChangeText={setOther}
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                  containerStyle={{ marginBottom: DesignSystem.spacing.lg }}
                />

                {/* Settlement Date */}
                <DateField
                  label="Settlement Date"
                  value={settlementDate}
                  onChange={setSettlementDate}
                  containerStyle={{ marginBottom: DesignSystem.spacing.lg }}
                />

                {/* Notes */}
                <TextInput
                  label="Notes (Optional)"
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Any additional notes"
                  containerStyle={{ marginBottom: DesignSystem.spacing.lg }}
                />

                {/* Settlement Summary */}
                <Card style={{ marginBottom: DesignSystem.spacing.lg }}>
                  <ThemedText type="titleSmall" style={{ marginBottom: DesignSystem.spacing.md }}>
                    Settlement Summary
                  </ThemedText>

                  <View style={{ gap: DesignSystem.spacing.sm, paddingBottom: DesignSystem.spacing.md, borderBottomWidth: 1, borderBottomColor: DesignSystem.colors.light.border, marginBottom: DesignSystem.spacing.md }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <ThemedText type="bodySmall">Current Holding</ThemedText>
                      <ThemedText type="bodySmall" style={{ fontWeight: '600' }}>
                        AED {(currentHolding / 100).toFixed(2)}
                      </ThemedText>
                    </View>
                    {waterPaymentFils > 0 && (
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <ThemedText type="bodySmall">Water Payment</ThemedText>
                        <ThemedText type="bodySmall" style={{ fontWeight: '600' }}>
                          AED {(waterPaymentFils / 100).toFixed(2)}
                        </ThemedText>
                      </View>
                    )}
                    {handoverFils > 0 && (
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <ThemedText type="bodySmall">Handover</ThemedText>
                        <ThemedText type="bodySmall" style={{ fontWeight: '600' }}>
                          AED {(handoverFils / 100).toFixed(2)}
                        </ThemedText>
                      </View>
                    )}
                    {returnedFils > 0 && (
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <ThemedText type="bodySmall">Returned</ThemedText>
                        <ThemedText type="bodySmall" style={{ fontWeight: '600' }}>
                          AED {(returnedFils / 100).toFixed(2)}
                        </ThemedText>
                      </View>
                    )}
                    {otherFils > 0 && (
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <ThemedText type="bodySmall">Other</ThemedText>
                        <ThemedText type="bodySmall" style={{ fontWeight: '600' }}>
                          AED {(otherFils / 100).toFixed(2)}
                        </ThemedText>
                      </View>
                    )}
                  </View>

                  <View style={{ gap: DesignSystem.spacing.sm }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <ThemedText type="bodySmall">Total Accounted</ThemedText>
                      <ThemedText type="bodySmall" style={{ fontWeight: '600' }}>
                        AED {(totalAccounted / 100).toFixed(2)}
                      </ThemedText>
                    </View>
                    <View
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        padding: DesignSystem.spacing.sm,
                        backgroundColor: unaccounted === 0 ? DesignSystem.colors.light.success : DesignSystem.colors.light.error,
                        borderRadius: DesignSystem.spacing.sm,
                      }}
                    >
                      <ThemedText
                        type="bodySmall"
                        style={{
                          color: unaccounted === 0 ? '#1b5e20' : '#fff',
                          fontWeight: '600',
                        }}
                      >
                        {unaccounted === 0 ? '✓ Balanced' : `Unaccounted: AED ${Math.abs(unaccounted / 100).toFixed(2)}`}
                      </ThemedText>
                    </View>
                  </View>
                </Card>

                <PrimaryButton
                  onPress={handleSubmit}
                  loading={submitting}
                  disabled={unaccounted !== 0}
                  fullWidth
                >
                  {unaccounted === 0 ? 'Complete Settlement' : 'Balance Required'}
                </PrimaryButton>
              </>
            )}
          </Card>
        </View>
      </ScrollView>
    </Screen>
  );
}

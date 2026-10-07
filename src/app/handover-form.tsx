import { useState, useCallback } from 'react';
import { View, ScrollView, Alert, Pressable } from 'react-native';
import { useFocusEffect, useLocalSearchParams, router } from 'expo-router';
import { Screen, Card, PrimaryButton, LoadingState, AppHeader, DateField, TextInput } from '@/components/ui';
import { ThemedText } from '@/components/themed-text';
import { getActiveCollectors, getCollectorBalance } from '@/database';
import { recordHandover } from '@/services/collectionService';
import { DesignSystem } from '@/constants/design-system';
import { Collector } from '@/types/database';

export default function HandoverFormScreen() {
  const { from_collector_id } = useLocalSearchParams();
  const fromCollectorId = typeof from_collector_id === 'string' ? parseInt(from_collector_id, 10) : 0;

  const [collectors, setCollectors] = useState<Collector[]>([]);
  const [fromCollector, setFromCollector] = useState<Collector | null>(null);
  const [fromBalance, setFromBalance] = useState(0);
  const [toCollectorId, setToCollectorId] = useState<number | null>(null);
  const [amount, setAmount] = useState('');
  const [handoverDate, setHandoverDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCollectors = useCallback(async () => {
    try {
      setLoading(true);
      const active = await getActiveCollectors();
      setCollectors(active);

      if (fromCollectorId > 0) {
        const collector = active.find((c) => c.id === fromCollectorId);
        if (collector) {
          setFromCollector(collector);
          const balance = await getCollectorBalance(fromCollectorId);
          setFromBalance(balance);
        }
      }

      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load collectors');
    } finally {
      setLoading(false);
    }
  }, [fromCollectorId]);

  useFocusEffect(
    useCallback(() => {
      loadCollectors();
    }, [loadCollectors])
  );

  const handleSubmit = async () => {
    try {
      if (!fromCollector || !toCollectorId || !amount.trim()) {
        Alert.alert('Error', 'Please fill in all required fields');
        return;
      }

      const amountInFils = Math.round(parseFloat(amount) * 100);
      if (amountInFils <= 0) {
        Alert.alert('Error', 'Amount must be greater than zero');
        return;
      }

      setSubmitting(true);
      setError(null);

      await recordHandover(fromCollector.id, toCollectorId, amountInFils, handoverDate, notes || undefined);

      const aed = (amountInFils / 100).toFixed(2);
      Alert.alert('Success', `Handover of AED ${aed} recorded`, [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to record handover';
      setError(message);
      Alert.alert('Error', message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Screen>
        <LoadingState message="Loading collectors..." />
      </Screen>
    );
  }

  const toCollector = collectors.find((c) => c.id === toCollectorId);
  const amountInFils = amount ? Math.round(parseFloat(amount) * 100) : 0;

  return (
    <Screen scrollable>
      <AppHeader title="Record Handover" />
      <ScrollView>
        <View style={{ paddingHorizontal: DesignSystem.spacing.md, paddingVertical: DesignSystem.spacing.lg }}>
          <Card style={{ marginBottom: DesignSystem.spacing.lg }}>

            {error && (
              <View
                style={{
                  backgroundColor: DesignSystem.colors.light.error,
                  padding: DesignSystem.spacing.md,
                  borderRadius: DesignSystem.spacing.sm,
                  marginBottom: DesignSystem.spacing.lg,
                }}
              >
                <ThemedText style={{ color: '#FFFFFF' }}>{error}</ThemedText>
              </View>
            )}

            {/* From Collector Info */}
            {fromCollector && (
              <Card
                style={{
                  marginBottom: DesignSystem.spacing.lg,
                  backgroundColor: DesignSystem.colors.light.surface,
                }}
              >
                <ThemedText type="bodySmall" themeColor="textSecondary">
                  From: {fromCollector.name}
                </ThemedText>
                <ThemedText type="titleSmall" style={{ marginTop: DesignSystem.spacing.xs }}>
                  Available: AED {(fromBalance / 100).toFixed(2)}
                </ThemedText>
              </Card>
            )}

            {/* To Collector Selector */}
            <ThemedText type="bodySmall" style={{ marginBottom: DesignSystem.spacing.md }}>
              To Collector
            </ThemedText>
            <View style={{ marginBottom: DesignSystem.spacing.lg }}>
              {collectors
                .filter((c) => !fromCollector || c.id !== fromCollector.id)
                .map((collector) => (
                  <Pressable
                    key={collector.id}
                    onPress={() => setToCollectorId(collector.id)}
                    style={{
                      padding: DesignSystem.spacing.md,
                      borderRadius: DesignSystem.spacing.sm,
                      backgroundColor:
                        toCollectorId === collector.id
                          ? DesignSystem.colors.light.primaryDark
                          : DesignSystem.colors.light.surface,
                      marginBottom: DesignSystem.spacing.sm,
                    }}
                  >
                    <ThemedText
                      type="bodySmall"
                      style={{
                        color: toCollectorId === collector.id ? '#FFFFFF' : DesignSystem.colors.light.text,
                      }}
                    >
                      {collector.name}
                    </ThemedText>
                  </Pressable>
                ))}
            </View>

            {/* Amount Input */}
            <TextInput
              label="Amount (AED)"
              value={amount}
              onChangeText={setAmount}
              placeholder="e.g., 20.50"
              keyboardType="decimal-pad"
              containerStyle={{ marginBottom: DesignSystem.spacing.md }}
            />

            {/* Date Input */}
            <DateField
              label="Handover Date"
              value={handoverDate}
              onChange={setHandoverDate}
              containerStyle={{ marginBottom: DesignSystem.spacing.md }}
            />

            {/* Notes Input */}
            <TextInput
              label="Notes (Optional)"
              value={notes}
              onChangeText={setNotes}
              placeholder="Any additional notes"
              containerStyle={{ marginBottom: DesignSystem.spacing.lg }}
            />

            {/* Summary */}
            {toCollector && amountInFils > 0 && (
              <Card
                style={{
                  marginBottom: DesignSystem.spacing.lg,
                  backgroundColor: DesignSystem.colors.light.surface,
                }}
              >
                <ThemedText type="bodySmall" themeColor="textSecondary">
                  {fromCollector?.name} → {toCollector.name}
                </ThemedText>
                <ThemedText type="titleSmall" style={{ marginTop: DesignSystem.spacing.xs }}>
                  AED {(amountInFils / 100).toFixed(2)}
                </ThemedText>
              </Card>
            )}

            <PrimaryButton onPress={handleSubmit} loading={submitting} fullWidth>
              Record Handover
            </PrimaryButton>
          </Card>
        </View>
      </ScrollView>
    </Screen>
  );
}

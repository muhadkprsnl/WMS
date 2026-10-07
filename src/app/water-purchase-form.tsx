import { useCallback, useState } from 'react';
import { View, ScrollView, Alert } from 'react-native';
import { useFocusEffect, useLocalSearchParams, router } from 'expo-router';
import { Screen, Card, AppHeader, LoadingState } from '@/components/ui';
import { WaterPurchaseForm, WaterPurchaseFormValues } from '@/components/forms/water-purchase-form';
import { getWaterPurchaseById, getActiveCollectors, getCollectorBalance, getCurrentPayerForPurchase } from '@/database';
import { recordWaterPurchase, editWaterPurchase, resolvePriceForPurchase } from '@/services/waterPurchaseService';
import { DesignSystem } from '@/constants/design-system';
import { ThemedText } from '@/components/themed-text';
import { WaterPurchase, Collector } from '@/types/database';

export default function WaterPurchaseFormScreen() {
  const { id } = useLocalSearchParams();
  const purchaseId = typeof id === 'string' ? parseInt(id, 10) : undefined;
  const isEditMode = !!purchaseId;

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(isEditMode);
  const [existingPurchase, setExistingPurchase] = useState<WaterPurchase | null>(null);
  const [unitPriceFils, setUnitPriceFils] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [collectors, setCollectors] = useState<Collector[]>([]);
  const [collectorBalance, setCollectorBalance] = useState(0);
  const [selectedCollectorId, setSelectedCollectorId] = useState<number | null>(null);

  const loadCollectors = useCallback(async () => {
    try {
      const activeCollectors = await getActiveCollectors();
      setCollectors(activeCollectors);
    } catch (err) {
      console.error('Failed to load collectors:', err);
    }
  }, []);

  const loadCollectorBalance = useCallback(async (collectorId: number) => {
    try {
      const balance = await getCollectorBalance(collectorId);
      setCollectorBalance(balance);
      setSelectedCollectorId(collectorId);
    } catch (err) {
      console.error('Failed to load collector balance:', err);
    }
  }, []);

  const loadPurchase = useCallback(async () => {
    if (!purchaseId) return;

    try {
      setLoading(true);
      const purchase = await getWaterPurchaseById(purchaseId);
      if (!purchase) {
        setError('Purchase not found');
        return;
      }
      setExistingPurchase(purchase);
      setUnitPriceFils(purchase.unit_price);

      // Load current payer
      const payer = await getCurrentPayerForPurchase(purchaseId);
      if (payer && payer.collector_id > 0) {
        setSelectedCollectorId(payer.collector_id);
        const balance = await getCollectorBalance(payer.collector_id);
        setCollectorBalance(balance);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load purchase');
    } finally {
      setLoading(false);
    }
  }, [purchaseId]);

  useFocusEffect(
    useCallback(() => {
      loadCollectors();
      if (isEditMode) {
        loadPurchase();
      } else {
        // Add mode: resolve the default (wholesale) price
        resolvePriceForPurchase('wholesale').then((resolution) => {
          setUnitPriceFils(resolution.unitPriceFils);
        });
      }
    }, [isEditMode, loadPurchase, loadCollectors])
  );

  const handleSubmit = async (values: WaterPurchaseFormValues) => {
    try {
      setSubmitting(true);
      setError(null);

      const quantity = parseFloat(values.quantity);
      const unitsDisplay = quantity === 1 ? 'cane' : 'canes';
      const totalAmount = (quantity * (unitPriceFils / 100)).toFixed(2);
      const selectedCollector = collectors.find((c) => c.id === values.collectorId);
      const collectorName = selectedCollector?.name || 'Unknown';

      if (isEditMode && purchaseId) {
        await editWaterPurchase(purchaseId, {
          type: values.purchaseType,
          quantity,
          purchaseDate: values.purchaseDate,
          collectorId: values.collectorId,
          notes: values.notes || undefined,
        });
        Alert.alert('Success', `Water purchase updated: ${quantity} ${unitsDisplay} @ AED ${(unitPriceFils / 100).toFixed(2)} = AED ${totalAmount} (Paid by: ${collectorName})`, [
          {
            text: 'OK',
            onPress: () => {
              router.back();
            },
          },
        ]);
      } else {
        await recordWaterPurchase(
          values.purchaseType,
          quantity,
          values.purchaseDate,
          values.collectorId,
          values.notes || undefined
        );
        Alert.alert('Success', `Water purchase recorded: ${quantity} ${unitsDisplay} @ AED ${(unitPriceFils / 100).toFixed(2)} = AED ${totalAmount} (Paid by: ${collectorName})`, [
          {
            text: 'OK',
            onPress: () => {
              router.back();
            },
          },
        ]);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save water purchase';
      setError(message);
      Alert.alert('Error', message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Screen>
        <LoadingState message="Loading purchase..." />
      </Screen>
    );
  }

  return (
    <Screen scrollable>
      <AppHeader title={isEditMode ? 'Edit Water Purchase' : 'Record Water Purchase'} />
      <ScrollView>
        <View style={{ paddingHorizontal: DesignSystem.spacing.md, paddingVertical: DesignSystem.spacing.lg }}>
          <Card>

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

            <WaterPurchaseForm
              onSubmit={handleSubmit}
              submitLabel={isEditMode ? 'Save' : 'Record Purchase'}
              initialValues={
                existingPurchase
                  ? {
                      purchaseType: existingPurchase.purchase_type,
                      quantity: existingPurchase.quantity.toString(),
                      unitPrice: (existingPurchase.unit_price / 100).toFixed(2),
                      purchaseDate: existingPurchase.purchase_date,
                      notes: existingPurchase.notes || '',
                      collectorId: selectedCollectorId || 0,
                    }
                  : undefined
              }
              unitPriceFils={unitPriceFils}
              loading={submitting}
              collectors={collectors.map((c) => ({ label: c.name, value: c.id }))}
              collectorBalanceFils={selectedCollectorId ? collectorBalance : 0}
              onPurchaseTypeChange={async (type) => {
                const resolution = await resolvePriceForPurchase(type);
                setUnitPriceFils(resolution.unitPriceFils);
              }}
              onCollectorChange={loadCollectorBalance}
            />
          </Card>

          {!isEditMode && (
            <ThemedText
              type="bodySmall"
              themeColor="textSecondary"
              style={{ marginTop: DesignSystem.spacing.lg, textAlign: 'center' }}
            >
              Track all water purchases (wholesale and retail) with quantities and costs.
            </ThemedText>
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}

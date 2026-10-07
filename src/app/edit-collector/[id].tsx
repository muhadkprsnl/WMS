import { useCallback, useState } from 'react';
import { View, ScrollView, Alert, Pressable } from 'react-native';
import { useFocusEffect, useLocalSearchParams, router } from 'expo-router';
import { Screen, Card, LoadingState, ErrorState, PrimaryButton, AppHeader } from '@/components/ui';
import { CollectorForm, CollectorFormValues } from '@/components/forms/collector-form';
import { getCollectorById, updateCollector, deactivateCollector } from '@/database';
import { DesignSystem } from '@/constants/design-system';
import { ThemedText } from '@/components/themed-text';
import { Collector } from '@/types/database';

export default function EditCollectorScreen() {
  const { id } = useLocalSearchParams();
  const collectorId = typeof id === 'string' ? parseInt(id, 10) : 0;

  const [collector, setCollector] = useState<Collector | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadCollector = useCallback(async () => {
    if (!collectorId) return;

    try {
      setLoading(true);
      const loaded = await getCollectorById(collectorId);
      if (!loaded) {
        setError('Collector not found');
      } else {
        setCollector(loaded);
        setError(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load collector');
    } finally {
      setLoading(false);
    }
  }, [collectorId]);

  useFocusEffect(
    useCallback(() => {
      loadCollector();
    }, [loadCollector])
  );

  const handleSubmit = async (values: CollectorFormValues) => {
    if (!collector) return;

    try {
      setSubmitting(true);
      setError(null);
      await updateCollector(collector.id, {
        name: values.name,
        notes: values.notes || undefined,
      });

      Alert.alert('Success', 'Collector updated successfully', [
        {
          text: 'OK',
          onPress: () => {
            router.back();
          },
        },
      ]);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update collector';
      setError(message);
      Alert.alert('Error', message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivate = () => {
    if (!collector) return;

    Alert.alert('Deactivate Collector', `Are you sure you want to deactivate ${collector.name}?`, [
      { text: 'Cancel', onPress: () => {} },
      {
        text: 'Deactivate',
        onPress: async () => {
          try {
            setSubmitting(true);
            await deactivateCollector(collector.id);
            Alert.alert('Success', 'Collector deactivated', [
              {
                text: 'OK',
                onPress: () => {
                  router.back();
                },
              },
            ]);
          } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to deactivate collector';
            Alert.alert('Error', message);
          } finally {
            setSubmitting(false);
          }
        },
        style: 'destructive',
      },
    ]);
  };

  if (loading) {
    return (
      <Screen>
        <LoadingState message="Loading collector..." />
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
    <Screen scrollable>
      <AppHeader title="Edit Collector" />
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

            <CollectorForm
              onSubmit={handleSubmit}
              initialValues={{
                name: collector.name,
                notes: collector.notes,
              }}
              loading={submitting}
              submitLabel="Update Collector"
            />

            {collector.status === 'active' && (
              <Pressable
                onPress={handleDeactivate}
                disabled={submitting}
                style={{
                  marginTop: DesignSystem.spacing.lg,
                  padding: DesignSystem.spacing.md,
                  borderRadius: DesignSystem.spacing.sm,
                  backgroundColor: DesignSystem.colors.light.error,
                  opacity: submitting ? 0.5 : 1,
                }}
              >
                <ThemedText style={{ color: '#FFFFFF', textAlign: 'center', fontWeight: '600' }}>
                  Deactivate Collector
                </ThemedText>
              </Pressable>
            )}
          </Card>

          <ThemedText
            type="bodySmall"
            themeColor="textSecondary"
            style={{ marginTop: DesignSystem.spacing.lg, textAlign: 'center' }}
          >
            Status: {collector.status === 'active' ? '✓ Active' : '✕ Inactive'}
          </ThemedText>
        </View>
      </ScrollView>
    </Screen>
  );
}

import { useState, useCallback } from 'react';
import { View } from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { TextInput, PrimaryButton, SecondaryButton, DateField } from '@/components/ui';
import { ThemedText } from '@/components/themed-text';
import { DesignSystem } from '@/constants/design-system';
import { useColors } from '@/hooks/use-colors';
import { getActiveCollectors } from '@/database';
import { Collector } from '@/types/database';

export interface PaymentFormValues {
  amount: string;
  paymentDate: string;
  paymentMode: 'cash' | 'bank_transfer' | 'google_pay' | 'other';
  collectorId: string;
  notes: string;
}

export interface PaymentFormProps {
  onSubmit: (values: PaymentFormValues) => Promise<void>;
  initialValues?: Partial<PaymentFormValues>;
  loading?: boolean;
  submitLabel?: string;
  memberId: number;
}

const PAYMENT_MODES = [
  { label: 'Cash', value: 'cash' },
  { label: 'Bank Transfer', value: 'bank_transfer' },
  { label: 'Google Pay', value: 'google_pay' },
  { label: 'Other', value: 'other' },
] as const;

export function PaymentForm({
  onSubmit,
  initialValues,
  loading = false,
  submitLabel = 'Record Payment',
  memberId,
}: PaymentFormProps) {
  const colors = useColors();

  const [values, setValues] = useState<PaymentFormValues>({
    amount: initialValues?.amount ?? '',
    paymentDate: initialValues?.paymentDate ?? new Date().toISOString().split('T')[0],
    paymentMode: initialValues?.paymentMode ?? 'cash',
    collectorId: initialValues?.collectorId ?? '',
    notes: initialValues?.notes ?? '',
  });

  const [errors, setErrors] = useState<Partial<PaymentFormValues>>({});
  const [submitting, setSubmitting] = useState(false);
  const [collectors, setCollectors] = useState<Collector[]>([]);
  const [collectorsLoaded, setCollectorsLoaded] = useState(false);

  const loadCollectors = useCallback(async () => {
    try {
      const active = await getActiveCollectors();
      setCollectors(active);

      // If no collector is selected yet and exactly one collector exists, preselect it
      if (values.collectorId === '' && active.length === 1) {
        setValues((prev) => {
          console.log(`[PaymentForm] Preselecting single collector: ${active[0].name} (id: ${active[0].id})`);
          return { ...prev, collectorId: active[0].id.toString() };
        });
      }

      setCollectorsLoaded(true);
    } catch (err) {
      console.error('Failed to load collectors:', err);
      setCollectorsLoaded(true);
    }
  }, [values.collectorId]);

  useFocusEffect(
    useCallback(() => {
      loadCollectors();
    }, [loadCollectors])
  );

  const validate = (): boolean => {
    const newErrors: Partial<PaymentFormValues> = {};

    const amount = parseFloat(values.amount);
    if (!values.amount.trim() || isNaN(amount) || amount <= 0) {
      newErrors.amount = 'Amount must be a valid number > 0';
    }

    if (!values.paymentDate.trim()) {
      newErrors.paymentDate = 'Payment date is required';
    }

    if (!values.collectorId.trim()) {
      newErrors.collectorId = 'Collector is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      return;
    }

    try {
      setSubmitting(true);
      await onSubmit({
        amount: values.amount.trim(),
        paymentDate: values.paymentDate.trim(),
        paymentMode: values.paymentMode,
        collectorId: values.collectorId.trim(),
        notes: values.notes.trim(),
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View>
      <TextInput
        label="Amount (AED)"
        value={values.amount}
        onChangeText={(text) => {
          setValues({ ...values, amount: text });
          if (errors.amount) {
            setErrors({ ...errors, amount: undefined });
          }
        }}
        placeholder="e.g., 15.50"
        keyboardType="decimal-pad"
        error={errors.amount}
        containerStyle={{ marginBottom: DesignSystem.spacing.md }}
      />

      <DateField
        label="Payment Date"
        value={values.paymentDate}
        onChange={(text) => {
          setValues({ ...values, paymentDate: text });
          if (errors.paymentDate) {
            setErrors({ ...errors, paymentDate: undefined });
          }
        }}
        error={errors.paymentDate}
        containerStyle={{ marginBottom: DesignSystem.spacing.md }}
      />

      <View style={{ marginBottom: DesignSystem.spacing.md }}>
        <ThemedText type="bodySmall" style={{ marginBottom: DesignSystem.spacing.sm }}>
          Payment Mode
        </ThemedText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: DesignSystem.spacing.sm }}>
          {PAYMENT_MODES.map((mode) =>
            values.paymentMode === mode.value ? (
              <PrimaryButton
                key={mode.value}
                onPress={() => setValues({ ...values, paymentMode: mode.value })}
                size="sm"
              >
                {mode.label}
              </PrimaryButton>
            ) : (
              <SecondaryButton
                key={mode.value}
                onPress={() => setValues({ ...values, paymentMode: mode.value })}
                size="sm"
              >
                {mode.label}
              </SecondaryButton>
            )
          )}
        </View>
      </View>

      {collectorsLoaded && (
        <View style={{ marginBottom: DesignSystem.spacing.md }}>
          <ThemedText type="bodySmall" style={{ marginBottom: DesignSystem.spacing.sm }}>
            Collected By
          </ThemedText>

          {collectors.length > 0 ? (
            <>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: DesignSystem.spacing.sm }}>
                {collectors.map((collector) =>
                  values.collectorId === collector.id.toString() ? (
                    <PrimaryButton
                      key={collector.id}
                      onPress={() => {
                        setValues({ ...values, collectorId: collector.id.toString() });
                        if (errors.collectorId) {
                          setErrors({ ...errors, collectorId: undefined });
                        }
                      }}
                      size="sm"
                    >
                      {collector.name}
                    </PrimaryButton>
                  ) : (
                    <SecondaryButton
                      key={collector.id}
                      onPress={() => {
                        setValues({ ...values, collectorId: collector.id.toString() });
                        if (errors.collectorId) {
                          setErrors({ ...errors, collectorId: undefined });
                        }
                      }}
                      size="sm"
                    >
                      {collector.name}
                    </SecondaryButton>
                  )
                )}
              </View>
              {errors.collectorId && (
                <ThemedText style={{ color: colors.error, marginTop: DesignSystem.spacing.xs, fontSize: 12 }}>
                  {errors.collectorId}
                </ThemedText>
              )}
            </>
          ) : (
            <View style={{ padding: DesignSystem.spacing.md, backgroundColor: colors.surface, borderRadius: 8 }}>
              <ThemedText type="bodySmall" themeColor="textSecondary" style={{ marginBottom: DesignSystem.spacing.md }}>
                No collectors yet. Add a collector to record who received this payment.
              </ThemedText>
              <SecondaryButton
                onPress={() => router.push('/collection-dashboard')}
                size="sm"
              >
                Add Collector
              </SecondaryButton>
            </View>
          )}
        </View>
      )}

      <TextInput
        label="Notes (Optional)"
        value={values.notes}
        onChangeText={(text) => setValues({ ...values, notes: text })}
        placeholder="Any additional notes"
        containerStyle={{ marginBottom: DesignSystem.spacing.lg }}
      />

      <PrimaryButton onPress={handleSubmit} loading={submitting || loading} fullWidth>
        {submitLabel}
      </PrimaryButton>
    </View>
  );
}

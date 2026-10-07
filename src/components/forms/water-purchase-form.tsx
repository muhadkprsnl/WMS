import { useState } from 'react';
import { View } from 'react-native';
import { TextInput, PrimaryButton, DateField, SelectField, type SelectOption } from '@/components/ui';
import { ThemedText } from '@/components/themed-text';
import { DesignSystem } from '@/constants/design-system';
import { useColors } from '@/hooks/use-colors';

export interface WaterPurchaseFormValues {
  purchaseType: 'wholesale' | 'retail';
  quantity: string;
  unitPrice: string;
  purchaseDate: string;
  notes: string;
  collectorId: number;
}

export interface WaterPurchaseFormProps {
  onSubmit: (values: WaterPurchaseFormValues) => Promise<void>;
  initialValues?: Partial<WaterPurchaseFormValues>;
  loading?: boolean;
  submitLabel?: string;
  unitPriceFils?: number; // Read-only, passed from parent
  title?: string; // e.g., "Record Water Purchase" or "Edit Water Purchase"
  onPurchaseTypeChange?: (type: 'wholesale' | 'retail') => void; // Callback when user changes type
  collectors: SelectOption[]; // List of collectors for dropdown
  collectorBalanceFils?: number; // Current collector's cash in hand (for warning display)
  onCollectorChange?: (collectorId: number) => void; // Callback when collector selection changes
}

const PURCHASE_TYPES = [
  { label: 'Wholesale', value: 'wholesale' },
  { label: 'Retail', value: 'retail' },
] as const;

export function WaterPurchaseForm({
  onSubmit,
  initialValues,
  loading = false,
  submitLabel = 'Record Purchase',
  unitPriceFils = 0,
  title = 'Water Purchase',
  onPurchaseTypeChange,
  collectors,
  collectorBalanceFils = 0,
  onCollectorChange,
}: WaterPurchaseFormProps) {
  const colors = useColors();
  const [values, setValues] = useState<WaterPurchaseFormValues>({
    purchaseType: initialValues?.purchaseType ?? 'wholesale',
    quantity: initialValues?.quantity ?? '',
    unitPrice: initialValues?.unitPrice ?? '', // Not used in form, but kept in values for validation
    purchaseDate: initialValues?.purchaseDate ?? new Date().toISOString().split('T')[0],
    notes: initialValues?.notes ?? '',
    collectorId: initialValues?.collectorId ?? 0,
  });

  const [errors, setErrors] = useState<Partial<WaterPurchaseFormValues>>({});
  const [submitting, setSubmitting] = useState(false);

  const validate = (): boolean => {
    const newErrors: Partial<WaterPurchaseFormValues & { collectorId?: string }> = {};

    if (!values.collectorId || values.collectorId === 0) {
      (newErrors as any).collectorId = 'Select who purchased';
    }

    const quantity = parseFloat(values.quantity);
    if (!values.quantity.trim() || isNaN(quantity) || quantity <= 0) {
      newErrors.quantity = 'Quantity must be a valid whole number > 0';
    }

    if (!values.purchaseDate.trim()) {
      newErrors.purchaseDate = 'Purchase date is required';
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
        purchaseType: values.purchaseType,
        quantity: values.quantity.trim(),
        unitPrice: (unitPriceFils / 100).toFixed(2), // Convert back to AED for external API
        purchaseDate: values.purchaseDate.trim(),
        notes: values.notes.trim(),
        collectorId: values.collectorId,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const quantity = parseFloat(values.quantity) || 0;
  const unitPriceAED = unitPriceFils / 100;
  const totalAmount = (quantity * unitPriceAED).toFixed(2);
  const estimatedDeduction = (quantity * unitPriceFils);
  const balanceAfterDeduction = collectorBalanceFils - estimatedDeduction;

  return (
    <View>
      <SelectField
        label="Who purchased"
        value={values.collectorId}
        onValueChange={(id) => {
          const collectorId = Number(id);
          setValues({ ...values, collectorId });
          onCollectorChange?.(collectorId);
        }}
        options={collectors}
        placeholder="Select collector"
        error={typeof errors.collectorId === 'string' ? errors.collectorId : undefined}
        containerStyle={{ marginBottom: DesignSystem.spacing.md }}
      />

      {values.collectorId > 0 && collectorBalanceFils !== undefined && (
        <View style={{ marginBottom: DesignSystem.spacing.md }}>
          <View style={{
            backgroundColor: colors.surfaceVariant,
            padding: DesignSystem.spacing.md,
            borderRadius: DesignSystem.spacing.sm,
            borderLeftWidth: 4,
            borderLeftColor: balanceAfterDeduction < 0 ? colors.warning : colors.success,
          }}>
            <View style={{ marginBottom: DesignSystem.spacing.sm }}>
              <ThemedText type="bodySmall" themeColor="textSecondary">Current balance</ThemedText>
              <ThemedText type="bodySmall" style={{ fontWeight: '600', marginTop: DesignSystem.spacing.xs }} numberOfLines={1}>
                AED {(collectorBalanceFils / 100).toFixed(2)}
              </ThemedText>
            </View>
            {estimatedDeduction > 0 && quantity > 0 && (
              <>
                <View style={{ marginBottom: DesignSystem.spacing.sm }}>
                  <ThemedText type="bodySmall" themeColor="textSecondary">Will deduct</ThemedText>
                  <ThemedText type="bodySmall" style={{ fontWeight: '600', marginTop: DesignSystem.spacing.xs }} numberOfLines={1}>
                    AED {(estimatedDeduction / 100).toFixed(2)}
                  </ThemedText>
                </View>
                <View style={{ marginBottom: DesignSystem.spacing.sm }}>
                  <ThemedText type="bodySmall" themeColor="textSecondary">New balance</ThemedText>
                  <ThemedText type="bodySmall" style={{ fontWeight: '600', marginTop: DesignSystem.spacing.xs, color: balanceAfterDeduction < 0 ? colors.error : colors.text }} numberOfLines={1}>
                    AED {(balanceAfterDeduction / 100).toFixed(2)}
                  </ThemedText>
                </View>
                {balanceAfterDeduction < 0 && (
                  <ThemedText type="bodySmall" style={{ color: colors.error, fontWeight: '500' }}>
                    ⚠️ Balance will go negative
                  </ThemedText>
                )}
              </>
            )}
          </View>
        </View>
      )}

      <View style={{ marginBottom: DesignSystem.spacing.md }}>
        <ThemedText type="bodySmall" style={{ marginBottom: DesignSystem.spacing.sm }}>
          Purchase Type
        </ThemedText>
        <View style={{ flexDirection: 'row', gap: DesignSystem.spacing.sm }}>
          {PURCHASE_TYPES.map((type) => (
            <PrimaryButton
              key={type.value}
              onPress={() => {
                setValues({ ...values, purchaseType: type.value });
                onPurchaseTypeChange?.(type.value);
              }}
              size="sm"
              style={{
                opacity: values.purchaseType === type.value ? 1 : 0.5,
              }}
            >
              {type.label}
            </PrimaryButton>
          ))}
        </View>
      </View>

      <TextInput
        label="Quantity (Canes)"
        value={values.quantity}
        onChangeText={(text) => {
          setValues({ ...values, quantity: text });
          if (errors.quantity) {
            setErrors({ ...errors, quantity: undefined });
          }
        }}
        placeholder="e.g., 6"
        keyboardType="number-pad"
        error={errors.quantity}
        containerStyle={{ marginBottom: DesignSystem.spacing.md }}
      />

      {unitPriceFils > 0 && (
        <View
          style={{
            backgroundColor: colors.surfaceVariant,
            padding: DesignSystem.spacing.md,
            borderRadius: DesignSystem.spacing.sm,
            marginBottom: DesignSystem.spacing.md,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: DesignSystem.spacing.sm }}>
            <View>
              <ThemedText type="bodySmall" themeColor="textSecondary">
                Unit Price
              </ThemedText>
              <ThemedText type="titleSmall" style={{ marginTop: DesignSystem.spacing.xs }}>
                AED {unitPriceAED.toFixed(2)}
              </ThemedText>
            </View>
            {quantity > 0 && (
              <View style={{ alignItems: 'flex-end' }}>
                <ThemedText type="bodySmall" themeColor="textSecondary">
                  Total
                </ThemedText>
                <ThemedText type="titleSmall" style={{ marginTop: DesignSystem.spacing.xs, fontWeight: '600' }}>
                  AED {totalAmount}
                </ThemedText>
              </View>
            )}
          </View>
          {quantity > 0 && (
            <ThemedText type="bodySmall" themeColor="textSecondary" style={{ marginTop: DesignSystem.spacing.xs }}>
              {quantity} Canes × AED {unitPriceAED.toFixed(2)}
            </ThemedText>
          )}
        </View>
      )}

      <DateField
        label="Purchase Date"
        value={values.purchaseDate}
        onChange={(text) => {
          setValues({ ...values, purchaseDate: text });
          if (errors.purchaseDate) {
            setErrors({ ...errors, purchaseDate: undefined });
          }
        }}
        error={errors.purchaseDate}
        containerStyle={{ marginBottom: DesignSystem.spacing.md }}
      />

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

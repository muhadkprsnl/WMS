import { useState } from 'react';
import { View } from 'react-native';
import { TextInput, PrimaryButton } from '@/components/ui';
import { DesignSystem } from '@/constants/design-system';

export interface CollectorFormValues {
  name: string;
  notes: string;
}

export interface CollectorFormProps {
  onSubmit: (values: CollectorFormValues) => Promise<void>;
  initialValues?: Partial<CollectorFormValues>;
  loading?: boolean;
  submitLabel?: string;
}

export function CollectorForm({
  onSubmit,
  initialValues,
  loading = false,
  submitLabel = 'Create Collector',
}: CollectorFormProps) {
  const [values, setValues] = useState<CollectorFormValues>({
    name: initialValues?.name ?? '',
    notes: initialValues?.notes ?? '',
  });

  const [errors, setErrors] = useState<Partial<CollectorFormValues>>({});
  const [submitting, setSubmitting] = useState(false);

  const validate = (): boolean => {
    const newErrors: Partial<CollectorFormValues> = {};

    if (!values.name.trim()) {
      newErrors.name = 'Name is required';
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
        name: values.name.trim(),
        notes: values.notes.trim(),
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View>
      <TextInput
        label="Name"
        value={values.name}
        onChangeText={(text) => {
          setValues({ ...values, name: text });
          if (errors.name) {
            setErrors({ ...errors, name: undefined });
          }
        }}
        placeholder="e.g., Ali Ahmed"
        error={errors.name}
        containerStyle={{ marginBottom: DesignSystem.spacing.md }}
      />

      <TextInput
        label="Notes (Optional)"
        value={values.notes}
        onChangeText={(text) => setValues({ ...values, notes: text })}
        placeholder="Any additional notes"
        containerStyle={{ marginBottom: DesignSystem.spacing.lg }}
      />

      <PrimaryButton
        onPress={handleSubmit}
        loading={submitting || loading}
        fullWidth
      >
        {submitLabel}
      </PrimaryButton>
    </View>
  );
}

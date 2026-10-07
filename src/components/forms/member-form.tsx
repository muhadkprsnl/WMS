import { useState } from 'react';
import { View } from 'react-native';
import { TextInput, PrimaryButton } from '@/components/ui';
import { DesignSystem } from '@/constants/design-system';

export interface MemberFormValues {
  name: string;
  phone: string;
  notes: string;
}

export interface MemberFormProps {
  onSubmit: (values: MemberFormValues) => Promise<void>;
  initialValues?: Partial<MemberFormValues>;
  loading?: boolean;
  submitLabel?: string;
}

export function MemberForm({
  onSubmit,
  initialValues,
  loading = false,
  submitLabel = 'Create Member',
}: MemberFormProps) {
  const [values, setValues] = useState<MemberFormValues>({
    name: initialValues?.name ?? '',
    phone: initialValues?.phone ?? '',
    notes: initialValues?.notes ?? '',
  });

  const [errors, setErrors] = useState<Partial<MemberFormValues>>({});
  const [submitting, setSubmitting] = useState(false);

  const validate = (): boolean => {
    const newErrors: Partial<MemberFormValues> = {};

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
        phone: values.phone.trim(),
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
        placeholder="e.g., Ahmed Hassan"
        error={errors.name}
        containerStyle={{ marginBottom: DesignSystem.spacing.md }}
      />

      <TextInput
        label="Phone (Optional)"
        value={values.phone}
        onChangeText={(text) => setValues({ ...values, phone: text })}
        placeholder="e.g., 0501234567"
        keyboardType="phone-pad"
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

import { useState } from 'react';
import { View, Pressable, Platform, TextInput as RNTextInput } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { ThemedText } from '@/components/themed-text';
import { DesignSystem } from '@/constants/design-system';
import { useColors } from '@/hooks/use-colors';

export interface DateFieldProps {
  label: string;
  value: string; // YYYY-MM-DD
  onChange: (date: string) => void;
  error?: string;
  containerStyle?: any;
  editable?: boolean;
  placeholder?: string;
}

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

const formatLocalDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export function DateField({
  label,
  value,
  onChange,
  error,
  containerStyle,
  editable = true,
  placeholder = 'YYYY-MM-DD',
}: DateFieldProps) {
  const colors = useColors();
  const [showPicker, setShowPicker] = useState(false);
  const parsedDate = parseLocalDate(value) || new Date();

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
    }

    if (selectedDate) {
      const dateString = formatLocalDate(selectedDate);
      onChange(dateString);
    }
  };

  const handleDatePickerPress = () => {
    setShowPicker(true);
  };

  return (
    <View style={containerStyle}>
      <ThemedText type="labelMedium" style={{ marginBottom: DesignSystem.spacing.xs }}>
        {label}
      </ThemedText>
      <View style={{ position: 'relative' }}>
        <RNTextInput
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          editable={editable}
          style={{
            height: DesignSystem.touchTargets.comfortable,
            paddingHorizontal: DesignSystem.spacing.md,
            paddingRight: editable ? 48 : DesignSystem.spacing.md,
            paddingVertical: DesignSystem.spacing.sm,
            borderWidth: 1,
            borderColor: error ? colors.error : colors.border,
            borderRadius: DesignSystem.borderRadius.md,
            backgroundColor: colors.surfaceVariant,
            color: colors.text,
            fontSize: 14,
            fontWeight: '500',
          }}
          placeholderTextColor={colors.textSecondary}
        />
        {editable && (
          <Pressable
            onPress={handleDatePickerPress}
            style={{
              position: 'absolute',
              right: DesignSystem.spacing.sm,
              top: '50%',
              marginTop: -12,
              paddingHorizontal: DesignSystem.spacing.sm,
              paddingVertical: DesignSystem.spacing.sm,
            }}
          >
            <ThemedText style={{ fontSize: 18 }}>📅</ThemedText>
          </Pressable>
        )}
      </View>

      {error && (
        <ThemedText
          style={{
            color: colors.error,
            marginTop: DesignSystem.spacing.xs,
            fontSize: 12,
          }}
        >
          {error}
        </ThemedText>
      )}

      {showPicker && (
        <DateTimePicker
          value={parsedDate}
          mode="date"
          display="default"
          onChange={handleDateChange}
        />
      )}
    </View>
  );
}

import { View, Pressable, ScrollView, useColorScheme } from 'react-native';
import { useState } from 'react';
import { ThemedText } from '@/components/themed-text';
import { DesignSystem } from '@/constants/design-system';

export interface SelectOption {
  label: string;
  value: string | number;
}

interface SelectFieldProps {
  label?: string;
  value?: string | number;
  onValueChange: (value: string | number) => void;
  options: SelectOption[];
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  hint?: string;
  containerStyle?: any;
}

export function SelectField({
  label,
  value,
  onValueChange,
  options,
  placeholder = 'Select an option',
  error,
  disabled = false,
  hint,
  containerStyle,
}: SelectFieldProps) {
  const [open, setOpen] = useState(false);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = isDark ? DesignSystem.colors.dark : DesignSystem.colors.light;

  const selectedOption = options.find((opt) => opt.value === value);
  const displayText = selectedOption?.label || placeholder;

  const handleSelectOption = (selectedValue: string | number) => {
    onValueChange(selectedValue);
    setOpen(false);
  };

  return (
    <View style={containerStyle}>
      {label && (
        <ThemedText type="labelMedium" style={{ marginBottom: DesignSystem.spacing.xs }}>
          {label}
        </ThemedText>
      )}

      <Pressable
        onPress={() => !disabled && setOpen(!open)}
        disabled={disabled}
        style={[
          {
            height: DesignSystem.touchTargets.comfortable,
            paddingHorizontal: DesignSystem.spacing.md,
            paddingVertical: DesignSystem.spacing.sm,
            borderWidth: 1,
            borderColor: error ? colors.error : colors.border,
            borderRadius: DesignSystem.borderRadius.md,
            backgroundColor: isDark ? DesignSystem.colors.dark.surfaceVariant : DesignSystem.colors.light.surfaceAlt,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          },
          disabled && { opacity: 0.5 },
        ]}
      >
        <ThemedText
          style={{
            color: value ? colors.text : colors.textSecondary,
            fontSize: 14,
            fontWeight: '500',
            flex: 1,
          }}
        >
          {displayText}
        </ThemedText>
        <ThemedText style={{ color: colors.text, marginLeft: DesignSystem.spacing.sm }}>
          {open ? '▴' : '▾'}
        </ThemedText>
      </Pressable>

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

      {hint && !error && (
        <ThemedText
          themeColor="textSecondary"
          style={{
            marginTop: DesignSystem.spacing.xs,
            fontSize: 12,
          }}
        >
          {hint}
        </ThemedText>
      )}

      {open && (
        <View
          style={{
            marginTop: DesignSystem.spacing.xs,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: DesignSystem.borderRadius.md,
            backgroundColor: isDark ? DesignSystem.colors.dark.surface : DesignSystem.colors.light.surface,
            overflow: 'hidden',
            maxHeight: 200,
          }}
        >
          {options.length === 0 ? (
            <View style={{ paddingVertical: DesignSystem.spacing.md, paddingHorizontal: DesignSystem.spacing.md }}>
              <ThemedText type="bodySmall" themeColor="textSecondary">
                No collectors available
              </ThemedText>
            </View>
          ) : (
            <ScrollView nestedScrollEnabled>
              {options.map((option) => (
                <Pressable
                  key={option.value}
                  onPress={() => handleSelectOption(option.value)}
                  style={{
                    paddingVertical: DesignSystem.spacing.md,
                    paddingHorizontal: DesignSystem.spacing.md,
                    backgroundColor: value === option.value ? colors.primary + '20' : 'transparent',
                  }}
                >
                  <ThemedText
                    type="bodyMedium"
                    style={{
                      fontWeight: value === option.value ? '600' : '400',
                      color: value === option.value ? colors.primary : colors.text,
                    }}
                  >
                    {option.label}
                  </ThemedText>
                </Pressable>
              ))}
            </ScrollView>
          )}
        </View>
      )}
    </View>
  );
}

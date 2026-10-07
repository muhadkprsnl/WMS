import { useState } from 'react';
import { View, Modal } from 'react-native';
import { PrimaryButton, DateField } from '@/components/ui';
import { ThemedText } from '@/components/themed-text';
import { DesignSystem } from '@/constants/design-system';
import { Card } from '@/components/ui/card';
import { PeriodPreset } from '@/utils/period-filter';

export interface PeriodFilterProps {
  preset: PeriodPreset;
  customFromDate: string;
  customToDate: string;
  onChange: (preset: PeriodPreset, fromDate: string, toDate: string) => void;
}

export function PeriodFilter({
  preset,
  customFromDate,
  customToDate,
  onChange,
}: PeriodFilterProps) {
  const [showPresetDropdown, setShowPresetDropdown] = useState(false);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [draftCustomFromDate, setDraftCustomFromDate] = useState(customFromDate);
  const [draftCustomToDate, setDraftCustomToDate] = useState(customToDate);
  const [customModalError, setCustomModalError] = useState<string | null>(null);

  const handleApplyPreset = (selectedPreset: PeriodPreset) => {
    onChange(selectedPreset, customFromDate, customToDate);
    setShowPresetDropdown(false);
  };

  const handleOpenCustomModal = () => {
    setDraftCustomFromDate(customFromDate);
    setDraftCustomToDate(customToDate);
    setCustomModalError(null);
    setShowCustomModal(true);
  };

  const handleApplyCustom = () => {
    if (!draftCustomFromDate || !draftCustomToDate) {
      setCustomModalError('Please select both start and end dates');
      return;
    }
    if (draftCustomFromDate > draftCustomToDate) {
      setCustomModalError('Start date must be before end date');
      return;
    }

    onChange('custom', draftCustomFromDate, draftCustomToDate);
    setShowCustomModal(false);
    setCustomModalError(null);
  };

  return (
    <>
      {/* Filter Buttons */}
      <View
        style={{
          paddingHorizontal: DesignSystem.spacing.md,
          paddingTop: DesignSystem.spacing.md,
          paddingBottom: DesignSystem.spacing.sm,
          flexDirection: 'row',
          gap: DesignSystem.spacing.md,
        }}
      >
        <View style={{ flex: 1 }}>
          <PrimaryButton size="sm" fullWidth onPress={() => setShowPresetDropdown(true)}>
            Filter
          </PrimaryButton>
        </View>
        <View style={{ flex: 1 }}>
          <PrimaryButton size="sm" fullWidth onPress={handleOpenCustomModal}>
            Custom
          </PrimaryButton>
        </View>
      </View>

      {/* Preset Filter Modal */}
      <Modal visible={showPresetDropdown} transparent animationType="fade" onRequestClose={() => setShowPresetDropdown(false)}>
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'center',
            paddingHorizontal: DesignSystem.spacing.lg,
          }}
        >
          <Card>
            <ThemedText type="titleSmall" style={{ marginBottom: DesignSystem.spacing.lg }}>
              Select Period
            </ThemedText>

            <View style={{ gap: DesignSystem.spacing.sm }}>
              {[
                { label: 'This Month', value: 'this_month' as PeriodPreset },
                { label: 'Last Month', value: 'last_month' as PeriodPreset },
                { label: 'Last 3 Months', value: 'last_3_months' as PeriodPreset },
                { label: 'This Year', value: 'this_year' as PeriodPreset },
                { label: 'All Time', value: 'all_time' as PeriodPreset },
              ].map((option) => (
                <PrimaryButton
                  key={option.value}
                  onPress={() => {
                    handleApplyPreset(option.value);
                    setShowPresetDropdown(false);
                  }}
                  style={{
                    backgroundColor:
                      preset === option.value ? DesignSystem.colors.light.primary : DesignSystem.colors.light.surface,
                  }}
                >
                  <ThemedText
                    style={{
                      color: preset === option.value ? '#fff' : DesignSystem.colors.light.text,
                    }}
                  >
                    {option.label}
                  </ThemedText>
                </PrimaryButton>
              ))}
            </View>

            <PrimaryButton
              onPress={() => setShowPresetDropdown(false)}
              style={{ backgroundColor: DesignSystem.colors.light.border, marginTop: DesignSystem.spacing.md }}
            >
              <ThemedText style={{ color: DesignSystem.colors.light.text }}>Close</ThemedText>
            </PrimaryButton>
          </Card>
        </View>
      </Modal>

      {/* Custom Date Range Modal */}
      <Modal visible={showCustomModal} transparent animationType="fade" onRequestClose={() => setShowCustomModal(false)}>
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'center',
            paddingHorizontal: DesignSystem.spacing.lg,
          }}
        >
          <Card style={{ maxHeight: '80%' }}>
            <ThemedText type="titleSmall" style={{ marginBottom: DesignSystem.spacing.lg }}>
              Custom Date Range
            </ThemedText>

            <DateField
              label="From Date"
              value={draftCustomFromDate}
              onChange={setDraftCustomFromDate}
              containerStyle={{ marginBottom: DesignSystem.spacing.md }}
            />
            <DateField
              label="To Date"
              value={draftCustomToDate}
              onChange={setDraftCustomToDate}
              containerStyle={{ marginBottom: DesignSystem.spacing.md }}
            />

            {customModalError && (
              <ThemedText
                type="bodySmall"
                style={{ color: DesignSystem.colors.light.error, marginBottom: DesignSystem.spacing.md }}
              >
                {customModalError}
              </ThemedText>
            )}

            <View style={{ flexDirection: 'row', gap: DesignSystem.spacing.md, justifyContent: 'flex-end' }}>
              <PrimaryButton
                onPress={() => setShowCustomModal(false)}
                style={{ backgroundColor: DesignSystem.colors.light.border }}
              >
                <ThemedText style={{ color: DesignSystem.colors.light.text }}>Cancel</ThemedText>
              </PrimaryButton>
              <PrimaryButton onPress={handleApplyCustom}>Apply</PrimaryButton>
            </View>
          </Card>
        </View>
      </Modal>
    </>
  );
}

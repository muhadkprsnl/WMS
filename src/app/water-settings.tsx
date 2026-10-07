import { useCallback, useState } from 'react';
import { View, Alert } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Screen, Card, AppHeader, LoadingState, TextInput, PrimaryButton } from '@/components/ui';
import { ThemedText } from '@/components/themed-text';
import { getSettings, updateSettings, resetDatabase } from '@/database';
import { DesignSystem } from '@/constants/design-system';
import { Settings } from '@/types/database';

interface DraftValues {
  total_canes: string;
  wholesale_price: string;
  retail_price: string;
  monthly_contribution: string;
}

export default function WaterSettingsScreen() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [draftValues, setDraftValues] = useState<DraftValues>({
    total_canes: '',
    wholesale_price: '',
    retail_price: '',
    monthly_contribution: '',
  });
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getSettings();
      setSettings(data);
      setDraftValues({
        total_canes: '',
        wholesale_price: '',
        retail_price: '',
        monthly_contribution: '',
      });
      setIsEditing(false);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadSettings();
    }, [loadSettings])
  );

  const handleEdit = () => {
    if (settings) {
      setDraftValues({
        total_canes: settings.total_canes.toString(),
        wholesale_price: (settings.wholesale_price / 100).toFixed(2),
        retail_price: (settings.retail_price / 100).toFixed(2),
        monthly_contribution: (settings.monthly_contribution / 100).toFixed(2),
      });
      setIsEditing(true);
    }
  };

  const handleCancel = () => {
    setDraftValues({
      total_canes: '',
      wholesale_price: '',
      retail_price: '',
      monthly_contribution: '',
    });
    setIsEditing(false);
  };

  const handleReset = useCallback(async () => {
    Alert.alert('Reset Database', 'This will delete all data. Are you sure?', [
      { text: 'Cancel', onPress: () => {}, style: 'cancel' },
      {
        text: 'Reset',
        onPress: async () => {
          try {
            setResetting(true);
            await resetDatabase();
            Alert.alert('Success', 'Database reset successfully');
            loadSettings();
          } catch (err) {
            Alert.alert('Error', err instanceof Error ? err.message : 'Failed to reset database');
          } finally {
            setResetting(false);
          }
        },
        style: 'destructive',
      },
    ]);
  }, [loadSettings]);

  const handleSave = async () => {
    if (!settings) return;

    // Validation - parse and validate each field from draft strings
    const totalCanes = parseInt(draftValues.total_canes || '0');
    const wholesalePrice = Math.round(parseFloat(draftValues.wholesale_price || '0') * 100);
    const retailPrice = Math.round(parseFloat(draftValues.retail_price || '0') * 100);
    const monthlyContribution = Math.round(parseFloat(draftValues.monthly_contribution || '0') * 100);

    // Check for NaN and invalid values
    if (isNaN(totalCanes) || totalCanes <= 0) {
      Alert.alert('Error', 'Total canes must be a valid number greater than 0');
      return;
    }
    if (isNaN(wholesalePrice) || wholesalePrice <= 0) {
      Alert.alert('Error', 'Wholesale price must be a valid number greater than 0');
      return;
    }
    if (isNaN(retailPrice) || retailPrice <= 0) {
      Alert.alert('Error', 'Retail price must be a valid number greater than 0');
      return;
    }
    if (isNaN(monthlyContribution) || monthlyContribution < 0) {
      Alert.alert('Error', 'Monthly contribution must be a valid number (can be 0)');
      return;
    }

    try {
      setSaving(true);

      await updateSettings({
        total_canes: totalCanes,
        wholesale_price: wholesalePrice,
        retail_price: retailPrice,
        monthly_contribution: monthlyContribution,
      });

      // Show only what changed
      const changedFields: string[] = [];
      if (settings.total_canes !== totalCanes) {
        changedFields.push(`Total Canes: ${totalCanes}`);
      }
      if (settings.wholesale_price !== wholesalePrice) {
        changedFields.push(`Wholesale: AED ${(wholesalePrice / 100).toFixed(2)}`);
      }
      if (settings.retail_price !== retailPrice) {
        changedFields.push(`Retail: AED ${(retailPrice / 100).toFixed(2)}`);
      }
      if (settings.monthly_contribution !== monthlyContribution) {
        changedFields.push(`Monthly Contribution: AED ${(monthlyContribution / 100).toFixed(2)}`);
      }

      const successMessage = changedFields.length > 0
        ? `✓ Updated:\n\n${changedFields.join('\n')}`
        : '✓ No changes made';

      Alert.alert('Success', successMessage, [
        {
          text: 'OK',
          onPress: () => {
            loadSettings();
          },
        },
      ]);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Screen>
        <LoadingState message="Loading settings..." />
      </Screen>
    );
  }

  if (!settings) {
    return (
      <Screen>
        <AppHeader title="Water Settings" />
        <View style={{ padding: DesignSystem.spacing.lg }}>
          <ThemedText>Failed to load settings</ThemedText>
        </View>
      </Screen>
    );
  }

  return (
    <Screen scrollable>
      <AppHeader title="Water Settings" />

      <View style={{ paddingHorizontal: DesignSystem.spacing.md, paddingVertical: DesignSystem.spacing.lg }}>
          <Card>
            {/* Total Canes with Edit Button */}
            {isEditing ? (
              <TextInput
                label="Total Canes"
                value={draftValues.total_canes}
                onChangeText={(text) => setDraftValues({ ...draftValues, total_canes: text })}
                keyboardType="number-pad"
                containerStyle={{ marginBottom: DesignSystem.spacing.md }}
              />
            ) : (
              <View style={{ marginBottom: DesignSystem.spacing.lg, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ flex: 1 }}>
                  <ThemedText type="bodySmall" themeColor="textSecondary" style={{ marginBottom: DesignSystem.spacing.sm }}>
                    Total Canes
                  </ThemedText>
                  <ThemedText type="titleSmall" style={{ fontWeight: '600' }}>
                    {settings?.total_canes}
                  </ThemedText>
                </View>
                <PrimaryButton onPress={handleEdit} style={{ marginLeft: DesignSystem.spacing.md }}>
                  Edit
                </PrimaryButton>
              </View>
            )}

            {/* Wholesale Price */}
            {isEditing ? (
              <TextInput
                label="Wholesale Price (AED)"
                value={draftValues.wholesale_price}
                onChangeText={(text) => setDraftValues({ ...draftValues, wholesale_price: text })}
                keyboardType="decimal-pad"
                containerStyle={{ marginBottom: DesignSystem.spacing.md }}
              />
            ) : (
              <View style={{ marginBottom: DesignSystem.spacing.lg }}>
                <ThemedText type="bodySmall" themeColor="textSecondary" style={{ marginBottom: DesignSystem.spacing.sm }}>
                  Wholesale Price
                </ThemedText>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <ThemedText type="titleSmall" style={{ fontWeight: '600' }}>
                    AED {((settings?.wholesale_price ?? 0) / 100).toFixed(2)}
                  </ThemedText>
                </View>
              </View>
            )}

            {/* Retail Price */}
            {isEditing ? (
              <TextInput
                label="Retail Price (AED)"
                value={draftValues.retail_price}
                onChangeText={(text) => setDraftValues({ ...draftValues, retail_price: text })}
                keyboardType="decimal-pad"
                containerStyle={{ marginBottom: DesignSystem.spacing.md }}
              />
            ) : (
              <View style={{ marginBottom: DesignSystem.spacing.lg }}>
                <ThemedText type="bodySmall" themeColor="textSecondary" style={{ marginBottom: DesignSystem.spacing.sm }}>
                  Retail Price
                </ThemedText>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <ThemedText type="titleSmall" style={{ fontWeight: '600' }}>
                    AED {((settings?.retail_price ?? 0) / 100).toFixed(2)}
                  </ThemedText>
                </View>
              </View>
            )}

            {/* Monthly Contribution */}
            {isEditing ? (
              <TextInput
                label="Monthly Contribution (AED)"
                value={draftValues.monthly_contribution}
                onChangeText={(text) => setDraftValues({ ...draftValues, monthly_contribution: text })}
                keyboardType="decimal-pad"
                containerStyle={{ marginBottom: DesignSystem.spacing.md }}
              />
            ) : (
              <View style={{ marginBottom: isEditing ? DesignSystem.spacing.md : 0 }}>
                <ThemedText type="bodySmall" themeColor="textSecondary" style={{ marginBottom: DesignSystem.spacing.sm }}>
                  Monthly Contribution
                </ThemedText>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <ThemedText type="titleSmall" style={{ fontWeight: '600' }}>
                    AED {((settings?.monthly_contribution ?? 0) / 100).toFixed(2)}
                  </ThemedText>
                </View>
              </View>
            )}

            {/* Save and Cancel Buttons */}
            {isEditing && (
              <View style={{ marginTop: DesignSystem.spacing.lg, flexDirection: 'row', justifyContent: 'flex-end', gap: DesignSystem.spacing.md }}>
                <PrimaryButton
                  onPress={handleCancel}
                  style={{ backgroundColor: DesignSystem.colors.light.border }}
                >
                  <ThemedText style={{ color: DesignSystem.colors.light.text }}>Cancel</ThemedText>
                </PrimaryButton>
                <PrimaryButton onPress={handleSave} loading={saving}>
                  Save
                </PrimaryButton>
              </View>
            )}
          </Card>

          {/* Reset Database */}
          <PrimaryButton
            onPress={handleReset}
            loading={resetting}
            fullWidth
            style={{ marginTop: DesignSystem.spacing.lg, backgroundColor: DesignSystem.colors.light.error }}
          >
            Reset Database (Clear All Data)
          </PrimaryButton>
        </View>
    </Screen>
  );
}

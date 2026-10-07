import { useState } from 'react';
import { View, ScrollView, Alert, useColorScheme } from 'react-native';
import { router } from 'expo-router';
import { Screen, Card, AppHeader } from '@/components/ui';
import { MemberForm, MemberFormValues } from '@/components/forms/member-form';
import { createMember } from '@/database';
import { DesignSystem } from '@/constants/design-system';
import { ThemedText } from '@/components/themed-text';

export default function MemberFormScreen() {
  const [error, setError] = useState<string | null>(null);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = isDark ? DesignSystem.colors.dark : DesignSystem.colors.light;

  const handleSubmit = async (values: MemberFormValues) => {
    try {
      setError(null);
      await createMember(values.name, values.phone || undefined, values.notes || undefined);

      // Show success message and navigate back
      Alert.alert('Success', 'Member created successfully', [
        {
          text: 'OK',
          onPress: () => {
            router.back();
          },
        },
      ]);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create member';
      setError(message);
      // Check if it's a unique constraint error
      if (message.includes('UNIQUE constraint failed')) {
        Alert.alert('Error', 'A member with this name already exists');
      } else {
        Alert.alert('Error', message);
      }
    }
  };

  return (
    <Screen scrollable>
      <AppHeader title="Add Member" />
      <ScrollView>
        <View style={{ paddingHorizontal: DesignSystem.spacing.md, paddingVertical: DesignSystem.spacing.lg }}>
          <Card>

            {error && (
              <View
                style={{
                  backgroundColor: colors.error,
                  padding: DesignSystem.spacing.md,
                  borderRadius: DesignSystem.spacing.sm,
                  marginBottom: DesignSystem.spacing.lg,
                }}
              >
                <ThemedText style={{ color: colors.onError }}>{error}</ThemedText>
              </View>
            )}

            <MemberForm onSubmit={handleSubmit} submitLabel="Create Member" />
          </Card>

          <ThemedText
            type="bodySmall"
            themeColor="textSecondary"
            style={{ marginTop: DesignSystem.spacing.lg, textAlign: 'center' }}
          >
            All members start with active status. You can deactivate them later if needed.
          </ThemedText>
        </View>
      </ScrollView>
    </Screen>
  );
}

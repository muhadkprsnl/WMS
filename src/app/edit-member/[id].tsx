import { useCallback, useState } from 'react';
import { View, ScrollView, Alert, Pressable, useColorScheme } from 'react-native';
import { useFocusEffect, useLocalSearchParams, router } from 'expo-router';
import { Screen, Card, LoadingState, ErrorState, PrimaryButton, AppHeader } from '@/components/ui';
import { MemberForm, MemberFormValues } from '@/components/forms/member-form';
import { getMemberById, updateMember, deactivateMember } from '@/database';
import { DesignSystem } from '@/constants/design-system';
import { ThemedText } from '@/components/themed-text';
import { Member } from '@/types/database';

export default function EditMemberScreen() {
  const { id } = useLocalSearchParams();
  const memberId = typeof id === 'string' ? parseInt(id, 10) : 0;

  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = isDark ? DesignSystem.colors.dark : DesignSystem.colors.light;

  const loadMember = useCallback(async () => {
    if (!memberId) return;

    try {
      setLoading(true);
      const loaded = await getMemberById(memberId);
      if (!loaded) {
        setError('Member not found');
      } else {
        setMember(loaded);
        setError(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load member');
    } finally {
      setLoading(false);
    }
  }, [memberId]);

  useFocusEffect(
    useCallback(() => {
      loadMember();
    }, [loadMember])
  );

  const handleSubmit = async (values: MemberFormValues) => {
    if (!member) return;

    try {
      setSubmitting(true);
      setError(null);
      await updateMember(member.id, {
        name: values.name,
        phone: values.phone || undefined,
        notes: values.notes || undefined,
      });

      Alert.alert('Success', 'Member updated successfully', [
        {
          text: 'OK',
          onPress: () => {
            router.back();
          },
        },
      ]);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update member';
      setError(message);
      Alert.alert('Error', message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivate = () => {
    if (!member) return;

    Alert.alert('Deactivate Member', `Are you sure you want to deactivate ${member.name}?`, [
      { text: 'Cancel', onPress: () => {} },
      {
        text: 'Deactivate',
        onPress: async () => {
          try {
            setSubmitting(true);
            await deactivateMember(member.id);
            Alert.alert('Success', 'Member deactivated', [
              {
                text: 'OK',
                onPress: () => {
                  router.back();
                },
              },
            ]);
          } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to deactivate member';
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
        <LoadingState message="Loading member..." />
      </Screen>
    );
  }

  if (error || !member) {
    return (
      <Screen>
        <ErrorState
          title="Error"
          description={error || 'Member not found'}
          action={<PrimaryButton onPress={() => router.back()}>Go Back</PrimaryButton>}
        />
      </Screen>
    );
  }

  return (
    <Screen scrollable>
      <AppHeader title="Edit Member" />
      <ScrollView>
        <View style={{ paddingHorizontal: DesignSystem.spacing.md, paddingVertical: DesignSystem.spacing.lg }}>
          <Card style={{ marginBottom: DesignSystem.spacing.lg }}>

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

            <MemberForm
              onSubmit={handleSubmit}
              initialValues={{
                name: member.name,
                phone: member.phone,
                notes: member.notes,
              }}
              loading={submitting}
              submitLabel="Update Member"
            />

            <View style={{ gap: DesignSystem.spacing.sm, marginTop: DesignSystem.spacing.lg }}>
              <PrimaryButton
                onPress={() => router.push({ pathname: '/record-payment/[id]', params: { id: member.id.toString() } })}
              >
                + Record Payment
              </PrimaryButton>

              <PrimaryButton
                onPress={() => router.push({ pathname: '/member-payments/[id]', params: { id: member.id.toString() } })}
              >
                View Payments
              </PrimaryButton>
            </View>

            {member.status === 'active' && (
              <Pressable
                onPress={handleDeactivate}
                disabled={submitting}
                style={{
                  marginTop: DesignSystem.spacing.lg,
                  padding: DesignSystem.spacing.md,
                  borderRadius: DesignSystem.spacing.sm,
                  backgroundColor: colors.error,
                  opacity: submitting ? 0.5 : 1,
                }}
              >
                <ThemedText style={{ color: colors.onError, textAlign: 'center', fontWeight: '600' }}>
                  Deactivate Member
                </ThemedText>
              </Pressable>
            )}
          </Card>

          <ThemedText
            type="bodySmall"
            themeColor="textSecondary"
            style={{ marginTop: DesignSystem.spacing.lg, textAlign: 'center' }}
          >
            Status: {member.status === 'active' ? '✓ Active' : '✕ Inactive'}
          </ThemedText>
        </View>
      </ScrollView>
    </Screen>
  );
}

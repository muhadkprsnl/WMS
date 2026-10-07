import { useCallback, useState } from 'react';
import { View, FlatList, Pressable, ScrollView, Alert, useColorScheme, Modal } from 'react-native';
import { useFocusEffect, useLocalSearchParams, router } from 'expo-router';
import { Screen, Card, LoadingState, ErrorState, PrimaryButton, EmptyState, Button, AppHeader } from '@/components/ui';
import { ThemedText } from '@/components/themed-text';
import { getMemberById, getPaymentsByMember, updateMember, deactivateMember, activateMember, getCollectorById } from '@/database';
import { editPayment, deletePayment } from '@/services/paymentAllocationService';
import { DesignSystem } from '@/constants/design-system';
import { useColors } from '@/hooks/use-colors';
import { Member, Payment } from '@/types/database';
import { MemberForm, MemberFormValues } from '@/components/forms/member-form';
import { PaymentForm, PaymentFormValues } from '@/components/forms/payment-form';

interface MenuOption {
  label: string;
  icon: string;
  onPress: () => void;
  destructive?: boolean;
}

export default function MemberDetailScreen() {
  const { id } = useLocalSearchParams();
  const memberId = typeof id === 'string' ? parseInt(id, 10) : 0;

  const colors = useColors();

  const [member, setMember] = useState<Member | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [showEditMemberModal, setShowEditMemberModal] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [showEditPaymentModal, setShowEditPaymentModal] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);

  const loadData = useCallback(async () => {
    if (!memberId) return;

    try {
      setLoading(true);
      const [memberData, paymentsData] = await Promise.all([
        getMemberById(memberId),
        getPaymentsByMember(memberId),
      ]);

      if (!memberData) {
        setError('Member not found');
      } else {
        setMember(memberData);
        setPayments(paymentsData || []);
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
      loadData();

      // Close all modals when page loses focus (user navigates away)
      return () => {
        setShowEditMemberModal(false);
        setShowEditPaymentModal(false);
        setMenuVisible(false);
        setEditingPayment(null);
      };
    }, [loadData])
  );

  const handleEditMember = useCallback(async (values: MemberFormValues) => {
    if (!member) return;

    try {
      await updateMember(member.id, {
        name: values.name,
        phone: values.phone || undefined,
        notes: values.notes || undefined,
      });

      setShowEditMemberModal(false);
      await loadData();
      Alert.alert('Success', 'Member updated successfully');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update member';
      Alert.alert('Error', message);
    }
  }, [member, loadData]);

  const handleDeactivateMember = useCallback(async () => {
    if (!member) return;

    Alert.alert(
      'Deactivate Member',
      `Are you sure you want to deactivate ${member.name}? All payment history will be preserved.`,
      [
        { text: 'Cancel', onPress: () => {}, style: 'cancel' },
        {
          text: 'Deactivate',
          onPress: async () => {
            try {
              await deactivateMember(member.id);
              await loadData();
              Alert.alert('Success', `${member.name} has been deactivated`);
              setMenuVisible(false);
            } catch (err) {
              const message = err instanceof Error ? err.message : 'Failed to deactivate member';
              Alert.alert('Error', message);
            }
          },
          style: 'destructive',
        },
      ]
    );
  }, [member, loadData]);

  const handleActivateMember = useCallback(async () => {
    if (!member) return;

    try {
      await activateMember(member.id);
      await loadData();
      Alert.alert('Success', `${member.name} has been activated`);
      setMenuVisible(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to activate member';
      Alert.alert('Error', message);
    }
  }, [member, loadData]);

  const formatAmount = (fils: number) => {
    const aed = fils / 100;
    return `AED ${aed.toFixed(2)}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getPaymentModeLabel = (mode: string) => {
    const modes: Record<string, string> = {
      cash: 'Cash',
      bank_transfer: 'Bank Transfer',
      google_pay: 'Google Pay',
      other: 'Other',
    };
    return modes[mode] || mode;
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getStatusColor = (status: string) => {
    return status === 'active'
      ? colors.success
      : colors.error;
  };

  const confirmDeletePayment = useCallback(async (payment: Payment) => {
    const aedAmount = (payment.amount / 100).toFixed(2);
    let collectorName = 'Not assigned';
    if (payment.collected_by) {
      const collector = await getCollectorById(payment.collected_by);
      collectorName = collector?.name || 'Unknown';
    }

    Alert.alert(
      'Delete Payment?',
      `Are you sure you want to delete this payment?\n\nAmount: AED ${aedAmount}\nDate: ${payment.payment_date}\nCollected By: ${collectorName}\n\nThis will recalculate the member's payment status, monthly balance, and collector holding.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deletePayment(payment.id);
              Alert.alert('Success', 'Payment deleted successfully', [
                {
                  text: 'OK',
                  onPress: async () => {
                    await loadData();
                  },
                },
              ]);
            } catch (err) {
              const message = err instanceof Error ? err.message : 'Failed to delete payment';
              Alert.alert('Cannot Delete Payment', message);
            }
          },
        },
      ]
    );
  }, [loadData]);

  const menuOptions: MenuOption[] = member
    ? [
        {
          label: 'Edit Member',
          icon: 'edit',
          onPress: () => {
            setMenuVisible(false);
            setShowEditMemberModal(true);
          },
        },
        {
          label: member.status === 'active' ? 'Deactivate Member' : 'Activate Member',
          icon: member.status === 'active' ? 'person-off' : 'person',
          onPress: member.status === 'active' ? handleDeactivateMember : handleActivateMember,
          destructive: member.status === 'active',
        },
      ]
    : [];

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
    <Screen scrollable={false}>
      <AppHeader
        title="Member Details"
      />

      {/* Content */}
      <FlatList
        data={payments}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <Card
            style={{
              marginHorizontal: DesignSystem.spacing.md,
              marginVertical: DesignSystem.spacing.sm,
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={{ flex: 1 }}>
                <ThemedText type="titleSmall">{formatAmount(item.amount)}</ThemedText>
                <ThemedText
                  type="bodySmall"
                  themeColor="textSecondary"
                  style={{ marginTop: DesignSystem.spacing.xs }}
                >
                  {formatDate(item.payment_date)} • {getPaymentModeLabel(item.payment_mode)}
                </ThemedText>
                {item.notes && (
                  <ThemedText
                    type="bodySmall"
                    themeColor="textSecondary"
                    style={{ marginTop: DesignSystem.spacing.xs }}
                  >
                    {item.notes}
                  </ThemedText>
                )}
              </View>
              {/* Action buttons row */}
              <View style={{ flexDirection: 'row', gap: DesignSystem.spacing.sm, paddingLeft: DesignSystem.spacing.md }}>
                {/* Edit button */}
                <Pressable
                  onPress={() => {
                    setEditingPayment(item);
                    setShowEditPaymentModal(true);
                  }}
                  style={({ pressed }) => ({
                    paddingHorizontal: DesignSystem.spacing.md,
                    paddingVertical: DesignSystem.spacing.sm,
                    borderRadius: 20,
                    backgroundColor: colors.primary + '15',
                    opacity: pressed ? 0.7 : 1,
                    minHeight: 44,
                    justifyContent: 'center',
                  })}
                  accessibilityRole="button"
                  accessibilityLabel="Edit payment"
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <ThemedText type="bodySmall" style={{ color: colors.primary, fontWeight: '600' }}>
                    Edit
                  </ThemedText>
                </Pressable>

                {/* Delete button */}
                <Pressable
                  onPress={() => confirmDeletePayment(item)}
                  style={({ pressed }) => ({
                    paddingHorizontal: DesignSystem.spacing.md,
                    paddingVertical: DesignSystem.spacing.sm,
                    borderRadius: 20,
                    backgroundColor: colors.error + '15',
                    opacity: pressed ? 0.7 : 1,
                    minHeight: 44,
                    justifyContent: 'center',
                  })}
                  accessibilityRole="button"
                  accessibilityLabel="Delete payment"
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <ThemedText type="bodySmall" style={{ color: colors.error, fontWeight: '600' }}>
                    Delete
                  </ThemedText>
                </Pressable>
              </View>
            </View>
          </Card>
        )}
        scrollEnabled={true}
        contentContainerStyle={{
          paddingVertical: DesignSystem.spacing.md,
          paddingBottom: DesignSystem.spacing.lg,
        }}
        ListHeaderComponent={() => (
          <View>
            {/* Member Info Card */}
            <Card
              style={{
                marginHorizontal: DesignSystem.spacing.md,
                marginTop: DesignSystem.spacing.lg,
                marginBottom: DesignSystem.spacing.lg,
              }}
            >
              {/* Avatar and Name */}
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: DesignSystem.spacing.lg, justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                  <View
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 28,
                      backgroundColor: colors.primary,
                      justifyContent: 'center',
                      alignItems: 'center',
                      marginRight: DesignSystem.spacing.md,
                    }}
                  >
                    <ThemedText type="titleMedium" style={{ color: colors.onPrimary, fontWeight: '700' }}>
                      {getInitials(member.name)}
                    </ThemedText>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: DesignSystem.spacing.xs }}>
                      <ThemedText type="titleLarge" style={{ fontWeight: '600', marginRight: DesignSystem.spacing.sm }}>
                        {member.name}
                      </ThemedText>
                      <View
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: 4,
                          backgroundColor: getStatusColor(member.status),
                        }}
                      />
                    </View>
                    <ThemedText type="bodySmall" themeColor="textSecondary">
                      {member.status === 'active' ? 'Active' : 'Inactive'}
                    </ThemedText>
                  </View>
                </View>
                <View style={{ position: 'relative' }}>
                  <Pressable
                    onPress={() => setMenuVisible(!menuVisible)}
                    style={{ padding: DesignSystem.spacing.sm }}
                  >
                    <ThemedText type="titleSmall" style={{ fontWeight: 'bold' }}>⋮</ThemedText>
                  </Pressable>
                  {menuVisible && (
                    <View
                      style={{
                        position: 'absolute',
                        top: 40,
                        right: 0,
                        backgroundColor: colors.surface,
                        borderRadius: DesignSystem.spacing.sm,
                        minWidth: 180,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.25,
                        shadowRadius: 4,
                        elevation: 5,
                        zIndex: 1000,
                      }}
                    >
                      {menuOptions.map((option, index) => (
                        <Pressable
                          key={index}
                          onPress={option.onPress}
                          style={{
                            paddingHorizontal: DesignSystem.spacing.md,
                            paddingVertical: DesignSystem.spacing.md,
                            borderBottomWidth: index < menuOptions.length - 1 ? 1 : 0,
                            borderBottomColor: colors.border,
                          }}
                        >
                          <ThemedText
                            type="bodySmall"
                            style={{
                              color: option.destructive ? colors.error : undefined,
                              fontWeight: '500',
                            }}
                          >
                            {option.label}
                          </ThemedText>
                        </Pressable>
                      ))}
                    </View>
                  )}
                </View>
              </View>

              {/* Member Details */}
              <View style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingTop: DesignSystem.spacing.md }}>
                {member.phone && (
                  <View style={{ marginBottom: DesignSystem.spacing.md }}>
                    <ThemedText type="bodySmall" themeColor="textSecondary">
                      Phone
                    </ThemedText>
                    <ThemedText type="bodySmall" style={{ marginTop: DesignSystem.spacing.xs, fontWeight: '500' }}>
                      {member.phone}
                    </ThemedText>
                  </View>
                )}

                {member.joined_date && (
                  <View style={{ marginBottom: member.notes ? DesignSystem.spacing.md : 0 }}>
                    <ThemedText type="bodySmall" themeColor="textSecondary">
                      Joined Date
                    </ThemedText>
                    <ThemedText type="bodySmall" style={{ marginTop: DesignSystem.spacing.xs, fontWeight: '500' }}>
                      {formatDate(member.joined_date)}
                    </ThemedText>
                  </View>
                )}

                {member.notes && (
                  <View>
                    <ThemedText type="bodySmall" themeColor="textSecondary">
                      Notes
                    </ThemedText>
                    <ThemedText type="bodySmall" style={{ marginTop: DesignSystem.spacing.xs, fontWeight: '500' }}>
                      {member.notes}
                    </ThemedText>
                  </View>
                )}
              </View>
            </Card>

            {/* Payment History Header */}
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingHorizontal: DesignSystem.spacing.md,
                marginBottom: DesignSystem.spacing.md,
              }}
            >
              <ThemedText type="titleSmall" style={{ fontWeight: '600' }}>
                Payment History
              </ThemedText>
              <PrimaryButton
                onPress={() => router.push({ pathname: '/record-payment/[id]', params: { id: member.id.toString() } })}
                size="sm"
              >
                + Add Record
              </PrimaryButton>
            </View>
          </View>
        )}
        ListEmptyComponent={() =>
          !loading ? (
            <View style={{ paddingHorizontal: DesignSystem.spacing.md, flex: 1, marginTop: DesignSystem.spacing.lg }}>
              <EmptyState
                title="No Payments"
                description="No payments recorded for this member yet"
                action={
                  <PrimaryButton
                    onPress={() => router.push({ pathname: '/record-payment/[id]', params: { id: member.id.toString() } })}
                  >
                    Record First Payment
                  </PrimaryButton>
                }
              />
            </View>
          ) : null
        }
      />

      {/* Edit Member Modal */}
      <Modal visible={showEditMemberModal} transparent animationType="slide">
        <View
          style={{
            flex: 1,
            justifyContent: 'flex-end',
            backgroundColor: 'rgba(0,0,0,0.5)',
          }}
        >
          <View
            style={{
              backgroundColor: colors.surface,
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
              paddingHorizontal: DesignSystem.spacing.md,
              paddingVertical: DesignSystem.spacing.lg,
              maxHeight: '80%',
            }}
          >
            <ScrollView>
              <View style={{ marginBottom: DesignSystem.spacing.md }}>
                <ThemedText type="titleMedium" style={{ fontWeight: '600' }}>
                  Edit Member
                </ThemedText>
              </View>

              <MemberForm
                onSubmit={handleEditMember}
                initialValues={{
                  name: member.name,
                  phone: member.phone,
                  notes: member.notes,
                }}
                submitLabel="Save Changes"
              />

              <Button
                onPress={() => setShowEditMemberModal(false)}
                variant="secondary"
                fullWidth
                style={{ marginTop: DesignSystem.spacing.md, marginBottom: DesignSystem.spacing.lg }}
              >
                Cancel
              </Button>
            </ScrollView>
          </View>
        </View>
      </Modal>

{/* Edit Payment Modal */}
      <Modal visible={showEditPaymentModal} transparent animationType="slide">
        <View
          style={{
            flex: 1,
            justifyContent: 'flex-end',
            backgroundColor: 'rgba(0,0,0,0.5)',
          }}
        >
          <View
            style={{
              backgroundColor: colors.surface,
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
              paddingHorizontal: DesignSystem.spacing.md,
              paddingVertical: DesignSystem.spacing.lg,
              maxHeight: '80%',
            }}
          >
            <ScrollView>
              <View style={{ marginBottom: DesignSystem.spacing.md }}>
                <ThemedText type="titleMedium" style={{ fontWeight: '600' }}>
                  Edit Payment
                </ThemedText>
              </View>

              {editingPayment && (
                <PaymentForm
                  memberId={member.id}
                  initialValues={{
                    amount: (editingPayment.amount / 100).toString(),
                    paymentDate: editingPayment.payment_date,
                    paymentMode: editingPayment.payment_mode,
                    collectorId: editingPayment.collected_by?.toString() || '',
                    notes: editingPayment.notes || '',
                  }}
                  onSubmit={async (values: PaymentFormValues) => {
                    try {
                      const amount = parseFloat(values.amount);
                      // Convert AED to fils (minor units)
                      const amountInFils = Math.round(amount * 100);

                      await editPayment(editingPayment.id, {
                        amount: amountInFils,
                        payment_date: values.paymentDate,
                        payment_mode: values.paymentMode,
                        collected_by: values.collectorId ? parseInt(values.collectorId, 10) : undefined,
                        notes: values.notes || undefined,
                      });

                      Alert.alert('Success', `Payment of AED ${amount.toFixed(2)} updated for ${member.name}`, [
                        {
                          text: 'OK',
                          onPress: async () => {
                            await loadData();
                            setShowEditPaymentModal(false);
                            setEditingPayment(null);
                          },
                        },
                      ]);
                    } catch (err) {
                      const message = err instanceof Error ? err.message : 'Failed to update payment';
                      Alert.alert('Error', message);
                    }
                  }}
                  submitLabel="Update Payment"
                />
              )}

              <Button
                onPress={() => {
                  setShowEditPaymentModal(false);
                  setEditingPayment(null);
                }}
                variant="secondary"
                fullWidth
                style={{ marginTop: DesignSystem.spacing.md, marginBottom: DesignSystem.spacing.lg }}
              >
                Cancel
              </Button>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}
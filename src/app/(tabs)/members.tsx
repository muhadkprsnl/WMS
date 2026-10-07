import { useCallback, useState } from 'react';
import { View, FlatList, Pressable, Modal, useColorScheme } from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { Screen, AppHeader, Card, LoadingState, ErrorState, PrimaryButton, EmptyState } from '@/components/ui';
import { ThemedText } from '@/components/themed-text';
import { getActiveMembers, getSettings } from '@/database';
import { DesignSystem } from '@/constants/design-system';
import { Member } from '@/types/database';
import { getMonthPaymentStatus, type MonthPaymentStatus } from '@/services/memberPaymentStatusService';

type PaymentStatusFilter = 'all' | 'paid' | 'partially-paid' | 'pending';

interface MemberWithPaymentStatus extends Member {
  paymentStatus: 'paid' | 'partially-paid' | 'pending';
  amount: number;
}

export default function MembersScreen() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<MonthPaymentStatus | null>(null);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<PaymentStatusFilter>('all');

  const currentMonth = new Date().toISOString().slice(0, 7);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const loadMembers = useCallback(async () => {
    try {
      setLoading(true);
      const loaded = await getActiveMembers();
      setMembers(loaded);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load members');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadPaymentStatus = useCallback(async (month: string) => {
    try {
      const status = await getMonthPaymentStatus(month);
      setPaymentStatus(status);
    } catch (err) {
      console.error('Failed to load payment status:', err);
      setPaymentStatus(null);
    }
  }, []);

  const loadSettings = useCallback(async () => {
    try {
      await getSettings();
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadMembers();
      loadPaymentStatus(selectedMonth);
      loadSettings();
    }, [loadMembers, loadPaymentStatus, selectedMonth, loadSettings])
  );

  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
  };

  const getPaymentStatusLabel = (status: 'paid' | 'partially-paid' | 'pending'): string => {
    switch (status) {
      case 'paid':
        return 'Paid';
      case 'partially-paid':
        return 'Partial';
      case 'pending':
        return 'Pending';
    }
  };

  const getPaymentStatusColor = (status: 'paid' | 'partially-paid' | 'pending'): string => {
    switch (status) {
      case 'paid':
        return '#1B5E20';
      case 'partially-paid':
        return '#F57F17';
      case 'pending':
        return '#D32F2F';
    }
  };

  const changeMonth = useCallback((direction: 'prev' | 'next') => {
    const date = new Date(selectedMonth + '-01');
    if (direction === 'prev') {
      date.setMonth(date.getMonth() - 1);
    } else {
      date.setMonth(date.getMonth() + 1);
    }
    const newMonth = date.toISOString().slice(0, 7);
    setSelectedMonth(newMonth);
  }, [selectedMonth]);

  const getMembersWithStatus = useCallback((): MemberWithPaymentStatus[] => {
    if (!paymentStatus) return [];

    return members
      .map((member) => {
        const memberPaymentStatus = paymentStatus.members.find(
          (m) => m.memberId === member.id
        );

        let paymentStatusType: 'paid' | 'partially-paid' | 'pending' = 'pending';
        let amount = 0;

        if (memberPaymentStatus) {
          if (memberPaymentStatus.status === 'Paid') {
            paymentStatusType = 'paid';
            amount = memberPaymentStatus.amountPaid;
          } else if (memberPaymentStatus.status === 'Partial') {
            paymentStatusType = 'partially-paid';
            amount = memberPaymentStatus.amountPaid;
          } else {
            paymentStatusType = 'pending';
            amount = memberPaymentStatus.amountPaid;
          }
        }

        return {
          ...member,
          paymentStatus: paymentStatusType,
          amount,
        };
      })
      .filter((m) => {
        if (selectedFilter === 'all') return true;
        if (selectedFilter === 'paid') return m.paymentStatus === 'paid';
        if (selectedFilter === 'partially-paid') return m.paymentStatus === 'partially-paid';
        if (selectedFilter === 'pending') return m.paymentStatus === 'pending';
        return true;
      });
  }, [paymentStatus, members, selectedFilter]);

  const handleRecordPayment = useCallback(
    (member: Member) => {
      // Pass the currently selected month so Record Payment defaults to that month's date
      router.push({
        pathname: '/record-payment/[id]',
        params: { id: member.id.toString(), month: selectedMonth },
      });
    },
    [selectedMonth]
  );

  const handleViewMember = useCallback((member: Member) => {
    router.push({
      pathname: '/member-detail/[id]',
      params: { id: member.id.toString() },
    });
  }, []);

  if (loading && members.length === 0) {
    return (
      <Screen>
        <LoadingState message="Loading members..." />
      </Screen>
    );
  }

  const membersWithStatus = getMembersWithStatus();

  return (
    <Screen scrollable={false}>
      <AppHeader title="Members" />
      <FlatList
        data={[
          { type: 'month-selector' },
          { type: 'payment-summary' },
          { type: 'members-header' },
          ...membersWithStatus.map((m) => ({ ...m, type: 'member' })),
        ]}
        keyExtractor={(item, idx) => {
          if ('type' in item) {
            if (item.type === 'month-selector') return 'month-selector';
            if (item.type === 'payment-summary') return 'payment-summary';
            if (item.type === 'members-header') return 'members-header';
          }
          return (item as any).id?.toString() || idx.toString();
        }}
        renderItem={({ item }) => {
          if ('type' in item) {
            // Month Selector with Share
            if (item.type === 'month-selector') {
              return (
                <View
                  style={{
                    paddingHorizontal: DesignSystem.spacing.md,
                    paddingTop: DesignSystem.spacing.lg,
                    paddingBottom: DesignSystem.spacing.md,
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  {/* Month Navigation - Left */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: DesignSystem.spacing.md }}>
                    <Pressable onPress={() => changeMonth('prev')} style={{ padding: DesignSystem.spacing.sm }}>
                      <ThemedText style={{ fontSize: 18, fontWeight: '600' }}>‹</ThemedText>
                    </Pressable>
                    <ThemedText type="bodySmall" style={{ fontWeight: '600', minWidth: 100, textAlign: 'center' }}>
                      {formatMonth(selectedMonth)}
                    </ThemedText>
                    <Pressable onPress={() => changeMonth('next')} style={{ padding: DesignSystem.spacing.sm }}>
                      <ThemedText style={{ fontSize: 18, fontWeight: '600' }}>›</ThemedText>
                    </Pressable>
                  </View>

                  {/* Share Button - Right */}
                  <Pressable
                    onPress={() => router.push({ pathname: '/members-share', params: { month: selectedMonth } })}
                    style={{
                      paddingHorizontal: DesignSystem.spacing.md,
                      paddingVertical: DesignSystem.spacing.sm,
                    }}
                  >
                    <ThemedText
                      type="bodySmall"
                      style={{
                        color: DesignSystem.colors.light.primary,
                        fontWeight: '600',
                      }}
                    >
                      Share
                    </ThemedText>
                  </Pressable>
                </View>
              );
            }

            // Payment Summary Card
            if (item.type === 'payment-summary') {
              const expected = paymentStatus?.expectedAmount ? paymentStatus.expectedAmount / 100 : 0;
              const collected = paymentStatus?.collectedAmount ? paymentStatus.collectedAmount / 100 : 0;
              const paidCount = paymentStatus?.paidCount ?? 0;
              const pendingCount = paymentStatus?.pendingCount ?? 0;

              return (
                <Card
                  style={{
                    marginHorizontal: DesignSystem.spacing.md,
                    marginVertical: DesignSystem.spacing.md,
                  }}
                >
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: DesignSystem.spacing.sm }}>
                        {/* Expected */}
                        <View style={{ flex: 1 }}>
                          <ThemedText type="bodySmall" themeColor="textSecondary" style={{ marginBottom: DesignSystem.spacing.xs }}>
                            EXPECT
                          </ThemedText>
                          <ThemedText type="titleSmall" style={{ fontWeight: '600' }}>
                            د {expected.toFixed(2)}
                          </ThemedText>
                        </View>

                        {/* Divider */}
                        <View style={{ width: 1, backgroundColor: isDark ? '#333333' : '#E0E0E0' }} />

                        {/* Collected */}
                        <View style={{ flex: 1 }}>
                          <ThemedText type="bodySmall" themeColor="textSecondary" style={{ marginBottom: DesignSystem.spacing.xs }}>
                            COLLECT
                          </ThemedText>
                          <ThemedText type="titleSmall" style={{ fontWeight: '600' }}>
                            د {collected.toFixed(2)}
                          </ThemedText>
                        </View>

                        {/* Divider */}
                        <View style={{ width: 1, backgroundColor: isDark ? '#333333' : '#E0E0E0' }} />

                        {/* Total Members */}
                        <View style={{ flex: 1 }}>
                          <ThemedText type="bodySmall" themeColor="textSecondary" style={{ marginBottom: DesignSystem.spacing.xs }}>
                            TOTAL
                          </ThemedText>
                          <ThemedText type="titleSmall" style={{ fontWeight: '600' }}>
                            {members.length}
                          </ThemedText>
                        </View>

                        {/* Divider */}
                        <View style={{ width: 1, backgroundColor: isDark ? '#333333' : '#E0E0E0' }} />

                        {/* Paid */}
                        <View style={{ flex: 1 }}>
                          <ThemedText type="bodySmall" themeColor="textSecondary" style={{ marginBottom: DesignSystem.spacing.xs }}>
                            PAID
                          </ThemedText>
                          <ThemedText type="titleSmall" style={{ fontWeight: '600' }}>
                            {paidCount}
                          </ThemedText>
                        </View>

                        {/* Divider */}
                        <View style={{ width: 1, backgroundColor: isDark ? '#333333' : '#E0E0E0' }} />

                        {/* Pending */}
                        <View style={{ flex: 1 }}>
                          <ThemedText type="bodySmall" themeColor="textSecondary" style={{ marginBottom: DesignSystem.spacing.xs }}>
                            PENDING
                          </ThemedText>
                          <ThemedText type="titleSmall" style={{ fontWeight: '600' }}>
                            {pendingCount}
                          </ThemedText>
                        </View>
                      </View>
                </Card>
              );
            }

            // Members Header with Filter and Count
            if (item.type === 'members-header') {
              return (
                <View
                  style={{
                    paddingHorizontal: DesignSystem.spacing.md,
                    paddingTop: DesignSystem.spacing.lg,
                    paddingBottom: DesignSystem.spacing.md,
                  }}
                >
                  {/* Header Row */}
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <ThemedText type="titleSmall" style={{ fontWeight: '600' }}>
                      MEMBERS
                    </ThemedText>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: DesignSystem.spacing.sm }}>
                      <Pressable
                        onPress={() => setFilterModalVisible(true)}
                        style={{
                          paddingHorizontal: DesignSystem.spacing.md,
                          paddingVertical: DesignSystem.spacing.sm,
                        }}
                      >
                        <ThemedText
                          type="bodySmall"
                        style={{
                          color: DesignSystem.colors.light.primary,
                          fontWeight: '600',
                        }}
                      >
                        Filter
                      </ThemedText>
                    </Pressable>
                      <PrimaryButton
                        onPress={() => router.push('/member-form')}
                        size="sm"
                      >
                        + Add
                      </PrimaryButton>
                    </View>
                  </View>
                </View>
              );
            }
          }

          // Member Row
          const member = item as MemberWithPaymentStatus;
          return (
            <Pressable
              onPress={() => handleViewMember(member)}
              style={({ pressed }) => ({
                marginHorizontal: DesignSystem.spacing.md,
                marginVertical: DesignSystem.spacing.xs,
              })}
            >
              {({ pressed: rowPressed }) => (
              <Card
                style={{
                  backgroundColor: isDark
                    ? rowPressed ? '#2a2a2a' : '#1e1e1e'
                    : rowPressed ? '#f5f5f5' : '#ffffff',
                  opacity: rowPressed ? 0.7 : 1,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  {/* Name and Payment Status - Tapable Area */}
                  <View style={{ flex: 1, marginRight: DesignSystem.spacing.md }}>
                    <ThemedText type="titleSmall" numberOfLines={1}>
                      {member.name}
                    </ThemedText>
                  </View>

                  {/* Payment Status */}
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      marginRight: DesignSystem.spacing.md,
                      minWidth: 70,
                    }}
                  >
                    <View
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: getPaymentStatusColor(member.paymentStatus),
                        marginRight: DesignSystem.spacing.sm,
                      }}
                    />
                    <ThemedText type="bodySmall" style={{ fontWeight: '600' }}>
                      {getPaymentStatusLabel(member.paymentStatus)}
                    </ThemedText>
                  </View>

                  {/* Record Button */}
                  <Pressable
                    onPress={() => handleRecordPayment(member)}
                    style={({ pressed }) => ({
                      paddingHorizontal: DesignSystem.spacing.md,
                      paddingVertical: DesignSystem.spacing.sm,
                      borderRadius: DesignSystem.spacing.sm,
                      backgroundColor: pressed
                        ? isDark ? '#1a472a' : '#c8e6c9'
                        : isDark ? '#1b5e20' : '#e8f5e9',
                      opacity: pressed ? 0.8 : 1,
                    })}
                  >
                    <ThemedText
                      type="bodySmall"
                      style={{
                        color: DesignSystem.colors.light.primary,
                        fontWeight: '600'
                      }}
                    >
                      Record
                    </ThemedText>
                  </Pressable>
                </View>
              </Card>
              )}
            </Pressable>
          );
        }}
        scrollEnabled={true}
        contentContainerStyle={{
          paddingBottom: DesignSystem.spacing.lg,
        }}
        ListEmptyComponent={
          error ? (
            <View style={{ paddingHorizontal: DesignSystem.spacing.md, paddingTop: DesignSystem.spacing.lg }}>
              <ErrorState
                title="Error"
                description={error}
                action={<PrimaryButton onPress={loadMembers}>Retry</PrimaryButton>}
              />
            </View>
          ) : (
            <View style={{ paddingHorizontal: DesignSystem.spacing.md, paddingTop: DesignSystem.spacing.lg, flex: 1 }}>
              <EmptyState
                title="No Members Yet"
                description="Add your household members to track contributions"
                action={<PrimaryButton onPress={() => router.push('/member-form')}>Create Member</PrimaryButton>}
              />
            </View>
          )
        }
      />

      {/* Filter Modal */}
      <Modal
        visible={filterModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
          onPress={() => setFilterModalVisible(false)}
        >
          <View
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              backgroundColor: isDark ? DesignSystem.colors.dark.surface : DesignSystem.colors.light.surface,
              borderTopLeftRadius: DesignSystem.spacing.lg,
              borderTopRightRadius: DesignSystem.spacing.lg,
              padding: DesignSystem.spacing.lg,
            }}
            onStartShouldSetResponder={() => true}
          >
            <ThemedText type="titleSmall" style={{ fontWeight: '600', marginBottom: DesignSystem.spacing.lg }}>
              Filter by Payment Status
            </ThemedText>

            {['all', 'paid', 'partially-paid', 'pending'].map((option) => (
              <Pressable
                key={option}
                onPress={() => {
                  setSelectedFilter(option as PaymentStatusFilter);
                  setFilterModalVisible(false);
                }}
                style={{
                  paddingVertical: DesignSystem.spacing.md,
                  paddingHorizontal: DesignSystem.spacing.md,
                  borderBottomWidth: 1,
                  borderBottomColor: isDark ? '#333333' : '#E0E0E0',
                  flexDirection: 'row',
                  alignItems: 'center',
                }}
              >
                {selectedFilter === option && (
                  <View
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 10,
                      backgroundColor: DesignSystem.colors.light.primary,
                      marginRight: DesignSystem.spacing.md,
                    }}
                  />
                )}
                {selectedFilter !== option && (
                  <View
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 10,
                      borderWidth: 2,
                      borderColor: isDark ? '#666666' : '#CCCCCC',
                      marginRight: DesignSystem.spacing.md,
                    }}
                  />
                )}
                <ThemedText type="bodySmall" style={{ fontWeight: '600' }}>
                  {option === 'all'
                    ? 'All'
                    : option === 'paid'
                    ? 'Paid'
                    : option === 'partially-paid'
                    ? 'Partially Paid'
                    : 'Pending'}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </Screen>
  );
}

import React from 'react';
import { View } from 'react-native';
import { ThemedText } from './themed-text';
import { MonthPaymentStatus } from '@/services/memberPaymentStatusService';

interface MemberPaymentStatusCardProps {
  data: MonthPaymentStatus;
}

/**
 * Member payment status card: visible on Members screen and shareable via ViewShot
 *
 * Shows month overview (expected, collected, paid/partial/pending counts)
 * and detailed list of each member's payment status
 */
export const MemberPaymentStatusCard = React.forwardRef<View, MemberPaymentStatusCardProps>(
  ({ data }, ref) => {
    const formatMoney = (fils: number): string => {
      const dirham = fils / 100;
      return `د ${dirham.toFixed(2)}`;
    };

    const formatMonth = (monthStr: string) => {
      const [year, month] = monthStr.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1);
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
    };

    const getStatusColor = (status: string): string => {
      switch (status) {
        case 'Paid':
          return '#1B5E20'; // green
        case 'Partial':
          return '#F57C00'; // orange
        case 'Pending':
          return '#D32F2F'; // red
        default:
          return '#212121'; // black
      }
    };

    return (
      <View
        ref={ref}
        style={{
          backgroundColor: '#FFFFFF',
          padding: 20,
          gap: 12,
        }}
      >
          {/* Title */}
          <View style={{ marginBottom: 4 }}>
            <ThemedText type="titleSmall" style={{ fontWeight: '600', color: '#212121' }}>
              Payment Status
            </ThemedText>
            <ThemedText type="bodySmall" style={{ color: '#757575', marginTop: 4 }}>
              {formatMonth(data.month)}
            </ThemedText>
          </View>

          {/* Summary Row 1: Expected vs Collected */}
          <View style={{ gap: 8, paddingVertical: 8 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <ThemedText type="bodySmall" style={{ color: '#616161' }}>
                Expected
              </ThemedText>
              <ThemedText type="bodySmall" style={{ fontWeight: '600', color: '#212121' }}>
                {formatMoney(data.expectedAmount)}
              </ThemedText>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <ThemedText type="bodySmall" style={{ color: '#616161' }}>
                Collected
              </ThemedText>
              <ThemedText type="bodySmall" style={{ fontWeight: '600', color: '#1B5E20' }}>
                {formatMoney(data.collectedAmount)}
              </ThemedText>
            </View>
          </View>

          {/* Divider */}
          <View style={{ height: 1, backgroundColor: '#E0E0E0' }} />

          {/* Summary Row 2: Counts */}
          <View style={{ gap: 8, paddingVertical: 8 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <ThemedText type="bodySmall" style={{ color: '#616161' }}>
                Paid
              </ThemedText>
              <ThemedText type="bodySmall" style={{ fontWeight: '600', color: '#1B5E20' }}>
                {data.paidCount}
              </ThemedText>
            </View>
            {data.partialCount > 0 && (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <ThemedText type="bodySmall" style={{ color: '#616161' }}>
                  Partial
                </ThemedText>
                <ThemedText type="bodySmall" style={{ fontWeight: '600', color: '#F57C00' }}>
                  {data.partialCount}
                </ThemedText>
              </View>
            )}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <ThemedText type="bodySmall" style={{ color: '#616161' }}>
                Pending
              </ThemedText>
              <ThemedText type="bodySmall" style={{ fontWeight: '600', color: '#D32F2F' }}>
                {data.pendingCount}
              </ThemedText>
            </View>
          </View>

          {/* Divider */}
          <View style={{ height: 1, backgroundColor: '#E0E0E0', marginVertical: 4 }} />

          {/* Member List */}
          <View style={{ gap: 8, paddingVertical: 8 }}>
            {data.members.map((member) => (
              <View key={member.memberId} style={{ gap: 4 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <ThemedText
                      type="bodySmall"
                      style={{
                        fontWeight: '600',
                        color: '#212121',
                      }}
                      numberOfLines={1}
                    >
                      {member.name}
                    </ThemedText>
                  </View>
                  <ThemedText
                    type="bodySmall"
                    style={{
                      fontWeight: '600',
                      color: getStatusColor(member.status),
                      minWidth: 50,
                      textAlign: 'right',
                    }}
                  >
                    {member.status}
                  </ThemedText>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <ThemedText type="bodySmall" style={{ color: '#757575' }}>
                    {member.status === 'Paid'
                      ? formatMoney(member.amountPaid)
                      : `${formatMoney(member.amountPaid)} / ${formatMoney(member.amountExpected)}`}
                  </ThemedText>
                </View>
              </View>
            ))}
          </View>
      </View>
    );
  }
);

MemberPaymentStatusCard.displayName = 'MemberPaymentStatusCard';

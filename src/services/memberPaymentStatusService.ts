/**
 * Member Payment Status Service
 *
 * Business logic for generating member payment status for a specific month.
 * Used for dashboard display and sharing via image.
 */

import {
  getActiveMembers,
  getSettings,
  getTotalAllocatedForMonth,
} from '@/database';

export type PaymentStatus = 'Paid' | 'Partial' | 'Pending';

export interface MemberPaymentStatus {
  memberId: number;
  name: string;
  status: PaymentStatus;
  amountPaid: number;
  amountExpected: number;
  remaining: number;
}

export interface MonthPaymentStatus {
  month: string;
  expectedAmount: number;
  collectedAmount: number;
  paidCount: number;
  pendingCount: number;
  partialCount: number;
  members: MemberPaymentStatus[];
}

/**
 * Calculate payment status for all members in a given month
 */
export async function getMonthPaymentStatus(month: string): Promise<MonthPaymentStatus> {
  const activeMembers = await getActiveMembers();
  const settings = await getSettings();
  const perMemberAmount = settings.monthly_contribution;

  const members: MemberPaymentStatus[] = [];
  let collectedAmount = 0;
  let paidCount = 0;
  let partialCount = 0;
  let pendingCount = 0;

  for (const member of activeMembers) {
    const amountPaid = await getTotalAllocatedForMonth(member.id, month);
    const remaining = Math.max(0, perMemberAmount - amountPaid);
    let status: PaymentStatus = 'Pending';

    if (amountPaid >= perMemberAmount) {
      status = 'Paid';
      paidCount++;
    } else if (amountPaid > 0) {
      status = 'Partial';
      partialCount++;
    } else {
      pendingCount++;
    }

    collectedAmount += amountPaid;

    members.push({
      memberId: member.id,
      name: member.name,
      status,
      amountPaid,
      amountExpected: perMemberAmount,
      remaining,
    });
  }

  // expectedAmount is the total expected for the month: active members × monthly contribution
  const expectedAmount = perMemberAmount * activeMembers.length;

  return {
    month,
    expectedAmount,
    collectedAmount,
    paidCount,
    pendingCount,
    partialCount,
    members: members.sort((a, b) => {
      // Sort by status (Paid first, then Partial, then Pending)
      const statusOrder = { 'Paid': 0, 'Partial': 1, 'Pending': 2 };
      if (statusOrder[a.status] !== statusOrder[b.status]) {
        return statusOrder[a.status] - statusOrder[b.status];
      }
      // Then by name
      return a.name.localeCompare(b.name);
    }),
  };
}

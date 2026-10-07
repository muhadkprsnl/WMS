import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import {
  initializeDatabase,
  closeDatabase,
  createMember,
  getAllocationsByMonth,
  updateSettings,
  getSettings,
} from '@/database';
import { recordPayment } from '@/services/paymentAllocationService';
import { getMonthPaymentStatus } from '@/services/memberPaymentStatusService';

describe('Payment Allocation Service', () => {
  beforeAll(async () => {
    await initializeDatabase();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  describe('Basic Allocation', () => {
    it('Test 1: Payment equals monthly contribution', async () => {
      const member = await createMember('Ali');
      const settings = await getSettings();

      // Record payment equal to monthly contribution
      const payment = await recordPayment(
        member.id,
        settings.monthly_contribution,
        '2026-10-15',
        'cash'
      );

      // Verify allocation exists for October
      const allocations = await getAllocationsByMonth('2026-10');
      expect(allocations.length).toBeGreaterThan(0);
      expect(allocations.some((a) => a.payment_id === payment.id)).toBe(true);

      // Verify member shows as "Paid"
      const status = await getMonthPaymentStatus('2026-10');
      const memberStatus = status.members.find((m) => m.memberId === member.id);
      expect(memberStatus?.status).toBe('Paid');
      expect(memberStatus?.amountPaid).toBe(settings.monthly_contribution);
    });

    it('Test 2: Payment less than monthly contribution', async () => {
      const member = await createMember('Fatima');
      const settings = await getSettings();
      const halfAmount = Math.floor(settings.monthly_contribution / 2);

      // Record partial payment
      const payment = await recordPayment(
        member.id,
        halfAmount,
        '2026-10-20',
        'cash'
      );

      // Verify allocation exists
      const allocations = await getAllocationsByMonth('2026-10');
      const paymentAllocation = allocations.find(
        (a) => a.payment_id === payment.id
      );
      expect(paymentAllocation).toBeDefined();
      expect(paymentAllocation?.amount).toBe(halfAmount);

      // Verify member shows as "Partial"
      const status = await getMonthPaymentStatus('2026-10');
      const memberStatus = status.members.find((m) => m.memberId === member.id);
      expect(memberStatus?.status).toBe('Partial');
      expect(memberStatus?.amountPaid).toBe(halfAmount);
    });

    it('Test 3: Payment exceeds monthly contribution and rolls over', async () => {
      const member = await createMember('Omar');
      const settings = await getSettings();
      const doubleAmount = settings.monthly_contribution * 2;

      // Record payment that exceeds monthly contribution
      const payment = await recordPayment(
        member.id,
        doubleAmount,
        '2026-09-15',
        'cash'
      );

      // Verify allocations in both September and October
      const septAllocations = await getAllocationsByMonth('2026-09');
      const octAllocations = await getAllocationsByMonth('2026-10');

      const septPaymentAlloc = septAllocations.find(
        (a) => a.payment_id === payment.id
      );
      const octPaymentAlloc = octAllocations.find(
        (a) => a.payment_id === payment.id
      );

      expect(septPaymentAlloc?.amount).toBe(settings.monthly_contribution);
      expect(octPaymentAlloc?.amount).toBe(settings.monthly_contribution);

      // Verify both months show as "Paid"
      const septStatus = await getMonthPaymentStatus('2026-09');
      const septMemberStatus = septStatus.members.find(
        (m) => m.memberId === member.id
      );
      expect(septMemberStatus?.status).toBe('Paid');

      const octStatus = await getMonthPaymentStatus('2026-10');
      const octMemberStatus = octStatus.members.find(
        (m) => m.memberId === member.id
      );
      expect(octMemberStatus?.status).toBe('Paid');
    });

    it('Test 4: Multiple small payments fill a month', async () => {
      const member = await createMember('Zahra');
      const settings = await getSettings();
      const thirdAmount = Math.floor(settings.monthly_contribution / 3);

      // Record three small payments
      const p1 = await recordPayment(
        member.id,
        thirdAmount,
        '2026-11-05',
        'cash'
      );
      const p2 = await recordPayment(
        member.id,
        thirdAmount,
        '2026-11-15',
        'cash'
      );
      const p3 = await recordPayment(
        member.id,
        thirdAmount + (settings.monthly_contribution % 3), // Account for rounding
        '2026-11-25',
        'cash'
      );

      // Verify all are allocated to November
      const allocations = await getAllocationsByMonth('2026-11');
      const memberPayments = allocations.filter((a) =>
        [p1.id, p2.id, p3.id].includes(a.payment_id)
      );

      expect(memberPayments.length).toBe(3);
      const total = memberPayments.reduce((sum, a) => sum + a.amount, 0);
      expect(total).toBeGreaterThanOrEqual(settings.monthly_contribution);

      // Verify member shows as "Paid"
      const status = await getMonthPaymentStatus('2026-11');
      const memberStatus = status.members.find((m) => m.memberId === member.id);
      expect(memberStatus?.status).toBe('Paid');
    });
  });

  describe('Edge Cases', () => {
    it('Test 5: Zero monthly contribution', async () => {
      const member = await createMember('Khalid');

      // Temporarily set monthly contribution to 0
      const originalSettings = await getSettings();
      await updateSettings({ monthly_contribution: 0 });

      try {
        const payment = await recordPayment(
          member.id,
          10000,
          '2026-12-01',
          'cash'
        );

        // Entire payment should be allocated to the payment month
        const allocations = await getAllocationsByMonth('2026-12');
        const paymentAlloc = allocations.find(
          (a) => a.payment_id === payment.id
        );

        expect(paymentAlloc?.amount).toBe(10000);
      } finally {
        // Restore original settings
        await updateSettings({
          monthly_contribution: originalSettings.monthly_contribution,
        });
      }
    });
  });
});

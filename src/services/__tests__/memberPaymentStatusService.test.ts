import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import {
  initializeDatabase,
  closeDatabase,
  createMember,
  getSettings,
} from '@/database';
import { recordPayment } from '@/services/paymentAllocationService';
import { getMonthPaymentStatus } from '@/services/memberPaymentStatusService';

describe('Member Payment Status Service', () => {
  beforeAll(async () => {
    await initializeDatabase();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  describe('Expected Amount Calculation', () => {
    it('Should calculate expectedAmount as total members × monthly_contribution', async () => {
      const settings = await getSettings();
      const member1 = await createMember('Alice');
      const member2 = await createMember('Bob');
      await createMember('Charlie');

      // Record some payments for these members
      await recordPayment(member1.id, 1500, '2024-01-15', 'cash');
      await recordPayment(member2.id, 1000, '2024-01-15', 'cash');
      // The third member hasn't paid

      const status = await getMonthPaymentStatus('2024-01');

      // expectedAmount should be total expected: 3 members × monthly_contribution
      expect(status.expectedAmount).toBe(3 * settings.monthly_contribution);
      expect(status.members.length).toBe(3);

      // Each member's amountExpected should be the per-member amount
      for (const member of status.members) {
        expect(member.amountExpected).toBe(settings.monthly_contribution);
      }
    });

    it('Should update expectedAmount when active members change', async () => {
      const settings = await getSettings();

      // Get status with current members
      const initialStatus = await getMonthPaymentStatus('2024-02');
      const initialMemberCount = initialStatus.members.length;
      const initialExpected = initialStatus.expectedAmount;

      // Add a new member
      await createMember('Diana');

      // Get status again
      const updatedStatus = await getMonthPaymentStatus('2024-02');
      const updatedMemberCount = updatedStatus.members.length;
      const updatedExpected = updatedStatus.expectedAmount;

      // New member should increase expected by monthly_contribution
      expect(updatedMemberCount).toBe(initialMemberCount + 1);
      expect(updatedExpected).toBe(
        initialExpected + settings.monthly_contribution
      );
    });

    it('Should track collected vs expected correctly', async () => {
      const settings = await getSettings();
      const member = await createMember('Eve');

      // Member pays partial amount
      await recordPayment(member.id, 800, '2024-03-15', 'cash');

      const status = await getMonthPaymentStatus('2024-03');

      // expectedAmount should include all active members
      expect(status.expectedAmount).toBeGreaterThan(0);
      expect(status.expectedAmount).toBe(
        status.members.length * settings.monthly_contribution
      );

      // collectedAmount should be actual payments
      expect(status.collectedAmount).toBeLessThanOrEqual(status.expectedAmount);
    });
  });

  describe('Payment Status Counts', () => {
    it('Should correctly count paid, partial, and pending members', async () => {
      const settings = await getSettings();
      const member1 = await createMember('Frank'); // Paid
      const member2 = await createMember('Grace'); // Partial
      await createMember('Henry'); // Pending

      // member1: Paid (full amount)
      await recordPayment(member1.id, settings.monthly_contribution, '2024-04-15', 'cash');

      // member2: Partial (half amount)
      await recordPayment(
        member2.id,
        Math.floor(settings.monthly_contribution / 2),
        '2024-04-15',
        'cash'
      );

      // Third member: Pending (no payment)

      const status = await getMonthPaymentStatus('2024-04');

      expect(status.paidCount).toBe(1);
      expect(status.partialCount).toBe(1);
      expect(status.pendingCount).toBe(1);
    });
  });
});

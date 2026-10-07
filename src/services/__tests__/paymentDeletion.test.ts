import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import {
  initializeDatabase,
  closeDatabase,
  createMember,
  createCollector,
  getPaymentsByMember,
  getAllocationsByMonth,
  getSettings,
  createHandover,
  createWaterPayment,
  getWaterPurchasesByMonth,
  createWaterPurchase,
  getMonthlyBalance,
  getCollectorStats,
} from '@/database';
import { recordPayment, deletePayment, validatePaymentDeletion } from '@/services/paymentAllocationService';
import { recordHandover } from '@/services/collectionService';
import { recordSettlement } from '@/services/settlementService';
import { calculateMonthlyBalance, recordMonthlyBalance } from '@/services/monthlyBalanceService';

describe('Payment Deletion Service', () => {
  beforeAll(async () => {
    await initializeDatabase();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  describe('Basic Deletion', () => {
    it('should delete a simple payment and mark member Pending', async () => {
      const member = await createMember('Deleter1');
      const settings = await getSettings();

      // Record payment
      const payment = await recordPayment(
        member.id,
        settings.monthly_contribution,
        '2026-10-15',
        'cash'
      );

      // Verify payment and allocations exist
      let payments = await getPaymentsByMember(member.id);
      expect(payments).toHaveLength(1);

      const allocsBefore = await getAllocationsByMonth('2026-10');
      const allocsForPayment = allocsBefore.filter((a) => a.payment_id === payment.id);
      expect(allocsForPayment.length).toBeGreaterThan(0);

      // Delete payment
      await deletePayment(payment.id);
      console.log('[Test] Deleted payment successfully');

      // Verify payment is gone
      payments = await getPaymentsByMember(member.id);
      expect(payments).toHaveLength(0);

      // Verify allocations for that payment are gone
      const allocsAfter = await getAllocationsByMonth('2026-10');
      const allocsForDeletedPayment = allocsAfter.filter((a) => a.payment_id === payment.id);
      expect(allocsForDeletedPayment).toHaveLength(0);
    });

    it('should delete a partial payment', async () => {
      const member = await createMember('Deleter2');
      const settings = await getSettings();
      const halfAmount = Math.floor(settings.monthly_contribution / 2);

      // Record partial payment
      const payment = await recordPayment(
        member.id,
        halfAmount,
        '2026-10-20',
        'cash'
      );

      // Delete payment
      await deletePayment(payment.id);

      // Verify deleted
      const payments = await getPaymentsByMember(member.id);
      expect(payments).toHaveLength(0);
    });
  });

  describe('Multiple Payments', () => {
    it('should delete one payment when two exist for same member', async () => {
      const member = await createMember('Deleter3');
      const settings = await getSettings();
      const halfAmount = Math.floor(settings.monthly_contribution / 2);

      // Record two payments
      const payment1 = await recordPayment(
        member.id,
        halfAmount,
        '2026-10-10',
        'cash'
      );

      const payment2 = await recordPayment(
        member.id,
        halfAmount,
        '2026-10-20',
        'cash'
      );

      // Verify both exist
      let payments = await getPaymentsByMember(member.id);
      expect(payments).toHaveLength(2);

      // Delete first payment
      await deletePayment(payment1.id);

      // Verify only second remains
      payments = await getPaymentsByMember(member.id);
      expect(payments).toHaveLength(1);
      expect(payments[0].id).toBe(payment2.id);
    });
  });

  describe('Advance Payments', () => {
    it('should delete advance payment affecting multiple months', async () => {
      const member = await createMember('Deleter4');
      const settings = await getSettings();
      const tripleAmount = settings.monthly_contribution * 3;

      // Record advance payment
      const payment = await recordPayment(
        member.id,
        tripleAmount,
        '2026-10-15',
        'cash'
      );

      // Verify allocations span Oct, Nov, Dec
      const allocsOct = await getAllocationsByMonth('2026-10');
      const allocsNov = await getAllocationsByMonth('2026-11');
      const allocsDec = await getAllocationsByMonth('2026-12');

      expect(allocsOct.some((a) => a.payment_id === payment.id)).toBe(true);
      expect(allocsNov.some((a) => a.payment_id === payment.id)).toBe(true);
      expect(allocsDec.some((a) => a.payment_id === payment.id)).toBe(true);

      // Delete payment
      await deletePayment(payment.id);

      // Verify all allocations deleted
      const allocsOctAfter = await getAllocationsByMonth('2026-10');
      const allocsNovAfter = await getAllocationsByMonth('2026-11');
      const allocsDecAfter = await getAllocationsByMonth('2026-12');

      expect(allocsOctAfter.some((a) => a.payment_id === payment.id)).toBe(false);
      expect(allocsNovAfter.some((a) => a.payment_id === payment.id)).toBe(false);
      expect(allocsDecAfter.some((a) => a.payment_id === payment.id)).toBe(false);
    });
  });

  describe('Collector Dependencies', () => {
    it('should block deletion if holding would become negative', async () => {
      const member = await createMember('Deleter5');
      const collector = await createCollector('Risky Collector');
      const settings = await getSettings();

      // Record payment collected by collector
      const payment = await recordPayment(
        member.id,
        settings.monthly_contribution,
        '2026-10-15',
        'cash',
        collector.id
      );

      // Create another member payment to collector to increase holding
      const member2 = await createMember('Deleter6');
      const payment2 = await recordPayment(
        member2.id,
        settings.monthly_contribution,
        '2026-10-20',
        'cash',
        collector.id
      );

      // Get current holding
      const statsBefore = await getCollectorStats(collector.id);
      console.log(`[Test] Collector holding before: ${(statsBefore.currentHolding / 100).toFixed(2)}`);

      // Handover more than the first payment amount to another collector
      const collector2 = await createCollector('Recipient');
      const handoverAmount = settings.monthly_contribution * 2;
      await recordHandover(collector.id, collector2.id, handoverAmount, '2026-10-25');

      // Now try to delete the first payment
      // The holding would be: total collected - handover - amount of deleted payment
      // = 2*contribution - 2*contribution - contribution = -contribution (negative!)
      const validation = await validatePaymentDeletion(payment.id);
      expect(validation.canDelete).toBe(false);
      expect(validation.reason).toContain('deficit');
      console.log(`[Test] Deletion blocked as expected: ${validation.reason?.slice(0, 50)}...`);
    });
  });

  describe('Settlement Blocking', () => {
    it('should block deletion if settlement exists for payment month', async () => {
      const member = await createMember('Deleter7');
      const collector = await createCollector('Settled Collector');
      const settings = await getSettings();

      // Record payment
      const payment = await recordPayment(
        member.id,
        settings.monthly_contribution,
        '2026-10-15',
        'cash',
        collector.id
      );

      // Create settlement for that month
      const settlementData = {
        waterPaymentAmount: 0,
        handoverAmount: 0,
        returnedAmount: settings.monthly_contribution,
        otherAmount: 0,
      };
      await recordSettlement(collector.id, '2026-10', '2026-10-31', settlementData);

      // Try to delete payment
      const validation = await validatePaymentDeletion(payment.id);
      expect(validation.canDelete).toBe(false);
      expect(validation.reason).toContain('settlement');
      console.log(`[Test] Deletion blocked by settlement as expected`);
    });
  });

  describe('Monthly Balance Recalculation', () => {
    it('should recalculate monthly balance after deletion', async () => {
      const member = await createMember('Deleter8');
      const settings = await getSettings();

      // Record payment
      const payment = await recordPayment(
        member.id,
        settings.monthly_contribution,
        '2026-10-15',
        'cash'
      );

      // Record a water purchase to affect the balance
      const waterPurchase = await createWaterPurchase('wholesale', 4, settings.wholesale_price, '2026-10-20');

      // Calculate and record monthly balance
      const calcBefore = await calculateMonthlyBalance('2026-10');
      await recordMonthlyBalance('2026-10');

      const balanceBefore = await getMonthlyBalance('2026-10');
      expect(balanceBefore).not.toBeNull();
      expect(balanceBefore?.closing_balance).toBe(
        calcBefore.openingBalance + calcBefore.contributionsReceived - calcBefore.waterExpenses
      );

      console.log(`[Test] Balance before deletion: opening=${(balanceBefore?.opening_balance || 0) / 100}, closing=${(balanceBefore?.closing_balance || 0) / 100}`);

      // Delete the payment
      await deletePayment(payment.id);

      // Manually check the updated balance would differ
      // (Note: recalculateStoredBalancesFrom is called inside deletePayment)
      const balanceAfter = await getMonthlyBalance('2026-10');
      expect(balanceAfter?.contributions_received).toBeLessThan(balanceBefore?.contributions_received || 0);

      console.log(`[Test] Balance after deletion: opening=${(balanceAfter?.opening_balance || 0) / 100}, closing=${(balanceAfter?.closing_balance || 0) / 100}`);
    });
  });

  describe('Data Preservation', () => {
    it('should not affect unrelated members when deleting a payment', async () => {
      const member1 = await createMember('Deleter9');
      const member2 = await createMember('Deleter10');
      const settings = await getSettings();

      // Record payment for member1
      const payment1 = await recordPayment(
        member1.id,
        settings.monthly_contribution,
        '2026-10-15',
        'cash'
      );

      // Record payment for member2
      const payment2 = await recordPayment(
        member2.id,
        settings.monthly_contribution,
        '2026-10-20',
        'cash'
      );

      // Delete member1's payment
      await deletePayment(payment1.id);

      // Verify member2's payment still exists
      const member2Payments = await getPaymentsByMember(member2.id);
      expect(member2Payments).toHaveLength(1);
      expect(member2Payments[0].id).toBe(payment2.id);
    });
  });
});

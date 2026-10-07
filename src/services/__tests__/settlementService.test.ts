import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import {
  initializeDatabase,
  closeDatabase,
  createMember,
  createCollector,
  createWaterPurchase,
  createWaterPayment,
  getCollectorBalance,
} from '@/database';
import { recordPayment } from '@/services/paymentAllocationService';
import {
  validateSettlement,
  recordSettlement,
  isCollectorSettled,
} from '@/services/settlementService';

describe('Settlement Service', () => {
  beforeAll(async () => {
    await initializeDatabase();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  describe('Settlement Validation', () => {
    it('Test 1: Full settlement with water payment', async () => {
      const collector = await createCollector('Muhad');
      const member = await createMember('Ahmed');
      const waterPurchase = await createWaterPurchase('wholesale', 5, 600, '2024-01-20');

      // Muhad collects AED 50
      await recordPayment(member.id, 5000, '2024-01-15', 'cash', collector.id);

      // Pay AED 30 for water
      await createWaterPayment(waterPurchase.id, collector.id, 3000, '2024-01-20');

      // Muhad's balance is now AED 20
      const balance = await getCollectorBalance(collector.id);
      expect(balance).toBe(2000);

      // Full settlement: return AED 20
      const result = await validateSettlement(collector.id, {
        waterPaymentAmount: 0,
        handoverAmount: 0,
        returnedAmount: 2000,
        otherAmount: 0,
      });

      expect(result.isValid).toBe(true);
    });

    it('Test 2: Full settlement with handover', async () => {
      const muhad = await createCollector('Muhad');
      const ali = await createCollector('Ali');
      const member = await createMember('Ahmed');

      // Muhad collects AED 45
      await recordPayment(member.id, 4500, '2024-01-15', 'cash', muhad.id);

      // Settlement: hand AED 45 to Ali
      const result = await validateSettlement(muhad.id, {
        waterPaymentAmount: 0,
        handoverAmount: 4500,
        returnedAmount: 0,
        otherAmount: 0,
      });

      expect(result.isValid).toBe(true);
    });

    it('Test 3: Full settlement with multiple methods', async () => {
      const collector = await createCollector('Muhad');
      const member = await createMember('Ahmed');
      const waterPurchase = await createWaterPurchase('wholesale', 5, 600, '2024-01-20');

      // Muhad collects AED 75
      await recordPayment(member.id, 7500, '2024-01-15', 'cash', collector.id);

      // Pay AED 30 for water
      await createWaterPayment(waterPurchase.id, collector.id, 3000, '2024-01-20');

      // Balance is AED 45, settle with: water AED 15 + handover AED 20 + return AED 10
      const result = await validateSettlement(collector.id, {
        waterPaymentAmount: 1500,
        handoverAmount: 2000,
        returnedAmount: 1000,
        otherAmount: 0,
      });

      expect(result.isValid).toBe(true);
    });

    it('Test 4: Partial settlement attempt - validation fails', async () => {
      const collector = await createCollector('Muhad');
      const member = await createMember('Ahmed');

      // Muhad collects AED 45
      await recordPayment(member.id, 4500, '2024-01-15', 'cash', collector.id);

      // Try to settle only AED 30 when balance is AED 45
      const result = await validateSettlement(collector.id, {
        waterPaymentAmount: 3000,
        handoverAmount: 0,
        returnedAmount: 0,
        otherAmount: 0,
      });

      expect(result.isValid).toBe(false);
      if (!result.isValid) {
        expect(result.error).toContain('AED 15 is still unaccounted for');
      }
    });

    it('Test 5: Settlement with Other method', async () => {
      const collector = await createCollector('Muhad');
      const member = await createMember('Ahmed');

      // Muhad collects AED 45
      await recordPayment(member.id, 4500, '2024-01-15', 'cash', collector.id);

      // Settlement: AED 45 as "Other"
      const result = await validateSettlement(collector.id, {
        waterPaymentAmount: 0,
        handoverAmount: 0,
        returnedAmount: 0,
        otherAmount: 4500,
      });

      expect(result.isValid).toBe(true);
    });

    it('Test 6: Cannot settle more than holding', async () => {
      const collector = await createCollector('Muhad');
      const member = await createMember('Ahmed');

      // Muhad collects AED 45
      await recordPayment(member.id, 4500, '2024-01-15', 'cash', collector.id);

      // Try to settle AED 50 (more than balance)
      const result = await validateSettlement(collector.id, {
        waterPaymentAmount: 5000,
        handoverAmount: 0,
        returnedAmount: 0,
        otherAmount: 0,
      });

      expect(result.isValid).toBe(false);
      if (!result.isValid) {
        expect(result.error).toContain('Cannot settle');
      }
    });
  });

  describe('Settlement Recording', () => {
    it('Test 7: Record full settlement', async () => {
      const collector = await createCollector('Muhad');
      const member = await createMember('Ahmed');

      // Muhad collects AED 45
      await recordPayment(member.id, 4500, '2024-01-15', 'cash', collector.id);

      const month = '2024-01';
      const settlement = await recordSettlement(
        collector.id,
        month,
        '2024-01-31',
        {
          waterPaymentAmount: 0,
          handoverAmount: 0,
          returnedAmount: 4500,
          otherAmount: 0,
        },
        'Returned to member'
      );

      expect(settlement.opening_holding).toBe(4500);
      expect(settlement.total_returned).toBe(4500);
      expect(settlement.status).toBe('settled');
    });

    it('Test 8: Two collectors settle independently', async () => {
      const muhad = await createCollector('Muhad');
      const ali = await createCollector('Ali');
      const member1 = await createMember('Ahmed');
      const member2 = await createMember('Sara');

      // Muhad collects AED 45
      await recordPayment(member1.id, 4500, '2024-01-15', 'cash', muhad.id);

      // Ali collects AED 30
      await recordPayment(member2.id, 3000, '2024-01-10', 'cash', ali.id)

      const month = '2024-01';

      // Settle Muhad only
      const muhadsSettlement = await recordSettlement(
        muhad.id,
        month,
        '2024-01-31',
        {
          waterPaymentAmount: 0,
          handoverAmount: 0,
          returnedAmount: 4500,
          otherAmount: 0,
        }
      );

      // Verify Muhad settled, Ali not yet
      expect(muhadsSettlement.status).toBe('settled');

      // Ali still has balance
      const aliBalance = await getCollectorBalance(ali.id);
      expect(aliBalance).toBe(3000); // AED 30

      // Now settle Ali
      const alisSettlement = await recordSettlement(
        ali.id,
        month,
        '2024-01-31',
        {
          waterPaymentAmount: 0,
          handoverAmount: 0,
          returnedAmount: 3000,
          otherAmount: 0,
        }
      );

      expect(alisSettlement.status).toBe('settled');
    });
  });

  describe('Settlement History', () => {
    it('Test 9: Settlement remains after recording', async () => {
      const collector = await createCollector('Muhad');
      const member = await createMember('Ahmed');

      // Muhad collects AED 45
      await recordPayment(member.id, 4500, '2024-01-15', 'cash', collector.id);

      const month = '2024-01';

      // Record settlement
      const settlement = await recordSettlement(
        collector.id,
        month,
        '2024-01-31',
        {
          waterPaymentAmount: 0,
          handoverAmount: 0,
          returnedAmount: 4500,
          otherAmount: 0,
        }
      );

      // Verify it can be retrieved
      expect(settlement).toBeDefined();
      expect(settlement.collector_id).toBe(collector.id);
      expect(settlement.month).toBe(month);
    });

    it('Test 10: Check settlement status', async () => {
      const collector = await createCollector('Muhad');
      const member = await createMember('Ahmed');

      // Muhad collects AED 45
      await recordPayment(member.id, 4500, '2024-01-15', 'cash', collector.id);

      const month = '2024-01';

      // Before settlement
      let settled = await isCollectorSettled(collector.id, month);
      expect(settled).toBe(false);

      // After settlement
      await recordSettlement(
        collector.id,
        month,
        '2024-01-31',
        {
          waterPaymentAmount: 0,
          handoverAmount: 0,
          returnedAmount: 4500,
          otherAmount: 0,
        }
      );

      settled = await isCollectorSettled(collector.id, month);
      expect(settled).toBe(true);
    });
  });
});

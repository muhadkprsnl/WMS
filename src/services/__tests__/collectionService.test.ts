import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import {
  initializeDatabase,
  closeDatabase,
  createMember,
  createCollector,
  createWaterPurchase,
  createHandover,
  createWaterPayment,
  getCollectorBalance,
  getCollectorStats,
} from '@/database';
import { recordPayment } from '@/services/paymentAllocationService';
import {
  validateHandover,
  recordHandover,
  getWaterPurchasePaymentStatus,
} from '@/services/collectionService';

describe('Collection Service', () => {
  beforeAll(async () => {
    await initializeDatabase();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  describe('Collector Balance Calculation', () => {
    it('Test 1: Collector receives single payment', async () => {
      const collector = await createCollector('Muhad');
      const member = await createMember('Ahmed');

      // Ahmed pays AED 45 collected by Muhad
      await recordPayment(member.id, 4500, '2024-01-15', 'cash', collector.id);

      const balance = await getCollectorBalance(collector.id);
      expect(balance).toBe(4500); // AED 45
    });

    it('Test 2: Collector receives multiple payments', async () => {
      const collector = await createCollector('Ali');
      const member1 = await createMember('Ahmed');
      const member2 = await createMember('Sara');

      // Ahmed pays AED 30
      await recordPayment(member1.id, 3000, '2024-01-10', 'cash', collector.id);

      // Sara pays AED 20
      await recordPayment(member2.id, 2000, '2024-01-12', 'cash', collector.id);

      const balance = await getCollectorBalance(collector.id);
      expect(balance).toBe(5000); // AED 50
    });

    it('Test 3: Handover decreases sender balance', async () => {
      const collector1 = await createCollector('Muhad');
      const collector2 = await createCollector('Ali');
      const member = await createMember('Ahmed');

      // Muhad collects AED 45
      await recordPayment(member.id, 4500, '2024-01-15', 'cash', collector1.id);

      // Muhad hands Ali AED 20
      await createHandover(collector1.id, collector2.id, 2000, '2024-01-16');

      const muhadsBalance = await getCollectorBalance(collector1.id);
      const alisBalance = await getCollectorBalance(collector2.id);

      expect(muhadsBalance).toBe(2500); // AED 25
      expect(alisBalance).toBe(2000); // AED 20
    });

    it('Test 4: Handover increases receiver balance', async () => {
      const collector1 = await createCollector('Muhad');
      const collector2 = await createCollector('Ali');
      const member = await createMember('Ahmed');

      // Muhad collects AED 50
      await recordPayment(member.id, 5000, '2024-01-15', 'cash', collector1.id);

      // Ali collects AED 30
      const member2 = await createMember('Sara');
      await recordPayment(member2.id, 3000, '2024-01-10', 'cash', collector2.id);

      // Muhad hands Ali AED 20
      await createHandover(collector1.id, collector2.id, 2000, '2024-01-16');

      const muhadsBalance = await getCollectorBalance(collector1.id);
      const alisBalance = await getCollectorBalance(collector2.id);

      expect(muhadsBalance).toBe(3000); // AED 30
      expect(alisBalance).toBe(5000); // AED 50
    });

    it('Test 5: Water payment decreases balance', async () => {
      const collector = await createCollector('Muhad');
      const member = await createMember('Ahmed');

      // Muhad collects AED 50
      await recordPayment(member.id, 5000, '2024-01-15', 'cash', collector.id);

      // Record water purchase for AED 30
      const waterPurchase = await createWaterPurchase('wholesale', 5, 600, '2024-01-20');

      // Muhad pays AED 30 for water
      await createWaterPayment(waterPurchase.id, collector.id, 3000, '2024-01-20');

      const balance = await getCollectorBalance(collector.id);
      expect(balance).toBe(2000); // AED 20 (5000 - 3000)
    });

    it('Test 6: Combined scenario - collect + handover + water payment', async () => {
      const muhad = await createCollector('Muhad');
      const ali = await createCollector('Ali');
      const member1 = await createMember('Ahmed');
      const member2 = await createMember('Sara');

      // Muhad collects AED 45
      await recordPayment(member1.id, 4500, '2024-01-15', 'cash', muhad.id);

      // Ali collects AED 30
      await recordPayment(member2.id, 3000, '2024-01-10', 'cash', ali.id);

      // Muhad hands Ali AED 20
      await createHandover(muhad.id, ali.id, 2000, '2024-01-16');

      // Ali pays AED 30 for water
      const waterPurchase = await createWaterPurchase('wholesale', 5, 600, '2024-01-20');
      await createWaterPayment(waterPurchase.id, ali.id, 3000, '2024-01-20');

      const muhadsBalance = await getCollectorBalance(muhad.id);
      const alisBalance = await getCollectorBalance(ali.id);

      expect(muhadsBalance).toBe(2500); // AED 25 (4500 - 2000)
      expect(alisBalance).toBe(2000); // AED 20 (3000 + 2000 - 3000)
    });
  });

  describe('Handover Validation', () => {
    it('Prevents handover between same collector', async () => {
      const collector = await createCollector('Muhad');
      const member = await createMember('Ahmed');
      await recordPayment(member.id, 4500, '2024-01-15', 'cash', collector.id);

      const result = await validateHandover(collector.id, collector.id, 1000);

      expect(result.isValid).toBe(false);
      if (!result.isValid) {
        expect(result.error).toContain('cannot hand over money to themselves');
      }
    });

    it('Prevents handover with zero amount', async () => {
      const collector1 = await createCollector('Muhad');
      const collector2 = await createCollector('Ali');

      const result = await validateHandover(collector1.id, collector2.id, 0);

      expect(result.isValid).toBe(false);
      if (!result.isValid) {
        expect(result.error).toContain('greater than zero');
      }
    });

    it('Prevents handover exceeding collector balance', async () => {
      const collector1 = await createCollector('Muhad');
      const collector2 = await createCollector('Ali');
      const member = await createMember('Ahmed');

      // Muhad collects only AED 15
      await recordPayment(member.id, 1500, '2024-01-15', 'cash', collector1.id);

      // Try to hand over AED 20 (more than balance)
      const result = await validateHandover(collector1.id, collector2.id, 2000);

      expect(result.isValid).toBe(false);
      if (!result.isValid) {
        expect(result.error).toContain('Insufficient balance');
      }
    });

    it('Allows valid handover', async () => {
      const collector1 = await createCollector('Muhad');
      const collector2 = await createCollector('Ali');
      const member = await createMember('Ahmed');

      // Muhad collects AED 45
      await recordPayment(member.id, 4500, '2024-01-15', 'cash', collector1.id);

      // Valid handover of AED 20
      const result = await validateHandover(collector1.id, collector2.id, 2000);

      expect(result.isValid).toBe(true);
    });
  });


  describe('Water Purchase Payment Status', () => {
    it('Shows Unpaid for water purchase with no payments', async () => {
      const waterPurchase = await createWaterPurchase('wholesale', 5, 600, '2024-01-20');

      const status = await getWaterPurchasePaymentStatus(waterPurchase.id);

      expect(status).toBe('Unpaid');
    });

    it('Shows Partially Paid for partial payment', async () => {
      const collector = await createCollector('Muhad');
      const member = await createMember('Ahmed');
      const waterPurchase = await createWaterPurchase('wholesale', 5, 600, '2024-01-20');

      await recordPayment(member.id, 5000, '2024-01-15', 'cash', collector.id);
      await createWaterPayment(waterPurchase.id, collector.id, 2000, '2024-01-20');

      const status = await getWaterPurchasePaymentStatus(waterPurchase.id);

      expect(status).toBe('Partially Paid');
    });

    it('Shows Paid for full payment', async () => {
      const collector = await createCollector('Muhad');
      const member = await createMember('Ahmed');
      const waterPurchase = await createWaterPurchase('wholesale', 5, 600, '2024-01-20');

      await recordPayment(member.id, 5000, '2024-01-15', 'cash', collector.id);
      await createWaterPayment(waterPurchase.id, collector.id, 3000, '2024-01-20');

      const status = await getWaterPurchasePaymentStatus(waterPurchase.id);

      expect(status).toBe('Paid');
    });
  });

  describe('Collector Stats', () => {
    it('Returns correct collection statistics', async () => {
      const collector = await createCollector('Muhad');
      const member1 = await createMember('Ahmed');
      const member2 = await createMember('Sara');
      const waterPurchase = await createWaterPurchase('wholesale', 5, 600, '2024-01-20');

      // Collect AED 75
      await recordPayment(member1.id, 4500, '2024-01-15', 'cash', collector.id);
      await recordPayment(member2.id, 3000, '2024-01-10', 'cash', collector.id);

      // Pay AED 30 for water
      await createWaterPayment(waterPurchase.id, collector.id, 3000, '2024-01-20');

      const stats = await getCollectorStats(collector.id);

      expect(stats.totalCollected).toBe(7500); // AED 75
      expect(stats.totalWaterPaid).toBe(3000); // AED 30
      expect(stats.currentHolding).toBe(4500); // AED 45
    });
  });
});

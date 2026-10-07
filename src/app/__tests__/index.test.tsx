import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import {
  initializeDatabase,
  closeDatabase,
  createMember,
  createCollector,
  createPaymentAllocation,
  createWaterPurchase,
  getActiveMembers,
  getAllocationsByMonth,
  getTotalWaterExpenseByMonth,
  getWaterPurchasesByMonth,
  getCollectorStats,
  getActiveCollectors,
} from '@/database';
import { recordPayment } from '@/services/paymentAllocationService';
import { calculateMonthlyBalance } from '@/services/monthlyBalanceService';

describe('Dashboard Data Loading', () => {
  beforeAll(async () => {
    await initializeDatabase();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  describe('No Data', () => {
    it('Test 1: Empty dashboard (no members, no payments)', async () => {
      const members = await getActiveMembers();
      expect(members.length).toBe(0);

      const allocations = await getAllocationsByMonth('2024-01');
      expect(allocations.length).toBe(0);

      const water = await getTotalWaterExpenseByMonth('2024-01');
      expect(water).toBe(0);

      const balance = await calculateMonthlyBalance('2024-01');
      expect(balance.openingBalance).toBe(0);
      expect(balance.contributionsReceived).toBe(0);
      expect(balance.waterExpenses).toBe(0);
      expect(balance.closingBalance).toBe(0);
    });
  });

  describe('One Member', () => {
    it('Test 2: Single member, no payment', async () => {
      const member = await createMember('Ahmed');
      const members = await getActiveMembers();
      expect(members.length).toBe(1);

      const balance = await calculateMonthlyBalance('2024-02');
      expect(balance.expectedContributions).toBeGreaterThan(0);
      expect(balance.contributionsReceived).toBe(0);
      expect(balance.closingBalance).toBe(0);
    });

    it('Test 3: Single member, full payment', async () => {
      const member = await createMember('Sara');
      await recordPayment(member.id, 1500, '2024-03-15', 'cash');
      await createPaymentAllocation(1, '2024-03', 1500);

      const allocations = await getAllocationsByMonth('2024-03');
      expect(allocations.length).toBe(1);

      const balance = await calculateMonthlyBalance('2024-03');
      expect(balance.contributionsReceived).toBe(1500);
      expect(balance.closingBalance).toBe(1500);
    });

    it('Test 4: Single member, partial payment', async () => {
      const member = await createMember('Fatima');
      await recordPayment(member.id, 1000, '2024-04-15', 'cash');
      await createPaymentAllocation(2, '2024-04', 1000);

      const balance = await calculateMonthlyBalance('2024-04');
      expect(balance.contributionsReceived).toBe(1000);
      expect(balance.closingBalance).toBe(1000);
    });
  });

  describe('Multiple Members', () => {
    it('Test 5: Multiple members, all paid', async () => {
      const m1 = await createMember('Mohammad');
      const m2 = await createMember('Aisha');
      const m3 = await createMember('Hassan');

      await recordPayment(m1.id, 1500, '2024-05-15', 'cash');
      await createPaymentAllocation(3, '2024-05', 1500);
      await recordPayment(m2.id, 1500, '2024-05-16', 'cash');
      await createPaymentAllocation(4, '2024-05', 1500);
      await recordPayment(m3.id, 1500, '2024-05-17', 'cash');
      await createPaymentAllocation(5, '2024-05', 1500);

      const members = await getActiveMembers();
      expect(members.length).toBeGreaterThanOrEqual(3);

      const allocations = await getAllocationsByMonth('2024-05');
      expect(allocations.length).toBeGreaterThanOrEqual(3);

      const balance = await calculateMonthlyBalance('2024-05');
      expect(balance.contributionsReceived).toBeGreaterThanOrEqual(4500);
    });

    it('Test 6: Multiple members, partial paid', async () => {
      const m1 = await createMember('Noor');
      const m2 = await createMember('Leila');

      await recordPayment(m1.id, 1500, '2024-06-15', 'cash');
      await createPaymentAllocation(6, '2024-06', 1500);

      const members = await getActiveMembers();
      const allocations = await getAllocationsByMonth('2024-06');

      expect(members.length).toBeGreaterThan(allocations.length);
    });
  });

  describe('Water Purchases', () => {
    it('Test 7: Single water purchase', async () => {
      const member = await createMember('Omar');
      await recordPayment(member.id, 3000, '2024-07-15', 'cash');
      await createPaymentAllocation(7, '2024-07', 3000);

      await createWaterPurchase('wholesale', 5, 600, '2024-07-10');

      const water = await getTotalWaterExpenseByMonth('2024-07');
      expect(water).toBe(3000);

      const purchases = await getWaterPurchasesByMonth('2024-07');
      expect(purchases.length).toBe(1);
      expect(purchases[0].purchase_type).toBe('wholesale');

      const balance = await calculateMonthlyBalance('2024-07');
      expect(balance.waterExpenses).toBe(3000);
      expect(balance.closingBalance).toBe(0);
    });

    it('Test 8: Multiple water purchases (wholesale + retail)', async () => {
      const member = await createMember('Zara');
      await recordPayment(member.id, 8000, '2024-08-15', 'cash');
      await createPaymentAllocation(8, '2024-08', 8000);

      await createWaterPurchase('wholesale', 5, 600, '2024-08-05');
      await createWaterPurchase('retail', 4, 800, '2024-08-15');

      const water = await getTotalWaterExpenseByMonth('2024-08');
      expect(water).toBe(3000 + 3200);

      const purchases = await getWaterPurchasesByMonth('2024-08');
      expect(purchases.length).toBe(2);

      const wholesale = purchases.filter((p) => p.purchase_type === 'wholesale');
      const retail = purchases.filter((p) => p.purchase_type === 'retail');
      expect(wholesale.length).toBe(1);
      expect(retail.length).toBe(1);
    });
  });

  describe('Collector Status', () => {
    it('Test 9: Collector with balance', async () => {
      const collector = await createCollector('Muhammad');
      const member = await createMember('Ibrahim');

      await recordPayment(member.id, 4500, '2024-09-15', 'cash', collector.id);
      await createPaymentAllocation(9, '2024-09', 4500);

      const collectors = await getActiveCollectors();
      expect(collectors.length).toBeGreaterThan(0);

      const stats = await getCollectorStats(collector.id);
      expect(stats.currentHolding).toBe(4500);
    });

    it('Test 10: Multiple collectors', async () => {
      const c1 = await createCollector('Khalid');
      const c2 = await createCollector('Rana');

      const m1 = await createMember('Yasmin');
      const m2 = await createMember('Tariq');

      await recordPayment(m1.id, 3000, '2024-10-15', 'cash', c1.id);
      await createPaymentAllocation(10, '2024-10', 3000);

      await recordPayment(m2.id, 5000, '2024-10-16', 'cash', c2.id);
      await createPaymentAllocation(11, '2024-10', 5000);

      const collectors = await getActiveCollectors();
      expect(collectors.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Financial Scenarios', () => {
    it('Test 11: Positive closing balance', async () => {
      const member = await createMember('Samira');
      await recordPayment(member.id, 5000, '2024-11-15', 'cash');
      await createPaymentAllocation(12, '2024-11', 5000);
      await createWaterPurchase('wholesale', 3, 600, '2024-11-10');

      const balance = await calculateMonthlyBalance('2024-11');
      expect(balance.closingBalance).toBe(5000 - 1800);
      expect(balance.closingBalance).toBeGreaterThan(0);
    });

    it('Test 12: Zero closing balance', async () => {
      const member = await createMember('Jamal');
      await recordPayment(member.id, 3000, '2024-12-15', 'cash');
      await createPaymentAllocation(13, '2024-12', 3000);
      await createWaterPurchase('retail', 3, 1000, '2024-12-10');

      const balance = await calculateMonthlyBalance('2024-12');
      expect(balance.closingBalance).toBe(0);
    });

    it('Test 13: Negative closing balance', async () => {
      const member = await createMember('Hana');
      await recordPayment(member.id, 2000, '2024-11-15', 'cash');
      await createPaymentAllocation(14, '2024-11', 2000);
      await createWaterPurchase('wholesale', 10, 600, '2024-11-10');

      const balance = await calculateMonthlyBalance('2024-11');
      expect(balance.closingBalance).toBe(2000 - 6000);
      expect(balance.closingBalance).toBeLessThan(0);
    });
  });

  describe('Dashboard Data Aggregation', () => {
    it('Test 14: All dashboard metrics together', async () => {
      // Create mixed scenario
      const m1 = await createMember('Alex');
      const m2 = await createMember('Jordan');
      const collector = await createCollector('Sam');

      // Payments
      await recordPayment(m1.id, 2000, '2024-11-15', 'cash', collector.id);
      await createPaymentAllocation(15, '2024-11', 2000);
      await recordPayment(m2.id, 1500, '2024-11-16', 'cash', collector.id);
      await createPaymentAllocation(16, '2024-11', 1500);

      // Water
      await createWaterPurchase('wholesale', 3, 600, '2024-11-10');
      await createWaterPurchase('retail', 2, 800, '2024-11-15');

      // Verify all metrics
      const members = await getActiveMembers();
      const allocations = await getAllocationsByMonth('2024-11');
      const water = await getTotalWaterExpenseByMonth('2024-11');
      const purchases = await getWaterPurchasesByMonth('2024-11');
      const stats = await getCollectorStats(collector.id);
      const balance = await calculateMonthlyBalance('2024-11');

      expect(members.length).toBeGreaterThan(0);
      expect(allocations.length).toBeGreaterThan(0);
      expect(water).toBeGreaterThan(0);
      expect(purchases.length).toBeGreaterThan(0);
      expect(stats.currentHolding).toBeGreaterThan(0);
      expect(balance.contributionsReceived).toBeGreaterThan(0);
      expect(balance.waterExpenses).toBeGreaterThan(0);
    });
  });
});

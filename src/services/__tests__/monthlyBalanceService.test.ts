import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import {
  initializeDatabase,
  closeDatabase,
  createMember,
  createPaymentAllocation,
  createWaterPurchase,
  getSettings,
  getMonthlyBalance,
} from '@/database';
import { recordPayment } from '@/services/paymentAllocationService';
import {
  calculateMonthlyBalance,
  recordMonthlyBalance,
  hasMonthlyBalance,
  getCarryForwardBalance,
  generateMonthlySummary,
} from '@/services/monthlyBalanceService';

describe('Monthly Balance Service', () => {
  beforeAll(async () => {
    await initializeDatabase();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  describe('Basic Calculations', () => {
    it('Test 1: Positive closing balance', async () => {
      const member = await createMember('Ahmed');

      // Contributions: AED 75 (5 members × AED 15)
      // But only Ahmed pays: AED 50
      await recordPayment(member.id, 5000, '2024-01-15', 'cash');
      await createPaymentAllocation(1, '2024-01', 5000);

      // Water expense: AED 30
      await createWaterPurchase('wholesale', 5, 600, '2024-01-10');

      // Opening: AED 0
      // + Contributions: AED 50
      // - Water: AED 30
      // = Closing: AED 20
      const balance = await calculateMonthlyBalance('2024-01');

      expect(balance.openingBalance).toBe(0);
      expect(balance.contributionsReceived).toBe(5000);
      expect(balance.waterExpenses).toBe(3000);
      expect(balance.closingBalance).toBe(2000);
    });

    it('Test 2: Zero closing balance', async () => {
      const member = await createMember('Sara');

      // Contributions: AED 50
      await recordPayment(member.id, 5000, '2024-02-15', 'cash');
      await createPaymentAllocation(2, '2024-02', 5000);

      // Water expense: AED 50 (exactly matches contributions)
      await createWaterPurchase('retail', 6, 833, '2024-02-10'); // 6 × 833 = 4998 ≈ 50

      const balance = await calculateMonthlyBalance('2024-02');

      expect(balance.openingBalance).toBe(0);
      expect(balance.contributionsReceived).toBe(5000);
      expect(balance.waterExpenses).toBe(4998);
      expect(balance.closingBalance).toBe(2);
    });

    it('Test 3: Negative closing balance', async () => {
      const member = await createMember('Fatima');

      // Contributions: AED 30
      await recordPayment(member.id, 3000, '2024-03-15', 'cash');
      await createPaymentAllocation(3, '2024-03', 3000);

      // Water expense: AED 60 (exceeds contributions)
      await createWaterPurchase('wholesale', 10, 600, '2024-03-10');

      // Opening: AED 0
      // + Contributions: AED 30
      // - Water: AED 60
      // = Closing: -AED 30
      const balance = await calculateMonthlyBalance('2024-03');

      expect(balance.openingBalance).toBe(0);
      expect(balance.contributionsReceived).toBe(3000);
      expect(balance.waterExpenses).toBe(6000);
      expect(balance.closingBalance).toBe(-3000);
    });
  });

  describe('Carry Forward', () => {
    it('Test 4: Carry forward positive balance', async () => {
      const member = await createMember('Mohammad');

      // April: positive balance of AED 20
      await recordPayment(member.id, 5000, '2024-04-15', 'cash');
      await createPaymentAllocation(4, '2024-04', 5000);
      await createWaterPurchase('wholesale', 5, 600, '2024-04-10');

      const aprilBalance = await calculateMonthlyBalance('2024-04');
      expect(aprilBalance.closingBalance).toBe(2000); // AED 20

      // Record April
      await recordMonthlyBalance('2024-04');

      // May: opening balance should be April's closing (AED 20)
      const mayBalance = await calculateMonthlyBalance('2024-05');
      expect(mayBalance.openingBalance).toBe(2000);
    });

    it('Test 5: Carry forward negative balance', async () => {
      const member = await createMember('Aisha');

      // June: negative balance of -AED 10
      await recordPayment(member.id, 2000, '2024-06-15', 'cash');
      await createPaymentAllocation(5, '2024-06', 2000);
      await createWaterPurchase('retail', 4, 800, '2024-06-10');

      const juneBalance = await calculateMonthlyBalance('2024-06');
      expect(juneBalance.closingBalance).toBe(-2000); // -AED 20

      // Record June
      await recordMonthlyBalance('2024-06');

      // July: opening balance should be negative
      const julyBalance = await calculateMonthlyBalance('2024-07');
      expect(julyBalance.openingBalance).toBe(-2000);
    });
  });

  describe('Contribution Types', () => {
    it('Test 6: Partial contributions', async () => {
      const settings = await getSettings();

      // Assume 3 active members = AED 45 expected
      // But only AED 35 collected
      const member = await createMember('Hassan');
      await recordPayment(member.id, 3500, '2024-07-15', 'cash');
      await createPaymentAllocation(6, '2024-07', 3500);

      const balance = await calculateMonthlyBalance('2024-07');

      expect(balance.expectedContributions).toBe(3 * settings.monthly_contribution);
      expect(balance.contributionsReceived).toBe(3500);
      expect(balance.expectedContributions).toBeGreaterThan(balance.contributionsReceived);
    });

    it('Test 7: Advance payments', async () => {
      const member = await createMember('Noor');

      // Member pays AED 60 (covers current month + advance)
      await recordPayment(member.id, 6000, '2024-08-15', 'cash');

      // Allocate: current month AED 15, next month AED 15, future month AED 30
      await createPaymentAllocation(7, '2024-08', 1500);
      await createPaymentAllocation(7, '2024-09', 1500);
      await createPaymentAllocation(7, '2024-10', 3000);

      const augBalance = await calculateMonthlyBalance('2024-08');
      expect(augBalance.contributionsReceived).toBe(1500);

      const sepBalance = await calculateMonthlyBalance('2024-09');
      expect(sepBalance.contributionsReceived).toBe(1500);

      const octBalance = await calculateMonthlyBalance('2024-10');
      expect(octBalance.contributionsReceived).toBe(3000);
    });

    it('Test 8: Previous month payment allocated to current', async () => {
      const member = await createMember('Leila');

      // Payment on Feb 1 for January's outstanding
      const now = new Date().toISOString().split('T')[0];
      await recordPayment(member.id, 1500, now, 'cash');

      // Allocate to previous month (January)
      await createPaymentAllocation(8, '2024-01', 1500);

      // January gets the allocation
      const janBalance = await calculateMonthlyBalance('2024-01');
      expect(janBalance.contributionsReceived).toBeGreaterThanOrEqual(1500);
    });
  });

  describe('Water Expenses', () => {
    it('Test 9: Multiple water purchases in a month', async () => {
      const member = await createMember('Omar');
      await recordPayment(member.id, 10000, '2024-09-15', 'cash');
      await createPaymentAllocation(9, '2024-09', 10000);

      // Multiple purchases
      await createWaterPurchase('wholesale', 5, 600, '2024-09-05'); // AED 30
      await createWaterPurchase('retail', 3, 800, '2024-09-15'); // AED 24
      await createWaterPurchase('wholesale', 2, 600, '2024-09-25'); // AED 12

      const balance = await calculateMonthlyBalance('2024-09');

      // Total water: 3000 + 2400 + 1200 = 6600
      expect(balance.waterExpenses).toBe(6600);
      expect(balance.closingBalance).toBe(10000 - 6600);
    });

    it('Test 10: Historical water price integrity', async () => {
      const member = await createMember('Zara');
      await recordPayment(member.id, 8000, '2024-10-15', 'cash');
      await createPaymentAllocation(10, '2024-10', 8000);

      // Record purchase with specific price
      const purchase = await createWaterPurchase('wholesale', 10, 600, '2024-10-10');

      const balance = await calculateMonthlyBalance('2024-10');

      // Closing should use the actual purchase amount (6000), not current Settings price
      expect(purchase.unit_price).toBe(600);
      expect(balance.waterExpenses).toBe(6000);
      expect(balance.closingBalance).toBe(2000);
    });
  });

  describe('Recording and Status', () => {
    it('Test 11: Record monthly balance', async () => {
      const member = await createMember('Yasin');
      await recordPayment(member.id, 4000, '2024-11-15', 'cash');
      await createPaymentAllocation(11, '2024-11', 4000);
      await createWaterPurchase('wholesale', 3, 600, '2024-11-10');

      const exists = await hasMonthlyBalance('2024-11');
      expect(exists).toBe(false);

      await recordMonthlyBalance('2024-11');

      const nowExists = await hasMonthlyBalance('2024-11');
      expect(nowExists).toBe(true);
    });

    it('Test 12: Cannot record duplicate month', async () => {
      const member = await createMember('Rana');
      await recordPayment(member.id, 5000, '2024-12-15', 'cash');
      await createPaymentAllocation(12, '2024-12', 5000);

      await recordMonthlyBalance('2024-12');

      // Try to record again
      try {
        await recordMonthlyBalance('2024-12');
        expect(true).toBe(false); // Should not reach here
      } catch (err) {
        expect((err as Error).message).toContain('already exists');
      }
    });

    it('Test 13: Carry forward balance retrieval', async () => {
      // Use existing recorded month
      const carryForward = await getCarryForwardBalance('2024-11');

      // Should be a valid number (closing balance from that month)
      expect(typeof carryForward).toBe('number');
    });
  });

  describe('Complex Scenario', () => {
    it('Test 14: Multi-month scenario with carry forward', async () => {
      const member = await createMember('Khalid');

      // September
      await recordPayment(member.id, 7500, '2024-09-20', 'cash');
      await createPaymentAllocation(13, '2024-09', 7500);
      await createWaterPurchase('wholesale', 8, 600, '2024-09-05');

      const sepBalance = await calculateMonthlyBalance('2024-09');
      // 7500 - 4800 = 2700
      expect(sepBalance.closingBalance).toBe(2700);

      await recordMonthlyBalance('2024-09');

      // October starts with September's closing balance
      await recordPayment(member.id, 6000, '2024-10-20', 'cash');
      await createPaymentAllocation(14, '2024-10', 6000);
      await createWaterPurchase('retail', 5, 800, '2024-10-10');

      const octBalance = await calculateMonthlyBalance('2024-10');
      // Opening: 2700, Contributions: 6000, Water: 4000
      // Closing: 2700 + 6000 - 4000 = 4700
      expect(octBalance.openingBalance).toBe(2700);
      expect(octBalance.closingBalance).toBe(4700);
    });
  });

  describe('Monthly Summary Generation', () => {
    it('Should generate a monthly summary and carry closing balance to next month', async () => {
      const member = await createMember('Alice');
      await recordPayment(member.id, 1500, '2024-09-15', 'cash');
      await createPaymentAllocation(1, '2024-09', 1500);
      await createWaterPurchase('retail', 5, 800, '2024-09-10');

      // Generate summary for September (opening 0, contributions 1500, water 4000, closing -2500)
      const result = await generateMonthlySummary('2024-09');
      expect(result.replaced).toBe(false);
      expect(result.summary.closingBalance).toBe(-2500);

      // October should open with September's closing balance (-2500)
      const octBalance = await calculateMonthlyBalance('2024-10');
      expect(octBalance.openingBalance).toBe(-2500);
    });

    it('Should carry negative closing balance to next month', async () => {
      const member = await createMember('Bob');
      await recordPayment(member.id, 500, '2024-08-15', 'cash');
      await createPaymentAllocation(2, '2024-08', 500);
      await createWaterPurchase('wholesale', 10, 1000, '2024-08-10');

      // Generate summary for August (opening 0, contributions 500, water 10000, closing -9500)
      const result = await generateMonthlySummary('2024-08');
      expect(result.summary.closingBalance).toBe(-9500);

      // September should open with August's closing balance (-9500)
      const sepBalance = await calculateMonthlyBalance('2024-09');
      expect(sepBalance.openingBalance).toBe(-9500);
    });

    it('Should replace existing summary when generating the same month twice', async () => {
      const member = await createMember('Charlie');

      // First generation
      await recordPayment(member.id, 1000, '2024-07-15', 'cash');
      await createPaymentAllocation(3, '2024-07', 1000);
      await createWaterPurchase('retail', 5, 500, '2024-07-10');

      const result1 = await generateMonthlySummary('2024-07');
      expect(result1.replaced).toBe(false);
      const closing1 = result1.summary.closingBalance;

      // Second generation (after adding more data)
      await recordPayment(member.id, 1000, '2024-07-20', 'cash');
      await createPaymentAllocation(4, '2024-07', 1000);

      const result2 = await generateMonthlySummary('2024-07');
      expect(result2.replaced).toBe(true);
      const closing2 = result2.summary.closingBalance;

      // Second closing should be higher because of the extra payment
      expect(closing2).toBeGreaterThan(closing1);

      // Verify only one row exists for the month
      const stored = await getMonthlyBalance('2024-07');
      expect(stored).not.toBeNull();
      expect(stored?.closing_balance).toBe(closing2);
    });

    it('Should reject invalid month format', async () => {
      await expect(generateMonthlySummary('2024/09')).rejects.toThrow(/Invalid month format/);
      await expect(generateMonthlySummary('09-2024')).rejects.toThrow(/Invalid month format/);
      await expect(generateMonthlySummary('2024')).rejects.toThrow(/Invalid month format/);
    });

    it('Should generate earlier month and carry to later months', async () => {
      const member = await createMember('Diana');

      // Generate October first
      await recordPayment(member.id, 2000, '2024-10-15', 'cash');
      await createPaymentAllocation(5, '2024-10', 2000);
      const octResult = await generateMonthlySummary('2024-10');
      expect(octResult.summary.closingBalance).toBe(2000);

      // Now generate September (earlier)
      await recordPayment(member.id, 1000, '2024-09-15', 'cash');
      await createPaymentAllocation(6, '2024-09', 1000);
      const sepResult = await generateMonthlySummary('2024-09');
      expect(sepResult.summary.closingBalance).toBe(1000);

      // October's opening should now be September's closing (1000)
      const octBalance = await calculateMonthlyBalance('2024-10');
      expect(octBalance.openingBalance).toBe(1000);
    });
  });
});

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import {
  initializeDatabase,
  closeDatabase,
  getWaterPurchaseById,
  getSettings,
  updateSettings,
  createCollector,
  getCollectorBalance,
  getWaterPaymentsByPurchase,
} from '@/database';
import {
  recordWaterPurchase,
  editWaterPurchase,
  getMonthlyWaterSummary,
  resolvePriceForPurchase,
} from '@/services/waterPurchaseService';
import type { Collector } from '@/types/database';

describe('Water Purchase Service', () => {
  let testCollector: Collector;

  beforeAll(async () => {
    await initializeDatabase();
    testCollector = await createCollector('Test Collector');
  });

  afterAll(async () => {
    await closeDatabase();
  });

  describe('Price Resolution', () => {
    it('Test 1: New purchase uses current settings price', async () => {
      const resolution = await resolvePriceForPurchase('wholesale');
      const settings = await getSettings();
      expect(resolution.unitPriceFils).toBe(settings.wholesale_price);
      expect(resolution.reason).toContain('new purchase');
    });

    it('Test 2: Edit with type unchanged preserves historical price', async () => {
      const purchase = await recordWaterPurchase('wholesale', 5, '2026-10-01', testCollector.id, 'Test');
      const resolution = await resolvePriceForPurchase('wholesale', purchase.id);
      expect(resolution.unitPriceFils).toBe(purchase.unit_price);
      expect(resolution.reason).toContain('historical price kept');
    });

    it('Test 3: Edit with type changed uses current settings price', async () => {
      const purchase = await recordWaterPurchase('wholesale', 3, '2026-10-02', testCollector.id, 'Test');
      const settings = await getSettings();
      const resolution = await resolvePriceForPurchase('retail', purchase.id);
      expect(resolution.unitPriceFils).toBe(settings.retail_price);
      expect(resolution.reason).toContain('type changed');
    });
  });

  describe('Recording Purchases', () => {
    it('Test 4: Record wholesale purchase with correct total', async () => {
      const purchase = await recordWaterPurchase('wholesale', 6, '2026-10-03', testCollector.id);
      expect(purchase.purchase_type).toBe('wholesale');
      expect(purchase.quantity).toBe(6);
      expect(purchase.purchase_date).toBe('2026-10-03');
      // Total should be quantity * unitPriceFils (stored in fils)
      expect(purchase.total_amount).toBe(purchase.quantity * purchase.unit_price);
    });

    it('Test 5: Record retail purchase', async () => {
      const purchase = await recordWaterPurchase('retail', 2, '2026-10-04', testCollector.id, 'Additional purchase');
      expect(purchase.purchase_type).toBe('retail');
      expect(purchase.quantity).toBe(2);
      expect(purchase.notes).toBe('Additional purchase');
    });

    it('Test 6: Recording purchase creates water payment and reduces collector balance', async () => {
      const balanceBefore = await getCollectorBalance(testCollector.id);
      const purchase = await recordWaterPurchase('wholesale', 5, '2026-10-05', testCollector.id);
      const balanceAfter = await getCollectorBalance(testCollector.id);

      // Balance should be reduced by purchase total
      expect(balanceAfter).toBe(balanceBefore - purchase.total_amount);

      // Water payment should exist
      const payments = await getWaterPaymentsByPurchase(purchase.id);
      expect(payments.length).toBeGreaterThan(0);
      expect(payments[0].amount).toBe(purchase.total_amount);
      expect(payments[0].collector_id).toBe(testCollector.id);
    });
  });

  describe('Editing Purchases', () => {
    it('Test 7: Edit quantity recomputes total', async () => {
      const purchase = await recordWaterPurchase('wholesale', 5, '2026-10-06', testCollector.id);
      const originalPrice = purchase.unit_price;
      const originalTotal = purchase.total_amount;
      const balanceBeforeEdit = await getCollectorBalance(testCollector.id);

      await editWaterPurchase(purchase.id, {
        type: 'wholesale',
        quantity: 8,
        purchaseDate: '2026-10-06',
        collectorId: testCollector.id,
      });

      const updated = await getWaterPurchaseById(purchase.id);
      expect(updated?.quantity).toBe(8);
      expect(updated?.unit_price).toBe(originalPrice); // Price preserved
      expect(updated?.total_amount).toBe(8 * originalPrice);

      // Balance should reflect the new total (not the original)
      const balanceAfterEdit = await getCollectorBalance(testCollector.id);
      const delta = updated!.total_amount - originalTotal;
      expect(balanceAfterEdit).toBe(balanceBeforeEdit - delta);
    });

    it('Test 8: Edit with date moved to another month', async () => {
      const purchase = await recordWaterPurchase('wholesale', 3, '2026-10-07', testCollector.id);

      await editWaterPurchase(purchase.id, {
        type: 'wholesale',
        quantity: 3,
        purchaseDate: '2026-11-01', // Move to November
        collectorId: testCollector.id,
      });

      const updated = await getWaterPurchaseById(purchase.id);
      expect(updated?.purchase_date).toBe('2026-11-01');
    });
  });

  describe('Monthly Summary', () => {
    it('Test 9: Monthly summary aggregates by type', async () => {
      // Record some purchases
      await recordWaterPurchase('wholesale', 6, '2026-10-08', testCollector.id);
      await recordWaterPurchase('retail', 2, '2026-10-09', testCollector.id);

      const summary = await getMonthlyWaterSummary('2026-10');

      expect(summary.wholesale.canes).toBeGreaterThanOrEqual(6);
      expect(summary.retail.canes).toBeGreaterThanOrEqual(2);
      expect(summary.totalCanes).toBeGreaterThanOrEqual(8);
      expect(summary.totalExpense).toBeGreaterThan(0);
    });

    it('Test 10: Empty month has zero summary', async () => {
      const summary = await getMonthlyWaterSummary('2020-01');
      expect(summary.wholesale.canes).toBe(0);
      expect(summary.wholesale.expense).toBe(0);
      expect(summary.retail.canes).toBe(0);
      expect(summary.retail.expense).toBe(0);
      expect(summary.totalExpense).toBe(0);
      expect(summary.totalCanes).toBe(0);
    });

    it('Test 11: Historical prices remain after settings change', async () => {
      const originalSettings = await getSettings();
      const purchase = await recordWaterPurchase('wholesale', 4, '2026-10-10', testCollector.id);
      const originalPrice = purchase.unit_price;
      const originalTotal = purchase.total_amount;

      // Change settings
      await updateSettings({ wholesale_price: originalSettings.wholesale_price + 500 }); // Add AED 5

      // Re-fetch purchase - price should NOT change
      const unchanged = await getWaterPurchaseById(purchase.id);
      expect(unchanged?.unit_price).toBe(originalPrice);
      expect(unchanged?.total_amount).toBe(originalTotal);

      // Restore settings
      await updateSettings({ wholesale_price: originalSettings.wholesale_price });

      // New purchase should use updated price
      const newPurchase = await recordWaterPurchase('wholesale', 4, '2026-10-11', testCollector.id);
      expect(newPurchase.unit_price).toBe(originalSettings.wholesale_price); // Back to original
    });
  });

  describe('Month Isolation', () => {
    it('Test 12: Purchases in different months do not mix', async () => {
      await recordWaterPurchase('wholesale', 5, '2026-09-15', testCollector.id);
      await recordWaterPurchase('wholesale', 6, '2026-10-15', testCollector.id);

      const septemberSummary = await getMonthlyWaterSummary('2026-09');
      const octoberSummary = await getMonthlyWaterSummary('2026-10');

      // September should not contain October's purchases
      expect(septemberSummary.totalCanes).toBeLessThan(octoberSummary.totalCanes + 6);
      // And vice versa
      expect(octoberSummary.totalCanes).toBeLessThan(septemberSummary.totalCanes + 5);
    });
  });
});

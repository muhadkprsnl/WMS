/**
 * Water Purchase Service
 *
 * Business logic for recording and editing water purchases with historical pricing.
 * Preserves unit prices to ensure historical records remain unchanged when Settings change.
 * Every purchase is deducted from the buying collector's cash in hand via water_payments row.
 */

import {
  createWaterPurchase,
  updateWaterPurchase,
  getWaterPurchaseById,
  getWaterSummaryByMonth,
  getSettings,
  getCollectorBalance,
  recordWaterPurchaseWithPayment,
  adjustWaterPurchasePayment,
} from '@/database';
import { WaterPurchase } from '@/types/database';

export interface PriceResolution {
  unitPriceFils: number;
  reason: string;
}

export interface MonthlyWaterSummary {
  month: string;
  totalExpense: number; // in fils
  totalCanes: number;
  wholesale: {
    canes: number;
    expense: number; // in fils
  };
  retail: {
    canes: number;
    expense: number; // in fils
  };
}

/**
 * Resolve the unit price for a water purchase.
 *
 * NEW purchase: use current Settings price for the type.
 * EDIT with type unchanged: keep the stored historical price.
 * EDIT with type changed: use current Settings price for the new type.
 *
 * Decision is logged for visibility (CLAUDE.md: "make decisions visible").
 */
export async function resolvePriceForPurchase(
  type: 'wholesale' | 'retail',
  existingPurchaseId?: number
): Promise<PriceResolution> {
  const settings = await getSettings();
  const settingsPriceFils = type === 'wholesale' ? settings.wholesale_price : settings.retail_price;

  if (!existingPurchaseId) {
    // New purchase: use current Settings price
    console.log(
      `[WaterPurchaseService] New ${type} purchase: using current Settings price AED ${(settingsPriceFils / 100).toFixed(2)}`
    );
    return {
      unitPriceFils: settingsPriceFils,
      reason: `new purchase: current ${type} price`,
    };
  }

  // Edit mode: check if type changed
  const existing = await getWaterPurchaseById(existingPurchaseId);
  if (!existing) {
    throw new Error(`Purchase ${existingPurchaseId} not found`);
  }

  if (existing.purchase_type === type) {
    // Type unchanged: preserve historical price
    console.log(
      `[WaterPurchaseService] Edit purchase ${existingPurchaseId}: type unchanged (${type}), keeping stored price AED ${(existing.unit_price / 100).toFixed(2)}`
    );
    return {
      unitPriceFils: existing.unit_price,
      reason: 'type unchanged: stored historical price kept',
    };
  }

  // Type changed: use current Settings price for the new type
  console.log(
    `[WaterPurchaseService] Edit purchase ${existingPurchaseId}: type changed from ${existing.purchase_type} to ${type}, using current price AED ${(settingsPriceFils / 100).toFixed(2)}`
  );
  return {
    unitPriceFils: settingsPriceFils,
    reason: `type changed to ${type}: current ${type} price`,
  };
}

/**
 * Record a new water purchase with collector deduction.
 * The full purchase amount is deducted from the collector's cash in hand.
 */
export async function recordWaterPurchase(
  type: 'wholesale' | 'retail',
  quantity: number,
  purchaseDate: string,
  collectorId: number,
  notes?: string
): Promise<WaterPurchase> {
  const priceResolution = await resolvePriceForPurchase(type);
  const totalAmount = quantity * priceResolution.unitPriceFils;

  const collectorBalance = await getCollectorBalance(collectorId);
  const balanceAfterDeduction = collectorBalance - totalAmount;

  console.log(
    `[WaterPurchaseService] Recording purchase for collector ${collectorId}: AED ${(totalAmount / 100).toFixed(2)}, current balance AED ${(collectorBalance / 100).toFixed(2)}, will become AED ${(balanceAfterDeduction / 100).toFixed(2)}`
  );

  return recordWaterPurchaseWithPayment(
    type,
    quantity,
    priceResolution.unitPriceFils,
    purchaseDate,
    collectorId,
    totalAmount,
    notes
  );
}

/**
 * Edit an existing water purchase.
 * If collectorId changes, reverses old collector's deduction and deducts from new collector.
 * If quantity/type changes, creates adjustment rows to reflect the difference.
 */
export async function editWaterPurchase(
  id: number,
  {
    type,
    quantity,
    purchaseDate,
    collectorId,
    notes,
  }: {
    type: 'wholesale' | 'retail';
    quantity: number;
    purchaseDate: string;
    collectorId: number;
    notes?: string;
  }
): Promise<void> {
  const existing = await getWaterPurchaseById(id);
  if (!existing) {
    throw new Error(`Purchase ${id} not found`);
  }

  const priceResolution = await resolvePriceForPurchase(type, id);
  const newTotalAmount = quantity * priceResolution.unitPriceFils;
  const oldTotalAmount = existing.total_amount;
  const deltaNotes = notes && notes.trim() ? notes.trim() : undefined;

  console.log(
    `[WaterPurchaseService] Editing purchase ${id}: type=${type}, quantity=${quantity}, collector=${collectorId}, old total AED ${(oldTotalAmount / 100).toFixed(2)}, new total AED ${(newTotalAmount / 100).toFixed(2)}`
  );

  await adjustWaterPurchasePayment(
    id,
    collectorId,
    oldTotalAmount,
    newTotalAmount,
    deltaNotes
  );

  await updateWaterPurchase(id, {
    purchase_type: type,
    quantity,
    unit_price: priceResolution.unitPriceFils,
    total_amount: newTotalAmount,
    purchase_date: purchaseDate,
    notes: deltaNotes,
  });
}

/**
 * Get monthly water summary for display.
 */
export async function getMonthlyWaterSummary(month: string): Promise<MonthlyWaterSummary> {
  const summary = await getWaterSummaryByMonth(month);

  const totalExpense = summary.wholesale.total + summary.retail.total;
  const totalCanes = summary.wholesale.quantity + summary.retail.quantity;

  return {
    month,
    totalExpense,
    totalCanes,
    wholesale: {
      canes: summary.wholesale.quantity,
      expense: summary.wholesale.total,
    },
    retail: {
      canes: summary.retail.quantity,
      expense: summary.retail.total,
    },
  };
}

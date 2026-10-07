/**
 * Monthly Balance Service
 *
 * Business logic for monthly financial calculations:
 * Opening Balance + Contributions Received - Water Expenses = Closing Balance
 *
 * Ensures historical integrity: contribution config and water prices captured at record time.
 */

import {
  getActiveMembers,
  getSettings,
  getAllocationsByMonth,
  getTotalWaterExpenseByMonth,
  getWaterPurchasesByMonth,
  getMonthlyBalance,
  getPreviousMonthBalance,
  createMonthlyBalance,
  getMonthlyBalancesFrom,
  updateMonthlyBalance as updateMonthlyBalanceQuery,
  getDatabase,
} from '@/database';
import { generateMemberDues } from './memberDuesService';

export interface MonthlyCalculation {
  month: string;
  openingBalance: number;
  expectedContributions: number;
  contributionsReceived: number;
  waterExpenses: number;
  closingBalance: number;
}

/**
 * Calculate monthly balance for a given month
 *
 * Formula: Opening + Contributions - Water = Closing
 *
 * Opening balance comes from:
 * - First month: configured starting balance (default AED 0)
 * - Subsequent months: previous month's closing balance
 *
 * Contributions come from actual payment allocations, not expected amounts.
 *
 * Water expenses come from recorded water purchases (historical prices).
 */
export async function calculateMonthlyBalance(month: string): Promise<MonthlyCalculation> {
  // Get opening balance
  const openingBalance = await getOpeningBalance(month);

  // Get active members for expected contributions
  const activeMembers = await getActiveMembers();
  const settings = await getSettings();
  const expectedContributions = activeMembers.length * settings.monthly_contribution;

  // Get actual contributions received from payment allocations
  const allocations = await getAllocationsByMonth(month);
  const contributionsReceived = allocations.reduce((sum, alloc) => sum + alloc.amount, 0);

  // Get water expenses from water purchases
  const waterExpenses = await getTotalWaterExpenseByMonth(month);

  // Calculate closing balance
  const closingBalance = openingBalance + contributionsReceived - waterExpenses;

  return {
    month,
    openingBalance,
    expectedContributions,
    contributionsReceived,
    waterExpenses,
    closingBalance,
  };
}

/**
 * Get opening balance for a month
 *
 * First month: uses configured starting balance (default AED 0)
 * Subsequent months: uses previous month's closing balance
 */
async function getOpeningBalance(month: string): Promise<number> {
  // Try to get previous month's balance
  const previousBalance = await getPreviousMonthBalance(month);

  if (previousBalance) {
    return previousBalance.closing_balance;
  }

  // First month: use configured starting balance (currently hardcoded to AED 0)
  // Could be extended to read from settings if needed
  return 0;
}

/**
 * Record a calculated monthly balance
 *
 * Validates calculation and stores in database.
 * Negative balances are allowed.
 */
export async function recordMonthlyBalance(month: string): Promise<any> {
  // Check if balance already exists
  const existing = await getMonthlyBalance(month);
  if (existing) {
    throw new Error(`Monthly balance for ${month} already exists`);
  }

  // Calculate the balance
  const calculation = await calculateMonthlyBalance(month);

  // Store in database
  return await createMonthlyBalance(
    month,
    calculation.openingBalance,
    calculation.contributionsReceived,
    calculation.waterExpenses,
    calculation.closingBalance
  );
}

/**
 * Check if a monthly balance has been recorded
 */
export async function hasMonthlyBalance(month: string): Promise<boolean> {
  const balance = await getMonthlyBalance(month);
  return balance !== null;
}

/**
 * Get the opening balance that would be carried forward to next month
 */
export async function getCarryForwardBalance(month: string): Promise<number> {
  const balance = await getMonthlyBalance(month);
  if (!balance) {
    throw new Error(`No monthly balance found for ${month}`);
  }
  return balance.closing_balance;
}

/**
 * Water line item for bill display
 */
export interface WaterLineItem {
  type: 'wholesale' | 'retail';
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

/**
 * Monthly water bill data for dashboard and sharing
 */
export interface MonthlyWaterBill {
  month: string;
  openingBalance: number;
  collection: number;
  waterLines: WaterLineItem[];
  totalWater: number;
  closingBalance: number;
}

/**
 * Get monthly water bill with line-by-line breakdown
 *
 * Groups water purchases by type and unit price.
 * Shows each group as one line (qty × price = subtotal).
 * Closing balance computed from opening + collection - total water.
 */
export async function getMonthlyWaterBill(month: string): Promise<MonthlyWaterBill> {
  const monthlyCalc = await calculateMonthlyBalance(month);
  const purchases = await getWaterPurchasesByMonth(month);

  // Group purchases by (type, unitPrice) to handle mixed prices
  const priceMap = new Map<string, { type: 'wholesale' | 'retail'; quantity: number; unitPrice: number }>();

  for (const purchase of purchases) {
    const key = `${purchase.purchase_type}-${purchase.unit_price}`;
    if (priceMap.has(key)) {
      const item = priceMap.get(key)!;
      item.quantity += purchase.quantity;
    } else {
      priceMap.set(key, {
        type: purchase.purchase_type,
        quantity: purchase.quantity,
        unitPrice: purchase.unit_price,
      });
    }
  }

  // Convert to water lines with subtotals
  const waterLines: WaterLineItem[] = Array.from(priceMap.values()).map((item) => ({
    type: item.type,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    subtotal: item.quantity * item.unitPrice,
  }));

  return {
    month,
    openingBalance: monthlyCalc.openingBalance,
    collection: monthlyCalc.contributionsReceived,
    waterLines,
    totalWater: monthlyCalc.waterExpenses,
    closingBalance: monthlyCalc.closingBalance,
  };
}

/**
 * Recalculate stored monthly balances starting from a given month forward.
 *
 * Used when a payment is deleted: recomputes affected months' contributions and closing balances.
 * Updates each stored record; carry-forward to next month works because previous is already updated.
 * Logs each change for visibility.
 */
export async function recalculateStoredBalancesFrom(startMonth: string): Promise<void> {
  const balances = await getMonthlyBalancesFrom(startMonth);

  if (balances.length === 0) {
    console.log(`[MonthlyBalanceService] No stored balances from ${startMonth} to recalculate`);
    return;
  }

  for (const storedBalance of balances) {
    try {
      const recalc = await calculateMonthlyBalance(storedBalance.month);

      // Only update if values changed
      if (
        recalc.openingBalance !== storedBalance.opening_balance ||
        recalc.contributionsReceived !== storedBalance.contributions_received ||
        recalc.waterExpenses !== storedBalance.water_expenses ||
        recalc.closingBalance !== storedBalance.closing_balance
      ) {
        await updateMonthlyBalanceQuery(
          storedBalance.month,
          recalc.openingBalance,
          recalc.contributionsReceived,
          recalc.waterExpenses,
          recalc.closingBalance
        );

        const opening = (recalc.openingBalance / 100).toFixed(2);
        const contrib = (recalc.contributionsReceived / 100).toFixed(2);
        const water = (recalc.waterExpenses / 100).toFixed(2);
        const closing = (recalc.closingBalance / 100).toFixed(2);

        console.log(
          `[MonthlyBalanceService] Recalculated ${storedBalance.month}: ` +
          `opening AED ${opening}, contributions AED ${contrib}, water AED ${water}, closing AED ${closing}`
        );
      }
    } catch (err) {
      console.error(`[MonthlyBalanceService] Failed to recalculate balance for ${storedBalance.month}:`, err);
      throw err;
    }
  }
}

/**
 * Generate and save monthly summary for a given month.
 *
 * Calculates opening + contributions - water = closing balance and stores it.
 * Closing balance becomes the next month's opening balance (carry-forward).
 *
 * If the month is already generated, replaces the old row with new values (idempotent).
 * All actions are logged for visibility (CLAUDE.md).
 *
 * @param month - Target month in YYYY-MM format
 * @returns Summary data with replacement flag for visibility
 * @throws If month format is invalid or database error occurs
 */
export interface GeneratedSummary {
  summary: MonthlyCalculation;
  replaced: boolean;
  duesGenerated: number;
  duesCarried: number;
  duesSkipped: number;
  duesLog: string[];
}

export async function generateMonthlySummary(month: string): Promise<GeneratedSummary> {
  // Validate month format (YYYY-MM)
  const monthRegex = /^\d{4}-\d{2}$/;
  if (!monthRegex.test(month)) {
    throw new Error(`Invalid month format: "${month}". Expected YYYY-MM (e.g., 2024-09).`);
  }

  const db = await getDatabase();

  try {
    // Calculate the monthly balance
    const calculation = await calculateMonthlyBalance(month);

    // Check if this month already has a stored balance (check-then-act pattern)
    const existing = await getMonthlyBalance(month);
    const replaced = !!existing;

    let duesGenerated = 0;
    let duesCarried = 0;
    let duesSkipped = 0;
    let duesLog: string[] = [];

    // Execute within transaction (check-then-act per CLAUDE.md)
    await db.withTransactionAsync(async () => {
      // Update or create the balance row
      if (replaced) {
        await updateMonthlyBalanceQuery(
          month,
          calculation.openingBalance,
          calculation.contributionsReceived,
          calculation.waterExpenses,
          calculation.closingBalance
        );
      } else {
        await createMonthlyBalance(
          month,
          calculation.openingBalance,
          calculation.contributionsReceived,
          calculation.waterExpenses,
          calculation.closingBalance
        );
      }

      // Generate member dues within the same transaction
      const duesResult = await generateMemberDues(month);
      duesGenerated = duesResult.duesGenerated;
      duesCarried = duesResult.duesCarried;
      duesSkipped = duesResult.duesSkipped;
      duesLog = duesResult.log;
    });

    // Log the balance summary
    const opening = (calculation.openingBalance / 100).toFixed(2);
    const contrib = (calculation.contributionsReceived / 100).toFixed(2);
    const water = (calculation.waterExpenses / 100).toFixed(2);
    const closing = (calculation.closingBalance / 100).toFixed(2);
    const action = replaced ? 'Regenerated' : 'Generated';

    console.log(
      `[MonthlySummary] ${action} ${month}: ` +
      `opening AED ${opening}, contributions AED ${contrib}, water AED ${water}, closing AED ${closing}`
    );

    // Log dues results
    duesLog.forEach(logLine => console.log(logLine));

    return { summary: calculation, replaced, duesGenerated, duesCarried, duesSkipped, duesLog };
  } catch (err) {
    console.error(`[MonthlySummary] Failed to generate summary for ${month}:`, err);
    throw err;
  }
}

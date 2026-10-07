import { getDatabase } from '../db';
import { WaterPurchase } from '@/types/database';

export async function createWaterPurchase(
  purchaseType: 'wholesale' | 'retail',
  quantity: number,
  unitPriceFils: number,
  purchaseDate: string,
  notes?: string
): Promise<WaterPurchase> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  const totalAmount = quantity * unitPriceFils; // Integer fils math

  await db.runAsync(
    `INSERT INTO water_purchases (purchase_type, quantity, unit_price, total_amount, purchase_date, notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [purchaseType, quantity, unitPriceFils, totalAmount, purchaseDate, notes || null, now, now]
  );

  // Get the newly created purchase using last_insert_rowid
  const idResult = await db.getFirstAsync<{ id: number }>(
    'SELECT last_insert_rowid() as id'
  );

  if (!idResult?.id) {
    throw new Error('Failed to get inserted water purchase ID');
  }

  const purchase = await db.getFirstAsync<WaterPurchase>(
    'SELECT * FROM water_purchases WHERE id = ?',
    [idResult.id]
  );

  if (!purchase) {
    throw new Error('Failed to create water purchase');
  }

  return purchase;
}

export async function getWaterPurchases(): Promise<WaterPurchase[]> {
  const db = await getDatabase();
  const result = await db.getAllAsync<WaterPurchase>(
    'SELECT * FROM water_purchases ORDER BY purchase_date DESC'
  );
  return result || [];
}

export async function getWaterPurchasesByType(purchaseType: 'wholesale' | 'retail'): Promise<WaterPurchase[]> {
  const db = await getDatabase();
  const result = await db.getAllAsync<WaterPurchase>(
    'SELECT * FROM water_purchases WHERE purchase_type = ? ORDER BY purchase_date DESC',
    [purchaseType]
  );
  return result || [];
}

export async function getWaterPurchasesByMonth(month: string): Promise<WaterPurchase[]> {
  const db = await getDatabase();
  const result = await db.getAllAsync<WaterPurchase>(
    `SELECT * FROM water_purchases
     WHERE strftime('%Y-%m', purchase_date) = ?
     ORDER BY purchase_date DESC`,
    [month]
  );
  return result || [];
}

export interface WaterPurchaseWithCollector extends WaterPurchase {
  collector_name?: string;
}

export interface WaterPurchasePayer {
  collector_id: number;
  collector_name: string;
  net_amount: number;
}

export async function getWaterPurchasesWithCollectorByMonth(month: string): Promise<WaterPurchaseWithCollector[]> {
  const db = await getDatabase();
  const result = await db.getAllAsync<WaterPurchaseWithCollector>(
    `SELECT wp.*, c.name as collector_name
     FROM water_purchases wp
     LEFT JOIN (
       SELECT water_purchase_id, collector_id,
              ROW_NUMBER() OVER (PARTITION BY water_purchase_id ORDER BY SUM(amount) DESC) as rn
       FROM water_payments
       GROUP BY water_purchase_id, collector_id
       HAVING SUM(amount) != 0
     ) wpa_agg ON wp.id = wpa_agg.water_purchase_id AND wpa_agg.rn = 1
     LEFT JOIN collectors c ON wpa_agg.collector_id = c.id
     WHERE strftime('%Y-%m', wp.purchase_date) = ?
     ORDER BY wp.purchase_date DESC`,
    [month]
  );
  return result || [];
}

export async function getWaterPurchaseById(id: number): Promise<WaterPurchase | null> {
  const db = await getDatabase();
  const result = await db.getFirstAsync<WaterPurchase>(
    'SELECT * FROM water_purchases WHERE id = ?',
    [id]
  );
  return result || null;
}

export async function getTotalWaterExpense(): Promise<number> {
  const db = await getDatabase();
  const result = await db.getFirstAsync<{ total: number }>(
    'SELECT COALESCE(SUM(total_amount), 0) as total FROM water_purchases'
  );
  return result?.total ?? 0;
}

export async function getTotalWaterExpenseByMonth(month: string): Promise<number> {
  const db = await getDatabase();
  const result = await db.getFirstAsync<{ total: number }>(
    `SELECT COALESCE(SUM(total_amount), 0) as total FROM water_purchases
     WHERE strftime('%Y-%m', purchase_date) = ?`,
    [month]
  );
  return result?.total ?? 0;
}

export async function getTotalWaterQuantity(): Promise<number> {
  const db = await getDatabase();
  const result = await db.getFirstAsync<{ total: number }>(
    'SELECT COALESCE(SUM(quantity), 0) as total FROM water_purchases'
  );
  return result?.total ?? 0;
}

export async function getTotalWaterQuantityByType(purchaseType: 'wholesale' | 'retail'): Promise<number> {
  const db = await getDatabase();
  const result = await db.getFirstAsync<{ total: number }>(
    'SELECT COALESCE(SUM(quantity), 0) as total FROM water_purchases WHERE purchase_type = ?',
    [purchaseType]
  );
  return result?.total ?? 0;
}

export async function updateWaterPurchase(
  id: number,
  updates: Partial<Omit<WaterPurchase, 'id' | 'created_at' | 'updated_at'>>
): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();

  const fields: string[] = [];
  const values: any[] = [];

  if (updates.purchase_type !== undefined) {
    fields.push('purchase_type = ?');
    values.push(updates.purchase_type);
  }
  if (updates.quantity !== undefined) {
    fields.push('quantity = ?');
    values.push(updates.quantity);
  }
  if (updates.unit_price !== undefined) {
    fields.push('unit_price = ?');
    values.push(updates.unit_price);
  }
  if (updates.total_amount !== undefined) {
    fields.push('total_amount = ?');
    values.push(updates.total_amount);
  }
  if (updates.purchase_date !== undefined) {
    fields.push('purchase_date = ?');
    values.push(updates.purchase_date);
  }
  if (updates.notes !== undefined) {
    fields.push('notes = ?');
    values.push(updates.notes);
  }

  if (fields.length === 0) {
    return;
  }

  fields.push('updated_at = ?');
  values.push(now);
  values.push(id);

  await db.runAsync(
    `UPDATE water_purchases SET ${fields.join(', ')} WHERE id = ?`,
    values
  );
}

export interface WaterSummaryByType {
  quantity: number;
  total: number; // in fils
}

export async function getWaterSummaryByMonth(
  month: string
): Promise<{ wholesale: WaterSummaryByType; retail: WaterSummaryByType }> {
  const db = await getDatabase();

  const result = await db.getAllAsync<{
    purchase_type: string;
    quantity: number;
    total: number;
  }>(
    `SELECT purchase_type, SUM(quantity) as quantity, SUM(total_amount) as total
     FROM water_purchases
     WHERE strftime('%Y-%m', purchase_date) = ?
     GROUP BY purchase_type`,
    [month]
  );

  const summary: { wholesale: WaterSummaryByType; retail: WaterSummaryByType } = {
    wholesale: { quantity: 0, total: 0 },
    retail: { quantity: 0, total: 0 },
  };

  if (result) {
    result.forEach((row) => {
      if (row.purchase_type === 'wholesale') {
        summary.wholesale.quantity = row.quantity;
        summary.wholesale.total = row.total;
      } else if (row.purchase_type === 'retail') {
        summary.retail.quantity = row.quantity;
        summary.retail.total = row.total;
      }
    });
  }

  return summary;
}

/**
 * Get the current payer (collector with non-zero net) for a water purchase.
 * Returns the collector with the largest net amount (original deduction minus adjustments).
 */
export async function getCurrentPayerForPurchase(purchaseId: number): Promise<WaterPurchasePayer | null> {
  const db = await getDatabase();
  const result = await db.getFirstAsync<WaterPurchasePayer>(
    `SELECT
       wp.collector_id,
       c.name as collector_name,
       SUM(wp.amount) as net_amount
     FROM water_payments wp
     INNER JOIN collectors c ON wp.collector_id = c.id
     WHERE wp.water_purchase_id = ?
     GROUP BY wp.collector_id
     HAVING SUM(wp.amount) != 0
     ORDER BY SUM(wp.amount) DESC
     LIMIT 1`,
    [purchaseId]
  );
  return result || null;
}

/**
 * Transactional: Create a water purchase and immediately deduct from collector's holding.
 * Used by recordWaterPurchase service to ensure purchase and payment are recorded together.
 * If transaction fails, neither record is created (atomic).
 */
export async function recordWaterPurchaseWithPayment(
  purchaseType: 'wholesale' | 'retail',
  quantity: number,
  unitPriceFils: number,
  purchaseDate: string,
  collectorId: number,
  totalAmount: number,
  notes?: string
): Promise<WaterPurchase> {
  const db = await getDatabase();
  const now = new Date().toISOString();

  try {
    // Wrap in a transaction for atomicity
    await db.execAsync('BEGIN TRANSACTION');

    // Insert water purchase
    await db.runAsync(
      `INSERT INTO water_purchases (purchase_type, quantity, unit_price, total_amount, purchase_date, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [purchaseType, quantity, unitPriceFils, totalAmount, purchaseDate, notes || null, now, now]
    );

    // Get the newly created purchase ID
    const idResult = await db.getFirstAsync<{ id: number }>('SELECT last_insert_rowid() as id');
    if (!idResult?.id) {
      throw new Error('Failed to get inserted water purchase ID');
    }

    // Create water payment (deduction from collector's balance)
    await db.runAsync(
      `INSERT INTO water_payments (water_purchase_id, collector_id, amount, payment_date, notes, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [idResult.id, collectorId, totalAmount, now, `Purchase recorded`, now]
    );

    await db.execAsync('COMMIT');

    // Return the created purchase
    const purchase = await db.getFirstAsync<WaterPurchase>(
      'SELECT * FROM water_purchases WHERE id = ?',
      [idResult.id]
    );

    if (!purchase) {
      throw new Error('Failed to retrieve created water purchase');
    }

    return purchase;
  } catch (error) {
    try {
      await db.execAsync('ROLLBACK');
    } catch (rollbackErr) {
      console.error('Rollback failed:', rollbackErr);
    }
    throw error;
  }
}

/**
 * Transactional: Adjust water purchase deduction due to quantity/collector/type change.
 * Handles:
 * - Quantity change: creates delta adjustment row (new total - old total)
 * - Collector change: reverses (negative) on old collector, new full amount on new collector
 * - Type change (with new price): delta adjustment row for price difference
 */
export async function adjustWaterPurchasePayment(
  purchaseId: number,
  newCollectorId: number,
  oldTotalAmount: number,
  newTotalAmount: number,
  notes?: string
): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();

  try {
    await db.execAsync('BEGIN TRANSACTION');

    // Get current payer (collector with non-zero net)
    const currentPayer = await db.getFirstAsync<{
      collector_id: number;
      net_amount: number;
    }>(
      `SELECT collector_id, SUM(amount) as net_amount FROM water_payments
       WHERE water_purchase_id = ?
       GROUP BY collector_id
       HAVING SUM(amount) != 0
       ORDER BY SUM(amount) DESC LIMIT 1`,
      [purchaseId]
    );

    if (!currentPayer) {
      // No existing payment (legacy purchase) - create a new one for the new collector
      const adjustmentNotes = notes || 'Initial collector assignment';
      await db.runAsync(
        `INSERT INTO water_payments (water_purchase_id, collector_id, amount, payment_date, notes, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [purchaseId, newCollectorId, newTotalAmount, now, adjustmentNotes, now]
      );
    } else if (currentPayer.collector_id === newCollectorId) {
      // Same collector, adjust quantity/type difference
      const delta = newTotalAmount - oldTotalAmount;
      if (delta !== 0) {
        const adjustmentNotes = notes || `Adjustment: quantity/type change (delta AED ${(Math.abs(delta) / 100).toFixed(2)})`;
        await db.runAsync(
          `INSERT INTO water_payments (water_purchase_id, collector_id, amount, payment_date, notes, created_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [purchaseId, newCollectorId, delta, now, adjustmentNotes, now]
        );
      }
    } else {
      // Different collector - reverse the old collector's actual net, deduct from new
      const reverseNotes = notes || 'Collector changed';

      // Reverse on old collector (negative of their net amount)
      await db.runAsync(
        `INSERT INTO water_payments (water_purchase_id, collector_id, amount, payment_date, notes, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [purchaseId, currentPayer.collector_id, -currentPayer.net_amount, now, reverseNotes, now]
      );

      // Deduct from new collector
      await db.runAsync(
        `INSERT INTO water_payments (water_purchase_id, collector_id, amount, payment_date, notes, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [purchaseId, newCollectorId, newTotalAmount, now, reverseNotes, now]
      );
    }

    await db.execAsync('COMMIT');
  } catch (error) {
    try {
      await db.execAsync('ROLLBACK');
    } catch (rollbackErr) {
      console.error('Rollback failed:', rollbackErr);
    }
    throw error;
  }
}

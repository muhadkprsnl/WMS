import { getDatabase } from '../db';
import { Collector, Handover, WaterPayment, CollectionSettlement } from '@/types/database';

export async function getAllCollectors(): Promise<Collector[]> {
  const db = await getDatabase();
  const result = await db.getAllAsync<Collector>('SELECT * FROM collectors ORDER BY name');
  return result || [];
}

export async function getActiveCollectors(): Promise<Collector[]> {
  const db = await getDatabase();
  const result = await db.getAllAsync<Collector>(
    "SELECT * FROM collectors WHERE status = 'active' ORDER BY name"
  );
  return result || [];
}

export async function getCollectorById(id: number): Promise<Collector | null> {
  const db = await getDatabase();
  const result = await db.getFirstAsync<Collector>('SELECT * FROM collectors WHERE id = ?', [id]);
  return result || null;
}

export async function createCollector(name: string, notes?: string): Promise<Collector> {
  const db = await getDatabase();
  const now = new Date().toISOString();

  await db.runAsync(
    `INSERT INTO collectors (name, status, notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?)`,
    [name, 'active', notes || null, now, now]
  );

  // Get the newly created collector
  const collector = await db.getFirstAsync<Collector>(
    'SELECT * FROM collectors WHERE name = ?',
    [name]
  );

  if (!collector) {
    throw new Error('Failed to create collector');
  }

  return collector;
}

export async function updateCollector(
  id: number,
  updates: Partial<Omit<Collector, 'id' | 'created_at'>>
): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();

  const fields: string[] = [];
  const values: any[] = [];

  if (updates.name !== undefined) {
    fields.push('name = ?');
    values.push(updates.name);
  }
  if (updates.status !== undefined) {
    fields.push('status = ?');
    values.push(updates.status);
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
    `UPDATE collectors SET ${fields.join(', ')} WHERE id = ?`,
    values
  );
}

export async function deactivateCollector(id: number): Promise<void> {
  await updateCollector(id, { status: 'inactive' });
}

export async function activateCollector(id: number): Promise<void> {
  await updateCollector(id, { status: 'active' });
}

// Handover functions
export async function createHandover(
  fromCollectorId: number,
  toCollectorId: number,
  amount: number,
  handoverDate: string,
  notes?: string
): Promise<Handover> {
  const db = await getDatabase();
  const now = new Date().toISOString();

  await db.runAsync(
    `INSERT INTO handovers (from_collector_id, to_collector_id, amount, handover_date, notes, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [fromCollectorId, toCollectorId, amount, handoverDate, notes || null, now]
  );

  const handover = await db.getFirstAsync<Handover>(
    'SELECT * FROM handovers WHERE from_collector_id = ? AND to_collector_id = ? AND amount = ? AND handover_date = ? ORDER BY created_at DESC LIMIT 1',
    [fromCollectorId, toCollectorId, amount, handoverDate]
  );

  if (!handover) {
    throw new Error('Failed to create handover');
  }

  return handover;
}

export async function getHandovers(): Promise<Handover[]> {
  const db = await getDatabase();
  const result = await db.getAllAsync<Handover>(
    'SELECT * FROM handovers ORDER BY handover_date DESC'
  );
  return result || [];
}

export async function getHandoversByCollector(collectorId: number): Promise<{ sent: Handover[]; received: Handover[] }> {
  const db = await getDatabase();
  const [sent, received] = await Promise.all([
    db.getAllAsync<Handover>(
      'SELECT * FROM handovers WHERE from_collector_id = ? ORDER BY handover_date DESC',
      [collectorId]
    ),
    db.getAllAsync<Handover>(
      'SELECT * FROM handovers WHERE to_collector_id = ? ORDER BY handover_date DESC',
      [collectorId]
    ),
  ]);

  return { sent: sent || [], received: received || [] };
}

// Water payment functions
export async function createWaterPayment(
  waterPurchaseId: number,
  collectorId: number,
  amount: number,
  paymentDate: string,
  notes?: string
): Promise<WaterPayment> {
  const db = await getDatabase();
  const now = new Date().toISOString();

  await db.runAsync(
    `INSERT INTO water_payments (water_purchase_id, collector_id, amount, payment_date, notes, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [waterPurchaseId, collectorId, amount, paymentDate, notes || null, now]
  );

  const payment = await db.getFirstAsync<WaterPayment>(
    'SELECT * FROM water_payments WHERE water_purchase_id = ? AND collector_id = ? ORDER BY created_at DESC LIMIT 1',
    [waterPurchaseId, collectorId]
  );

  if (!payment) {
    throw new Error('Failed to create water payment');
  }

  return payment;
}

export async function getWaterPaymentsByPurchase(waterPurchaseId: number): Promise<WaterPayment[]> {
  const db = await getDatabase();
  const result = await db.getAllAsync<WaterPayment>(
    'SELECT * FROM water_payments WHERE water_purchase_id = ? ORDER BY payment_date DESC',
    [waterPurchaseId]
  );
  return result || [];
}

export async function getWaterPaymentsByCollector(collectorId: number): Promise<WaterPayment[]> {
  const db = await getDatabase();
  const result = await db.getAllAsync<WaterPayment>(
    'SELECT * FROM water_payments WHERE collector_id = ? ORDER BY payment_date DESC',
    [collectorId]
  );
  return result || [];
}

export async function getTotalWaterPaymentForPurchase(waterPurchaseId: number): Promise<number> {
  const db = await getDatabase();
  const result = await db.getFirstAsync<{ total: number }>(
    'SELECT COALESCE(SUM(amount), 0) as total FROM water_payments WHERE water_purchase_id = ?',
    [waterPurchaseId]
  );
  return result?.total ?? 0;
}

// Collection statistics
export interface CollectionStats {
  totalCollected: number;
  totalWaterPaid: number;
  totalHandedOver: number;
  totalReceived: number;
  currentHolding: number;
}

export async function getCollectorStats(collectorId: number): Promise<CollectionStats> {
  const db = await getDatabase();

  const [collected, waterPaid, handedOver, received] = await Promise.all([
    db.getFirstAsync<{ total: number }>(
      'SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE collected_by = ?',
      [collectorId]
    ),
    db.getFirstAsync<{ total: number }>(
      'SELECT COALESCE(SUM(amount), 0) as total FROM water_payments WHERE collector_id = ?',
      [collectorId]
    ),
    db.getFirstAsync<{ total: number }>(
      'SELECT COALESCE(SUM(amount), 0) as total FROM handovers WHERE from_collector_id = ?',
      [collectorId]
    ),
    db.getFirstAsync<{ total: number }>(
      'SELECT COALESCE(SUM(amount), 0) as total FROM handovers WHERE to_collector_id = ?',
      [collectorId]
    ),
  ]);

  const totalCollected = collected?.total ?? 0;
  const totalWaterPaid = waterPaid?.total ?? 0;
  const totalHandedOver = handedOver?.total ?? 0;
  const totalReceived = received?.total ?? 0;
  const currentHolding = totalCollected + totalReceived - totalHandedOver - totalWaterPaid;

  return {
    totalCollected,
    totalWaterPaid,
    totalHandedOver,
    totalReceived,
    currentHolding,
  };
}

// Collection statistics for a specific date range
export interface CollectionPeriodStats {
  totalCollected: number;
  totalWaterPaid: number;
  totalHandedOver: number;
  totalReceived: number;
}

export async function getCollectorPeriodStats(
  collectorId: number,
  fromDate?: string, // YYYY-MM-DD format
  toDate?: string    // YYYY-MM-DD format
): Promise<CollectionPeriodStats> {
  const db = await getDatabase();

  // Build date filter clause and params
  const hasDateRange = fromDate && toDate;
  const dateClause = hasDateRange ? ' AND (date_column) BETWEEN ? AND ?' : '';
  const dateParams = hasDateRange ? [fromDate, toDate] : [];

  const [collected, waterPaid, handedOver, received] = await Promise.all([
    db.getFirstAsync<{ total: number }>(
      `SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE collected_by = ?${
        hasDateRange ? ' AND payment_date BETWEEN ? AND ?' : ''
      }`,
      hasDateRange ? [collectorId, fromDate, toDate] : [collectorId]
    ),
    db.getFirstAsync<{ total: number }>(
      `SELECT COALESCE(SUM(amount), 0) as total FROM water_payments WHERE collector_id = ?${
        hasDateRange ? ' AND payment_date BETWEEN ? AND ?' : ''
      }`,
      hasDateRange ? [collectorId, fromDate, toDate] : [collectorId]
    ),
    db.getFirstAsync<{ total: number }>(
      `SELECT COALESCE(SUM(amount), 0) as total FROM handovers WHERE from_collector_id = ?${
        hasDateRange ? ' AND handover_date BETWEEN ? AND ?' : ''
      }`,
      hasDateRange ? [collectorId, fromDate, toDate] : [collectorId]
    ),
    db.getFirstAsync<{ total: number }>(
      `SELECT COALESCE(SUM(amount), 0) as total FROM handovers WHERE to_collector_id = ?${
        hasDateRange ? ' AND handover_date BETWEEN ? AND ?' : ''
      }`,
      hasDateRange ? [collectorId, fromDate, toDate] : [collectorId]
    ),
  ]);

  return {
    totalCollected: collected?.total ?? 0,
    totalWaterPaid: waterPaid?.total ?? 0,
    totalHandedOver: handedOver?.total ?? 0,
    totalReceived: received?.total ?? 0,
  };
}

// Get current holdings for a collector
export async function getCollectorBalance(collectorId: number): Promise<number> {
  const stats = await getCollectorStats(collectorId);
  return stats.currentHolding;
}

// Settlement functions
export async function createSettlement(
  collectorId: number,
  month: string,
  settlementDate: string,
  waterPaymentAmount: number,
  handoverAmount: number,
  returnedAmount: number,
  otherAmount: number,
  notes?: string
): Promise<CollectionSettlement> {
  const db = await getDatabase();
  const now = new Date().toISOString();

  // Get current balance before settlement
  const openingHolding = await getCollectorBalance(collectorId);

  await db.runAsync(
    `INSERT INTO collection_settlements
     (collector_id, month, settlement_date, opening_holding, total_water_payments, total_handovers, total_returned, total_other, closing_holding, status, notes, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      collectorId,
      month,
      settlementDate,
      openingHolding,
      waterPaymentAmount,
      handoverAmount,
      returnedAmount,
      otherAmount,
      0, // Closing holding will be 0 after settlement
      'settled',
      notes || null,
      now,
    ]
  );

  const settlement = await db.getFirstAsync<CollectionSettlement>(
    'SELECT * FROM collection_settlements WHERE collector_id = ? AND month = ? ORDER BY created_at DESC LIMIT 1',
    [collectorId, month]
  );

  if (!settlement) {
    throw new Error('Failed to create settlement');
  }

  return settlement;
}

export async function getSettlement(
  collectorId: number,
  month: string
): Promise<CollectionSettlement | null> {
  const db = await getDatabase();
  const result = await db.getFirstAsync<CollectionSettlement>(
    'SELECT * FROM collection_settlements WHERE collector_id = ? AND month = ?',
    [collectorId, month]
  );
  return result || null;
}

export async function getSettlementsByCollector(collectorId: number): Promise<CollectionSettlement[]> {
  const db = await getDatabase();
  const result = await db.getAllAsync<CollectionSettlement>(
    'SELECT * FROM collection_settlements WHERE collector_id = ? ORDER BY month DESC',
    [collectorId]
  );
  return result || [];
}

export async function getAllSettlements(): Promise<CollectionSettlement[]> {
  const db = await getDatabase();
  const result = await db.getAllAsync<CollectionSettlement>(
    'SELECT * FROM collection_settlements ORDER BY month DESC, collector_id'
  );
  return result || [];
}
